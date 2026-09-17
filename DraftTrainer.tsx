import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, DraftSession, ProMatch, DraftSide, OnlinePlayer } from '../api';

const statusLabel = (s: DraftSession) =>
  s.status === 'completed'
    ? 'Завершён'
    : s.status === 'waiting_for_opponent'
    ? (s.opponentType === 'matchmaking' ? 'Ищем соперника' : 'Ждём соперника')
    : s.status === 'cancelled'
    ? 'Отменён'
    : `Шаг ${s.actions.length}/${s.sequence.length}`;

export function DraftTrainer() {
  const [sessions, setSessions] = useState<DraftSession[]>([]);
  const [proMatches, setProMatches] = useState<ProMatch[]>([]);
  const [online, setOnline] = useState<OnlinePlayer[]>([]);
  const [invites, setInvites] = useState<DraftSession[]>([]);
  const [radiantSide, setRadiantSide] = useState<DraftSide | 'random'>('random');
  const [searching, setSearching] = useState(false);
  const [humanSide, setHumanSide] = useState<DraftSide | 'random'>('random');
  const navigate = useNavigate();

  async function load() {
    const [s, m, o, inv] = await Promise.all([
      api.draftSessions(),
      api.proMatches(),
      api.online(),
      api.pendingInvites(),
    ]);
    setSessions(s);
    setProMatches(m.slice(0, 10));
    setOnline(o);
    setInvites(inv);
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      api.pendingInvites().then(setInvites);
      api.online().then(setOnline);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function startFree() {
    const session = await api.createFreeDraft({
      radiantSide: radiantSide === 'random' ? undefined : radiantSide,
    });
    navigate(`/draft-trainer/${session.id}`);
  }

  async function startMatchmaking() {
    setSearching(true);
    try {
      const session = await api.searchMatch();
      navigate(`/draft-trainer/${session.id}`);
    } finally {
      setSearching(false);
    }
  }

  async function startAiDraft() {
    const humanPick = humanSide === 'random' ? undefined : humanSide;
    const botSide = humanPick === 'FIRST_PICK' ? 'SECOND_PICK' : humanPick === 'SECOND_PICK' ? 'FIRST_PICK' : undefined;
    const session = await api.createAiDraft({
      radiantSide: radiantSide === 'random' ? undefined : radiantSide,
      botSide,
    });
    navigate(`/draft-trainer/${session.id}`);
  }

  async function invitePlayer(userId: string) {
    const session = await api.inviteFriend(
      userId,
      radiantSide === 'random' ? undefined : radiantSide,
    );
    navigate(`/draft-trainer/${session.id}`);
  }

  async function acceptInvite(sessionId: string) {
    const session = await api.joinDraft(sessionId);
    navigate(`/draft-trainer/${session.id}`);
  }

  async function replay(matchId: number) {
    try {
      const session = await api.startProReplay(matchId);
      navigate(`/draft-trainer/${session.id}`);
    } catch {
      alert("У этого матча нет данных драфта (не Captain's Mode)");
    }
  }

  const selectStyle = {
    background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6,
    padding: '8px 10px', fontSize: 12, color: 'var(--text)',
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 18px' }}>Draft Trainer</p>

      {invites.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Приглашения</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {invites.map((inv) => (
              <div key={inv.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>Драфт-приглашение</span>
                <button className="button-primary" onClick={() => acceptInvite(inv.id)}>Принять</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Сторона Radiant</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <select value={radiantSide} onChange={(e) => setRadiantSide(e.target.value as any)} style={selectStyle}>
          <option value="random">Случайно</option>
          <option value="FIRST_PICK">Radiant — First Pick</option>
          <option value="SECOND_PICK">Radiant — Second Pick</option>
        </select>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 16px' }}>
        First Pick всегда ходит первым, но не обязательно является Radiant — задаётся отдельно.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <button className="button-primary" onClick={startFree}>Свободный драфт (соло)</button>
        <button className="button-ghost" onClick={startMatchmaking} disabled={searching}>
          {searching ? 'Ищем…' : 'Найти соперника'}
        </button>
        <button className="button-ghost" onClick={startAiDraft}>Играть против AI-бота</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ваша сторона против бота:</span>
        <select value={humanSide} onChange={(e) => setHumanSide(e.target.value as any)} style={selectStyle}>
          <option value="random">Случайно</option>
          <option value="FIRST_PICK">First Pick</option>
          <option value="SECOND_PICK">Second Pick</option>
        </select>
      </div>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '-16px 0 24px' }}>
        Бот — фиксированная эвристика (случайные баны, пики по контрпикам из реальных данных OpenDota), не обученная модель.
      </p>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
        Онлайн сейчас {online.length > 0 ? `(${online.length})` : ''}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        {online.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Сейчас никого нет в сети.</p>
        )}
        {online.map((p) => (
          <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={p.avatarFull} alt="" width={24} height={24} style={{ borderRadius: 5 }} />
              <span style={{ fontSize: 13 }}>{p.personaName}</span>
            </div>
            <button className="button-ghost" onClick={() => invitePlayer(p.id)}>Пригласить в драфт</button>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 24px' }}>
        Список показывает всех, кто сейчас активен на сайте — не список друзей, полноценного поиска игроков пока нет.
      </p>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Мои сессии</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        {sessions.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Пока пусто.</p>}
        {sessions.map((s) => (
          <Link
            key={s.id}
            to={`/draft-trainer/${s.id}`}
            className="card"
            style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}
          >
            <span style={{ fontSize: 13 }}>
              {s.mode === 'free'
                ? s.opponentType === 'matchmaking'
                  ? 'Матч (поиск)'
                  : s.opponentType === 'friend'
                  ? 'С другом'
                  : s.opponentType === 'ai'
                  ? 'Против бота'
                  : 'Соло'
                : 'Про-драфт'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{statusLabel(s)}</span>
          </Link>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Про-матчи для разбора</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {proMatches.map((m) => (
          <div
            key={m.match_id}
            className="card"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => replay(m.match_id)}
          >
            <span style={{ fontSize: 13 }}>{m.radiant_name ?? 'Radiant'} vs {m.dire_name ?? 'Dire'}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>смотреть драфт</span>
          </div>
        ))}
      </div>
    </div>
  );
}
