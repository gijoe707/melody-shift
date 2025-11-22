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

export interface ProcessedTrack {
    spotifyName: string;
    spotifyArtist: string;
    spotifyImage: string;
    ytName: string;
    ytArtist: string;
    ytImage: string;
    status: string;
    isDuplicate?: boolean;
    matchType?: string;
}

export interface TransferResult {
    playlistId: string;
    playlistName?: string;
    tracks: number;
    matched: number;
    failed: number;
    ytPlaylistId?: string;
    ytPlaylistUrl?: string;
    status: string;
    error?: string;
    exactMatches?: number;
    titleMatches?: number;
    duplicates?: number;
    processedTracks?: ProcessedTrack[];
}

export interface TransferJob {
    jobId: string;
    status: "pending" | "processing" | "completed" | "failed";
    progress: {
        current: number;
        total: number;
        currentPlaylist?: string;
        processed?: number;
        totalTracks?: number;
        globalProcessed?: number;
        grandTotalTracks?: number;
        exactMatches?: number;
        titleMatches?: number;
        duplicates?: number;
    };
    results?: TransferResult[];
    error?: string;
}
