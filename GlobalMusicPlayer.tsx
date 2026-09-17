import { useState } from 'react';
import { useMusicPlayer, useAudio } from '../audio/AudioContext';
import { Track } from '../music/MusicProvider';

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function GlobalMusicPlayer() {
  const player = useMusicPlayer();
  const { settings, updateSettings } = useAudio();
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<'search' | 'queue' | 'favorites'>('search');
  const [query, setQuery] = useState('');

  const currentTrack: Track | null = player.currentIndex != null ? player.queue[player.currentIndex] : null;
  const inMode = player.currentMode != null;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) await player.search(query.trim());
  }

  function playFromList(list: Track[], index: number) {
    player.setQueueAndPlay(list, index);
    setPanelOpen(false);
  }

  return (
    <div style={{ position: 'sticky', bottom: 0, zIndex: 20, background: '#08090a', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="button-ghost" style={{ padding: '4px 8px', flexShrink: 0 }} onClick={() => setPanelOpen((v) => !v)} aria-label="Открыть плеер">
          🎵
        </button>

        <div style={{ flex: 1, minWidth: 0, cursor: currentTrack ? 'pointer' : 'default' }} onClick={() => currentTrack && setPanelOpen(true)}>
          {currentTrack ? (
            <>
              <p style={{ fontSize: 12, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentTrack.artist} — {currentTrack.name}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
                {inMode ? 'На паузе — играет режим' : `${formatTime(player.positionSec)} / ${formatTime(player.durationSec)}`}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Ничего не играет — найдите музыку</p>
          )}
        </div>

        <button className="button-ghost" style={{ padding: '4px 8px' }} onClick={() => player.playPrevious()} disabled={inMode || !currentTrack}>
          ◀
        </button>
        <button className="button-ghost" style={{ padding: '4px 10px' }} onClick={() => player.togglePlayPause()} disabled={inMode || !currentTrack}>
          {player.isPlaying && !inMode ? '❚❚' : '▶'}
        </button>
        <button className="button-ghost" style={{ padding: '4px 8px' }} onClick={() => player.playNext()} disabled={inMode || !currentTrack}>
          ▶|
        </button>

        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(settings.musicVolume * 100)}
          onChange={(e) => updateSettings({ musicVolume: Number(e.target.value) / 100 })}
          style={{ width: 60, flexShrink: 0 }}
          className="volume-slider-desktop-only"
        />
      </div>

      {!inMode && currentTrack && (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 6px' }}>
          <input
            type="range"
            min={0}
            max={Math.max(1, player.durationSec)}
            value={player.positionSec}
            onChange={(e) => player.seek(Number(e.target.value))}
            style={{ width: '100%', height: 3 }}
          />
        </div>
      )}

      {panelOpen && (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 16px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: 6, margin: '10px 0' }}>
            <button className="button-ghost" style={{ background: tab === 'search' ? 'var(--accent-bg)' : undefined, color: tab === 'search' ? 'var(--accent)' : undefined }} onClick={() => setTab('search')}>
              Поиск
            </button>
            <button className="button-ghost" style={{ background: tab === 'queue' ? 'var(--accent-bg)' : undefined, color: tab === 'queue' ? 'var(--accent)' : undefined }} onClick={() => setTab('queue')}>
              Очередь ({player.queue.length})
            </button>
            <button className="button-ghost" style={{ background: tab === 'favorites' ? 'var(--accent-bg)' : undefined, color: tab === 'favorites' ? 'var(--accent)' : undefined }} onClick={() => setTab('favorites')}>
              Избранное ({player.favorites.length})
            </button>
            <button className="button-ghost" style={{ marginLeft: 'auto', color: player.shuffle ? 'var(--accent)' : undefined }} onClick={() => player.toggleShuffle()}>
              🔀
            </button>
            <button className="button-ghost" style={{ color: player.repeat !== 'off' ? 'var(--accent)' : undefined }} onClick={() => player.cycleRepeat()}>
              {player.repeat === 'one' ? '🔂' : '🔁'}
            </button>
          </div>

          {tab === 'search' && (
            <>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Артист или название трека"
                  style={{ flex: 1, background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)' }}
                />
                <button className="button-primary" type="submit">{player.searching ? '…' : 'Искать'}</button>
              </form>
              <TrackList
                tracks={player.searchResults}
                onPlay={(i) => playFromList(player.searchResults, i)}
                onQueue={(t) => player.addToQueue(t)}
                onFavorite={(t) => player.toggleFavorite(t)}
                isFavorite={player.isFavorite}
              />
              {player.searchResults.length === 0 && !player.searching && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Введите запрос — поиск идёт по каталогу Jamendo (лицензия Creative Commons).
                </p>
              )}
            </>
          )}

          {tab === 'queue' && (
            <TrackList
              tracks={player.queue}
              activeIndex={player.currentIndex ?? undefined}
              onPlay={(i) => playFromList(player.queue, i)}
              onFavorite={(t) => player.toggleFavorite(t)}
              isFavorite={player.isFavorite}
            />
          )}

          {tab === 'favorites' && (
            <TrackList
              tracks={player.favorites}
              onPlay={(i) => playFromList(player.favorites, i)}
              onQueue={(t) => player.addToQueue(t)}
              onFavorite={(t) => player.toggleFavorite(t)}
              isFavorite={player.isFavorite}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TrackList({
  tracks,
  activeIndex,
  onPlay,
  onQueue,
  onFavorite,
  isFavorite,
}: {
  tracks: Track[];
  activeIndex?: number;
  onPlay: (index: number) => void;
  onQueue?: (track: Track) => void;
  onFavorite: (track: Track) => void;
  isFavorite: (id: string) => boolean;
}) {
  if (tracks.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
      {tracks.map((t, i) => (
        <div
          key={`${t.id}-${i}`}
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: i === activeIndex ? 'var(--accent-bg)' : undefined }}
        >
          {t.imageUrl && <img src={t.imageUrl} alt="" width={28} height={28} style={{ borderRadius: 4, flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onPlay(i)}>
            <p style={{ fontSize: 12, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{t.artist}</p>
          </div>
          <button className="button-ghost" style={{ padding: '2px 6px', color: isFavorite(t.id) ? '#C9A227' : undefined }} onClick={() => onFavorite(t)}>
            {isFavorite(t.id) ? '★' : '☆'}
          </button>
          {onQueue && (
            <button className="button-ghost" style={{ padding: '2px 6px' }} onClick={() => onQueue(t)}>
              +
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
