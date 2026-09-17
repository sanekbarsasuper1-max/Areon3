import { useEffect, useState } from 'react';
import { api, AreonVersion } from '../api';

const SECTION_LABELS: { key: keyof AreonVersion; label: string; color: string }[] = [
  { key: 'added', label: 'Добавлено', color: '#2FA98F' },
  { key: 'fixed', label: 'Исправлено', color: '#4a7fc4' },
  { key: 'improved', label: 'Улучшено', color: '#b98fd1' },
  { key: 'addressed', label: 'Учтено по предложениям игроков', color: '#C9A227' },
  { key: 'knownIssues', label: 'Известные проблемы', color: '#C97B63' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function UpdatesPage() {
  const [versions, setVersions] = useState<AreonVersion[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.versions().then((list) => {
      setVersions(list);
      if (list[0]) setExpanded(list[0].id);
    });
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <p style={{ fontSize: 18, fontWeight: 500, margin: '0 0 4px' }}>Что нового</p>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 24px' }}>История обновлений Areon</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {versions.map((v) => (
          <div key={v.id} className="card" style={{ padding: 16 }}>
            <button
              onClick={() => setExpanded(expanded === v.id ? null : v.id)}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, color: 'inherit' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Версия {v.version}</p>
                  {v.isCurrent && <span className="pill" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>Текущая</span>}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(v.releasedAt)}</span>
              </div>
            </button>

            {expanded === v.id && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {SECTION_LABELS.map(({ key, label, color }) => {
                  const items = v[key] as string[];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={key}>
                      <p style={{ fontSize: 11, color, margin: '0 0 6px', letterSpacing: 0.5, fontWeight: 500 }}>{label}</p>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {items.map((item, i) => (
                          <li key={i} style={{ fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)' }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {versions.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>История обновлений пока пуста.</p>}
      </div>
    </div>
  );
}
