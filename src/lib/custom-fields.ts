export type CustomFieldEntityType = "renter" | "machine";
export type CustomFieldValueType = "text" | "number" | "date" | "boolean";

export type CustomFieldDisplayValue = {
  text_value: string | null;
  number_value: number | null;
  date_value: string | null;
  boolean_value: boolean | null;
};

export function normalizeCustomFieldKey(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "custom_field";
}

export function getCustomFieldValue(
  valueType: CustomFieldValueType,
  values: CustomFieldDisplayValue,
): string {
  switch (valueType) {
    case "number":
      return values.number_value == null ? "" : String(values.number_value);
    case "date":
      return values.date_value ?? "";
    case "boolean":
      if (values.boolean_value == null) return "";
      return values.boolean_value ? "Yes" : "No";
    case "text":
    default:
      return values.text_value ?? "";
  }
}

export function buildCustomFieldValuePayload(value: string): CustomFieldDisplayValue {
  return {
    text_value: value,
    number_value: null,
    date_value: null,
    boolean_value: null,
  };
}
