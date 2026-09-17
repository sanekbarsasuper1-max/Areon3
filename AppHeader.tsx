import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Me, api } from '../api';

const NAV_ITEMS: { to: string; label: string }[] = [
  { to: '/profile', label: 'Профиль' },
  { to: '/matches', label: 'Матчи' },
  { to: '/teams', label: 'Команда' },
  { to: '/tournaments', label: 'Турниры' },
  { to: '/draft-trainer', label: 'Draft Trainer' },
  { to: '/players/search', label: 'Найти игроков' },
  { to: '/trials', label: 'Orion Trials' },
  { to: '/shop', label: 'Магазин' },
  { to: '/minigames/minesweeper', label: 'Техис: Сапёр' },
  { to: '/wheel-of-fate', label: 'Wheel of Fate' },
  { to: '/hall-of-fame', label: 'Зал славы' },
  { to: '/updates', label: 'Что нового' },
  { to: '/support', label: 'Поддержка' },
  { to: '/suggestions', label: 'Предложить' },
  { to: '/settings', label: 'Настройки' },
];

export function AppHeader({ me }: { me: Me }) {
  const location = useLocation();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    api.currentVersion().then((v) => setVersion(v?.version ?? null));
  }, []);

  return (
    <div
      style={{
        position: 'sticky', top: 0, zIndex: 10, background: '#08090a',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          maxWidth: 680, margin: '0 auto', padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 16,
        }}
      >
        <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 28 28">
            <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" fill="none" stroke="#2FA98F" strokeWidth="1.4" />
            <path d="M14 8 L19 19 M14 8 L9 19 M10.5 15 H17.5" fill="none" stroke="#2FA98F" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: 1, color: '#EDE6D3' }}>AREON</span>
        </Link>
        {version && (
          <Link to="/updates" style={{ fontSize: 10, color: 'var(--text-muted)', textDecoration: 'none', flexShrink: 0, marginLeft: -10 }}>
            v{version}
          </Link>
        )}

        {/* Horizontally scrollable on purpose — this is the same set of
            links that used to be a wrapping row of buttons on the
            profile page; a scroll strip is the pragmatic mobile-safe
            option now that it's a persistent header on every page,
            not a dropdown/hamburger this pass didn't build. */}
        <nav style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  flexShrink: 0, textDecoration: 'none', fontSize: 12, padding: '6px 10px', borderRadius: 6,
                  color: active ? '#2FA98F' : '#9c988a',
                  background: active ? 'rgba(47,169,143,0.14)' : 'transparent',
                }}
              >
                {item.label}
              </Link>
            );
          })}
          {me.isAdmin && (
            <Link
              to="/admin"
              style={{
                flexShrink: 0, textDecoration: 'none', fontSize: 12, padding: '6px 10px', borderRadius: 6,
                color: location.pathname.startsWith('/admin') ? '#2FA98F' : '#C97B63',
                background: location.pathname.startsWith('/admin') ? 'rgba(47,169,143,0.14)' : 'transparent',
              }}
            >
              Админ
            </Link>
          )}
        </nav>

        <Link to="/profile" style={{ flexShrink: 0 }}>
          <img src={me.avatarFull} alt="" width={28} height={28} style={{ borderRadius: 6, display: 'block' }} />
        </Link>
      </div>
    </div>
  );
}
