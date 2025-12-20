import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export function ChatButton({ onClick, unreadCount = 0 }: ChatButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-4 left-4 h-14 w-14 rounded-full shadow-lg z-40 bg-primary hover:bg-primary/90 animate-in zoom-in duration-300"
    >
      <MessageCircle className="h-7 w-7" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 rounded-full bg-red-500 border-2 border-background">
          {unreadCount}
        </Badge>
      )}
    </Button>
  );
}
