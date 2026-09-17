import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, Tournament } from '../api';
import { useAudio } from '../audio/AudioContext';

const statusLabel: Record<Tournament['status'], string> = {
  DRAFT: 'Черновик',
  REGISTRATION_OPEN: 'Регистрация открыта',
  IN_PROGRESS: 'Идёт',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён администратором',
};

export function Tournaments() {
  const [list, setList] = useState<Tournament[]>([]);
  const [name, setName] = useState('');
  const { playSFX } = useAudio();

  useEffect(() => {
    playSFX('nav_tournament_open');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [maxTeams, setMaxTeams] = useState(8);
  const [bracketFormat, setBracketFormat] = useState<'single_elimination' | 'double_elimination'>('single_elimination');
  const navigate = useNavigate();

  async function load() {
    setList(await api.tournaments());
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    const t = await api.createTournament({ name: name.trim(), maxTeams, bracketFormat });
    navigate(`/tournaments/${t.id}`);
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 18px' }}>Турниры</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        {list.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Турниров пока нет.</p>}
        {list.map((t) => (
          <Link
            key={t.id}
            to={`/tournaments/${t.id}`}
            className="card"
            style={{ display: 'flex', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}
          >
            <span style={{ fontSize: 13 }}>{t.name}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {t.registrations.length}/{t.maxTeams} команд · {statusLabel[t.status]}
            </span>
          </Link>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Создать турнир</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: 1, minWidth: 140, background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)' }}
        />
        <input
          type="number"
          min={2}
          value={maxTeams}
          onChange={(e) => setMaxTeams(Number(e.target.value))}
          style={{ width: 70, background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)' }}
        />
        <select
          value={bracketFormat}
          onChange={(e) => setBracketFormat(e.target.value as any)}
          style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)' }}
        >
          <option value="single_elimination">Single elimination</option>
          <option value="double_elimination">Double elimination</option>
        </select>
        <button className="button-primary" onClick={create}>Создать</button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
        Double elimination требует ровно 4/8/16/32 зарегистрированных команд — без байесов для этого формата.
        Оба формата — только командные турниры, без группового этапа.
      </p>
    </div>
  );
}
