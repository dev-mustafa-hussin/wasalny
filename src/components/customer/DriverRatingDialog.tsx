import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface DriverRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  driverId: string;
  driverName?: string;
  onRatingSubmitted?: () => void;
}

export function DriverRatingDialog({
  open,
  onOpenChange,
  orderId,
  driverId,
  driverName,
  onRatingSubmitted
}: DriverRatingDialogProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('driver_ratings')
        .insert({
          driver_id: driverId,
          order_id: orderId,
          customer_id: user.id,
          rating,
          comment: comment.trim() || null
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('لقد قمت بتقييم هذا الطلب مسبقاً');
        } else {
          throw error;
        }
      } else {
        toast.success('شكراً لتقييمك!');
        onRatingSubmitted?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('حدث خطأ في إرسال التقييم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>قيّم المندوب</DialogTitle>
          <DialogDescription>
            {driverName ? `كيف كانت تجربتك مع ${driverName}؟` : 'كيف كانت تجربة التوصيل؟'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Star Rating */}
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
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Rating Label */}
          <p className="text-center text-sm text-muted-foreground">
            {displayRating === 1 && 'سيء جداً'}
            {displayRating === 2 && 'سيء'}
            {displayRating === 3 && 'متوسط'}
            {displayRating === 4 && 'جيد'}
            {displayRating === 5 && 'ممتاز'}
          </p>

          {/* Comment */}
          <div className="space-y-2">
            <Textarea
              placeholder="أضف تعليقاً (اختياري)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-left">
              {comment.length}/500
            </p>
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
              'إرسال التقييم'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
