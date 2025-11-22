import { useState, useEffect } from "react";
import { StepIndicator } from "@/components/StepIndicator";
import { SpotifyConnectionChoice } from "@/components/SpotifyConnectionChoice";
import { YouTubeConnectionChoice } from "@/components/YouTubeConnectionChoice";
import { DestinationChoice } from "@/components/DestinationChoice";
import { PlaylistSelector } from "@/components/PlaylistSelector";
import { TransferProgress } from "@/components/TransferProgress";
import { TransferResults } from "@/components/TransferResults";
import { Music2, Github } from "lucide-react";
import { SpotifyPlaylist, YouTubeMusicHeaders } from "@/types/api";

const STEPS = [
  { id: 1, title: "Connect", description: "Spotify or Link" },
  { id: 2, title: "Destination", description: "Choose target" },
  { id: 3, title: "Select", description: "Choose playlists" },
  { id: 4, title: "Transfer", description: "Process tracks" },
  { id: 5, title: "Results", description: "View results" },
];

// Mock data for demonstration
const MOCK_PLAYLISTS: SpotifyPlaylist[] = [
  {
    id: "1",
    name: "Chill Vibes",
    description: "Relaxing music for focus",
    images: [{ url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop" }],
    tracks: { total: 42 },
    owner: { display_name: "John Doe" },
  },
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [ytHeaders, setYtHeaders] = useState<YouTubeMusicHeaders | null>(() => {
    const stored = localStorage.getItem("yt_headers");
    return stored ? JSON.parse(stored) : null;
  });
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [likedSongsCount, setLikedSongsCount] = useState<number>(0);
  const [transferJobId, setTransferJobId] = useState<string | null>(null);
  const [transferResults, setTransferResults] = useState<any[] | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [destinationMode, setDestinationMode] = useState<"private" | "public" | null>(null);

  // Check for Spotify connection status and restore session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const connected = params.get("connected");
    const sessionId = localStorage.getItem("spotify_session_id");

    // Handle OAuth callback
    if (code && state) {
      const storedState = localStorage.getItem("spotify_auth_state");
      if (state === storedState) {
        // Exchange code for token
        const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
        fetch(`${import.meta.env.VITE_API_URL}/api/auth/spotify/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri }),
        })
          .then(res => res.json())
          .then(data => {
            localStorage.setItem("spotify_session_id", data.sessionId);
            localStorage.removeItem("spotify_auth_state");
            setSpotifyConnected(true);
            // Clean URL
            window.history.replaceState({}, "", window.location.pathname);
          })
          .catch(err => console.error("Auth failed:", err));
      }
      return;
    }

    if (connected === "true" && sessionId) {
      setSpotifyConnected(true);
      window.history.replaceState({}, "", "/");
    } else if (sessionId) {
      setSpotifyConnected(true);
    }
  }, []);

  // Verify auth token validity periodically
  useEffect(() => {
    if (!spotifyConnected) return;

    const checkAuthStatus = async () => {
      const sessionId = localStorage.getItem("spotify_session_id");
      if (!sessionId || sessionId === "guest_session") return;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (response.status === 401) {
          // Token expired
          console.log("Session expired, signing out...");
          localStorage.removeItem("spotify_session_id");
          setSpotifyConnected(false);
          handleReset();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      }
    };

    // Check immediately
    checkAuthStatus();

    // Check every 60 seconds
    const interval = setInterval(checkAuthStatus, 60000);

    // Check on window focus
    const handleFocus = () => checkAuthStatus();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [spotifyConnected]);

  // Fetch playlists when Spotify is connected and we are at step 3 (Selection)
  useEffect(() => {
    const fetchPlaylists = async () => {
      if (spotifyConnected && currentStep === 3 && !selectedPlaylistId) {
        const sessionId = localStorage.getItem("spotify_session_id");
        if (!sessionId) return;

        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/spotify-playlists`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to fetch playlists");
          }

          setPlaylists(data.items || []);
          if (data.likedSongsCount !== undefined) {
            setLikedSongsCount(data.likedSongsCount);
          }
        } catch (error) {
          console.error("Failed to fetch playlists:", error);
          setPlaylists(MOCK_PLAYLISTS);
        }
      }
    };

    fetchPlaylists();
  }, [spotifyConnected, currentStep, selectedPlaylistId]);

  const handleSpotifyConnect = (sessionId: string, playlistId?: string) => {
    if (sessionId !== "guest_session") {
      localStorage.setItem("spotify_session_id", sessionId);
      setSpotifyConnected(true);
    } else {
      // Guest session (Link paste)
      setSpotifyConnected(false);
      if (playlistId) {
        setSelectedPlaylistId(playlistId);
        // Fetch playlist details to get track count
        fetch(`${import.meta.env.VITE_API_URL}/api/spotify-playlist/${playlistId}`)
          .then(res => res.json())
          .then(data => {
            setPlaylists([data]);
          })
          .catch(err => console.error("Failed to fetch playlist details:", err));
      }
    }
    setCurrentStep(2); // Move to Destination Choice
  };

  const handleDestinationSelect = (mode: "private" | "public") => {
    setDestinationMode(mode);

    if (mode === "public") {
      // If public, we skip headers and go to selection (or transfer if direct link)
      setYtHeaders({}); // Empty headers for public mode

      if (selectedPlaylistId) {
        // Direct link + Public -> Start Transfer immediately
        handlePlaylistsSelect([selectedPlaylistId], false);
      } else {
        // Logged in + Public -> Go to playlist selection
        setCurrentStep(3);
      }
    } else {
      // If private, we need to show headers input
      // We'll use a sub-step or just render the headers component
    }
  };

  const handleHeadersSubmit = (headers: YouTubeMusicHeaders) => {
    setYtHeaders(headers);
    localStorage.setItem("yt_headers", JSON.stringify(headers));

    if (selectedPlaylistId) {
      // Direct link + Private Headers -> Start Transfer
      handlePlaylistsSelect([selectedPlaylistId], false);
    } else {
      // Logged in + Private Headers -> Go to playlist selection
      setCurrentStep(3);
    }
  };

  const handlePlaylistsSelect = async (playlistIds: string[], includeLiked: boolean) => {
    const sessionId = localStorage.getItem("spotify_session_id") || "guest_session";

    // Calculate grand total tracks
    let grandTotal = 0;
    playlistIds.forEach(id => {
      const playlist = playlists.find(p => p.id === id);
      if (playlist) {
        grandTotal += playlist.tracks.total;
      }
    });

    if (includeLiked) {
      grandTotal += likedSongsCount;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/transfer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            playlistIds,
            includeLiked,
            grandTotalTracks: grandTotal,
            ytHeaders: ytHeaders || {}, // Pass empty if public
          }),
        }
      );

      const data = await response.json();
      setTransferJobId(data.jobId);
      setCurrentStep(4);
    } catch (error) {
      console.error("Failed to start transfer:", error);
    }
  };

  const handleTransferComplete = async () => {
    if (!transferJobId) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/transfer-status?jobId=${transferJobId}`
      );
      const data = await response.json();
      setTransferResults(data.results || []);
      setCurrentStep(5);
    } catch (error) {
      console.error("Failed to fetch results:", error);
    }
  };

  const handleReset = () => {
    setTransferJobId(null);
    setTransferResults(null);
    setSelectedPlaylistId(null);
    setDestinationMode(null);
    // Don't clear ytHeaders - keep them for subsequent transfers
    // setYtHeaders(null);
    setCurrentStep(1);
    // Don't clear spotify session if logged in, unless user explicitly signs out
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 backdrop-blur relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-spotify/10 via-transparent to-youtube/10 opacity-50"></div>

        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-spotify/20 ring-2 ring-white/10 overflow-hidden">
                <img src="/melody-shift/logo.ico" alt="Melody Shift" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1DB954] via-[#FF6B6B] to-[#DC143C] bg-clip-text text-transparent">
                  Melody Shift
                </h1>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Transfer playlists from Spotify to YouTube Music
                </p>
              </div>
            </div>
            {spotifyConnected && (
              <button
                onClick={() => {
                  localStorage.removeItem("spotify_session_id");
                  setSpotifyConnected(false);
                  handleReset();
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        <StepIndicator steps={STEPS} currentStep={currentStep} />

        <div className="max-w-3xl mx-auto mt-4">
          {/* Step 1: Connect */}
          {currentStep === 1 && (
            <SpotifyConnectionChoice
              onConnect={handleSpotifyConnect}
              isConnected={spotifyConnected}
              onContinue={() => setCurrentStep(2)}
              onDisconnect={() => {
                localStorage.removeItem("spotify_session_id");
                setSpotifyConnected(false);
                setPlaylists([]);
              }}
            />
          )}

          {/* Step 2: Destination */}
          {currentStep === 2 && !destinationMode && (
            <DestinationChoice
              onSelect={handleDestinationSelect}
              selectedMode={destinationMode}
            />
          )}

          {/* Step 2 (Continued): Headers Input (if Private mode selected) */}
          {currentStep === 2 && destinationMode === "private" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Authentication Required</h2>
                <button
                  onClick={() => setDestinationMode(null)}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Change Destination
                </button>
              </div>
              <YouTubeConnectionChoice onSubmit={handleHeadersSubmit} />
            </div>
          )}

          {/* Step 3: Select Playlists */}
          {currentStep === 3 && (
            <PlaylistSelector
              playlists={playlists}
              onSelect={handlePlaylistsSelect}
              likedSongsCount={likedSongsCount}
            />
          )}

          {/* Step 4: Transfer */}
          {currentStep === 4 && transferJobId && (
            <TransferProgress
              jobId={transferJobId}
              onComplete={handleTransferComplete}
            />
          )}

          {/* Step 5: Results */}
          {currentStep === 5 && transferResults && (
            <TransferResults
              results={transferResults}
              onReset={handleReset}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Made with ♥ by Owais Safa</span>
            <span>•</span>
            <a
              href="https://github.com/OwaisSafa/melody-shift"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>View on GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
