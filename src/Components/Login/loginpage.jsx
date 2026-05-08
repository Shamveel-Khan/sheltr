import { useState } from 'react';
import { api } from '../../Services/api';

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Please fill all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', form);
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1>Hostel Manager</h1>
          <p>Smart Hostel Management System</p>
        </div>
        <form onSubmit={submit} className="form-grid">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-control"
              placeholder="Enter username"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-control"
              type="text"
              placeholder="Enter password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            />
          </div>
          {error && <p style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</p>}
          <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="login-hint">
          <strong>Demo credentials:</strong><br />
          Admin: <strong>admin</strong> / <strong>admin123</strong><br />
          Staff: <strong>staff1</strong> / <strong>staff123</strong>
        </div>
      </div>
    </div>
  );
}