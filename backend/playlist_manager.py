"""Playlist Manager - Track and manage backend playlists with auto-deletion (Redis)
Usage: python playlist_manager.py [command]

Commands:
    stats     - Show playlist statistics
    list      - List all tracked playlists
    delete    - Delete a specific playlist
    cancel    - Cancel scheduled deletion for a playlist
    cleanup   - Manually trigger cleanup of old playlists
"""

import sys
from datetime import datetime
from storage import (
    get_all_backend_playlists, 
    delete_backend_playlist, 
    cancel_playlist_deletion,
    delete_all_backend_playlists,
    delete_all_auth_tokens
)

def show_stats():
    """Display playlist statistics"""
    print("\n" + "="*50)
    print("📊 PLAYLIST STATISTICS (Redis Storage)")
    print("="*50)
    
    playlists = get_all_backend_playlists()
    total = len(playlists)
    print(f"\n📝 Total Tracked Playlists: {total}")
    
    if total == 0:
        print("   No playlists currently tracked for deletion.")
        return
    
    # Count active deletions based on auto_delete flag
    active_deletions = sum(1 for p in playlists.values() if p.get("auto_delete", True))
    
    print(f"⏰ Active Scheduled Deletions: {active_deletions}")
    print(f"⏸️  Cancelled/Pending: {total - active_deletions}")
    
    # Show age distribution
    now = datetime.utcnow()
    new_count = 0  # < 10 min
    medium_count = 0  # 10-20 min
    old_count = 0  # > 20 min
    
    for info in playlists.values():
        created = datetime.fromisoformat(info['created_at'])
        age_minutes = (now - created).total_seconds() / 60
        
        if age_minutes < 10:
            new_count += 1
        elif age_minutes < 20:
            medium_count += 1
        else:
            old_count += 1
    
    print("\n📈 Age Distribution:")
    print(f"   🟢 New (< 10 min): {new_count}")
    print(f"   🟡 Medium (10-20 min): {medium_count}")
    print(f"   🔴 Old (> 20 min): {old_count}")
    print()

def list_playlists():
    """List all tracked playlists with details"""
    print("\n" + "="*50)
    print("📋 TRACKED PLAYLISTS")
    print("="*50)
    
    playlists = get_all_backend_playlists()
    
    if not playlists:
        print("\nNo playlists currently tracked.")
        return
    
    now = datetime.utcnow()
    
    for i, (playlist_id, info) in enumerate(playlists.items(), 1):
        print(f"\n[{i}] Playlist ID: {playlist_id}")
        print(f"    Job ID: {info.get('job_id', 'N/A')}")
        
        created = datetime.fromisoformat(info['created_at'])
        age = now - created
        age_str = f"{int(age.total_seconds() / 60)} min"
        print(f"    Created: {created.strftime('%Y-%m-%d %H:%M:%S')} ({age_str} ago)")
        
        if info.get("auto_delete", True):
            scheduled_time_str = info.get("scheduled_deletion_time")
            if scheduled_time_str:
                scheduled_time = datetime.fromisoformat(scheduled_time_str)
                time_until = scheduled_time - datetime.now()
                minutes_left = int(time_until.total_seconds() / 60)
                if minutes_left < 0:
                    print(f"    ⏰ Scheduled: {scheduled_time.strftime('%H:%M:%S')} (Overdue by {abs(minutes_left)} min)")
                else:
                    print(f"    ⏰ Scheduled: {scheduled_time.strftime('%H:%M:%S')} ({minutes_left} min left)")
            else:
                print(f"    ⏰ Scheduled: (Time unknown)")
        else:
            print(f"    ⏸️  Deletion Cancelled")
        
        print(f"    🔗 URL: https://music.youtube.com/playlist?list={playlist_id}")
    
    print()

def delete_playlist_manual():
    """Manually delete a specific playlist"""
    playlists = get_all_backend_playlists()
    if not playlists:
        print("\n❌ No playlists to delete.")
        return
    
    list_playlists()
    
    try:
        choice = input("\nEnter playlist number to delete (or 'q' to quit): ").strip()
        if choice.lower() == 'q':
            return
        
        idx = int(choice) - 1
        playlist_ids = list(playlists.keys())
        
        if idx < 0 or idx >= len(playlist_ids):
            print("❌ Invalid playlist number.")
            return
        
        playlist_id = playlist_ids[idx]
        
        confirm = input(f"\n⚠️  Delete playlist {playlist_id}? (y/n): ").strip().lower()
        if confirm not in ['y', 'yes']:
            print("❌ Deletion cancelled.")
            return
        
        print(f"\n🗑️  Deleting playlist {playlist_id}...")
        delete_backend_playlist(playlist_id)
        print("✅ Playlist deleted successfully!")
        
    except (ValueError, IndexError) as e:
        print(f"❌ Error: {e}")

def cancel_deletion():
    """Cancel scheduled deletion for a specific playlist"""
    playlists = get_all_backend_playlists()
    if not playlists:
        print("\n❌ No playlists tracked.")
        return
    
    list_playlists()
    
    try:
        choice = input("\nEnter playlist number to cancel deletion (or 'q' to quit): ").strip()
        if choice.lower() == 'q':
            return
        
        idx = int(choice) - 1
        playlist_ids = list(playlists.keys())
        
        if idx < 0 or idx >= len(playlist_ids):
            print("❌ Invalid playlist number.")
            return
        
        playlist_id = playlist_ids[idx]
        
        cancel_playlist_deletion(playlist_id)
        print(f"✅ Cancelled scheduled deletion for {playlist_id}")
        print("   (Playlist will remain in YouTube Music)")
        
    except (ValueError, IndexError) as e:
        print(f"❌ Error: {e}")

def cleanup_old():
    """Manually trigger cleanup of playlists older than 25 minutes"""
    playlists = get_all_backend_playlists()
    if not playlists:
        print("\n❌ No playlists to cleanup.")
        return
    
    now = datetime.utcnow()
    old_playlists = []
    
    for playlist_id, info in playlists.items():
        created = datetime.fromisoformat(info['created_at'])
        age_minutes = (now - created).total_seconds() / 60
        
        if age_minutes > 25:
            old_playlists.append((playlist_id, age_minutes))
    
    if not old_playlists:
        print("\n✅ No playlists older than 25 minutes found.")
        return
    
    print(f"\n🧹 Found {len(old_playlists)} old playlist(s):")
    for playlist_id, age in old_playlists:
        print(f"   - {playlist_id} ({int(age)} min old)")
    
    confirm = input(f"\n⚠️  Delete these {len(old_playlists)} playlist(s)? (y/n): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print("❌ Cleanup cancelled.")
        return
    
    print("\n🗑️  Deleting old playlists...")
    for playlist_id, _ in old_playlists:
        try:
            delete_backend_playlist(playlist_id)
            print(f"   ✅ Deleted {playlist_id}")
        except Exception as e:
            print(f"   ❌ Failed to delete {playlist_id}: {e}")
    
    print("\n✅ Cleanup complete!")

def check_tokens():
    """List all active OAuth tokens and their TTL"""
    # Need to import redis_client here or at top. 
    # Since storage.py doesn't export it directly in the import list above, 
    # we should update imports or access it via storage.redis_client if available.
    # Checking imports: from storage import ...
    # storage.py has redis_client initialized.
    # Let's update imports in a separate step if needed, but for now assuming we can access it.
    # Wait, I need to import redis_client from storage.
    from storage import redis_client
    
    print("\n" + "="*50)
    print("🔑 ACTIVE OAUTH TOKENS (Redis TTL)")
    print("="*50)
    
    token_keys = redis_client.keys("melody:auth:*")
    
    if not token_keys:
        print("\nNo active OAuth tokens found.")
        return

    print(f"\nFound {len(token_keys)} active tokens:\n")
    
    for key in token_keys:
        if isinstance(key, bytes):
            key_str = key.decode('utf-8')
        else:
            key_str = str(key)
            
        ttl = redis_client.ttl(key)
        session_id = key_str.replace("melody:auth:", "")
        
        if ttl == -2:
            status = "🔴 Expired"
        elif ttl == -1:
            status = "⚠️ No Expiry"
        else:
            minutes = ttl // 60
            seconds = ttl % 60
            status = f"🟢 Expires in {minutes}m {seconds}s"
            
        print(f"Session: {session_id}")
        print(f"Status:  {status}")
        print("-" * 40)
    print()

def delete_all_playlists_command():
    """Delete ALL tracked playlists"""
    playlists = get_all_backend_playlists()
    if not playlists:
        print("\n❌ No playlists to delete.")
        return
    
    count = len(playlists)
    count = len(playlists)
    print(f"\n⚠️  WARNING: This will delete ALL {count} tracked playlists from YouTube Music!")
    confirm = input("Are you sure you want to delete all tracked playlists? (y/n): ").strip().lower()
    
    if confirm not in ['y', 'yes']:
        print("❌ Operation cancelled.")
        return
    
    print("\n🗑️  Deleting all playlists...")
    deleted_count = delete_all_backend_playlists()
    print(f"✅ Deleted {deleted_count} playlists.")

def delete_all_tokens_command():
    """Delete ALL OAuth tokens"""
    # Check active tokens first (using check_tokens logic but simpler)
    from storage import redis_client
    keys = redis_client.keys("melody:auth:*")
    
    if not keys:
        print("\n❌ No active tokens to delete.")
        return
        
    count = len(keys)
    count = len(keys)
    print(f"\n⚠️  WARNING: This will log out ALL {count} active sessions!")
    confirm = input("Are you sure you want to log out all active sessions? (y/n): ").strip().lower()
    
    if confirm not in ['y', 'yes']:
        print("❌ Operation cancelled.")
        return
    
    print("\n🗑️  Deleting all tokens...")
    deleted_count = delete_all_auth_tokens()
    print(f"✅ Deleted {deleted_count} tokens.")

def cleanup_account_command():
    """Delete ALL playlists from the YouTube Music account (Dangerous!)"""
    from ytmusic_client import YouTubeMusicClient
    
    print("\n" + "!"*50)
    print("☢️  DANGER: ACCOUNT CLEANUP ☢️")
    print("!"*50)
    print("This command will fetch ALL playlists from your YouTube Music account")
    print("and allow you to delete them. This includes playlists NOT created by Melody Shift.")
    
    confirm_fetch = input("\nFetch all playlists? (yes/no): ").strip().lower()
    if confirm_fetch != 'yes':
        return

    print("\n📥 Fetching playlists from YouTube Music...")
    try:
        yt = YouTubeMusicClient()
        playlists = yt.get_library_playlists(limit=None)
    except Exception as e:
        print(f"❌ Failed to fetch playlists: {e}")
        return
    
    if not playlists:
        print("✅ No playlists found on this account.")
        return
        
    print(f"\nFound {len(playlists)} playlists:")
    for i, p in enumerate(playlists, 1):
        title = p.get('title', 'Unknown')
        count = p.get('trackCount', p.get('count', '?'))
        pid = p.get('playlistId', 'Unknown')
        print(f"{i}. {title} ({count} tracks) - ID: {pid}")
        
    print(f"\n⚠️  WARNING: You are about to delete {len(playlists)} playlists.")
    print("This action is IRREVERSIBLE.")
    
    confirm = input(f"\nAre you sure you want to delete ALL {len(playlists)} playlists? (y/n): ").strip().lower()
    
    if confirm not in ['y', 'yes']:
        print("❌ Operation cancelled.")
        return
        
    print("\n🗑️  Deleting ALL playlists...")
    deleted_count = 0
    for p in playlists:
        pid = p.get('playlistId')
        title = p.get('title', 'Unknown')
        
        if not pid:
            print(f"   ⚠️  Skipping playlist '{title}' (No ID found)")
            continue
            
        try:
            yt.delete_playlist(pid)
            print(f"   ✅ Deleted '{title}'")
            deleted_count += 1
        except Exception as e:
            print(f"   ❌ Failed to delete '{title}': {e}")
            
    print(f"\n✅ Cleanup complete. Deleted {deleted_count} playlists.")

def show_help():
    """Display help information"""
    print(__doc__)
    print("    tokens              - Show active OAuth tokens and their expiry")
    print("    delete-all-playlists - Delete ALL tracked playlists")
    print("    delete-all-tokens    - Delete ALL active OAuth tokens")
    print("    cleanup-account      - Delete ALL playlists from YouTube Music account (Dangerous)")

def main():
    if len(sys.argv) < 2:
        show_help()
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    commands = {
        'stats': show_stats,
        'list': list_playlists,
        'delete': delete_playlist_manual,
        'cancel': cancel_deletion,
        'cleanup': cleanup_old,
        'tokens': check_tokens,
        'delete-all-playlists': delete_all_playlists_command,
        'delete-all-tokens': delete_all_tokens_command,
        'cleanup-account': cleanup_account_command,
        'help': show_help,
    }
    
    if command not in commands:
        print(f"❌ Unknown command: {command}")
        show_help()
        sys.exit(1)
    
    commands[command]()

if __name__ == "__main__":
    main()
