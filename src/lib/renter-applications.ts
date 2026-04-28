export const APPLICATION_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "approved_not_billable", label: "Approved but not Billable" },
  { value: "converted_billable", label: "Converted and Officially Billable" },
  { value: "rejected", label: "Rejected" },
] as const;

export const EQUIPMENT_OPTIONS = [
  { value: "washer_and_dryer", label: "Washer & Dryer" },
  { value: "washer_only", label: "Washer Only" },
  { value: "dryer_only", label: "Dryer Only" },
] as const;

export const LAYOUT_OPTIONS = [
  { value: "side_by_side", label: "Side-by-side" },
  { value: "stackable", label: "Stackable" },
] as const;

export const DRYER_CONNECTION_OPTIONS = [
  { value: "electric", label: "Electric" },
  { value: "gas", label: "Gas" },
] as const;

export const ELECTRIC_PRONG_OPTIONS = [
  { value: "3-prong", label: "3-prong" },
  { value: "4-prong", label: "4-prong" },
  { value: "unknown", label: "Unknown" },
] as const;

export const PREFERRED_TIMING_OPTIONS = [
  { value: "asap", label: "ASAP" },
  { value: "specific", label: "Preferred date/time or notes" },
] as const;

export const DEFAULT_RESPONSIBILITY_TEMPLATE = `You agree to the following before delivery:

- Clean the lint trap after every dryer use.
- Dryer ducting and ventilation inside the home are your responsibility.
- Home plumbing, shutoff valves, and water connections are your responsibility.
- Leave enough space behind the machines for safe operation and ventilation.
- Electrical outlets, breakers, gas hookups, and code compliance are your responsibility.
- Damage caused by pests, rodents, roaches, or infestations is not normal machine failure.
- Do not overload the washer or dryer.
- Do not attempt self-repairs or let third parties repair the equipment without approval.
- Report machine issues promptly so service can be scheduled.`;

export function formatApplicationStatus(status: string) {
  return APPLICATION_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function formatEquipmentNeeded(value: string) {
  return EQUIPMENT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatLayoutPreference(value: string) {
  return LAYOUT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatTimingPreference(value: string) {
  return PREFERRED_TIMING_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatApplicationAddress(application: {
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
}) {
  return [
    application.address_line1,
    application.address_line2,
    `${application.city}, ${application.state} ${application.postal_code}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");
}
