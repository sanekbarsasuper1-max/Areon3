import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, Team, Me } from '../api';

export function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [inviteId, setInviteId] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const [t, m] = await Promise.all([api.team(id), api.me()]);
    setTeam(t);
    setMe(m);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function invite() {
    if (!id || !inviteId.trim()) return;
    setError(null);
    try {
      await api.inviteToTeam(id, Number(inviteId.trim()));
      setInviteId('');
    } catch {
      // Most likely cause: that account_id has never logged into Areon —
      // see the limitation noted in the backend README.
      setError('Не удалось пригласить — скорее всего, этот игрок ещё ни разу не заходил в Areon.');
    }
  }

  async function transferTo(newOwnerUserId: string, name: string) {
    if (!id) return;
    if (!confirm(`Передать владение командой игроку ${name}? Вы станете капитаном.`)) return;
    try {
      await api.transferOwnership(id, newOwnerUserId);
      load();
    } catch {
      setError('Не удалось передать владение.');
    }
  }

  async function leaveTeam() {
    if (!id || !me) return;
    if (!confirm('Покинуть команду?')) return;
    try {
      await api.leaveTeam(id, me.id);
      navigate('/teams');
    } catch {
      setError('Не удалось покинуть команду — возможно, вы всё ещё владелец (сначала передайте владение).');
    }
  }

  if (!team || !me) return <p style={{ padding: 24 }}>Загрузка…</p>;

  const myMembership = team.members.find((m) => m.userId === me.id);
  const isOwner = myMembership?.role === 'OWNER';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <Link to="/teams" className="button-ghost" style={{ textDecoration: 'none' }}>← Команды</Link>

      <p style={{ fontSize: 17, fontWeight: 500, margin: '16px 0 20px' }}>
        {team.name} {team.tag && <span style={{ color: 'var(--text-secondary)' }}>[{team.tag}]</span>}
      </p>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Состав</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        {team.members.map((m) => (
          <div key={m.userId} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={m.user.avatarFull} alt="" width={28} height={28} style={{ borderRadius: 6 }} />
              <span style={{ fontSize: 13 }}>{m.user.personaName}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {m.position && <span className="pill" style={{ border: '0.5px solid var(--border)' }}>{m.position}</span>}
              <span className="pill" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{m.role}</span>
              {isOwner && m.userId !== me.id && (
                <button className="button-ghost" style={{ fontSize: 10 }} onClick={() => transferTo(m.userId, m.user.personaName)}>
                  Передать владение
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {myMembership && (
        <div style={{ marginBottom: 24 }}>
          {isOwner ? (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              Как владелец вы не можете просто выйти — сначала передайте владение кому-то из состава (кнопка справа от игрока выше).
            </p>
          ) : (
            <button className="button-ghost" style={{ color: 'var(--danger)' }} onClick={leaveTeam}>
              Покинуть команду
            </button>
          )}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Пригласить игрока</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input
          placeholder="Dota account_id"
          value={inviteId}
          onChange={(e) => setInviteId(e.target.value)}
          style={{ flex: 1, background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)' }}
        />
        <button className="button-primary" onClick={invite}>Пригласить</button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
        Работает только если этот игрок уже хотя бы раз заходил в Areon — поиска игроков ещё нет.
      </p>
      {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
    </div>
  );
}
