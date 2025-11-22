import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SpotifyConnectProps {
  onConnect: () => void;
  isConnected: boolean;
}

export const SpotifyConnect = ({ onConnect, isConnected }: SpotifyConnectProps) => {
  const handleConnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('spotify-auth-login');
      if (error) throw error;
      
      // Store state and redirect to Spotify
      localStorage.setItem('spotify_auth_state', data.state);
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Failed to initiate Spotify login:', error);
    }
  };

  if (isConnected) {
    return (
      <Card className="p-8 bg-card/50 backdrop-blur border-border">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <Music2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">Connected to Spotify</h3>
            <p className="text-muted-foreground mt-2">
              Your Spotify account is connected and ready
            </p>
          </div>
          <Button onClick={onConnect} variant="outline">
            Continue
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8 bg-card/50 backdrop-blur border-border">
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-spotify/20 rounded-full flex items-center justify-center mx-auto">
          <Music2 className="w-8 h-8 text-spotify" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">Connect Your Spotify</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Sign in with your Spotify account to access your playlists and liked songs
          </p>
        </div>
        <Button
          onClick={handleConnect}
          size="lg"
          className="bg-spotify hover:bg-spotify/90 text-white"
        >
          Connect Spotify Account
        </Button>
        <p className="text-xs text-muted-foreground">
          We'll request read-only access to your playlists and library
        </p>
      </div>
    </Card>
  );
};
