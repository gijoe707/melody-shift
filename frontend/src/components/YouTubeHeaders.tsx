import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileText, CheckCircle2, Info, ChevronDown, ChevronUp, PlayCircle, AlertCircle } from "lucide-react";
import { YouTubeMusicHeaders } from "@/types/api";
import { cn } from "@/lib/utils";

interface YouTubeHeadersProps {
  onSubmit: (headers: YouTubeMusicHeaders) => void;
  headers?: YouTubeMusicHeaders | null;
  onBack?: () => void;
}

export const YouTubeHeaders = ({ onSubmit, headers, onBack }: YouTubeHeadersProps) => {
  const [headersText, setHeadersText] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showExample, setShowExample] = useState(false);

  const parseHeaders = (text: string): YouTubeMusicHeaders => {
    try {
      // Try parsing as JSON first
      return JSON.parse(text);
    } catch {
      // Parse as plain text headers
      const lines = text.split("\n");
      const parsed: Record<string, string> = {};

      lines.forEach(line => {
        const [key, ...valueParts] = line.split(":");
        if (key && valueParts.length > 0) {
          parsed[key.trim().toLowerCase()] = valueParts.join(":").trim();
        }
      });

      return parsed;
    }
  };

  const handleSubmit = async () => {
    try {
      const parsed = parseHeaders(headersText);

      if (!parsed.authorization && !parsed.cookie) {
        setError("Headers must include at least authorization or cookie");
        return;
      }

      setError("");
      setVerifying(true);

      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setVerifying(false);
      onSubmit(parsed);
    } catch (err) {
      setVerifying(false);
      setError("Invalid headers format. Please check your headers.");
    }
  };



  if (headers) {
    return (
      <Card className="max-w-2xl mx-auto border-none shadow-2xl bg-gradient-to-b from-zinc-900 to-black overflow-hidden">
        <div className="p-12 text-center space-y-6">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-green-500/20">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              YouTube Music Connected
            </h3>
            <p className="text-zinc-400">
              Your authentication headers have been verified and saved.
            </p>
          </div>
          <Button
            onClick={() => onSubmit(headers)}
            className="w-full max-w-xs bg-white text-black hover:bg-zinc-200 transition-all duration-300 font-medium"
          >
            Continue
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto border-zinc-800 bg-zinc-950/50 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Header Section */}
      <div className="relative p-8 pb-6 border-b border-zinc-800/50">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500 opacity-50" />
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-red-500/20 shadow-lg shadow-red-900/20">
            <PlayCircle className="w-7 h-7 text-red-500 fill-current" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Connect YouTube Music
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              To create playlists on your account, we need your authentication headers.
              This allows us to interact with YouTube Music on your behalf.
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Instructions Accordion */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden transition-all duration-300">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-zinc-200">How to get your headers</span>
            </div>
            {showInstructions ? (
              <ChevronUp className="w-5 h-5 text-zinc-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-500" />
            )}
          </button>

          <div className={cn(
            "grid transition-all duration-300 ease-in-out",
            showInstructions ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}>
            <div className="overflow-hidden">
              <div className="p-4 pt-0 text-sm text-zinc-400 space-y-4 border-t border-zinc-800/50">
                <div className="grid gap-4 md:grid-cols-2 pt-4">
                  <div className="space-y-2">
                    <div className="font-medium text-zinc-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">1</span>
                      Open Developer Tools
                    </div>
                    <p className="pl-7">Go to <a href="https://music.youtube.com" target="_blank" rel="noreferrer" className="text-red-400 hover:underline">music.youtube.com</a> and press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono text-xs">F12</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono text-xs">Ctrl+Shift+I</kbd></p>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium text-zinc-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">2</span>
                      Find Request
                    </div>
                    <p className="pl-7">In <strong>Network</strong> tab, filter by "browse". Find a request (usually POST) with status 200.</p>
                    <div className="pl-7 mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3 items-start">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-200">
                        <strong>Don't see any requests?</strong> Try going to your <strong>Library</strong> or playing a song to force a new request.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <div className="font-medium text-zinc-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">3</span>
                      Copy Headers
                    </div>
                    <div className="pl-7 grid md:grid-cols-2 gap-4">
                      <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                        <span className="block text-xs font-semibold text-zinc-500 mb-1">Firefox</span>
                        Right click request → Copy → Copy Request Headers
                      </div>
                      <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                        <span className="block text-xs font-semibold text-zinc-500 mb-1">Chrome / Edge</span>
                        Headers tab → Request Headers → Copy all
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Example Accordion */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden transition-all duration-300 mt-4">
          <button
            onClick={() => setShowExample(!showExample)}
            className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-green-400" />
              <span className="font-medium text-zinc-200">View example input</span>
            </div>
            {showExample ? (
              <ChevronUp className="w-5 h-5 text-zinc-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-500" />
            )}
          </button>

          <div className={cn(
            "grid transition-all duration-300 ease-in-out",
            showExample ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}>
            <div className="overflow-hidden">
              <div className="p-4 pt-0 text-sm text-zinc-400 border-t border-zinc-800/50">
                <div className="pt-4 bg-black/50 rounded-lg p-4 font-mono text-xs overflow-x-auto text-zinc-300 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                  <div className="space-y-0.5">
                    <div>POST /youtubei/v1/browse?prettyPrint=false HTTP/3</div>
                    <div>Host: music.youtube.com</div>
                    <div className="text-green-400">User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 <span className="text-green-300 font-semibold">(REQUIRED)</span></div>
                    <div>Accept: */*</div>
                    <div>Accept-Language: en-US,en;q=0.9</div>
                    <div>Accept-Encoding: gzip, deflate, br</div>
                    <div className="text-green-400">Content-Type: application/json <span className="text-green-300 font-semibold">(REQUIRED)</span></div>
                    <div>Content-Length: 1234</div>
                    <div>Referer: https://music.youtube.com/</div>
                    <div>X-Goog-Visitor-Id: Cgt4eXp4eXp4eXp4...</div>
                    <div>X-Youtube-Bootstrap-Logged-In: true</div>
                    <div>X-Youtube-Client-Name: 67</div>
                    <div>X-Youtube-Client-Version: 1.20241120.01.00</div>
                    <div className="text-green-400">X-Goog-AuthUser: 0 <span className="text-green-300 font-semibold">(REQUIRED)</span></div>
                    <div className="text-green-400">X-Origin: https://music.youtube.com <span className="text-green-300 font-semibold">(REQUIRED)</span></div>
                    <div>Origin: https://music.youtube.com</div>
                    <div>Sec-Fetch-Dest: empty</div>
                    <div>Sec-Fetch-Mode: same-origin</div>
                    <div>Sec-Fetch-Site: same-origin</div>
                    <div className="text-green-400">Authorization: SAPISIDHASH 1234567890_abcdef1234567890abcdef1234567890abcdef12 <span className="text-green-300 font-semibold">(REQUIRED)</span></div>
                    <div>Connection: keep-alive</div>
                    <div>Alt-Used: music.youtube.com</div>
                    <div className="text-green-400">Cookie: VISITOR_INFO1_LIVE=abcdefghijk; PREF=tz=America.New_York; YSC=xyz123abc; ... <span className="text-green-300 font-semibold">(REQUIRED)</span></div>
                    <div>Priority: u=1</div>
                    <div>TE: trailers</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          <Textarea
            placeholder="Paste your headers here... (Check above for example)"
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
            className="min-h-[200px] font-mono text-sm bg-zinc-900/50 border-zinc-800 focus:border-red-500/50 focus:ring-red-500/20 resize-none p-4 leading-relaxed"
          />

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!headersText || verifying}
            className="w-full h-12 text-base font-medium bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 transition-all duration-300"
          >
            {verifying ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying Headers...
              </span>
            ) : (
              "Verify & Continue"
            )}
          </Button>
        </div>
      </div>
    </Card >
  );
};

