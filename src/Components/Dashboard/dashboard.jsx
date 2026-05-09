import { useState, useEffect } from 'react';
import { api } from '../../Services/api';
import { Loading } from '../Common/loading';
import { Card } from '../Common/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

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

  const revenueSeries = Array.isArray(data.revenue_series) ? data.revenue_series : [];
  const revenueData = revenueSeries.reduce((acc, point) => {
    const last = acc.length ? acc[acc.length - 1].total : 0;
    acc.push({
      day: point.day,
      total: last + Number(point.total || 0)
    });
    return acc;
  }, []);
  const currencyFormatter = value => `Rs ${Number(value).toLocaleString()}`;
  const labelFormatter = label => {
    if (!label) return 'Date: --';
    const parts = String(label).split(' ');
    if (parts.length === 2) return `Date: ${parts[0]} ${parts[1]}`;
    return `Date: ${label}`;
  };

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

        <Card title="Revenue over time">
          <div className="revenue-chart">
            {revenueData.length ? (
              <div className="revenue-chart__canvas">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={revenueData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(111,91,255,0.5)" />
                        <stop offset="100%" stopColor="rgba(111,91,255,0)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: 'rgba(232,234,240,0.6)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(232,234,240,0.6)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={currencyFormatter}
                      width={70}
                    />
                    <Tooltip
                      formatter={value => [currencyFormatter(value), 'Total payments']}
                      labelFormatter={labelFormatter}
                      contentStyle={{
                        background: 'rgba(8,10,14,0.95)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        color: '#f4f6fb',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.35)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="rgba(111,91,255,0.9)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5 }}
                      fill="url(#revenueFill)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="revenue-chart__empty">No payment data yet.</div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}