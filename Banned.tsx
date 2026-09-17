export function Banned() {
  return (
    <div
      style={{
        minHeight: '100vh', background: '#08090a', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20, textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 20, fontWeight: 500, color: '#C97B63', margin: 0 }}>Доступ ограничен</p>
      <p style={{ fontSize: 13, color: '#9c988a', maxWidth: 320, margin: 0 }}>
        Ваш аккаунт заблокирован администрацией Areon. Если считаете, что это ошибка,
        обратитесь в поддержку.
      </p>
    </div>
  );
}
