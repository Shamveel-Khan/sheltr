# Backend (Flask + Oracle)

## Setup

1. Create a Python env and install dependencies:
    - `pip install -r requirements.txt`
2. Copy `.env.example` to `.env` and fill Oracle credentials.
3. Create schema and seed data using `sql/schema.sql` and `sql/seed.sql`.
4. Run the API: `python app.py`

## API

Base URL: `https://florinda-histoid-hermila.ngrok-free.dev/api`

Protected endpoints require `Authorization: Bearer <token>`.

## SQL Logs

Admin-only endpoint: `GET /api/admin/sql-logs?limit=100`

Returns recent queries with params and duration.
