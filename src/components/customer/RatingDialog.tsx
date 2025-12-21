import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  targetId: string; // store_id or driver_id
  targetName?: string;
  type: "store" | "driver";
  onRatingSubmitted?: () => void;
}

export function RatingDialog({
  open,
  onOpenChange,
  orderId,
  targetId,
  targetName,
  type,
  onRatingSubmitted,
}: RatingDialogProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        target_id: targetId, // Store ID or Driver ID
        order_id: orderId,
        reviewer_id: user.id,
        rating,
        type,
        comment: comment.trim() || null,
      });

      if (error) {
        console.error(error);
        toast.error("حدث خطأ في إرسال التقييم");
      } else {
        toast.success(
          type === "driver" ? "شكراً لتقييمك للمندوب!" : "شكراً لتقييمك للمتجر!"
        );
        onRatingSubmitted?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("حدث خطأ في إرسال التقييم");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {type === "driver" ? "قيّم المندوب" : "قيّم المتجر"}
          </DialogTitle>
          <DialogDescription>
            {targetName
              ? `كيف كانت تجربتك مع ${targetName}؟`
              : `كيف كانت تجربتك مع ${
                  type === "driver" ? "المندوب" : "المتجر"
                }؟`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= displayRating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="أضف تعليقاً (اختياري)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              "إرسال التقييم"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
