const RENTER_PLACEHOLDERS: Record<string, any> = {
  name: "No name yet",
  phone: "No phone yet",
  email: "No email yet",
  address: "No address yet",
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

const MACHINE_PLACEHOLDERS: Record<string, any> = {
  type: "No type yet",
  model: "No model yet",
  serial: "No serial yet",
  status: "available",
};

export function getPlaceholder(
  tab: "customers" | "machines",
  fieldKey: string,
): any | undefined {
  const map = tab === "customers" ? RENTER_PLACEHOLDERS : MACHINE_PLACEHOLDERS;
  return map[fieldKey];
}

export function ensureRequiredFields(
  tab: "customers" | "machines",
  record: Record<string, any>,
): void {
  const map = tab === "customers" ? RENTER_PLACEHOLDERS : MACHINE_PLACEHOLDERS;
  for (const [key, placeholder] of Object.entries(map)) {
    if (record[key] === undefined || record[key] === null || record[key] === "") {
      record[key] = placeholder;
    }
  }
}
