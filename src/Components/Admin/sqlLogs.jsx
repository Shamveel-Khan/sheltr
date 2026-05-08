import { useEffect, useState } from 'react';
import { api } from '../../Services/api';
import { Loading } from '../Common/loading';
import { Header } from '../Layouts/header';

export function SqlLogsPage({ toast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(100);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/sql-logs', { params: { limit } });
      setLogs(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load SQL logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [limit]);

  return (
    <>
      <Header
        title="SQL Query Logs"
        subtitle="Recent SQL executed by the API"
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select className="form-control" value={limit} onChange={e => setLimit(+e.target.value)}>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
              <option value={200}>Last 200</option>
            </select>
            <button className="btn btn-primary" onClick={load}>Refresh</button>
          </div>
        }
      />
      <div className="page-content">
        <div className="card">
          <div className="table-wrap">
            {loading ? <Loading /> : (
              <table>
                <thead>
                  <tr>
                    <th>Time (UTC)</th>
                    <th>Request</th>
                    <th>Duration (ms)</th>
                    <th>SQL</th>
                    <th>Params</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={`${l.request_id}-${i}`}>
                      <td>{new Date(l.ts).toLocaleString()}</td>
                      <td>{l.method} {l.path}<br /><span className="text-muted">{l.request_id}</span></td>
                      <td>{l.duration_ms}</td>
                      <td style={{ maxWidth: '380px' }}><code>{l.sql}</code></td>
                      <td style={{ maxWidth: '260px' }}><code>{JSON.stringify(l.params)}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
