export function Sidebar({ user, page, setPage, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'students', label: 'Students' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'allocations', label: 'Allocations' },
    { id: 'payments', label: 'Payments' },
    { id: 'complaints', label: 'Complaints' },
    { id: 'visitors', label: 'Visitors' },
  ];

  if (user.role === 'admin') {
    navItems.push({ id: 'sql-logs', label: 'SQL Logs' });
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <h1>Hostel <span className="sidebar-badge">v1</span></h1>
        <span>Management System</span>
      </div>

      <div className="sidebar-section">MAIN</div>
      {navItems.map(item => (
        <div
          key={item.id}
          className={`nav-item ${page === item.id ? 'active' : ''}`}
          onClick={() => setPage(item.id)}
        >
          {item.label}
        </div>
      ))}

      <div className="sidebar-user">
        <div className="user-card">
          <div className="user-avatar">{user.full_name.charAt(0)}</div>
          <div className="user-info">
            <div className="user-name">{user.full_name}</div>
            <div className="user-role">{user.role}</div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}