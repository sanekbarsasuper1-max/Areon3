import { useEffect, useState } from 'react';
import { api, Suggestion } from '../api';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: 'Получено', color: '#8b887d' },
  UNDER_REVIEW: { label: 'На рассмотрении', color: '#4a7fc4' },
  PLANNED: { label: 'Запланировано', color: '#b98fd1' },
  IN_PROGRESS: { label: 'В разработке', color: '#C9A227' },
  IMPLEMENTED: { label: 'Реализовано', color: '#2FA98F' },
  REJECTED: { label: 'Отклонено', color: '#C97B63' },
};

export function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  function load() {
    api.suggestions().then(setSuggestions);
  }
  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSending(true);
    try {
      await api.createSuggestion(title.trim(), description.trim());
      setTitle('');
      setDescription('');
      load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
      <p style={{ fontSize: 18, fontWeight: 500, margin: '0 0 4px' }}>Предложить улучшение</p>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Areon развивается вместе с игроками — предложите, что добавить, изменить или исправить.
      </p>

      <form onSubmit={submit} className="card" style={{ marginBottom: 24 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Коротко — что предлагаете?"
          style={{ width: '100%', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, color: 'var(--text)', marginBottom: 8, boxSizing: 'border-box' }}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Опишите идею подробнее…"
          rows={3}
          style={{ width: '100%', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 6, padding: 10, fontSize: 13, color: 'var(--text)', resize: 'vertical', marginBottom: 10, boxSizing: 'border-box' }}
        />
        <button className="button-primary" type="submit" disabled={sending || !title.trim() || !description.trim()}>
          {sending ? 'Отправка…' : 'Предложить'}
        </button>
      </form>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px' }}>Предложения игроков</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map((s) => {
          const status = STATUS_LABELS[s.status] ?? STATUS_LABELS.RECEIVED;
          return (
            <div key={s.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{s.title}</p>
                <span className="pill" style={{ color: status.color, background: `${status.color}1a`, flexShrink: 0, marginLeft: 8 }}>{status.label}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{s.description}</p>
              {s.user && <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>от {s.user.personaName}</p>}
              {s.implementedInVersion && (
                <p style={{ fontSize: 11, color: '#2FA98F', margin: '6px 0 0' }}>✓ Реализовано в версии {s.implementedInVersion.version}</p>
              )}
              {s.adminNote && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0', fontStyle: 'italic' }}>{s.adminNote}</p>}
            </div>
          );
        })}
        {suggestions.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Предложений пока нет — станьте первым.</p>}
      </div>
    </div>
  );
}
