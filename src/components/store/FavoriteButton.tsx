import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  storeId: string;
  initialIsFavorite?: boolean;
  className?: string;
}

export function FavoriteButton({
  storeId,
  initialIsFavorite = false,
  className,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [loading, setLoading] = useState(false);

  // Ideally, we check initial state if not provided, but for list views providing it is better performance.
  // We'll rely on props or fetching if needed. For now assuming prop is passed or we default false/fetch.

  useEffect(() => {
    // If we want to self-fetch status (e.g. on a details page)
    if (initialIsFavorite === undefined) {
      checkFavoriteStatus();
    }
  }, [storeId]);

  const checkFavoriteStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("store_id", storeId)
      .maybeSingle();

    if (data) setIsFavorite(true);
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent ensuring parent click (like card navigation) doesn't fire

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("يجب عليك تسجيل الدخول لإضافة للمفضلة");
      return;
    }

    setLoading(true);

    if (isFavorite) {
      // Remove
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("store_id", storeId);

      if (!error) {
        setIsFavorite(false);
        toast.success("تم الإزالة من المفضلة");
      } else {
        toast.error("حدث خطأ");
      }
    } else {
      // Add
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, store_id: storeId });

      if (!error) {
        setIsFavorite(true);
        toast.success("تم الإضافة للمفضلة");
      } else {
        toast.error("حدث خطأ");
      }
    }
    setLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("rounded-full hover:bg-white/50", className)}
      onClick={toggleFavorite}
      disabled={loading}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-colors",
          isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"
        )}
      />
    </Button>
  );
}
