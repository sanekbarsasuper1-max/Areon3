import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Tournament, Team, Me } from '../api';

export function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const [t, m, teams] = await Promise.all([api.tournament(id), api.me(), api.myTeams()]);
    setTournament(t);
    setMe(m);
    setMyTeams(teams);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function register() {
    if (!id || !selectedTeam) return;
    setError(null);
    try {
      await api.registerTeam(id, selectedTeam);
      load();
    } catch {
      setError('Не удалось зарегистрировать команду — проверьте, что вы владелец или капитан.');
    }
  }

  async function generate() {
    if (!id) return;
    setError(null);
    try {
      await api.generateBracket(id);
      load();
    } catch {
      setError('Не удалось построить сетку — нужно минимум 2 команды и права организатора.');
    }
  }

  async function report(matchId: string, winnerTeamId: string) {
    if (!id) return;
    try {
      await api.reportResult(id, matchId, winnerTeamId, 1, 0);
      load();
    } catch {
      setError('Не удалось сохранить результат.');
    }
  }

  if (!tournament || !me) return <p style={{ padding: 24 }}>Загрузка…</p>;

  const isOrganizer = tournament.createdByUserId === me.id;
  const teamName = (teamId: string | null) =>
    teamId ? tournament.registrations.find((r) => r.teamId === teamId)?.team.name ?? '?' : 'TBD';

  const BRACKET_ORDER: Tournament['matches'][number]['bracket'][] = ['winners', 'losers', 'grand_final', 'bracket_reset'];
  const BRACKET_LABEL: Record<string, string> = {
    winners: 'Верхняя сетка',
    losers: 'Нижняя сетка',
    grand_final: 'Гранд-финал',
    bracket_reset: 'Решающий матч (bracket reset)',
  };
  const presentBrackets = BRACKET_ORDER.filter((b) => tournament.matches.some((m) => m.bracket === b));
  const isDoubleElim = tournament.bracketFormat === 'double_elimination';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <Link to="/tournaments" className="button-ghost" style={{ textDecoration: 'none' }}>← Турниры</Link>

      <p style={{ fontSize: 17, fontWeight: 500, margin: '16px 0 4px' }}>{tournament.name}</p>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        {tournament.matchFormat} · {isDoubleElim ? 'Double elimination' : 'Single elimination'} ·{' '}
        {tournament.registrations.length}/{tournament.maxTeams} команд · {tournament.status}
      </p>

      {tournament.status === 'REGISTRATION_OPEN' && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Зарегистрировать команду</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              style={{ flex: 1, background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)' }}
            >
              <option value="">Выберите команду</option>
              {myTeams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button className="button-primary" onClick={register}>Зарегистрировать</button>
          </div>

          {isOrganizer && (
            <button className="button-ghost" style={{ marginTop: 10 }} onClick={generate}>
              Построить сетку
            </button>
          )}
          {isDoubleElim && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '6px 0 0' }}>
              Double elimination требует ровно {tournament.maxTeams} команд (степень двойки) на момент построения сетки.
            </p>
          )}
        </div>
      )}

      {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 16 }}>{error}</p>}

      {presentBrackets.map((bracket) => {
        const bracketMatches = tournament.matches.filter((m) => m.bracket === bracket);
        const rounds = Array.from(new Set(bracketMatches.map((m) => m.round))).sort((a, b) => a - b);
        return (
          <div key={bracket} style={{ marginBottom: 24 }}>
            {isDoubleElim && (
              <p style={{ fontSize: 12, color: 'var(--accent)', margin: '0 0 10px', fontWeight: 500 }}>
                {BRACKET_LABEL[bracket] ?? bracket}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {rounds.map((round) => (
                <div key={round}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 6px' }}>Раунд {round}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {bracketMatches.filter((m) => m.round === round).map((m) => (
                      <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: m.winnerTeamId === m.teamAId ? 'var(--accent)' : undefined }}>
                          {teamName(m.teamAId)}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs</span>
                        <span style={{ fontSize: 13, color: m.winnerTeamId === m.teamBId ? 'var(--accent)' : undefined }}>
                          {teamName(m.teamBId)}
                        </span>
                        {isOrganizer && m.status === 'PENDING' && m.teamAId && m.teamBId && (
                          <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
                            <button className="button-ghost" onClick={() => report(m.id, m.teamAId!)}>А победил</button>
                            <button className="button-ghost" onClick={() => report(m.id, m.teamBId!)}>Б победил</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
