import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, AdminStats, AdminUser, Team, Tournament, HeroDetail, DraftSession } from '../api';

export function AdminPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [heroes, setHeroes] = useState<HeroDetail[]>([]);
  const [drafts, setDrafts] = useState<DraftSession[]>([]);
  const [heroSearch, setHeroSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<'users' | 'teams' | 'tournaments' | 'heroes' | 'drafts' | 'trials' | 'security'>('users');
  const [securityLog, setSecurityLog] = useState<any[]>([]);
  const [reportQueue, setReportQueue] = useState<any[]>([]);
  const [trialTemplates, setTrialTemplates] = useState<any[]>([]);

  useEffect(() => {
    api.adminStats().then(setStats);
    api.adminUsers().then(setUsers);
    api.adminTeams().then(setTeams);
    api.adminTournaments().then(setTournaments);
    api.adminHeroes().then(setHeroes);
    api.adminActiveDrafts().then(setDrafts);
    api.adminTrialTemplates().then(setTrialTemplates);
    api.adminSecurityLog().then(setSecurityLog);
    api.adminReportQueue().then(setReportQueue);
  }, []);

  async function syncHeroes() {
    setSyncing(true);
    try {
      const res = await api.adminSyncHeroes();
      setHeroes(await api.adminHeroes());
      alert(`Синхронизировано героев: ${res.synced}`);
    } finally {
      setSyncing(false);
    }
  }

  async function toggleHeroCm(heroId: number, current: boolean) {
    await api.adminSetHeroCmAvailable(heroId, !current);
    setHeroes(await api.adminHeroes());
  }

  async function syncItems() {
    setSyncing(true);
    try {
      const res = await api.adminSyncItems();
      alert(`Синхронизирован справочник предметов: ${res.synced}`);
    } finally {
      setSyncing(false);
    }
  }

  async function syncHeroItems(heroId: number) {
    const res = await api.adminSyncHeroItems(heroId);
    alert(`Собрано по ${res.sampledMatches} матчам, найдено предметов: ${res.items.length}`);
    setHeroes(await api.adminHeroes());
  }

  async function toggleTrialActive(id: string, current: boolean) {
    await api.adminUpdateTrialTemplate(id, { active: !current });
    setTrialTemplates(await api.adminTrialTemplates());
  }

  async function updateReportStatus(id: string, status: string) {
    await api.adminUpdateReport(id, status);
    setReportQueue(await api.adminReportQueue());
  }

  async function banUser(id: string) {
    const reason = prompt('Причина бана (необязательно):') ?? undefined;
    await api.adminBanUser(id, reason);
    setUsers(await api.adminUsers());
  }

  async function unbanUser(id: string) {
    await api.adminUnbanUser(id);
    setUsers(await api.adminUsers());
  }

  async function editName(id: string, current: string) {
    const next = prompt('Новое отображаемое имя:', current);
    if (!next || next === current) return;
    await api.adminEditUser(id, { personaName: next });
    setUsers(await api.adminUsers());
  }

  async function forceCloseTournament(id: string) {
    if (!confirm('Принудительно закрыть этот турнир? Незавершённые матчи останутся как есть.')) return;
    await api.adminForceCloseTournament(id);
    setTournaments(await api.adminTournaments());
  }

  const tabStyle = (t: string) => ({
    background: tab === t ? 'var(--accent-bg)' : undefined,
    color: tab === t ? 'var(--accent)' : undefined,
  });

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 24 }}>
      <Link to="/profile" className="button-ghost" style={{ textDecoration: 'none' }}>← Профиль</Link>

      <p style={{ fontSize: 16, fontWeight: 500, margin: '16px 0 4px' }}>Админ-панель</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 18px' }}>
        Доступ определяется только переменной окружения ADMIN_STEAM_ID64 — в интерфейсе это не меняется.
      </p>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginBottom: 20 }}>
          <StatCard label="Пользователи" value={stats.users} />
          <StatCard label="Команды" value={stats.teams} />
          <StatCard label="Турниры" value={stats.tournaments} />
          <StatCard label="Матчи (синк)" value={stats.matches} />
          <StatCard label="Герои в базе" value={stats.heroes} />
          <StatCard label="Драфт-сессии" value={stats.draftSessions} />
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Обслуживание</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button-ghost" onClick={syncHeroes} disabled={syncing}>
            {syncing ? 'Синхронизация…' : 'Синхронизировать базу героев (OpenDota)'}
          </button>
          <button className="button-ghost" onClick={syncItems} disabled={syncing}>
            {syncing ? 'Синхронизация…' : 'Синхронизировать справочник предметов'}
          </button>
          <button className="button-ghost" onClick={() => api.adminCheckPatchNow().then(() => alert('Проверка версии патча запущена'))}>
            Проверить версию патча сейчас
          </button>
          <button
            className="button-ghost"
            style={{ color: 'var(--danger)' }}
            onClick={() => {
              if (confirm('Откатить версию патча на предыдущую? Это только переключит метку версии — характеристики героев/предметов из старого патча не восстанавливаются, они не сохранялись отдельно.')) {
                api.adminRollbackPatch().then(() => alert('Откачено')).catch(() => alert('Нечего откатывать — нет сохранённой предыдущей версии'));
              }
            }}
          >
            Откатить патч
          </button>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '6px 0 0' }}>
          Справочник предметов нужен один раз, до первого сбора сборок по герою — иначе там будут только числовые id.
          Версия патча проверяется автоматически каждые 45 минут — эта кнопка просто не заставляет ждать.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <button className="button-ghost" style={tabStyle('users')} onClick={() => setTab('users')}>Пользователи</button>
        <button className="button-ghost" style={tabStyle('teams')} onClick={() => setTab('teams')}>Команды</button>
        <button className="button-ghost" style={tabStyle('tournaments')} onClick={() => setTab('tournaments')}>Турниры</button>
        <button className="button-ghost" style={tabStyle('heroes')} onClick={() => setTab('heroes')}>Герои</button>
        <button className="button-ghost" style={tabStyle('drafts')} onClick={() => setTab('drafts')}>Драфты</button>
        <button className="button-ghost" style={tabStyle('trials')} onClick={() => setTab('trials')}>Trials</button>
        <button className="button-ghost" style={tabStyle('security')} onClick={() => setTab('security')}>Security</button>
      </div>

      {tab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {users.map((u) => (
            <div key={u.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={u.avatarFull} alt="" width={28} height={28} style={{ borderRadius: 6, opacity: u.isBanned ? 0.4 : 1 }} />
                  <div>
                    <p style={{ fontSize: 13, margin: '0 0 2px' }}>
                      {u.personaName}
                      {u.isAdmin && <span className="pill" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', marginLeft: 6 }}>ADMIN</span>}
                      {u.isBanned && <span className="pill" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginLeft: 6 }}>BANNED</span>}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                      account_id {u.accountId32} · {u._count.matches} матчей · {u._count.teamMemberships} команд(ы)
                      {!u.statsExposed && ' · статистика закрыта'}
                      {u.isBanned && u.banReason && ` · причина: ${u.banReason}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="button-ghost" onClick={() => editName(u.id, u.personaName)}>Имя</button>
                  {u.isBanned ? (
                    <button className="button-ghost" onClick={() => unbanUser(u.id)}>Разбанить</button>
                  ) : (
                    !u.isAdmin && <button className="button-ghost" style={{ color: 'var(--danger)' }} onClick={() => banUser(u.id)}>Забанить</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'teams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {teams.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.members.length} игроков</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'tournaments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tournaments.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.status} · {t.registrations.length}/{t.maxTeams}</span>
                {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (
                  <button className="button-ghost" style={{ color: 'var(--danger)' }} onClick={() => forceCloseTournament(t.id)}>
                    Закрыть принудительно
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'heroes' && (
        <div>
          <input
            placeholder="Поиск героя"
            value={heroSearch}
            onChange={(e) => setHeroSearch(e.target.value)}
            style={{ width: '100%', background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)', marginBottom: 10 }}
          />
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 10px' }}>
            По умолчанию все герои доступны в Captain's Mode — реального курируемого списка исключений (например, для только что вышедших героев) нет,
            это ручное переключение конкретных случаев.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {heroes
              .filter((h) => h.localizedName.toLowerCase().includes(heroSearch.toLowerCase()))
              .map((h) => (
                <div key={h.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={h.iconUrl} alt="" style={{ width: 40, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 4 }} />
                    <span style={{ fontSize: 13 }}>{h.localizedName}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="button-ghost" style={{ fontSize: 10 }} onClick={() => syncHeroItems(h.id)}>
                      Собрать предметы
                    </button>
                    <button
                      className="button-ghost"
                      style={{ color: h.captainsModeAvailable === false ? 'var(--danger)' : 'var(--accent)' }}
                      onClick={() => toggleHeroCm(h.id, h.captainsModeAvailable !== false)}
                    >
                      {h.captainsModeAvailable === false ? 'Недоступен в CM' : 'Доступен в CM'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === 'drafts' && (
        <div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 10px' }}>
            Любая активная или ожидающая партия — не только ваши собственные. Отмена хода доступна прямо на странице наблюдения.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {drafts.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Сейчас нет активных партий.</p>}
            {drafts.map((d) => (
              <Link
                key={d.id}
                to={`/draft-trainer/${d.id}`}
                className="card"
                style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}
              >
                <span style={{ fontSize: 13 }}>
                  {d.opponentType === 'matchmaking' ? 'Матч (поиск)' : d.opponentType === 'friend' ? 'С другом' : d.opponentType === 'ai' ? 'Против бота' : 'Соло'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {d.status === 'waiting_for_opponent' ? 'Ждём соперника' : `Шаг ${d.actions.length}/${d.sequence.length}`}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === 'trials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 10px' }}>
            Только COMMON/RARE/EPIC/LEGENDARY-параметры и вкл/выкл редактируются здесь — тип условия (`code`) привязан
            к конкретной функции-оценщику в коде, менять его через панель нельзя.
          </p>
          {trialTemplates.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, margin: '0 0 2px' }}>
                  {t.title}
                  <span className="pill" style={{ marginLeft: 8, fontSize: 9 }}>{t.difficulty}</span>
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>
                  {t.category} · {t.code} · +{t.rewardShards} Shards · выполнено {t.completionCount ?? 0} раз
                </p>
              </div>
              <button
                className="button-ghost"
                style={{ color: t.active ? 'var(--accent)' : 'var(--danger)' }}
                onClick={() => toggleTrialActive(t.id, t.active)}
              >
                {t.active ? 'Активно' : 'Отключено'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'security' && (
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px' }}>Очередь жалоб на игроков</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
            {reportQueue.map((r) => (
              <div key={r.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ fontSize: 12, margin: 0 }}>
                    <strong>{r.reporter?.personaName}</strong> → <strong>{r.reported?.personaName}</strong>
                  </p>
                  <span className="pill" style={{ fontSize: 9 }}>{r.category}</span>
                </div>
                <p style={{ fontSize: 12, margin: '0 0 8px', color: 'var(--text-secondary)' }}>{r.description}</p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {['PENDING', 'REVIEWED', 'ACTION_TAKEN', 'DISMISSED'].map((s) => (
                    <button
                      key={s}
                      className="button-ghost"
                      style={{ fontSize: 10, background: r.status === s ? 'var(--accent-bg)' : undefined, color: r.status === s ? 'var(--accent)' : undefined }}
                      onClick={() => updateReportStatus(r.id, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {reportQueue.length === 0 && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Жалоб пока нет.</p>}
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px' }}>Журнал безопасности (последние 200)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
            {securityLog.map((e) => (
              <div key={e.id} className="card" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span>
                  <strong>{e.type}</strong>{e.user ? ` — ${e.user.personaName}` : ''}
                  {e.metadata ? ` · ${JSON.stringify(e.metadata)}` : ''}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(e.createdAt).toLocaleString('ru-RU')}</span>
              </div>
            ))}
            {securityLog.length === 0 && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Событий пока нет.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{value}</p>
    </div>
  );
}
