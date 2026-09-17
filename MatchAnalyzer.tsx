import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Hero, MatchDetail as MatchDetailType } from '../api';

export function MatchAnalyzer() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<MatchDetailType | null>(null);
  const [hero, setHero] = useState<Hero | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coachDepth, setCoachDepth] = useState<'quick' | 'full' | 'coach'>('full');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachText, setCoachText] = useState<string | null>(null);
  const [coachStatus, setCoachStatus] = useState<string | null>(null);

  async function runCoach() {
    if (!id) return;
    setCoachLoading(true);
    setCoachText(null);
    setCoachStatus(null);
    try {
      const res = await api.coachAnalysis(id, coachDepth);
      if (res.status === 'processing') {
        setCoachStatus(res.message ?? 'Матч ещё разбирается — попробуйте через минуту.');
      } else if (res.reportJson) {
        setCoachText(res.reportJson.narrative);
      }
    } catch {
      setCoachStatus('Не удалось получить разбор — возможно, матч слишком старый и его нельзя распарсить, либо AI Coach не настроен администратором.');
    } finally {
      setCoachLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    setData(null);
    setError(null);

    api
      .matchDetail(id)
      .then(async (res) => {
        setData(res);
        const heroes = await api.heroes();
        setHero(heroes.find((h) => h.id === res.match.heroId) ?? null);
      })
      // The heavier /matches/{id} fetch can fail for a match OpenDota
      // hasn't parsed yet, or one this account isn't actually in — show
      // that plainly instead of a blank screen.
      .catch(() => setError('Не удалось загрузить разбор этого матча. Попробуйте ещё раз позже.'));
  }, [id]);

  if (error) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
        <Link to="/matches" className="button-ghost" style={{ textDecoration: 'none' }}>← Все матчи</Link>
        <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 20 }}>{error}</p>
      </div>
    );
  }

  if (!data) return <p style={{ padding: 24 }}>Загрузка…</p>;

  const { match, detail } = data;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <Link to="/matches" className="button-ghost" style={{ textDecoration: 'none' }}>← Все матчи</Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 6, height: 22, borderRadius: 3, background: match.won ? 'var(--accent)' : 'var(--danger)' }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>
              {hero ? (
                <Link to={`/heroes/${hero.id}`} style={{ color: 'inherit' }}>{hero.localizedName}</Link>
              ) : (
                `Герой #${match.heroId}`
              )}
              {' '}· {match.won ? 'Победа' : 'Поражение'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
              {formatDuration(match.durationSec)} · {new Date(match.startTime).toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 8, marginBottom: 20 }}>
        <Stat label="K / D / A" value={`${match.kills}/${match.deaths}/${match.assists}`} />
        <Stat label="GPM" value={match.goldPerMin} />
        <Stat label="XPM" value={match.xpPerMin} />
        <Stat label="Урон героям" value={detail.heroDamage} />
        <Stat label="Last hits" value={detail.lastHits} />
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
        Накопленное золото по ходу игры
      </p>
      <div className="card" style={{ marginBottom: 20 }}>
        <NetWorthChart series={detail.goldT} />
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
          Приближение net worth (без учёта потраченного/проданного золота)
        </p>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Разбор игры</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {detail.insights.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Ничего не отклоняется от нормы настолько, чтобы это отмечать.
          </p>
        )}
        {detail.insights.map((insight, i) => (
          <div key={i} className="card" style={{ display: 'flex', gap: 12 }}>
            <span
              className="pill"
              style={{
                background: insight.tone === 'positive' ? 'var(--accent-bg)' : 'var(--danger-bg)',
                color: insight.tone === 'positive' ? 'var(--accent)' : 'var(--danger)',
                flexShrink: 0,
              }}
            >
              {insight.tone === 'positive' ? '+' : '−'}
            </span>
            <p style={{ fontSize: 12, color: '#c7c3b6', margin: 0 }}>{insight.message}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '0.5px solid var(--border)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>AI Coach</p>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 10px' }}>
          Требует разбора реплея матча Valve (обычно 1-5 минут при первом запросе) — не все матчи можно
          распарсить, особенно очень старые. Каждый пункт разбора помечается моделью как "Confirmed" (прямо
          следует из данных) или "Likely" (интерпретация/рекомендация ИИ).
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select
            value={coachDepth}
            onChange={(e) => setCoachDepth(e.target.value as any)}
            style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)' }}
          >
            <option value="quick">Quick — коротко</option>
            <option value="full">Full — полный разбор</option>
            <option value="coach">Coach Mode — максимально подробно</option>
          </select>
          <button className="button-primary" onClick={runCoach} disabled={coachLoading}>
            {coachLoading ? 'Разбираю…' : 'Разбор AI Coach'}
          </button>
        </div>
        {coachStatus && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{coachStatus}</p>}
        {coachText && (
          <div className="card" style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 }}>{coachText}</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{value}</p>
    </div>
  );
}

// No chart library wired into this scaffold — a plain SVG polyline is
// enough for a trend line and keeps the frontend dependency list small.
function NetWorthChart({ series }: { series: number[] }) {
  if (!series || series.length < 2) {
    return <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Недостаточно данных для графика</p>;
  }

  const width = 600;
  const height = 70;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;

  const points = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth={2} />
    </svg>
  );
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
