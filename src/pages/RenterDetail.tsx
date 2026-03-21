import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useRenter, useMachineForRenter, useMachines, useUpdateRenter, useUpdateMachine, useTimelineEvents, useMaintenanceForRenter, usePaymentsForRenter, useStripeConnection } from "@/hooks/useSupabaseData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Phone, Mail, MapPin, DollarSign, Box, FileText, Wrench, Clock, User, CreditCard, AlertTriangle, CheckCircle, MessageSquare, Truck, Send, Play, Settings, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { EditRenterDialog } from "@/components/EditRenterDialog";

const timelineIcons: Record<string, typeof User> = {
  created: User,
  machine_assigned: Box,
  payment_succeeded: CheckCircle,
  payment_failed: AlertTriangle,
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
  const { data: machine } = useMachineForRenter(renter?.machine_id);
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
        // Try to extract meaningful error from the response
        const msg = typeof data === "object" && data?.error ? data.error : error.message;
        throw new Error(msg || "Failed to activate billing");
      }
      toast.success(`Billing activated! Next due: ${data.next_due}`);
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
      // If renter already had a machine, unassign old one
      if (renter.machine_id) {
        await updateMachine.mutateAsync({ id: renter.machine_id, assigned_renter_id: null, status: "available" });
      }

      if (machineId === "none") {
        await updateRenter.mutateAsync({ id, machine_id: null });
      } else {
        await updateRenter.mutateAsync({ id, machine_id: machineId });
        await updateMachine.mutateAsync({ id: machineId, assigned_renter_id: id, status: "rented" });
      }
      queryClient.invalidateQueries({ queryKey: ["renters", id] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast.success(machineId === "none" ? "Machine unassigned" : "Machine assigned");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign machine");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Link to="/renters" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Renters
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
        <Link to="/renters" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Renters
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

  // Available machines for assignment dropdown
  const availableMachines = allMachines.filter(m => m.status === "available" || m.id === renter.machine_id);

  return (
    <div className="space-y-6">
      <Link to="/renters" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Renters
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{renter.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={renter.status} />
            {renter.lease_start_date && <span className="text-xs text-muted-foreground font-mono">Since {renter.lease_start_date}</span>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Billing Actions Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {billingState === "no_stripe" && (
                <>
                  <Button size="sm" onClick={() => navigate("/settings")}>
                    <Settings className="h-4 w-4" />
                    Connect Business Stripe
                  </Button>
                  <p className="text-xs text-muted-foreground">Connect your Stripe account in Settings before you can charge renters.</p>
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
                    Send Card Setup Link
                  </Button>
                  <p className="text-xs text-muted-foreground">→ Send a secure link to collect the renter's card on file</p>
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
                  <p className="text-xs text-muted-foreground">→ Card on file ✓ — Start auto-charging ${Number(renter.monthly_rate).toFixed(2)}/mo</p>
                </>
              )}

              {billingState === "active" && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 text-green-700 text-sm font-medium">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Autopay Active
                    </span>
                    <Button size="sm" variant="ghost" onClick={handleSendSetupLink} disabled={sendingSetup}>
                      <Send className="h-4 w-4" />
                      Update Card
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Auto-billing ${Number(renter.monthly_rate).toFixed(2)}/mo • Next due: {renter.next_due_date || "—"}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2"><CreditCard className="h-4 w-4" /> Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Monthly Rent</div>
                  <div className="text-lg font-mono font-semibold">${Number(renter.monthly_rate).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Rent Collected</div>
                  <div className="text-lg font-mono font-semibold">${Number(renter.rent_collected ?? 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Balance</div>
                  <div className={`text-lg font-mono font-semibold ${Number(renter.balance) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    ${Number(renter.balance).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Next Due</div>
                  <div className="text-sm font-mono">{renter.next_due_date || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">Install Fee</div>
                  <div className="text-sm font-mono font-semibold">${Number(renter.install_fee ?? 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Install Collected</div>
                  <div className={`text-sm font-medium ${renter.install_fee_collected ? 'text-green-600' : 'text-destructive'}`}>
                    {renter.install_fee_collected ? '✓ Yes' : '✗ No'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Deposit</div>
                  <div className="text-sm font-mono font-semibold">${Number(renter.deposit_amount ?? 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Deposit Collected</div>
                  <div className={`text-sm font-medium ${renter.deposit_collected ? 'text-green-600' : 'text-destructive'}`}>
                    {renter.deposit_collected ? '✓ Yes' : '✗ No'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">Start Date</div>
                  <div className="text-sm font-mono">{renter.lease_start_date || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Paid Through</div>
                  <div className="text-sm font-mono">{renter.paid_through_date || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Late Fee</div>
                  <div className="text-sm font-mono">${Number(renter.late_fee ?? 25).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Card on File</div>
                  <div className={`text-sm font-medium ${hasCard ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {hasCard ? '✓ Yes' : '✗ No'}
                  </div>
                </div>
              </div>

              {renter.days_late > 0 && (
                <div className="mt-3 px-3 py-2 bg-destructive/5 border border-destructive/20 rounded-md text-sm text-destructive">
                  {renter.days_late} days overdue
                </div>
              )}
              {renterPayments.length > 0 && (
                <div className="mt-4 divide-y">
                  {renterPayments.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2">
                      <div>
                        <span className="text-sm capitalize">{p.type.replace('_', ' ')}</span>
                        <span className="text-xs text-muted-foreground font-mono ml-2">{p.due_date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono">${Number(p.amount).toFixed(2)}</span>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
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
                          <div className="text-xs text-muted-foreground font-mono">{new Date(event.date).toLocaleDateString()}</div>
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
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2"><Wrench className="h-4 w-4" /> Maintenance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {maintenance.map(m => (
                    <div key={m.id} className="px-6 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{m.issue_category}</div>
                          <div className="text-xs text-muted-foreground">{m.description}</div>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground font-mono">
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

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {renter.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono">{renter.phone}</span>
                </div>
              )}
              {renter.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{renter.email}</span>
                </div>
              )}
              {renter.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <span>{renter.address}</span>
                </div>
              )}
              {!renter.phone && !renter.email && !renter.address && (
                <p className="text-sm text-muted-foreground">No contact info</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Lease</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Start Date</span>
                <span className="font-mono">{renter.lease_start_date || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Min Term End</span>
                <span className="font-mono">{renter.min_term_end_date || '—'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2"><Box className="h-4 w-4" /> Machine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Select
                  value={renter.machine_id || "none"}
                  onValueChange={handleAssignMachine}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Assign a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No machine</SelectItem>
                    {availableMachines.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.type} — {m.model} ({m.serial})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {machine && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Model</span>
                    <span className="text-xs">{machine.model}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Serial</span>
                    <span className="font-mono text-xs">{machine.serial}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prong</span>
                    <span>{machine.prong}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Condition</span>
                    <span>{machine.condition}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={machine.status} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {renter.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{renter.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <EditRenterDialog open={editOpen} onOpenChange={setEditOpen} renter={renter} />
    </div>
  );
}
