import { useState, useEffect, useCallback } from 'react';
import { api } from '../../Services/api';
import { Loading } from '../Common/loading';
import { Modal } from '../Common/modal';
import { Confirm } from '../Common/confirm';
import { Header } from '../Layouts/header';

export function StudentsPage({ toast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState({ student_id: '', name: '', email: '', phone: '', department: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, dr] = await Promise.all([
        api.get('/students', { params: { search, department: deptFilter } }),
        api.get('/departments')
      ]);
      setStudents(sr.data);
      setDepartments(dr.data);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, toast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ student_id: '', name: '', email: '', phone: '', department: '' });
    setModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ student_id: s.student_id, name: s.name, email: s.email, phone: s.phone, department: s.department });
    setModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.put(`/students/${editing.id}`, form);
        toast.success('Student updated');
      } else {
        await api.post('/students', form);
        toast.success('Student added');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving');
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/students/${id}`);
      toast.success('Student deleted');
      setConfirm(null);
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <>
      <Header 
        title="Students" 
        subtitle="Manage hostel student registrations"
        action={<button className="btn btn-primary" onClick={openAdd}>+ Add Student</button>}
      />
      <div className="page-content">
        <div className="toolbar">
          <div className="search-bar">
            <input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: '160px' }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="card">
          <div className="table-wrap">
            {loading ? <Loading /> : (
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th><th>Name</th><th>Department</th><th>Phone</th><th>Room</th><th>Fees Paid</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td><span className="badge blue">{s.student_id}</span></td>
                      <td>{s.name}<br /><span className="text-muted">{s.email}</span></td>
                      <td>{s.department}</td>
                      <td>{s.phone}</td>
                      <td>{s.room_number ? <span className="badge green">{s.room_number}</span> : <span className="badge gray">—</span>}</td>
                      <td>₨ {s.total_paid.toLocaleString()}</td>
                      <td>
                        <button className="btn-icon" onClick={() => openEdit(s)}>✏️</button>
                        <button className="btn-icon" onClick={() => setConfirm(s.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Student' : 'Add New Student'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>{editing ? 'Save Changes' : 'Add Student'}</button>
          </>
        }>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Student ID *</label>
            <input className="form-control" value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))} disabled={!!editing} />
          </div>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-control" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input className="form-control" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Department *</label>
              <input className="form-control" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
            </div>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirm} msg="Delete this student? All related data will be removed."
        onConfirm={() => del(confirm)} onCancel={() => setConfirm(null)} />
    </>
  );
}