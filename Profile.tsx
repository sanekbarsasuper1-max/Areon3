import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Me, MatchSummary, ProfileSummary, Hero } from '../api';

export function Profile() {
  const [me, setMe] = useState<Me | null>(null);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [heroesById, setHeroesById] = useState<Record<number, Hero>>({});
  const [syncing, setSyncing] = useState(false);
  const [shardBalance, setShardBalance] = useState<number | null>(null);
  const [hofCount, setHofCount] = useState<number | null>(null);

  useEffect(() => {
    api.shardBalance().then((r) => setShardBalance(r.balance));
    api.hallOfFameMine().then((entries) => setHofCount(entries.length));
  }, []);

  async function load() {
    const [meRes, summaryRes, matchesRes, heroesRes] = await Promise.all([
      api.me(),
      api.summary(),
      api.matches({ days: 30 }),
      api.heroes(),
    ]);
    setMe(meRes);
    setSummary(summaryRes);
    setMatches(matchesRes.slice(0, 5));
    setHeroesById(Object.fromEntries(heroesRes.map((h) => [h.id, h])));
  }

  useEffect(() => {
    load();
  }, []);

  async function sync() {
    setSyncing(true);
    try {
      await api.syncMatches();
      await load();
    } finally {
      setSyncing(false);
    }
  }

  if (!me || !summary) return <p style={{ padding: 24 }}>Загрузка…</p>;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'center' }}>
        <img
          src={me.avatarFull}
          alt=""
          style={{ width: 96, height: 96, borderRadius: 12 }}
        />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 18, fontWeight: 500, margin: '0 0 4px' }}>{me.personaName}</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
            {me.statsExposed ? 'Статистика доступна' : 'Статистика недоступна'}
          </p>
        </div>
        {shardBalance != null && (
          <Link to="/trials" className="card" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'right', padding: '8px 14px' }}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '0 0 2px', letterSpacing: 1 }}>ORION PLUS</p>
            <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#C9A227' }}>{shardBalance}</p>
          </Link>
        )}
      </div>

      {hofCount != null && hofCount > 0 && (
        <Link
          to="/hall-of-fame"
          className="card"
          style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: 20, padding: '10px 14px', border: '0.5px solid rgba(201,162,39,0.3)' }}
        >
          <p style={{ fontSize: 13, margin: 0 }}>🏛️ Зал славы Areon</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {hofCount} {hofCount === 1 ? 'историческое достижение' : hofCount < 5 ? 'исторических достижения' : 'исторических достижений'}
          </p>
        </Link>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: 20 }}>
        <Stat label="Winrate" value={`${summary.winrate}%`} />
        <Stat label="Wins / Losses" value={`${summary.wins} / ${summary.losses}`} />
        <Stat label="KDA" value={summary.avgKda} />
        <Stat label="GPM / XPM" value={`${summary.avgGpm} / ${summary.avgXpm}`} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Последние матчи</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/matches" className="button-ghost" style={{ textDecoration: 'none' }}>
            Все матчи
          </Link>
          <button className="button-ghost" onClick={sync} disabled={syncing}>
            {syncing ? 'Синхронизация…' : 'Обновить из OpenDota'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {matches.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Матчей пока нет — нажмите "Обновить из OpenDota".
          </p>
        )}
        {matches.map((m) => {
          const hero = heroesById[m.heroId];
          return (
            <Link
              key={m.matchId}
              to={`/matches/${m.id}`}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}
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
                {m.kills}/{m.deaths}/{m.assists}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{value}</p>
    </div>
  );
}
