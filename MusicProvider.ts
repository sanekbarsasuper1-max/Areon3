export interface Track {
  // Provider-scoped id — only meaningful together with which provider
  // returned it. Never assumed globally unique across providers.
  id: string;
  name: string;
  artist: string;
  durationSec: number;
  imageUrl: string | null;
}

/**
 * The abstraction requirement 11 asked for, refined slightly from the
 * literal Search/Play/Pause/Resume/Next/Previous/GetTrackInfo shape:
 * Next/Previous are QUEUE concerns (which track comes next, shuffle
 * order, repeat mode) — that logic lives in MusicManager, built once,
 * on top of any provider. Putting Next/Previous directly on the
 * provider would mean every future provider re-implements queue
 * logic, which defeats the point of the abstraction. What genuinely
 * varies per provider is: how you search, and how a single track
 * actually gets decoded and played — Jamendo hands you a raw
 * streamable URL you feed into an <audio> element yourself; a future
 * Spotify-backed provider would instead hand control to Spotify's own
 * Web Playback SDK, which owns its own black-box player. This
 * interface is deliberately shaped so BOTH kinds of provider can
 * implement it — MusicManager never assumes there's a raw <audio> URL
 * it can touch directly.
 */
export interface MusicProvider {
  search(query: string): Promise<Track[]>;
  load(track: Track): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  resume(): Promise<void>;
  seek(seconds: number): void;
  setVolume(volume: number): void; // 0-1
  getCurrentTime(): number;
  getDuration(): number;
  onEnded(cb: () => void): void;
  onTimeUpdate(cb: (time: number) => void): void;
}
