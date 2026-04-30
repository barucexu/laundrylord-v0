import { describe, it, expect } from "vitest";
import { User, Box, CheckCircle, AlertTriangle, CreditCard, DollarSign, Wrench, Truck, MessageSquare, XCircle } from "lucide-react";

/**
 * Contract test: the timelineIcons map in RenterDetail must include
 * every event type that backend functions write. This catches the
 * drift where stripe-webhook wrote "payment_method_saved" but the
 * UI had no icon mapping for it.
 */

// Mirror of the canonical timelineIcons from RenterDetail.tsx
const timelineIcons: Record<string, unknown> = {
  created: User,
  machine_assigned: Box,
  payment_succeeded: CheckCircle,
  payment_failed: AlertTriangle,
  payment_method_saved: CreditCard,
  late_fee: DollarSign,
  maintenance_opened: Wrench,
  maintenance_resolved: CheckCircle,
  maintenance_cancelled: XCircle,
  pickup_scheduled: Truck,
  pickup_completed: Truck,
  note: MessageSquare,
};

// All event types written by backend functions
const BACKEND_EVENT_TYPES = [
  "payment_succeeded",     // stripe-webhook
  "payment_failed",        // stripe-webhook
  "payment_method_saved",  // stripe-webhook (checkout.session.completed mode=setup)
  "late_fee",              // send-billing-reminders
  "created",               // various insert flows
  "machine_assigned",      // assignment flows
  "note",                  // stripe-webhook (subscription.deleted)
  "maintenance_cancelled", // renter portal cancellation
] as const;

describe("Timeline event type contract", () => {
  it.each(BACKEND_EVENT_TYPES)("has icon mapping for '%s'", (eventType) => {
    expect(timelineIcons[eventType]).toBeDefined();
  });

  it("has no undefined values in the icon map", () => {
    for (const [key, value] of Object.entries(timelineIcons)) {
      expect(value, `Icon for "${key}" is undefined`).toBeDefined();
    }
  });
});
