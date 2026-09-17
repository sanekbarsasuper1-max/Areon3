import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const steps = [
  { title: 'Откройте Dota 2', detail: 'Settings → Options → Advanced Options' },
  { title: 'Включите "Expose Public Match Data"', detail: 'Вкладка Social, по умолчанию выключено' },
  { title: 'Сыграйте один матч или подождите пару минут', detail: 'Прошлые матчи не восстановятся' },
];

export function OnboardingExposeData() {
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  async function recheck() {
    setChecking(true);
    try {
      const { statsExposed } = await api.statsStatus();
      if (statsExposed) navigate('/profile');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} />
        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Данные матчей закрыты</p>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 28px' }}>
        Steam вход выполнен, но Dota 2 не передаёт нам историю ваших матчей — эта настройка
        по умолчанию выключена самим Valve, а не Areon.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
        {steps.map((s, i) => (
          <div key={s.title} style={{ display: 'flex', gap: 14 }}>
            <span
              style={{
                width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-bg)',
                color: 'var(--accent)', fontSize: 12, fontWeight: 500, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {i + 1}
            </span>
            <div>
              <p style={{ fontSize: 13, margin: '0 0 2px' }}>{s.title}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{s.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <button className="button-primary" onClick={recheck} disabled={checking}>
        {checking ? 'Проверяем…' : 'Проверить снова'}
      </button>
    </div>
  );
}
