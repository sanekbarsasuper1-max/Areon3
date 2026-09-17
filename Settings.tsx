import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAudio } from '../audio/AudioContext';
import { api } from '../api';

export function Settings() {
  const { settings, updateSettings } = useAudio();
  const [patch, setPatch] = useState<Awaited<ReturnType<typeof api.patchStatus>> | null>(null);

  useEffect(() => {
    api.patchStatus().then(setPatch).catch(() => {});
  }, []);

  function slider(label: string, key: 'masterVolume' | 'musicVolume' | 'sfxVolume') {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13 }}>{label}</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{Math.round(settings[key] * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(settings[key] * 100)}
          onChange={(e) => updateSettings({ [key]: Number(e.target.value) / 100 })}
          style={{ width: '100%' }}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <Link to="/profile" className="button-ghost" style={{ textDecoration: 'none' }}>← Профиль</Link>

      <p style={{ fontSize: 16, fontWeight: 500, margin: '16px 0 20px' }}>Настройки</p>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
        Audio
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={settings.musicEnabled}
            onChange={(e) => updateSettings({ musicEnabled: e.target.checked })}
          />
          Музыка
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={settings.sfxEnabled}
            onChange={(e) => updateSettings({ sfxEnabled: e.target.checked })}
          />
          Звуковые эффекты
        </label>
      </div>

      {slider('Общая громкость (Master)', 'masterVolume')}
      {slider('Громкость музыки', 'musicVolume')}
      {slider('Громкость эффектов (SFX)', 'sfxVolume')}

      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '20px 0 0' }}>
        Настройки сохраняются в этом браузере и применяются автоматически при следующем входе — если музыка
        выключена, она не включится сама.
      </p>

      {patch && (
        <div style={{ marginTop: 28, paddingTop: 16, borderTop: '0.5px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
            Версия данных
          </p>
          <p style={{ fontSize: 12, margin: '0 0 2px' }}>Dota 2 patch: <strong>{patch.currentPatch}</strong></p>
          <p style={{ fontSize: 12, margin: '0 0 2px', color: patch.status === 'UP_TO_DATE' ? 'var(--accent)' : 'var(--text-secondary)' }}>
            Статус: {patch.status === 'UP_TO_DATE' ? 'Актуально' : patch.status === 'SYNCING' ? 'Синхронизация…' : patch.status === 'FAILED' ? 'Ошибка синхронизации' : 'Проверка…'}
          </p>
          {patch.lastSyncedAt && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              Последняя синхронизация: {new Date(patch.lastSyncedAt).toLocaleString('ru-RU')}
            </p>
          )}
        </div>
      )}

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '0.5px solid var(--border)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Trust Center
        </p>
        <div className="card" style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 12, margin: '0 0 6px' }}>🔒 Вход выполняется через официальный Steam — Areon никогда не видит и не хранит ваш пароль Steam.</p>
          <p style={{ fontSize: 12, margin: '0 0 6px' }}>🔐 Ваша сессия защищена подписанным токеном, который можно мгновенно отозвать кнопкой «Выйти» ниже.</p>
          <p style={{ fontSize: 12, margin: '0 0 6px' }}>🛡️ Подозрительная активность (попытки входа с забаненного или уже завершённого сеанса) фиксируется в журнале безопасности.</p>
          <p style={{ fontSize: 12, margin: '0 0 6px' }}>🚫 На любого игрока можно пожаловаться администрации прямо со страницы поиска игроков — жалоба никогда не приводит к автоматической блокировке, только к рассмотрению модератором.</p>
          <p style={{ fontSize: 12, margin: 0 }}>🔎 AREON НИКОГДА НЕ ЗАПРАШИВАЕТ ВАШ ПАРОЛЬ STEAM — ни в чате, ни в личных сообщениях, ни на самом сайте.</p>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
          Честно: ни одна платформа не может гарантировать полную неуязвимость — мы не станем этого обещать. Но каждую
          серьёзную угрозу мы стараемся закрывать по мере обнаружения, а не откладывать.
        </p>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '0.5px solid var(--border)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Аккаунт
        </p>
        <button
          className="button-ghost"
          style={{ color: 'var(--danger)' }}
          onClick={async () => {
            await api.logout().catch(() => {}); // even if the request fails, still send them to the login screen — nothing sensitive stays visible either way
            window.location.href = '/';
          }}
        >
          Выйти из аккаунта
        </button>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '6px 0 0' }}>
          Полностью завершает эту сессию — ссылка на вход снова понадобится через Steam.
        </p>
      </div>
    </div>
  );
}
