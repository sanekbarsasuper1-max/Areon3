import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, MinesweeperConfig, MinesweeperSession, MiniGameStats } from '../api';
import { useAudio } from '../audio/AudioContext';

// Same attribute palette Draft Trainer already uses (STR/AGI/INT/UNIVERSAL)
// — reused here for the mine-count numbers so this reads as part of the
// same visual system, not a bolted-on foreign game.
const NUMBER_COLOR: Record<number, string> = {
  1: '#4a7fc4',
  2: '#4e9c5e',
  3: '#c0524f',
  4: '#b98fd1',
  5: '#c9a227',
  6: '#4a7fc4',
  7: '#EDE6D3',
  8: '#8b887d',
};

function BombIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="14" r="8" fill="#1a1a1a" stroke="#C97B63" strokeWidth="1.5" />
      <path d="M12 6 L15 2 M15 2 L13.5 2.5 M15 2 L14.5 3.5" stroke="#c9a227" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="15" cy="2" r="1.3" fill="#C97B63" />
    </svg>
  );
}

function FlagIcon({ size = 12 }: { size?: number }) {
  // A stand-in "danger marker" — a stake with a pennant, deliberately
  // not a reproduction of any real Dota 2 asset.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <line x1="7" y1="3" x2="7" y2="21" stroke="#8b887d" strokeWidth="1.5" />
      <path d="M7 4 L18 8 L7 12 Z" fill="#2FA98F" />
    </svg>
  );
}

export function MinesweeperPage() {
  const [configs, setConfigs] = useState<MinesweeperConfig[]>([]);
  const [difficulty, setDifficulty] = useState('EASY');
  const [session, setSession] = useState<MinesweeperSession | null>(null);
  const [stats, setStats] = useState<MiniGameStats | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const { playSFX } = useAudio();

  useEffect(() => {
    api.minesweeperConfigs().then((list) => {
      setConfigs(list);
      if (list[0]) setDifficulty(list[0].difficulty);
    });
    api.minesweeperStats().then(setStats);
  }, []);

  useEffect(() => {
    if (!session || session.status !== 'IN_PROGRESS' || !startedAt) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(interval);
  }, [session, startedAt]);

  async function startGame() {
    const s = await api.minesweeperStart(difficulty);
    setSession(s);
    setStartedAt(Date.now());
    setElapsed(0);
  }

  async function reveal(index: number) {
    if (!session || session.status !== 'IN_PROGRESS') return;
    if (session.flaggedJson.includes(index) || session.revealedJson.includes(index)) return;
    const result = await api.minesweeperReveal(session.id, index);
    setSession(result.session);
    if (result.hitMine) {
      playSFX('minesweeper_explosion');
      setTimeout(() => playSFX('minesweeper_defeat'), 400);
    } else if (result.session.status === 'WON') {
      playSFX('minesweeper_victory');
    } else {
      playSFX('minesweeper_reveal');
    }
    if (result.session.status !== 'IN_PROGRESS') {
      api.minesweeperStats().then(setStats);
    }
  }

  async function toggleFlag(e: React.MouseEvent, index: number) {
    e.preventDefault();
    if (!session || session.status !== 'IN_PROGRESS') return;
    if (session.revealedJson.includes(index)) return;
    const wasFlagged = session.flaggedJson.includes(index);
    const updated = await api.minesweeperFlag(session.id, index);
    setSession(updated);
    playSFX(wasFlagged ? 'minesweeper_flag_remove' : 'minesweeper_flag_place');
  }

  const config = configs.find((c) => c.difficulty === difficulty);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>ТЕХИС: САПЁР</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Mini Games · Orion</p>
        </div>
        <Link to="/trials" className="button-ghost" style={{ textDecoration: 'none', fontSize: 11 }}>К испытаниям</Link>
      </div>

      {stats && (
        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16, fontSize: 11 }}>
          <div><p style={{ color: 'var(--text-muted)', margin: '0 0 2px' }}>Сыграно</p><p style={{ margin: 0 }}>{stats.played}</p></div>
          <div><p style={{ color: 'var(--text-muted)', margin: '0 0 2px' }}>Побед</p><p style={{ margin: 0 }}>{stats.wins} ({stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}%)</p></div>
          <div><p style={{ color: 'var(--text-muted)', margin: '0 0 2px' }}>Серия</p><p style={{ margin: 0 }}>{stats.currentWinStreak} (лучшая {stats.bestWinStreak})</p></div>
          <div><p style={{ color: 'var(--text-muted)', margin: '0 0 2px' }}>Лучшее время</p><p style={{ margin: 0 }}>{stats.bestTimeSec != null ? `${stats.bestTimeSec}s` : '—'}</p></div>
        </div>
      )}

      {(!session || session.status !== 'IN_PROGRESS') && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {configs.map((c) => (
              <button
                key={c.difficulty}
                className="button-ghost"
                style={{ background: difficulty === c.difficulty ? 'var(--accent-bg)' : undefined, color: difficulty === c.difficulty ? 'var(--accent)' : undefined }}
                onClick={() => setDifficulty(c.difficulty)}
              >
                {c.difficulty} · {c.boardWidth}×{c.boardHeight} · {c.mineCount} мин
              </button>
            ))}
          </div>
          {config && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px' }}>
              Победа: +{config.winShards} Orion Plus, +{config.winRating} рейтинга. Поражение: {config.lossShards} Orion Plus, {config.lossRating} рейтинга.
              Серия от {config.streakBonusThreshold} побед подряд — бонус +{config.streakBonusShards}.
            </p>
          )}
          <button className="button-primary" onClick={startGame}>
            {session?.status === 'WON' || session?.status === 'LOST' ? 'Играть снова' : 'Начать игру'}
          </button>
        </div>
      )}

      {session && (
        <>
          {session.status === 'IN_PROGRESS' && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
              {session.difficulty} · {elapsed}s · флажков: {session.flaggedJson.length}
            </p>
          )}

          {session.status === 'WON' && (
            <div className="card" style={{ marginBottom: 12, borderLeft: '3px solid #2FA98F', textAlign: 'center', padding: 20 }}>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#2FA98F', margin: '0 0 6px', letterSpacing: 1 }}>ОБЕЗВРЕЖЕНО</p>
              <p style={{ fontSize: 12, color: '#C9A227', margin: 0 }}>+{session.shardsAwarded} Orion Plus · +{session.ratingChange} рейтинга</p>
            </div>
          )}
          {session.status === 'LOST' && (
            <div className="card" style={{ marginBottom: 12, borderLeft: '3px solid #C97B63', textAlign: 'center', padding: 20 }}>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#C97B63', margin: '0 0 6px', letterSpacing: 1 }}>ПОДРЫВ</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                {session.shardsAwarded ? `${session.shardsAwarded} Orion Plus · ` : ''}{session.ratingChange} рейтинга
              </p>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${session.boardWidth}, 1fr)`,
              gap: 2,
              background: '#000',
              padding: 4,
              borderRadius: 6,
              maxWidth: '100%',
              overflowX: 'auto',
            }}
          >
            {Array.from({ length: session.boardWidth * session.boardHeight }, (_, i) => {
              const isRevealed = session.revealedJson.includes(i);
              const isFlagged = session.flaggedJson.includes(i);
              const isMine = session.status === 'LOST' && session.mineLayoutJson.includes(i);
              const number = session.cellNumbersJson[i];

              return (
                <button
                  key={i}
                  onClick={() => reveal(i)}
                  onContextMenu={(e) => toggleFlag(e, i)}
                  disabled={session.status !== 'IN_PROGRESS'}
                  style={{
                    aspectRatio: '1',
                    minWidth: 20,
                    background: isMine ? '#3a1512' : isRevealed ? '#151719' : '#22262a',
                    border: 'none',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: session.status === 'IN_PROGRESS' ? 'pointer' : 'default',
                    padding: 0,
                    fontSize: 11,
                    fontWeight: 600,
                    color: number != null ? NUMBER_COLOR[number] ?? 'var(--text-muted)' : undefined,
                  }}
                >
                  {isMine ? <BombIcon /> : isFlagged ? <FlagIcon /> : isRevealed && number ? number : null}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '8px 0 0' }}>
            Левый клик — открыть клетку. Правый клик — поставить/снять флажок.
          </p>
        </>
      )}
    </div>
  );
}
