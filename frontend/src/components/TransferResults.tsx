// Force refresh
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Music2, ExternalLink, AlertCircle, RefreshCcw } from "lucide-react";
import { TransferResult } from "@/types/api";
import { MatchStatistics } from "./MatchStatistics";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

interface TransferResultsProps {
  results: TransferResult[];
  onReset: () => void;
}

export const TransferResults = ({ results, onReset }: TransferResultsProps) => {
  const totalTracks = results.reduce((sum, r) => sum + r.tracks, 0);
  const totalMatched = results.reduce((sum, r) => sum + r.matched, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const successRate = totalTracks > 0 ? Math.round((totalMatched / totalTracks) * 100) : 0;

  useEffect(() => {
    // Trigger confetti on mount
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      {/* Header Section */}
      <div className="text-center space-y-4 py-6">
        <div className="inline-flex items-center justify-center p-3 bg-spotify/10 rounded-full ring-1 ring-spotify/20 mb-2 animate-in zoom-in duration-500 delay-100">
          <CheckCircle2 className="w-10 h-10 text-spotify" />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-spotify to-youtube bg-clip-text text-transparent">
            Transfer Complete!
          </h2>
          <p className="text-base text-muted-foreground max-w-lg mx-auto">
            Successfully processed <span className="text-foreground font-medium">{totalTracks} tracks</span> across <span className="text-foreground font-medium">{results.length} playlists</span> with a <span className="text-spotify font-bold">{successRate}% success rate</span>.
          </p>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4 bg-card/30 backdrop-blur border-white/5 hover:bg-white/5 transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform duration-300">
              <Music2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Tracks</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">{totalTracks}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/30 backdrop-blur border-white/5 hover:bg-white/5 transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-spotify/10 text-spotify group-hover:scale-110 transition-transform duration-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Matched</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">{totalMatched}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/30 backdrop-blur border-white/5 hover:bg-white/5 transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-youtube/10 text-youtube group-hover:scale-110 transition-transform duration-300">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">{totalFailed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Results (Ticket Style) */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground px-1">Playlist Results</h3>
        <div className="grid gap-3">
          {results.map((result, index) => {
            const playlistSuccessRate = result.tracks > 0
              ? Math.round((result.matched / result.tracks) * 100)
              : 0;

            return (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl border border-white/5 bg-card/20 hover:bg-card/40 transition-all duration-300"
              >
                {/* Left Border Accent */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1",
                  playlistSuccessRate === 100 ? "bg-spotify" : playlistSuccessRate > 50 ? "bg-yellow-500" : "bg-youtube"
                )} />

                <div className="p-4 flex flex-col md:flex-row items-center gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
                    <Music2 className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center md:text-left space-y-0.5 min-w-0">
                    <h4 className="text-base font-semibold text-foreground truncate">
                      {result.playlistName || `Playlist ${index + 1}`}
                    </h4>
                    <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-muted-foreground">
                      <span className={cn(
                        "font-medium",
                        playlistSuccessRate === 100 ? "text-spotify" : "text-yellow-400"
                      )}>
                        {playlistSuccessRate}% Success
                      </span>
                      <span>•</span>
                      <span>{result.matched} / {result.tracks} tracks</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {result.ytPlaylistUrl && (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-youtube text-white hover:bg-youtube/90 font-semibold shadow-lg shadow-youtube/10 h-8 text-xs"
                        asChild
                      >
                        <a
                          href={result.ytPlaylistUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          Open in YouTube Music
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Error Details (if any) */}
                {result.failed > 0 && (
                  <div className="bg-youtube/5 border-t border-youtube/10 p-3 text-xs">
                    <div className="flex items-center gap-2 text-youtube mb-0">
                      <AlertCircle className="w-3 h-3" />
                      <span className="font-medium">{result.failed} tracks could not be matched</span>
                    </div>
                  </div>
                )}

                {/* Detailed Statistics */}
                {result.processedTracks && result.processedTracks.length > 0 && (
                  <div className="border-t border-white/5 p-3 bg-black/20">
                    <MatchStatistics
                      tracks={result.processedTracks}
                      exactMatches={result.exactMatches || 0}
                      titleMatches={result.titleMatches || 0}
                      duplicates={result.duplicates || 0}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-center pt-6">
        <Button
          variant="outline"
          size="lg"
          onClick={onReset}
          className="gap-2 border-white/10 hover:bg-white/5"
        >
          <RefreshCcw className="w-4 h-4" />
          Transfer More Playlists
        </Button>
      </div>
    </div>
  );
};
