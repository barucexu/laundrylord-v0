export function getPaymentTypeLabel(type: string | null | undefined): string {
  switch (type) {
    case "payment":
      return "Payment";
    case "rent":
      return "Rent";
    case "install_fee":
      return "Install Fee";
    case "late_fee":
      return "Late Fee";
    case "deposit":
      return "Deposit";
    case "other":
      return "Other";
    default:
      return (type ?? "payment").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
