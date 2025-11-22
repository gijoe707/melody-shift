# 🎵 Melody Shift

**Seamlessly transfer your Spotify playlists to YouTube Music.**

Melody Shift is a powerful, privacy-focused tool that moves your music library with ease. It features a modern web interface, a robust backend, and smart automation to keep your account clean.

## 🌟 Features

- **Smart Transfer:** Matches songs and videos accurately.
- **Privacy First:** Guest mode playlists are auto-deleted after 30 minutes.
- **Secure:** OAuth tokens are encrypted and auto-expire.
- **CLI Manager:** Powerful command-line tools for power users.

## 📂 Project Structure

- **[frontend/](frontend/README.md)**: React + Vite web application.
- **[backend/](backend/README.md)**: FastAPI server + Redis + Workers.

## 🚀 Quick Start

### 1. Start Redis
Ensure you have Redis running (e.g., via Docker):
```bash
docker run -d -p 6379:6379 redis:latest
```

### 2. Start Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to start moving your music! 🎧
