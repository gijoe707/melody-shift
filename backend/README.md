# Melody Shift - Backend

The robust Python backend for Melody Shift, handling playlist transfers, background jobs, and data management.

## 🛠️ Tech Stack

- **Framework:** FastAPI
- **Storage:** Redis (Caching, Job Queue, Shared State)
- **Task Scheduling:** APScheduler
- **Music API:** ytmusicapi (YouTube Music), Spotify API
- **Language:** Python 3.x

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Redis (running on localhost:6379)
- Spotify API credentials
- YouTube Music account (optional, for authenticated transfers)

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables:
   
   Copy `.env.example` to `.env` and fill in your Spotify credentials:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```env
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
   ```

4. **(Optional)** Setup YouTube Music Authentication for Public Playlists:
   
   For server-side public playlist creation, set these environment variables from YouTube Music browser headers:
   
   **How to get the values:**
   1. Open YouTube Music (music.youtube.com) in your browser
   2. Press F12 → Network tab
   3. Filter by "browse"
   4. Click any request and find "Request Headers"
   5. Copy `cookie` value → Set as `OAUTH_COOKIE` in `.env`
   6. Copy `authorization` value → Set as `OAUTH_AUTHORIZATION` in `.env`
   
   **Important:** 
   - The Google account must have a YouTube channel
   - When cookies expire, just copy new values from Network tab

### Running the Server

Start the FastAPI server:
```bash
python main.py
```
The API will be available at `http://localhost:8000`.

## 🎛️ CLI Playlist Manager

Includes a powerful CLI tool to manage playlists and tokens directly.

```bash
# View statistics
python playlist_manager.py stats

# List all tracked playlists
python playlist_manager.py list

# Check active OAuth tokens
python playlist_manager.py tokens

# Delete all playlists (Dangerous)
python playlist_manager.py delete-all-playlists

# Cleanup entire account (Nuclear)
python playlist_manager.py cleanup-account
```

## ✨ Key Features

- **Cross-Process Communication:** Shares state with CLI via Redis.
- **Auto-Cleanup:** Automatically deletes guest playlists after 30 minutes.
- **Security:** OAuth tokens expire automatically (30 min TTL).
- **Background Processing:** Handles large transfers asynchronously.
- **Title-Only Matching:** Finds songs even when artist names don't match perfectly.
- **Public/Private Playlists:** Supports both modes (OAuth required for private).

## 📁 Important Files

- `.env` - Configuration with Spotify credentials and YouTube OAuth env vars (gitignored)
- `logger.py` - Clean timestamped logging system
- `playlist_manager.py` - CLI management tool
- `transfer_worker.py` - Core playlist transfer logic
