import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, ExternalLink, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import logoImg from "@/assets/laundrylord-logo.webp";

type PortalSummary = {
  renter_name: string | null;
  balance: number;
  next_due_date: string | null;
  autopay_status: "active" | "inactive" | "pending";
  has_payment_method: boolean;
  payment_updates_available: boolean;
  expires_at: string;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount ?? 0);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getAutopayCopy(status: PortalSummary["autopay_status"]) {
  if (status === "active") {
    return {
      label: "Autopay active",
      description: "Recurring automatic payments are active for this renter.",
      icon: CheckCircle2,
      tone: "text-success",
    };
  }

  if (status === "pending") {
    return {
      label: "Autopay pending",
      description: "A bank payment is still processing before autopay fully activates.",
      icon: Clock3,
      tone: "text-warning",
    };
  }

  return {
    label: "Autopay not active",
    description: "Automatic recurring payments are not active yet.",
    icon: AlertTriangle,
    tone: "text-muted-foreground",
  };
}

export default function RenterPortal() {
  const { token } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPaymentMethod, setUpdatingPaymentMethod] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSummary = useCallback(async (showSuccessToast = false) => {
    if (!token) {
      setErrorMessage("This portal link is invalid or expired.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke("renter-portal", {
        body: { action: "summary", token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSummary(data as PortalSummary);
      if (showSuccessToast) {
        toast.success("Payment method updated for future charges.");
      }
    } catch (error) {
      setSummary(null);
      setErrorMessage(getErrorMessage(error, "This portal link is invalid or expired."));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const setupResult = searchParams.get("setup");
    void loadSummary(setupResult === "success");

    if (setupResult) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("setup");
      setSearchParams(nextParams, { replace: true });
    }
  }, [loadSummary, searchParams, setSearchParams]);

  const handleUpdatePaymentMethod = async () => {
    if (!token) return;

    setUpdatingPaymentMethod(true);
    try {
      const { data, error } = await supabase.functions.invoke("renter-portal", {
        body: { action: "update-payment-method", token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Missing Stripe setup URL");
      window.location.assign(data.url as string);
      return;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to open payment update"));
    }

    setUpdatingPaymentMethod(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="flex items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading renter portal...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!summary || errorMessage) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <img src={logoImg} alt="LaundryLord" className="mx-auto mb-4 h-14 w-14 rounded-lg object-contain" />
              <CardTitle>Portal link unavailable</CardTitle>
              <CardDescription>{errorMessage ?? "This portal link is invalid or expired."}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const autopayCopy = getAutopayCopy(summary.autopay_status);
  const AutopayIcon = autopayCopy.icon;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="LaundryLord" className="h-12 w-12 rounded-lg object-contain" />
              <div>
                <CardTitle>Renter Portal</CardTitle>
                <CardDescription>
                  {summary.renter_name ? `For ${summary.renter_name}` : "Secure billing summary"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Current balance</div>
              <div className="text-3xl font-semibold tracking-tight">{formatMoney(summary.balance)}</div>
            </div>
            <Button
              onClick={handleUpdatePaymentMethod}
              disabled={!summary.payment_updates_available || updatingPaymentMethod}
            >
              {updatingPaymentMethod ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Update Payment Method
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" />
                Next Due Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{formatDate(summary.next_due_date)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AutopayIcon className={`h-4 w-4 ${autopayCopy.tone}`} />
                Autopay
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className={`font-medium ${autopayCopy.tone}`}>{autopayCopy.label}</div>
              <p className="text-sm text-muted-foreground">{autopayCopy.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className={`font-medium ${summary.has_payment_method ? "text-success" : "text-muted-foreground"}`}>
                {summary.has_payment_method ? "On file" : "Missing"}
              </div>
              <p className="text-sm text-muted-foreground">
                {summary.payment_updates_available
                  ? "Use the button above any time to securely replace the saved payment method."
                  : "Payment updates are temporarily unavailable. Please contact your operator."}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portal access</CardTitle>
            <CardDescription>
              This secure link stays valid until {formatDate(summary.expires_at.slice(0, 10))} unless your operator regenerates it sooner.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
