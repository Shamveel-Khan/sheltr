import { useState, useEffect } from 'react';
import { api } from '../../Services/api';
import { Loading } from '../Common/loading';
import { Modal } from '../Common/modal';
import { Confirm } from '../Common/confirm';
import { Header } from '../Layouts/header';

export function PaymentsPage({ toast }) {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState({ student_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], status: 'Paid', note: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [pr, sr] = await Promise.all([api.get('/payments'), api.get('/students')]);
      setPayments(pr.data);
      setStudents(sr.data);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [toast]);

  const save = async () => {
    if (!form.student_id || !form.amount) {
      toast.error('Student and amount required');
      return;
    }
    try {
      await api.post('/payments', { ...form, amount: +form.amount });
      toast.success('Payment recorded');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/payments/${id}`);
      toast.success('Payment deleted');
      setConfirm(null);
      load();
    } catch {
      toast.error('Error');
    }
  };

  const totalPaid = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <Header 
        title="Payments" 
        subtitle={`Track hostel fee payments · Total collected: ₨ ${totalPaid.toLocaleString()}`}
        action={<button className="btn btn-primary" onClick={() => { setForm({ student_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], status: 'Paid', note: '' }); setModal(true); }}>+ Record Payment</button>}
      />
      <div className="page-content">
        <div className="card">
          <div className="table-wrap">
            {loading ? <Loading /> : (
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Student</th><th>Amount (₨)</th><th>Date</th><th>Status</th><th>Note</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td>{p.student_name}<br /><span className="text-muted">{p.student_code}</span></td>
                      <td>₨ {p.amount.toLocaleString()}</td>
                      <td>{p.payment_date}</td>
                      <td><span className={`badge ${p.status === 'Paid' ? 'green' : 'amber'}`}>{p.status}</span></td>
                      <td>{p.note || '—'}</td>
                      <td><button className="btn-icon" onClick={() => setConfirm(p.id)}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Record Payment"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Record</button>
          </>
        }>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Student *</label>
            <select className="form-control" value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}>
              <option value="">-- Select student --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.student_id} — {s.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (₨) *</label>
              <input className="form-control" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-control" type="date" value={form.payment_date} onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option>Paid</option><option>Pending</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Note</label>
              <input className="form-control" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirm} msg="Delete this payment record?"
        onConfirm={() => del(confirm)} onCancel={() => setConfirm(null)} />
    </>
  );
}