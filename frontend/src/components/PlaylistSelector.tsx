import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, Music, User, Search, CheckCircle2, Circle } from "lucide-react";
import { SpotifyPlaylist } from "@/types/api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PlaylistSelectorProps {
  playlists: SpotifyPlaylist[];
  onSelect: (playlistIds: string[], includeLiked: boolean) => void;
  likedSongsCount?: number;
}

export const PlaylistSelector = ({ playlists, onSelect, likedSongsCount }: PlaylistSelectorProps) => {
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [includeLiked, setIncludeLiked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlaylists = useMemo(() => {
    return playlists.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [playlists, searchQuery]);

  const togglePlaylist = (id: string) => {
    const newSelected = new Set(selectedPlaylists);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPlaylists(newSelected);
  };

  const handleContinue = () => {
    if (selectedPlaylists.size === 0 && !includeLiked) {
      return; // Need at least one selection
    }
    onSelect(Array.from(selectedPlaylists), includeLiked);
  };

  const totalSelected = selectedPlaylists.size + (includeLiked ? 1 : 0);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
      {/* Header & Search */}
      <div className="flex flex-col gap-4 bg-background/95 backdrop-blur sticky top-0 z-10 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-foreground">Select Playlists</h3>
            <p className="text-sm text-muted-foreground">Choose content to transfer</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-primary">{totalSelected}</span>
            <p className="text-xs text-muted-foreground">Selected</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary/50 border-white/10 focus:border-primary/50 transition-colors h-10"
          />
        </div>
      </div>

      <ScrollArea className="h-[50vh] pr-4 -mr-4">
        <div className="space-y-2 pb-4">
          {/* Liked Songs Row */}
          <div
            onClick={() => setIncludeLiked(!includeLiked)}
            className={cn(
              "group flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200 border",
              includeLiked
                ? "border-primary/50 bg-primary/10"
                : "border-transparent bg-card/40 hover:bg-card/60"
            )}
          >
            <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shrink-0">
              <Heart className={cn("w-6 h-6 text-white transition-transform", includeLiked && "scale-110 fill-white")} />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">Liked Songs</h4>
              <p className="text-xs text-muted-foreground">
                {likedSongsCount !== undefined ? `${likedSongsCount} tracks` : "Your saved tracks"}
              </p>
            </div>

            <div className="shrink-0">
              {includeLiked ? (
                <CheckCircle2 className="w-6 h-6 text-primary fill-primary/20" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground/50 group-hover:text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Playlist Rows */}
          {filteredPlaylists.map((playlist) => {
            const isSelected = selectedPlaylists.has(playlist.id);
            return (
              <div
                key={playlist.id}
                onClick={() => togglePlaylist(playlist.id)}
                className={cn(
                  "group flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200 border",
                  isSelected
                    ? "border-primary/50 bg-primary/10"
                    : "border-transparent bg-card/40 hover:bg-card/60"
                )}
              >
                <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0 relative">
                  {playlist.images?.[0] ? (
                    <img
                      src={playlist.images[0].url}
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary">
                      <Music className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className={cn("font-medium truncate transition-colors", isSelected ? "text-primary" : "text-foreground")}>
                    {playlist.name}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{playlist.tracks.total} tracks</span>
                    <span className="flex items-center gap-1 truncate max-w-[150px]">
                      <User className="w-3 h-3" />
                      {playlist.owner.display_name}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {isSelected ? (
                    <CheckCircle2 className="w-6 h-6 text-primary fill-primary/20" />
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground/50 group-hover:text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="pt-2">
        <Button
          onClick={handleContinue}
          disabled={totalSelected === 0}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-semibold h-12"
        >
          Transfer {totalSelected > 0 ? `${totalSelected} Playlists` : ""}
        </Button>
      </div>
    </div>
  );
};
