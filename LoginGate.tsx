import { api } from '../api';

export function LoginGate() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#08090a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
        textAlign: 'center',
        padding: 20,
      }}
    >
      <img src="/logo.jpg" alt="Areon" style={{ width: 220, height: 220, objectFit: 'contain', borderRadius: 8 }} />

      <p style={{ fontSize: 12, letterSpacing: 2, color: '#8fbfb2', margin: 0 }}>DOTA 2 PLATFORM</p>

      {/* Full page navigation, not a fetch call — this kicks off the
          Steam OpenID redirect handled entirely by the backend. */}
      <a
        href={api.loginUrl()}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
          padding: '12px 26px', fontSize: 14, fontWeight: 500,
          background: '#EDE6D3', color: '#08090a', borderRadius: 6,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.979 0C5.678 0 0.511 4.86 0.022 11.037l6.442 2.66c0.545-0.371 1.203-0.59 1.912-0.59 0.063 0 0.125 0.004 0.188 0.006l2.861-4.142v-0.058c0-2.505 2.036-4.541 4.541-4.541s4.542 2.036 4.542 4.541-2.037 4.541-4.542 4.541h-0.104l-4.077 2.91c0 0.052 0.003 0.104 0.003 0.155 0 1.895-1.541 3.437-3.437 3.437-1.657 0-3.038-1.174-3.362-2.733l-4.61-1.907c1.226 5.061 5.777 8.815 11.201 8.815 6.628 0 12.001-5.373 12.001-12.001S18.607 0 11.979 0z" />
        </svg>
        Войти через Steam
      </a>
    </div>
  );
}
