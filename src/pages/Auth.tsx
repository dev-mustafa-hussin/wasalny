import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Truck, Mail, Lock, User, Store, Car } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // New States for Role and Additional Data
  const [role, setRole] = useState("customer");
  const [storeName, setStoreName] = useState("");
  const [storeType, setStoreType] = useState("restaurant");
  const [storePhone, setStorePhone] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate("/admin");
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description:
          error.message === "Invalid login credentials"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : error.message,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Prepare additional data based on role
    const additionalData: any = {};
    if (role === "driver") {
      additionalData.vehicleType = vehicleType;
      additionalData.vehicleNumber = vehicleNumber;
    } else if (role === "store_owner") {
      additionalData.storeName = storeName;
      additionalData.storeType = storeType;
      additionalData.storePhone = storePhone;
    }

    const { error } = await signUp(
      email,
      password,
      fullName,
      role,
      additionalData
    );

    if (error) {
      toast({
        title: "خطأ في إنشاء الحساب",
        description: error.message.includes("already registered")
          ? "هذا البريد الإلكتروني مسجل مسبقاً"
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم إنشاء الحساب",
        description:
          role === "customer"
            ? "تم إنشاء حسابك بنجاح"
            : "تم استلام طلبك، سيتم مراجعته من قبل الإدارة",
      });
    }

    setIsLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Truck className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">وصلني</CardTitle>
          <CardDescription>منصة التوصيل الموحدة</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="signup">حساب جديد</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pr-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Role Selection */}
                <div className="space-y-2">
                  <Label>نوع الحساب</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div
                      className={`cursor-pointer rounded-lg border p-2 flex flex-col items-center gap-2 transition-colors ${
                        role === "customer"
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setRole("customer")}
                    >
                      <User className="h-6 w-6" />
                      <span className="text-xs font-medium">عميل</span>
                    </div>
                    <div
                      className={`cursor-pointer rounded-lg border p-2 flex flex-col items-center gap-2 transition-colors ${
                        role === "driver"
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setRole("driver")}
                    >
                      <Car className="h-6 w-6" />
                      <span className="text-xs font-medium">مندوب</span>
                    </div>
                    <div
                      className={`cursor-pointer rounded-lg border p-2 flex flex-col items-center gap-2 transition-colors ${
                        role === "store_owner"
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setRole("store_owner")}
                    >
                      <Store className="h-6 w-6" />
                      <span className="text-xs font-medium">متجر</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">الاسم الكامل</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="محمد أحمد"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pr-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupEmail">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pr-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupPassword">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signupPassword"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {/* Driver Specific Fields */}
                {role === "driver" && (
                  <div className="space-y-4 animate-fade-in border-t pt-4">
                    <h3 className="font-semibold text-sm">بيانات المركبة</h3>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleType">نوع المركبة</Label>
                      <Select
                        value={vehicleType}
                        onValueChange={setVehicleType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع المركبة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="car">سيارة</SelectItem>
                          <SelectItem value="bike">دراجة نارية</SelectItem>
                          <SelectItem value="van">شاحنة صغيرة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleNumber">رقم اللوحة</Label>
                      <Input
                        id="vehicleNumber"
                        placeholder="أ ب ج - 123"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Store Owner Specific Fields */}
                {role === "store_owner" && (
                  <div className="space-y-4 animate-fade-in border-t pt-4">
                    <h3 className="font-semibold text-sm">بيانات المتجر</h3>
                    <div className="space-y-2">
                      <Label htmlFor="storeName">اسم المتجر</Label>
                      <Input
                        id="storeName"
                        placeholder="مطعم البركة"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storeType">نوع النشاط</Label>
                      <Select value={storeType} onValueChange={setStoreType}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر النشاط" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="restaurant">مطعم</SelectItem>
                          <SelectItem value="market">سوق / بقالة</SelectItem>
                          <SelectItem value="pharmacy">صيدلية</SelectItem>
                          <SelectItem value="other">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storePhone">رقم هاتف المتجر</Label>
                      <Input
                        id="storePhone"
                        placeholder="05xxxxxxxx"
                        value={storePhone}
                        onChange={(e) => setStorePhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
