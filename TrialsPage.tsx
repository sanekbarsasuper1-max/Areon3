import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, TrialCycle, TrialItem } from '../api';

const DIFFICULTY_COLOR: Record<string, string> = {
  COMMON: '#8b887d',
  RARE: '#4a7fc4',
  EPIC: '#b98fd1',
  LEGENDARY: '#C9A227',
};

function formatCountdown(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'Обновление...';
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${days}d ${hours}h ${minutes}m`;
}

function progressFraction(trial: TrialItem): { current: number; target: number } {
  const target = trial.template.targetValue;
  if (trial.status === 'COMPLETED') return { current: target, target };
  const p = trial.progressJson ?? {};
  const current = p.count ?? p.currentStreak ?? p.best ?? 0;
  return { current: Math.min(current, target), target };
}

export function TrialsPage() {
  const [cycle, setCycle] = useState<TrialCycle | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [history, setHistory] = useState<TrialCycle[]>([]);
  const [now, setNow] = useState(Date.now());
  const [justCompleted, setJustCompleted] = useState<TrialItem[]>([]);
  const previouslyActiveIds = useRef<Set<string> | null>(null);

  async function load() {
    const [c, b] = await Promise.all([api.myTrialCycle(), api.shardBalance()]);
    if (previouslyActiveIds.current) {
      const newlyDone = (c?.trials ?? []).filter(
        (t) => t.status === 'COMPLETED' && previouslyActiveIds.current!.has(t.id),
      );
      if (newlyDone.length > 0) {
        setJustCompleted(newlyDone);
        setTimeout(() => setJustCompleted([]), 5000);
      }
    }
    previouslyActiveIds.current = new Set((c?.trials ?? []).filter((t) => t.status === 'ACTIVE').map((t) => t.id));
    setCycle(c);
    setBalance(b.balance);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000); // catches trial completions from syncing elsewhere in the app
    const clock = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === 'history' && history.length === 0) {
      api.trialHistory().then(setHistory);
    }
  }, [tab, history.length]);

  if (!cycle) return <p style={{ padding: 24 }}>Загрузка…</p>;

  const completedCount = cycle.trials.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>ORION TRIALS</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Complete trials. Earn Orion Plus Shards.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 2px', letterSpacing: 1 }}>ORION PLUS</p>
          <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#C9A227' }}>{balance ?? '—'}</p>
          <Link to="/shop" style={{ fontSize: 10, color: 'var(--text-muted)', textDecoration: 'none' }}>Магазин (скоро)</Link>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>CURRENT CYCLE · {completedCount} / {cycle.trials.length} Trials</span>
        {cycle.status === 'ACTIVE' && (
          <span style={{ fontSize: 12, color: 'var(--accent)' }}>RESET IN {formatCountdown(cycle.endsAt)}</span>
        )}
      </div>

      {justCompleted.map((t) => {
        const isLegendary = t.template.difficulty === 'LEGENDARY';
        return (
          <div
            key={t.id}
            className="card"
            style={{
              borderLeft: `3px solid ${isLegendary ? '#C9A227' : '#2FA98F'}`,
              marginBottom: 8,
              boxShadow: isLegendary ? '0 0 16px rgba(201,162,39,0.25)' : undefined,
            }}
          >
            <p style={{ fontSize: 12, color: isLegendary ? '#C9A227' : '#2FA98F', margin: 0 }}>
              {isLegendary ? '✨ LEGENDARY TRIAL COMPLETED' : '⚡ TRIAL COMPLETED'} — {t.template.title}
            </p>
            <p style={{ fontSize: isLegendary ? 15 : 13, fontWeight: 500, margin: '2px 0 0', color: '#C9A227' }}>
              +{t.template.rewardShards} ORION PLUS SHARDS
            </p>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <button className="button-ghost" style={{ background: tab === 'active' ? 'var(--accent-bg)' : undefined, color: tab === 'active' ? 'var(--accent)' : undefined }} onClick={() => setTab('active')}>
          Текущий цикл
        </button>
        <button className="button-ghost" style={{ background: tab === 'history' ? 'var(--accent-bg)' : undefined, color: tab === 'history' ? 'var(--accent)' : undefined }} onClick={() => setTab('history')}>
          История
        </button>
      </div>

      {tab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cycle.trials.map((t) => {
            const { current, target } = progressFraction(t);
            const pct = target > 0 ? Math.round((current / target) * 100) : 0;
            return (
              <div key={t.id} className="card" style={{ opacity: t.status === 'COMPLETED' ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{t.template.title}</span>
                  <span style={{ fontSize: 10, color: DIFFICULTY_COLOR[t.template.difficulty], letterSpacing: 1 }}>
                    {t.template.difficulty}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 8px' }}>{t.description}</p>
                <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: t.status === 'COMPLETED' ? '#2FA98F' : DIFFICULTY_COLOR[t.template.difficulty] }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {t.status === 'COMPLETED' ? 'COMPLETED ✓' : `${current} / ${target}`}
                  </span>
                  <span style={{ fontSize: 11, color: '#C9A227' }}>+{t.template.rewardShards} Orion Plus</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Прошлых циклов пока нет.</p>}
          {history.map((c) => {
            const done = c.trials.filter((t) => t.status === 'COMPLETED');
            const earned = done.reduce((sum, t) => sum + t.template.rewardShards, 0);
            const best = done.reduce<string | null>((acc, t) => {
              const order = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'];
              if (!acc || order.indexOf(t.template.difficulty) > order.indexOf(acc)) return t.template.difficulty;
              return acc;
            }, null);
            return (
              <div key={c.id} className="card">
                <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 4px' }}>CYCLE {c.cycleNumber}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                  {done.length} / {c.trials.length} completed · {earned} Shards{best ? ` · Best: ${best}` : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
