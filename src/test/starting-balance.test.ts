import { describe, expect, it } from "vitest";
import { getStartingBalanceAction } from "../..//supabase/functions/_shared/starting-balance";

describe("getStartingBalanceAction", () => {
  it("treats an already-paid invoice as paid so we do not pay it twice", () => {
    expect(getStartingBalanceAction("paid", "succeeded")).toBe("paid");
  });

  it("treats a processing payment intent as processing without a second pay attempt", () => {
    expect(getStartingBalanceAction("open", "processing")).toBe("processing");
  });

  it("only requests an explicit pay attempt when the invoice is still open and not processing", () => {
    expect(getStartingBalanceAction("open", "requires_payment_method")).toBe("pay");
  });
});
