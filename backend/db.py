import os
import time
from collections import deque
from datetime import date, datetime

import oracledb
from flask import g

SQL_LOG_LIMIT = int(os.getenv("SQL_LOG_LIMIT", "200"))
RECENT_SQL_LOGS = deque(maxlen=SQL_LOG_LIMIT)


def get_connection():
    client_dir = os.getenv("ORACLE_CLIENT_LIB_DIR")
    if client_dir:
        oracledb.init_oracle_client(lib_dir=client_dir)
    return oracledb.connect(
        user=os.getenv("ORACLE_USER"),
        password=os.getenv("ORACLE_PASSWORD"),
        dsn=os.getenv("ORACLE_DSN"),
    )


def _log_query(sql, params, duration_ms):
    safe_params = {}
    if isinstance(params, dict):
        for key, value in params.items():
            safe_params[key] = _serialize_value(value)
    else:
        safe_params = params
    entry = {
        "sql": sql,
        "params": safe_params,
        "duration_ms": round(duration_ms, 3),
    }
    if hasattr(g, "sql_log"):
        g.sql_log.append(entry)
    else:
        RECENT_SQL_LOGS.append(entry)


def _rows_to_dicts(cursor):
    columns = [d[0].lower() for d in cursor.description]
    rows = cursor.fetchall()
    return [dict(zip(columns, [_serialize_value(v) for v in row])) for row in rows]


def _serialize_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def fetch_all(sql, params=None):
    params = params or {}
    start = time.perf_counter()
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = _rows_to_dicts(cur)
    duration = (time.perf_counter() - start) * 1000
    _log_query(sql, params, duration)
    return rows


def fetch_one(sql, params=None):
    params = params or {}
    start = time.perf_counter()
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        row = cur.fetchone()
        if row is None:
            result = None
        else:
            columns = [d[0].lower() for d in cur.description]
            result = dict(zip(columns, [_serialize_value(v) for v in row]))
    duration = (time.perf_counter() - start) * 1000
    _log_query(sql, params, duration)
    return result


def execute(sql, params=None, commit=True):
    params = params or {}
    start = time.perf_counter()
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute(sql, params)
        rowcount = cur.rowcount
        if commit:
            conn.commit()
    duration = (time.perf_counter() - start) * 1000
    _log_query(sql, params, duration)
    return rowcount
