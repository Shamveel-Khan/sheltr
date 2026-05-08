export function Card({ title, children, action }) {
  return (
    <div className="card">
      {(title || action) && (
        <div className="card-header">
          {title && <span className="card-title">{title}</span>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}