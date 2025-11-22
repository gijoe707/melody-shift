"""FastAPI main application for Melody Shift backend"""
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import os
from dotenv import load_dotenv

import storage
from transfer_worker import process_transfer_job
from spotify_client import get_user_playlists

load_dotenv()

app = FastAPI(title="Melody Shift API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class TransferRequest(BaseModel):
    sessionId: str
    playlistIds: list[str]
    includeLiked: bool
    grandTotalTracks: int = 0  # New field for global progress
    ytHeaders: dict = {}  # Not used with OAuth

class SpotifyPlaylistsRequest(BaseModel):
    sessionId: str

class TokenSaveRequest(BaseModel):
    sessionId: str
    accessToken: str
    refreshToken: str | None = None
    expiresAt: int

class SpotifyCallbackRequest(BaseModel):
    code: str
    redirectUri: str

# API Endpoints

@app.get("/")
async def root():
    """Health check"""
    return {"status": "ok", "message": "Melody Shift API"}

@app.post("/api/save-token")
async def save_token(request: TokenSaveRequest):
    """Save Spotify OAuth token"""
    storage.save_auth_token(
        session_id=request.sessionId,
        access_token=request.accessToken,
        refresh_token=request.refreshToken,
        expires_at=request.expiresAt
    )
    return {"status": "success"}

@app.post("/api/auth/verify")
async def verify_token(request: SpotifyPlaylistsRequest):
    """Verify if a session token is valid"""
    token = storage.get_auth_token(request.sessionId)
    if not token:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    return {"status": "valid"}

@app.post("/api/auth/spotify/callback")
async def spotify_callback(request: SpotifyCallbackRequest):
    """Exchange authorization code for access token"""
    import requests
    import time
    
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Spotify credentials not configured")
        
    response = requests.post(
        "https://accounts.spotify.com/api/token",
        data={
            "grant_type": "authorization_code",
            "code": request.code,
            "redirect_uri": request.redirectUri,
            "client_id": client_id,
            "client_secret": client_secret,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to exchange token: {response.text}")
        
    data = response.json()
    
    # Generate session ID
    session_id = f"spotify_{int(time.time())}_{uuid.uuid4().hex[:8]}"
    
    # Save token using storage
    storage.save_auth_token(
        session_id=session_id,
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token"),
        expires_at=int(time.time()) + data["expires_in"]
    )
    
    return {
        "sessionId": session_id,
        "accessToken": data["access_token"],
        "expiresIn": data["expires_in"]
    }

@app.post("/api/spotify-playlists")
async def fetch_spotify_playlists(request: SpotifyPlaylistsRequest):
    """Get user's Spotify playlists"""
    try:
        playlists = get_user_playlists(request.sessionId)
        
        # Get liked songs count
        from spotify_client import get_liked_songs_count
        liked_count = get_liked_songs_count(request.sessionId)
        
        return {
            "items": playlists,
            "likedSongsCount": liked_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/spotify-playlist/{playlist_id}")
async def get_single_playlist(playlist_id: str, sessionId: str = "guest_session"):
    """Get details for a single Spotify playlist"""
    try:
        from spotify_client import get_playlist_details
        playlist = get_playlist_details(sessionId, playlist_id)
        return playlist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/transfer")
async def start_transfer(
    request: TransferRequest,
    background_tasks: BackgroundTasks
):
    """Start a playlist transfer job"""
    # Handle guest session for direct link transfer
    if request.sessionId == "guest_session" and not request.ytHeaders:
        # Public playlist mode - use server credentials
        pass
    
    # Create job
    job_id = str(uuid.uuid4())
    storage.create_transfer_job(
        job_id=job_id,
        session_id=request.sessionId,
        playlist_ids=request.playlistIds,
        include_liked=request.includeLiked,
        grand_total_tracks=request.grandTotalTracks
    )
    
    # Start background processing
    background_tasks.add_task(
        process_transfer_job,
        job_id,
        request.sessionId,
        request.playlistIds,
        request.includeLiked,
        request.grandTotalTracks,
        request.ytHeaders
    )
    
    return {"jobId": job_id}

class RetryRequest(BaseModel):
    jobId: str
    failedTracks: list[dict]
    ytHeaders: dict = {}

@app.post("/api/transfer/retry")
async def retry_failed(
    request: RetryRequest,
    background_tasks: BackgroundTasks
):
    """Retry failed tracks with broader search"""
    from transfer_worker import retry_failed_tracks
    
    # Update job status to processing again
    job = storage.get_transfer_job(request.jobId)
    if job:
        storage.update_job_status(request.jobId, "processing")
        storage.update_job_progress(request.jobId, {
            "current": 0,
            "total": 1,
            "currentPlaylist": "Retrying failed tracks..."
        })
    
    background_tasks.add_task(
        retry_failed_tracks,
        request.jobId,
        request.failedTracks,
        request.ytHeaders
    )
    
    return {"status": "started"}

@app.get("/api/transfer-status")
async def get_transfer_status(jobId: str):
    """Get transfer job status"""
    job = storage.get_transfer_job(jobId)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "job_id": job["id"],
        "status": job["status"],
        "progress": job.get("progress", {}),
        "results": job.get("results", [])
    }

@app.get("/api/routes")
async def get_routes():
    """List all registered routes"""
    routes = []
    for route in app.routes:
        routes.append({
            "path": route.path,
            "methods": list(route.methods)
        })
    return {"routes": routes}

@app.on_event("startup")
async def startup_event():
    print("Server starting up...")
    for route in app.routes:
        print(f"Route: {route.path} [{route.methods}]")

if __name__ == "__main__":
    import uvicorn
    print("Starting Melody Shift API server...")
    print("Server running at: http://localhost:8000")
    print("API Docs at: http://localhost:8000/docs")
    print("\nPress CTRL+C to stop the server\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="warning")
