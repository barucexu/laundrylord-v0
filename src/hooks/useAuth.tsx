import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_USER_ID } from "@/data/demo-seed-data";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  /** True when in demo mode — provides a fake user */
  isDemo: boolean;
}

const DEMO_USER: User = {
  id: DEMO_USER_ID,
  email: "demo@laundrylord.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as User;

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  isDemo: false,
});

export function AuthProvider({ children, isDemo = false }: { children: ReactNode; isDemo?: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    if (isDemo) return; // Skip auth listeners in demo mode

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isDemo]);

  const signOut = async () => {
    if (!isDemo) {
      await supabase.auth.signOut();
    }
  };

  const user = isDemo ? DEMO_USER : session?.user ?? null;

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, isDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
