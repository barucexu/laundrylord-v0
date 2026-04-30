import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, ExternalLink, Loader2, LogOut, PhoneCall, ShieldCheck, XCircle, Wallet, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { MAINTENANCE_CATEGORY_OPTIONS } from "@/lib/maintenance";

type PortalProfile = {
  business_name: string;
};

type PortalSummary = {
  renter: {
    name: string | null;
    phone: string | null;
    address: string | null;
    status: string;
    balance: number;
    next_due_date: string | null;
    autopay_status: "active" | "inactive" | "pending";
    has_payment_method: boolean;
    payment_updates_available: boolean;
    portal_payments_available: boolean;
  };
  operator: {
    business_name: string;
    public_slug: string | null;
  };
  maintenance_requests: Array<{
    id: string;
    issue_category: string;
    description: string;
    status: string;
    reported_date: string;
    resolved_date: string | null;
    resolution_notes: string | null;
  }>;
};

function sessionStorageKey(slug: string) {
  return `laundrylord-client-portal:${slug}`;
}

async function getFunctionErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "context" in error) {
    const response = (error as { context?: Response }).context;
    if (response) {
      try {
        const body = await response.clone().json() as { error?: string };
        if (typeof body?.error === "string" && body.error.trim()) {
          return body.error;
        }
      } catch {
        try {
          const text = await response.clone().text();
          if (text.trim()) {
            return text;
          }
        } catch {
          // fall through to the standard fallback
        }
      }
    }
  }

  return getErrorMessage(error, fallback);
}

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

function getAutopayCopy(status: PortalSummary["renter"]["autopay_status"]) {
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

export default function PublicClientPortal() {
  const { operatorSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [submittingMaintenance, setSubmittingMaintenance] = useState(false);
  const [cancelingRequestId, setCancelingRequestId] = useState<string | null>(null);
  const [updatingPaymentMethod, setUpdatingPaymentMethod] = useState(false);
  const [payingOutstandingBalance, setPayingOutstandingBalance] = useState(false);
  const [loginForm, setLoginForm] = useState({ phone: "", pin: "" });
  const [maintenanceForm, setMaintenanceForm] = useState({ category: "leak", description: "" });
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!operatorSlug) return;
    const storedToken = window.sessionStorage.getItem(sessionStorageKey(operatorSlug));
    if (storedToken) {
      setSessionToken(storedToken);
    }
  }, [operatorSlug]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!operatorSlug) {
        setErrorMessage("Client portal link not found.");
        setLoadingProfile(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("public-client-portal", {
          body: { action: "profile", operatorSlug },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setProfile(data as PortalProfile);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Client portal link not found."));
      } finally {
        setLoadingProfile(false);
      }
    };

    void loadProfile();
  }, [operatorSlug]);

  const loadSummary = useCallback(async (token: string) => {
    setLoadingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-client-portal", {
        body: { action: "summary", sessionToken: token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSummary(data as PortalSummary);
      setErrorMessage(null);
    } catch (error) {
      const message = await getFunctionErrorMessage(error, "Portal session expired. Please sign in again.");
      setSummary(null);
      setSessionToken(null);
      if (operatorSlug) {
        window.sessionStorage.removeItem(sessionStorageKey(operatorSlug));
      }
      setErrorMessage(message);
    } finally {
      setLoadingSummary(false);
    }
  }, [operatorSlug]);

  useEffect(() => {
    if (!sessionToken) return;

    const setupResult = searchParams.get("setup");
    const paymentResult = searchParams.get("payment");
    const toastKind = setupResult === "success"
      ? "setup-success"
      : paymentResult === "success"
        ? "payment-success"
        : null;

    void loadSummary(sessionToken).then(() => {
      if (toastKind === "setup-success") {
        toast.success("Payment method updated for future charges.");
      } else if (toastKind === "payment-success") {
        toast.success("Payment submitted. Your balance will refresh after confirmation.");
      }
    });

    if (setupResult || paymentResult) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("setup");
      nextParams.delete("payment");
      setSearchParams(nextParams, { replace: true });
    }
  }, [loadSummary, searchParams, sessionToken, setSearchParams]);

  const sortedRequests = useMemo(
    () => [...(summary?.maintenance_requests ?? [])].sort((a, b) => b.reported_date.localeCompare(a.reported_date)),
    [summary?.maintenance_requests],
  );

  const cancellableRequestIds = useMemo(
    () => new Set(sortedRequests.filter((request) => request.status !== "resolved" && request.status !== "cancelled").map((request) => request.id)),
    [sortedRequests],
  );

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!operatorSlug) return;

    setLoggingIn(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-client-portal", {
        body: {
          action: "login",
          operatorSlug,
          phone: loginForm.phone,
          pin: loginForm.pin,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const nextSessionToken = data.session_token as string;
      window.sessionStorage.setItem(sessionStorageKey(operatorSlug), nextSessionToken);
      setSessionToken(nextSessionToken);
      setLoginForm({ phone: "", pin: "" });
      toast.success("Signed in.");
    } catch (error) {
      toast.error(await getFunctionErrorMessage(error, "Unable to sign in."));
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await supabase.functions.invoke("public-client-portal", {
          body: { action: "logout", sessionToken },
        });
      }
    } finally {
      if (operatorSlug) {
        window.sessionStorage.removeItem(sessionStorageKey(operatorSlug));
      }
      setSessionToken(null);
      setSummary(null);
    }
  };

  const handleSubmitMaintenance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sessionToken) return;

    setSubmittingMaintenance(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-client-portal", {
        body: {
          action: "create-maintenance",
          sessionToken,
          category: maintenanceForm.category,
          description: maintenanceForm.description,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMaintenanceForm({ category: "leak", description: "" });
      toast.success("Maintenance request submitted.");
      await loadSummary(sessionToken);
    } catch (error) {
      toast.error(await getFunctionErrorMessage(error, "Unable to submit maintenance request."));
    } finally {
      setSubmittingMaintenance(false);
    }
  };

  const handleCancelMaintenance = async (requestId: string) => {
    if (!sessionToken) return;

    setCancelingRequestId(requestId);
    try {
      const { data, error } = await supabase.functions.invoke("public-client-portal", {
        body: {
          action: "cancel-maintenance",
          sessionToken,
          maintenanceId: requestId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await loadSummary(sessionToken);
      toast.success("Maintenance request cancelled.");
    } catch (error) {
      toast.error(await getFunctionErrorMessage(error, "Unable to cancel maintenance request."));
    } finally {
      setCancelingRequestId(null);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    if (!sessionToken) return;

    setUpdatingPaymentMethod(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-client-portal", {
        body: { action: "update-payment-method", sessionToken },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Missing Stripe setup URL");
      window.location.assign(data.url as string);
      return;
    } catch (error) {
      toast.error(await getFunctionErrorMessage(error, "Failed to open payment update"));
    }

    setUpdatingPaymentMethod(false);
  };

  const handlePayOutstandingBalance = async () => {
    if (!sessionToken) return;

    setPayingOutstandingBalance(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-client-portal", {
        body: { action: "pay-outstanding-balance", sessionToken },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Missing Stripe payment URL");
      window.location.assign(data.url as string);
      return;
    } catch (error) {
      toast.error(await getFunctionErrorMessage(error, "Failed to open portal payment"));
    }

    setPayingOutstandingBalance(false);
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto flex max-w-2xl items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>Portal unavailable</CardTitle>
              <CardDescription>{errorMessage ?? "This operator portal is unavailable."}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const autopayCopy = summary ? getAutopayCopy(summary.renter.autopay_status) : null;
  const AutopayIcon = autopayCopy?.icon ?? AlertTriangle;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.10),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,0.02),_transparent_30%)] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <Card className="border-primary/20 bg-primary/[0.04]">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>{profile.business_name}</CardTitle>
                <CardDescription>Existing client portal</CardDescription>
              </div>
              {summary && (
                <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Secure phone + PIN access for billing, maintenance requests, and status updates.
          </CardContent>
        </Card>

        {!summary ? (
          <Card className="mx-auto max-w-lg">
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Enter the phone number on file and the portal PIN your operator gave you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="portal-phone">Phone number</Label>
                  <Input
                    id="portal-phone"
                    value={loginForm.phone}
                    onChange={(event) => setLoginForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portal-pin">PIN</Label>
                  <Input
                    id="portal-pin"
                    inputMode="numeric"
                    value={loginForm.pin}
                    onChange={(event) => setLoginForm((current) => ({ ...current, pin: event.target.value }))}
                    placeholder="6-digit PIN"
                  />
                </div>
                {errorMessage && <div className="text-sm text-destructive">{errorMessage}</div>}
                <Button className="w-full" size="lg" type="submit" disabled={loggingIn}>
                  {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
            <div className="space-y-4">
              <Card className="border-primary/20 bg-primary/[0.03]">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Current balance</div>
                      <div className="text-3xl font-semibold tracking-tight">{formatMoney(summary.renter.balance)}</div>
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <Button
                        onClick={handlePayOutstandingBalance}
                        disabled={!summary.renter.portal_payments_available || payingOutstandingBalance}
                      >
                        {payingOutstandingBalance ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                        Pay Outstanding Balance
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleUpdatePaymentMethod}
                        disabled={!summary.renter.payment_updates_available || updatingPaymentMethod}
                      >
                        {updatingPaymentMethod ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                        Update Payment Method
                      </Button>
                    </div>
                  </div>
                </CardHeader>
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
                    <div className="text-lg font-semibold">{formatDate(summary.renter.next_due_date)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AutopayIcon className={`h-4 w-4 ${autopayCopy?.tone ?? "text-muted-foreground"}`} />
                      Autopay
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className={`font-medium ${autopayCopy?.tone ?? "text-muted-foreground"}`}>{autopayCopy?.label ?? "Autopay"}</div>
                    <p className="text-sm text-muted-foreground">{autopayCopy?.description ?? "Billing details unavailable."}</p>
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
                    <div className={`font-medium ${summary.renter.has_payment_method ? "text-success" : "text-muted-foreground"}`}>
                      {summary.renter.has_payment_method ? "On file" : "Missing"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {summary.renter.payment_updates_available
                        ? "Use the button above any time to securely replace the saved payment method."
                        : "Payment updates are temporarily unavailable. Please contact your operator."}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PhoneCall className="h-4 w-4" />
                    Account overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Name</div>
                    <div className="mt-1 text-sm font-medium">{summary.renter.name || "Renter"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Phone</div>
                    <div className="mt-1 text-sm">{summary.renter.phone || "—"}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Address</div>
                    <div className="mt-1 text-sm">{summary.renter.address || "—"}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Account status</div>
                    <div className="mt-2"><StatusBadge status={summary.renter.status} /></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="h-4 w-4" />
                    Maintenance requests
                  </CardTitle>
                  <CardDescription>You can submit a new issue and track the latest status here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingSummary ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Refreshing requests...
                    </div>
                  ) : sortedRequests.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No maintenance requests yet.
                    </div>
                  ) : (
                    sortedRequests.map((request) => (
                      <div key={request.id} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium capitalize">{request.issue_category.replaceAll("_", " ")}</div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={request.status} />
                            {cancellableRequestIds.has(request.id) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleCancelMaintenance(request.id)}
                                disabled={cancelingRequestId === request.id}
                              >
                                {cancelingRequestId === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                Cancel request
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{request.description}</div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          Reported {new Date(request.reported_date).toLocaleDateString()}
                        </div>
                        {request.resolution_notes && (
                          <div className="mt-2 rounded-md bg-muted/50 p-3 text-sm">
                            <div className="mb-1 font-medium">Update</div>
                            <div className="text-muted-foreground">{request.resolution_notes}</div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Report a maintenance issue</CardTitle>
                  <CardDescription>
                    New requests start as <span className="font-medium">Reported</span> and your operator can update the status as work progresses.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitMaintenance} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={maintenanceForm.category} onValueChange={(value) => setMaintenanceForm((current) => ({ ...current, category: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MAINTENANCE_CATEGORY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maintenance-description">Description</Label>
                      <Textarea
                        id="maintenance-description"
                        rows={6}
                        value={maintenanceForm.description}
                        onChange={(event) => setMaintenanceForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder="Describe what is happening, when it started, and anything your operator should know."
                      />
                    </div>
                    <Button className="w-full" type="submit" disabled={submittingMaintenance}>
                      {submittingMaintenance ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Submit request
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Portal access</CardTitle>
                  <CardDescription>
                    This permanent portal is the renter&apos;s home for both billing and maintenance.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        <p className="pb-4 text-center text-xs text-muted-foreground">Powered by LaundryLord</p>
      </div>
    </div>
  );
}
