import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  // Renter statuses
  lead: "border border-border/70 bg-muted/80 text-muted-foreground",
  scheduled: "border border-primary/15 bg-primary/10 text-primary",
  active: "border border-success/15 bg-success/10 text-success",
  late: "border border-destructive/15 bg-destructive/10 text-destructive",
  maintenance: "border border-warning/15 bg-warning/12 text-warning",
  termination_requested: "border border-destructive/15 bg-destructive/10 text-destructive",
  pickup_scheduled: "border border-warning/15 bg-warning/12 text-warning",
  closed: "border border-border/70 bg-muted/80 text-muted-foreground",
  defaulted: "border border-destructive/15 bg-destructive/15 text-destructive",
  // Payment statuses
  upcoming: "border border-border/70 bg-muted/80 text-muted-foreground",
  due_soon: "border border-warning/15 bg-warning/12 text-warning",
  overdue: "border border-destructive/15 bg-destructive/10 text-destructive",
  failed: "border border-destructive/15 bg-destructive/15 text-destructive",
  paid: "border border-success/15 bg-success/10 text-success",
  // Machine statuses
  available: "border border-success/15 bg-success/10 text-success",
  assigned: "border border-primary/15 bg-primary/10 text-primary",
  retired: "border border-border/70 bg-muted/80 text-muted-foreground",
  // Maintenance statuses
  reported: "border border-warning/15 bg-warning/12 text-warning",
  in_progress: "border border-primary/15 bg-primary/10 text-primary",
  resolved: "border border-success/15 bg-success/10 text-success",
  // Archive status
  archived: "border border-border/70 bg-muted/80 text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  lead: "Lead",
  scheduled: "Scheduled",
  active: "Active",
  late: "Late",
  maintenance: "Maintenance",
  termination_requested: "Term. Requested",
  pickup_scheduled: "Pickup Scheduled",
  closed: "Closed",
  defaulted: "Defaulted",
  upcoming: "Upcoming",
  due_soon: "Due Soon",
  overdue: "Overdue",
  failed: "Failed",
  paid: "Paid",
  available: "Available",
  assigned: "Assigned",
  retired: "Retired",
  reported: "Reported",
  in_progress: "In Progress",
  resolved: "Resolved",
  archived: "Archived",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] whitespace-nowrap",
        statusStyles[status] || "border border-border/70 bg-muted/80 text-muted-foreground",
        className,
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}
