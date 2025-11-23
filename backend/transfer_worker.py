"""Transfer worker - handles playlist transfer using ytmusicapi"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from ytmusic_client import YouTubeMusicClient
from spotify_client import get_playlist_tracks, get_liked_songs, get_playlist_details
import storage
import time
from logger import Logger


def update_job_progress(job_id: str, progress_data: dict):
    """Update job progress in storage"""
    storage.update_job_progress(job_id, progress_data)

def update_job_status(job_id: str, status: str, results: list = None):
    """Update job status and results in storage"""
    storage.update_job_status(job_id, status, results)

def calculate_match_score(spotify_track, yt_candidate):
    """Calculate a match score (0-100) for a YouTube candidate against a Spotify track"""
    import difflib
    
    score = 0
    log = []
    
    sp_name = spotify_track["track"]["name"]
    sp_artists = [a["name"].lower() for a in spotify_track["track"]["artists"]]
    sp_primary_artist = sp_artists[0]
    sp_album = spotify_track["track"]["album"]["name"]
    sp_duration = spotify_track["track"]["duration_ms"] / 1000
    
    yt_name = yt_candidate["title"]
    yt_artists = [a["name"].lower() for a in yt_candidate.get("artists", [])]
    yt_album = yt_candidate.get("album", {}).get("name", "") if yt_candidate.get("album") else ""
    yt_duration = yt_candidate.get("duration_seconds")
    
    # Normalize titles
    sp_norm = normalize_title(sp_name)
    yt_norm = normalize_title(yt_name)
    
    # 1. Title Match (Max 50)
    title_match_score = 0
    if sp_norm == yt_norm:
        title_match_score = 50
        log.append("Exact Title Match (+50)")
    else:
        # Fuzzy match
        ratio = difflib.SequenceMatcher(None, sp_norm, yt_norm).ratio()
        if ratio > 0.8:
            fuzzy_score = int(40 * ratio)
            title_match_score = fuzzy_score
            log.append(f"Fuzzy Title Match {ratio:.2f} (+{fuzzy_score})")
        elif sp_norm in yt_norm or yt_norm in sp_norm:
            title_match_score = 30
            log.append("Partial Title Match (+30)")
    
    score += title_match_score
            
    # 2. Artist Match (Max 30)
    artist_match = False
    if yt_artists:
        # Normalize artists
        sp_primary_norm = normalize_artist(sp_primary_artist)
        yt_primary_norm = normalize_artist(yt_artists[0])
        
        # Check primary artist (Exact or Fuzzy)
        primary_ratio = difflib.SequenceMatcher(None, sp_primary_norm, yt_primary_norm).ratio()
        
        if sp_primary_norm == yt_primary_norm or primary_ratio > 0.85:
            score += 30
            artist_match = True
            log.append("Primary Artist Match (+30)")
        # Check any artist overlap
        elif any(normalize_artist(a) in [normalize_artist(y) for y in yt_artists] for a in sp_artists):
            score += 20
            artist_match = True
            log.append("Secondary Artist Match (+20)")
        # Check if artist is in title (common in YT titles)
        elif any(normalize_artist(a) in yt_name.lower() for a in sp_artists):
            score += 20
            artist_match = True
            log.append("Artist found in Title (+20)")
        else:
            # Penalty for no artist match
            # REDUCED PENALTY if Title is EXACT match (to handle Composer vs Singer issues)
            if title_match_score == 50:
                score -= 10
                log.append("Artist Mismatch (Reduced Penalty -10)")
            else:
                score -= 20
                log.append("Artist Mismatch (-20)")
            
    # 3. Album Match (Max 30) - NEW
    # Helpful for OSTs where artist might differ (Composer vs Singer) but Album is same
    if sp_album and yt_album:
        sp_album_norm = normalize_title(sp_album)
        yt_album_norm = normalize_title(yt_album)
        if sp_album_norm == yt_album_norm:
            score += 30
            log.append("Album Match (+30)")
        elif sp_album_norm in yt_album_norm or yt_album_norm in sp_album_norm:
            score += 15
            log.append("Partial Album Match (+15)")

    # 4. Duration Match (Max 10)
    if yt_duration:
        diff = abs(sp_duration - yt_duration)
        if diff <= 5:
            score += 10
            log.append("Exact Duration (+10)")
        elif diff <= 15:
            score += 5
            log.append("Close Duration (+5)")
        elif diff > 45:
            score -= 20
            log.append("Duration Mismatch >45s (-20)")
            
    # 5. Descriptor Check (Remix, Live, etc.)
    descriptors = ["remix", "live", "karaoke", "instrumental", "cover", "slowed", "reverb", "sped up", "edit"]
    sp_lower = sp_name.lower()
    yt_lower = yt_name.lower()
    
    for desc in descriptors:
        sp_has = desc in sp_lower
        yt_has = desc in yt_lower
        
        if sp_has != yt_has:
            # Mismatch in descriptor
            score -= 40
            log.append(f"Descriptor Mismatch: {desc} (-40)")

    # 6. "Originally Performed by" Penalty (Specific for covers)
    # If the YouTube title says "Originally Performed by X" and X is the Spotify artist,
    # but the YouTube artist is NOT X, this is a cover.
    if "originally performed by" in yt_lower or "made famous by" in yt_lower:
        # We re-evaluate primary artist match here to be sure, ignoring "Artist in Title" match
        sp_primary_norm = normalize_artist(sp_primary_artist)
        yt_primary_norm = normalize_artist(yt_artists[0]) if yt_artists else ""
        
        primary_ratio = difflib.SequenceMatcher(None, sp_primary_norm, yt_primary_norm).ratio()
        is_primary_match = sp_primary_norm == yt_primary_norm or primary_ratio > 0.85
        
        if not is_primary_match:
            score -= 50
            log.append("Cover Indicator 'Originally Performed by' (-50)")
            
    # Return both total score and title score for title-only matching
    return score, title_match_score, log

def lookup_song_wrapper(yt_client, track):
    """Wrapper for parallel song lookup with advanced scoring"""
    try:
        track_name = track["track"]["name"]
        artist_name = track["track"]["artists"][0]["name"]
        album_name = track["track"]["album"]["name"]
        
        # 1. Try standard query
        query = f"{track_name} by {artist_name}"
        candidates = yt_client.search_song(
            query=query,
            track_name=track_name,
            artist_name=artist_name,
            album_name=album_name
        )
        
        # 2. If no candidates or low quality, try alternate queries
        if not candidates:
            # Try strict title + artist
            candidates = yt_client.search_song(f"{track_name} {artist_name}")
            
        best_match = None
        best_score = -100
        best_title_score = 0
        
        for cand in candidates:
            score, title_score, log = calculate_match_score(track, cand)
            if score > best_score:
                best_score = score
                best_title_score = title_score
                best_match = cand
        
        # 3. If still no good match, try Video Search (Automatic Fallback)
        if best_score < 60:
            video_candidates = yt_client.search_video(f"{track_name} {artist_name}")
            
            for cand in video_candidates:
                score, title_score, log = calculate_match_score(track, cand)
                if score > best_score:
                    best_score = score
                    best_title_score = title_score
                    best_match = cand
        
        # Accept if overall score is good OR if title matches strongly (title-only match)
        # Title score >= 40 means strong title match (exact or high fuzzy)
        if best_score >= 60 or (best_title_score >= 40 and best_score >= 20):
            return (track, best_match, None)
        else:
            return (track, None, f"No good match found (Best score: {best_score}, Title: {best_title_score})")
            
    except Exception as e:
        return (track, None, str(e))

def validate_and_extract_playlist_id(response):
    """Validate create_playlist response and extract ID"""
    Logger.debug(f"Playlist Creation Response: {response} (Type: {type(response)})")
    
    if isinstance(response, dict):
        # Check for channel creation requirement
        if 'actions' in response:
            for action in response['actions']:
                if 'channelCreationFormEndpoint' in action:
                    raise Exception("YouTube Channel not found. Please create a channel on music.youtube.com first.")
                # Check for feature enablement popup (e.g. Terms of Service or other blockers)
                if 'showEngagementPanelEndpoint' in action:
                    panel = action['showEngagementPanelEndpoint']
                    tag = panel.get('identifier', {}).get('tag', 'unknown')
                    raise Exception(f"YouTube Music returned a feature enablement popup (tag: {tag}). This usually means the account needs to accept terms or has a channel issue. Please check music.youtube.com in a browser.")
        
        # Try to extract ID if possible
        if 'id' in response:
            return response['id']
        elif 'playlistId' in response:
            return response['playlistId']
        else:
            # Generic failure if no ID found
            raise Exception(f"Failed to create playlist. No playlist ID returned. Response: {response}")
            
    return response

def normalize_title(title):
    """Normalize title for comparison by removing extra info and special chars"""
    import re
    if not title:
        return ""
    
    # Convert to lowercase
    t = title.lower()
    
    # Remove leading numbers (e.g. "14-", "01 ")
    t = re.sub(r'^\d+[\s\-\.]+', '', t)
    
    # Remove content in brackets/parentheses
    # BUT only if it doesn't result in empty string
    t_no_brackets = re.sub(r'[\(\[].*?[\)\]]', '', t)
    if t_no_brackets.strip():
        t = t_no_brackets
    
    # Replace " - " or " : " with space instead of truncating
    # This preserves "Artist - Title" formats which were previously broken
    t = t.replace(" - ", " ").replace(" : ", " ")
        
    # Remove "feat.", "ft.", "with" followed by text (if not caught by brackets)
    t = re.sub(r'\b(feat|ft|with)\b.*', '', t)
    
    # Remove all non-alphanumeric characters
    t = re.sub(r'[^\w\s]', '', t)
    
    # Collapse whitespace
    t = re.sub(r'\s+', ' ', t).strip()
    
    return t

def normalize_artist(artist):
    """Normalize artist name for comparison"""
    import re
    if not artist:
        return ""
    
    a = artist.lower()
    
    # Replace special stylistic characters
    a = a.replace('$', 's')
    
    # Replace separators with space
    a = re.sub(r'\b(and|with|vs|x|&)\b', ' ', a)
    
    # Remove special chars (keep only alphanumeric and space)
    a = re.sub(r'[^\w\s]', ' ', a)
    
    # Collapse whitespace
    a = re.sub(r'\s+', ' ', a).strip()
    
    return a

def process_tracks_batch(yt_client, yt_playlist_id, tracks, progress_callback=None):
    """Process a batch of tracks and add to YouTube playlist"""
    import difflib
    
    video_ids_batch = []
    matched = 0
    failed = 0
    exact_matches = 0
    title_matches = 0
    duplicates = 0
    processed_tracks = []
    seen_tracks = set()
    
    # Lookup songs in parallel (5 threads)
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(lookup_song_wrapper, yt_client, track): track for track in tracks}
        
        for future in as_completed(futures):
            spotify_track, yt_track, error = future.result()
            
            if not spotify_track.get("track"):
                continue
            
            # Skip local files if they have no ID (often unmatchable) or keep them with a warning?
            # For now, we'll try to process them but with better fallbacks.
            is_local = spotify_track["track"].get("is_local", False)
            
            track_name = spotify_track["track"].get("name")
            # Skip "Unknown Track" to prevent garbage matches
            if track_name == "Unknown Track" or track_name == "Local File (No Metadata)":
                failed += 1
                continue

            track_info = {
                "spotifyName": track_name,
                "spotifyArtist": spotify_track["track"]["artists"][0]["name"] if spotify_track["track"].get("artists") else "Unknown Artist",
                "spotifyImage": spotify_track["track"]["album"]["images"][0]["url"] if spotify_track["track"].get("album") and spotify_track["track"]["album"].get("images") else "",
                "ytName": "",
                "ytArtist": "",
                "ytImage": "",
                "status": "failed",
                "isDuplicate": False,
                "matchType": "none"
            }
            
            if error or not yt_track:
                # Try retry logic (Broader search + Video search)
                Logger.track_lookup(track_info['spotifyName'], success=False)
                spotify_track, yt_track, retry_error = lookup_song_retry(yt_client, track_info)
                
                if retry_error or not yt_track:
                    failed += 1
                    error = retry_error # Update error message
                else:
                    # Retry succeeded!
                    error = None
                    Logger.track_lookup(track_info['spotifyName'], success=True)

            if error or not yt_track:
                # Still failed after retry
                pass # Already incremented failed above
            elif not yt_track.get("videoId"):
                # Match found but has no videoId (invalid)
                Logger.warning(f"Match found for {track_info['spotifyName']} but missing videoId. Treating as failed.")
                failed += 1
            else:
                # Check for duplicates
                track_key = f"{yt_track['videoId']}"
                is_duplicate = track_key in seen_tracks
                
                Logger.info(f"Checking match: {yt_track['title']} ({yt_track['videoId']}) for {track_info['spotifyName']}")
                
                if is_duplicate:
                    duplicates += 1
                    track_info["isDuplicate"] = True
                    Logger.warning(f"DUPLICATE DETECTED: {yt_track['title']} ({yt_track['videoId']}) was already seen!")
                else:
                    seen_tracks.add(track_key)
                    video_ids_batch.append(yt_track["videoId"])
                    matched += 1
                    
                    # Determine match type
                    spotify_title = spotify_track["track"]["name"]
                    yt_title = yt_track["title"]
                    
                    sp_norm = normalize_title(spotify_title)
                    yt_norm = normalize_title(yt_title)
                    
                    titles_match = (sp_norm == yt_norm)
                    
                    # Check Artist Match for Classification
                    sp_artists = [a["name"] for a in spotify_track["track"]["artists"]]
                    sp_primary = sp_artists[0] if sp_artists else ""
                    
                    yt_artists = [a["name"] for a in yt_track.get("artists", [])]
                    yt_primary = yt_artists[0] if yt_artists else ""
                    
                    # Normalize artists
                    sp_artist_norm = normalize_artist(sp_primary)
                    yt_artist_norm = normalize_artist(yt_primary)
                    
                    # Strict Artist Match Logic:
                    # 1. Exact normalized match of PRIMARY artist
                    # 2. High fuzzy match ratio (>0.85) of PRIMARY artist
                    # 3. ANY artist overlap (fixes "Feat." and "Composer vs Singer" issues)
                    # 4. "Topic" channel match
                    # NOTE: We REMOVED "Artist contained in Title" from strict match.
                    # If artist is only in title but channel is random, it should be a TITLE MATCH (Yellow), not Exact.
                    
                    artist_ratio = difflib.SequenceMatcher(None, sp_artist_norm, yt_artist_norm).ratio()
                    
                    # Check for ANY overlap between Spotify artists and YouTube artists
                    has_artist_overlap = False
                    if sp_artists and yt_artists:
                        sp_artists_norm = [normalize_artist(a) for a in sp_artists]
                        yt_artists_norm = [normalize_artist(a) for a in yt_artists]
                        has_artist_overlap = any(
                            s in y or y in s 
                            for s in sp_artists_norm 
                            for y in yt_artists_norm 
                            if len(s) > 2 and len(y) > 2
                        )
                    
                    is_strict_artist_match = (
                        sp_artist_norm == yt_artist_norm or
                        artist_ratio > 0.85 or
                        has_artist_overlap or
                        "topic" in yt_primary.lower()
                    )
                    
                    # Check if artist is in title (for fallback/confirmation, but not strict match)
                    is_artist_in_title = (sp_artist_norm and sp_artist_norm in yt_title.lower())

                    if titles_match:
                        if is_strict_artist_match:
                            exact_matches += 1
                            track_info["matchType"] = "exact"
                        else:
                            # Title matches but Artist doesn't (or is only in title) -> Title Match
                            title_matches += 1
                            track_info["matchType"] = "title"
                    else:
                        # Check for Contained Title Match
                        # Ensure norms are not empty
                        is_contained_match = False
                        if sp_norm and yt_norm:
                            is_contained_match = (sp_norm in yt_norm or yt_norm in sp_norm)
                        
                        if is_contained_match and is_strict_artist_match:
                            exact_matches += 1
                            track_info["matchType"] = "exact"
                        else:
                            # Fuzzy title match
                            title_matches += 1
                            track_info["matchType"] = "title"
                
                track_info["status"] = "success"
                track_info["ytName"] = yt_track["title"]
                track_info["ytArtist"] = yt_track["artists"][0]["name"] if yt_track.get("artists") else ""
                track_info["ytImage"] = yt_track.get("thumbnails", [{}])[0].get("url", "")
            
            processed_tracks.append(track_info)
            
            # Update progress if callback provided
            if progress_callback:
                try:
                    progress_callback(
                        len(processed_tracks),
                        matched,
                        exact_matches,
                        title_matches,
                        duplicates
                    )
                except Exception as e:
                    Logger.error(f"Progress callback failed: {e}")
            
            # Batch add when we have 50 tracks
            if len(video_ids_batch) >= 50:
                yt_client.add_tracks_batch(yt_playlist_id, video_ids_batch, duplicates=False)
                video_ids_batch = []
                Logger.batch_added(50)
    
    # Add remaining tracks
    if video_ids_batch:
        yt_client.add_tracks_batch(yt_playlist_id, video_ids_batch, duplicates=False)
        Logger.batch_added(len(video_ids_batch))
        
    return {
        "matched": matched,
        "failed": failed,
        "exactMatches": exact_matches,
        "titleMatches": title_matches,
        "duplicates": duplicates,
        "processedTracks": processed_tracks
    }

def create_playlist_with_fallback(yt_client, title, description, privacy_status="PUBLIC"):
    """Create playlist with specified privacy, fallback if needed"""
    try:
        Logger.info(f"Creating {privacy_status} playlist: {title}")
        response = yt_client.create_playlist(title, description, privacy_status)
        return validate_and_extract_playlist_id(response)
    except Exception as e:
        # Only fallback if we tried PUBLIC and it failed due to channel missing
        if privacy_status == "PUBLIC" and "YouTube Channel not found" in str(e):
            Logger.warning(f"Public playlist failed. Falling back to PRIVATE for '{title}'")
            Logger.warning("ACTION REQUIRED: Create a channel at music.youtube.com")
            response = yt_client.create_playlist(title, description, "PRIVATE")
            return validate_and_extract_playlist_id(response)
        raise e

def transfer_tracks_to_new_playlist(
    yt_client,
    playlist_name,
    playlist_description,
    tracks,
    playlist_id_for_result="unknown",
    progress_callback=None,
    privacy_status="PUBLIC"
):
    """Core logic to create a playlist and transfer tracks"""
    try:
        # Create YouTube Music playlist with fallback
        yt_playlist_id = create_playlist_with_fallback(
            yt_client,
            playlist_name,
            playlist_description,
            privacy_status
        )
        
        Logger.success(f"Created YouTube playlist: {yt_playlist_id}")
        
        # Process tracks
        stats = process_tracks_batch(yt_client, yt_playlist_id, tracks, progress_callback)
        
        total_tracks = len(tracks)
        Logger.playlist_complete(playlist_name, stats['matched'], total_tracks)
        
        return {
            "playlistId": playlist_id_for_result,
            "playlistName": playlist_name,
            "tracks": total_tracks,
            "matched": stats["matched"],
            "failed": stats["failed"],
            "ytPlaylistId": yt_playlist_id,
            "ytPlaylistUrl": f"https://music.youtube.com/playlist?list={yt_playlist_id}",
            "status": "completed",
            "exactMatches": stats["exactMatches"],
            "titleMatches": stats["titleMatches"],
            "duplicates": stats["duplicates"],
            "processedTracks": stats["processedTracks"]
        }
    except Exception as e:
        Logger.error(f"Playlist processing failed for {playlist_name}: {e}")
        return {
            "playlistId": playlist_id_for_result,
            "playlistName": playlist_name,
            "tracks": len(tracks),
            "matched": 0,
            "failed": 0,
            "status": "failed",
            "error": str(e)
        }

def transfer_playlist(
    session_id: str,
    playlist_id: str,
    job_id: str,
    yt_client: YouTubeMusicClient,
    current_idx: int,
    total_playlists: int,
    global_processed_offset: int = 0,
    grand_total_tracks: int = 0,
    privacy_status: str = "PUBLIC",
    use_backend_oauth: bool = False
):
    """Transfer a single Spotify playlist to YouTube Music"""
    try:
        # Get playlist details
        if session_id == "guest_session":
            from spotify_client import get_spotify_client_credentials
            sp = get_spotify_client_credentials()
            playlist_details = sp.playlist(playlist_id)
            spotify_tracks_result = sp.playlist_tracks(playlist_id)
            spotify_tracks = spotify_tracks_result['items']
            while spotify_tracks_result['next']:
                spotify_tracks_result = sp.next(spotify_tracks_result)
                spotify_tracks.extend(spotify_tracks_result['items'])
        else:
            playlist_details = get_playlist_details(session_id, playlist_id)
            spotify_tracks = get_playlist_tracks(session_id, playlist_id)
            
        playlist_name = playlist_details.get("name", "Untitled Playlist")
        total_tracks = len(spotify_tracks)
        
        Logger.playlist_start(playlist_name, total_tracks)
        
        def progress_callback(processed, matched, exact, title, duplicates):
            update_job_progress(job_id, {
                "current": current_idx,
                "total": total_playlists,
                "currentPlaylist": f"Processing {playlist_name}",
                "processed": processed,
                "totalTracks": total_tracks,
                "globalProcessed": global_processed_offset + processed,
                "grandTotalTracks": grand_total_tracks,
                "exactMatches": exact,
                "titleMatches": title,
                "duplicates": duplicates
            })
        
        result = transfer_tracks_to_new_playlist(
            yt_client,
            playlist_name,
            "Transferred from Spotify",
            spotify_tracks,
            playlist_id,
            progress_callback,
            privacy_status
        )
        
        # Track playlist for auto-deletion if using backend OAuth
        if use_backend_oauth and 'ytPlaylistId' in result:
            storage.track_backend_playlist(result['ytPlaylistId'], job_id)
            storage.schedule_playlist_deletion(result['ytPlaylistId'], delay_minutes=30)
        
        # Return total tracks processed in this playlist to update global offset
        result["totalTracksProcessed"] = total_tracks
        return result
        
    except Exception as e:
        Logger.error(f"Playlist {playlist_id} failed: {e}")
        return {
            "playlistId": playlist_id,
            "playlistName": "Error",
            "tracks": 0,
            "matched": 0,
            "failed": 0,
            "status": "failed",
            "error": str(e),
            "totalTracksProcessed": 0
        }

def process_transfer_job(
    job_id: str,
    session_id: str,
    playlist_ids: list,
    include_liked: bool,
    grand_total_tracks: int = 0,
    yt_headers: dict = None
):
    """Main transfer job processor"""
    try:
        # Initialize YouTube Music client
        if yt_headers:
            Logger.info("Initializing YouTube Music client with PROVIDED HEADERS")
        else:
            Logger.info("Initializing YouTube Music client with OAUTH FILE: oauth.json")
            
        yt_client = YouTubeMusicClient(headers_json=yt_headers)
        
        results = []
        total = len(playlist_ids) + (1 if include_liked else 0)
        current = 0
        global_processed = 0
        
        # Determine privacy status and track backend playlists for auto-deletion
        # If using custom headers (User Account), default to PRIVATE to be safe/avoid channel issues
        # If using Server Account (oauth.json), default to PUBLIC (as per original design)
        use_backend_oauth = not yt_headers  # True if using backend OAuth (no user headers)
        privacy_status = "PRIVATE" if yt_headers else "PUBLIC"
        
        # Process each playlist
        for playlist_id in playlist_ids:
            update_job_progress(job_id, {
                "current": current,
                "total": total,
                "currentPlaylist": f"Processing playlist {current + 1}/{total}",
                "globalProcessed": global_processed,
                "grandTotalTracks": grand_total_tracks
            })
            
            result = transfer_playlist(
                session_id, 
                playlist_id, 
                job_id, 
                yt_client, 
                current, 
                total,
                global_processed,
                grand_total_tracks,
                privacy_status,
                use_backend_oauth
            )
            results.append(result)
            global_processed += result.get("totalTracksProcessed", 0)
            current += 1
        
        # Process Liked Songs if requested
        if include_liked:
            update_job_progress(job_id, {
                "current": current,
                "total": total,
                "currentPlaylist": "Liked Songs",
                "globalProcessed": global_processed,
                "grandTotalTracks": grand_total_tracks
            })
            
            try:
                print("Processing Liked Songs")
                liked_tracks = get_liked_songs(session_id)
                total_tracks = len(liked_tracks)
                Logger.info(f"Fetched {total_tracks} Liked Songs")
                
                def progress_callback(processed, matched, exact, title, duplicates):
                    update_job_progress(job_id, {
                        "current": current,
                        "total": total,
                        "currentPlaylist": "Processing Liked Songs",
                        "processed": processed,
                        "totalTracks": total_tracks,
                        "globalProcessed": global_processed + processed,
                        "grandTotalTracks": grand_total_tracks,
                        "exactMatches": exact,
                        "titleMatches": title,
                        "duplicates": duplicates
                    })
                
                result = transfer_tracks_to_new_playlist(
                    yt_client,
                    "Liked Songs (Spotify)",
                    "Transferred from Spotify Liked Songs",
                    liked_tracks,
                    "liked_songs",
                    progress_callback,
                    privacy_status
                )
                
                # Track playlist for auto-deletion if using backend OAuth
                if use_backend_oauth and 'ytPlaylistId' in result:
                    storage.track_backend_playlist(result['ytPlaylistId'], job_id)
                    storage.schedule_playlist_deletion(result['ytPlaylistId'], delay_minutes=30)
                
                results.append(result)
                
            except Exception as e:
                Logger.error(f"Liked Songs processing failed: {e}")
                results.append({
                    "playlistId": "liked_songs",
                    "playlistName": "Liked Songs",
                    "tracks": 0,
                    "matched": 0,
                    "failed": 0,
                    "status": "failed",
                    "error": str(e)
                })
            
            current += 1
        
        # Check if all playlists failed
        all_failed = len(results) > 0 and all(r.get("status") == "failed" for r in results)
        
        if all_failed:
            update_job_status(job_id, "failed", results)
            Logger.error(f"Job {job_id} failed (all playlists failed)")
        else:
            # Update job as completed
            update_job_status(job_id, "completed", results)
            Logger.job_complete(job_id)
        
    except Exception as e:
        Logger.error(f"Job {job_id} failed: {e}")
        update_job_status(job_id, "failed")

def retry_failed_tracks(job_id, failed_tracks, yt_headers):
    """Retry failed tracks with broader search strategy"""
    try:
        yt_client = YouTubeMusicClient(headers_json=yt_headers)
        
        processed_retries = []
        matched_count = 0
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(lookup_song_retry, yt_client, item): item for item in failed_tracks}
            
            for future in as_completed(futures):
                item = futures[future]
                try:
                    sp_track, yt_match, error = future.result()
                    
                    if yt_match:
                        matched_count += 1
                        item["status"] = "success"
                        item["ytName"] = yt_match["title"]
                        item["ytArtist"] = yt_match["artists"][0]["name"] if yt_match.get("artists") else ""
                        item["ytImage"] = yt_match.get("thumbnails", [{}])[0].get("url", "")
                        item["matchType"] = "retry_match"
                    else:
                        item["status"] = "failed"
                        item["error"] = error
                except Exception as e:
                    item["status"] = "failed"
                    item["error"] = str(e)
                
                processed_retries.append(item)
            
        # Update job results
        # We need to merge these back into the original results?
        # Or just replace the results with these?
        # The frontend expects a list of TransferResult objects.
        
        # Let's create a "Retry Results" playlist object
        retry_result = {
            "playlistName": "Retry Results",
            "tracks": len(failed_tracks),
            "matched": matched_count,
            "failed": len(failed_tracks) - matched_count,
            "status": "completed",
            "processedTracks": processed_retries
        }
        
        update_job_status(job_id, "completed", [retry_result])
        
    except Exception as e:
        Logger.error(f"Retry failed: {e}")
        update_job_status(job_id, "failed")

def lookup_song_retry(yt_client, item):
    """Broader search for retry"""
    try:
        track_name = item["spotifyName"]
        artist_name = item["spotifyArtist"]
        
        # 1. Try standard query again (maybe logic changed)
        query = f"{track_name} by {artist_name}"
        Logger.info(f"Search query 1: {query}")
        candidates = yt_client.search_song(query)
        Logger.info(f"Found {len(candidates)} candidates")
        
        # 2. Try just Title + Artist (no "by")
        if not candidates:
            query2 = f"{track_name} {artist_name}"
            Logger.info(f"Search query 2: {query2}")
            candidates = yt_client.search_song(query2)
            Logger.info(f"Found {len(candidates)} candidates")
        
        # 3. Try with artist name variations (remove "Music", "Official", etc.)
        if not candidates:
            clean_artist = artist_name.replace(" Music", "").replace(" Official", "").strip()
            if clean_artist != artist_name:
                candidates = yt_client.search_song(f"{track_name} {clean_artist}")
        
        # 4. Try Title only (Risky but desperate)
        if not candidates:
            candidates = yt_client.search_song(track_name)
            
        # 5. Try cleaning title (remove "Instrumental", "Feat", etc)
        if not candidates:
            clean_title = normalize_title(track_name)
            candidates = yt_client.search_song(f"{clean_title} {artist_name}")

        # 6. Try Video Search (User requested fallback)
        if not candidates:
            # Try searching for video
            candidates = yt_client.search_video(f"{track_name} {artist_name}")
        
        # 7. Try video with clean artist name
        if not candidates:
            clean_artist = artist_name.replace(" Music", "").replace(" Official", "").strip()
            candidates = yt_client.search_video(f"{track_name} {clean_artist}")

        best_match = None
        best_score = -100
        
        # Reconstruct a minimal spotify track object for scoring
        sp_track = {
            "track": {
                "name": track_name,
                "artists": [{"name": artist_name}],
                "album": {"name": ""},
                "duration_ms": 0
            }
        }
        
        best_title_score = 0
        for cand in candidates:
            score, title_score, log = calculate_match_score(sp_track, cand)
            Logger.info(f"Candidate: {cand.get('title')} ({cand.get('videoId')}) - Score: {score}, TitleScore: {title_score}")
            if score > best_score:
                best_score = score
                best_title_score = title_score
                best_match = cand
        
        # Accept if score >= 40 OR title matches strongly
        if best_score >= 40 or (best_title_score >= 40 and best_score >= 15):
            Logger.info(f"Match accepted: {best_match.get('title')} (Score: {best_score})")
            return (sp_track, best_match, None)
        else:
            Logger.warning(f"No good match found. Best score: {best_score}")
            # If we failed with songs, and haven't tried videos yet (e.g. we found songs but they had low scores)
            # We should try videos now if best_score is low.
            
            if best_score < 40 and best_title_score < 40:
                # Try video search as last resort if we haven't already
                video_candidates = yt_client.search_video(f"{track_name} {artist_name}")
                for cand in video_candidates:
                    score, title_score, log = calculate_match_score(sp_track, cand)
                    if score > best_score:
                        best_score = score
                        best_title_score = title_score
                        best_match = cand
                
                # Also try with title only for videos
                if best_score < 40 and best_title_score < 40:
                    video_candidates = yt_client.search_video(track_name)
                    for cand in video_candidates:
                        score, title_score, log = calculate_match_score(sp_track, cand)
                        if score > best_score:
                            best_score = score
                            best_title_score = title_score
                            best_match = cand
                
                if best_score >= 40 or (best_title_score >= 40 and best_score >= 15):
                    return (sp_track, best_match, None)
            
            return (sp_track, None, "No match in retry")
            
    except Exception as e:
        return (None, None, str(e))
