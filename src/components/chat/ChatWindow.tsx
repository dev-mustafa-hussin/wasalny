import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MapPin, Phone, CheckCheck, X } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender_id: string | null;
  msg_type: "text" | "image" | "system_pickup" | "system_tracking";
  metadata: any;
  created_at: string;
}

interface ChatWindowProps {
  orderId: string;
  currentUserId: string;
  otherUserName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatWindow({
  orderId,
  currentUserId,
  otherUserName,
  isOpen,
  onClose,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchRoom = async () => {
      // Find room for this order
      // @ts-ignore
      const { data: room, error } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("order_id", orderId)
        .single();

      if (room) {
        setRoomId(room.id);
        subscribeToMessages(room.id);
        fetchMessages(room.id);
      } else {
        // If no room exists yet (and user is driving interaction), maybe create it?
        // But logic says Room is created on 'Accept', so it SHOULD exist if status > pending.
        console.log("No chat room found for order", orderId);
      }
    };

    fetchRoom();

    return () => {
      supabase.removeAllChannels();
    };
  }, [isOpen, orderId]);

  const fetchMessages = async (rid: string) => {
    // @ts-ignore
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", rid)
      .order("created_at", { ascending: true });

    if (data) setMessages(data as Message[]);
    scrollToBottom();
  };

  const subscribeToMessages = (rid: string) => {
    supabase
      // @ts-ignore
      .channel(`room:${rid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${rid}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          scrollToBottom();
        }
      )
      .subscribe();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !roomId) return;

    // @ts-ignore
    const { error } = await supabase.from("messages").insert({
      room_id: roomId,
      sender_id: currentUserId,
      content: newMessage,
      msg_type: "text",
    });

    if (error) {
      toast.error("لم يتم إرسال الرسالة");
    } else {
      setNewMessage("");
    }
  };

  // Render System Message Card
  const renderSystemMessage = (msg: Message) => {
    const { driver_name, driver_phone } = msg.metadata || {};

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 w-[90%] text-center shadow-sm">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white">
              <MapPin className="h-6 w-6" />
            </div>
          </div>
          <p className="font-bold text-lg text-primary mb-1">{msg.content}</p>
          {driver_name && (
            <p className="text-sm text-muted-foreground mb-3">
              المندوب <b>{driver_name}</b> في طريقه إليك!
            </p>
          )}

          <div className="flex gap-2 justify-center mt-2">
            <Button size="sm" variant="default" className="gap-2">
              <MapPin className="h-4 w-4" />
              تتبع الطلب
            </Button>
            {driver_phone && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => window.open(`tel:${driver_phone}`)}
              >
                <Phone className="h-4 w-4" />
                اتصال
              </Button>
            )}
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {new Date(msg.created_at).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 left-4 w-[350px] h-[500px] bg-background border rounded-xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="p-4 border-b bg-primary text-primary-foreground rounded-t-xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUserName}`}
            />
            <AvatarFallback>{otherUserName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-sm">{otherUserName}</h3>
            <span className="text-xs opacity-80 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              متصل الآن
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-primary/80"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-muted/30 custom-scrollbar">
        <div className="flex flex-col gap-3">
          {messages.map((msg) => {
            if (msg.msg_type.startsWith("system_")) {
              return <div key={msg.id}>{renderSystemMessage(msg)}</div>;
            }

            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-white border shadow-sm rounded-tl-none"
                  }`}
                >
                  <p>{msg.content}</p>
                  <div
                    className={`text-[10px] flex items-center justify-end gap-1 mt-1 ${
                      isMe
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {isMe && <CheckCheck className="h-3 w-3" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-background flex gap-2">
        <Input
          placeholder="اكتب رسالتك..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="rounded-full"
        />
        <Button size="icon" className="rounded-full" onClick={sendMessage}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
