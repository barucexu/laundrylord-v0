/**
 * Placeholder / default-value policy for imports.
 *
 * IDENTITY KEYS (name, phone, email, serial) are NEVER auto-filled.
 * Only safe numeric / boolean defaults are applied so rows can pass
 * DB NOT-NULL constraints without injecting fake dedup-poisoning values.
 */

const RENTER_DEFAULTS: Record<string, any> = {
  monthly_rate: 150,
  late_fee: 25,
  install_fee: 75,
  deposit_amount: 0,
  balance: 0,
  install_fee_collected: false,
  deposit_collected: false,
  has_payment_method: false,
  status: "lead",
};

const MACHINE_DEFAULTS: Record<string, any> = {
  status: "available",
};

/** Identity keys that must NEVER receive placeholder values */
const RENTER_IDENTITY_KEYS = new Set(["name", "phone", "email"]);
const MACHINE_IDENTITY_KEYS = new Set(["serial"]);

/** DB-required columns (NOT NULL without a server default) */
const RENTER_REQUIRED_KEYS = new Set(["name"]);
const MACHINE_REQUIRED_KEYS = new Set(["type", "model", "serial"]);

/**
 * Returns true when the value is real data — not empty, not a known
 * placeholder sentinel from old imports.
 */
const PLACEHOLDER_SENTINELS = new Set([
  "no name yet",
  "no phone yet",
  "no email yet",
  "no address yet",
  "no type yet",
  "no model yet",
  "no serial yet",
]);

export function isMeaningfulValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  if (s === "") return false;
  return !PLACEHOLDER_SENTINELS.has(s);
}

/**
 * Apply safe defaults for non-identity fields.
 * Does NOT touch identity keys — caller must handle missing identity separately.
 */
export function applyInsertDefaults(
  tab: "customers" | "machines",
  record: Record<string, any>,
): void {
  const defaults = tab === "customers" ? RENTER_DEFAULTS : MACHINE_DEFAULTS;
  for (const [key, defaultVal] of Object.entries(defaults)) {
    if (record[key] === undefined || record[key] === null || record[key] === "") {
      record[key] = defaultVal;
    }
  }
}

/**
 * Same as applyInsertDefaults but keyed by group name (for combined mode).
 */
export function applyInsertDefaultsForGroup(
  group: "renter" | "machine",
  record: Record<string, any>,
): void {
  applyInsertDefaults(group === "renter" ? "customers" : "machines", record);
}

/**
 * Check whether a record has enough data to be inserted.
 * Returns null if OK, or a reason string if the row should be skipped.
 */
export function checkMinimumData(
  tab: "customers" | "machines",
  record: Record<string, any>,
): string | null {
  const required = tab === "customers" ? RENTER_REQUIRED_KEYS : MACHINE_REQUIRED_KEYS;
  for (const key of required) {
    if (!isMeaningfulValue(record[key])) {
      return `missing required field: ${key}`;
    }
  }
  return null;
}

export function checkMinimumDataForGroup(
  group: "renter" | "machine",
  record: Record<string, any>,
): string | null {
  return checkMinimumData(group === "renter" ? "customers" : "machines", record);
}

// Legacy exports for backward compat (re-routed to new logic)
export function ensureRequiredFields(
  tab: "customers" | "machines",
  record: Record<string, any>,
): void {
  applyInsertDefaults(tab, record);
}

export function ensureRequiredFieldsForGroup(
  group: "renter" | "machine",
  record: Record<string, any>,
): void {
  applyInsertDefaultsForGroup(group, record);
}

export function getPlaceholder(
  tab: "customers" | "machines",
  fieldKey: string,
): any | undefined {
  const map = tab === "customers" ? RENTER_DEFAULTS : MACHINE_DEFAULTS;
  return map[fieldKey];
}
