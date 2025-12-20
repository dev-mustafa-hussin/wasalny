import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Utensils, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { StoreCard } from "@/components/customer/StoreCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "restaurant" | "market">("all");

  const { data: stores, isLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredStores = stores?.filter((store) => {
    const matchesSearch = store.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter = filter === "all" || store.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12">
        <div className="container">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
            اطلب من مطاعمك وأسواقك المفضلة
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            توصيل سريع لباب منزلك
          </p>

          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="ابحث عن مطعم أو سوق..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="container py-6">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
        >
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="restaurant" className="flex items-center gap-1">
              <Utensils className="h-4 w-4" />
              مطاعم
            </TabsTrigger>
            <TabsTrigger value="market" className="flex items-center gap-1">
              <ShoppingBag className="h-4 w-4" />
              أسواق
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </section>

      {/* Stores Grid */}
      <section className="container pb-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : filteredStores?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد نتائج</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores?.map((store) => (
              <StoreCard
                key={store.id}
                id={store.id}
                name={store.name}
                description={store.description}
                type={store.type}
                address={store.address}
                openingTime={store.opening_time}
                closingTime={store.closing_time}
                imageUrl={store.image_url}
                isActive={store.is_active}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
