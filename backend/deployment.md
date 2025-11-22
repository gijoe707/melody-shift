# Melody Shift Backend Deployment (Coolify)

This guide explains how to deploy the Melody Shift backend using **Coolify**.

## Prerequisites

- A running Coolify instance.
- Your `oauth.json` file (generated locally via `setup_ytmusic.py`).

## Deployment Steps

### 1. Create a New Service

1.  Go to your Coolify Dashboard.
2.  Click **+ New Resource**.
3.  Select **Docker Compose**.
4.  Paste the contents of `backend/docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - REDIS_HOST=redis
      - SPOTIFY_CLIENT_ID=${SPOTIFY_CLIENT_ID}
      - SPOTIFY_CLIENT_SECRET=${SPOTIFY_CLIENT_SECRET}
      - SPOTIFY_REDIRECT_URI=${SPOTIFY_REDIRECT_URI}
      - FRONTEND_URL=${FRONTEND_URL}
    volumes:
      - oauth_data:/app/oauth.json
    depends_on:
      - redis
    restart: always

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: always

volumes:
  oauth_data:
```

*(Note: I slightly modified the volume to use a named volume for easier management in Coolify)*

### 2. Configure Environment Variables

In the Coolify service settings, add the following variables:

- `SPOTIFY_CLIENT_ID`: Your Spotify Client ID
- `SPOTIFY_CLIENT_SECRET`: Your Spotify Client Secret
- `SPOTIFY_REDIRECT_URI`: `https://your-frontend.github.io/melody-shift/auth/callback`
- `FRONTEND_URL`: `https://your-frontend.github.io/melody-shift`

### 3. Upload `oauth.json`

Since `oauth.json` is sensitive and not in git, you need to add it to the container.

**Option A: Persistent Volume (Recommended)**
1.  In Coolify, go to the **Storage** tab for the `api` service.
2.  You should see the `oauth_data` volume.
3.  You might need to SSH into your server and manually place the file, or use Coolify's file manager if available.
    - Path: `/var/lib/docker/volumes/.../_data/oauth.json`

**Option B: Base64 Env Var (Easier)**
1.  Convert your `oauth.json` to a single line string.
2.  Add a new env var `OAUTH_JSON_CONTENT` with the content.
3.  Modify `main.py` (or a startup script) to write this env var to a file on boot. *(Requires code change)*.

**Option C: Git Secret (If using private repo)**
1.  Commit `oauth.json` to your private repo (not recommended for public repos).

### 4. Deploy

Click **Deploy**. Coolify will build the Docker image and start the services.

### 5. Domain Setup

1.  In Coolify, go to **Settings** -> **Domains**.
2.  Add your domain (e.g., `https://api.yourdomain.com`).
3.  Coolify handles SSL automatically!

## Final Check

Visit `https://api.yourdomain.com/docs` to verify the API is running.
