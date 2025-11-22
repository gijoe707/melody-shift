import { Music2, ArrowRight, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface SpotifyConnectionChoiceProps {
  onConnect: (sessionId: string, playlistId?: string) => void;
  isConnected?: boolean;
  onContinue?: () => void;
  onDisconnect?: () => void;
}

export const SpotifyConnectionChoice = ({
  onConnect,
  isConnected,
  onContinue,
  onDisconnect
}: SpotifyConnectionChoiceProps) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    const scope = "user-library-read playlist-read-private playlist-read-collaborative";

    // Generate random state
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem("spotify_auth_state", state);

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

    window.location.href = authUrl;
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Extract playlist ID from URL
    // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
    const match = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
    if (match) {
      // For direct link, we still need a session (guest session)
      // For now, we'll pass a dummy session and the playlist ID
      // The backend will need to handle this case
      onConnect("guest_session", match[1]);
    }
  };

  if (isConnected) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="p-6 flex flex-col items-center text-center space-y-6 border-spotify/50">
          <div className="w-16 h-16 bg-spotify/10 rounded-full flex items-center justify-center animate-pulse">
            <Music2 className="w-8 h-8 text-spotify" />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-xl">Welcome Back!</h3>
            <p className="text-muted-foreground">
              You are currently connected to Spotify.
            </p>
          </div>

          <div className="w-full space-y-3">
            <Button
              className="w-full bg-spotify hover:bg-spotify/90 h-11 text-lg"
              onClick={onContinue}
            >
              Continue with Spotify
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={onDisconnect}
            >
              Switch Account
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="p-6 flex flex-col items-center text-center space-y-4 hover:border-spotify/50 transition-colors cursor-pointer" onClick={handleConnect}>
        <div className="w-12 h-12 bg-spotify/10 rounded-full flex items-center justify-center">
          <Music2 className="w-6 h-6 text-spotify" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Connect Spotify Account</h3>
          <p className="text-sm text-muted-foreground">
            Access all your playlists and liked songs
          </p>
        </div>
        <Button className="w-full bg-spotify hover:bg-spotify/90">
          Connect Spotify
        </Button>
      </Card>

      <Card className="p-6 flex flex-col items-center text-center space-y-4 hover:border-primary/50 transition-colors relative overflow-hidden">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <LinkIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Paste Playlist Link</h3>
          <p className="text-sm text-muted-foreground">
            Transfer a single public playlist
          </p>
        </div>

        {showLinkInput ? (
          <form onSubmit={handleLinkSubmit} className="w-full space-y-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex gap-2">
              <Input
                placeholder="https://open.spotify.com/playlist/..."
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                className="text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <Button type="submit" size="icon">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowLinkInput(false);
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowLinkInput(true)}
          >
            Enter URL
          </Button>
        )}
      </Card>
    </div>
  );
};
