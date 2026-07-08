# 🧠 MindTrack — Context-Aware Mental Health Risk Detection System

A full-stack web app for early mental health risk detection using longitudinal text analysis, NLP, and AI-powered insights.

---

## 🗂️ Project Structure

```
mindtrack/
├── backend/
│   ├── main.py           ← FastAPI backend (all routes + AI logic)
│   ├── requirements.txt  ← Python dependencies
│   ├── .env.example      ← Copy to .env and fill in your own keys
│   └── Procfile          ← Start command for deployment (Render/Railway)
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── vercel.json        ← SPA routing config for Vercel
    └── src/
        ├── App.jsx
        ├── index.jsx
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   └── Sidebar.jsx
        └── pages/
            ├── AuthPage.jsx    ← Login + Register
            ├── Dashboard.jsx   ← Home dashboard
            ├── Journal.jsx     ← Journal + AI analysis
            ├── Chat.jsx        ← AI companion chatbot
            ├── Mood.jsx        ← Mood check-in (flashcards)
            ├── RiskReport.jsx  ← Risk analysis + heatmap
            └── UploadCSV.jsx   ← Social media CSV upload
```

---

## ⚙️ Local Setup

### 1 — Get a Groq API key

MindTrack uses [Groq](https://console.groq.com) to run Llama 3.3 for chat, journal analysis, and weekly summaries (Groq's free tier is generous and fast, which is why it's used here instead of a paid model API).

1. Go to https://console.groq.com
2. Sign up and create an API key

### 2 — Backend

```
cd backend
pip install -r requirements.txt
cp .env.example .env
# edit .env and paste in your GROQ_API_KEY (and optionally change SECRET_KEY)

uvicorn main:app --reload --port 8000
```

You should see: `Uvicorn running on http://127.0.0.1:8000`

### 3 — Frontend

Open a **new terminal**:

```
cd frontend
npm install
npm run dev
```

You should see: `Local: http://localhost:5173` (or `:3000`, depending on your Vite version)

### 4 — Open the app

Go to the URL Vite prints in your browser. 🎉

---

## ✨ Features

| Feature              | Description                                                         |
| -------------------- | ------------------------------------------------------------------- |
| 🔐 JWT Authentication | Secure register/login with bcrypt password hashing                  |
| 📓 AI Journal         | Write entries, get mood + risk analysis + SHAP-style explainability |
| 💬 AI Chatbot         | AI-powered mental wellness companion, backed by Llama 3.3 via Groq  |
| 😊 Mood Check-in      | Flashcard-style daily mood logging                                  |
| 🛡️ Risk Report       | 30-day heatmap + longitudinal risk trend analysis                   |
| 📂 CSV Upload         | Upload social media data for bulk analysis                          |
| ✨ Weekly Summary     | AI-generated weekly mental health summary                           |

---

## 🧠 Tech Stack

- **Frontend:** React 18, React Router, Vite
- **Backend:** FastAPI, SQLite, PyJWT, bcrypt
- **AI:** Llama 3.3 70B via the Groq API
- **Explainability:** SHAP-style risk scoring per entry

---

## 📝 Resume Description

> **MindTrack — Mental Health Risk Detection System** | React · FastAPI · Groq/Llama 3.3 · JWT
> Built a full-stack web application that analyzes longitudinal journal and social media text to detect early mental health risks using an LLM-powered pipeline. Features include JWT authentication with bcrypt password hashing, real-time risk dashboards, SHAP-style explainability, CSV bulk upload for social media simulation, mood tracking with trend analysis, and an AI-powered wellness chatbot. Includes ethical AI considerations with crisis resource integration.

---

## ⚠️ Important Disclaimer

This app is not a substitute for professional mental health support. **Crisis helpline: iCall — 9152987821**
