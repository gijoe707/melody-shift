"""Clean logging utility for Melody Shift backend"""
from datetime import datetime


class Logger:
    """Simple, readable logger without emojis"""
    
    @staticmethod
    def _timestamp():
        return datetime.now().strftime("%H:%M:%S")
    
    @staticmethod
    def info(message):
        """General information"""
        print(f"[{Logger._timestamp()}] INFO: {message}")
    
    @staticmethod
    def success(message):
        """Success message"""
        print(f"[{Logger._timestamp()}] SUCCESS: {message}")
    
    @staticmethod
    def warning(message):
        """Warning message"""
        print(f"[{Logger._timestamp()}] WARNING: {message}")
    
    @staticmethod
    def error(message):
        """Error message"""
        print(f"[{Logger._timestamp()}] ERROR: {message}")
    
    @staticmethod
    def debug(message):
        """Debug message"""
        print(f"[{Logger._timestamp()}] DEBUG: {message}")
    
    @staticmethod
    def job_start(job_id, playlist_count, track_count):
        """Log job start"""
        print(f"\n{'='*60}")
        print(f"[{Logger._timestamp()}] JOB START: {job_id}")
        print(f"  Playlists: {playlist_count} | Total Tracks: {track_count}")
        print(f"{'='*60}\n")
    
    @staticmethod
    def job_complete(job_id):
        """Log job completion"""
        print(f"\n{'='*60}")
        print(f"[{Logger._timestamp()}] JOB COMPLETE: {job_id}")
        print(f"{'='*60}\n")
    
    @staticmethod
    def playlist_start(name, track_count):
        """Log playlist processing start"""
        print(f"\n{'-'*60}")
        print(f"[{Logger._timestamp()}] PLAYLIST: {name} ({track_count} tracks)")
        print(f"{'-'*60}")
    
    @staticmethod
    def playlist_complete(name, matched, total):
        """Log playlist completion"""
        print(f"[{Logger._timestamp()}] COMPLETED: {name} - {matched}/{total} tracks matched")
        print(f"{'-'*60}\n")
    
    @staticmethod
    def track_lookup(track_name, success=True):
        """Log track lookup result"""
        status = "FOUND" if success else "RETRY"
        print(f"[{Logger._timestamp()}] {status}: {track_name}")
    
    @staticmethod
    def batch_added(count):
        """Log batch addition"""
        print(f"[{Logger._timestamp()}] BATCH: Added {count} tracks to playlist")
