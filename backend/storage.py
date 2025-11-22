import os
import json
import redis
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from ytmusic_client import YouTubeMusicClient

# Initialize Redis client
# Using decode_responses=True to get strings instead of bytes
redis_host = os.getenv("REDIS_HOST", "localhost")
redis_client = redis.Redis(host=redis_host, port=6379, decode_responses=True)

# Initialize Scheduler
# We use a scheduler for actions that require code execution (deleting from YT Music)
# For simple data expiration (like tokens), we use Redis TTL
scheduler = BackgroundScheduler()

# ============= Auth Token Functions =============

def save_auth_token(session_id: str, access_token: str, refresh_token: str = None, expires_at: int = None):
    """Save OAuth token to Redis with 30 minute TTL"""
    token_data = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": expires_at,
        "created_at": datetime.utcnow().isoformat()
    }
    # Save to Redis with 30 minute (1800 seconds) expiration
    # This automatically handles the "auto-deletion of tokens" requirement
    redis_client.setex(f"melody:auth:{session_id}", 1800, json.dumps(token_data))
    print(f"Saved auth token for session {session_id} (TTL: 30m)")

def get_auth_token(session_id: str):
    """Get OAuth token from Redis"""
    data = redis_client.get(f"melody:auth:{session_id}")
    if data:
        return json.loads(data)
    return None

def delete_auth_token(session_id: str):
    """Delete OAuth token from Redis"""
    redis_client.delete(f"melody:auth:{session_id}")
    print(f"Deleted auth token for session {session_id}")

def delete_all_auth_tokens():
    """Delete all OAuth tokens from Redis"""
    keys = redis_client.keys("melody:auth:*")
    count = 0
    for key in keys:
        redis_client.delete(key)
        count += 1
    print(f"Deleted {count} auth tokens")
    return count

# ============= Transfer Job Functions =============

def create_transfer_job(job_id: str, session_id: str, playlist_ids: list, include_liked: bool = False, grand_total_tracks: int = 0):
    """Create a new transfer job in Redis"""
    total_playlists = len(playlist_ids) + (1 if include_liked else 0)
    job_data = {
        "id": job_id,
        "session_id": session_id,
        "playlist_ids": playlist_ids,
        "include_liked": include_liked,
        "grand_total_tracks": grand_total_tracks,
        "status": "processing",
        "progress": {
            "current": 0,
            "total": total_playlists,
            "currentPlaylist": "Initializing...",
            "processed": 0,
            "totalTracks": 0,
            "globalProcessed": 0,
            "grandTotalTracks": grand_total_tracks,
            "exactMatches": 0,
            "titleMatches": 0,
            "duplicates": 0
        },
        "current_playlist": "",
        "total_playlists": total_playlists,
        "completed_playlists": 0,
        "results": [],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    redis_client.set(f"melody:job:{job_id}", json.dumps(job_data))
    return job_data

def get_transfer_job(job_id: str):
    """Get transfer job details from Redis"""
    data = redis_client.get(f"melody:job:{job_id}")
    if data:
        return json.loads(data)
    return None

def update_job_progress(job_id: str, progress_data: dict):
    """Update job progress in Redis"""
    # We use a Lua script or optimistic locking for atomic updates if needed,
    # but for this simple app, read-modify-write is acceptable or just partial updates.
    # To be safe and simple, we'll fetch, update, save.
    job_data = get_transfer_job(job_id)
    if job_data:
        # Update the progress object, not the top-level
        job_data["progress"] = progress_data
        job_data["updated_at"] = datetime.utcnow().isoformat()
        redis_client.set(f"melody:job:{job_id}", json.dumps(job_data))

def update_job_status(job_id: str, status: str, results: list = None):
    """Update job status in Redis"""
    job_data = get_transfer_job(job_id)
    if job_data:
        job_data["status"] = status
        if results is not None:
            job_data["results"] = results
        job_data["updated_at"] = datetime.utcnow().isoformat()
        redis_client.set(f"melody:job:{job_id}", json.dumps(job_data))

# ============= Backend Playlist Functions =============

def track_backend_playlist(playlist_id: str, job_id: str):
    """Track a backend-created playlist for auto-deletion"""
    playlist_data = {
        "job_id": job_id,
        "created_at": datetime.utcnow().isoformat(),
        "auto_delete": True  # Flag to allow cancellation
    }
    redis_client.set(f"melody:playlist:{playlist_id}", json.dumps(playlist_data))
    print(f"Tracking backend playlist {playlist_id} for auto-deletion")

def get_backend_playlist(playlist_id: str):
    """Get backend playlist details"""
    data = redis_client.get(f"melody:playlist:{playlist_id}")
    if data:
        return json.loads(data)
    return None

def get_all_backend_playlists():
    """Get all tracked backend playlists"""
    # Scan for keys matching the pattern
    keys = redis_client.keys("melody:playlist:*")
    playlists = {}
    for key in keys:
        playlist_id = key.split(":")[-1]
        data = redis_client.get(key)
        if data:
            playlists[playlist_id] = json.loads(data)
    return playlists

def delete_backend_playlist(playlist_id: str):
    """Delete playlist from YouTube Music and Redis"""
    try:
        # 1. Delete from YouTube Music
        # We need a client. Since this runs in background, we use headers from oauth.json
        # Assuming oauth.json exists and is valid for the backend account
        yt = YouTubeMusicClient()
        yt.delete_playlist(playlist_id)
        print(f"Deleted playlist {playlist_id} from YouTube Music")
        
        # 2. Remove from Redis
        redis_client.delete(f"melody:playlist:{playlist_id}")
        
    except Exception as e:
        print(f"Error deleting playlist {playlist_id}: {e}")
        # If it fails (e.g. already deleted), still remove from Redis to clean up
        redis_client.delete(f"melody:playlist:{playlist_id}")

def delete_all_backend_playlists():
    """Delete all tracked playlists from YouTube Music and Redis"""
    playlists = get_all_backend_playlists()
    count = 0
    for playlist_id in playlists:
        delete_backend_playlist(playlist_id)
        count += 1
    return count

def _scheduled_delete_wrapper(playlist_id: str):
    """Wrapper to check if deletion is still requested before executing"""
    playlist_data = get_backend_playlist(playlist_id)
    if playlist_data and playlist_data.get("auto_delete", True):
        print(f"Executing scheduled deletion for {playlist_id}")
        delete_backend_playlist(playlist_id)
    else:
        print(f"Skipping deletion for {playlist_id} (cancelled or not found)")

def schedule_playlist_deletion(playlist_id: str, delay_minutes: int = 30):
    """Schedule background deletion of a playlist"""
    run_date = datetime.now() + timedelta(minutes=delay_minutes)
    
    # Update Redis with scheduled time for visibility
    playlist_data = get_backend_playlist(playlist_id)
    if playlist_data:
        playlist_data["scheduled_deletion_time"] = run_date.isoformat()
        redis_client.set(f"melody:playlist:{playlist_id}", json.dumps(playlist_data))
    
    # Add job to scheduler
    scheduler.add_job(
        _scheduled_delete_wrapper,
        'date',
        run_date=run_date,
        args=[playlist_id],
        id=f"delete_{playlist_id}",
        replace_existing=True
    )
    print(f"Scheduled deletion for {playlist_id} at {run_date}")

def cancel_playlist_deletion(playlist_id: str):
    """Cancel auto-deletion for a playlist"""
    # 1. Update Redis flag
    playlist_data = get_backend_playlist(playlist_id)
    if playlist_data:
        playlist_data["auto_delete"] = False
        redis_client.set(f"melody:playlist:{playlist_id}", json.dumps(playlist_data))
    
    # 2. Try to remove from scheduler (if running in same process)
    # If running in different process, the flag check in _scheduled_delete_wrapper handles it
    try:
        scheduler.remove_job(f"delete_{playlist_id}")
        print(f"Removed deletion job for {playlist_id}")
    except:
        pass

def shutdown():
    """Shutdown scheduler"""
    if scheduler.running:
        scheduler.shutdown()
