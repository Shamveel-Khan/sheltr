export const AuthHeader = ({ brand = 'HostelHQ', links, actionLabel, onAction }) => {
  const navLinks = links || [
    { label: 'Features' },
    { label: 'About' }
  ];

  return (
    <header className="auth-header">
      <nav className="auth-nav">
        <div className="auth-brand">{brand}</div>
        <div className="auth-actions">
          <div className="auth-links">
            {navLinks.map(link => (
              <button key={link.label} type="button" className="btn btn-light">
                {link.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-light" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      </nav>
    </header>
  );
};
