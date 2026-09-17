import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { api, DraftSession, Hero, DraftEvent, DraftRating, CompositionScore } from '../api';
import { useAudio } from '../audio/AudioContext';

const ACTION_LABEL: Record<'ban' | 'pick', string> = { ban: 'BAN', pick: 'PICK' };
const SIDE_LABEL: Record<'FIRST_PICK' | 'SECOND_PICK', string> = {
  FIRST_PICK: 'FIRST PICK',
  SECOND_PICK: 'SECOND PICK',
};

export function DraftSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<DraftSession | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [previewHeroId, setPreviewHeroId] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [rating, setRating] = useState<DraftRating | null>(null);
  const timeoutInFlight = useRef(false);
  const { playSFX } = useAudio();
  const openedSfxPlayed = useRef(false);
  const prevActionsLength = useRef<number | null>(null);
  const prevPhaseAction = useRef<'ban' | 'pick' | null>(null);
  const prevStatus = useRef<string | null>(null);
  const timerTensionPlayed = useRef(false);
  const lastCriticalSecond = useRef<number | null>(null);

  async function load() {
    if (!id) return;
    const [s, h, me] = await Promise.all([api.draftSession(id), api.heroes(), api.me()]);
    setSession(s);
    setHeroes(h);
    setMeId(me.id);
    setIsAdmin(me.isAdmin);
    timeoutInFlight.current = false;
    if (!openedSfxPlayed.current) {
      openedSfxPlayed.current = true;
      playSFX('nav_draft_open');
    }
    if (s.status === 'completed') {
      api.draftRating(id).then(setRating).catch(() => {});
    }
  }

  // Admin-only: there is no player-facing undo, per the product
  // decision — this exists so an admin watching a game live can correct
  // it, not for players to take back their own picks/bans.
  async function adminUndo() {
    if (!id) return;
    if (!confirm('Отменить последнее действие в этом драфте?')) return;
    await api.adminUndoDraft(id);
    playSFX('ui_confirm');
    load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Friend/matchmaking sessions have two independent browsers acting on
  // the same session — this used to be a 2s poll; now it's a real
  // WebSocket subscription, one room per session, joined only after the
  // server verifies (via the same areon_token cookie the REST API
  // trusts) that this user is actually one of the two participants.
  // Not needed for solo ('self') play, where the only actor is the
  // person already looking at the screen.
  useEffect(() => {
    if (!id || !session || session.mode !== 'free' || session.opponentType === 'self') return;
    if (session.status === 'completed' || session.status === 'cancelled') return;

    const socket: Socket = io(import.meta.env.VITE_API_URL ?? 'http://localhost:3000', {
      withCredentials: true,
    });
    socket.emit('join', id);
    socket.on('draft:update', (updated: DraftSession) => {
      setSession(updated);
      if (updated.status === 'completed' && id) {
        api.draftRating(id).then(setRating).catch(() => {});
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id, session?.mode, session?.opponentType, session?.status]);

  // --- Timer: ticks locally, but the actual timeout is only ever
  // applied by the backend re-checking elapsed time (main + reserve)
  // against currentStepStartedAt — this loop just decides when to ask
  // it to. Once the main per-action allowance is spent, the countdown
  // falls through into that side's reserve pool instead of stopping —
  // that's the confirmed mechanic, not just a cosmetic detail.
  const [reserveInfo, setReserveInfo] = useState<{ inReserve: boolean; remaining: number } | null>(null);
  useEffect(() => {
    if (!session || session.status !== 'in_progress' || session.mode !== 'free') {
      setRemainingSec(null);
      setReserveInfo(null);
      return;
    }
    const nextStep = session.sequence[session.actions.length];
    if (!nextStep) return;

    const startedAt = new Date(session.currentStepStartedAt).getTime();
    const sideReserve = nextStep.side === 'FIRST_PICK' ? session.reserveFirstSec : session.reserveSecondSec;

    const checkTimerSfx = (activeRemaining: number) => {
      // Fires once when crossing under 10s (per-step, not per-tick —
      // timerTensionPlayed resets whenever the step itself changes,
      // below). Under 5s, fires once per whole second as it counts
      // down (1 beep per second, not a continuous alarm).
      if (activeRemaining <= 10 && !timerTensionPlayed.current) {
        timerTensionPlayed.current = true;
        playSFX('timer_tension');
      }
      const wholeSecond = Math.ceil(activeRemaining);
      if (activeRemaining <= 5 && activeRemaining > 0 && lastCriticalSecond.current !== wholeSecond) {
        lastCriticalSecond.current = wholeSecond;
        playSFX('timer_critical');
      }
    };

    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const mainRemaining = Math.max(0, nextStep.timeLimitSec - elapsed);
      setRemainingSec(mainRemaining);

      if (elapsed <= nextStep.timeLimitSec) {
        setReserveInfo(null);
        checkTimerSfx(mainRemaining);
        return;
      }

      const overflow = elapsed - nextStep.timeLimitSec;
      const reserveRemaining = Math.max(0, sideReserve - overflow);
      setReserveInfo({ inReserve: true, remaining: reserveRemaining });
      checkTimerSfx(reserveRemaining);

      if (reserveRemaining <= 0 && !timeoutInFlight.current && id) {
        timeoutInFlight.current = true;
        timerTensionPlayed.current = false;
        lastCriticalSecond.current = null;
        playSFX('timer_expired');
        api.draftTimeout(id).then(load).catch(() => { timeoutInFlight.current = false; });
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [session, id]);

  // Reset the per-step tension/critical trackers whenever the step
  // itself changes (new action recorded) — otherwise timerTensionPlayed
  // would stay "already played" forever after the very first step.
  useEffect(() => {
    timerTensionPlayed.current = false;
    lastCriticalSecond.current = null;
  }, [session?.actions.length]);

  // One effect, watching session.actions, covers BOTH this user's own
  // moves (act()) and moves that arrive via the WebSocket (opponent or
  // bot) — a single source of truth for "a new action just happened",
  // rather than duplicating SFX-triggering logic in three call sites.
  useEffect(() => {
    if (!session) return;
    const newLength = session.actions.length;
    if (prevActionsLength.current === null) {
      // First load of this session — don't replay sounds for history
      // that already happened before this page was opened.
      prevActionsLength.current = newLength;
      prevPhaseAction.current = session.sequence[newLength]?.action ?? null;
      return;
    }
    if (newLength === prevActionsLength.current) return;

    for (let i = prevActionsLength.current; i < newLength; i++) {
      const action = session.actions[i];
      const actingUserId =
        action.side === 'FIRST_PICK'
          ? session.createdByUserId
          : session.opponentType === 'friend' || session.opponentType === 'matchmaking'
          ? session.participantSecondUserId
          : session.opponentType === 'ai'
          ? null // the bot — never "me"
          : session.createdByUserId; // 'self' mode: the one person

      if (action.action === 'ban') {
        playSFX('draft_ban');
      } else if (actingUserId === meId) {
        playSFX('draft_pick_self');
      } else {
        playSFX('draft_pick_enemy');
      }
      playSFX('draft_step_transition');
    }

    const nextAction = session.sequence[newLength]?.action ?? null;
    if (nextAction && nextAction !== prevPhaseAction.current) {
      playSFX(nextAction === 'ban' ? 'draft_phase_ban_start' : 'draft_phase_pick_start');
    }
    prevPhaseAction.current = nextAction;
    prevActionsLength.current = newLength;
  }, [session, meId, playSFX]);

  useEffect(() => {
    if (!session) return;
    if (prevStatus.current === null) {
      prevStatus.current = session.status;
      return;
    }
    if (session.status === 'completed' && prevStatus.current !== 'completed') {
      playSFX('draft_complete');
    }
    prevStatus.current = session.status;
  }, [session?.status, playSFX]);

  const heroesById = useMemo(() => Object.fromEntries(heroes.map((h) => [h.id, h])), [heroes]);

  const availableRoles = useMemo(() => {
    const set = new Set<string>();
    heroes.forEach((h) => (h.roles ?? []).forEach((r) => set.add(r)));
    return Array.from(set).sort();
  }, [heroes]);

  async function act(heroId: number) {
    if (!id) return;
    setError(null);
    try {
      const updated = await api.draftAction(id, heroId);
      setSession(updated);
    } catch {
      setError('Не удалось выполнить действие — герой уже занят, недоступен в CM, или сейчас не ваш ход.');
      playSFX('ui_error');
    }
  }

  async function restart() {
    const fresh = await api.createFreeDraft();
    navigate(`/draft-trainer/${fresh.id}`);
  }

  async function rematch() {
    if (!session) return;
    // Same Radiant/Dire assignment as the draft just finished — a true
    // "play it again" rather than a fresh random coin flip.
    const fresh = await api.createFreeDraft({ radiantSide: session.radiantSide });
    navigate(`/draft-trainer/${fresh.id}`);
  }

  async function joinLobby() {
    if (!id) return;
    setJoining(true);
    try {
      const updated = await api.joinDraft(id);
      setSession(updated);
    } catch {
      setError('Не удалось присоединиться — возможно, место уже занято.');
    } finally {
      setJoining(false);
    }
  }

  async function cancelWaiting() {
    if (!id) return;
    await api.cancelWaiting(id);
    navigate('/draft-trainer');
  }

  if (!session) return <p style={{ padding: 24 }}>Загрузка…</p>;

  const isFree = session.mode === 'free';
  const isDone = session.status === 'completed';
  const isWaiting = session.status === 'waiting_for_opponent';
  const isCancelled = session.status === 'cancelled';
  const isTwoPlayerMode = session.opponentType === 'friend' || session.opponentType === 'matchmaking';
  const usedHeroIds = new Set(session.actions.filter((a) => a.heroId != null).map((a) => a.heroId));
  const currentStepIndex = session.actions.length; // 0-indexed position of the upcoming step
  const nextStep = session.sequence[currentStepIndex];

  // Mirrors the backend's participantForSide: who (if any real human)
  // owns the acting side right now.
  const turnUserId =
    session.opponentType === 'ai'
      ? nextStep?.side === session.aiSide
        ? null
        : session.createdByUserId
      : isTwoPlayerMode
      ? nextStep?.side === 'FIRST_PICK'
        ? session.createdByUserId
        : session.participantSecondUserId
      : session.createdByUserId;
  const isMyTurn = meId != null && turnUserId === meId;
  const iAmParticipant = meId === session.createdByUserId || meId === session.participantSecondUserId;
  const isVsBot = session.opponentType === 'ai';

  const direSide = session.radiantSide === 'FIRST_PICK' ? 'SECOND_PICK' : 'FIRST_PICK';
  const teamLabel = (side: 'FIRST_PICK' | 'SECOND_PICK') => (side === session.radiantSide ? 'RADIANT' : 'DIRE');
  const teamColor = (side: 'FIRST_PICK' | 'SECOND_PICK') =>
    side === session.radiantSide ? 'var(--accent)' : 'var(--danger)';

  const radiantPicks = session.actions.filter((a) => a.action === 'pick' && a.side === session.radiantSide);
  const direPicks = session.actions.filter((a) => a.action === 'pick' && a.side === direSide);
  const allBans = session.actions.filter((a) => a.action === 'ban');

  const filteredHeroes = heroes.filter((h) => {
    if (search && !h.localizedName.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && !(h.roles ?? []).includes(roleFilter)) return false;
    return true;
  });

  // OpenDota's primary_attr values: 'str' | 'agi' | 'int' | 'all'
  // ('all' = Universal, not "no filter" — a real attribute value, not
  // a sentinel). Grouped into columns the same way the actual Dota 2
  // hero grid separates them.
  const ATTR_GROUPS: { key: string; label: string; color: string }[] = [
    { key: 'str', label: 'СИЛА', color: '#c0524f' },
    { key: 'agi', label: 'ЛОВКОСТЬ', color: '#4e9c5e' },
    { key: 'int', label: 'ИНТЕЛЛЕКТ', color: '#4a7fc4' },
    { key: 'all', label: 'УНИВЕРСАЛЬНЫЕ', color: '#b98fd1' },
  ];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 40px' }}>
      <Link to="/draft-trainer" className="button-ghost" style={{ textDecoration: 'none' }}>← Draft Trainer</Link>

      <p style={{ fontSize: 17, fontWeight: 500, margin: '16px 0 4px' }}>
        {isFree ? "Свободный драфт · Captain's Mode" : 'Просмотр про-драфта'}
      </p>
      {isWaiting && (
        <div className="card" style={{ marginBottom: 16 }}>
          {meId === session.createdByUserId ? (
            <>
              <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 6px' }}>
                {session.opponentType === 'matchmaking' ? 'Ищем соперника…' : 'Ждём, пока соперник примет приглашение'}
              </p>
              <button className="button-ghost" onClick={cancelWaiting}>Отменить</button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 6px' }}>Вас пригласили в драфт</p>
              <button className="button-primary" onClick={joinLobby} disabled={joining}>
                {joining ? 'Присоединяемся…' : 'Присоединиться'}
              </button>
            </>
          )}
        </div>
      )}

      {isCancelled && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Этот драфт был отменён.</p>
        </div>
      )}

      {isFree && !isWaiting && (
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Правила: {session.rulesVersion} — фазы банов/пиков подтверждены, точный порядок ходов внутри фазы — реконструкция
        </p>
      )}

      {/* CURRENT TURN banner — the user should never have to guess whose turn it is */}
      {isFree && !isDone && !isWaiting && nextStep && (
        <div
          className="card"
          style={{
            marginBottom: 16, borderLeft: `3px solid ${teamColor(nextStep.side)}`,
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}
        >
          <div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 4px', letterSpacing: 1 }}>CURRENT TURN</p>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: teamColor(nextStep.side) }}>
              {teamLabel(nextStep.side)} · {SIDE_LABEL[nextStep.side]} · {ACTION_LABEL[nextStep.action]}
              {isTwoPlayerMode && (isMyTurn ? ' · ВАШ ХОД' : ' · ХОД СОПЕРНИКА')}
              {isVsBot && (isMyTurn ? ' · ВАШ ХОД' : ' · ХОД БОТА')}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              STEP {nextStep.step} / {session.sequence.length}
            </p>
          </div>
          {remainingSec != null && (
            <div style={{ textAlign: 'center', minWidth: 84 }}>
              <div
                style={{
                  fontSize: 30, fontWeight: 600, lineHeight: 1,
                  color: reserveInfo ? 'var(--danger)' : (remainingSec <= 5 ? 'var(--danger)' : 'var(--text)'),
                }}
              >
                {reserveInfo ? Math.ceil(reserveInfo.remaining) : Math.ceil(remainingSec)}
              </div>
              <div style={{ fontSize: 9, color: reserveInfo ? 'var(--danger)' : 'var(--text-muted)', letterSpacing: 0.5, marginTop: 2 }}>
                {reserveInfo ? 'RESERVE' : 'SECONDS'}
              </div>
            </div>
          )}
        </div>
      )}
      {isDone && (
        <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--accent)', margin: 0, letterSpacing: 1 }}>DRAFT COMPLETE</p>
        </div>
      )}

      {isDone && rating && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
            Оценка состава — эвристика по ролям/атрибутам/контрпикам, не прогноз победы
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <RatingCard label="RADIANT" color="var(--accent)" score={rating.radiant} heroesById={heroesById} />
            <RatingCard label="DIRE" color="var(--danger)" score={rating.dire} heroesById={heroesById} />
          </div>

          {rating.counterPairs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 6px' }}>Кто кого контрит в этом составе</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {rating.counterPairs.map((p, i) => (
                  <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
                    <span style={{ fontSize: 12, color: p.favors === 'radiant' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {heroesById[p.radiantHeroId]?.localizedName ?? `#${p.radiantHeroId}`}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {p.favors === 'radiant' ? '→ контрит →' : '← контрит ←'}
                    </span>
                    <span style={{ fontSize: 12, color: p.favors === 'dire' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {heroesById[p.direHeroId]?.localizedName ?? `#${p.direHeroId}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
            {!rating.notes.synergiesAvailable && 'Синергии союзников не показаны — у OpenDota нет данных по совместному винрейту героев. '}
            {!rating.notes.itemRecommendationsAvailable && 'Рекомендации по предметам пока не реализованы — нужен отдельный фоновый сбор данных по сборкам.'}
          </p>
        </div>
      )}

      {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}

      {/* Team composition */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <TeamColumn
          label="RADIANT"
          color="var(--accent)"
          picks={radiantPicks}
          heroesById={heroesById}
          reserveSec={isFree ? (session.radiantSide === 'FIRST_PICK' ? session.reserveFirstSec : session.reserveSecondSec) : undefined}
        />
        <TeamColumn
          label="DIRE"
          color="var(--danger)"
          picks={direPicks}
          heroesById={heroesById}
          reserveSec={isFree ? (direSide === 'FIRST_PICK' ? session.reserveFirstSec : session.reserveSecondSec) : undefined}
        />
      </div>

      {allBans.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 6px' }}>Баны</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allBans.map((b, i) => {
              const hero = b.heroId != null ? heroesById[b.heroId] : null;
              return (
                <div
                  key={i}
                  style={{
                    position: 'relative', width: 68, aspectRatio: '16/9', borderRadius: 5, overflow: 'hidden',
                    background: 'var(--card)', filter: hero ? 'grayscale(1)' : 'none',
                  }}
                >
                  {hero ? (
                    <img src={hero.iconUrl} alt={hero.localizedName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--text-muted)' }}>
                      таймаут
                    </span>
                  )}
                  {hero && (
                    <svg style={{ position: 'absolute', inset: 0 }} viewBox="0 0 68 38" preserveAspectRatio="none">
                      <line x1="4" y1="4" x2="64" y2="34" stroke="#C97B63" strokeWidth="3" />
                      <line x1="64" y1="4" x2="4" y2="34" stroke="#C97B63" strokeWidth="3" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline: every one of the 24 steps, current one highlighted */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>Timeline</p>
        {isAdmin && session.actions.length > 0 && (
          <button className="button-ghost" style={{ color: 'var(--danger)', fontSize: 10 }} onClick={adminUndo}>
            Отменить ход (админ)
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 20, maxHeight: 220, overflowY: 'auto' }}>
        {session.sequence.map((step, i) => {
          const done = session.actions[i] as DraftEvent | undefined;
          const isCurrent = i === currentStepIndex && !isDone;
          return (
            <div
              key={step.step}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '4px 8px', borderRadius: 4,
                background: isCurrent ? 'rgba(47,169,143,0.14)' : 'transparent',
                color: done ? '#c7c3b6' : 'var(--text-muted)',
              }}
            >
              <span style={{ width: 20, color: 'var(--text-muted)' }}>{String(step.step).padStart(2, '0')}</span>
              <span style={{ width: 40, color: teamColor(step.side) }}>{ACTION_LABEL[step.action]}</span>
              <span style={{ width: 60 }}>{teamLabel(step.side)}</span>
              <span>
                {done
                  ? done.heroId != null
                    ? heroesById[done.heroId]?.localizedName ?? `#${done.heroId}`
                    : 'пропущено (таймаут)'
                  : isCurrent ? '…' : '—'}
              </span>
              {done?.timedOut && <span style={{ color: 'var(--text-muted)' }}>(таймаут)</span>}
            </div>
          );
        })}
      </div>

      {isDone && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <button className="button-primary" onClick={rematch}>Реванш (те же стороны)</button>
          <button className="button-ghost" onClick={restart}>Новый драфт (случайные стороны)</button>
          <button
            className="button-ghost"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Ссылка на этот драфт скопирована');
            }}
          >
            Поделиться
          </button>
          <Link to="/draft-trainer" className="button-ghost" style={{ textDecoration: 'none' }}>К списку сессий</Link>
        </div>
      )}
      {isDone && (
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 20px' }}>
          Ссылка открывает эту партию любому, у кого есть аккаунт Areon — платформа полностью закрыта,
          так что публичного просмотра без входа через Steam нет.
        </p>
      )}

      {isFree && !isDone && !isWaiting && !isTwoPlayerMode && (
        <div style={{ marginBottom: 16 }}>
          <button
            className="button-ghost"
            onClick={() => { if (confirm('Начать этот драфт заново? Текущий прогресс будет потерян.')) restart(); }}
          >
            Restart
          </button>
        </div>
      )}

      {isFree && !isDone && !isWaiting && iAmParticipant && (
        <>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
            {isTwoPlayerMode && !isMyTurn
              ? 'Ход соперника — дождитесь своей очереди'
              : isVsBot && !isMyTurn
              ? 'Ход бота…'
              : 'Выберите героя'}
          </p>

          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <input
              placeholder="Поиск героя"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 140, background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: 'var(--text)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setRoleFilter('all')}
              className="button-ghost"
              style={{ background: roleFilter === 'all' ? 'var(--accent-bg)' : undefined, color: roleFilter === 'all' ? 'var(--accent)' : undefined }}
            >
              ALL ROLES
            </button>
            {availableRoles.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className="button-ghost"
                style={{ background: roleFilter === r ? 'var(--accent-bg)' : undefined, color: roleFilter === r ? 'var(--accent)' : undefined }}
              >
                {r}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 10px' }}>
            Поиск ищет только по текущему отображаемому названию — алиасы/рус. названия пока не хранятся отдельно.
          </p>

          {previewHeroId != null && heroesById[previewHeroId] && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <img
                src={heroesById[previewHeroId].iconUrl}
                alt=""
                style={{ width: 64, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>{heroesById[previewHeroId].localizedName}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                  {heroesById[previewHeroId].primaryAttr}
                  {heroesById[previewHeroId].roles?.length
                    ? ` · ${heroesById[previewHeroId].roles!.join(', ')}`
                    : ''}
                </p>
              </div>
              <Link to={`/heroes/${previewHeroId}`} className="button-ghost" style={{ textDecoration: 'none', fontSize: 11 }}>
                Способности и контрпики
              </Link>
            </div>
          )}

          {ATTR_GROUPS.map((group) => {
            const groupHeroes = filteredHeroes.filter((h) => h.primaryAttr === group.key);
            if (groupHeroes.length === 0) return null;
            return (
              <div key={group.key} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: 1, color: group.color, margin: '0 0 6px' }}>
                  {group.label}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 5 }}>
                  {groupHeroes.map((h) => {
                    const used = usedHeroIds.has(h.id);
                    const disabledCm = h.captainsModeAvailable === false;
                    const disabled = used || disabledCm || !isMyTurn;
                    return (
                      <button
                        key={h.id}
                        disabled={disabled}
                        onClick={() => act(h.id)}
                        onMouseEnter={() => setPreviewHeroId(h.id)}
                        onFocus={() => setPreviewHeroId(h.id)}
                        title={disabledCm ? `${h.localizedName} — недоступен в CM` : h.localizedName}
                        style={{
                          position: 'relative', aspectRatio: '16/9', padding: 0, overflow: 'hidden',
                          background: '#000', border: `1px solid ${group.color}55`, borderRadius: 6,
                          opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
                          filter: used ? 'grayscale(1)' : 'none',
                        }}
                      >
                        <img src={h.iconUrl} alt={h.localizedName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <span
                          style={{
                            position: 'absolute', left: 0, right: 0, bottom: 0, padding: '2px 4px',
                            fontSize: 9, color: '#fff', background: 'linear-gradient(transparent, rgba(0,0,0,0.88))',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                        >
                          {h.localizedName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function RatingCard({ label, color, score, heroesById }: { label: string; color: string; score: CompositionScore; heroesById: Record<number, Hero> }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color, margin: 0, letterSpacing: 1 }}>{label}</p>
        <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{score.total}<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/100</span></p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Роли</span>
          <span>{score.roleCoverage}/40</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Атрибуты</span>
          <span>{score.attributeDiversity}/20</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Контрпики</span>
          <span>{score.counterAwareRatio == null ? 'н/д' : `${score.counterAwareness}/40`}</span>
        </div>
      </div>

      {score.reasons.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: score.mostDangerousUnbanned ? 8 : 0 }}>
          {score.reasons.map((r, i) => (
            <p key={i} style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>• {r}</p>
          ))}
        </div>
      )}

      {score.mostDangerousUnbanned && (
        <p style={{ fontSize: 10, color: 'var(--danger)', margin: 0 }}>
          Стоило забанить: {heroesById[score.mostDangerousUnbanned.heroId]?.localizedName ?? `герой #${score.mostDangerousUnbanned.heroId}`}
        </p>
      )}
    </div>
  );
}

function TeamColumn({
  label, color, picks, heroesById, reserveSec,
}: {
  label: string;
  color: string;
  picks: DraftEvent[];
  heroesById: Record<number, Hero>;
  reserveSec?: number;
}) {
  const slots = Array.from({ length: 5 }, (_, i) => picks[i]);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color, margin: 0, letterSpacing: 1 }}>{label}</p>
        {reserveSec != null && (
          <span style={{ fontSize: 10, color: reserveSec <= 20 ? 'var(--danger)' : 'var(--text-muted)' }}>
            резерв {reserveSec}s
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {slots.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'relative', aspectRatio: '16/6', borderRadius: 6, overflow: 'hidden',
              background: '#0d0f10', border: `0.5px solid ${p?.heroId != null ? color + '55' : 'var(--border)'}`,
            }}
          >
            {p?.heroId != null ? (
              <>
                <img src={heroesById[p.heroId]?.iconUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <span
                  style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0, padding: '3px 8px',
                    fontSize: 11, color: '#fff', background: 'linear-gradient(transparent, rgba(0,0,0,0.88))',
                  }}
                >
                  {heroesById[p.heroId]?.localizedName ?? p.heroId}
                </span>
              </>
            ) : (
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                {i + 1}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
