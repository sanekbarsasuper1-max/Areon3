import { MODE_MUSIC_TRACKS, INTRO_STINGER, SFX_FILES, AppMode, SfxName } from './manifest';
import { MusicProvider, Track } from '../music/MusicProvider';
import { JamendoProvider } from '../music/JamendoProvider';
import { api } from '../api';

export interface AudioSettings {
  masterVolume: number; // 0-1
  musicVolume: number; // 0-1 — the GLOBAL player's volume, and the mode-track volume
  sfxVolume: number; // 0-1 — draft ban/pick/timer sounds etc, independent of music
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

export type RepeatMode = 'off' | 'one' | 'all';

export interface GlobalPlayerState {
  queue: Track[];
  currentIndex: number | null;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  shuffle: boolean;
  repeat: RepeatMode;
  favorites: Track[];
  currentMode: AppMode | null; // non-null while Draft (etc) has paused GLOBAL
  searchResults: Track[];
  searching: boolean;
}

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  musicEnabled: true,
  sfxEnabled: true,
};

const SETTINGS_KEY = 'areon_audio_settings';
// Player state that's genuinely per-device session state, not
// something that needs to survive a device switch — requirement 10's
// "временное состояние — локально". Favorites are the one exception,
// persisted server-side (see FavoriteTrack) since those are worth
// keeping across devices.
const PLAYER_STATE_KEY = 'areon_player_state';

const FADE_MS = 900;
const FADE_STEP_MS = 40;

interface PersistedPlayerState {
  queue: Track[];
  currentIndex: number | null;
  positionSec: number;
  shuffle: boolean;
  repeat: RepeatMode;
  wasPlaying: boolean; // NOT "isPlaying" — browsers block autoplay-with-sound on load, so a reload restores paused-but-ready, not auto-resumed
}

/**
 * Plain-JS singleton (not a React component) — same reasoning as
 * before: playback must survive route changes and re-renders, which a
 * component tied to the render tree can't guarantee. React only ever
 * talks to this through useAudio()/useMusicPlayer() (AudioContext.tsx).
 */
class AudioManager {
  private settings: AudioSettings;
  private authorized = false;
  private introPlayed = false;

  // --- GLOBAL music player ---
  provider: MusicProvider = new JamendoProvider();
  private queue: Track[] = [];
  private currentIndex: number | null = null;
  private isPlaying = false;
  private positionSec = 0;
  private durationSec = 0;
  private shuffle = false;
  private repeat: RepeatMode = 'off';
  private favorites: Track[] = [];
  private searchResults: Track[] = [];
  private searching = false;

  // --- MODE music (Draft, etc.) ---
  private currentMode: AppMode | null = null;
  private wasPlayingBeforeMode = false;
  private modeAudio: HTMLAudioElement | null = null;
  private modeFadeTimer: number | null = null;

  private listeners = new Set<() => void>();

  constructor() {
    this.settings = this.loadSettings();
    this.restorePlayerState();
    this.provider.onTimeUpdate((t) => {
      this.positionSec = t;
      this.durationSec = this.provider.getDuration();
      this.notify();
    });
    this.provider.onEnded(() => this.handleTrackEnded());
    // Periodic save rather than on every timeupdate tick — position
    // changes many times a second, the queue/index/etc almost never do.
    setInterval(() => this.savePlayerState(), 5000);
  }

  // ============================== Settings ==============================

  private loadSettings(): AudioSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
  private saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* private browsing etc — session still works, just won't persist */
    }
  }
  getSettings(): AudioSettings {
    return { ...this.settings };
  }
  updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    if (!this.settings.musicEnabled) {
      this.provider.pause();
      this.modeAudio?.pause();
    } else {
      this.provider.setVolume(this.effectiveMusicVolume());
      this.modeAudio && (this.modeAudio.volume = this.effectiveMusicVolume());
    }
    this.notify();
  }
  private effectiveMusicVolume(): number {
    return this.settings.masterVolume * this.settings.musicVolume;
  }
  private effectiveSfxVolume(): number {
    return this.settings.masterVolume * this.settings.sfxVolume;
  }

  // ============================== Auth gating ==============================

  authorize() {
    if (this.authorized) return;
    this.authorized = true;
    this.loadFavorites();
    if (!this.introPlayed) {
      this.introPlayed = true;
      this.playIntro();
    }
  }
  deauthorize() {
    this.authorized = false;
    this.introPlayed = false;
    this.provider.pause();
    this.modeAudio?.pause();
    this.isPlaying = false;
    this.notify();
  }

  private playIntro() {
    const intro = new Audio(INTRO_STINGER);
    intro.volume = this.settings.musicEnabled ? this.settings.masterVolume : 0;
    intro.onerror = () => console.warn(`[audio] Could not load intro stinger (${INTRO_STINGER}) — file likely not added yet.`);
    intro.play().catch(() => {});
  }

  // ============================== Pub/sub ==============================

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private notify() {
    this.listeners.forEach((l) => l());
  }

  getState(): GlobalPlayerState {
    return {
      queue: this.queue,
      currentIndex: this.currentIndex,
      isPlaying: this.isPlaying,
      positionSec: this.positionSec,
      durationSec: this.durationSec,
      shuffle: this.shuffle,
      repeat: this.repeat,
      favorites: this.favorites,
      currentMode: this.currentMode,
      searchResults: this.searchResults,
      searching: this.searching,
    };
  }

  // ============================== Persistence ==============================

  private restorePlayerState() {
    try {
      const raw = localStorage.getItem(PLAYER_STATE_KEY);
      if (!raw) return;
      const s: PersistedPlayerState = JSON.parse(raw);
      this.queue = s.queue ?? [];
      this.currentIndex = s.currentIndex ?? null;
      this.positionSec = s.positionSec ?? 0;
      this.shuffle = s.shuffle ?? false;
      this.repeat = s.repeat ?? 'off';
      // Deliberately does NOT auto-play on restore, even if wasPlaying
      // was true — browsers block audio-with-sound before a user
      // gesture on the new page load anyway, and silently trying would
      // just fail; the track is loaded and seeked to position, ready
      // for one tap to resume.
      if (this.currentIndex != null && this.queue[this.currentIndex]) {
        this.provider.load(this.queue[this.currentIndex]).then(() => {
          this.provider.seek(this.positionSec);
          this.provider.setVolume(this.effectiveMusicVolume());
        });
      }
    } catch {
      /* corrupt/old state — just start fresh */
    }
  }

  private savePlayerState() {
    const state: PersistedPlayerState = {
      queue: this.queue,
      currentIndex: this.currentIndex,
      positionSec: this.positionSec,
      shuffle: this.shuffle,
      repeat: this.repeat,
      wasPlaying: this.isPlaying,
    };
    try {
      localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }

  private async loadFavorites() {
    try {
      const rows = await api.musicFavorites();
      this.favorites = rows.map((r) => ({
        id: r.providerTrackId,
        name: r.name,
        artist: r.artist,
        imageUrl: r.imageUrl ?? null,
        durationSec: 0, // not stored server-side — refetched from the provider on play if needed
      }));
      this.notify();
    } catch {
      /* not logged in yet, or backend unreachable — favorites stay empty, not fatal */
    }
  }

  // ============================== GLOBAL playback ==============================

  async search(query: string) {
    this.searching = true;
    this.notify();
    try {
      this.searchResults = await this.provider.search(query);
    } finally {
      this.searching = false;
      this.notify();
    }
  }

  /** Replaces the queue and starts playing from `startIndex` — e.g. "play this search result now, queue the rest". */
  async setQueueAndPlay(tracks: Track[], startIndex: number) {
    this.queue = tracks;
    this.currentIndex = startIndex;
    await this.loadAndPlayCurrent();
  }

  addToQueue(track: Track) {
    this.queue = [...this.queue, track];
    if (this.currentIndex === null) this.currentIndex = 0;
    this.notify();
    this.savePlayerState();
  }

  private async loadAndPlayCurrent() {
    if (this.currentIndex === null || !this.queue[this.currentIndex]) return;
    await this.provider.load(this.queue[this.currentIndex]);
    this.provider.setVolume(this.currentMode ? 0 : this.effectiveMusicVolume());
    if (!this.currentMode && this.settings.musicEnabled) {
      await this.provider.play();
      this.isPlaying = true;
    } else {
      // A mode has GLOBAL paused right now — load the track (so it's
      // ready and its metadata/duration shows in the UI) but don't
      // actually start audio until the mode ends.
      this.isPlaying = false;
    }
    this.notify();
    this.savePlayerState();
  }

  async togglePlayPause() {
    if (this.currentMode) return; // GLOBAL is suspended during a mode — see enterMode()
    if (this.currentIndex === null) return;
    if (this.isPlaying) {
      this.provider.pause();
      this.isPlaying = false;
    } else {
      await this.provider.resume();
      this.isPlaying = true;
    }
    this.notify();
    this.savePlayerState();
  }

  async playNext(userInitiated = true) {
    if (this.queue.length === 0 || this.currentIndex === null) return;
    if (this.repeat === 'one' && !userInitiated) {
      this.provider.seek(0);
      await this.provider.play();
      return;
    }
    const nextIndex = this.computeNextIndex(1);
    if (nextIndex === null) {
      this.isPlaying = false;
      this.notify();
      return;
    }
    this.currentIndex = nextIndex;
    await this.loadAndPlayCurrent();
  }

  async playPrevious() {
    if (this.queue.length === 0 || this.currentIndex === null) return;
    // Scrubbing back near the start of a track restarts it instead of
    // jumping queue position — standard player convention.
    if (this.positionSec > 3) {
      this.provider.seek(0);
      return;
    }
    const prevIndex = this.computeNextIndex(-1);
    if (prevIndex === null) return;
    this.currentIndex = prevIndex;
    await this.loadAndPlayCurrent();
  }

  private computeNextIndex(direction: 1 | -1): number | null {
    if (this.currentIndex === null) return null;
    if (this.shuffle) {
      if (this.queue.length <= 1) return this.repeat === 'all' ? this.currentIndex : null;
      let next: number;
      do {
        next = Math.floor(Math.random() * this.queue.length);
      } while (next === this.currentIndex);
      return next;
    }
    const next = this.currentIndex + direction;
    if (next >= 0 && next < this.queue.length) return next;
    if (this.repeat === 'all') return (next + this.queue.length) % this.queue.length;
    return null;
  }

  private handleTrackEnded() {
    this.playNext(false);
  }

  seek(seconds: number) {
    this.provider.seek(seconds);
    this.positionSec = seconds;
    this.notify();
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    this.notify();
    this.savePlayerState();
  }
  cycleRepeat() {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    this.repeat = order[(order.indexOf(this.repeat) + 1) % order.length];
    this.notify();
    this.savePlayerState();
  }

  isFavorite(trackId: string): boolean {
    return this.favorites.some((f) => f.id === trackId);
  }

  async toggleFavorite(track: Track) {
    if (this.isFavorite(track.id)) {
      this.favorites = this.favorites.filter((f) => f.id !== track.id);
      this.notify();
      await api.removeMusicFavorite(track.id).catch(() => {});
    } else {
      this.favorites = [...this.favorites, track];
      this.notify();
      await api
        .addMusicFavorite({ providerTrackId: track.id, name: track.name, artist: track.artist, imageUrl: track.imageUrl ?? undefined })
        .catch(() => {});
    }
  }

  // ============================== MODE music (Draft, etc.) ==============================

  /**
   * Exact sequence from the spec: GLOBAL fades out and PAUSES (not
   * stopped, not reset) while the mode track fades in. wasPlayingBeforeMode
   * is what lets exitMode() tell the difference between "was playing,
   * pause it for later" and "was already paused, leave it that way."
   */
  enterMode(mode: AppMode) {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.wasPlayingBeforeMode = this.isPlaying;

    if (this.isPlaying) {
      this.fadeProviderTo(0, () => this.provider.pause());
    }
    this.startModeTrack(mode);
    this.notify();
  }

  exitMode() {
    if (!this.currentMode) return;
    this.currentMode = null;
    this.stopModeTrack();

    if (this.wasPlayingBeforeMode && this.currentIndex !== null) {
      this.provider.setVolume(0);
      this.provider.resume().then(() => {
        this.isPlaying = true;
        this.fadeProviderTo(this.effectiveMusicVolume());
        this.notify();
      });
    }
    // If it wasn't playing before, GLOBAL just stays paused — exactly
    // "не должна автоматически запускаться" from the spec.
    this.notify();
  }

  private startModeTrack(mode: AppMode) {
    const audio = new Audio(MODE_MUSIC_TRACKS[mode]);
    audio.loop = true;
    audio.volume = 0;
    audio.onerror = () => console.warn(`[audio] Could not load mode track for "${mode}" — file likely not added yet.`);
    this.modeAudio = audio;
    if (this.settings.musicEnabled) {
      audio.play().catch(() => {});
      this.fadeElementTo(audio, this.effectiveMusicVolume());
    }
  }

  private stopModeTrack() {
    const audio = this.modeAudio;
    if (!audio) return;
    this.modeAudio = null;
    this.fadeElementTo(audio, 0, () => audio.pause());
  }

  private fadeProviderTo(target: number, onDone?: () => void) {
    if (this.modeFadeTimer) window.clearInterval(this.modeFadeTimer);
    const steps = FADE_MS / FADE_STEP_MS;
    let step = 0;
    const from = target === 0 ? this.effectiveMusicVolume() : 0;
    this.modeFadeTimer = window.setInterval(() => {
      step += 1;
      const progress = Math.min(1, step / steps);
      this.provider.setVolume(from + (target - from) * progress);
      if (progress >= 1) {
        if (this.modeFadeTimer) window.clearInterval(this.modeFadeTimer);
        onDone?.();
      }
    }, FADE_STEP_MS);
  }

  private fadeElementTo(audio: HTMLAudioElement, target: number, onDone?: () => void) {
    const steps = FADE_MS / FADE_STEP_MS;
    let step = 0;
    const from = audio.volume;
    const timer = window.setInterval(() => {
      step += 1;
      const progress = Math.min(1, step / steps);
      audio.volume = from + (target - from) * progress;
      if (progress >= 1) {
        window.clearInterval(timer);
        onDone?.();
      }
    }, FADE_STEP_MS);
  }

  // ============================== SFX ==============================

  playSFX(name: SfxName) {
    if (!this.authorized || !this.settings.sfxEnabled) return;
    const src = SFX_FILES[name];
    const audio = new Audio(src);
    audio.volume = this.effectiveSfxVolume();
    audio.onerror = () => console.warn(`[audio] Could not load SFX "${name}" (${src}) — file likely not added yet.`);
    audio.play().catch(() => {});
  }
}

export const audioManager = new AudioManager();
