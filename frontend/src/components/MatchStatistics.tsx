import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, CheckCircle2, Copy, XCircle } from "lucide-react";

import { useState } from "react";
import { cn } from "@/lib/utils";

import { ProcessedTrack } from "@/types/api";

interface MatchStatisticsProps {
  tracks: ProcessedTrack[];
  exactMatches: number;
  titleMatches: number;
  duplicates: number;
}

export const MatchStatistics = ({ tracks, exactMatches, titleMatches, duplicates }: MatchStatisticsProps) => {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const exactMatchTracks = tracks.filter(t => t.matchType === 'exact' && t.status === 'success');
  const titleMatchTracks = tracks.filter(t => t.matchType === 'title' && t.status === 'success');
  const duplicateTracks = tracks.filter(t => t.isDuplicate);
  const failedTracks = tracks.filter(t => t.status === 'failed');

  const TrackComparison = ({ track }: { track: ProcessedTrack }) => (
    <Card className="p-3 bg-secondary/30 border-border">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Spotify Side */}
        <div className="flex items-center gap-2 min-w-0">
          {track.spotifyImage ? (
            <img
              src={track.spotifyImage}
              alt=""
              className="w-10 h-10 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
              <Music className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {track.spotifyName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {track.spotifyArtist}
            </p>
            <p className="text-[10px] text-spotify font-medium">Spotify</p>
          </div>
        </div>

        <div className="text-muted-foreground text-xs">→</div>

        {/* YouTube Side */}
        <div className="flex items-center gap-2 min-w-0">
          {track.status === 'failed' ? (
            <div className="flex items-center gap-2 w-full opacity-50">
              <div className="w-10 h-10 bg-youtube/10 rounded flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-youtube" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-youtube">Not Found</p>
                <p className="text-[10px] text-muted-foreground">Could not match track</p>
              </div>
            </div>
          ) : (
            <>
              {track.ytImage ? (
                <img
                  src={track.ytImage}
                  alt=""
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  <Music className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {track.ytName}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {track.ytArtist}
                </p>
                <p className="text-[10px] text-youtube font-medium">YouTube Music</p>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Exact Matches */}
        <button
          onClick={() => setOpenSection(openSection === 'exact' ? null : 'exact')}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200",
            openSection === 'exact'
              ? "bg-spotify/20 border-spotify/50 ring-1 ring-spotify/50"
              : "bg-spotify/5 border-spotify/20 hover:bg-spotify/10"
          )}
        >
          <CheckCircle2 className="w-4 h-4 text-spotify mb-1" />
          <span className="text-lg font-bold text-spotify">{exactMatches}</span>
          <span className="text-[10px] font-medium text-muted-foreground">Exact</span>
        </button>

        {/* Title Matches */}
        <button
          onClick={() => setOpenSection(openSection === 'title' ? null : 'title')}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200",
            openSection === 'title'
              ? "bg-blue-500/20 border-blue-500/50 ring-1 ring-blue-500/50"
              : "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10"
          )}
        >
          <Music className="w-4 h-4 text-blue-500 mb-1" />
          <span className="text-lg font-bold text-blue-500">{titleMatches}</span>
          <span className="text-[10px] font-medium text-muted-foreground">Title</span>
        </button>

        {/* Failed Matches */}
        <button
          onClick={() => setOpenSection(openSection === 'failed' ? null : 'failed')}
          disabled={failedTracks.length === 0}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200",
            failedTracks.length === 0 && "opacity-50 cursor-not-allowed",
            openSection === 'failed'
              ? "bg-youtube/20 border-youtube/50 ring-1 ring-youtube/50"
              : "bg-youtube/5 border-youtube/20 hover:bg-youtube/10"
          )}
        >
          <XCircle className="w-4 h-4 text-youtube mb-1" />
          <span className="text-lg font-bold text-youtube">{failedTracks.length}</span>
          <span className="text-[10px] font-medium text-muted-foreground">Failed</span>
        </button>

        {/* Duplicates */}
        <button
          onClick={() => setOpenSection(openSection === 'duplicates' ? null : 'duplicates')}
          disabled={duplicates === 0}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200",
            duplicates === 0 && "opacity-50 cursor-not-allowed",
            openSection === 'duplicates'
              ? "bg-yellow-500/20 border-yellow-500/50 ring-1 ring-yellow-500/50"
              : "bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10"
          )}
        >
          <Copy className="w-4 h-4 text-yellow-500 mb-1" />
          <span className="text-lg font-bold text-yellow-500">{duplicates}</span>
          <span className="text-[10px] font-medium text-muted-foreground">Duplicates</span>
        </button>
      </div>

      {/* Content Area */}
      {openSection && (
        <Card className="bg-black/20 border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
            <h4 className="font-medium text-xs">
              {openSection === 'exact' && "Exact Matches"}
              {openSection === 'title' && "Title Matches"}
              {openSection === 'failed' && "Failed / Missing Tracks"}
              {openSection === 'duplicates' && "Duplicate Tracks"}
            </h4>
            <button
              onClick={() => setOpenSection(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <ScrollArea className="h-auto w-full rounded-md border border-white/5 bg-black/20 [&>[data-radix-scroll-area-viewport]]:max-h-[300px]">
            <div className="p-3 space-y-2">
              {openSection === 'exact' && exactMatchTracks.map((track, i) => <TrackComparison key={i} track={track} />)}
              {openSection === 'title' && titleMatchTracks.map((track, i) => <TrackComparison key={i} track={track} />)}
              {openSection === 'failed' && failedTracks.map((track, i) => <TrackComparison key={i} track={track} />)}
              {openSection === 'duplicates' && duplicateTracks.map((track, i) => <TrackComparison key={i} track={track} />)}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};
