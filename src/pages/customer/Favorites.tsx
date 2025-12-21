import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreCard } from "@/components/customer/StoreCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

export default function Favorites() {
  const { user } = useAuth();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
          store_id,
          stores (
            *
          )
        `
        )
        .eq("user_id", user.id);

      if (error) throw error;

      // Transform data to match StoreCard props structure if needed
      // Assuming stores returns the store object
      return data.map((item) => item.stores).filter(Boolean);
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="flex items-center gap-2 text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground transition-colors">
              <ArrowRight className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">المفضلة</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[280px] w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container py-8">
        <div className="flex items-center gap-2 text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">المفضلة</h1>
        </div>

        {!favorites || favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">لا توجد متاجر مفضلة</h2>
            <p className="text-muted-foreground mb-6">
              قم بإضافة المتاجر والمطاعم إلى المفضلة لتصل إليها بسرعة
            </p>
            <Button asChild>
              <Link to="/">تصفح المتاجر</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((store: any) => (
              <StoreCard
                key={store.id}
                id={store.id}
                name={store.name}
                description={store.description}
                imageUrl={store.image_url}
                address={store.address}
                type={store.type}
                openingTime={store.opening_time}
                closingTime={store.closing_time}
                isActive={store.is_active}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
