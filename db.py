"""SQLite database layer for the Flashcard app."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "flashcards.db"


def get_db() -> sqlite3.Connection:
    """Return a connection with WAL mode, foreign keys, and Row factory."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS decks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cards (
            id TEXT PRIMARY KEY,
            deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            ease REAL NOT NULL DEFAULT 2.5,
            interval INTEGER NOT NULL DEFAULT 1,
            reps INTEGER NOT NULL DEFAULT 0,
            lapses INTEGER NOT NULL DEFAULT 0,
            grade INTEGER,
            due_date TEXT,
            last_reviewed TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS review_stats (
            day TEXT PRIMARY KEY,
            reviews INTEGER NOT NULL DEFAULT 0,
            correct INTEGER NOT NULL DEFAULT 0,
            lapses INTEGER NOT NULL DEFAULT 0,
            all_due_completed INTEGER
        );

        CREATE TABLE IF NOT EXISTS irregular_verbs (
            infinitive TEXT PRIMARY KEY,
            simple_past TEXT NOT NULL,
            past_participle TEXT NOT NULL,
            translation_ru TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS verbs_governance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            infinitive TEXT NOT NULL,
            particle TEXT,
            preposition TEXT,
            full_expression TEXT NOT NULL,
            translation TEXT NOT NULL,
            type TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
        CREATE INDEX IF NOT EXISTS idx_review_stats_day ON review_stats(day);
        CREATE INDEX IF NOT EXISTS idx_irregular_verbs_infinitive ON irregular_verbs(infinitive);
        CREATE INDEX IF NOT EXISTS idx_verbs_governance_infinitive ON verbs_governance(infinitive);
        CREATE INDEX IF NOT EXISTS idx_verbs_governance_full_expression ON verbs_governance(full_expression);
    """)
    conn.commit()
    conn.close()
