import { useState, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentSourceBadge } from "@/components/PaymentSourceBadge";
import { supabase } from "@/integrations/supabase/client";
import { useRenter, useMachinesForRenter, useMachines, useUpdateRenter, useUpdateMachine, useTimelineEvents, useMaintenanceForRenter, usePaymentsForRenter, useStripeConnection } from "@/hooks/useSupabaseData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Phone, Mail, MapPin, DollarSign, Box, FileText, Wrench, Clock, User, CreditCard, AlertTriangle, CheckCircle, MessageSquare, Truck, Send, Play, Settings, Pencil, Plus, X, Globe, Plug, Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { EditRenterDialog } from "@/components/EditRenterDialog";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";

const timelineIcons: Record<string, typeof User> = {
  created: User,
  machine_assigned: Box,
  payment_succeeded: CheckCircle,
  payment_failed: AlertTriangle,
  payment_method_saved: CreditCard,
  late_fee: DollarSign,
  maintenance_opened: Wrench,
  maintenance_resolved: CheckCircle,
  pickup_scheduled: Truck,
  pickup_completed: Truck,
  note: MessageSquare,
};

export default function RenterDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: renter, isLoading } = useRenter(id);
  const { data: assignedMachines = [] } = useMachinesForRenter(id);
  const { data: allMachines = [] } = useMachines();
  const { data: timeline = [] } = useTimelineEvents(id);
  const { data: maintenance = [] } = useMaintenanceForRenter(id);
  const { data: renterPayments = [] } = usePaymentsForRenter(id);
  const { data: stripeStatus } = useStripeConnection();
  const updateRenter = useUpdateRenter();
  const updateMachine = useUpdateMachine();
  const [sendingSetup, setSendingSetup] = useState(false);
  const [activating, setActivating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  // Show toast on setup return
  const setupResult = searchParams.get("setup");
  if (setupResult === "success") {
    toast.success("Card saved successfully! You can now activate billing.");
    window.history.replaceState({}, "", `/renters/${id}`);
  }

  const handleSendSetupLink = async () => {
    setSendingSetup(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-setup-link", {
        body: { renter_id: id },
      });
      if (error) throw error;
      if (data?.url) {
        await navigator.clipboard.writeText(data.url);
        toast.success("Setup link copied to clipboard! Send it to the renter.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create setup link");
    } finally {
      setSendingSetup(false);
    }
  };

  const handleActivateBilling = async () => {
    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription", {
        body: { renter_id: id },
      });
      if (error) {
        const msg = typeof data === "object" && data?.error ? data.error : error.message;
        throw new Error(msg || "Failed to activate billing");
      }
      toast.success(data?.already_active ? "Autopay is already active for this renter." : `Billing activated! Next due: ${data.next_due}`);
      queryClient.invalidateQueries({ queryKey: ["renters", id] });
    } catch (err: any) {
      toast.error(err.message || "Failed to activate billing");
    } finally {
      setActivating(false);
    }
  };

  const handleAssignMachine = async (machineId: string) => {
    if (!renter || !id) return;
    try {
      await updateMachine.mutateAsync({ id: machineId, assigned_renter_id: id, status: "assigned" });
      queryClient.invalidateQueries({ queryKey: ["machines", "renter", id] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast.success("Machine assigned");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign machine");
    }
  };

  const handleUnassignMachine = async (machineId: string) => {
    try {
      await updateMachine.mutateAsync({ id: machineId, assigned_renter_id: null, status: "available" });
      queryClient.invalidateQueries({ queryKey: ["machines", "renter", id] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast.success("Machine unassigned");
    } catch (err: any) {
      toast.error(err.message || "Failed to unassign machine");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Link to="/renters" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Renters
        </Link>
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!renter) {
    return (
      <div className="space-y-4">
        <Link to="/renters" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Renters
        </Link>
        <p className="text-muted-foreground">Renter not found.</p>
      </div>
    );
  }

  const stripeConnected = stripeStatus?.connected === true;
  const hasCard = !!renter.has_payment_method;
  const hasSubscription = !!renter.stripe_subscription_id;

  const getBillingState = () => {
    if (!stripeConnected) return "no_stripe";
    if (!hasCard) return "no_card";
    if (!hasSubscription) return "no_autopay";
    return "active";
  };

  const billingState = getBillingState();
  const availableMachines = allMachines.filter(m => m.status === "available");

  return (
    <div className="space-y-5">
      <Link to="/renters" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Renters
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{renter.name}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <StatusBadge status={renter.status} />
            {renter.lease_start_date && <span className="text-xs text-muted-foreground font-mono">Since {renter.lease_start_date}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPaymentOpen(true)}>
            <DollarSign className="h-3.5 w-3.5 mr-1" /> Record Payment
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          {renter.status === "archived" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await updateRenter.mutateAsync({ id: renter.id, status: "closed" });
                  queryClient.invalidateQueries({ queryKey: ["renters"] });
                  queryClient.invalidateQueries({ queryKey: ["renters", "archived"] });
                  queryClient.invalidateQueries({ queryKey: ["renters", "billable-count"] });
                  toast.success("Renter unarchived");
                } catch (err: any) {
                  toast.error(err.message || "Failed to unarchive");
                }
              }}
            >
              <ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Unarchive
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!window.confirm("Archive this renter?\n\nArchived renters remain billable for 30 days.")) return;
                try {
                  const now = new Date();
                  const billableUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                  await updateRenter.mutateAsync({
                    id: renter.id,
                    status: "archived",
                    archived_at: now.toISOString(),
                    billable_until: billableUntil.toISOString(),
                  });
                  queryClient.invalidateQueries({ queryKey: ["renters"] });
                  queryClient.invalidateQueries({ queryKey: ["renters", "archived"] });
                  queryClient.invalidateQueries({ queryKey: ["renters", "billable-count"] });
                  toast.success("Renter archived");
                  navigate("/renters");
                } catch (err: any) {
                  toast.error(err.message || "Failed to archive");
                }
              }}
            >
              <Archive className="h-3.5 w-3.5 mr-1" /> Archive
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        <div className="space-y-5">
          {/* Billing Actions Card */}
          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {billingState === "no_stripe" && (
                <>
                  <Button size="sm" onClick={() => navigate("/settings")}>
                    <Settings className="h-4 w-4" />
                    Connect Stripe
                  </Button>
                  <p className="text-xs text-muted-foreground">Add your Stripe key in Settings to enable billing.</p>
                </>
              )}

              {billingState === "no_card" && (
                <>
                  <Button size="sm" onClick={handleSendSetupLink} disabled={sendingSetup}>
                    {sendingSetup ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Payment Setup Link
                  </Button>
                  <p className="text-xs text-muted-foreground">→ Send a secure link for the renter to add a payment method</p>
                </>
              )}

              {billingState === "no_autopay" && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleActivateBilling} disabled={activating}>
                      {activating ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Start Autopay
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleSendSetupLink} disabled={sendingSetup}>
                      <Send className="h-4 w-4" />
                      Resend Setup Link
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">→ Payment method on file ✓ — Start auto-charging ${Number(renter.monthly_rate).toFixed(2)}/mo</p>
                </>
              )}

              {billingState === "active" && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success/10 text-success text-sm font-medium">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Autopay Active
                    </span>
                    <Button size="sm" variant="ghost" onClick={handleSendSetupLink} disabled={sendingSetup}>
                      <Send className="h-4 w-4" />
                      Update Payment Method
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Auto-billing ${Number(renter.monthly_rate).toFixed(2)}/mo • Next due: {renter.next_due_date || "—"}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Monthly Rent</div>
                  <div className="text-lg font-mono font-semibold mt-0.5">${Number(renter.monthly_rate).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Rent Collected</div>
                  <div className="text-lg font-mono font-semibold mt-0.5">${Number(renter.rent_collected ?? 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Balance</div>
                  <div className={`text-lg font-mono font-semibold mt-0.5 ${Number(renter.balance) > 0 ? 'text-destructive' : 'text-success'}`}>
                    ${Number(renter.balance).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Next Due</div>
                  <div className="text-sm font-mono mt-0.5">{renter.next_due_date || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Install Fee</div>
                  <div className="text-sm font-mono font-semibold mt-0.5">${Number(renter.install_fee ?? 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Install Collected</div>
                  <div className={`text-sm font-medium mt-0.5 ${renter.install_fee_collected ? 'text-success' : 'text-destructive'}`}>
                    {renter.install_fee_collected ? '✓ Yes' : '✗ No'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Deposit</div>
                  <div className="text-sm font-mono font-semibold mt-0.5">${Number(renter.deposit_amount ?? 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Deposit Collected</div>
                  <div className={`text-sm font-medium mt-0.5 ${renter.deposit_collected ? 'text-success' : 'text-destructive'}`}>
                    {renter.deposit_collected ? '✓ Yes' : '✗ No'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Start Date</div>
                  <div className="text-sm font-mono mt-0.5">{renter.lease_start_date || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Paid Through</div>
                  <div className="text-sm font-mono mt-0.5">{renter.paid_through_date || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Late Fee</div>
                  <div className="text-sm font-mono mt-0.5">${Number(renter.late_fee ?? 25).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Card on File</div>
                  <div className={`text-sm font-medium mt-0.5 ${hasCard ? 'text-success' : 'text-muted-foreground'}`}>
                    {hasCard ? '✓ Yes' : '✗ No'}
                  </div>
                </div>
              </div>

              {renter.days_late > 0 && (
                <div className="mt-4 px-3 py-2 bg-destructive/5 border border-destructive/20 rounded-md text-sm text-destructive font-medium">
                  {renter.days_late} days overdue
                </div>
              )}

              {/* Payment History */}
              {renterPayments.length > 0 && (
                <div className="mt-4 pt-4 border-t divide-y">
                  {renterPayments.slice(0, 8).map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm capitalize">{p.type === 'rent' ? 'Rent' : p.type.replace('_', ' ')}</span>
                        <span className="text-xs text-muted-foreground font-mono">{p.due_date}</span>
                        <PaymentSourceBadge source={(p as any).payment_source} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono font-medium">${Number(p.amount).toFixed(2)}</span>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <div className="space-y-0">
                  {timeline.map((event, i) => {
                    const Icon = timelineIcons[event.type] || FileText;
                    return (
                      <div key={event.id} className="flex gap-3 pb-4">
                        <div className="flex flex-col items-center">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          {i < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="pb-1">
                          <div className="text-sm">{event.description}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{new Date(event.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {maintenance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Maintenance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {maintenance.map(m => (
                    <div key={m.id} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{m.issue_category}</div>
                          <div className="text-xs text-muted-foreground">{m.description}</div>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                      <div className="flex gap-4 mt-1 text-[11px] text-muted-foreground font-mono">
                        <span>Reported {m.reported_date}</span>
                        {m.resolved_date && <span>Resolved {m.resolved_date}</span>}
                        {m.cost !== null && <span>${Number(m.cost).toFixed(2)}</span>}
                      </div>
                      {m.resolution_notes && <div className="text-xs text-muted-foreground mt-1">{m.resolution_notes}</div>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {renter.phone && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs">{renter.phone}</span>
                </div>
              )}
              {renter.email && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">{renter.email}</span>
                </div>
              )}
              {renter.address && (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <span className="text-xs">{renter.address}</span>
                </div>
              )}
              {(renter as any).secondary_contact && (
                <div className="flex items-center gap-2.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">{(renter as any).secondary_contact}</span>
                  <span className="text-[10px] text-muted-foreground">(secondary)</span>
                </div>
              )}
              {(renter as any).dryer_outlet && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Plug className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">{(renter as any).dryer_outlet} outlet</span>
                </div>
              )}
              {(renter as any).language && (renter as any).language !== "English" && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">{(renter as any).language}</span>
                </div>
              )}
              {!renter.phone && !renter.email && !renter.address && (
                <p className="text-sm text-muted-foreground">No contact info on file.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lease</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground text-xs">Start Date</span>
                <span className="font-mono text-xs">{renter.lease_start_date || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground text-xs">Min Term End</span>
                <span className="font-mono text-xs">{renter.min_term_end_date || '—'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Multi-Machine Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Box className="h-4 w-4" /> Machines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignedMachines.length === 0 && (
                <p className="text-sm text-muted-foreground">No machines assigned.</p>
              )}
              {assignedMachines.map(m => (
                <div key={m.id} className="border rounded-md p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{m.type} — {m.model}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUnassignMachine(m.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>Serial: <span className="font-mono text-foreground">{m.serial}</span></span>
                    <span>Status: <StatusBadge status={m.status} /></span>
                    <span>Condition: <span className="text-foreground capitalize">{m.condition || '—'}</span></span>
                    <span><StatusBadge status={m.status} /></span>
                  </div>
                </div>
              ))}
              {availableMachines.length > 0 && (
                <Select onValueChange={handleAssignMachine}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Assign a machine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMachines.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.type} — {m.model} ({m.serial})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Install Notes */}
          {(renter as any).install_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Install Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{(renter as any).install_notes}</p>
              </CardContent>
            </Card>
          )}

          {renter.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{renter.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <EditRenterDialog open={editOpen} onOpenChange={setEditOpen} renter={renter} />
      {paymentOpen && <RecordPaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} renter={renter} />}
    </div>
  );
}
