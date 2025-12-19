import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: string,
    additionalData?: any
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchUserRole(session.user.id);
        }, 0);
      } else {
        setUserRole(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    setUserRole(data?.role ?? "customer");
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: string = "customer",
    additionalData: any = {}
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName, role: role }, // Store role in user metadata as well
      },
    });

    if (error) return { error };

    if (data.user) {
      try {
        if (role === "driver") {
          console.log("Attempting to create driver profile for:", data.user.id);
          const { error: driverError } = await supabase.from("drivers").insert({
            user_id: data.user.id,
            vehicle_type: additionalData.vehicleType,
            vehicle_number: additionalData.vehicleNumber,
            status: "pending",
          });
          if (driverError) {
            console.error("Error creating driver profile:", driverError);
            return { error: driverError };
          } else {
            console.log("Driver profile created successfully");
          }
        } else if (role === "store_owner") {
          const { error: storeError } = await supabase.from("stores").insert({
            owner_id: data.user.id,
            name: additionalData.storeName,
            type: additionalData.storeType || "restaurant",
            phone: additionalData.storePhone,
            status: "pending",
          });
          if (storeError) console.error("Error creating store:", storeError);
        }

        // Upsert role to user_roles table
        const { error: roleError } = await supabase.from("user_roles").upsert({
          user_id: data.user.id,
          role: role as any,
        });
        if (roleError) console.error("Error setting user role:", roleError);
      } catch (err) {
        console.error("Error in post-signup operations:", err);
      }
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, userRole, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
