import { User, Globe, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DestinationChoiceProps {
    onSelect: (mode: "private" | "public") => void;
    selectedMode: "private" | "public" | null;
}

export const DestinationChoice = ({ onSelect, selectedMode }: DestinationChoiceProps) => {
    return (
        <div className="grid md:grid-cols-2 gap-6">
            <Card
                className={cn(
                    "p-6 cursor-pointer transition-all hover:border-primary relative overflow-hidden group",
                    selectedMode === "private" ? "border-primary ring-2 ring-primary/20" : "border-border"
                )}
                onClick={() => onSelect("private")}
            >
                <div className="absolute top-4 right-4">
                    <div className={cn(
                        "w-6 h-6 rounded-full border flex items-center justify-center transition-colors",
                        selectedMode === "private"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                    )}>
                        {selectedMode === "private" && <Check className="w-4 h-4" />}
                    </div>
                </div>

                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <User className="w-6 h-6 text-primary" />
                </div>

                <h3 className="text-xl font-semibold mb-2">My Account</h3>
                <p className="text-muted-foreground text-sm mb-4">
                    Transfer playlists directly to your own YouTube Music account.
                </p>
                <div className="text-xs bg-secondary/50 p-2 rounded text-muted-foreground">
                    Requires providing your YouTube Music browser headers.
                </div>
            </Card>

            <Card
                className={cn(
                    "p-6 cursor-pointer transition-all hover:border-primary relative overflow-hidden group",
                    selectedMode === "public" ? "border-primary ring-2 ring-primary/20" : "border-border"
                )}
                onClick={() => onSelect("public")}
            >
                <div className="absolute top-4 right-4">
                    <div className={cn(
                        "w-6 h-6 rounded-full border flex items-center justify-center transition-colors",
                        selectedMode === "public"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                    )}>
                        {selectedMode === "public" && <Check className="w-4 h-4" />}
                    </div>
                </div>

                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Globe className="w-6 h-6 text-blue-500" />
                </div>

                <h3 className="text-xl font-semibold mb-2">Public Playlist</h3>
                <p className="text-muted-foreground text-sm mb-4">
                    Create a public playlist on our server account.
                </p>
                <div className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 p-2 rounded border border-yellow-500/20">
                    ⚠️ Playlist will be deleted after 30 minutes. Clone it to save!
                </div>
            </Card>
        </div>
    );
};
