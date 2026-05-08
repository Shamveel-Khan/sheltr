import { useState, useEffect } from 'react';
import { api } from '../../Services/api';
import { Loading } from '../Common/loading';
import { Modal } from '../Common/modal';
import { Confirm } from '../Common/confirm';
import { Header } from '../Layouts/header';

export function ComplaintsPage({ toast }) {
  const [complaints, setComplaints] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState({ student_id: '', description: '', status: 'Pending' });

  const load = async () => {
    setLoading(true);
    try {
      const [cr, sr] = await Promise.all([api.get('/complaints'), api.get('/students')]);
      setComplaints(cr.data);
      setStudents(sr.data);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [toast]);

  const save = async () => {
    if (!form.student_id || !form.description) {
      toast.error('Student and description required');
      return;
    }
    try {
      await api.post('/complaints', form);
      toast.success('Complaint recorded');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const resolve = async (id) => {
    try {
      await api.put(`/complaints/${id}`, { status: 'Resolved' });
      toast.success('Complaint resolved');
      load();
    } catch {
      toast.error('Error');
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/complaints/${id}`);
      toast.success('Deleted');
      setConfirm(null);
      load();
    } catch {
      toast.error('Error');
    }
  };

  const pending = complaints.filter(c => c.status === 'Pending').length;

  return (
    <>
      <Header 
        title="Complaints" 
        subtitle={`${pending} pending · ${complaints.length} total`}
        action={<button className="btn btn-primary" onClick={() => { setForm({ student_id: '', description: '', status: 'Pending' }); setModal(true); }}>+ Add Complaint</button>}
      />
      <div className="page-content">
        <div className="card">
          <div className="table-wrap">
            {loading ? <Loading /> : (
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Student</th><th>Description</th><th>Status</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c, i) => (
                    <tr key={c.id}>
                      <td>{i + 1}</td>
                      <td>{c.student_name}<br /><span className="text-muted">{c.student_code}</span></td>
                      <td>{c.description}</td>
                      <td><span className={`badge ${c.status === 'Resolved' ? 'green' : 'amber'}`}>{c.status}</span></td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        {c.status === 'Pending' && <button className="btn-icon" onClick={() => resolve(c.id)}>✓</button>}
                        <button className="btn-icon" onClick={() => setConfirm(c.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Record Complaint"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Submit</button>
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
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-control" rows="3" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirm} msg="Delete this complaint?"
        onConfirm={() => del(confirm)} onCancel={() => setConfirm(null)} />
    </>
  );
}