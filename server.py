"""Flashcard Web App — FastAPI server with SQLite API + static files."""

import json
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import uvicorn

from db import get_db, init_db

APP_DIR = Path(__file__).parent
PORT = 8081


# ── Pydantic models ─────────────────────────────────────────────────

class DeckIn(BaseModel):
    id: str
    name: str
    created_at: str | None = None

class CardIn(BaseModel):
    id: str
    deck_id: str
    front: str
    back: str
    ease: float = 2.5
    interval: int = 1
    reps: int = 0
    lapses: int = 0
    grade: int | None = None
    due_date: str | None = None
    last_reviewed: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

class ReviewStatsIn(BaseModel):
    day: str
    reviews: int | None = None
    correct: int | None = None
    lapses: int | None = None
    all_due_completed: bool | None = None
    increment: bool = False


# ── Seed helpers ─────────────────────────────────────────────────────

def seed_reference_data():
    """Seed irregular verbs and phrasal verbs from JSON files if tables empty."""
    conn = get_db()
    try:
        # Seed irregular verbs
        count = conn.execute("SELECT COUNT(*) FROM irregular_verbs").fetchone()[0]
        if count == 0:
            path = APP_DIR / "irregular_verbs"
            if path.exists():
                verbs = json.loads(path.read_text(encoding="utf-8"))
                conn.executemany(
                    "INSERT OR IGNORE INTO irregular_verbs (infinitive, simple_past, past_participle, translation_ru) VALUES (?, ?, ?, ?)",
                    [(v["infinitive"], v["simple_past"], v["past_participle"], v["translation_ru"]) for v in verbs],
                )
                conn.commit()
                print(f"Seeded {len(verbs)} irregular verbs")

        # Seed phrasal verbs
        count = conn.execute("SELECT COUNT(*) FROM verbs_governance").fetchone()[0]
        if count == 0:
            path = APP_DIR / "verb_governance"
            if path.exists():
                verbs = json.loads(path.read_text(encoding="utf-8"))
                conn.executemany(
                    "INSERT INTO verbs_governance (infinitive, particle, preposition, full_expression, translation, type) VALUES (?, ?, ?, ?, ?, ?)",
                    [(v["infinitive"], v.get("particle"), v.get("preposition"), v["full_expression"], v["translation"], v["type"]) for v in verbs],
                )
                conn.commit()
                print(f"Seeded {len(verbs)} phrasal verbs")
    finally:
        conn.close()


# ── Lifespan ─────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_reference_data()
    yield

app = FastAPI(title="Flashcard App", lifespan=lifespan)


# ── Helpers ──────────────────────────────────────────────────────────

def row_to_dict(row):
    """Convert a sqlite3.Row to a plain dict."""
    return dict(row) if row else None


# ── Deck endpoints ───────────────────────────────────────────────────

@app.get("/api/decks")
async def get_decks():
    conn = get_db()
    try:
        decks = [dict(r) for r in conn.execute("SELECT * FROM decks ORDER BY created_at").fetchall()]
        for deck in decks:
            cards = [dict(r) for r in conn.execute("SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at", (deck["id"],)).fetchall()]
            deck["cards"] = cards
        return decks
    finally:
        conn.close()


@app.post("/api/decks", status_code=201)
async def create_deck(deck: DeckIn):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO decks (id, name, created_at) VALUES (?, ?, ?)",
            (deck.id, deck.name, deck.created_at or datetime.utcnow().isoformat()),
        )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@app.put("/api/decks/{deck_id}")
async def update_deck(deck_id: str, deck: DeckIn):
    conn = get_db()
    try:
        conn.execute("UPDATE decks SET name = ? WHERE id = ?", (deck.name, deck_id))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@app.delete("/api/decks/{deck_id}")
async def delete_deck(deck_id: str):
    conn = get_db()
    try:
        conn.execute("DELETE FROM decks WHERE id = ?", (deck_id,))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ── Card endpoints ───────────────────────────────────────────────────

@app.post("/api/cards", status_code=201)
async def create_card(card: CardIn):
    now = datetime.utcnow().isoformat()
    conn = get_db()
    try:
        conn.execute(
            """INSERT OR REPLACE INTO cards
               (id, deck_id, front, back, ease, interval, reps, lapses, grade, due_date, last_reviewed, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (card.id, card.deck_id, card.front, card.back, card.ease, card.interval,
             card.reps, card.lapses, card.grade, card.due_date, card.last_reviewed,
             card.created_at or now, card.updated_at or now),
        )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@app.put("/api/cards/{card_id}")
async def update_card(card_id: str, card: CardIn):
    now = datetime.utcnow().isoformat()
    conn = get_db()
    try:
        conn.execute(
            """UPDATE cards SET deck_id=?, front=?, back=?, ease=?, interval=?, reps=?, lapses=?,
               grade=?, due_date=?, last_reviewed=?, updated_at=?
               WHERE id=?""",
            (card.deck_id, card.front, card.back, card.ease, card.interval,
             card.reps, card.lapses, card.grade, card.due_date, card.last_reviewed,
             card.updated_at or now, card_id),
        )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@app.delete("/api/cards/{card_id}")
async def delete_card(card_id: str):
    conn = get_db()
    try:
        conn.execute("DELETE FROM cards WHERE id = ?", (card_id,))
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ── Review stats endpoints ───────────────────────────────────────────

@app.get("/api/review-stats")
async def get_review_stats(start: str | None = None, end: str | None = None):
    conn = get_db()
    try:
        sql = "SELECT * FROM review_stats"
        params: list = []
        clauses: list[str] = []
        if start:
            clauses.append("day >= ?")
            params.append(start)
        if end:
            clauses.append("day <= ?")
            params.append(end)
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY day DESC"
        rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
        # Convert all_due_completed from 0/1/NULL to bool/null for JS
        for r in rows:
            v = r.get("all_due_completed")
            r["all_due_completed"] = None if v is None else bool(v)
        return rows
    finally:
        conn.close()


@app.post("/api/review-stats")
async def upsert_review_stats(stats: ReviewStatsIn):
    conn = get_db()
    try:
        existing = conn.execute("SELECT * FROM review_stats WHERE day = ?", (stats.day,)).fetchone()

        if stats.increment and existing:
            # Server-side increment
            reviews = existing["reviews"] + (stats.reviews if stats.reviews is not None else 0)
            correct = existing["correct"] + (stats.correct if stats.correct is not None else 0)
            lapses = existing["lapses"] + (stats.lapses if stats.lapses is not None else 0)
            all_due = stats.all_due_completed if stats.all_due_completed is not None else (
                bool(existing["all_due_completed"]) if existing["all_due_completed"] is not None else None
            )
            conn.execute(
                "UPDATE review_stats SET reviews=?, correct=?, lapses=?, all_due_completed=? WHERE day=?",
                (reviews, correct, lapses, all_due if all_due is None else int(all_due), stats.day),
            )
        elif existing:
            # Plain overwrite of provided fields
            reviews = stats.reviews if stats.reviews is not None else existing["reviews"]
            correct = stats.correct if stats.correct is not None else existing["correct"]
            lapses_val = stats.lapses if stats.lapses is not None else existing["lapses"]
            all_due = stats.all_due_completed if stats.all_due_completed is not None else (
                bool(existing["all_due_completed"]) if existing["all_due_completed"] is not None else None
            )
            conn.execute(
                "UPDATE review_stats SET reviews=?, correct=?, lapses=?, all_due_completed=? WHERE day=?",
                (reviews, correct, lapses_val, all_due if all_due is None else int(all_due), stats.day),
            )
        else:
            # Insert new row
            all_due = stats.all_due_completed
            conn.execute(
                "INSERT INTO review_stats (day, reviews, correct, lapses, all_due_completed) VALUES (?, ?, ?, ?, ?)",
                (stats.day, stats.reviews or 0, stats.correct or 0, stats.lapses or 0,
                 None if all_due is None else int(all_due)),
            )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ── Irregular verbs endpoints ────────────────────────────────────────

@app.get("/api/irregular-verbs/search")
async def search_irregular_verbs(q: str = Query("")):
    if not q:
        return []
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM irregular_verbs WHERE infinitive LIKE ? ORDER BY infinitive LIMIT 10",
            (q.lower() + "%",),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@app.get("/api/irregular-verbs/{infinitive}")
async def get_irregular_verb(infinitive: str):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM irregular_verbs WHERE infinitive = ?", (infinitive,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


@app.post("/api/irregular-verbs/populate")
async def populate_irregular_verbs():
    seed_reference_data()
    return {"ok": True}


# ── Phrasal verbs endpoints ─────────────────────────────────────────

@app.get("/api/phrasal-verbs/count")
async def get_phrasal_verbs_count():
    conn = get_db()
    try:
        count = conn.execute("SELECT COUNT(*) FROM verbs_governance").fetchone()[0]
        return {"count": count}
    finally:
        conn.close()


@app.get("/api/phrasal-verbs/search")
async def search_phrasal_verbs(q: str = Query("")):
    if not q:
        return []
    conn = get_db()
    try:
        pattern = "%" + q.lower() + "%"
        rows = conn.execute(
            """SELECT * FROM verbs_governance
               WHERE LOWER(infinitive) LIKE ? OR LOWER(full_expression) LIKE ? OR LOWER(translation) LIKE ?
               ORDER BY full_expression LIMIT 10""",
            (pattern, pattern, pattern),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@app.get("/api/phrasal-verbs/{verb_id}")
async def get_phrasal_verb(verb_id: int):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM verbs_governance WHERE id = ?", (verb_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


@app.post("/api/phrasal-verbs/populate")
async def populate_phrasal_verbs():
    seed_reference_data()
    return {"ok": True}


# ── Static files (must be LAST) ─────────────────────────────────────

@app.get("/")
async def index():
    return FileResponse(APP_DIR / "index.html")

app.mount("/", StaticFiles(directory=APP_DIR), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
