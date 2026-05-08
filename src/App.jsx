import { useState, useEffect } from 'react';
import { api } from './services/api';
import { useToast } from './hooks/useToast';
import { Toast } from './Components/Common/toast';
import { LoginPage } from './Components/Login/loginpage';
import { Sidebar } from './Components/Layouts/sidebar';
import { Dashboard } from './Components/Dashboard/dashboard';
import { StudentsPage } from './Components/Students/student';
import { RoomsPage } from './Components/Rooms/room';
import { AllocationsPage } from './Components/Allocation/allocation';
import { PaymentsPage } from './Components/Payments/payment';
import { ComplaintsPage } from './Components/Complaints/complaintpage';
import { VisitorsPage } from './Components/Visitors/visitorpage';
import { SqlLogsPage } from './Components/Admin/sqlLogs';

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const { toasts, toast } = useToast();

  useEffect(() => {
    const t = localStorage.getItem('hostel_token');
    const u = localStorage.getItem('hostel_user');
    if (t && u) {
      api.setToken(t);
      setUser(JSON.parse(u));
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('hostel_token', token);
    localStorage.setItem('hostel_user', JSON.stringify(userData));
    api.setToken(token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('hostel_token');
    localStorage.removeItem('hostel_user');
    api.setToken(null);
    setUser(null);
    setPage('dashboard');
  };

  const pages = {
    dashboard: <Dashboard toast={toast} />,
    students: <StudentsPage toast={toast} />,
    rooms: <RoomsPage toast={toast} />,
    allocations: <AllocationsPage toast={toast} />,
    payments: <PaymentsPage toast={toast} />,
    complaints: <ComplaintsPage toast={toast} />,
    visitors: <VisitorsPage toast={toast} />,
  };

  if (user?.role === 'admin') {
    pages['sql-logs'] = <SqlLogsPage toast={toast} />;
  }

  if (!user) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toast toasts={toasts} />
      </>
    );
  }

  const activePage = pages[page] || pages.dashboard;

  return (
    <>
      <div className="layout">
        <Sidebar user={user} page={page} setPage={setPage} onLogout={handleLogout} />
        <main className="main">{activePage}</main>
      </div>
      <Toast toasts={toasts} />
    </>
  );
}

export default App;