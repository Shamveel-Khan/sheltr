import { useState, useEffect } from 'react';
import { api } from '../../Services/api';
import { Loading } from '../Common/loading';
import { Modal } from '../Common/modal';
import { Header } from '../Layouts/header';

export function VisitorsPage({ toast }) {
  const [visitors, setVisitors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ student_id: '', visitor_name: '', entry_time: '', exit_time: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [vr, sr] = await Promise.all([api.get('/visitors'), api.get('/students')]);
      setVisitors(vr.data);
      setStudents(sr.data);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [toast]);

  const save = async () => {
    if (!form.student_id || !form.visitor_name) {
      toast.error('Student and visitor name required');
      return;
    }
    try {
      await api.post('/visitors', { ...form, entry_time: form.entry_time || new Date().toISOString() });
      toast.success('Visitor recorded');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const markExit = async (id) => {
    try {
      await api.put(`/visitors/${id}`, { exit_time: new Date().toISOString() });
      toast.success('Exit time recorded');
      load();
    } catch {
      toast.error('Error');
    }
  };

  return (
    <>
      <Header 
        title="Visitors" 
        subtitle="Track visitor entry and exit"
        action={<button className="btn btn-primary" onClick={() => { setForm({ student_id: '', visitor_name: '', entry_time: new Date().toISOString().slice(0, 16), exit_time: '' }); setModal(true); }}>+ Record Visitor</button>}
      />
      <div className="page-content">
        <div className="card">
          <div className="table-wrap">
            {loading ? <Loading /> : (
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Visitor Name</th><th>Student</th><th>Entry Time</th><th>Exit Time</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v, i) => (
                    <tr key={v.id}>
                      <td>{i + 1}</td>
                      <td>{v.visitor_name}</td>
                      <td>{v.student_name}<br /><span className="text-muted">{v.student_code}</span></td>
                      <td>{new Date(v.entry_time).toLocaleString()}</td>
                      <td>{v.exit_time ? new Date(v.exit_time).toLocaleString() : '—'}</td>
                      <td><span className={`badge ${v.exit_time ? 'gray' : 'green'}`}>{v.exit_time ? 'Checked Out' : 'Inside'}</span></td>
                      <td>{!v.exit_time && <button className="btn btn-ghost" onClick={() => markExit(v.id)}>Mark Exit</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Record Visitor Entry"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Record</button>
          </>
        }>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Visiting Student *</label>
            <select className="form-control" value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}>
              <option value="">-- Select student --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.student_id} — {s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Visitor Name *</label>
            <input className="form-control" value={form.visitor_name} onChange={e => setForm(p => ({ ...p, visitor_name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Entry Time</label>
            <input className="form-control" type="datetime-local" value={form.entry_time} onChange={e => setForm(p => ({ ...p, entry_time: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </>
  );
}