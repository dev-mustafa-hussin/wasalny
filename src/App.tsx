import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/contexts/CartContext";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./components/admin/AdminLayout";
import { StoreOwnerLayout } from "./components/store/StoreOwnerLayout";
import { DriverLayout } from "./components/driver/DriverLayout";
import { CustomerLayout } from "./components/customer/CustomerLayout";
import Dashboard from "./pages/admin/Dashboard";
import Stores from "./pages/admin/Stores";
import Products from "./pages/admin/Products";
import Orders from "./pages/admin/Orders";
import Drivers from "./pages/admin/Drivers";
import DriversTracking from "./pages/admin/DriversTracking";
import Settings from "./pages/admin/Settings";
import Reports from "./pages/admin/Reports";
import EmailTemplates from "./pages/admin/EmailTemplates";
import Approvals from "./pages/admin/Approvals";
import Users from "./pages/admin/Users";
// Customer pages
import Home from "./pages/customer/Home";
import StoreDetail from "./pages/customer/StoreDetail";
import Cart from "./pages/customer/Cart";
import Checkout from "./pages/customer/Checkout";
import OrderSuccess from "./pages/customer/OrderSuccess";
import MyOrders from "./pages/customer/MyOrders";
import OrderTracking from "./pages/customer/OrderTracking";
import Favorites from "./pages/customer/Favorites";
import Addresses from "./pages/customer/Addresses";
import Profile from "./pages/customer/Profile";
import Contact from "./pages/customer/Contact";
import FAQ from "./pages/customer/FAQ";
// Driver pages
import DriverDashboard from "./pages/driver/DriverDashboard";
import DriverEarnings from "./pages/driver/DriverEarnings";
import DriverHistory from "./pages/driver/DriverHistory";
import DriverSettings from "./pages/driver/DriverSettings";
import DriverRatings from "./pages/driver/DriverRatings";
import DriverCurrentOrders from "./pages/driver/DriverCurrentOrders";

// Store pages
import StoreDashboard from "./pages/store/Dashboard";
import StoreProducts from "./pages/store/Products";
import StoreOrders from "./pages/store/Orders";
import StoreSettings from "./pages/store/Settings";
import StoreReports from "./pages/store/Reports";
import StoreProfile from "./pages/store/Profile";
import { RoleBasedRoute } from "./components/auth/RoleBasedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Customer Routes */}
                <Route element={<CustomerLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/store/:id" element={<StoreDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-success/:id" element={<OrderSuccess />} />
                  <Route path="/my-orders" element={<MyOrders />} />
                  <Route path="/order/:id" element={<OrderTracking />} />
                  <Route path="favorites" element={<Favorites />} />
                  <Route path="addresses" element={<Addresses />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="faq" element={<FAQ />} />
                </Route>
                <Route path="/auth" element={<Auth />} />

                {/* Driver Routes */}
                <Route path="/driver" element={<DriverLayout />}>
                  <Route index element={<DriverDashboard />} />
                  <Route path="current" element={<DriverCurrentOrders />} />
                  <Route path="earnings" element={<DriverEarnings />} />
                  <Route path="history" element={<DriverHistory />} />
                  <Route path="ratings" element={<DriverRatings />} />
                  <Route path="settings" element={<DriverSettings />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="stores" element={<Stores />} />
                  <Route path="products" element={<Products />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="drivers" element={<Drivers />} />
                  <Route
                    path="drivers-tracking"
                    element={<DriversTracking />}
                  />
                  <Route path="reports" element={<Reports />} />
                  <Route path="email-templates" element={<EmailTemplates />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="approvals" element={<Approvals />} />
                  <Route path="users" element={<Users />} />
                </Route>

                {/* Store Owner Routes */}
                <Route
                  element={<RoleBasedRoute allowedRoles={["store_owner"]} />}
                >
                  <Route path="/store-owner" element={<StoreOwnerLayout />}>
                    <Route index element={<StoreDashboard />} />
                    <Route path="products" element={<StoreProducts />} />
                    <Route path="orders" element={<StoreOrders />} />
                    <Route path="settings" element={<StoreSettings />} />
                    <Route path="reports" element={<StoreReports />} />
                    <Route path="profile" element={<StoreProfile />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
              <Analytics />
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
