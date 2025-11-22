import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Music2 } from "lucide-react";
import { saveSpotifyToken } from "@/lib/api";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const storedState = localStorage.getItem("spotify_auth_state");

      if (!code || !state || state !== storedState) {
        console.error("Invalid callback");
        navigate("/");
        return;
      }

      try {
        // Exchange code for token via backend
        // Use root URL for Spotify redirect (no hash), then handle callback on root page
        const redirectUri = `${window.location.origin}/melody-shift/`;

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/spotify/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirectUri
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to exchange code for token');
        }

        const data = await response.json();

        // Store session ID
        localStorage.setItem("spotify_session_id", data.sessionId);
        localStorage.removeItem("spotify_auth_state");

        // Redirect back to main page
        navigate("/?connected=true");
      } catch (error) {
        console.error("Failed to complete Spotify authentication:", error);
        navigate("/");
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-spotify/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <Music2 className="w-8 h-8 text-spotify" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Connecting to Spotify...
        </h2>
        <p className="text-muted-foreground">Please wait while we complete the authentication</p>
      </div>
    </div>
  );
};

export default AuthCallback;
