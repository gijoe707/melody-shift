import { YouTubeHeaders } from "./YouTubeHeaders";
import { YouTubeMusicHeaders } from "@/types/api";

interface YouTubeConnectionChoiceProps {
  onSubmit: (headers: YouTubeMusicHeaders, playlistLink?: string) => void;
}

export const YouTubeConnectionChoice = ({ onSubmit }: YouTubeConnectionChoiceProps) => {
  return <YouTubeHeaders onSubmit={(headers) => onSubmit(headers)} />;
};
