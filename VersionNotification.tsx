import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const SEEN_KEY = 'areon_last_seen_version';

export function VersionNotification() {
  const [newVersion, setNewVersion] = useState<string | null>(null);

  useEffect(() => {
    api.currentVersion().then((v) => {
      if (!v) return;
      const lastSeen = localStorage.getItem(SEEN_KEY);
      if (lastSeen !== v.version) {
        setNewVersion(v.version);
      }
    });
  }, []);

  function dismiss(markSeen: boolean) {
    if (markSeen && newVersion) localStorage.setItem(SEEN_KEY, newVersion);
    setNewVersion(null);
  }

  if (!newVersion) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 90,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        background: 'var(--card)',
        border: '0.5px solid var(--accent)',
        borderRadius: 10,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{ fontSize: 12, margin: 0 }}>Areon обновлён до версии {newVersion}</p>
      <Link to="/updates" onClick={() => dismiss(true)} className="button-primary" style={{ textDecoration: 'none', fontSize: 11, padding: '5px 10px' }}>
        Посмотреть изменения
      </Link>
      <button onClick={() => dismiss(true)} className="button-ghost" style={{ padding: '5px 8px', fontSize: 11 }} aria-label="Закрыть">
        ✕
      </button>
    </div>
  );
}
