import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { api, Hero, MatchSummary } from '../api';
import { useAudio } from '../audio/AudioContext';

export function AllMatches() {
  const [heroesById, setHeroesById] = useState<Record<number, Hero>>({});
  const [heroList, setHeroList] = useState<Hero[]>([]);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [heroId, setHeroId] = useState<number | undefined>();
  const [result, setResult] = useState<'win' | 'loss' | undefined>();
  const [days, setDays] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const { playSFX } = useAudio();

  useEffect(() => {
    playSFX('nav_statistics_open');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.heroes().then((h) => {
      setHeroList(h);
      setHeroesById(Object.fromEntries(h.map((x) => [x.id, x])));
    });
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.matches({ heroId, result, days });
      setMatches(data);
    } finally {
      setLoading(false);
    }
  }

  // Every filter change re-queries our own Postgres copy via
  // GET /players/me/matches — no live OpenDota call happens here.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId, result, days]);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={{ fontSize: 16, fontWeight: 500 }}>Все матчи</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{matches.length} матчей</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <select
          value={heroId ?? ''}
          onChange={(e) => setHeroId(e.target.value ? Number(e.target.value) : undefined)}
          style={selectStyle}
        >
          <option value="">Герой: любой</option>
          {heroList.map((h) => (
            <option key={h.id} value={h.id}>{h.localizedName}</option>
          ))}
        </select>

        <select
          value={result ?? ''}
          onChange={(e) => setResult((e.target.value || undefined) as 'win' | 'loss' | undefined)}
          style={selectStyle}
        >
          <option value="">Результат: любой</option>
          <option value="win">Победы</option>
          <option value="loss">Поражения</option>
        </select>

        <select
          value={days ?? ''}
          onChange={(e) => setDays(e.target.value ? Number(e.target.value) : undefined)}
          style={selectStyle}
        >
          <option value="">Любой период</option>
          <option value="7">7 дней</option>
          <option value="30">30 дней</option>
          <option value="90">90 дней</option>
        </select>
      </div>

      {loading && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Загрузка…</p>}

      {!loading && matches.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Ничего не найдено под эти фильтры — либо ещё нет синхронизированных матчей.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {matches.map((m) => {
          const hero = heroesById[m.heroId];
          return (
            <Link
              key={m.matchId}
              to={`/matches/${m.id}`}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                textDecoration: 'none', color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 4, height: 20, borderRadius: 2,
                    background: m.won ? 'var(--accent)' : 'var(--danger)',
                  }}
                />
                {hero?.iconUrl && (
                  <img src={hero.iconUrl} alt="" style={{ width: 32, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 4 }} />
                )}
                <span style={{ fontSize: 13 }}>{hero?.localizedName ?? `Герой #${m.heroId}`}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {m.kills}/{m.deaths}/{m.assists} · {m.goldPerMin} GPM · {formatDuration(m.durationSec)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const selectStyle: CSSProperties = {
  background: 'var(--card)',
  border: '0.5px solid var(--border)',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--text)',
};
