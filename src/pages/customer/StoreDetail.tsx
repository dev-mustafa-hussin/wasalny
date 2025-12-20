import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, MapPin, Phone, Store, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { ProductCard } from '@/components/customer/ProductCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/contexts/CartContext';

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const { getItemCount, getTotal } = useCart();
  const itemCount = getItemCount();
  const total = getTotal();

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['store', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const isLoading = storeLoading || productsLoading;

  return (
    <div className="min-h-screen bg-background pb-24">
      <CustomerHeader />

      <div className="container py-6">
        <Link
          to="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowRight className="h-4 w-4 ml-1" />
          العودة للرئيسية
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          </div>
        ) : store ? (
          <>
            {/* Store Header */}
            <div className="relative h-48 md:h-64 rounded-lg overflow-hidden mb-6 bg-muted">
              {store.image_url ? (
                <img
                  src={store.image_url}
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Store className="h-24 w-24 text-muted-foreground/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
              <div className="absolute bottom-4 right-4 left-4">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {store.name}
                </h1>
                {store.description && (
                  <p className="text-muted-foreground mt-1">{store.description}</p>
                )}
              </div>
            </div>

            {/* Store Info */}
            <div className="flex flex-wrap gap-4 mb-8 text-sm text-muted-foreground">
              {store.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {store.address}
                </div>
              )}
              {store.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {store.phone}
                </div>
              )}
              {store.opening_time && store.closing_time && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {store.opening_time} - {store.closing_time}
                </div>
              )}
            </div>

            {/* Products */}
            <h2 className="text-xl font-semibold mb-4">المنتجات</h2>
            {products?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                لا توجد منتجات حالياً
              </p>
            ) : (
              <div className="grid gap-4">
                {products?.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    description={product.description}
                    price={Number(product.price)}
                    imageUrl={product.image_url}
                    isAvailable={product.is_available}
                    storeId={store.id}
                    storeName={store.name}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-center py-12 text-muted-foreground">المتجر غير موجود</p>
        )}
      </div>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
          <div className="container">
            <Button asChild className="w-full" size="lg">
              <Link to="/cart" className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>عرض السلة ({itemCount})</span>
                </div>
                <span>{total.toFixed(2)} ر.س</span>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
