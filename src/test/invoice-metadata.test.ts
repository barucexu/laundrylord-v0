import { describe, expect, it } from "vitest";
import { getInvoiceAdjustmentIds, getInvoiceChargeKind } from "../../supabase/functions/_shared/invoice-metadata";

describe("invoice metadata helpers", () => {
  it("reads starting-balance metadata from invoice-line invoice item details", () => {
    const invoice = {
      metadata: {},
      lines: {
        data: [
          {
            parent: {
              invoice_item_details: {
                metadata: {
                  charge_kind: "starting_balance",
                  adjustment_ids: JSON.stringify(["adj-1", "adj-2"]),
                },
              },
            },
          },
        ],
      },
    };

    expect(getInvoiceChargeKind(invoice)).toBe("starting_balance");
    expect(getInvoiceAdjustmentIds(invoice)).toEqual(["adj-1", "adj-2"]);
  });

  it("falls back to recurring payments when no starting-balance metadata exists", () => {
    expect(getInvoiceChargeKind({ metadata: {}, lines: { data: [] } })).toBe("recurring_payment");
    expect(getInvoiceAdjustmentIds({ metadata: {}, lines: { data: [] } })).toEqual([]);
  });
});
