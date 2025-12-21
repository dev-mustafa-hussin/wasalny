import { Plus, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";

interface ProductCardProps {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean | null;
  storeId: string;
  storeName: string;
}

export function ProductCard({
  id,
  name,
  description,
  price,
  imageUrl,
  isAvailable,
  storeId,
  storeName,
}: ProductCardProps) {
  const { addItem, items, updateQuantity, removeItem } = useCart();
  const cartItem = items.find((i) => i.productId === id);
  const quantity = cartItem?.quantity || 0;
  const available = isAvailable !== false;

  const handleAddToCart = () => {
    addItem({
      productId: id,
      productName: name,
      price,
      quantity: 1,
      storeId,
      storeName,
    });
  };

  const handleIncrease = () => {
    updateQuantity(id, quantity + 1);
  };

  const handleDecrease = () => {
    if (quantity <= 1) {
      removeItem(id);
    } else {
      updateQuantity(id, quantity - 1);
    }
  };

  return (
    <Card className={`overflow-hidden ${!available ? "opacity-60" : ""}`}>
      <div className="flex gap-4 p-4">
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{name}</h3>
          {description && (
            <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
              {description}
            </p>
          )}
          <p className="font-bold text-primary">{price.toFixed(2)} ر.س</p>
        </div>
        <div className="flex flex-col items-center justify-between">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-20 h-20 object-cover rounded-lg"
            />
          ) : (
            <div className="w-20 h-20 bg-muted rounded-lg" />
          )}
          {available && (
            <div className="mt-2">
              {quantity === 0 ? (
                <Button
                  size="sm"
                  onClick={handleAddToCart}
                  disabled={!isAvailable}
                  className="active:scale-90 transition-transform hover:scale-105"
                >
                  إضافة
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={handleDecrease}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center font-medium">
                    {quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={handleIncrease}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
          {!available && (
            <span className="text-xs text-muted-foreground mt-2">
              غير متوفر
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
