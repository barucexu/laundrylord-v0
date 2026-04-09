type AssignableMachine = {
  assigned_renter_id: string | null;
  status: string;
};

export function isMachineAssignable(machine: AssignableMachine) {
  return machine.assigned_renter_id === null && machine.status === "available";
}

export function getUnassignedMachineStatus(status: string) {
  if (status === "assigned" || status === "rented") return "available";
  return status;
}

export function normalizeEditableMachineStatus(status: string) {
  return status === "rented" ? "assigned" : status;
}
