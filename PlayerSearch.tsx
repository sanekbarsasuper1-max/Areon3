import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, FoundPlayer, Hero, Team } from '../api';

const RANK_MEDALS = [
  { label: 'Любой ранг', min: undefined, max: undefined },
  { label: 'Herald', min: 10, max: 19 },
  { label: 'Guardian', min: 20, max: 29 },
  { label: 'Crusader', min: 30, max: 39 },
  { label: 'Archon', min: 40, max: 49 },
  { label: 'Legend', min: 50, max: 59 },
  { label: 'Ancient', min: 60, max: 69 },
  { label: 'Divine', min: 70, max: 79 },
  { label: 'Immortal', min: 80, max: 89 },
];

const LANE_ROLES = [
  { label: 'Любая линия', value: undefined },
  { label: 'Safe (керри-лайн)', value: 1 },
  { label: 'Mid', value: 2 },
  { label: 'Off', value: 3 },
  { label: 'Jungle', value: 4 },
];

function rankLabel(rankTier: number | null): string {
  if (rankTier == null) return 'Ранг неизвестен';
  const medal = Math.floor(rankTier / 10);
  const star = rankTier % 10;
  const names = ['', 'Herald', 'Guardian', 'Crusader', 'Archon', 'Legend', 'Ancient', 'Divine', 'Immortal'];
  const name = names[medal] ?? '?';
  return medal === 8 ? name : `${name} ${star}`;
}

export function PlayerSearch() {
  const [results, setResults] = useState<FoundPlayer[]>([]);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [q, setQ] = useState('');
  const [rankIndex, setRankIndex] = useState(0);
  const [laneRole, setLaneRole] = useState<number | undefined>(undefined);
  const [heroId, setHeroId] = useState<number | undefined>(undefined);
  const [minMatches, setMinMatches] = useState('');
  const [invitingTeamFor, setInvitingTeamFor] = useState<string | null>(null);
  const [reportingFor, setReportingFor] = useState<string | null>(null);
  const [reportCategory, setReportCategory] = useState('Suspicious');
  const [reportText, setReportText] = useState('');
  const [reportSent, setReportSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.heroes().then(setHeroes);
    api.myTeams().then(setMyTeams);
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search() {
    setLoading(true);
    try {
      const medal = RANK_MEDALS[rankIndex];
      const data = await api.searchPlayers({
        q: q || undefined,
        minRank: medal.min,
        maxRank: medal.max,
        laneRole,
        heroId,
        minMatches: minMatches ? Number(minMatches) : undefined,
      });
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  async function inviteToDraft(userId: string) {
    const session = await api.inviteFriend(userId);
    navigate(`/draft-trainer/${session.id}`);
  }

  async function inviteToTeam(teamId: string, accountId32: number) {
    await api.inviteToTeam(teamId, accountId32);
    setInvitingTeamFor(null);
    alert('Приглашение в команду отправлено');
  }

  async function submitReport(reportedId: string) {
    if (!reportText.trim()) return;
    await api.reportPlayer(reportedId, reportCategory, reportText.trim());
    setReportingFor(null);
    setReportText('');
    setReportSent(reportedId);
    setTimeout(() => setReportSent(null), 4000);
  }

  const selectStyle = {
    background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6,
    padding: '8px 10px', fontSize: 12, color: 'var(--text)',
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 4px' }}>Поиск игроков</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 18px' }}>
        Ищет только среди тех, кто хотя бы раз заходил в Areon — это не поиск по всей Dota 2.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <input
          placeholder="Ник"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...selectStyle, flex: 1, minWidth: 140 }}
        />
        <select value={rankIndex} onChange={(e) => setRankIndex(Number(e.target.value))} style={selectStyle}>
          {RANK_MEDALS.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <select value={laneRole ?? ''} onChange={(e) => setLaneRole(e.target.value ? Number(e.target.value) : undefined)} style={selectStyle}>
          {LANE_ROLES.map((r) => <option key={r.label} value={r.value ?? ''}>{r.label}</option>)}
        </select>
        <select value={heroId ?? ''} onChange={(e) => setHeroId(e.target.value ? Number(e.target.value) : undefined)} style={selectStyle}>
          <option value="">Любой герой</option>
          {heroes.map((h) => <option key={h.id} value={h.id}>{h.localizedName}</option>)}
        </select>
        <input
          type="number"
          placeholder="Мин. матчей"
          value={minMatches}
          onChange={(e) => setMinMatches(e.target.value)}
          style={{ ...selectStyle, width: 100 }}
        />
        <button className="button-primary" onClick={search} disabled={loading}>
          {loading ? 'Ищем…' : 'Искать'}
        </button>
      </div>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 20px' }}>
        Линия (Safe/Mid/Off/Jungle) — это не то же самое, что позиция 1-5 (керри/мид/оффлейн/саппорт/хард).
        Safe и Off линии делят и кор-герой, и саппорт — отличить их друг от друга по этим данным нельзя.
        Регион и язык не фильтруются — Areon их не собирает.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {results.length === 0 && !loading && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Никого не найдено под эти фильтры.</p>
        )}
        {results.map((p) => (
          <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={p.avatarFull} alt="" width={32} height={32} style={{ borderRadius: 6 }} />
                <div>
                  <p style={{ fontSize: 13, margin: '0 0 2px' }}>{p.personaName}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                    {rankLabel(p.rankTier)} · {p.matchCount} матчей в Areon
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="button-ghost" onClick={() => inviteToDraft(p.id)}>В драфт</button>
                <button className="button-ghost" onClick={() => setInvitingTeamFor(invitingTeamFor === p.id ? null : p.id)}>
                  В команду
                </button>
                <button className="button-ghost" style={{ color: 'var(--danger)' }} onClick={() => setReportingFor(reportingFor === p.id ? null : p.id)}>
                  Пожаловаться
                </button>
              </div>
            </div>
            {reportSent === p.id && <p style={{ fontSize: 11, color: 'var(--accent)', margin: 0 }}>Жалоба отправлена — спасибо, модераторы её рассмотрят.</p>}
            {reportingFor === p.id && (
              <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {[
                    { key: 'Scam', label: 'Мошенничество' },
                    { key: 'Phishing', label: 'Фишинг' },
                    { key: 'Harassment', label: 'Оскорбления' },
                    { key: 'Spam', label: 'Спам' },
                    { key: 'FakeAccount', label: 'Фейковый аккаунт' },
                    { key: 'TournamentAbuse', label: 'Нарушение в турнире' },
                    { key: 'Cheating', label: 'Читерство' },
                    { key: 'Suspicious', label: 'Подозрительное поведение' },
                    { key: 'Other', label: 'Другое' },
                  ].map((c) => (
                    <button
                      key={c.key}
                      className="button-ghost"
                      style={{ fontSize: 10, background: reportCategory === c.key ? 'var(--accent-bg)' : undefined, color: reportCategory === c.key ? 'var(--accent)' : undefined }}
                      onClick={() => setReportCategory(c.key)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Опишите, что произошло…"
                  rows={2}
                  style={{ width: '100%', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 6, padding: 8, fontSize: 12, color: 'var(--text)', resize: 'vertical', marginBottom: 6, boxSizing: 'border-box' }}
                />
                <button className="button-primary" style={{ fontSize: 11 }} onClick={() => submitReport(p.id)} disabled={!reportText.trim()}>
                  Отправить жалобу
                </button>
              </div>
            )}
            {invitingTeamFor === p.id && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {myTeams.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>У вас пока нет команд.</span>}
                {myTeams.map((t) => (
                  <button key={t.id} className="button-ghost" onClick={() => inviteToTeam(t.id, p.accountId32)}>
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
