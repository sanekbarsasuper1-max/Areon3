import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, Team, TeamInvite } from '../api';

export function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const navigate = useNavigate();

  async function load() {
    const [t, i] = await Promise.all([api.myTeams(), api.myInvites()]);
    setTeams(t);
    setInvites(i);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    const team = await api.createTeam(name.trim(), tag.trim() || undefined);
    navigate(`/teams/${team.id}`);
  }

  async function respond(inviteId: string, accept: boolean) {
    if (accept) await api.acceptInvite(inviteId);
    else await api.declineInvite(inviteId);
    load();
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 18px' }}>Команды</p>

      {invites.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Приглашения</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {invites.map((inv) => (
              <div key={inv.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>
                  {inv.team.name} — от {inv.invitedByUser.personaName}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="button-ghost" onClick={() => respond(inv.id, true)}>Принять</button>
                  <button className="button-ghost" onClick={() => respond(inv.id, false)}>Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        {teams.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Вы пока не состоите ни в одной команде.</p>
        )}
        {teams.map((t) => (
          <Link
            key={t.id}
            to={`/teams/${t.id}`}
            className="card"
            style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}
          >
            <span style={{ fontSize: 13 }}>{t.name} {t.tag && <span style={{ color: 'var(--text-secondary)' }}>[{t.tag}]</span>}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.members.length} игроков</span>
          </Link>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Создать команду</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: 1, background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)' }}
        />
        <input
          placeholder="Тег"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          style={{ width: 80, background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)' }}
        />
        <button className="button-primary" onClick={create}>Создать</button>
      </div>
    </div>
  );
}
