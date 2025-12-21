import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Percent } from "lucide-react";

export function CustomerFooter() {
  return (
    <footer className="bg-primary/5 border-t mt-auto pt-10 pb-6 text-sm">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary">وصلني</h3>
            <p className="text-muted-foreground mb-4">
              تطبيقك المفضل لتوصيل الطعام والمقاضي بسرعة وسهولة.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">روابط سريعة</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-muted-foreground hover:text-primary"
                >
                  الرئيسية
                </Link>
              </li>
              <li>
                <Link
                  to="/profile"
                  className="text-muted-foreground hover:text-primary"
                >
                  حسابي
                </Link>
              </li>
              <li>
                <Link
                  to="/my-orders"
                  className="text-muted-foreground hover:text-primary"
                >
                  طلباتي
                </Link>
              </li>
              <li>
                <Link
                  to="/favorites"
                  className="text-muted-foreground hover:text-primary"
                >
                  المفضلة
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">الدعم والمساعدة</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/contact"
                  className="text-muted-foreground hover:text-primary"
                >
                  اتصل بنا
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-muted-foreground hover:text-primary"
                >
                  الأسئلة الشائعة
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary"
                >
                  الشروط والأحكام
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className="text-muted-foreground hover:text-primary"
                >
                  سياسة الخصوصية
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">حمل التطبيق</h4>
            <div className="space-y-3">
              <div className="bg-black text-white p-2 rounded flex items-center gap-2 cursor-pointer w-fit opacity-80 hover:opacity-100 transition-opacity">
                {/* Mock App Store Button */}
                <div className="text-xs">
                  <p>Download on the</p>
                  <p className="font-bold text-sm">App Store</p>
                </div>
              </div>
              <div className="bg-black text-white p-2 rounded flex items-center gap-2 cursor-pointer w-fit opacity-80 hover:opacity-100 transition-opacity">
                {/* Mock Google Play Button */}
                <div className="text-xs">
                  <p>GET IT ON</p>
                  <p className="font-bold text-sm">Google Play</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} وصلني. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
