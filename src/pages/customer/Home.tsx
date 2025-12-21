import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Search, Utensils, ShoppingBag } from "lucide-react";
import { PromotionsBanner } from "@/components/customer/PromotionsBanner";
import { supabase } from "@/integrations/supabase/client";

import { StoreCard } from "@/components/customer/StoreCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const FOOD_TAGS = [
  { name: "الكل", value: "", icon: "🍽️" },
  { name: "برجر", value: "برجر", icon: "🍔" },
  { name: "بيتزا", value: "بيتزا", icon: "🍕" },
  { name: "شاورما", value: "شاورما", icon: "🌯" },
  { name: "مشويات", value: "مشويات", icon: "🍢" },
  { name: "حلا", value: "حلا", icon: "🍰" },
  { name: "قهوة", value: "قهوة", icon: "☕" },
  { name: "أرز", value: "أرز", icon: "🍚" },
  { name: "سوشي", value: "سوشي", icon: "🍣" },
];

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

  const { data: productMatchIds = [] } = useQuery({
    queryKey: ["product-matches", search],
    queryFn: async () => {
      if (!search) return [];
      const { data } = await supabase
        .from("products")
        .select("store_id")
        .ilike("name", `%${search}%`);

      // Return unique store match IDs
      return [...new Set(data?.map((p) => p.store_id) || [])];
    },
    enabled: search.length > 0,
  });

  const filteredStores = stores?.filter((store) => {
    const matchesSearch =
      store.name.toLowerCase().includes(search.toLowerCase()) ||
      productMatchIds.includes(store.id);

    let matchesFilter = true;
    if (filter !== "all") {
      matchesFilter = store.type === filter;
    }

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
          <div className="relative mb-6">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن متجر أو وجبة (مثال: برجر)..."
              className="pr-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Quick Filters (Tags) */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
            {FOOD_TAGS.map((tag) => (
              <Button
                key={tag.name}
                variant={
                  search === tag.value || (tag.value === "" && search === "")
                    ? "default"
                    : "outline"
                }
                className="rounded-full px-4 h-9 whitespace-nowrap"
                onClick={() => setSearch(tag.value)}
              >
                <span className="ml-2">{tag.icon}</span>
                {tag.name}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Promotions Banner */}
      <PromotionsBanner />

      <section className="container max-w-4xl mx-auto px-4 pb-20">
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
