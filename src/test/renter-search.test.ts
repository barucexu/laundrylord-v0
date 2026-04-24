import { describe, expect, it } from "vitest";
import { buildRenterSearchText } from "@/lib/renter-search";
import type { CustomFieldEntry, RenterRow } from "@/hooks/useSupabaseData";

function renter(overrides: Partial<RenterRow> = {}): RenterRow {
  return {
    id: "renter-1",
    user_id: "user-1",
    name: "Alice Rivera",
    email: "alice@example.com",
    phone: "(555) 010-2000",
    address: "10 Main St",
    status: "active",
    monthly_rate: 65,
    balance: 0,
    days_late: 0,
    deposit_amount: 100,
    deposit_collected: false,
    dryer_outlet: null,
    has_payment_method: false,
    install_fee: 75,
    install_fee_collected: false,
    install_notes: null,
    language: "English",
    late_fee: 25,
    laundrylord_email: null,
    lease_start_date: null,
    min_term_end_date: null,
    next_due_date: null,
    notes: null,
    paid_through_date: null,
    rent_collected: 0,
    secondary_contact: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    archived_at: null,
    billable_until: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildRenterSearchText", () => {
  it("includes renter custom field labels and values in renter-list search text", () => {
    const customFields: CustomFieldEntry[] = [
      {
        field_definition_id: "def-1",
        key: "laundry_room",
        label: "Laundry Room",
        value_type: "text",
        value: "Basement B",
      },
    ];

    const searchText = buildRenterSearchText(renter(), customFields);

    expect(searchText).toContain("alice rivera");
    expect(searchText).toContain("laundry room");
    expect(searchText).toContain("basement b");
  });
});
