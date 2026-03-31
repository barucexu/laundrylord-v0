const RENTER_INSERT_DEFAULTS: Record<string, any> = {
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

const MACHINE_INSERT_DEFAULTS: Record<string, any> = {
  status: "available",
};

export function getPlaceholder(
  tab: "customers" | "machines",
  fieldKey: string,
): any | undefined {
  const map = tab === "customers" ? RENTER_INSERT_DEFAULTS : MACHINE_INSERT_DEFAULTS;
  return map[fieldKey];
}

export function applyInsertDefaults(
  tab: "customers" | "machines",
  record: Record<string, any>,
): void {
  const map = tab === "customers" ? RENTER_INSERT_DEFAULTS : MACHINE_INSERT_DEFAULTS;
  for (const [key, placeholder] of Object.entries(map)) {
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
  const map = group === "renter" ? RENTER_INSERT_DEFAULTS : MACHINE_INSERT_DEFAULTS;
  for (const [key, placeholder] of Object.entries(map)) {
    if (record[key] === undefined || record[key] === null || record[key] === "") {
      record[key] = placeholder;
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
