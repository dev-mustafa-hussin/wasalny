import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function Cart() {
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const total = getTotal();

  const handleCheckout = () => {
    if (!user) {
      navigate('/auth?redirect=/checkout');
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <CustomerHeader />
        <div className="container py-12 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">السلة فارغة</h1>
          <p className="text-muted-foreground mb-6">أضف منتجات من المتاجر للبدء</p>
          <Button asChild>
            <Link to="/">تصفح المتاجر</Link>
          </Button>
        </div>
      </div>
    );
  }

  const storeName = items[0]?.storeName;

  return (
    <div className="min-h-screen bg-background pb-32">
      <CustomerHeader />
      
      <div className="container py-6">
        <Link
          to="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowRight className="h-4 w-4 ml-1" />
          متابعة التسوق
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">سلة التسوق</h1>
            <p className="text-muted-foreground">{storeName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={clearCart}>
            <Trash2 className="h-4 w-4 ml-1" />
            إفراغ السلة
          </Button>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{item.productName}</h3>
                    <p className="text-primary font-semibold">
                      {item.price.toFixed(2)} ر.س
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="text-left mt-2 text-muted-foreground text-sm">
                  المجموع: {(item.price * item.quantity).toFixed(2)} ر.س
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Checkout Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
        <div className="container">
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground">المجموع الفرعي</span>
            <span className="font-semibold">{total.toFixed(2)} ر.س</span>
          </div>
          <Button className="w-full" size="lg" onClick={handleCheckout}>
            إتمام الطلب
          </Button>
        </div>
      </div>
    </div>
  );
}
