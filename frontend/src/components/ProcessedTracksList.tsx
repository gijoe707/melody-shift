import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Music } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface ProcessedTrack {
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

interface ProcessedTracksListProps {
  tracks: ProcessedTrack[];
}

export const ProcessedTracksList = ({ tracks }: ProcessedTracksListProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!tracks || tracks.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full p-3 bg-secondary/50 hover:bg-secondary/70 rounded-lg transition-colors">
          <span className="text-sm font-medium text-foreground">
            Processed Tracks ({tracks.length})
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ScrollArea className="h-[300px] mt-2">
          <div className="space-y-2 pr-4">
            {tracks.map((track, index) => (
              <Card key={index} className="p-3 bg-secondary/30 border-border">
                <div className="flex items-center gap-3">
                  {track.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  )}
                  
                  {/* Spotify Info */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
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
                      <p className="text-sm font-medium text-foreground truncate">
                        {track.spotifyName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.spotifyArtist}
                      </p>
                    </div>
                  </div>

                  {track.status === 'success' && (
                    <>
                      <div className="text-xs text-muted-foreground">→</div>
                      
                      {/* YouTube Info */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
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
                          <p className="text-sm font-medium text-foreground truncate">
                            {track.ytName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {track.ytArtist}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {track.isDuplicate && (
                    <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded flex-shrink-0">
                      Duplicate
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
};
