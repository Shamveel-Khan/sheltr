import os
import uuid
from datetime import datetime
from functools import wraps

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from db import fetch_all, fetch_one, execute, RECENT_SQL_LOGS

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("APP_SECRET", "dev-secret")
CORS(app)

serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])
TOKEN_MAX_AGE = int(os.getenv("TOKEN_MAX_AGE_SECONDS", "86400"))


@app.before_request
def init_request_log():
    g.request_id = str(uuid.uuid4())
    g.sql_log = []


@app.after_request
def persist_request_log(response):
    if getattr(g, "sql_log", None):
        for entry in g.sql_log:
            entry["request_id"] = g.request_id
            entry["path"] = request.path
            entry["method"] = request.method
            entry["ts"] = datetime.utcnow().isoformat() + "Z"
            RECENT_SQL_LOGS.append(entry)
    response.headers["X-Request-Id"] = g.request_id
    return response


def _token_for_user(user):
    payload = {
        "user_id": user["userid"],
        "username": user["username"],
        "full_name": user["fullname"],
        "role": user["role"],
    }
    return serializer.dumps(payload)


def _verify_token(token):
    return serializer.loads(token, max_age=TOKEN_MAX_AGE)


def _parse_iso_datetime(value):
    if not value:
        return None
    if len(value) == 16:
        value = value + ":00"
    return datetime.fromisoformat(value)


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Missing auth token"}), 401
        token = header.split(" ", 1)[1]
        try:
            g.user = _verify_token(token)
        except SignatureExpired:
            return jsonify({"error": "Token expired"}), 401
        except BadSignature:
            return jsonify({"error": "Invalid token"}), 401
        return fn(*args, **kwargs)

    wrapper.__name__ = fn.__name__
    return wrapper


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if g.user.get("role") not in roles:
                return jsonify({"error": "Access denied"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    user = fetch_one(
        "SELECT UserID, Username, FullName, Role, PasswordHash FROM Users WHERE Username = :username",
        {"username": data.get("username")},
    )
    if not user or user["passwordhash"] != data.get("password"):
        return jsonify({"error": "Invalid credentials"}), 401
    token = _token_for_user(user)
    return jsonify(
        {
            "token": token,
            "user": {
                "id": user["userid"],
                "full_name": user["fullname"],
                "username": user["username"],
                "role": user["role"],
            },
        }
    )


@app.route("/api/dashboard", methods=["GET"])
@auth_required
def dashboard():
    stats = fetch_one(
        "SELECT "
        "(SELECT COUNT(*) FROM Students) AS total_students, "
        "(SELECT COUNT(*) FROM Rooms) AS total_rooms, "
        "(SELECT COUNT(*) FROM Rooms r WHERE (SELECT COUNT(*) FROM RoomAllocation ra WHERE ra.RoomID = r.RoomID) > 0) AS occupied_rooms, "
        "(SELECT COUNT(*) FROM Rooms r WHERE r.Capacity > (SELECT COUNT(*) FROM RoomAllocation ra WHERE ra.RoomID = r.RoomID)) AS available_rooms, "
        "(SELECT COALESCE(SUM(Amount), 0) FROM Payments) AS total_payments, "
        "(SELECT COUNT(*) FROM Complaints WHERE Status = 'Pending') AS pending_complaints "
        "FROM dual"
    )
    recent_students = fetch_all(
        "SELECT * FROM ("
        "SELECT s.StudentID AS id, s.StudentCode AS student_id, s.Name AS name, s.Department AS department, r.RoomNumber AS room_number "
        "FROM Students s "
        "LEFT JOIN RoomAllocation ra ON s.StudentID = ra.StudentID "
        "LEFT JOIN Rooms r ON ra.RoomID = r.RoomID "
        "ORDER BY s.CreatedAt DESC"
        ") WHERE ROWNUM <= 5"
    )
    revenue_series = fetch_all(
        "SELECT TO_CHAR(PaymentCreatedAt, 'YYYY-MM-DD HH24:MI:SS.FF3') AS day, SUM(Amount) AS total "
        "FROM Payments "
        "GROUP BY TO_CHAR(PaymentCreatedAt, 'YYYY-MM-DD HH24:MI:SS.FF3') "
        "ORDER BY TO_CHAR(PaymentCreatedAt, 'YYYY-MM-DD HH24:MI:SS.FF3')"
    )
    stats["recent_students"] = recent_students
    stats["revenue_series"] = revenue_series
    return jsonify(stats)


@app.route("/api/students", methods=["GET"])
@auth_required
def list_students():
    search = request.args.get("search")
    dept = request.args.get("department")
    sql = (
        "SELECT s.StudentID AS id, s.StudentCode AS student_id, s.Name AS name, s.Email AS email, "
        "s.Phone AS phone, s.Department AS department, r.RoomNumber AS room_number, "
        "COALESCE(SUM(p.Amount), 0) AS total_paid "
        "FROM Students s "
        "LEFT JOIN RoomAllocation ra ON s.StudentID = ra.StudentID "
        "LEFT JOIN Rooms r ON ra.RoomID = r.RoomID "
        "LEFT JOIN Payments p ON s.StudentID = p.StudentID "
        "WHERE (:search IS NULL OR LOWER(s.Name) LIKE '%' || :search || '%' OR LOWER(s.StudentCode) LIKE '%' || :search || '%') "
        "AND (:dept IS NULL OR s.Department = :dept) "
        "GROUP BY s.StudentID, s.StudentCode, s.Name, s.Email, s.Phone, s.Department, r.RoomNumber "
        "ORDER BY s.StudentID"
    )
    params = {
        "search": search.lower() if search else None,
        "dept": dept or None,
    }
    return jsonify(fetch_all(sql, params))


@app.route("/api/departments", methods=["GET"])
@auth_required
def list_departments():
    rows = fetch_all(
        "SELECT DISTINCT Department AS dept FROM Students ORDER BY Department"
    )
    return jsonify([r["dept"] for r in rows])


@app.route("/api/students", methods=["POST"])
@auth_required
def add_student():
    data = request.get_json(silent=True) or {}
    execute(
        "INSERT INTO Students (StudentCode, Name, Email, Phone, Department, CreatedAt) "
        "VALUES (:student_id, :name, :email, :phone, :department, SYSTIMESTAMP)",
        {
            "student_id": data.get("student_id"),
            "name": data.get("name"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "department": data.get("department"),
        },
    )
    return jsonify({"success": True})


@app.route("/api/students/<int:sid>", methods=["PUT"])
@auth_required
def update_student(sid):
    data = request.get_json(silent=True) or {}
    execute(
        "UPDATE Students SET Name=:name, Email=:email, Phone=:phone, Department=:department WHERE StudentID=:sid",
        {
            "name": data.get("name"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "department": data.get("department"),
            "sid": sid,
        },
    )
    return jsonify({"success": True})


@app.route("/api/students/<int:sid>", methods=["DELETE"])
@auth_required
def delete_student(sid):
    allocation = fetch_one(
        "SELECT COUNT(*) AS c FROM RoomAllocation WHERE StudentID=:sid", {"sid": sid}
    )
    if allocation and allocation["c"] > 0:
        return (
            jsonify({"error": "Cannot delete student with active room allocation"}),
            400,
        )
    execute("DELETE FROM Students WHERE StudentID=:sid", {"sid": sid})
    return jsonify({"success": True})


@app.route("/api/rooms", methods=["GET"])
@auth_required
def list_rooms():
    sql = (
        "SELECT r.RoomID AS id, r.RoomNumber AS room_number, r.Capacity AS capacity, r.RoomType AS room_type, "
        "COUNT(ra.StudentID) AS occupied, (r.Capacity - COUNT(ra.StudentID)) AS available "
        "FROM Rooms r LEFT JOIN RoomAllocation ra ON r.RoomID = ra.RoomID "
        "GROUP BY r.RoomID, r.RoomNumber, r.Capacity, r.RoomType "
        "ORDER BY r.RoomNumber"
    )
    return jsonify(fetch_all(sql))


@app.route("/api/rooms", methods=["POST"])
@auth_required
def add_room():
    data = request.get_json(silent=True) or {}
    execute(
        "INSERT INTO Rooms (RoomNumber, Capacity, RoomType) VALUES (:room_number, :capacity, :room_type)",
        {
            "room_number": data.get("room_number"),
            "capacity": data.get("capacity"),
            "room_type": data.get("room_type"),
        },
    )
    return jsonify({"success": True})


@app.route("/api/rooms/<int:rid>", methods=["DELETE"])
@auth_required
def delete_room(rid):
    allocation = fetch_one(
        "SELECT COUNT(*) AS c FROM RoomAllocation WHERE RoomID=:rid", {"rid": rid}
    )
    if allocation and allocation["c"] > 0:
        return jsonify({"error": "Cannot delete room with active allocations"}), 400
    execute("DELETE FROM Rooms WHERE RoomID=:rid", {"rid": rid})
    return jsonify({"success": True})


@app.route("/api/allocations", methods=["GET"])
@auth_required
def list_allocations():
    sql = (
        "SELECT ra.AllocationID AS id, s.StudentID AS student_db_id, s.StudentCode AS student_id, "
        "s.Name AS student_name, s.Department AS department, r.RoomID AS room_id, r.RoomNumber AS room_number, "
        "r.RoomType AS room_type, ra.AllocationDate AS allocated_at "
        "FROM RoomAllocation ra "
        "JOIN Students s ON ra.StudentID = s.StudentID "
        "JOIN Rooms r ON ra.RoomID = r.RoomID "
        "ORDER BY ra.AllocationDate DESC"
    )
    return jsonify(fetch_all(sql))


@app.route("/api/allocations", methods=["POST"])
@auth_required
def add_allocation():
    data = request.get_json(silent=True) or {}
    room = fetch_one(
        "SELECT Capacity FROM Rooms WHERE RoomID=:rid", {"rid": data.get("room_id")}
    )
    occupied = fetch_one(
        "SELECT COUNT(*) AS c FROM RoomAllocation WHERE RoomID=:rid",
        {"rid": data.get("room_id")},
    )
    if not room:
        return jsonify({"error": "Invalid room"}), 400
    if occupied and occupied["c"] >= room["capacity"]:
        return jsonify({"error": "Room is full"}), 400
    execute(
        "INSERT INTO RoomAllocation (StudentID, RoomID, AllocationDate) VALUES (:sid, :rid, SYSTIMESTAMP)",
        {"sid": data.get("student_id"), "rid": data.get("room_id")},
    )
    return jsonify({"success": True})


@app.route("/api/allocations/<int:aid>", methods=["DELETE"])
@auth_required
def delete_allocation(aid):
    execute("DELETE FROM RoomAllocation WHERE AllocationID=:aid", {"aid": aid})
    return jsonify({"success": True})


@app.route("/api/payments", methods=["GET"])
@auth_required
def list_payments():
    sql = (
        "SELECT p.PaymentID AS id, s.StudentID AS student_id, s.Name AS student_name, s.StudentCode AS student_code, "
        "p.Amount AS amount, TO_CHAR(p.PaymentDate, 'YYYY-MM-DD') AS payment_date, p.Status AS status, p.Note AS note "
        "FROM Payments p JOIN Students s ON p.StudentID = s.StudentID "
        "ORDER BY p.PaymentDate DESC"
    )
    return jsonify(fetch_all(sql))


@app.route("/api/payments", methods=["POST"])
@auth_required
def add_payment():
    data = request.get_json(silent=True) or {}
    payment_date = data.get("payment_date") or datetime.utcnow().strftime("%Y-%m-%d")
    execute(
        "INSERT INTO Payments (StudentID, Amount, PaymentDate, PaymentCreatedAt, Status, Note) "
        "VALUES (:student_id, :amount, TO_DATE(:payment_date, 'YYYY-MM-DD'), SYSTIMESTAMP, :status, :note)",
        {
            "student_id": data.get("student_id"),
            "amount": data.get("amount"),
            "payment_date": payment_date,
            "status": data.get("status", "Paid"),
            "note": data.get("note"),
        },
    )
    return jsonify({"success": True})


@app.route("/api/payments/<int:pid>", methods=["DELETE"])
@auth_required
def delete_payment(pid):
    execute("DELETE FROM Payments WHERE PaymentID=:pid", {"pid": pid})
    return jsonify({"success": True})


@app.route("/api/complaints", methods=["GET"])
@auth_required
def list_complaints():
    sql = (
        "SELECT c.ComplaintID AS id, s.StudentID AS student_id, s.Name AS student_name, s.StudentCode AS student_code, "
        "c.Description AS description, c.Status AS status, c.CreatedAt AS created_at "
        "FROM Complaints c JOIN Students s ON c.StudentID = s.StudentID "
        "ORDER BY c.CreatedAt DESC"
    )
    return jsonify(fetch_all(sql))


@app.route("/api/complaints", methods=["POST"])
@auth_required
def add_complaint():
    data = request.get_json(silent=True) or {}
    execute(
        "INSERT INTO Complaints (StudentID, Description, Status, CreatedAt) "
        "VALUES (:student_id, :description, 'Pending', SYSTIMESTAMP)",
        {"student_id": data.get("student_id"), "description": data.get("description")},
    )
    return jsonify({"success": True})


@app.route("/api/complaints/<int:cid>", methods=["PUT"])
@auth_required
def update_complaint(cid):
    data = request.get_json(silent=True) or {}
    execute(
        "UPDATE Complaints SET Status=:status WHERE ComplaintID=:cid",
        {"status": data.get("status"), "cid": cid},
    )
    return jsonify({"success": True})


@app.route("/api/complaints/<int:cid>", methods=["DELETE"])
@auth_required
def delete_complaint(cid):
    execute("DELETE FROM Complaints WHERE ComplaintID=:cid", {"cid": cid})
    return jsonify({"success": True})


@app.route("/api/visitors", methods=["GET"])
@auth_required
def list_visitors():
    sql = (
        "SELECT v.VisitorID AS id, s.StudentID AS student_id, s.Name AS student_name, s.StudentCode AS student_code, "
        "v.VisitorName AS visitor_name, v.EntryTime AS entry_time, v.ExitTime AS exit_time "
        "FROM Visitors v JOIN Students s ON v.StudentID = s.StudentID "
        "ORDER BY v.EntryTime DESC"
    )
    return jsonify(fetch_all(sql))


@app.route("/api/visitors", methods=["POST"])
@auth_required
def add_visitor():
    data = request.get_json(silent=True) or {}
    entry_time = _parse_iso_datetime(data.get("entry_time")) or datetime.utcnow()
    execute(
        "INSERT INTO Visitors (StudentID, VisitorName, EntryTime, ExitTime) "
        "VALUES (:student_id, :visitor_name, :entry_time, NULL)",
        {
            "student_id": data.get("student_id"),
            "visitor_name": data.get("visitor_name"),
            "entry_time": entry_time,
        },
    )
    return jsonify({"success": True})


@app.route("/api/visitors/<int:vid>", methods=["PUT"])
@auth_required
def update_visitor(vid):
    data = request.get_json(silent=True) or {}
    exit_time = _parse_iso_datetime(data.get("exit_time")) or datetime.utcnow()
    execute(
        "UPDATE Visitors SET ExitTime = :exit_time WHERE VisitorID=:vid",
        {"exit_time": exit_time, "vid": vid},
    )
    return jsonify({"success": True})


@app.route("/api/reports/rooms-occupancy", methods=["GET"])
@auth_required
def report_rooms():
    sql = (
        "SELECT r.RoomNumber AS room_number, r.RoomType AS room_type, r.Capacity AS capacity, "
        "COUNT(ra.StudentID) AS occupied, (r.Capacity - COUNT(ra.StudentID)) AS available "
        "FROM Rooms r LEFT JOIN RoomAllocation ra ON r.RoomID = ra.RoomID "
        "GROUP BY r.RoomNumber, r.RoomType, r.Capacity "
        "ORDER BY r.RoomNumber"
    )
    return jsonify(fetch_all(sql))


@app.route("/api/reports/unpaid-fees", methods=["GET"])
@auth_required
def report_unpaid():
    sql = (
        "SELECT s.StudentID AS id, s.StudentCode AS student_id, s.Name AS name, s.Department AS department "
        "FROM Students s "
        "LEFT JOIN Payments p ON s.StudentID = p.StudentID "
        "GROUP BY s.StudentID, s.StudentCode, s.Name, s.Department "
        "HAVING COALESCE(SUM(p.Amount), 0) = 0"
    )
    return jsonify(fetch_all(sql))


@app.route("/api/reports/complaints-status", methods=["GET"])
@auth_required
def report_complaints():
    sql = (
        "SELECT Status AS status, COUNT(*) AS count " "FROM Complaints GROUP BY Status"
    )
    return jsonify(fetch_all(sql))


@app.route("/api/admin/sql-logs", methods=["GET"])
@auth_required
@role_required("admin")
def sql_logs():
    limit = int(request.args.get("limit", "100"))
    logs = list(RECENT_SQL_LOGS)[-limit:]
    return jsonify(logs)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
