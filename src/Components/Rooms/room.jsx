import { useState, useEffect } from 'react';
import { api } from '../../Services/api';
import { Loading } from '../Common/loading';
import { Modal } from '../Common/modal';
import { Confirm } from '../Common/confirm';
import { Header } from '../Layouts/header';

export function RoomsPage({ toast }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm] = useState({ room_number: '', capacity: 2, room_type: 'Double' });

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/rooms');
      setRooms(r.data);
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [toast]);

  const save = async () => {
    try {
      await api.post('/rooms', form);
      toast.success('Room added');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/rooms/${id}`);
      toast.success('Room deleted');
      setConfirm(null);
      load();
    } catch {
      toast.error('Cannot delete room with active allocations');
      setConfirm(null);
    }
  };

  return (
    <>
      <Header 
        title="Rooms" 
        subtitle="Manage hostel rooms and view occupancy"
        action={<button className="btn btn-primary" onClick={() => { setForm({ room_number: '', capacity: 2, room_type: 'Double' }); setModal(true); }}>+ Add Room</button>}
      />
      <div className="page-content">
        {loading ? <Loading /> : (
          <div className="rooms-grid">
            {rooms.map(r => {
              const pct = r.capacity > 0 ? (r.occupied / r.capacity) * 100 : 0;
              return (
                <div key={r.id} className="room-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="room-number">{r.room_number}</div>
                    <button className="btn-icon" onClick={() => setConfirm(r.id)}>🗑️</button>
                  </div>
                  <div className="text-muted">{r.room_type}</div>
                  <div className="room-bar-wrap">
                    <div className="room-bar" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--red)' : pct > 60 ? 'var(--amber)' : 'var(--green)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{r.occupied}/{r.capacity} occupied</span>
                    <span className={`badge ${r.available === 0 ? 'red' : r.available === r.capacity ? 'green' : 'amber'}`}>
                      {r.available === 0 ? 'Full' : `${r.available} free`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add New Room"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Add Room</button>
          </>
        }>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Room Number *</label>
            <input className="form-control" value={form.room_number} onChange={e => setForm(p => ({ ...p, room_number: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Capacity *</label>
              <input className="form-control" type="number" min="1" max="10" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Room Type</label>
              <select className="form-control" value={form.room_type} onChange={e => setForm(p => ({ ...p, room_type: e.target.value }))}>
                <option>Single</option><option>Double</option><option>Triple</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      <Confirm open={!!confirm} msg="Delete this room? This will also remove all allocations."
        onConfirm={() => del(confirm)} onCancel={() => setConfirm(null)} />
    </>
  );
}