import { Link } from "react-router-dom";
import { Clock, MapPin, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/store/FavoriteButton";

interface StoreCardProps {
  id: string;
  name: string;
  description: string | null;
  type: string;
  address: string | null;
  openingTime: string | null;
  closingTime: string | null;
  imageUrl: string | null;
  isActive: boolean | null;
}

export function StoreCard({
  id,
  name,
  description,
  type,
  address,
  openingTime,
  closingTime,
  imageUrl,
  isActive,
}: StoreCardProps) {
  const isOpen = isActive !== false;

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <Link to={`/store/${id}`} className="block h-full">
        <div className="relative h-40 bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/5">
              <div className="rounded-full bg-background/60 p-4 backdrop-blur-sm shadow-sm">
                <Store className="h-8 w-8 text-primary" />
              </div>
            </div>
          )}
          <Badge
            className="absolute top-2 right-2"
            variant={type === "restaurant" ? "default" : "secondary"}
          >
            {type === "restaurant" ? "مطعم" : "سوق"}
          </Badge>

          {!isOpen && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <span className="text-muted-foreground font-medium">مغلق</span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-1">{name}</h3>
          {description && (
            <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
              {description}
            </p>
          )}
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            {address && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="line-clamp-1">{address}</span>
              </div>
            )}
            {openingTime && closingTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {openingTime} - {closingTime}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Link>

      {/* Button is now a direct child of Card, positioned absolutely */}
      {/* This fixes the invalid HTML of having a button inside an anchor (Link) */}
      <div className="absolute top-2 left-2 z-20">
        <FavoriteButton storeId={id} className="bg-white/80 hover:bg-white" />
      </div>
    </Card>
  );
}
