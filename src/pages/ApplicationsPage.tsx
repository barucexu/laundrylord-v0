import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useConvertRenterApplication,
  useOperatorSettings,
  useRenterApplications,
  useUpdateRenterApplication,
  type RenterApplicationRow,
} from "@/hooks/useSupabaseData";
import {
  APPLICATION_STATUS_OPTIONS,
  formatElevatorPreference,
  formatApplicationAddress,
  formatEquipmentNeeded,
  formatLayoutPreference,
  formatTimingPreference,
} from "@/lib/renter-applications";
import { buildOperatorPublicPath } from "@/lib/operator-public";
import { getErrorMessage } from "@/lib/errors";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const { data: applications = [], isLoading } = useRenterApplications();
  const { data: operatorSettings } = useOperatorSettings();
  const updateApplication = useUpdateRenterApplication();
  const convertApplication = useConvertRenterApplication();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convertTarget, setConvertTarget] = useState<RenterApplicationRow | null>(null);

  const selectedApplication = applications.find((application) => application.id === selectedId) ?? applications[0] ?? null;
  const applyPath = buildOperatorPublicPath(operatorSettings?.public_slug, "apply");
  const portalPath = buildOperatorPublicPath(operatorSettings?.public_slug, "portal");
  const editableStatusOptions = APPLICATION_STATUS_OPTIONS.filter((status) => status.value !== "converted_billable");

  const filteredApplications = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesStatus = statusFilter === "all" || application.status === statusFilter;
      if (!matchesStatus) return false;
      if (!normalized) return true;
      return [
        application.applicant_name,
        application.phone,
        application.email,
        application.address_line1,
        application.city,
        application.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [applications, search, statusFilter]);

  const handleCopyLink = async (path: string | null, label: string) => {
    if (!path) {
      toast.error("Add a public slug in Settings first.");
      return;
    }

    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast.success(`${label} copied to clipboard.`);
  };

  const handleStatusChange = async (application: RenterApplicationRow, nextStatus: string) => {
    try {
      await updateApplication.mutateAsync({ id: application.id, status: nextStatus });
      toast.success("Application updated.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update application"));
    }
  };

  const handleConvert = async () => {
    if (!convertTarget) return;

    try {
      const renterId = await convertApplication.mutateAsync({ applicationId: convertTarget.id });
      toast.success("Application converted to an official billable renter.");
      setConvertTarget(null);
      navigate(`/renters/${renterId}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to convert application"));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Applications</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Public renter applications stay separate from active renters until you convert them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void handleCopyLink(applyPath, "Application link")}>
            <ExternalLink className="h-4 w-4" />
            Copy Apply Link
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handleCopyLink(portalPath, "Client portal link")}>
            <ExternalLink className="h-4 w-4" />
            Copy Portal Link
          </Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex flex-col gap-2 p-4 text-sm md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="font-medium">Operator-facing public links</div>
            <div className="text-xs text-muted-foreground">
              Send `Apply` to prospects. Send `Portal` plus phone + PIN only after the renter is active and you generate portal access from their renter record.
            </div>
          </div>
          <Link to="/settings" className="text-xs text-primary hover:underline">
            Manage slug and responsibilities in Settings
          </Link>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder="Search applications..."
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {APPLICATION_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)]">
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Applicant</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    Loading applications...
                  </TableCell>
                </TableRow>
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    No applications match your filters yet.
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((application) => (
                  <TableRow
                    key={application.id}
                    className={application.id === selectedApplication?.id ? "bg-muted/40" : undefined}
                    onClick={() => setSelectedId(application.id)}
                  >
                    <TableCell>
                      <div className="font-medium">{application.applicant_name}</div>
                      <div className="text-xs text-muted-foreground">{application.phone}</div>
                      <div className="text-xs text-muted-foreground">{application.city}, {application.state}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatEquipmentNeeded(application.equipment_needed)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(application.created_at)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={application.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={application.status === "converted_billable"}
                        onClick={(event) => {
                          event.stopPropagation();
                          setConvertTarget(application);
                        }}
                      >
                        <UserPlus className="h-4 w-4" />
                        Convert
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Application Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedApplication ? (
              <p className="text-sm text-muted-foreground">Select an application to review it.</p>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="text-lg font-semibold">{selectedApplication.applicant_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedApplication.phone}</div>
                  {selectedApplication.email && (
                    <div className="text-sm text-muted-foreground">{selectedApplication.email}</div>
                  )}
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Address</div>
                  <div className="mt-1 text-sm">{formatApplicationAddress(selectedApplication)}</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={selectedApplication.status}
                      onValueChange={(value) => void handleStatusChange(selectedApplication, value)}
                      disabled={selectedApplication.status === "converted_billable"}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {editableStatusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Submitted</Label>
                    <div className="rounded-md border px-3 py-2 text-sm">{formatDateTime(selectedApplication.created_at)}</div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Equipment</div>
                    <div className="mt-1 text-sm">{formatEquipmentNeeded(selectedApplication.equipment_needed)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Layout</div>
                    <div className="mt-1 text-sm">{formatLayoutPreference(selectedApplication.layout_preference)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dryer connection</div>
                    <div className="mt-1 text-sm">
                      {selectedApplication.dryer_connection === "electric"
                        ? `Electric${selectedApplication.electric_prong ? ` • ${selectedApplication.electric_prong}` : ""}`
                        : "Gas"}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Access</div>
                    <div className="mt-1 text-sm">
                      {selectedApplication.floor_number
                        ? `Floor ${selectedApplication.floor_number}`
                        : selectedApplication.upstairs
                          ? "Upper floor"
                          : "Ground floor / no stairs"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Elevator: {formatElevatorPreference(selectedApplication.has_elevator)}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preferred timing</div>
                  <div className="mt-1 text-sm">{formatTimingPreference(selectedApplication.preferred_timing)}</div>
                  {selectedApplication.preferred_delivery_notes && (
                    <div className="mt-2 text-sm text-muted-foreground">{selectedApplication.preferred_delivery_notes}</div>
                  )}
                </div>

                {selectedApplication.notes && (
                  <div className="rounded-lg border p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm">{selectedApplication.notes}</div>
                  </div>
                )}

                <div className="rounded-lg border p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Responsibilities acknowledged</div>
                  <div className="mt-1 text-sm">{formatDateTime(selectedApplication.responsibilities_acknowledged_at)}</div>
                  <div className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{selectedApplication.responsibility_text}</div>
                </div>

                <Button
                  className="w-full"
                  disabled={selectedApplication.status === "converted_billable"}
                  onClick={() => setConvertTarget(selectedApplication)}
                >
                  <UserPlus className="h-4 w-4" />
                  Convert to Officially Billable Renter
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!convertTarget} onOpenChange={(open) => !open && setConvertTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to official billable renter?</AlertDialogTitle>
            <AlertDialogDescription>
              Proceeding with this action will convert this applicant to a billable renter. It is recommended to wait until after installation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConvert()}>
              Convert Applicant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
