import { MusicProvider, Track } from './MusicProvider';

const JAMENDO_CLIENT_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID;
const JAMENDO_API = 'https://api.jamendo.com/v3.0';

interface JamendoTrackResponse {
  id: string;
  name: string;
  artist_name: string;
  duration: number;
  image: string;
  audio: string; // direct streamable MP3 URL — confirmed present on Jamendo's free, client_id-only read tier
}

/**
 * Jamendo: free client_id (self-signup at developer.jamendo.com, same
 * pattern as STEAM_API_KEY — see FIRST_LAUNCH.md), Creative-Commons
 * catalog, real full-track streaming (not 30s previews), CORS-enabled
 * so this can call the API directly from the browser. Every track
 * plays through a single, reused <audio> element rather than a fresh
 * one per track — reusing it is what makes seek/volume/pause behave
 * like one continuous player instead of a new one each time a track
 * loads.
 */
export class JamendoProvider implements MusicProvider {
  private audio = new Audio();
  private audioUrlByTrackId = new Map<string, string>();

  constructor() {
    this.audio.preload = 'auto';
  }

  async search(query: string): Promise<Track[]> {
    if (!JAMENDO_CLIENT_ID) {
      console.warn('[music] VITE_JAMENDO_CLIENT_ID is not set — see FIRST_LAUNCH.md. Search will return nothing.');
      return [];
    }
    const url = `${JAMENDO_API}/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=25&namesearch=${encodeURIComponent(query)}&include=musicinfo`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Jamendo search failed: ${res.status}`);
    const data = await res.json();
    return (data.results as JamendoTrackResponse[]).map((t) => {
      this.audioUrlByTrackId.set(t.id, t.audio);
      return {
        id: t.id,
        name: t.name,
        artist: t.artist_name,
        durationSec: t.duration,
        imageUrl: t.image || null,
      };
    });
  }

  async load(track: Track): Promise<void> {
    let audioUrl = this.audioUrlByTrackId.get(track.id);
    if (!audioUrl) {
      // Not from a recent search result (e.g. playing a saved favorite
      // in a later session) — look it up directly by id instead of
      // requiring the caller to have searched first.
      if (!JAMENDO_CLIENT_ID) throw new Error('VITE_JAMENDO_CLIENT_ID is not set — see FIRST_LAUNCH.md');
      const res = await fetch(`${JAMENDO_API}/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&id=${track.id}`);
      if (!res.ok) throw new Error(`Jamendo track lookup failed: ${res.status}`);
      const data = await res.json();
      audioUrl = data.results?.[0]?.audio;
      if (!audioUrl) throw new Error(`Track ${track.id} not found on Jamendo — it may have been removed`);
      this.audioUrlByTrackId.set(track.id, audioUrl);
    }
    this.audio.src = audioUrl;
    this.audio.load();
  }

  async play(): Promise<void> {
    await this.audio.play();
  }
  pause(): void {
    this.audio.pause();
  }
  async resume(): Promise<void> {
    await this.audio.play();
  }
  seek(seconds: number): void {
    this.audio.currentTime = seconds;
  }
  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }
  getCurrentTime(): number {
    return this.audio.currentTime;
  }
  getDuration(): number {
    return this.audio.duration || 0;
  }
  onEnded(cb: () => void): void {
    this.audio.onended = cb;
  }
  onTimeUpdate(cb: (time: number) => void): void {
    this.audio.ontimeupdate = () => cb(this.audio.currentTime);
  }
}
