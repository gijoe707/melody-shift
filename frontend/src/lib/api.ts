/**
 * API Client for Python FastAPI Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface SpotifyPlaylist {
    id: string;
    name: string;
    description?: string;
    images: Array<{ url: string }>;
    tracks: { total: number };
    owner: { display_name: string };
}

export interface YouTubeMusicHeaders {
    [key: string]: string;
}

export interface TransferRequest {
    sessionId: string;
    playlistIds: string[];
    includeLiked: boolean;
    ytHeaders: YouTubeMusicHeaders;
}

export interface TransferJob {
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: {
        total: number;
        current: number;
        currentPlaylist?: string;
    };
    results?: Array<{
        playlistId: string;
        playlistName: string;
        tracks: number;
        matched: number;
        failed: number;
        ytPlaylistId?: string;
        ytPlaylistUrl?: string;
        status: string;
        exactMatches?: number;
        titleMatches?: number;
        duplicates?: number;
        processedTracks?: Array<{
            spotifyName: string;
            spotifyArtist: string;
            spotifyImage: string;
            ytName: string;
            ytArtist: string;
            ytImage: string;
            status: string;
            isDuplicate?: boolean;
            matchType?: string;
        }>;
    }>;
    error?: string;
}

/**
 * Fetch user's Spotify playlists from Python backend
 */
export async function fetchSpotifyPlaylists(sessionId: string): Promise<{ items: SpotifyPlaylist[] }> {
    const response = await fetch(`${API_BASE_URL}/spotify-playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch playlists: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Start a playlist transfer job
 */
export async function startTransfer(request: TransferRequest): Promise<{ jobId: string }> {
    const response = await fetch(`${API_BASE_URL}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error(`Failed to start transfer: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get transfer job status
 */
export async function getTransferStatus(jobId: string): Promise<TransferJob> {
    const response = await fetch(`${API_BASE_URL}/transfer-status?jobId=${jobId}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Save Spotify OAuth token to backend
 */
export async function saveSpotifyToken(
    sessionId: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number
): Promise<void> {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/save-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId,
            accessToken,
            refreshToken,
            expiresAt,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to save token: ${response.statusText}`);
    }
    if (!response.ok) {
        throw new Error(`Failed to save token: ${response.statusText}`);
    }
}

export const api = {
    fetchSpotifyPlaylists,
    startTransfer,
    getTransferStatus,
    saveSpotifyToken,
    retryFailed: async (jobId: string, failedTracks: any[], ytHeaders: any) => {
        const response = await fetch(`${API_BASE_URL}/transfer/retry`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jobId, failedTracks, ytHeaders }),
        });
        if (!response.ok) throw new Error('Failed to retry transfer');
        return response.json();
    }
};
