import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PROMOTIONS = [
  {
    id: 1,
    title: "خصم 50% على أول طلب",
    description: "استخدم كود: FIRST50",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    gradient: "from-orange-500 to-red-600",
  },
  {
    id: 2,
    title: "توصيل مجاني",
    description: "لجميع الطلبات فوق 100 ر.س",
    image:
      "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    id: 3,
    title: "عرض نهاية الأسبوع",
    description: "اشتري وجبة واحصل على الثانية مجاناً",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
    gradient: "from-green-500 to-emerald-600",
  },
];

export function PromotionsBanner() {
  return (
    <div className="w-full max-w-4xl mx-auto mb-8 px-4">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {PROMOTIONS.map((promo) => (
            <CarouselItem key={promo.id} className="md:basis-1/2 lg:basis-1/2">
              <div className="p-1">
                <Card className="overflow-hidden border-0 shadow-lg">
                  <div className={`relative h-48 w-full`}>
                    <img
                      src={promo.image}
                      alt={promo.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${promo.gradient} opacity-80`}
                    />
                    <div className="absolute inset-0 p-6 flex flex-col justify-center text-white">
                      <h3 className="text-2xl font-bold mb-2">{promo.title}</h3>
                      <p className="text-white/90 mb-4 font-medium">
                        {promo.description}
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-fit font-bold"
                      >
                        اطلب الآن
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </div>
  );
}
