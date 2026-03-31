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
      record[key] = placeholder;
    }
  }
}
