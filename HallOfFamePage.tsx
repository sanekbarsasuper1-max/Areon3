import { useEffect, useState } from 'react';
import { api, HofRecordType, HofEntry } from '../api';

const CATEGORY_LABELS: Record<string, string> = {
  RECORDS: '🏆 Рекорды',
  TOURNAMENTS: '⚔️ Турниры',
  STREAKS: '🔥 Серии',
  PLUS_POINTS: '💎 Orion Plus Points',
  MATCHES: '⚡ Матчи',
  LEGENDS: '👑 Легенды Areon',
};
const CATEGORY_ORDER = ['LEGENDS', 'RECORDS', 'TOURNAMENTS', 'STREAKS', 'PLUS_POINTS', 'MATCHES'];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function HallOfFamePage() {
  const [types, setTypes] = useState<HofRecordType[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [history, setHistory] = useState<{ recordType: HofRecordType; entries: HofEntry[] } | null>(null);

  useEffect(() => {
    api.hallOfFame().then(setTypes);
  }, []);

  useEffect(() => {
    if (!selectedKey) {
      setHistory(null);
      return;
    }
    api.hallOfFameRecord(selectedKey).then(setHistory);
  }, [selectedKey]);

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    types: types.filter((t) => t.category === cat && t.entries.length > 0),
  })).filter((g) => g.types.length > 0);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ fontSize: 20, fontWeight: 500, margin: 0, letterSpacing: 2 }}>ЗАЛ СЛАВЫ AREON</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 0' }}>
          Летопись платформы — кто был первым, кто устанавливал рекорды, кто их побивал.
        </p>
      </div>

      {history ? (
        <RecordHistoryView history={history} onBack={() => setSelectedKey(null)} />
      ) : (
        <>
          {byCategory.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              История только начинается — здесь пока пусто. Первые записи появятся по мере того, как игроки будут
              устанавливать рекорды.
            </p>
          )}
          {byCategory.map((group) => (
            <div key={group.category} style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px', letterSpacing: 1 }}>
                {CATEGORY_LABELS[group.category] ?? group.category}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.types.map((t) =>
                  t.entries.map((e) => <EventCard key={e.id} type={t} entry={e} onClick={() => setSelectedKey(t.key)} />),
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function EventCard({ type, entry, onClick }: { type: HofRecordType; entry: HofEntry; onClick: () => void }) {
  const name = entry.user?.personaName ?? entry.team?.name ?? '—';
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        border: entry.isPinned ? '0.5px solid rgba(201,162,39,0.4)' : undefined,
        background: entry.isPinned ? 'linear-gradient(180deg, rgba(201,162,39,0.05), transparent)' : undefined,
        padding: 16,
      }}
    >
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 6px', letterSpacing: 1 }}>
        {type.icon} {type.title.toUpperCase()}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        {entry.user?.avatarFull && <img src={entry.user.avatarFull} alt="" width={32} height={32} style={{ borderRadius: 6 }} />}
        {entry.team?.logoUrl && <img src={entry.team.logoUrl} alt="" width={32} height={32} style={{ borderRadius: 6 }} />}
        <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{name}</p>
      </div>
      <p style={{ fontSize: 13, margin: '0 0 8px', color: 'var(--text-secondary)' }}>{entry.value}</p>
      {entry.description && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px' }}>{entry.description}</p>}
      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>📅 {formatDate(entry.achievedAt)}</p>
    </button>
  );
}

function RecordHistoryView({ history, onBack }: { history: { recordType: HofRecordType; entries: HofEntry[] }; onBack: () => void }) {
  const { recordType, entries } = history;
  const chronological = [...entries].reverse();
  return (
    <div>
      <button className="button-ghost" onClick={onBack} style={{ marginBottom: 16 }}>← Ко всем категориям</button>
      <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 4px' }}>{recordType.icon} {recordType.title}</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 20px' }}>
        {recordType.mode === 'SUPERSEDING' && 'История изменения рекорда — от первого держателя до текущего.'}
        {recordType.mode === 'ONE_TIME' && 'Разовое достижение — присуждается только первому.'}
        {recordType.mode === 'PER_EVENT' && 'Каждое событие — отдельная постоянная запись в истории.'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {chronological.map((e, i) => (
          <div key={e.id} className="card" style={{ opacity: e.isCurrent ? 1 : 0.6, borderLeft: e.isCurrent ? '3px solid #2FA98F' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {e.user?.avatarFull && <img src={e.user.avatarFull} alt="" width={24} height={24} style={{ borderRadius: 5 }} />}
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{e.user?.personaName ?? e.team?.name ?? '—'}</p>
              </div>
              {e.isCurrent && <span className="pill" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>Текущий рекорд</span>}
              {!e.isCurrent && i === chronological.length - 1 && <span className="pill" style={{ color: 'var(--text-muted)' }}>Первый держатель</span>}
            </div>
            <p style={{ fontSize: 13, margin: '6px 0 4px' }}>{e.value}</p>
            {e.description && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>{e.description}</p>}
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>📅 {formatDate(e.achievedAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
