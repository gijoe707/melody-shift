"""Spotify API client for fetching playlists and tracks"""
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import os
from dotenv import load_dotenv
import storage

load_dotenv()

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:5173/auth/callback")

SCOPE = "user-library-read playlist-read-private playlist-read-collaborative"

def get_spotify_client(session_id: str):
    """Get authenticated Spotify client for a session"""
    token_data = storage.get_auth_token(session_id)
    
    if not token_data:
        raise ValueError(f"No OAuth token found for session {session_id}")
    
    # Create Spotify client with saved token
    sp = spotipy.Spotify(auth=token_data["access_token"])
    return sp

def get_spotify_client_credentials():
    """Get Spotify client using Client Credentials flow (for public playlists)"""
    from spotipy.oauth2 import SpotifyClientCredentials
    
    client_credentials_manager = SpotifyClientCredentials(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET
    )
    return spotipy.Spotify(client_credentials_manager=client_credentials_manager)

def get_user_playlists(session_id: str):
    """Fetch all user playlists from Spotify"""
    sp = get_spotify_client(session_id)
    
    playlists = []
    offset = 0
    limit = 50
    
    while True:
        results = sp.current_user_playlists(limit=limit, offset=offset)
        playlists.extend(results['items'])
        
        if not results['next']:
            break
        offset += limit
    
    return playlists

def get_playlist_tracks(session_id: str, playlist_id: str):
    """Fetch all tracks from a Spotify playlist"""
    sp = get_spotify_client(session_id)
    
    tracks = []
    offset = 0
    limit = 100
    
    while True:
        results = sp.playlist_tracks(playlist_id, limit=limit, offset=offset)
        tracks.extend(results['items'])
        
        if not results['next']:
            break
        offset += limit
    
    return tracks

def get_liked_songs(session_id: str):
    """Fetch user's liked songs from Spotify"""
    sp = get_spotify_client(session_id)
    
    tracks = []
    offset = 0
    limit = 50
    
    while True:
        results = sp.current_user_saved_tracks(limit=limit, offset=offset)
        tracks.extend(results['items'])
        
        if not results['next']:
            break
        offset += limit
    
    return tracks

def get_liked_songs_count(session_id: str):
    """Get total count of user's liked songs"""
    sp = get_spotify_client(session_id)
    results = sp.current_user_saved_tracks(limit=1)
    return results['total']

def get_playlist_details(session_id: str, playlist_id: str):
    """Get detailed information about a playlist"""
    if session_id == "guest_session":
        sp = get_spotify_client_credentials()
    else:
        sp = get_spotify_client(session_id)
    return sp.playlist(playlist_id)
