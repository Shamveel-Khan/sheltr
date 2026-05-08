import { useState, useEffect } from 'react';
import { api } from '../../Services/api';
import { Loading } from '../Common/loading';
import { Card } from '../Common/card';

export function Dashboard({ toast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { toast.error('Failed to load dashboard'); setLoading(false); });
  }, [toast]);

  if (loading) return <Loading />;
  if (!data) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Welcome back — here's what's happening today</div>
        </div>
      </div>
      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-value">{data.total_students}</div>
            <div className="stat-label">Total Students</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-value">{data.total_rooms}</div>
            <div className="stat-label">Total Rooms</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-value">{data.occupied_rooms}</div>
            <div className="stat-label">Occupied Rooms</div>
          </div>
          <div className="stat-card green">
            <div className="stat-value">{data.available_rooms}</div>
            <div className="stat-label">Available Rooms</div>
          </div>
          <div className="stat-card green">
            <div className="stat-value">₨ {data.total_payments.toLocaleString()}</div>
            <div className="stat-label">Total Fees Collected</div>
          </div>
          <div className="stat-card red">
            <div className="stat-value">{data.pending_complaints}</div>
            <div className="stat-label">Pending Complaints</div>
          </div>
        </div>

        <Card title="Recently Registered Students">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student ID</th><th>Name</th><th>Department</th><th>Room</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_students.map(s => (
                  <tr key={s.id}>
                    <td><span className="badge blue">{s.student_id}</span></td>
                    <td>{s.name}</td>
                    <td>{s.department}</td>
                    <td>{s.room_number ? <span className="badge green">{s.room_number}</span> : <span className="badge gray">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}