from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import mysql.connector
from mysql.connector import Error
from functools import wraps
from datetime import date
import os

app = Flask(__name__)
app.secret_key = 'hostel_secret_key_2026'

# ──────────────────────────────────────────────
# DB CONNECTION
# ──────────────────────────────────────────────
DB_CONFIG = {
    'host':     'localhost',
    'user':     'root',
    'password': '',          # change as needed
    'database': 'SmartHostelDB'
}

def get_db():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"DB Error: {e}")
        return None

def query_db(sql, args=(), one=False, commit=False):
    conn = get_db()
    if not conn:
        return None
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, args)
        if commit:
            conn.commit()
            return cur.rowcount
        rv = cur.fetchall()
        return (rv[0] if rv else None) if one else rv
    except Error as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()

# ──────────────────────────────────────────────
# AUTH HELPERS
# ──────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in first.', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if session.get('role') not in roles:
                flash('Access denied.', 'error')
                return redirect(url_for('dashboard'))
            return f(*args, **kwargs)
        return decorated
    return decorator

# ──────────────────────────────────────────────
# AUTH ROUTES
# ──────────────────────────────────────────────
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = query_db(
            "SELECT * FROM Users WHERE Username=%s AND PasswordHash=%s",
            (username, password), one=True
        )
        if user:
            session['user_id'] = user['UserID']
            session['username'] = user['Username']
            session['role'] = user['Role']
            session['ref_id'] = user['RefID']
            flash(f"Welcome, {user['Username']}!", 'success')
            return redirect(url_for('dashboard'))
        flash('Invalid credentials.', 'error')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out successfully.', 'success')
    return redirect(url_for('login'))

# ──────────────────────────────────────────────
# DASHBOARD
# ──────────────────────────────────────────────
@app.route('/dashboard')
@login_required
def dashboard():
    stats = {
        'total_students':  query_db("SELECT COUNT(*) AS c FROM Students", one=True)['c'],
        'total_rooms':     query_db("SELECT COUNT(*) AS c FROM Rooms", one=True)['c'],
        'unpaid_count':    query_db(
            "SELECT COUNT(*) AS c FROM Students s LEFT JOIN Payments p ON s.StudentID=p.StudentID WHERE p.StudentID IS NULL",
            one=True)['c'],
        'pending_complaints': query_db(
            "SELECT COUNT(*) AS c FROM Complaints WHERE Status='Pending'", one=True)['c'],
        'active_visitors': query_db(
            "SELECT COUNT(*) AS c FROM Visitors WHERE ExitTime IS NULL", one=True)['c'],
        'total_revenue':   query_db("SELECT COALESCE(SUM(Amount),0) AS c FROM Payments", one=True)['c'],
    }
    recent_complaints = query_db(
        "SELECT c.ComplaintID, s.Name AS StudentName, c.Description, c.Status, c.SubmittedDate "
        "FROM Complaints c JOIN Students s ON c.StudentID=s.StudentID "
        "ORDER BY c.SubmittedDate DESC LIMIT 5"
    )
    return render_template('dashboard.html', stats=stats, recent_complaints=recent_complaints)

# ──────────────────────────────────────────────
# STUDENTS
# ──────────────────────────────────────────────
@app.route('/students')
@login_required
def students():
    all_students = query_db(
        "SELECT s.*, r.RoomNumber, "
        "CASE WHEN p.StudentID IS NOT NULL THEN 'Paid' ELSE 'Unpaid' END AS FeeStatus "
        "FROM Students s "
        "LEFT JOIN RoomAllocation ra ON s.StudentID=ra.StudentID "
        "LEFT JOIN Rooms r ON ra.RoomID=r.RoomID "
        "LEFT JOIN Payments p ON s.StudentID=p.StudentID "
        "ORDER BY s.StudentID"
    )
    return render_template('students.html', students=all_students)

@app.route('/students/add', methods=['GET', 'POST'])
@login_required
@role_required('Administrator', 'Hostel Staff')
def add_student():
    if request.method == 'POST':
        name  = request.form['name']
        email = request.form['email']
        phone = request.form['phone']
        dept  = request.form['department']
        try:
            query_db(
                "INSERT INTO Students (Name,Email,Phone,Department) VALUES (%s,%s,%s,%s)",
                (name, email, phone, dept), commit=True
            )
            flash('Student added successfully!', 'success')
            return redirect(url_for('students'))
        except Error as e:
            flash(f'Error: {e}', 'error')
    return render_template('student_form.html', student=None)

@app.route('/students/edit/<int:sid>', methods=['GET', 'POST'])
@login_required
@role_required('Administrator', 'Hostel Staff')
def edit_student(sid):
    student = query_db("SELECT * FROM Students WHERE StudentID=%s", (sid,), one=True)
    if not student:
        flash('Student not found.', 'error')
        return redirect(url_for('students'))
    if request.method == 'POST':
        query_db(
            "UPDATE Students SET Name=%s,Email=%s,Phone=%s,Department=%s WHERE StudentID=%s",
            (request.form['name'], request.form['email'],
             request.form['phone'], request.form['department'], sid), commit=True
        )
        flash('Student updated.', 'success')
        return redirect(url_for('students'))
    return render_template('student_form.html', student=student)

@app.route('/students/delete/<int:sid>', methods=['POST'])
@login_required
@role_required('Administrator')
def delete_student(sid):
    query_db("DELETE FROM Students WHERE StudentID=%s", (sid,), commit=True)
    flash('Student deleted.', 'success')
    return redirect(url_for('students'))

# ──────────────────────────────────────────────
# ROOMS
# ──────────────────────────────────────────────
@app.route('/rooms')
@login_required
def rooms():
    all_rooms = query_db(
        "SELECT r.*, COUNT(ra.StudentID) AS Occupied, "
        "(r.Capacity - COUNT(ra.StudentID)) AS Available "
        "FROM Rooms r LEFT JOIN RoomAllocation ra ON r.RoomID=ra.RoomID "
        "GROUP BY r.RoomID ORDER BY r.RoomNumber"
    )
    return render_template('rooms.html', rooms=all_rooms)

@app.route('/rooms/add', methods=['GET', 'POST'])
@login_required
@role_required('Administrator')
def add_room():
    if request.method == 'POST':
        try:
            query_db(
                "INSERT INTO Rooms (RoomNumber,Capacity) VALUES (%s,%s)",
                (request.form['room_number'], request.form['capacity']), commit=True
            )
            flash('Room added!', 'success')
            return redirect(url_for('rooms'))
        except Error as e:
            flash(f'Error: {e}', 'error')
    return render_template('room_form.html', room=None)

@app.route('/rooms/allocate', methods=['GET', 'POST'])
@login_required
@role_required('Administrator')
def allocate_room():
    if request.method == 'POST':
        sid = request.form['student_id']
        rid = request.form['room_id']
        # check capacity
        room = query_db("SELECT * FROM Rooms WHERE RoomID=%s", (rid,), one=True)
        occupied = query_db(
            "SELECT COUNT(*) AS c FROM RoomAllocation WHERE RoomID=%s", (rid,), one=True
        )['c']
        if occupied >= room['Capacity']:
            flash('Room is fully occupied!', 'error')
        else:
            try:
                query_db(
                    "INSERT INTO RoomAllocation (StudentID,RoomID,AllocationDate) VALUES (%s,%s,%s)",
                    (sid, rid, date.today()), commit=True
                )
                flash('Room allocated successfully!', 'success')
                return redirect(url_for('rooms'))
            except Error as e:
                flash(f'Error: {e}', 'error')

    unallocated = query_db(
        "SELECT * FROM Students WHERE StudentID NOT IN (SELECT StudentID FROM RoomAllocation)"
    )
    available_rooms = query_db(
        "SELECT r.*, COUNT(ra.StudentID) AS Occupied "
        "FROM Rooms r LEFT JOIN RoomAllocation ra ON r.RoomID=ra.RoomID "
        "GROUP BY r.RoomID HAVING COUNT(ra.StudentID) < r.Capacity"
    )
    return render_template('allocate_room.html',
                           unallocated=unallocated, available_rooms=available_rooms)

# ──────────────────────────────────────────────
# PAYMENTS
# ──────────────────────────────────────────────
@app.route('/payments')
@login_required
def payments():
    all_payments = query_db(
        "SELECT p.*, s.Name AS StudentName FROM Payments p "
        "JOIN Students s ON p.StudentID=s.StudentID ORDER BY p.PaymentDate DESC"
    )
    return render_template('payments.html', payments=all_payments)

@app.route('/payments/add', methods=['GET', 'POST'])
@login_required
@role_required('Administrator', 'Hostel Staff')
def add_payment():
    if request.method == 'POST':
        try:
            query_db(
                "INSERT INTO Payments (StudentID,Amount,PaymentDate) VALUES (%s,%s,%s)",
                (request.form['student_id'], request.form['amount'], date.today()), commit=True
            )
            flash('Payment recorded!', 'success')
            return redirect(url_for('payments'))
        except Error as e:
            flash(f'Error: {e}', 'error')
    students_list = query_db("SELECT StudentID,Name FROM Students ORDER BY Name")
    return render_template('payment_form.html', students=students_list)

# ──────────────────────────────────────────────
# COMPLAINTS
# ──────────────────────────────────────────────
@app.route('/complaints')
@login_required
def complaints():
    all_complaints = query_db(
        "SELECT c.*, s.Name AS StudentName FROM Complaints c "
        "JOIN Students s ON c.StudentID=s.StudentID ORDER BY c.SubmittedDate DESC"
    )
    return render_template('complaints.html', complaints=all_complaints)

@app.route('/complaints/add', methods=['GET', 'POST'])
@login_required
def add_complaint():
    if request.method == 'POST':
        sid  = request.form.get('student_id') or session.get('ref_id')
        desc = request.form['description']
        query_db(
            "INSERT INTO Complaints (StudentID,Description,Status,SubmittedDate) VALUES (%s,%s,'Pending',%s)",
            (sid, desc, date.today()), commit=True
        )
        flash('Complaint submitted!', 'success')
        return redirect(url_for('complaints'))
    students_list = query_db("SELECT StudentID,Name FROM Students ORDER BY Name")
    return render_template('complaint_form.html', students=students_list)

@app.route('/complaints/resolve/<int:cid>', methods=['POST'])
@login_required
@role_required('Administrator', 'Hostel Staff')
def resolve_complaint(cid):
    query_db("UPDATE Complaints SET Status='Resolved' WHERE ComplaintID=%s", (cid,), commit=True)
    flash('Complaint resolved!', 'success')
    return redirect(url_for('complaints'))

# ──────────────────────────────────────────────
# VISITORS
# ──────────────────────────────────────────────
@app.route('/visitors')
@login_required
def visitors():
    all_visitors = query_db(
        "SELECT v.*, s.Name AS StudentName FROM Visitors v "
        "JOIN Students s ON v.StudentID=s.StudentID ORDER BY v.EntryTime DESC"
    )
    return render_template('visitors.html', visitors=all_visitors)

@app.route('/visitors/add', methods=['GET', 'POST'])
@login_required
@role_required('Administrator', 'Hostel Staff')
def add_visitor():
    if request.method == 'POST':
        query_db(
            "INSERT INTO Visitors (StudentID,VisitorName,EntryTime) VALUES (%s,%s,NOW())",
            (request.form['student_id'], request.form['visitor_name']), commit=True
        )
        flash('Visitor entry recorded!', 'success')
        return redirect(url_for('visitors'))
    students_list = query_db("SELECT StudentID,Name FROM Students ORDER BY Name")
    return render_template('visitor_form.html', students=students_list)

@app.route('/visitors/exit/<int:vid>', methods=['POST'])
@login_required
@role_required('Administrator', 'Hostel Staff')
def visitor_exit(vid):
    query_db("UPDATE Visitors SET ExitTime=NOW() WHERE VisitorID=%s AND ExitTime IS NULL",
             (vid,), commit=True)
    flash('Visitor exit recorded.', 'success')
    return redirect(url_for('visitors'))

# ──────────────────────────────────────────────
# REPORTS
# ──────────────────────────────────────────────
@app.route('/reports')
@login_required
@role_required('Administrator')
def reports():
    room_report = query_db(
        "SELECT r.RoomNumber, r.Capacity, COUNT(ra.StudentID) AS Occupied, "
        "(r.Capacity - COUNT(ra.StudentID)) AS Available "
        "FROM Rooms r LEFT JOIN RoomAllocation ra ON r.RoomID=ra.RoomID "
        "GROUP BY r.RoomID ORDER BY r.RoomNumber"
    )
    unpaid_report = query_db(
        "SELECT s.StudentID, s.Name, s.Department, r.RoomNumber "
        "FROM Students s "
        "LEFT JOIN Payments p ON s.StudentID=p.StudentID "
        "LEFT JOIN RoomAllocation ra ON s.StudentID=ra.StudentID "
        "LEFT JOIN Rooms r ON ra.RoomID=r.RoomID "
        "WHERE p.StudentID IS NULL"
    )
    complaint_report = query_db(
        "SELECT c.Status, COUNT(*) AS Total FROM Complaints GROUP BY c.Status"
    )
    revenue_report = query_db(
        "SELECT DATE_FORMAT(PaymentDate,'%Y-%m') AS Month, "
        "COUNT(*) AS TotalPayments, SUM(Amount) AS Revenue "
        "FROM Payments GROUP BY DATE_FORMAT(PaymentDate,'%Y-%m') ORDER BY Month"
    )
    return render_template('reports.html',
                           room_report=room_report,
                           unpaid_report=unpaid_report,
                           complaint_report=complaint_report,
                           revenue_report=revenue_report)

# ──────────────────────────────────────────────
# SEED DEMO DATA (run once)
# ──────────────────────────────────────────────
@app.route('/seed')
def seed():
    sqls = [
        "CREATE TABLE IF NOT EXISTS Students (StudentID INT PRIMARY KEY AUTO_INCREMENT, Name VARCHAR(100) NOT NULL, Email VARCHAR(100) UNIQUE NOT NULL, Phone VARCHAR(15) NOT NULL, Department VARCHAR(50) NOT NULL)",
        "CREATE TABLE IF NOT EXISTS Rooms (RoomID INT PRIMARY KEY AUTO_INCREMENT, RoomNumber INT NOT NULL UNIQUE, Capacity INT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS RoomAllocation (AllocationID INT PRIMARY KEY AUTO_INCREMENT, StudentID INT NOT NULL UNIQUE, RoomID INT NOT NULL, AllocationDate DATE NOT NULL, FOREIGN KEY (StudentID) REFERENCES Students(StudentID) ON DELETE CASCADE, FOREIGN KEY (RoomID) REFERENCES Rooms(RoomID))",
        "CREATE TABLE IF NOT EXISTS Payments (PaymentID INT PRIMARY KEY AUTO_INCREMENT, StudentID INT NOT NULL, Amount DECIMAL(10,2) NOT NULL, PaymentDate DATE NOT NULL, FOREIGN KEY (StudentID) REFERENCES Students(StudentID) ON DELETE CASCADE)",
        "CREATE TABLE IF NOT EXISTS Complaints (ComplaintID INT PRIMARY KEY AUTO_INCREMENT, StudentID INT NOT NULL, Description TEXT NOT NULL, Status ENUM('Pending','Resolved') NOT NULL DEFAULT 'Pending', SubmittedDate DATE NOT NULL, FOREIGN KEY (StudentID) REFERENCES Students(StudentID) ON DELETE CASCADE)",
        "CREATE TABLE IF NOT EXISTS Visitors (VisitorID INT PRIMARY KEY AUTO_INCREMENT, StudentID INT NOT NULL, VisitorName VARCHAR(100) NOT NULL, EntryTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, ExitTime DATETIME, FOREIGN KEY (StudentID) REFERENCES Students(StudentID) ON DELETE CASCADE)",
        "CREATE TABLE IF NOT EXISTS Users (UserID INT PRIMARY KEY AUTO_INCREMENT, Username VARCHAR(50) UNIQUE NOT NULL, PasswordHash VARCHAR(255) NOT NULL, Role ENUM('Administrator','Hostel Staff','Student') NOT NULL, RefID INT NOT NULL)",
        "INSERT IGNORE INTO Rooms (RoomNumber,Capacity) VALUES (101,2),(102,3),(103,2),(104,4),(105,2)",
        "INSERT IGNORE INTO Students (Name,Email,Phone,Department) VALUES ('Ali Khan','ali@student.com','0311-1111111','CS'),('Sara Ahmed','sara@student.com','0311-2222222','EE'),('Omar Farooq','omar@student.com','0311-3333333','CS'),('Zara Malik','zara@student.com','0311-4444444','BBA'),('Hamza Siddiqui','hamza@student.com','0311-5555555','ME'),('Nadia Shah','nadia@student.com','0311-6666666','CS')",
        "INSERT IGNORE INTO RoomAllocation (StudentID,RoomID,AllocationDate) VALUES (1,1,'2026-01-01'),(2,1,'2026-01-01'),(3,2,'2026-01-02'),(4,2,'2026-01-02'),(5,3,'2026-01-03')",
        "INSERT IGNORE INTO Payments (StudentID,Amount,PaymentDate) VALUES (1,5000,'2026-02-01'),(2,5000,'2026-02-03'),(3,5000,'2026-02-05'),(4,5000,'2026-02-07'),(5,5000,'2026-02-10')",
        "INSERT IGNORE INTO Complaints (StudentID,Description,Status,SubmittedDate) VALUES (1,'Water leakage in bathroom','Resolved','2026-02-15'),(2,'No electricity in room 101','Pending','2026-03-01'),(3,'AC not working','Pending','2026-03-05')",
        "INSERT IGNORE INTO Visitors (StudentID,VisitorName,EntryTime,ExitTime) VALUES (1,'Ahmed Khan','2026-03-01 10:00:00','2026-03-01 12:00:00'),(2,'Fatima Noor','2026-03-02 14:00:00','2026-03-02 16:30:00'),(3,'Usman Ali','2026-03-05 09:00:00',NULL)",
        "INSERT IGNORE INTO Users (Username,PasswordHash,Role,RefID) VALUES ('admin','admin123','Administrator',1),('warden','staff123','Hostel Staff',2),('ali','student123','Student',1)",
    ]
    for sql in sqls:
        try:
            query_db(sql, commit=True)
        except:
            pass
    flash('Demo data seeded! Login: admin/admin123', 'success')
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)