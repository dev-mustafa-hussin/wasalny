import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface OrderRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  storeId: string;
  onSuccess: () => void;
}

export function OrderRatingDialog({
  open,
  onOpenChange,
  orderId,
  storeId,
  onSuccess,
}: OrderRatingDialogProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("الرجاء اختيار التقييم");
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        rating,
        comment,
        order_id: orderId,
        store_id: storeId, // Legacy column? Or use target_id?
        // Checking schema: target_id is the main one, type='store'
        target_id: storeId,
        type: "store",
        reviewer_id: user.id,
      });

      if (error) throw error;

      // Also update order rating for quick access
      await supabase
        .from("orders")
        .update({ rating: rating })
        .eq("id", orderId);

      toast.success("تم إرسال التقييم بنجاح");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء إرسال التقييم");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>تقييم الطلب</DialogTitle>
          <DialogDescription>
            كيف كانت تجربتك؟ رأيك يهمنا ويساعدنا في التحسين.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    rating >= star
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="اكتب تعليقك هنا (اختياري)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="h-24"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "جاري الإرسال..." : "إرسال التقييم"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
