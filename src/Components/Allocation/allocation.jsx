import { useState, useEffect } from 'react';
import { api } from '../../Services/api';
import { Loading } from '../Common/loading';
import { Modal } from '../Common/modal';
import { Confirm } from '../Common/confirm';
import { Header } from '../Layouts/header';

export function AllocationsPage({ toast }) {
  const [allocs, setAllocs] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState({ student_id: '', room_id: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [ar, sr, rr] = await Promise.all([
        api.get('/allocations'),
        api.get('/students'),
        api.get('/rooms')
      ]);
      setAllocs(ar.data);
      setStudents(sr.data);
      setRooms(rr.data);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [toast]);

  const allocatedStudentIds = new Set(allocs.map(a => a.student_db_id));
  const unallocatedStudents = students.filter(s => !allocatedStudentIds.has(s.id));
  const availableRooms = rooms.filter(r => r.available > 0);

  const save = async () => {
    if (!form.student_id || !form.room_id) {
      toast.error('Select student and room');
      return;
    }
    try {
      await api.post('/allocations', { student_id: +form.student_id, room_id: +form.room_id });
      toast.success('Room allocated');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/allocations/${id}`);
      toast.success('Allocation removed');
      setConfirm(null);
      load();
    } catch {
      toast.error('Error removing allocation');
    }
  };

  return (
    <>
      <Header 
        title="Room Allocations" 
        subtitle="Assign students to hostel rooms"
        action={<button className="btn btn-primary" onClick={() => { setForm({ student_id: '', room_id: '' }); setModal(true); }}>+ Allocate Room</button>}
      />
      <div className="page-content">
        <div className="card">
          <div className="table-wrap">
            {loading ? <Loading /> : (
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th><th>Student Name</th><th>Department</th><th>Room</th><th>Type</th><th>Allocated On</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allocs.map(a => (
                    <tr key={a.id}>
                      <td><span className="badge blue">{a.student_id}</span></td>
                      <td>{a.student_name}</td>
                      <td>{a.department}</td>
                      <td><span className="badge green">{a.room_number}</span></td>
                      <td>{a.room_type}</td>
                      <td>{new Date(a.allocated_at).toLocaleDateString()}</td>
                      <td><button className="btn-icon" onClick={() => setConfirm(a.id)}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Allocate Room to Student"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Allocate</button>
          </>
        }>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Select Student</label>
            <select className="form-control" value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}>
              <option value="">-- Select student --</option>
              {unallocatedStudents.map(s => <option key={s.id} value={s.id}>{s.student_id} — {s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Select Room</label>
            <select className="form-control" value={form.room_id} onChange={e => setForm(p => ({ ...p, room_id: e.target.value }))}>
              <option value="">-- Select room --</option>
              {availableRooms.map(r => <option key={r.id} value={r.id}>{r.room_number} — {r.room_type} ({r.available} free)</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirm} msg="Remove this room allocation?"
        onConfirm={() => del(confirm)} onCancel={() => setConfirm(null)} />
    </>
  );
}