"""YouTube Music client wrapper using ytmusicapi"""
from ytmusicapi import YTMusic
import time
import os

class YouTubeMusicClient:
    """Wrapper for YouTube Music operations"""
    
    def __init__(self, headers_json=None):
        """Initialize YouTube Music client with Headers or OAuth env vars"""
        import json
        import tempfile
        import time
        
        if headers_json:
            print("Initializing YouTube Music client with PROVIDED HEADERS")
            # Clean headers - remove specific headers that cause issues
            # Content-Length: Causes timeouts/errors if size doesn't match new request
            # Host: Managed by requests
            # Accept-Encoding: Managed by requests
            keys_to_remove = ['content-length', 'host', 'accept-encoding']
            cleaned_headers = {k: v for k, v in headers_json.items() if k.lower() not in keys_to_remove}
            
            # ytmusicapi expects a file path, so we write headers to a temp file
            # Use a unique filename with timestamp to force fresh sessions for each instance
            # This prevents session reuse issues when doing multiple transfers
            tf = tempfile.NamedTemporaryFile(
                mode='w+', 
                delete=False, 
                suffix=f'_{int(time.time() * 1000)}.json',
                prefix='ytmusic_'
            )
            json.dump(cleaned_headers, tf)
            tf.close()
            self.yt = YTMusic(auth=tf.name)
            # Store the temp file path so we can clean it up later if needed
            self._temp_file = tf.name
            
        # Check for OAuth env vars (Server Public Account)
        elif os.getenv("OAUTH_COOKIE") and os.getenv("OAUTH_AUTHORIZATION"):
            print("Initializing YouTube Music client with OAUTH env vars")
            # Build oauth.json from env vars with sensible defaults
            oauth_data = {
                "user-agent": os.getenv("OAUTH_USER_AGENT"),
                "accept": os.getenv("OAUTH_ACCEPT"),
                "accept-language": os.getenv("OAUTH_ACCEPT_LANGUAGE"),
                "content-type": os.getenv("OAUTH_CONTENT_TYPE"),
                "referer": os.getenv("OAUTH_REFERER"),
                "x-goog-visitor-id": os.getenv("OAUTH_X_GOOG_VISITOR_ID"),
                "x-youtube-bootstrap-logged-in": os.getenv("OAUTH_X_YOUTUBE_BOOTSTRAP_LOGGED_IN"),
                "x-youtube-client-name": os.getenv("OAUTH_X_YOUTUBE_CLIENT_NAME"),
                "x-youtube-client-version": os.getenv("OAUTH_X_YOUTUBE_CLIENT_VERSION"),
                "x-goog-authuser": os.getenv("OAUTH_X_GOOG_AUTHUSER"),
                "x-origin": os.getenv("OAUTH_X_ORIGIN"),
                "origin": os.getenv("OAUTH_ORIGIN"),
                "sec-fetch-dest": os.getenv("OAUTH_SEC_FETCH_DEST"),
                "sec-fetch-mode": os.getenv("OAUTH_SEC_FETCH_MODE"),
                "sec-fetch-site": os.getenv("OAUTH_SEC_FETCH_SITE"),
                "cookie": os.getenv("OAUTH_COOKIE"),
                "authorization": os.getenv("OAUTH_AUTHORIZATION")
            }
            
            # Write to temp file for ytmusicapi
            tf = tempfile.NamedTemporaryFile(
                mode='w+', 
                delete=False, 
                suffix='.json',
                prefix='ytmusic_oauth_'
            )
            json.dump(oauth_data, tf)
            tf.close()
            self.yt = YTMusic(auth=tf.name)
            self._temp_file = tf.name
        else:
            raise ValueError(
                "No valid authentication found. Either:\n"
                "1. Provide headers_json parameter for private playlists, OR\n"
                "2. Set OAUTH_COOKIE and OAUTH_AUTHORIZATION env vars for public playlists"
            )
    
    def create_playlist(self, title: str, description: str = "", privacy_status: str = "PRIVATE"):
        """Create a new YouTube Music playlist with retry logic"""
        exception_sleep = 5
        for attempt in range(10):
            try:
                playlist_id = self.yt.create_playlist(
                    title=title,
                    description=description,
                    privacy_status=privacy_status
                )
                time.sleep(1)  # Prevent rate limiting
                return playlist_id
            except Exception as e:
                print(f"ERROR: (Retry {attempt+1}/10 create_playlist: {title}) {e} in {exception_sleep}s")
                time.sleep(exception_sleep)
                exception_sleep *= 2
        
        raise Exception(f"Failed to create playlist '{title}' after 10 retries")
    
    def search_song(self, query: str, track_name: str = None, artist_name: str = None, album_name: str = None):
        """Search for a song on YouTube Music
        
        Uses the proven algorithm from spotify_to_ytmusic:
        1. Search for album by artist
        2. Look for exact track match in album
        3. Fall back to song search
        """
        # Try album search first for better accuracy
        if artist_name and album_name:
            albums = self.yt.search(query=f"{album_name} by {artist_name}", filter="albums")
            for album in albums[:3]:
                try:
                    album_tracks = self.yt.get_album(album["browseId"])["tracks"]
                    for track in album_tracks:
                        if track["title"] == track_name:
                            return [track]
                except Exception as e:
                    pass
                except Exception:
                    # Album lookup failed, continue to next album or song search
                    pass
        
        # Fall back to song search with better query handling
        # Clean up query for better results
        clean_query = query.replace(" & ", " ").replace("&", "and")
        
        songs = self.yt.search(query=clean_query, filter="songs", limit=10)
        if songs:
            # Return top 10 results for better scoring, filtering out those without videoId
            return [s for s in songs[:10] if s.get("videoId")]
        
        # If no songs found, try without filter (searches everything)
        if not songs and track_name:
            all_results = self.yt.search(query=clean_query, limit=10)
            # Filter for songs/videos manually AND ensure videoId exists
            songs = [r for r in all_results if r.get("resultType") in ["song", "video"] and r.get("videoId")]
            if songs:
                return songs[:10]
        
        return []
    
    def search_video(self, query: str):
        """Search for a video on YouTube Music (fallback for songs)"""
        videos = self.yt.search(query=query, filter="videos")
        if videos:
            # Filter out videos without videoId
            return [v for v in videos[:5] if v.get("videoId")]
        return []
    
    def add_tracks_batch(self, playlist_id: str, video_ids: list, duplicates: bool = False):
        """Add multiple tracks to a playlist with retry logic"""
        if not video_ids:
            return
        
        exception_sleep = 5
        for attempt in range(10):
            try:
                self.yt.add_playlist_items(
                    playlistId=playlist_id,
                    videoIds=video_ids,
                    duplicates=duplicates
                )
                return
            except Exception as e:
                print(f"ERROR: (Retry {attempt+1}/10 add_tracks_batch) {e} in {exception_sleep}s")
                time.sleep(exception_sleep)
                exception_sleep *= 2
        
        raise Exception(f"Failed to add tracks to playlist after 10 retries")
    
    def rate_song(self, video_id: str, rating: str = "LIKE"):
        """Like a song on YouTube Music with retry logic"""
        exception_sleep = 5
        for attempt in range(10):
            try:
                self.yt.rate_song(video_id, rating)
                return
            except Exception as e:
                print(f"ERROR: (Retry {attempt+1}/10 rate_song) {e} in {exception_sleep}s")
                time.sleep(exception_sleep)
                exception_sleep *= 2
        
        raise Exception(f"Failed to like song after 10 retries")

    def delete_playlist(self, playlist_id: str):
        """Delete a playlist from YouTube Music with retry logic"""
        exception_sleep = 5
        for attempt in range(10):
            try:
                self.yt.delete_playlist(playlist_id)
                return
            except Exception as e:
                print(f"ERROR: (Retry {attempt+1}/10 delete_playlist: {playlist_id}) {e} in {exception_sleep}s")
                time.sleep(exception_sleep)
                exception_sleep *= 2
        
    def get_library_playlists(self, limit: int = None):
        """Get all playlists from the user's library"""
        try:
            return self.yt.get_library_playlists(limit=limit)
        except Exception as e:
            print(f"ERROR: Failed to get library playlists: {e}")
            return []
