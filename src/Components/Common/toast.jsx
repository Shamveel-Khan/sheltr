export function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' && <span>✓</span>}
          {t.type === 'error' && <span>✕</span>}
          {t.msg}
        </div>
      ))}
    </div>
  );
}