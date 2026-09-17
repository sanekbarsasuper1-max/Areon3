import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Hero, WheelSpinResult } from '../api';
import { useAudio } from '../audio/AudioContext';

// DESIGN NOTE: the spec describes a literal circular wheel with heroes
// on sectors. With 120+ heroes in the roster, a real pie-slice wheel
// would make each sector illegible — a handful of degrees per hero.
// This implements the same "spin, heroes flick past rapidly, then
// decelerate and land on one" experience as a horizontal slot-machine
// reel instead, the standard readable way this kind of UI is built for
// a large item pool. Framed as "THE WHEEL" throughout the UI text,
// since that's the feature's identity, not its literal geometry.
const REEL_ITEM_WIDTH = 96;
const REEL_LENGTH = 40;
const WINNER_POSITION = 34;

export function WheelOfFatePage() {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [reel, setReel] = useState<Hero[] | null>(null);
  const [result, setResult] = useState<WheelSpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { playSFX } = useAudio();

  useEffect(() => {
    api.heroes().then(setHeroes);
  }, []);

  async function spin() {
    if (spinning || heroes.length === 0) return;
    setError(null);
    setResult(null);
    setSpinning(true);
    playSFX('wheel_spin_start');

    let spinResult: WheelSpinResult;
    try {
      spinResult = await api.wheelSpin();
    } catch {
      setError('Не удалось раскрутить колесо — проверьте, что администратор синхронизировал героев/предметы и настроил AI Coach (ANTHROPIC_API_KEY).');
      setSpinning(false);
      return;
    }

    const filler = Array.from({ length: REEL_LENGTH }, () => heroes[Math.floor(Math.random() * heroes.length)]);
    filler[WINNER_POSITION] = spinResult.hero;
    setReel(filler);

    if (trackRef.current) {
      trackRef.current.style.transition = 'none';
      trackRef.current.style.transform = 'translateX(0)';
      void trackRef.current.offsetHeight;
      trackRef.current.style.transition = 'transform 3.6s cubic-bezier(0.12, 0.85, 0.15, 1)';
      trackRef.current.style.transform = `translateX(-${WINNER_POSITION * REEL_ITEM_WIDTH}px)`;
    }

    setTimeout(() => {
      setSpinning(false);
      setResult(spinResult);
      playSFX('wheel_result');
    }, 3700);
  }

  function spinAgain() {
    setResult(null);
    setReel(null);
    spin();
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>WHEEL OF FATE</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Случайный герой — и полноценная сборка под него</p>
        </div>
        <Link to="/trials" className="button-ghost" style={{ textDecoration: 'none', fontSize: 11 }}>К испытаниям</Link>
      </div>

      <div
        style={{
          position: 'relative',
          height: 96,
          overflow: 'hidden',
          borderRadius: 10,
          background: 'linear-gradient(180deg, #0d0f10, #08090a)',
          border: '0.5px solid var(--border)',
          marginBottom: 20,
        }}
      >
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#C9A227', zIndex: 2, transform: 'translateX(-1px)' }} />
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 24px 8px #08090a', zIndex: 1, pointerEvents: 'none' }} />

        <div ref={trackRef} style={{ display: 'flex', position: 'absolute', left: `calc(50% - ${REEL_ITEM_WIDTH / 2}px)`, top: 0 }}>
          {(reel ?? heroes.slice(0, 10)).map((h, i) => (
            <div key={i} style={{ width: REEL_ITEM_WIDTH, height: 96, flexShrink: 0, padding: 4 }}>
              <img src={h.iconUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
            </div>
          ))}
        </div>
      </div>

      <button className="button-primary" onClick={spin} disabled={spinning || heroes.length === 0} style={{ width: '100%', marginBottom: 16 }}>
        {spinning ? 'ВРАЩЕНИЕ…' : 'SPIN THE WHEEL'}
      </button>

      {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 16 }}>{error}</p>}

      {result && (
        <div>
          <div className="card" style={{ textAlign: 'center', padding: 24, marginBottom: 16, background: 'linear-gradient(180deg, rgba(185,143,209,0.08), transparent)', border: '0.5px solid rgba(185,143,209,0.3)' }}>
            <p style={{ fontSize: 10, letterSpacing: 2, color: '#b98fd1', margin: '0 0 8px' }}>YOUR FATE</p>
            <img src={result.hero.iconUrl} alt="" style={{ width: 160, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
            <p style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>{result.hero.localizedName.toUpperCase()}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>{result.hero.primaryAttr}</p>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px', letterSpacing: 1 }}>INVENTORY — {result.concept.conceptName.toUpperCase()}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 16 }}>
            {result.items.map((item) => (
              <div key={item.id} title={item.dname} style={{ aspectRatio: '1', background: '#111315', borderRadius: 6, border: '0.5px solid var(--border)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={item.iconUrl} alt={item.dname} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, color: '#b98fd1', margin: '0 0 8px', letterSpacing: 1 }}>WHY THIS BUILD?</p>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{result.concept.reasoning}</p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button-primary" style={{ flex: 1 }} onClick={() => setResult(null)}>ACCEPT FATE</button>
            <button className="button-ghost" style={{ flex: 1 }} onClick={spinAgain}>SPIN AGAIN</button>
          </div>
        </div>
      )}
    </div>
  );
}
