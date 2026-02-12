#!/usr/bin/env python3
"""One-time migration: pull decks, cards, and review_stats from Supabase into local SQLite."""

import json
import urllib.request

from db import get_db, init_db

SUPABASE_URL = "https://ysflavogvcdftoguzutz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmxhdm9ndmNkZnRvZ3V6dXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MzE0MzYsImV4cCI6MjA3MTIwNzQzNn0.U8k5SproF3mdBhbzc3KE9D2VIpBL3m6vx9i7BuFJ3QM"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}


def supabase_get(table: str, params: str = "") -> list[dict]:
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}" if params else f"{SUPABASE_URL}/rest/v1/{table}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def migrate():
    init_db()
    conn = get_db()

    # ── Decks ────────────────────────────────────────────────────
    decks = supabase_get("decks", "order=created_at.asc")
    print(f"Fetched {len(decks)} decks from Supabase")
    for d in decks:
        conn.execute(
            "INSERT OR IGNORE INTO decks (id, name, created_at) VALUES (?, ?, ?)",
            (d["id"], d["name"], d["created_at"]),
        )
    conn.commit()

    # ── Cards ────────────────────────────────────────────────────
    cards = supabase_get("cards", "order=created_at.asc")
    print(f"Fetched {len(cards)} cards from Supabase")
    for c in cards:
        conn.execute(
            """INSERT OR IGNORE INTO cards
               (id, deck_id, front, back, ease, interval, reps, lapses, grade, due_date, last_reviewed, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                c["id"], c["deck_id"], c["front"], c["back"],
                c.get("ease", 2.5), c.get("interval", 1), c.get("reps", 0),
                c.get("lapses", 0), c.get("grade"), c.get("due_date"),
                c.get("last_reviewed"), c["created_at"], c.get("updated_at", c["created_at"]),
            ),
        )
    conn.commit()

    # ── Review stats ─────────────────────────────────────────────
    stats = supabase_get("review_stats", "order=day.asc")
    print(f"Fetched {len(stats)} review_stats rows from Supabase")
    for s in stats:
        all_due = s.get("all_due_completed")
        conn.execute(
            "INSERT OR IGNORE INTO review_stats (day, reviews, correct, lapses, all_due_completed) VALUES (?, ?, ?, ?, ?)",
            (s["day"], s.get("reviews", 0), s.get("correct", 0), s.get("lapses", 0),
             None if all_due is None else int(all_due)),
        )
    conn.commit()
    conn.close()
    print("Migration complete!")


if __name__ == "__main__":
    migrate()
