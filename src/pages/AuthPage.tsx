import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PricingCalculator } from "@/components/PricingCalculator";
import { toast } from "sonner";
import { Play } from "lucide-react";
import logoImg from "@/assets/laundrylord-logo.webp";

export default function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset link sent! Check your email.");
        setMode("login");
      }
      setLoading(false);
      return;
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! You're now signed in.");
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto grid min-h-screen w-full max-w-[1400px] gap-8 px-4 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-6 lg:py-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--accent)/0.38))] px-6 py-8 shadow-[0_30px_80px_-40px_rgba(27,36,30,0.45)] lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.13),transparent_32%),radial-gradient(circle_at_80%_18%,hsl(var(--warning)/0.14),transparent_22%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-background/70 px-4 py-2 backdrop-blur-sm">
                <img src={logoImg} alt="LaundryLord" className="h-9 w-9 rounded-2xl border border-border/60 bg-white/80 object-contain p-1" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">LaundryLord</div>
                  <div className="text-sm font-extrabold tracking-[-0.04em] text-foreground">Premium software for laundry operators</div>
                </div>
              </div>

              <div className="max-w-2xl space-y-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary">Operations, billing, and renter visibility</div>
                <h1 className="max-w-2xl text-4xl font-extrabold tracking-[-0.06em] text-foreground sm:text-5xl">
                  Run a cleaner rental business with calmer software.
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground">
                  Track renters, collect payments, manage machines, and stay ahead of issues in one polished control center built for real operators.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.4rem] border border-border/70 bg-background/75 p-4 backdrop-blur-sm">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Cash flow</div>
                  <div className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-foreground">$12.4k</div>
                  <div className="mt-1 text-sm text-muted-foreground">processed this month</div>
                </div>
                <div className="rounded-[1.4rem] border border-border/70 bg-background/75 p-4 backdrop-blur-sm">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">On-time rate</div>
                  <div className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-foreground">96%</div>
                  <div className="mt-1 text-sm text-muted-foreground">autopay-driven collections</div>
                </div>
                <div className="rounded-[1.4rem] border border-border/70 bg-background/75 p-4 backdrop-blur-sm">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Machine fleet</div>
                  <div className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-foreground">128</div>
                  <div className="mt-1 text-sm text-muted-foreground">tracked with full visibility</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">Automated billing activation</div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">Cleaner renter records and timelines</div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">Machine assignment and maintenance tracking</div>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center">
          <div className="mx-auto w-full max-w-[460px] space-y-6">
            <div className="px-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.26em] text-primary">Account access</div>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-foreground">
                {mode === "forgot" ? "Reset password" : mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {mode === "forgot"
                  ? "Enter your email and we’ll send a secure password reset link."
                  : mode === "login"
                    ? "Sign in to access your renters, billing, and machine operations."
                    : "Set up your operator account and start organizing your business."}
              </p>
            </div>

            <Card className="overflow-hidden bg-card/92">
              <CardContent className="space-y-5 p-7">
              {mode !== "forgot" && (
                <>
                  <Button variant="outline" className="h-11 w-full gap-2" onClick={handleGoogleSignIn} disabled={loading}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>
                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider">or</span>
                    <Separator className="flex-1" />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {mode !== "forgot" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Password</Label>
                      {mode === "login" && (
                        <button type="button" onClick={() => setMode("forgot")} className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  </div>
                )}
                <Button type="submit" className="mt-2 h-11 w-full" disabled={loading}>
                  {loading ? "Loading..." : mode === "forgot" ? "Send Reset Link" : mode === "login" ? "Sign In" : "Create Account"}
                </Button>
              </form>

              <div className="border-t border-border/70 pt-4 text-center text-sm text-muted-foreground">
                {mode === "forgot" ? (
                  <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium text-xs">Back to sign in</button>
                ) : mode === "login" ? (
                  <span className="text-xs">
                    Don't have an account?{" "}
                    <button onClick={() => setMode("signup")} className="text-primary hover:underline font-medium">Sign up</button>
                  </span>
                ) : (
                  <span className="text-xs">
                    Already have an account?{" "}
                    <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">Sign in</button>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2 text-center">
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={() => navigate("/demo")}
            >
              <Play className="h-4 w-4" />
              Explore Demo
            </Button>
            <p className="text-[11px] text-muted-foreground">
              No signup required — see LaundryLord with sample data
            </p>
          </div>
          </div>
        </section>

        <div className="lg:col-span-2">
          <div className="rounded-[2rem] border border-border/70 bg-card/70 px-6 py-8 shadow-[0_24px_70px_-38px_rgba(27,36,30,0.4)] backdrop-blur-sm sm:px-8">
            <PricingCalculator />
          </div>
        </div>
      </div>
    </div>
  );
}
