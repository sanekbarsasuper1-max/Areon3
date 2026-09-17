import { createContext, useContext, useEffect, useState, useSyncExternalStore, ReactNode } from 'react';
import { audioManager, AudioSettings, GlobalPlayerState } from './AudioManager';
import { AppMode, SfxName } from './manifest';
import { Track } from '../music/MusicProvider';

interface AudioContextValue {
  settings: AudioSettings;
  updateSettings: (partial: Partial<AudioSettings>) => void;
  playSFX: (name: SfxName) => void;
}

const AudioReactContext = createContext<AudioContextValue | null>(null);

/** Mount once, at the root of the app (see App.tsx). */
export function AudioProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>(audioManager.getSettings());

  function updateSettings(partial: Partial<AudioSettings>) {
    audioManager.updateSettings(partial);
    setSettings(audioManager.getSettings());
  }

  return (
    <AudioReactContext.Provider value={{ settings, updateSettings, playSFX: (name) => audioManager.playSFX(name) }}>
      {children}
    </AudioReactContext.Provider>
  );
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioReactContext);
  if (!ctx) throw new Error('useAudio() must be used inside <AudioProvider>');
  return ctx;
}

/**
 * The GLOBAL music player's React binding. AudioManager is a plain
 * class outside React's tree (see its own file comment on why), so
 * components subscribe to it via useSyncExternalStore rather than
 * holding their own copy of its state — this is what keeps the player
 * bar's displayed state and AudioManager's actual internal state from
 * ever drifting apart.
 */
export function useMusicPlayer() {
  const state = useSyncExternalStore<GlobalPlayerState>(
    (onChange) => audioManager.subscribe(onChange),
    () => audioManager.getState(),
  );

  return {
    ...state,
    search: (query: string) => audioManager.search(query),
    setQueueAndPlay: (tracks: Track[], startIndex: number) => audioManager.setQueueAndPlay(tracks, startIndex),
    addToQueue: (track: Track) => audioManager.addToQueue(track),
    togglePlayPause: () => audioManager.togglePlayPause(),
    playNext: () => audioManager.playNext(),
    playPrevious: () => audioManager.playPrevious(),
    seek: (seconds: number) => audioManager.seek(seconds),
    toggleShuffle: () => audioManager.toggleShuffle(),
    cycleRepeat: () => audioManager.cycleRepeat(),
    toggleFavorite: (track: Track) => audioManager.toggleFavorite(track),
    isFavorite: (trackId: string) => audioManager.isFavorite(trackId),
  };
}

/**
 * Call once from App.tsx when `session` flips to 'authenticated' /
 * 'anonymous' — enforces "no music before login" at the single source
 * of truth for auth state.
 */
export function useAudioAuthSync(isAuthenticated: boolean) {
  useEffect(() => {
    if (isAuthenticated) {
      audioManager.authorize();
    } else {
      audioManager.deauthorize();
    }
  }, [isAuthenticated]);
}

/**
 * Call from App.tsx's route effect: true while the current route is a
 * special MODE (Draft, later Tournament), false otherwise. Handles
 * calling enterMode/exitMode on transitions, including the exact
 * pause/resume-with-fade sequence from the spec — components never
 * call enterMode/exitMode directly.
 */
export function useAppMode(mode: AppMode | null) {
  useEffect(() => {
    if (mode) {
      audioManager.enterMode(mode);
      return () => audioManager.exitMode();
    }
  }, [mode]);
}
