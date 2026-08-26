import os
import sqlite3
from pathlib import Path

from utils.files import DATA_DIR, ensure_data_dirs

DB_PATH = Path(os.getenv("CBT_FORGE_DB", str(DATA_DIR / "cbt_forge.sqlite")))

SCHEMA = """
CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    marking TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    section_id TEXT,
    question_number INTEGER,
    question_type TEXT,
    payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    option_id TEXT NOT NULL,
    text TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS question_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    path TEXT NOT NULL,
    image_type TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS test_configurations (
    test_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    status TEXT NOT NULL,
    current_section TEXT,
    current_question TEXT,
    remaining_time_seconds INTEGER NOT NULL DEFAULT 0,
    configuration_snapshot TEXT NOT NULL,
    question_snapshot TEXT NOT NULL,
    section_timers TEXT NOT NULL DEFAULT '{}',
    submission_reason TEXT,
    last_synced TEXT
);

CREATE TABLE IF NOT EXISTS responses (
    attempt_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_answers TEXT NOT NULL DEFAULT '[]',
    numeric_value TEXT,
    text_answer TEXT,
    visited INTEGER NOT NULL DEFAULT 0,
    marked_for_review INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL,
    PRIMARY KEY (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS attempt_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS results (
    attempt_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_analyses (
    attempt_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_test ON attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON attempts(status);
CREATE INDEX IF NOT EXISTS idx_events_attempt ON attempt_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_questions_test ON questions(test_id);
"""


def get_connection() -> sqlite3.Connection:
    ensure_data_dirs()
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(SCHEMA)
        # Existing local installations keep their response history. Add the
        # typed-response columns in place when upgrading from choice-only CBT.
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(responses)")}
        if "numeric_value" not in columns:
            connection.execute("ALTER TABLE responses ADD COLUMN numeric_value TEXT")
        if "text_answer" not in columns:
            connection.execute("ALTER TABLE responses ADD COLUMN text_answer TEXT")
        connection.commit()
