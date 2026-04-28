import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, LogOut, PhoneCall, ShieldCheck, Wrench } from "lucide-react";
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
  };
  operator: {
    business_name: string;
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

export default function PublicClientPortal() {
  const { operatorSlug } = useParams();
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [summary, setSummary] = useState<PortalSummary | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [submittingMaintenance, setSubmittingMaintenance] = useState(false);
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
      const message = getErrorMessage(error, "Portal session expired. Please sign in again.");
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
    void loadSummary(sessionToken);
  }, [loadSummary, sessionToken]);

  const sortedRequests = useMemo(
    () => [...(summary?.maintenance_requests ?? [])].sort((a, b) => b.reported_date.localeCompare(a.reported_date)),
    [summary?.maintenance_requests],
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
      toast.error(getErrorMessage(error, "Unable to sign in."));
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
      toast.error(getErrorMessage(error, "Unable to submit maintenance request."));
    } finally {
      setSubmittingMaintenance(false);
    }
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
            Secure phone + PIN access for maintenance requests and status updates.
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
                          <StatusBadge status={request.status} />
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
          </div>
        )}

        <p className="pb-4 text-center text-xs text-muted-foreground">Powered by LaundryLord</p>
      </div>
    </div>
  );
}
