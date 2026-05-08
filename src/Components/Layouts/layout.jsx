import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout({ user, page, setPage, onLogout, title, subtitle, action, children }) {
  return (
    <div className="layout">
      <Sidebar user={user} page={page} setPage={setPage} onLogout={onLogout} />
      <main className="main">
        <Header title={title} subtitle={subtitle} action={action} />
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}