import type { RenterRow, CustomFieldEntry } from "@/hooks/useSupabaseData";

const RENTER_SEARCH_FIELDS: Array<keyof RenterRow> = [
  "name",
  "phone",
  "email",
  "address",
  "secondary_contact",
  "laundrylord_email",
  "status",
  "notes",
];

export function buildRenterSearchText(
  renter: RenterRow,
  customFields: CustomFieldEntry[] = [],
): string {
  return [
    ...RENTER_SEARCH_FIELDS.map((key) => renter[key]),
    ...customFields.flatMap((field) => [field.label, field.value]),
  ]
    .filter((value): value is string | number | boolean => value !== null && value !== undefined && value !== "")
    .map((value) => String(value).toLowerCase())
    .join(" ");
}
