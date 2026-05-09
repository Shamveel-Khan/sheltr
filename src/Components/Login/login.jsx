import { useState } from 'react';
import { api } from '../../Services/api';
import { AuthHeader } from '../Common/AuthHeader';

export const LoginPage = ({ onBack, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = event => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    api.post('/auth/login', { username, password })
      .then(({ data }) => {
        localStorage.setItem('hostel_token', data.token);
        localStorage.setItem('hostel_user', JSON.stringify(data.user));
        api.setToken(data.token);
        onSuccess(data.user);
      })
      .catch(err => {
        const message = err?.response?.data?.error || 'Login failed. Try again.';
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="login-wrap">
      <div className="login-overlay">
        <div className="login-header">
          <AuthHeader actionLabel="Back" onAction={onBack} />
        </div>

        <div className="login-center">
          <section className="login-hero">
            <h1 className="login-motto">Welcome back.</h1>
            <p className="login-subtitle">
              Sign in to continue managing rooms, payments, and allocations.
            </p>
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="form-control"
                  placeholder="admin"
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                />
              </div>
              {error ? <div className="login-error">{error}</div> : null}
              <button type="submit" className="btn landing-cta-primary w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Enter dashboard'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};
