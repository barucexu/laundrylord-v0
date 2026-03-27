import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  // Renter statuses
  lead: "bg-muted text-muted-foreground",
  scheduled: "bg-primary/10 text-primary",
  active: "bg-success/10 text-success",
  late: "bg-destructive/10 text-destructive",
  maintenance: "bg-warning/10 text-warning",
  termination_requested: "bg-destructive/10 text-destructive",
  pickup_scheduled: "bg-warning/10 text-warning",
  closed: "bg-muted text-muted-foreground",
  defaulted: "bg-destructive/15 text-destructive",
  // Payment statuses
  upcoming: "bg-muted text-muted-foreground",
  due_soon: "bg-warning/10 text-warning",
  overdue: "bg-destructive/10 text-destructive",
  failed: "bg-destructive/15 text-destructive",
  paid: "bg-success/10 text-success",
  // Machine statuses
  available: "bg-success/10 text-success",
  assigned: "bg-primary/10 text-primary",
  retired: "bg-muted text-muted-foreground",
  // Maintenance statuses
  reported: "bg-warning/10 text-warning",
  in_progress: "bg-primary/10 text-primary",
  resolved: "bg-success/10 text-success",
  // Archive status
  archived: "bg-muted text-muted-foreground",
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
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap",
      statusStyles[status] || "bg-muted text-muted-foreground",
      className
    )}>
      {statusLabels[status] || status}
    </span>
  );
}
