import { useState, useEffect } from 'react';
import { api } from './services/api';
import { useToast } from './hooks/useToast';
import { Toast } from './Components/Common/toast';
import { Dashboard } from './Components/Dashboard/dashboard';
import { StudentsPage } from './Components/Students/student';
import { RoomsPage } from './Components/Rooms/room';
import { AllocationsPage } from './Components/Allocation/allocation';
import { PaymentsPage } from './Components/Payments/payment';
import { ComplaintsPage } from './Components/Complaints/complaintpage';
import { VisitorsPage } from './Components/Visitors/visitorpage';
import { SqlLogsPage } from './Components/Admin/sqlLogs';
import { LandingPage } from './Components/Landing/landing';
import { LoginPage } from './Components/Login/login';
import { MagnificationDock } from './Components/Common/MagnificationDock';
import {
  LayoutGrid,
  Users,
  BedDouble,
  CalendarCheck,
  CreditCard,
  MessageCircleWarning,
  UsersRound,
  Database,
  LogOut
} from 'lucide-react';

function App() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('hostel_user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return { full_name: 'Sheltr User', role: 'staff' };
      }
    }
    return { full_name: 'Sheltr User', role: 'staff' };
  });
  const [page, setPage] = useState('landing');
  const { toasts, toast } = useToast();

  useEffect(() => {
    const t = localStorage.getItem('hostel_token');
    if (t) {
      api.setToken(t);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('hostel_token');
    localStorage.removeItem('hostel_user');
    api.setToken(null);
    setUser({ full_name: 'Sheltr User', role: 'staff' });
    setPage('dashboard');
  };

  const pages = {
    landing: <LandingPage onLogin={() => setPage('login')} />,
    login: (
      <LoginPage
        onBack={() => setPage('landing')}
        onSuccess={(nextUser) => {
          setUser(nextUser);
          setPage('dashboard');
        }}
      />
    ),
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

  const activePage = pages[page] || pages.dashboard;
  const isAppPage = page !== 'landing' && page !== 'login';

  const dockItems = [
    { icon: <LayoutGrid size={22} />, label: 'Dashboard', onClick: () => setPage('dashboard') },
    { icon: <Users size={22} />, label: 'Students', onClick: () => setPage('students') },
    { icon: <BedDouble size={22} />, label: 'Rooms', onClick: () => setPage('rooms') },
    { icon: <CalendarCheck size={22} />, label: 'Allocations', onClick: () => setPage('allocations') },
    { icon: <CreditCard size={22} />, label: 'Payments', onClick: () => setPage('payments') },
    { icon: <MessageCircleWarning size={22} />, label: 'Complaints', onClick: () => setPage('complaints') },
    { icon: <UsersRound size={22} />, label: 'Visitors', onClick: () => setPage('visitors') }
  ];

  if (user?.role === 'admin') {
    dockItems.push({ icon: <Database size={22} />, label: 'SQL Logs', onClick: () => setPage('sql-logs') });
  }

  dockItems.push({ icon: <LogOut size={22} />, label: 'Logout', onClick: handleLogout });

  return (
    <>
      {isAppPage ? (
        <div className="app-shell">
          <main className="app-main">{activePage}</main>
          <div className="app-dock">
            <MagnificationDock
              items={dockItems}
              panelHeight={70}
              baseItemSize={48}
              magnification={78}
            />
          </div>
        </div>
      ) : (
        <div className="auth-shell">{activePage}</div>
      )}
      <Toast toasts={toasts} />
    </>
  );
}

export default App;