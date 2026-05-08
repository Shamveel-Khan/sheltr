// Mock Data Store
let mockStudents = [
  { id: 1, student_id: '24K-0941', name: 'Ali Raza', email: 'ali@example.com', phone: '03001234567', department: 'CS', room_number: 'R101', total_paid: 25000 },
  { id: 2, student_id: '24K-0942', name: 'Sara Khan', email: 'sara@example.com', phone: '03001234568', department: 'SE', room_number: 'R102', total_paid: 15000 },
  { id: 3, student_id: '24K-0943', name: 'Usman Chaudhry', email: 'usman@example.com', phone: '03001234569', department: 'CS', room_number: null, total_paid: 0 },
];

let mockRooms = [
  { id: 1, room_number: 'R101', capacity: 2, room_type: 'Double', occupied: 1, available: 1 },
  { id: 2, room_number: 'R102', capacity: 1, room_type: 'Single', occupied: 1, available: 0 },
  { id: 3, room_number: 'R103', capacity: 3, room_type: 'Triple', occupied: 0, available: 3 },
  { id: 4, room_number: 'R104', capacity: 2, room_type: 'Double', occupied: 0, available: 2 },
];

let mockAllocations = [
  { id: 1, student_db_id: 1, student_id: '24K-0941', student_name: 'Ali Raza', department: 'CS', room_id: 1, room_number: 'R101', room_type: 'Double', allocated_at: new Date().toISOString() },
  { id: 2, student_db_id: 2, student_id: '24K-0942', student_name: 'Sara Khan', department: 'SE', room_id: 2, room_number: 'R102', room_type: 'Single', allocated_at: new Date().toISOString() },
];

let mockPayments = [
  { id: 1, student_id: 1, student_name: 'Ali Raza', student_code: '24K-0941', amount: 25000, payment_date: new Date().toISOString().split('T')[0], status: 'Paid', note: 'Semester fee' },
  { id: 2, student_id: 2, student_name: 'Sara Khan', student_code: '24K-0942', amount: 15000, payment_date: new Date().toISOString().split('T')[0], status: 'Paid', note: 'Semester fee' },
];

let mockComplaints = [
  { id: 1, student_id: 1, student_name: 'Ali Raza', student_code: '24K-0941', description: 'Water leakage in room', status: 'Pending', created_at: new Date().toISOString() },
  { id: 2, student_id: 2, student_name: 'Sara Khan', student_code: '24K-0942', description: 'Electricity issue', status: 'Resolved', created_at: new Date().toISOString() },
];

let mockVisitors = [
  { id: 1, student_id: 1, student_name: 'Ali Raza', student_code: '24K-0941', visitor_name: 'Ahmed', entry_time: new Date().toISOString(), exit_time: null },
];

const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export const mockAPI = {
  enabled: useMock,

  post: async (url, data) => {
    await new Promise(r => setTimeout(r, 300));

    if (url === '/auth/login') {
      if ((data.username === 'admin' && data.password === 'admin123') ||
        (data.username === 'staff1' && data.password === 'staff123')) {
        return {
          data: {
            token: 'mock-token-' + Date.now(),
            user: {
              id: 1,
              full_name: data.username === 'admin' ? 'Admin User' : 'Staff Member',
              username: data.username,
              role: data.username === 'admin' ? 'admin' : 'staff'
            }
          }
        };
      }
      throw { response: { data: { error: 'Invalid credentials' } } };
    }

    if (url === '/students') {
      const newStudent = { ...data, id: mockStudents.length + 1, room_number: null, total_paid: 0 };
      mockStudents.push(newStudent);
      return { data: newStudent };
    }

    if (url === '/rooms') {
      const newRoom = { ...data, id: mockRooms.length + 1, occupied: 0, available: data.capacity };
      mockRooms.push(newRoom);
      return { data: newRoom };
    }

    if (url === '/allocations') {
      const student = mockStudents.find(s => s.id === parseInt(data.student_id));
      const room = mockRooms.find(r => r.id === parseInt(data.room_id));
      if (!student || !room) throw { response: { data: { error: 'Invalid student or room' } } };
      if (room.available <= 0) throw { response: { data: { error: 'Room is full' } } };

      const newAlloc = {
        id: mockAllocations.length + 1,
        student_db_id: parseInt(data.student_id),
        student_id: student.student_id,
        student_name: student.name,
        department: student.department,
        room_id: parseInt(data.room_id),
        room_number: room.room_number,
        room_type: room.room_type,
        allocated_at: new Date().toISOString()
      };
      mockAllocations.push(newAlloc);
      room.occupied++;
      room.available--;
      student.room_number = room.room_number;
      return { data: newAlloc };
    }

    if (url === '/payments') {
      const student = mockStudents.find(s => s.id === parseInt(data.student_id));
      const newPayment = {
        id: mockPayments.length + 1,
        student_id: parseInt(data.student_id),
        student_name: student.name,
        student_code: student.student_id,
        amount: parseFloat(data.amount),
        payment_date: data.payment_date || new Date().toISOString().split('T')[0],
        status: data.status || 'Paid',
        note: data.note || ''
      };
      mockPayments.push(newPayment);
      student.total_paid = (student.total_paid || 0) + parseFloat(data.amount);
      return { data: newPayment };
    }

    if (url === '/complaints') {
      const student = mockStudents.find(s => s.id === parseInt(data.student_id));
      const newComplaint = {
        id: mockComplaints.length + 1,
        student_id: parseInt(data.student_id),
        student_name: student.name,
        student_code: student.student_id,
        description: data.description,
        status: 'Pending',
        created_at: new Date().toISOString()
      };
      mockComplaints.push(newComplaint);
      return { data: newComplaint };
    }

    if (url === '/visitors') {
      const student = mockStudents.find(s => s.id === parseInt(data.student_id));
      const newVisitor = {
        id: mockVisitors.length + 1,
        student_id: parseInt(data.student_id),
        student_name: student.name,
        student_code: student.student_id,
        visitor_name: data.visitor_name,
        entry_time: data.entry_time || new Date().toISOString(),
        exit_time: data.exit_time || null
      };
      mockVisitors.push(newVisitor);
      return { data: newVisitor };
    }

    throw new Error(`Unhandled POST request: ${url}`);
  },

  get: async (url, cfg) => {
    await new Promise(r => setTimeout(r, 200));

    if (url === '/dashboard') {
      return {
        data: {
          total_students: mockStudents.length,
          total_rooms: mockRooms.length,
          occupied_rooms: mockRooms.filter(r => r.occupied > 0).length,
          available_rooms: mockRooms.filter(r => r.available > 0).length,
          total_payments: mockPayments.reduce((s, p) => s + p.amount, 0),
          pending_complaints: mockComplaints.filter(c => c.status === 'Pending').length,
          recent_students: mockStudents.slice(-5)
        }
      };
    }

    if (url === '/students') {
      let result = [...mockStudents];
      if (cfg?.params?.search) {
        const search = cfg.params.search.toLowerCase();
        result = result.filter(s => s.name.toLowerCase().includes(search) || s.student_id.toLowerCase().includes(search));
      }
      if (cfg?.params?.department) {
        result = result.filter(s => s.department === cfg.params.department);
      }
      return { data: result };
    }

    if (url === '/departments') {
      return { data: [...new Set(mockStudents.map(s => s.department))] };
    }
    if (url === '/rooms') return { data: mockRooms };
    if (url === '/allocations') return { data: mockAllocations };
    if (url === '/payments') return { data: mockPayments };
    if (url === '/complaints') return { data: mockComplaints };
    if (url === '/visitors') return { data: mockVisitors };

    throw new Error(`Unhandled GET request: ${url}`);
  },

  put: async (url, data) => {
    await new Promise(r => setTimeout(r, 200));

    if (url.startsWith('/students/')) {
      const id = parseInt(url.split('/')[2]);
      const index = mockStudents.findIndex(s => s.id === id);
      if (index !== -1) mockStudents[index] = { ...mockStudents[index], ...data };
      return { data: mockStudents[index] };
    }

    if (url.startsWith('/complaints/')) {
      const id = parseInt(url.split('/')[2]);
      const index = mockComplaints.findIndex(c => c.id === id);
      if (index !== -1) mockComplaints[index].status = data.status;
      return { data: mockComplaints[index] };
    }

    if (url.startsWith('/visitors/')) {
      const id = parseInt(url.split('/')[2]);
      const index = mockVisitors.findIndex(v => v.id === id);
      if (index !== -1) mockVisitors[index].exit_time = data.exit_time;
      return { data: mockVisitors[index] };
    }

    throw new Error(`Unhandled PUT request: ${url}`);
  },

  delete: async (url) => {
    await new Promise(r => setTimeout(r, 200));

    if (url.startsWith('/students/')) {
      const id = parseInt(url.split('/')[2]);
      const hasAllocation = mockAllocations.some(a => a.student_db_id === id);
      if (hasAllocation) {
        throw { response: { data: { error: 'Cannot delete student with active room allocation' } } };
      }
      mockStudents = mockStudents.filter(s => s.id !== id);
      return { data: { success: true } };
    }

    if (url.startsWith('/rooms/')) {
      const id = parseInt(url.split('/')[2]);
      const hasAllocation = mockAllocations.some(a => a.room_id === id);
      if (hasAllocation) {
        throw { response: { data: { error: 'Cannot delete room with active allocations' } } };
      }
      mockRooms = mockRooms.filter(r => r.id !== id);
      return { data: { success: true } };
    }

    if (url.startsWith('/allocations/')) {
      const id = parseInt(url.split('/')[2]);
      const alloc = mockAllocations.find(a => a.id === id);
      if (alloc) {
        const room = mockRooms.find(r => r.id === alloc.room_id);
        if (room) {
          room.occupied--;
          room.available++;
        }
        const student = mockStudents.find(s => s.id === alloc.student_db_id);
        if (student) student.room_number = null;
      }
      mockAllocations = mockAllocations.filter(a => a.id !== id);
      return { data: { success: true } };
    }

    if (url.startsWith('/payments/')) {
      const id = parseInt(url.split('/')[2]);
      mockPayments = mockPayments.filter(p => p.id !== id);
      return { data: { success: true } };
    }

    if (url.startsWith('/complaints/')) {
      const id = parseInt(url.split('/')[2]);
      mockComplaints = mockComplaints.filter(c => c.id !== id);
      return { data: { success: true } };
    }

    throw new Error(`Unhandled DELETE request: ${url}`);
  }
};