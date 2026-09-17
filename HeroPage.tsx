import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, HeroDetail, Hero, Item } from '../api';

export function HeroPage() {
  const { id } = useParams<{ id: string }>();
  const [hero, setHero] = useState<HeroDetail | null>(null);
  const [heroesById, setHeroesById] = useState<Record<number, Hero>>({});
  const [itemsById, setItemsById] = useState<Record<number, Item>>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([api.hero(Number(id)), api.heroes(), api.items()]).then(([h, list, items]) => {
      setHero(h);
      setHeroesById(Object.fromEntries(list.map((x) => [x.id, x])));
      setItemsById(Object.fromEntries(items.map((x) => [x.id, x])));
    });
  }, [id]);

  if (!hero) return <p style={{ padding: 24 }}>Загрузка…</p>;

  const counters = hero.countersJson;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <Link to="/matches" className="button-ghost" style={{ textDecoration: 'none' }}>← Назад</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '16px 0 20px' }}>
        <img src={hero.iconUrl} alt="" style={{ width: 96, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 12 }} />
        <div>
          <p style={{ fontSize: 17, fontWeight: 500, margin: '0 0 4px' }}>{hero.localizedName}</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="pill" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
              {hero.primaryAttr}
            </span>
            {hero.roles.map((r) => (
              <span key={r} className="pill" style={{ border: '0.5px solid var(--border)' }}>{r}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, marginBottom: 22 }}>
        <Stat label="Сила" value={hero.baseStr} />
        <Stat label="Ловкость" value={hero.baseAgi} />
        <Stat label="Интеллект" value={hero.baseInt} />
        <Stat label="Скорость" value={hero.moveSpeed} />
      </div>

      {!counters && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Контрпики ещё не рассчитаны для этого героя.
        </p>
      )}

      {counters && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Хорош против</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {counters.goodAgainst.map((c) => (
                <span key={c.heroId} className="pill" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                  {heroesById[c.heroId]?.localizedName ?? `#${c.heroId}`} · {Math.round(c.winrate * 100)}%
                </span>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Слаб против</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {counters.weakAgainst.map((c) => (
                <span key={c.heroId} className="pill" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                  {heroesById[c.heroId]?.localizedName ?? `#${c.heroId}`} · {Math.round(c.winrate * 100)}%
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '22px 0 6px' }}>Часто покупаемые предметы</p>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 10px' }}>
        По винрейту в недавних матчах на этом герое — не привязано к конкретному сопернику, такого источника данных нет.
      </p>
      {!hero.itemBuildsJson && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ещё не рассчитано для этого героя.</p>
      )}
      {hero.itemBuildsJson && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {hero.itemBuildsJson.items.map((b) => {
            const item = itemsById[b.itemId];
            return (
              <div key={b.itemId} className="card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
                {item?.iconUrl && <img src={item.iconUrl} alt="" width={28} height={28} style={{ borderRadius: 4 }} />}
                <div>
                  <p style={{ fontSize: 11, margin: 0 }}>{item?.dname ?? `#${b.itemId}`}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>{Math.round(b.winrate * 100)}% ({b.games} игр)</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="card">
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{value ?? '—'}</p>
    </div>
  );
}
