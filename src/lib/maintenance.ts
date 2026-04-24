import type { MachineRow, MaintenanceRow } from "@/hooks/useSupabaseData";

export const MAINTENANCE_STATUS_OPTIONS = [
  { value: "reported", label: "Reported" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
] as const;

export const MAINTENANCE_CATEGORY_OPTIONS = [
  { value: "leak", label: "Leak" },
  { value: "noise", label: "Noise" },
  { value: "error_code", label: "Error Code" },
  { value: "not_starting", label: "Not Starting" },
  { value: "vibration", label: "Vibration" },
  { value: "door_issue", label: "Door Issue" },
  { value: "other", label: "Other" },
] as const;

export function getSingleAssignedMachineId(
  renterId: string | null | undefined,
  machines: Pick<MachineRow, "id" | "assigned_renter_id">[],
): string | null {
  if (!renterId) return null;

  const assignedMachines = machines.filter((machine) => machine.assigned_renter_id === renterId);
  return assignedMachines.length === 1 ? assignedMachines[0].id : null;
}

export function isActiveMaintenanceLog(log: Pick<MaintenanceRow, "archived_at">): boolean {
  return !log.archived_at;
}

export function sortMaintenanceLogs(logs: MaintenanceRow[]): MaintenanceRow[] {
  const order: Record<string, number> = { reported: 0, scheduled: 1, in_progress: 2, resolved: 3 };

  return [...logs].sort((a, b) => {
    const statusOrder = (order[a.status] ?? 4) - (order[b.status] ?? 4);
    if (statusOrder !== 0) return statusOrder;
    return b.reported_date.localeCompare(a.reported_date);
  });
}
