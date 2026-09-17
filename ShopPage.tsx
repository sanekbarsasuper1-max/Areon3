import { Link } from 'react-router-dom';

export function ShopPage() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24, textAlign: 'center' }}>
      <div style={{ padding: '60px 20px' }}>
        <p style={{ fontSize: 40, margin: '0 0 16px' }}>🛍️</p>
        <p style={{ fontSize: 18, fontWeight: 500, margin: '0 0 8px' }}>ORION SHOP</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>
          Скоро здесь можно будет тратить Orion Plus Shards —
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
          рамки профиля, значки, титулы и визуальные эффекты.
        </p>
        <span
          className="pill"
          style={{ background: 'var(--accent-bg)', color: 'var(--accent)', display: 'inline-block' }}
        >
          Скоро
        </span>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '24px 0 0' }}>
          Магазин пока не функционирует — это заготовка интерфейса. Валюта и её начисление за испытания уже
          работают по-настоящему, тратить её пока негде.
        </p>
        <Link to="/trials" className="button-ghost" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 20 }}>
          К испытаниям
        </Link>
      </div>
    </div>
  );
}
