import { useEffect, useState } from 'react';
import { api, SupportTicket } from '../api';

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'BUG', label: 'Проблема / ошибка' },
  { key: 'QUESTION', label: 'Вопрос' },
  { key: 'ACCOUNT', label: 'Проблема с аккаунтом' },
  { key: 'GAMEPLAY', label: 'Проблема с игрой' },
  { key: 'SUGGESTION', label: 'Предложение' },
  { key: 'OTHER', label: 'Другое' },
];

export function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [category, setCategory] = useState('BUG');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  function load() {
    api.myTickets().then(setTickets);
  }
  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.createTicket(category, message.trim());
      setMessage('');
      load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
      <p style={{ fontSize: 18, fontWeight: 500, margin: '0 0 4px' }}>Поддержка</p>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 20px' }}>Напишите нам напрямую — мы ответим здесь же.</p>

      <form onSubmit={submit} className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className="button-ghost"
              style={{ background: category === c.key ? 'var(--accent-bg)' : undefined, color: category === c.key ? 'var(--accent)' : undefined, fontSize: 11 }}
              onClick={() => setCategory(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Опишите проблему или вопрос…"
          rows={4}
          style={{ width: '100%', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 6, padding: 10, fontSize: 13, color: 'var(--text)', resize: 'vertical', marginBottom: 10, boxSizing: 'border-box' }}
        />
        <button className="button-primary" type="submit" disabled={sending || !message.trim()}>
          {sending ? 'Отправка…' : 'Отправить'}
        </button>
      </form>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px' }}>Мои обращения</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tickets.map((t) => (
          <div key={t.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="pill" style={{ background: 'var(--card)', fontSize: 10 }}>{CATEGORIES.find((c) => c.key === t.category)?.label ?? t.category}</span>
              <span className="pill" style={{ color: t.status === 'OPEN' ? 'var(--accent)' : 'var(--text-muted)', fontSize: 10 }}>
                {t.status === 'OPEN' ? 'Открыто' : 'Закрыто'}
              </span>
            </div>
            <p style={{ fontSize: 13, margin: '0 0 8px' }}>{t.message}</p>
            {t.adminReply && (
              <div style={{ background: 'var(--accent-bg)', borderRadius: 6, padding: 10 }}>
                <p style={{ fontSize: 10, color: 'var(--accent)', margin: '0 0 4px' }}>Ответ администрации</p>
                <p style={{ fontSize: 13, margin: 0 }}>{t.adminReply}</p>
              </div>
            )}
          </div>
        ))}
        {tickets.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Обращений пока нет.</p>}
      </div>
    </div>
  );
}
