export function Header({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}