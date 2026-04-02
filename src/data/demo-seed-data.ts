/**
 * Demo seed data for LaundryLord Demo Mode.
 * 15 renters, ~20 machines, all in NYC, Starter plan, 6 months of payment history.
 */

import type { Database } from "@/integrations/supabase/types";

type RenterRow = Database["public"]["Tables"]["renters"]["Row"];
type MachineRow = Database["public"]["Tables"]["machines"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type MaintenanceRow = Database["public"]["Tables"]["maintenance_logs"]["Row"];
type TimelineRow = Database["public"]["Tables"]["timeline_events"]["Row"];
type OperatorSettingsRow = Database["public"]["Tables"]["operator_settings"]["Row"];

// ─── Deterministic ID generation ───
function demoId(prefix: string, index: number): string {
  const hex = index.toString(16).padStart(4, "0");
  return `d3m0-${prefix}-0000-0000-${hex.padStart(12, "0")}`;
}

const DEMO_USER_ID = "d3m0-user-0000-0000-000000000000";
const NOW = new Date().toISOString();

// ─── NYC addresses ───
const NYC_STREETS = [
  "W 72nd St", "Amsterdam Ave", "Broadway", "E 14th St", "Lexington Ave",
  "3rd Ave", "E 86th St", "W 125th St", "St Nicholas Ave", "Flatbush Ave",
  "Atlantic Ave", "Court St", "Smith St", "Bergen St", "DeKalb Ave",
];

const NYC_ZIPS = ["10023", "10024", "10003", "10028", "10030", "10027", "11217", "11201", "11205", "11238"];

const NYC_CENTER = { lat: 40.7580, lng: -73.9855 };

const RENTER_NAMES = [
  "Maria Santos", "James Chen", "Keisha Brown", "David Kim", "Ana Rodriguez",
  "Michael Johnson", "Sophia Williams", "Robert Davis", "Fatima Ali", "Thomas O'Brien",
  "Carmen Rivera", "Derek Washington", "Yuki Tanaka", "Marcus Bell", "Linda Nguyen",
];

// Status: 10 active, 2 late, 1 scheduled, 1 maintenance, 1 lead
const RENTER_STATUSES: RenterRow["status"][] = [
  "active", "active", "active", "active", "active",
  "active", "active", "active", "active", "active",
  "late", "late", "scheduled", "maintenance", "lead",
];

const MACHINE_MODELS = [
  { type: "washer", model: "Samsung WF45R6100AW", cost: 450 },
  { type: "washer", model: "LG WM3600HWA", cost: 500 },
  { type: "washer", model: "Whirlpool WTW5000DW", cost: 380 },
  { type: "dryer", model: "Samsung DVE45R6100W", cost: 400 },
  { type: "dryer", model: "LG DLE3600W", cost: 450 },
  { type: "dryer", model: "Whirlpool WED5000DW", cost: 350 },
  { type: "washer", model: "GE GTW465ASNWW", cost: 420 },
  { type: "dryer", model: "GE GTD65EBSJWS", cost: 380 },
  { type: "washer", model: "Maytag MVW6230HW", cost: 550 },
  { type: "dryer", model: "Maytag MED6230HW", cost: 500 },
];

const MAINTENANCE_CATEGORIES = ["leak", "noise", "error_code", "not_starting", "vibration", "door_issue"];
const MAINTENANCE_DESCS: Record<string, string> = {
  leak: "Water pooling under washer during spin cycle",
  noise: "Loud banging during spin cycle",
  error_code: "Error code E3 displaying on washer",
  not_starting: "Machine won't power on",
  vibration: "Excessive vibration causing movement",
  door_issue: "Door won't latch properly",
};

// ─── Deterministic pseudo-random ───
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

function pickRange(min: number, max: number, seed: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

function dateOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

// ─── Generate 15 renters ───
function generateRenters(): RenterRow[] {
  const renters: RenterRow[] = [];

  for (let i = 0; i < 15; i++) {
    const id = demoId("rntr", i);
    const status = RENTER_STATUSES[i];
    const streetNum = pickRange(100, 999, i * 3 + 1);
    const street = NYC_STREETS[i % NYC_STREETS.length];
    const zip = NYC_ZIPS[i % NYC_ZIPS.length];
    const monthlyRate = [55, 60, 65, 70, 75, 60, 55, 65, 70, 80, 60, 65, 55, 70, 0][i];
    const isActive = ["active", "late", "maintenance"].includes(status);
    const daysLate = status === "late" ? (i === 10 ? 12 : 28) : 0;
    const leaseStart = dateOffset(pickRange(90, 300, i * 11));
    const paidThrough = isActive
      ? dateOffset(status === "late" ? daysLate : -pickRange(0, 20, i * 17))
      : null;
    const balance = status === "late" ? monthlyRate * (daysLate > 25 ? 2 : 1) : 0;
    const phone = `(212) ${pickRange(200, 999, i * 19)}-${pickRange(1000, 9999, i * 29)}`;
    const depositAmt = 150;
    const installFee = 100;
    const rentCollected = isActive ? monthlyRate * pickRange(3, 8, i * 31) : 0;

    renters.push({
      id,
      user_id: DEMO_USER_ID,
      name: RENTER_NAMES[i],
      email: `${RENTER_NAMES[i].split(" ")[0].toLowerCase()}@example.com`,
      phone,
      address: `${streetNum} ${street}, New York, NY ${zip}`,
      status,
      monthly_rate: monthlyRate,
      balance,
      days_late: daysLate,
      deposit_amount: depositAmt,
      deposit_collected: isActive || status === "closed",
      install_fee: installFee,
      install_fee_collected: isActive || status === "closed",
      install_notes: i % 5 === 0 ? "Installed by field tech. No issues." : null,
      late_fee: status === "late" ? 25 : 0,
      lease_start_date: leaseStart,
      min_term_end_date: dateOffset(pickRange(-180, -30, i * 37)),
      next_due_date: isActive ? dateOffset(-pickRange(1, 28, i * 41)) : null,
      paid_through_date: paidThrough,
      rent_collected: rentCollected,
      has_payment_method: isActive && i !== 13, // maintenance renter may not have
      stripe_customer_id: isActive && i < 10 ? `cus_demo_${i}` : null,
      stripe_subscription_id: isActive && i < 10 ? `sub_demo_${i}` : null,
      machine_id: isActive ? demoId("mach", i) : null,
      language: i === 4 ? "es" : "en",
      dryer_outlet: i % 3 === 0 ? "4-prong" : "3-prong",
      notes: i === 0 ? "Great tenant, always pays on time." : i === 10 ? "Sent reminder last week." : null,
      secondary_contact: i === 2 ? `Robert Brown - (212) 555-0199` : null,
      laundrylord_email: null,
      archived_at: null,
      billable_until: null,
      created_at: new Date(new Date(leaseStart).getTime() - 7 * 86400000).toISOString(),
      updated_at: NOW,
    });
  }

  return renters;
}

// ─── Generate ~20 machines ───
function generateMachines(renters: RenterRow[]): MachineRow[] {
  const machines: MachineRow[] = [];
  const activeRenters = renters.filter(r => ["active", "late", "maintenance"].includes(r.status));

  // Assigned machines (one per active/late/maintenance renter = 13)
  for (let i = 0; i < activeRenters.length; i++) {
    const r = activeRenters[i];
    const modelInfo = MACHINE_MODELS[i % MACHINE_MODELS.length];
    const serial = `${modelInfo.type === "washer" ? "WF" : "DR"}-2024-${(1000 + i).toString()}`;
    machines.push({
      id: demoId("mach", renters.indexOf(r)),
      user_id: DEMO_USER_ID,
      type: modelInfo.type,
      model: modelInfo.model,
      serial,
      status: r.status === "maintenance" ? "maintenance" : "assigned",
      assigned_renter_id: r.id,
      condition: pick(["excellent", "good", "fair"], i * 3),
      cost_basis: modelInfo.cost + pickRange(-50, 100, i * 7),
      prong: i % 3 === 0 ? "4-prong" : "3-prong",
      sourced_from: pick(["Home Depot", "Lowe's", "Wholesale", "Direct"], i * 13),
      notes: null,
      laundrylord_email: null,
      created_at: r.created_at,
      updated_at: NOW,
    });
  }

  // 7 extra unassigned machines (total ~20)
  for (let i = 0; i < 7; i++) {
    const idx = activeRenters.length + i;
    const modelInfo = MACHINE_MODELS[idx % MACHINE_MODELS.length];
    const serial = `${modelInfo.type === "washer" ? "WF" : "DR"}-2024-${(2000 + i).toString()}`;
    const isRetired = i === 0;
    machines.push({
      id: demoId("mach", 500 + i),
      user_id: DEMO_USER_ID,
      type: modelInfo.type,
      model: modelInfo.model,
      serial,
      status: isRetired ? "retired" : "available",
      assigned_renter_id: null,
      condition: isRetired ? "poor" : pick(["excellent", "good"], i * 3),
      cost_basis: modelInfo.cost,
      prong: i % 2 === 0 ? "3-prong" : "4-prong",
      sourced_from: pick(["Home Depot", "Lowe's", "Wholesale"], i * 7),
      notes: isRetired ? "Retired due to age / excessive repair cost." : null,
      laundrylord_email: null,
      created_at: dateOffset(pickRange(60, 200, i * 11)) + "T00:00:00.000Z",
      updated_at: NOW,
    });
  }

  return machines;
}

// ─── Generate payments: 6 months, ~85% stripe, 2 exceptions (1 venmo, 1 zelle) ───
function generatePayments(renters: RenterRow[]): PaymentRow[] {
  const payments: PaymentRow[] = [];
  let pIdx = 0;
  const payingRenters = renters.filter(r => ["active", "late", "maintenance"].includes(r.status));

  // Track which specific exception payments we've placed
  let venmoPlaced = false;
  let zellePlaced = false;

  for (const r of payingRenters) {
    for (let m = 0; m < 6; m++) {
      const dueDate = dateOffset(m * 30 + pickRange(0, 3, pIdx * 3));
      // Most recent month for late renters: not paid
      const isPaid = !(m === 0 && r.status === "late") && seededRandom(pIdx * 7) > 0.08;
      const isFailed = !isPaid && m === 0 && r.status === "late";

      // Payment source: mostly stripe, with exactly 1 venmo and 1 zelle
      let source: string | null = null;
      if (isPaid) {
        if (!venmoPlaced && pIdx === 5) {
          source = "venmo";
          venmoPlaced = true;
        } else if (!zellePlaced && pIdx === 14) {
          source = "zelle";
          zellePlaced = true;
        } else {
          source = "stripe";
        }
      }

      payments.push({
        id: demoId("pymt", pIdx),
        user_id: DEMO_USER_ID,
        renter_id: r.id,
        amount: r.monthly_rate,
        type: "rent",
        status: isPaid ? "paid" : isFailed ? "failed" : "overdue",
        due_date: dueDate,
        paid_date: isPaid ? dateOffset(m * 30 + pickRange(0, 2, pIdx * 13)) : null,
        payment_source: source,
        payment_notes: null,
        created_at: dueDate + "T00:00:00.000Z",
        updated_at: NOW,
      });
      pIdx++;
    }

    // Deposit payment
    if (r.deposit_collected) {
      payments.push({
        id: demoId("pymt", pIdx),
        user_id: DEMO_USER_ID,
        renter_id: r.id,
        amount: r.deposit_amount,
        type: "deposit",
        status: "paid",
        due_date: r.lease_start_date || dateOffset(180),
        paid_date: r.lease_start_date || dateOffset(180),
        payment_source: "stripe",
        payment_notes: null,
        created_at: (r.lease_start_date || dateOffset(180)) + "T00:00:00.000Z",
        updated_at: NOW,
      });
      pIdx++;
    }
  }

  return payments;
}

// ─── Generate maintenance logs (~6 entries) ───
function generateMaintenanceLogs(renters: RenterRow[], machines: MachineRow[]): MaintenanceRow[] {
  const logs: MaintenanceRow[] = [];
  const maintRenters = renters.filter(r => ["active", "late", "maintenance"].includes(r.status));

  for (let i = 0; i < 6; i++) {
    const r = maintRenters[i % maintRenters.length];
    const machine = machines.find(m => m.assigned_renter_id === r.id);
    if (!machine) continue;

    const category = MAINTENANCE_CATEGORIES[i];
    const reportedDaysAgo = pickRange(5, 90, i * 7);
    const isResolved = i >= 3;

    logs.push({
      id: demoId("mnt", i),
      user_id: DEMO_USER_ID,
      machine_id: machine.id,
      renter_id: r.id,
      issue_category: category,
      description: MAINTENANCE_DESCS[category] || "General maintenance issue",
      status: isResolved ? "resolved" : i < 2 ? "reported" : "in_progress",
      reported_date: dateOffset(reportedDaysAgo),
      resolved_date: isResolved ? dateOffset(reportedDaysAgo - pickRange(1, 5, i * 11)) : null,
      resolution_notes: isResolved ? "Replaced part and tested. Working normally." : null,
      cost: isResolved ? pickRange(35, 150, i * 13) : null,
      created_at: dateOffset(reportedDaysAgo) + "T00:00:00.000Z",
      updated_at: NOW,
    });
  }

  return logs;
}

// ─── Generate timeline events ───
function generateTimelineEvents(renters: RenterRow[]): TimelineRow[] {
  const events: TimelineRow[] = [];
  let eIdx = 0;

  for (const r of renters) {
    events.push({
      id: demoId("evnt", eIdx++),
      user_id: DEMO_USER_ID,
      renter_id: r.id,
      type: "created",
      description: `Renter ${r.name} added to system`,
      date: r.created_at.split("T")[0],
      created_at: r.created_at,
    });

    if (["active", "late", "maintenance"].includes(r.status)) {
      events.push({
        id: demoId("evnt", eIdx++),
        user_id: DEMO_USER_ID,
        renter_id: r.id,
        type: "machine_assigned",
        description: "Machine installed and assigned",
        date: r.lease_start_date || dateOffset(120),
        created_at: (r.lease_start_date || dateOffset(120)) + "T00:00:00.000Z",
      });

      events.push({
        id: demoId("evnt", eIdx++),
        user_id: DEMO_USER_ID,
        renter_id: r.id,
        type: "payment",
        description: `Payment of $${r.monthly_rate} received`,
        date: dateOffset(pickRange(1, 30, eIdx)),
        created_at: dateOffset(pickRange(1, 30, eIdx)) + "T00:00:00.000Z",
      });
    }

    if (r.status === "late") {
      events.push({
        id: demoId("evnt", eIdx++),
        user_id: DEMO_USER_ID,
        renter_id: r.id,
        type: "note",
        description: "Payment overdue — reminder sent",
        date: dateOffset(pickRange(1, 10, eIdx)),
        created_at: NOW,
      });
    }
  }

  return events;
}

// ─── Operator settings ───
function generateOperatorSettings(): OperatorSettingsRow {
  return {
    id: demoId("stng", 0),
    user_id: DEMO_USER_ID,
    business_name: "NYC Laundry Rentals",
    owner_email: "demo@laundrylord.com",
    default_monthly_rate: 65,
    default_install_fee: 100,
    default_deposit: 150,
    late_fee_amount: 25,
    late_fee_after_days: 5,
    reminder_days_before: 3,
    email_reminders_enabled: true,
    reminder_upcoming_enabled: true,
    reminder_failed_enabled: true,
    reminder_latefee_enabled: true,
    template_upcoming_subject: "Upcoming Payment Reminder",
    template_upcoming_body: "Hi {{name}}, your payment of ${{amount}} is due on {{date}}.",
    template_failed_subject: "Payment Failed",
    template_failed_body: "Hi {{name}}, your payment of ${{amount}} failed. Please update your payment method.",
    template_latefee_subject: "Late Fee Notice",
    template_latefee_body: "Hi {{name}}, a late fee of ${{late_fee}} has been applied to your account.",
    created_at: dateOffset(365) + "T00:00:00.000Z",
    updated_at: NOW,
  };
}

// ─── Export generated data (cached on first call) ───
let _cache: ReturnType<typeof _generate> | null = null;

function _generate() {
  const renters = generateRenters();
  const machines = generateMachines(renters);
  const payments = generatePayments(renters);
  const maintenanceLogs = generateMaintenanceLogs(renters, machines);
  const timelineEvents = generateTimelineEvents(renters);
  const operatorSettings = generateOperatorSettings();
  return { renters, machines, payments, maintenanceLogs, timelineEvents, operatorSettings };
}

export function getDemoData() {
  if (!_cache) _cache = _generate();
  return _cache;
}

/** Returns a fresh copy for resettable in-memory state */
export function cloneDemoData() {
  const src = getDemoData();
  return {
    renters: [...src.renters.map(r => ({ ...r }))],
    machines: [...src.machines.map(m => ({ ...m }))],
    payments: [...src.payments.map(p => ({ ...p }))],
    maintenanceLogs: [...src.maintenanceLogs.map(l => ({ ...l }))],
    timelineEvents: [...src.timelineEvents.map(e => ({ ...e }))],
    operatorSettings: { ...src.operatorSettings },
  };
}

/**
 * Pre-baked geocode cache for demo mode — all NYC.
 */
export function buildDemoGeoCache(): Record<string, { lat: number; lng: number }> {
  const cache: Record<string, { lat: number; lng: number }> = {};
  const renters = getDemoData().renters;

  for (let i = 0; i < renters.length; i++) {
    const addr = renters[i].address;
    if (!addr) continue;
    // Scatter around midtown Manhattan ±0.03° (~2 miles)
    const latOff = (seededRandom(i * 37 + 1) - 0.5) * 0.06;
    const lngOff = (seededRandom(i * 41 + 2) - 0.5) * 0.06;
    cache[addr] = {
      lat: NYC_CENTER.lat + latOff,
      lng: NYC_CENTER.lng + lngOff,
    };
  }

  return cache;
}

export { DEMO_USER_ID };
export type { RenterRow, MachineRow, PaymentRow, MaintenanceRow, TimelineRow, OperatorSettingsRow };
