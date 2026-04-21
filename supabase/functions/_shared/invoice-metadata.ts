type Metadata = Record<string, string>;

type InvoiceLineLike = {
  metadata?: Metadata | null;
  parent?: {
    invoice_item_details?: {
      metadata?: Metadata | null;
    } | null;
  } | null;
};

type InvoiceLike = {
  metadata?: Metadata | null;
  parent?: {
    subscription_details?: {
      metadata?: Metadata | null;
    } | null;
  } | null;
  lines?: {
    data?: InvoiceLineLike[];
  } | null;
};

export function isMeaningfulInvoiceAmount(amountCents: number | null | undefined): boolean {
  return Number(amountCents ?? 0) > 0;
}

function firstInvoiceLineMetadata(invoice: InvoiceLike, key: string): string | undefined {
  for (const line of invoice.lines?.data ?? []) {
    const lineValue = line.metadata?.[key];
    if (lineValue) return lineValue;

    const invoiceItemValue = line.parent?.invoice_item_details?.metadata?.[key];
    if (invoiceItemValue) return invoiceItemValue;
  }

  return undefined;
}

export function getInvoiceChargeKind(invoice: InvoiceLike): string {
  return invoice.metadata?.charge_kind
    ?? firstInvoiceLineMetadata(invoice, "charge_kind")
    ?? invoice.parent?.subscription_details?.metadata?.charge_kind
    ?? "recurring_payment";
}

export function getInvoiceAdjustmentIds(invoice: InvoiceLike): string[] {
  const raw = invoice.metadata?.adjustment_ids
    ?? firstInvoiceLineMetadata(invoice, "adjustment_ids");

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}
