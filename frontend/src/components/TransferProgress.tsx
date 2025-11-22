import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { TransferJob } from "@/types/api";
import { cn } from "@/lib/utils";

interface TransferProgressProps {
  jobId: string;
  onComplete: () => void;
}

export const TransferProgress = ({ jobId, onComplete }: TransferProgressProps) => {
  const [job, setJob] = useState<TransferJob | null>(null);
  const [polling, setPolling] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Simulate logs based on progress updates
  useEffect(() => {
    if (!job) return;

    if (job.status === "processing" && job.progress.currentPlaylist) {
      const newLog = `Processing: ${job.progress.currentPlaylist} (${job.progress.processed || 0}/${job.progress.totalTracks || 0})`;
      setLogs(prev => {
        // Avoid duplicate consecutive logs
        if (prev[prev.length - 1] === newLog) return prev;
        return [...prev.slice(-4), newLog]; // Keep last 5 logs
      });
    } else if (job.status === "completed") {
      setLogs(prev => [...prev, "Transfer completed successfully!"]);
    } else if (job.status === "failed") {
      setLogs(prev => [...prev, "Transfer failed."]);
    }
  }, [job?.progress.processed, job?.progress.currentPlaylist, job?.status]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    if (!polling) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/transfer-status?jobId=${jobId}`
        );
        const data = await response.json();
        setJob(data);

        if (data.status === "completed" || data.status === "failed") {
          setPolling(false);
          // Add a small delay before calling onComplete to let the user see the 100% state
          if (data.status === "completed") {
            setTimeout(onComplete, 1500);
          }
        }
      } catch (error) {
        console.error("Failed to fetch job status:", error);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 1000); // Faster polling for smoother UI

    return () => clearInterval(interval);
  }, [jobId, polling, onComplete]);

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
        </div>
        <p className="text-lg text-muted-foreground font-medium animate-pulse">Initializing transfer...</p>
      </div>
    );
  }

  // Calculate global progress
  const globalProcessed = job.progress.globalProcessed || 0;
  const grandTotal = job.progress.grandTotalTracks || 1; // Avoid div by zero

  const progressPercent = (globalProcessed / grandTotal) * 100;

  const isComplete = job.status === "completed";
  const isFailed = job.status === "failed";

  return (
    <div className="max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Main Status Card */}
      <Card className="relative overflow-hidden border-white/10 bg-black/40 backdrop-blur-xl p-8">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-primary/10 to-transparent opacity-50 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          {/* Circular Progress */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Outer Ring (Background) */}
            <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-secondary"
              />
              {/* Progress Ring */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                className={cn("text-primary transition-all duration-1000 ease-out", isComplete && "text-green-500", isFailed && "text-red-500")}
                strokeDasharray="283" // 2 * PI * 45
                strokeDashoffset={283 - (283 * Math.min(progressPercent, 100)) / 100}
              />
            </svg>

            {/* Center Icon/Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              {isComplete ? (
                <CheckCircle2 className="w-12 h-12 text-green-500 animate-in zoom-in duration-500" />
              ) : isFailed ? (
                <XCircle className="w-12 h-12 text-red-500 animate-in zoom-in duration-500" />
              ) : (
                <div className="space-y-1">
                  <span className="text-2xl font-bold tabular-nums tracking-tighter block">
                    {globalProcessed}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest block">
                    of {grandTotal} songs
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status Text */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">
              {isComplete ? "Transfer Complete!" : isFailed ? "Transfer Failed" : "Transferring..."}
            </h2>

            {!isComplete && !isFailed && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processing Playlist {(job.progress.current ?? 0) + 1} of {job.progress.total ?? 1}
              </p>
            )}

            {isComplete && (
              <p className="text-sm text-muted-foreground">
                All tracks processed.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
