import { useState, useEffect } from "react";
import { Circle } from "lucide-react";

export const ServerStatus = () => {
    const [isOnline, setIsOnline] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(false);

    const checkServerStatus = async () => {
        setIsChecking(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const response = await fetch(`${import.meta.env.VITE_API_URL}/`, {
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            setIsOnline(response.ok);
        } catch (error) {
            setIsOnline(false);
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        // Check immediately on mount
        checkServerStatus();

        // Check every 10 seconds
        const interval = setInterval(checkServerStatus, 10000);

        return () => clearInterval(interval);
    }, []);

    if (isOnline === null) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Circle className="w-2 h-2 fill-gray-400 text-gray-400 animate-pulse" />
                <span>Checking server...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-sm">
            <Circle
                className={`w-2 h-2 ${isOnline
                    ? "fill-green-500 text-green-500"
                    : "fill-red-500 text-red-500"
                    } ${isChecking ? "animate-pulse" : ""}`}
            />
            <span className={isOnline ? "text-green-500" : "text-red-500"}>
                {isOnline ? "Server is online" : "Server is offline"}
            </span>
        </div>
    );
};
