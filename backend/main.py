from fastapi import FastAPI, HTTPException, Depends, status

from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import sqlite3, jwt, datetime, os, json
import bcrypt
from groq import Groq
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="MindTrack API")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "MindTrack API"}

# Comma-separated list of allowed frontend origins, e.g.
# "http://localhost:3000,https://your-app.vercel.app"
_origins = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-secret-change-me")
ALGORITHM = "HS256"
security = HTTPBearer()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY)
MODEL = "llama-3.3-70b-versatile"

# ─── Database ────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect("mindtrack.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT DEFAULT 'Journal entry',
            content TEXT NOT NULL,
            mood TEXT,
            risk_level TEXT,
            risk_score REAL,
            key_phrases TEXT,
            ai_response TEXT,
            entry_date TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS mood_checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            mood TEXT NOT NULL,
            score INTEGER NOT NULL,
            checkin_date TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    try:
        conn.execute("ALTER TABLE journal_entries ADD COLUMN title TEXT DEFAULT 'Journal entry'")
        conn.commit()
    except Exception:
        pass
    conn.close()

init_db()

# ─── Auth Helpers ─────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: int, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class JournalRequest(BaseModel):
    content: str
    title: Optional[str] = "Journal entry"
    mood: Optional[str] = "neutral"
    entry_date: Optional[str] = None

class JournalUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    mood: Optional[str] = None

class ChatRequest(BaseModel):
    message: str

class MoodRequest(BaseModel):
    mood: str
    score: int

class CSVEntry(BaseModel):
    date: str
    text: str

class CSVUploadRequest(BaseModel):
    entries: List[CSVEntry]

# ─── Auth Routes ──────────────────────────────────────────────────────────────

@app.post("/auth/register")
def register(req: RegisterRequest):
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            (req.name, req.email, hash_password(req.password))
        )
        conn.commit()
        user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
        token = create_token(user["id"], user["email"])
        return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered")
    finally:
        conn.close()

@app.post("/auth/login")
def login(req: LoginRequest):
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE email = ?",
        (req.email,)
    ).fetchone()
    conn.close()
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}

@app.get("/auth/me")
def me(current_user=Depends(get_current_user)):
    conn = get_db()
    user = conn.execute(
        "SELECT id, name, email, created_at FROM users WHERE id = ?",
        (current_user["user_id"],)
    ).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(user)

# ─── Journal Routes ───────────────────────────────────────────────────────────
# IMPORTANT: specific routes (/weekly-summary, /csv) must come BEFORE
# the dynamic route (/journal/{entry_id}) so FastAPI matches them correctly.

@app.get("/journal/weekly-summary")
def weekly_summary(current_user=Depends(get_current_user)):
    conn = get_db()
    entries = conn.execute("""
        SELECT content, mood, risk_level, entry_date FROM journal_entries
        WHERE user_id=? AND entry_date >= datetime('now', '-7 days')
        ORDER BY entry_date ASC
    """, (current_user["user_id"],)).fetchall()
    conn.close()

    if not entries:
        return {"summary": "No entries this week yet. Start journaling to get your weekly summary!"}

    entries_text = "\n".join([
        f"[{e['entry_date'][:10]}] Mood: {e['mood']}, Risk: {e['risk_level']} — {e['content'][:100]}"
        for e in entries
    ])
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=300,
        messages=[
            {"role": "system", "content": "You are a compassionate mental wellness assistant. Write warm, empathetic summaries."},
            {"role": "user", "content": f"Based on these journal entries from this week, write a warm, empathetic 3-sentence weekly mental health summary. Note patterns, improvements, and one gentle suggestion.\n\nEntries:\n{entries_text}"}
        ]
    )
    return {"summary": response.choices[0].message.content}

# ── FIX: /journal/csv must be defined BEFORE /journal/{entry_id} ──────────────
@app.post("/journal/csv")
def upload_csv(req: CSVUploadRequest, current_user=Depends(get_current_user)):
    results = []
    conn = get_db()
    for entry in req.entries:
        analysis = analyze_text_with_groq(entry.text)
        conn.execute(
            "INSERT INTO journal_entries (user_id, title, content, mood, risk_level, risk_score, key_phrases, ai_response, entry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (current_user["user_id"], "Imported entry", entry.text, analysis["mood"],
             analysis["risk_level"], analysis["risk_score"],
             json.dumps(analysis["key_phrases"]), analysis["ai_response"], entry.date)
        )
        results.append({"date": entry.date, **analysis})
    conn.commit()
    conn.close()
    return {"processed": len(results), "results": results}

@app.post("/journal")
def create_journal_entry(req: JournalRequest, current_user=Depends(get_current_user)):
    entry_date = req.entry_date or datetime.datetime.utcnow().isoformat()
    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO journal_entries (user_id, title, content, mood, entry_date) VALUES (?, ?, ?, ?, ?)",
        (current_user["user_id"], req.title or "Journal entry", req.content, req.mood or "neutral", entry_date)
    )
    entry_id = cursor.lastrowid
    conn.commit()
    entry = conn.execute("SELECT * FROM journal_entries WHERE id = ?", (entry_id,)).fetchone()
    conn.close()
    d = dict(entry)
    d["key_phrases"] = json.loads(d["key_phrases"]) if d["key_phrases"] else []
    return d

@app.get("/journal")
def get_journal_entries(current_user=Depends(get_current_user)):
    conn = get_db()
    entries = conn.execute(
        "SELECT * FROM journal_entries WHERE user_id = ? ORDER BY entry_date DESC",
        (current_user["user_id"],)
    ).fetchall()
    conn.close()
    result = []
    for e in entries:
        d = dict(e)
        d["key_phrases"] = json.loads(d["key_phrases"]) if d["key_phrases"] else []
        result.append(d)
    return result

@app.put("/journal/{entry_id}")
def update_journal_entry(entry_id: int, req: JournalUpdateRequest, current_user=Depends(get_current_user)):
    conn = get_db()
    entry = conn.execute(
        "SELECT * FROM journal_entries WHERE id = ? AND user_id = ?",
        (entry_id, current_user["user_id"])
    ).fetchone()
    if not entry:
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")

    new_title   = req.title   if req.title   is not None else entry["title"]
    new_content = req.content if req.content is not None else entry["content"]
    new_mood    = req.mood    if req.mood    is not None else entry["mood"]
    # Also update entry_date on every save so timestamp stays current
    new_date    = datetime.datetime.utcnow().isoformat()

    conn.execute(
        "UPDATE journal_entries SET title=?, content=?, mood=?, entry_date=? WHERE id=?",
        (new_title, new_content, new_mood, new_date, entry_id)
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM journal_entries WHERE id = ?", (entry_id,)).fetchone()
    conn.close()
    d = dict(updated)
    d["key_phrases"] = json.loads(d["key_phrases"]) if d["key_phrases"] else []
    return d

@app.delete("/journal/{entry_id}")
def delete_journal_entry(entry_id: int, current_user=Depends(get_current_user)):
    conn = get_db()
    entry = conn.execute(
        "SELECT * FROM journal_entries WHERE id = ? AND user_id = ?",
        (entry_id, current_user["user_id"])
    ).fetchone()
    if not entry:
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")
    conn.execute("DELETE FROM journal_entries WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@app.post("/journal/{entry_id}/analyze")
def analyze_journal_entry(entry_id: int, current_user=Depends(get_current_user)):
    conn = get_db()
    entry = conn.execute(
        "SELECT * FROM journal_entries WHERE id = ? AND user_id = ?",
        (entry_id, current_user["user_id"])
    ).fetchone()
    conn.close()

    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    analysis = analyze_text_with_groq(entry["content"])

    conn = get_db()
    conn.execute(
        "UPDATE journal_entries SET mood=?, risk_level=?, risk_score=?, key_phrases=?, ai_response=? WHERE id=?",
        (
            analysis["mood"],
            analysis["risk_level"],
            analysis["risk_score"],
            json.dumps(analysis["key_phrases"]),
            analysis["ai_response"],
            entry_id
        )
    )
    conn.commit()
    conn.close()

    return {
        "analysis": analysis["ai_response"],
        "mood": analysis["mood"],
        "risk_level": analysis["risk_level"],
        "key_phrases": analysis["key_phrases"],
        "risk_score": analysis["risk_score"]
    }

# ─── Chat Routes ──────────────────────────────────────────────────────────────

@app.post("/chat")
def chat(req: ChatRequest, current_user=Depends(get_current_user)):
    conn = get_db()
    history = conn.execute(
        "SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
        (current_user["user_id"],)
    ).fetchall()
    messages = [{"role": h["role"], "content": h["content"]} for h in reversed(history)]
    messages.append({"role": "user", "content": req.message})

    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=500,
        messages=[
            {
                "role": "system",
                "content": """You are a compassionate AI mental wellness companion called MindTrack AI.
Your role is to:
- Listen empathetically and respond with warmth and care
- Gently assess emotional state without being clinical
- Suggest healthy coping strategies when appropriate
- Never diagnose or replace professional help
- Always remind users to seek professional support for serious concerns
- Keep responses concise, warm, and supportive (2-4 sentences max)
- End with a gentle follow-up question to keep the conversation going
If someone expresses crisis or self-harm, immediately provide: iCall helpline: 9152987821"""
            },
            *messages
        ]
    )
    reply = response.choices[0].message.content

    conn.execute("INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)",
                 (current_user["user_id"], "user", req.message))
    conn.execute("INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)",
                 (current_user["user_id"], "assistant", reply))
    conn.commit()
    conn.close()
    return {"reply": reply}

@app.get("/chat/history")
def get_chat_history(current_user=Depends(get_current_user)):
    conn = get_db()
    messages = conn.execute(
        "SELECT role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC",
        (current_user["user_id"],)
    ).fetchall()
    conn.close()
    return [dict(m) for m in messages]

# ─── Mood Routes ──────────────────────────────────────────────────────────────

@app.post("/mood")
def log_mood(req: MoodRequest, current_user=Depends(get_current_user)):
    conn = get_db()
    conn.execute(
        "INSERT INTO mood_checkins (user_id, mood, score) VALUES (?, ?, ?)",
        (current_user["user_id"], req.mood, req.score)
    )
    conn.commit()
    conn.close()
    return {"status": "logged"}

@app.get("/mood/history")
def get_mood_history(current_user=Depends(get_current_user)):
    conn = get_db()
    moods = conn.execute(
        "SELECT * FROM mood_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 30",
        (current_user["user_id"],)
    ).fetchall()
    conn.close()
    return [dict(m) for m in moods]

# ─── Dashboard Stats ──────────────────────────────────────────────────────────

@app.get("/dashboard/stats")
def get_dashboard_stats(current_user=Depends(get_current_user)):
    conn = get_db()
    uid = current_user["user_id"]

    total_entries = conn.execute(
        "SELECT COUNT(*) as c FROM journal_entries WHERE user_id=?", (uid,)
    ).fetchone()["c"]
    latest_risk = conn.execute(
        "SELECT risk_level FROM journal_entries WHERE user_id=? ORDER BY entry_date DESC LIMIT 1", (uid,)
    ).fetchone()
    avg_mood = conn.execute(
        "SELECT AVG(score) as avg FROM mood_checkins WHERE user_id=?", (uid,)
    ).fetchone()["avg"]
    streak = conn.execute("""
        SELECT COUNT(DISTINCT DATE(entry_date)) as streak FROM journal_entries
        WHERE user_id=? AND entry_date >= datetime('now', '-7 days')
    """, (uid,)).fetchone()["streak"]

    weekly_moods = conn.execute("""
        SELECT DATE(checkin_date) as day, AVG(score) as avg_score
        FROM mood_checkins WHERE user_id=? AND checkin_date >= datetime('now', '-7 days')
        GROUP BY DATE(checkin_date) ORDER BY day ASC
    """, (uid,)).fetchall()

    recent_entries = conn.execute("""
        SELECT id, title, content, mood, risk_level, risk_score, entry_date
        FROM journal_entries WHERE user_id=? ORDER BY entry_date DESC LIMIT 5
    """, (uid,)).fetchall()

    conn.close()
    return {
        "total_entries": total_entries,
        "current_risk": latest_risk["risk_level"] if latest_risk else "None",
        "avg_mood_score": round(avg_mood, 1) if avg_mood else 0,
        "streak": streak,
        "weekly_moods": [dict(w) for w in weekly_moods],
        "recent_entries": [dict(e) for e in recent_entries]
    }

# ─── AI Analysis Helper ───────────────────────────────────────────────────────

def analyze_text_with_groq(text: str) -> dict:
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=400,
        messages=[
            {
                "role": "system",
                "content": "You are a mental health text analyzer. Always respond with valid JSON only, no extra text, no markdown backticks."
            },
            {
                "role": "user",
                "content": f"""Analyze this journal entry for mental health risk. Respond ONLY with this exact JSON format:
{{
  "mood": "one of: happy/calm/anxious/sad/stressed/angry/neutral",
  "risk_level": "one of: Low/Medium/High",
  "risk_score": 0.0 to 1.0,
  "key_phrases": ["phrase1", "phrase2", "phrase3"],
  "ai_response": "one warm empathetic sentence acknowledging their feelings"
}}

Journal entry: "{text}" """
            }
        ]
    )
    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(raw)
    except Exception:
        return {
            "mood": "neutral",
            "risk_level": "Low",
            "risk_score": 0.2,
            "key_phrases": ["entry recorded"],
            "ai_response": "Thank you for sharing your thoughts. Keep journaling!"
        }