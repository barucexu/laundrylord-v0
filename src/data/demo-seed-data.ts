/**
 * Demo seed data for LaundryLord Demo Mode.
 * 
 * EXTENDING THIS FILE:
 * - To add new entity types, create a new generate function following the pattern below
 * - All IDs are deterministic (based on index) so cross-references stay consistent
 * - Add new fields to existing generators when new columns are added to the database
 * - The data distribution tries to be realistic: ~70% active, with spread across other statuses
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

// ─── Seed arrays ───
const FIRST_NAMES = [
  "James","Maria","Robert","Patricia","David","Jennifer","Michael","Linda","William","Elizabeth",
  "Richard","Barbara","Joseph","Susan","Thomas","Jessica","Charles","Sarah","Christopher","Karen",
  "Daniel","Lisa","Matthew","Nancy","Anthony","Betty","Mark","Margaret","Donald","Sandra",
  "Steven","Ashley","Paul","Dorothy","Andrew","Kimberly","Joshua","Emily","Kenneth","Donna",
  "Kevin","Michelle","Brian","Carol","George","Amanda","Timothy","Melissa","Ronald","Deborah",
  "Edward","Stephanie","Jason","Rebecca","Jeffrey","Sharon","Ryan","Laura","Jacob","Cynthia",
  "Gary","Kathleen","Nicholas","Amy","Eric","Angela","Jonathan","Shirley","Stephen","Anna",
  "Larry","Brenda","Justin","Pamela","Scott","Emma","Brandon","Nicole","Benjamin","Helen",
  "Samuel","Samantha","Raymond","Katherine","Gregory","Christine","Frank","Debra","Alexander","Rachel",
  "Patrick","Carolyn","Jack","Janet","Dennis","Catherine","Jerry","Maria","Tyler","Heather",
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson",
  "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
];

// Realistic addresses by market
const MARKET_ADDRESSES: { state: string; city: string; streets: string[]; zips: string[] }[] = [
  // Texas (~70 renters)
  { state: "TX", city: "Houston", streets: ["Westheimer Rd","Richmond Ave","Bissonnet St","Bellaire Blvd","Gessner Rd","Beechnut St","Fondren Rd","Hillcroft Ave","Harwin Dr","Long Point Rd","Antoine Dr","Tidwell Rd","W 34th St","N Shepherd Dr","Yale St","Heights Blvd","Washington Ave","Memorial Dr","Dairy Ashford Rd","Eldridge Pkwy"], zips: ["77057","77036","77074","77081","77042","77096","77035","77072","77036","77092"] },
  { state: "TX", city: "Dallas", streets: ["Greenville Ave","Mockingbird Ln","Lemmon Ave","Oak Lawn Ave","Cedar Springs Rd","Inwood Rd","Harry Hines Blvd","Maple Ave","McKinney Ave","Ross Ave","Gaston Ave","Live Oak St","Haskell Ave","Peak St","Bryan St"], zips: ["75206","75219","75204","75201","75214","75205","75235","75247"] },
  { state: "TX", city: "San Antonio", streets: ["Fredericksburg Rd","Blanco Rd","Wurzbach Rd","Huebner Rd","Bandera Rd","Culebra Rd","Marbach Rd","Military Dr","Presa St","Nogalitos St"], zips: ["78201","78213","78216","78229","78240","78228","78227","78214"] },
  // Georgia (~49 renters)
  { state: "GA", city: "Atlanta", streets: ["Peachtree St NE","Piedmont Ave NE","Monroe Dr NE","Ponce De Leon Ave","North Ave NE","Boulevard NE","Ralph McGill Blvd","Edgewood Ave","DeKalb Ave","Moreland Ave","Flat Shoals Rd","Glenwood Ave","Memorial Dr","Covington Hwy","Candler Rd"], zips: ["30308","30306","30307","30312","30316","30317","30324","30309","30305"] },
  { state: "GA", city: "Decatur", streets: ["Church St","Ponce De Leon Pl","Commerce Dr","Scott Blvd","Clairmont Ave","N Decatur Rd","Columbia Dr","Candler St","W Ponce De Leon Ave","E College Ave"], zips: ["30030","30033","30032","30034"] },
  // Florida (~45 renters)
  { state: "FL", city: "Orlando", streets: ["Colonial Dr","Orange Blossom Trail","Semoran Blvd","Kirkman Rd","International Dr","Sand Lake Rd","Curry Ford Rd","Conway Rd","Bumby Ave","Mills Ave","Edgewater Dr","Par St","Pine Hills Rd","Silver Star Rd"], zips: ["32801","32803","32806","32809","32811","32819","32822","32825"] },
  { state: "FL", city: "Tampa", streets: ["Dale Mabry Hwy","Kennedy Blvd","Hillsborough Ave","Busch Blvd","Fletcher Ave","Fowler Ave","Nebraska Ave","Armenia Ave","Howard Ave","Bayshore Blvd"], zips: ["33602","33604","33606","33607","33609","33611","33612","33614"] },
  { state: "FL", city: "Miami", streets: ["Biscayne Blvd","Flagler St","Coral Way","Bird Rd","Calle Ocho","LeJeune Rd","Douglas Rd","Brickell Ave","NW 7th St","NW 36th St"], zips: ["33125","33127","33128","33130","33132","33134","33135","33137","33142"] },
  // Tennessee (~20 renters)
  { state: "TN", city: "Nashville", streets: ["Broadway","West End Ave","Charlotte Pike","Nolensville Pike","Gallatin Pike","Dickerson Pike","Murfreesboro Pike","Lebanon Pike","Shelby Ave","Main St"], zips: ["37203","37204","37206","37207","37208","37209","37210","37211","37212"] },
  { state: "TN", city: "Memphis", streets: ["Poplar Ave","Union Ave","Madison Ave","Summer Ave","Lamar Ave","Elvis Presley Blvd","S Third St","Highland St","Cooper St","McLean Blvd"], zips: ["38103","38104","38106","38107","38108","38111","38112","38114","38116","38117"] },
  // North Carolina (~15 renters)
  { state: "NC", city: "Charlotte", streets: ["South Blvd","Central Ave","Independence Blvd","Freedom Dr","Wilkinson Blvd","N Tryon St","The Plaza","Monroe Rd","Park Rd","Sharon Amity Rd"], zips: ["28202","28203","28204","28205","28206","28207","28208","28209","28210","28211"] },
  { state: "NC", city: "Raleigh", streets: ["Hillsborough St","Western Blvd","New Bern Ave","Capital Blvd","Glenwood Ave","Falls of Neuse Rd","Six Forks Rd","Wake Forest Rd","Poole Rd","Rock Quarry Rd"], zips: ["27601","27603","27604","27605","27606","27607","27608","27609","27610","27612"] },
  // Alabama (~1 renter)
  { state: "AL", city: "Birmingham", streets: ["1st Ave N","2nd Ave S","20th St S","Lakeshore Dr","Clairmont Ave"], zips: ["35203","35205","35209","35213"] },
];

// Renter distribution per market (total ~200)
const MARKET_RENTER_COUNTS = [30, 22, 18, 30, 19, 20, 14, 11, 12, 8, 8, 7, 1];

// ─── Market center coordinates for pre-baked geocoding ───
const MARKET_CENTERS: Record<string, { lat: number; lng: number }> = {
  "Houston, TX":      { lat: 29.760, lng: -95.370 },
  "Dallas, TX":       { lat: 32.780, lng: -96.800 },
  "San Antonio, TX":  { lat: 29.424, lng: -98.494 },
  "Atlanta, GA":      { lat: 33.749, lng: -84.388 },
  "Decatur, GA":      { lat: 33.775, lng: -84.296 },
  "Orlando, FL":      { lat: 28.538, lng: -81.379 },
  "Tampa, FL":        { lat: 27.951, lng: -82.458 },
  "Miami, FL":        { lat: 25.762, lng: -80.192 },
  "Nashville, TN":    { lat: 36.163, lng: -86.781 },
  "Memphis, TN":      { lat: 35.150, lng: -90.049 },
  "Charlotte, NC":    { lat: 35.227, lng: -80.843 },
  "Raleigh, NC":      { lat: 35.780, lng: -78.639 },
  "Birmingham, AL":   { lat: 33.521, lng: -86.802 },
};

const MACHINE_MODELS = [
  { type: "washer", model: "Samsung WF45R6100AW", cost: 450 },
  { type: "washer", model: "LG WM3600HWA", cost: 500 },
  { type: "washer", model: "Whirlpool WTW5000DW", cost: 380 },
  { type: "washer", model: "GE GTW465ASNWW", cost: 420 },
  { type: "washer", model: "Maytag MVW6230HW", cost: 550 },
  { type: "washer", model: "Samsung WF50R8500AV", cost: 600 },
  { type: "washer", model: "LG WM4000HWA", cost: 520 },
  { type: "dryer", model: "Samsung DVE45R6100W", cost: 400 },
  { type: "dryer", model: "LG DLE3600W", cost: 450 },
  { type: "dryer", model: "Whirlpool WED5000DW", cost: 350 },
  { type: "dryer", model: "GE GTD65EBSJWS", cost: 380 },
  { type: "dryer", model: "Maytag MED6230HW", cost: 500 },
  { type: "dryer", model: "Samsung DVE50R8500V", cost: 550 },
  { type: "dryer", model: "LG DLEX4000W", cost: 480 },
];

const RENTER_STATUSES: RenterRow["status"][] = [
  ...Array(140).fill("active"),
  ...Array(20).fill("late"),
  ...Array(10).fill("scheduled"),
  ...Array(8).fill("maintenance"),
  ...Array(5).fill("termination_requested"),
  ...Array(5).fill("pickup_scheduled"),
  ...Array(7).fill("lead"),
  ...Array(5).fill("closed"),
];

const MAINTENANCE_CATEGORIES = ["leak", "noise", "error_code", "not_starting", "vibration", "door_issue", "drainage", "electrical"];
const MAINTENANCE_DESCS: Record<string, string[]> = {
  leak: ["Water pooling under washer during spin cycle", "Slow drip from drain hose connection", "Leak detected at water inlet valve"],
  noise: ["Loud banging during spin cycle", "Grinding noise when agitating", "Squeaking sound during wash"],
  error_code: ["Error code E3 displaying on washer", "F5 error code - door lock failure", "UE error - unbalanced load detected repeatedly"],
  not_starting: ["Machine won't power on", "Start button unresponsive", "Powers on but won't begin cycle"],
  vibration: ["Excessive vibration causing movement", "Machine walks across floor during spin", "Vibration shaking nearby items off shelf"],
  door_issue: ["Door won't latch properly", "Door seal torn, water leaking", "Door won't unlock after cycle"],
  drainage: ["Water not draining completely", "Slow drainage causing overflow", "Drain pump making noise but not pumping"],
  electrical: ["Tripping circuit breaker", "Intermittent power loss during cycle", "Outlet showing signs of overheating"],
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

// ─── Generate renters ───
function generateRenters(): RenterRow[] {
  const renters: RenterRow[] = [];
  let renterIdx = 0;
  let nameIdx = 0;

  for (let mktIdx = 0; mktIdx < MARKET_ADDRESSES.length; mktIdx++) {
    const mkt = MARKET_ADDRESSES[mktIdx];
    const count = MARKET_RENTER_COUNTS[mktIdx];

    for (let i = 0; i < count; i++) {
      const id = demoId("rntr", renterIdx);
      const firstName = FIRST_NAMES[nameIdx % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(nameIdx + 7) % LAST_NAMES.length];
      const status = RENTER_STATUSES[renterIdx % RENTER_STATUSES.length];
      const streetNum = pickRange(100, 9999, renterIdx * 3 + 1);
      const street = mkt.streets[i % mkt.streets.length];
      const zip = mkt.zips[i % mkt.zips.length];
      const monthlyRate = [45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100][renterIdx % 12];
      const isActive = ["active", "late", "maintenance"].includes(status);
      const daysLate = status === "late" ? pickRange(5, 60, renterIdx * 7) : 0;
      const leaseStart = dateOffset(pickRange(30, 730, renterIdx * 11));
      const paidThrough = isActive ? dateOffset(status === "late" ? pickRange(5, 60, renterIdx * 13) : -pickRange(0, 25, renterIdx * 17)) : null;
      const balance = status === "late" ? monthlyRate * (daysLate > 30 ? 2 : 1) : 0;
      const phone = `(${pickRange(200, 999, renterIdx * 19)}) ${pickRange(200, 999, renterIdx * 23)}-${pickRange(1000, 9999, renterIdx * 29)}`;
      const depositAmt = [100, 150, 200, 250][renterIdx % 4];
      const installFee = [75, 100, 125, 150][renterIdx % 4];
      const rentCollected = isActive ? monthlyRate * pickRange(1, 18, renterIdx * 31) : 0;

      renters.push({
        id,
        user_id: DEMO_USER_ID,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone,
        address: `${streetNum} ${street}, ${mkt.city}, ${mkt.state} ${zip}`,
        status,
        monthly_rate: monthlyRate,
        balance,
        days_late: daysLate,
        deposit_amount: depositAmt,
        deposit_collected: isActive || status === "closed",
        install_fee: installFee,
        install_fee_collected: isActive || status === "closed",
        install_notes: renterIdx % 5 === 0 ? "Installed by field tech. No issues." : null,
        late_fee: status === "late" ? 25 : 0,
        lease_start_date: leaseStart,
        min_term_end_date: dateOffset(pickRange(-365, -30, renterIdx * 37)),
        next_due_date: isActive ? dateOffset(-pickRange(1, 28, renterIdx * 41)) : null,
        paid_through_date: paidThrough,
        rent_collected: rentCollected,
        has_payment_method: isActive && renterIdx % 3 !== 0,
        stripe_customer_id: isActive && renterIdx % 3 !== 0 ? `cus_demo_${renterIdx}` : null,
        stripe_subscription_id: isActive && renterIdx % 4 === 0 ? `sub_demo_${renterIdx}` : null,
        machine_id: isActive ? demoId("mach", renterIdx) : null,
        language: renterIdx % 8 === 0 ? "es" : "en",
        notes: renterIdx % 4 === 0 ? "Good tenant, always pays on time." : renterIdx % 7 === 0 ? "Had minor maintenance issue last month." : null,
        secondary_contact: renterIdx % 6 === 0 ? `${FIRST_NAMES[(nameIdx + 3) % FIRST_NAMES.length]} ${lastName} - ${phone}` : null,
        created_at: new Date(new Date(leaseStart).getTime() - 7 * 86400000).toISOString(),
        updated_at: NOW,
      });

      renterIdx++;
      nameIdx++;
    }
  }
  return renters;
}

// ─── Generate machines ───
function generateMachines(renters: RenterRow[]): MachineRow[] {
  const machines: MachineRow[] = [];
  const activeRenters = renters.filter(r => ["active", "late", "maintenance"].includes(r.status));

  // Assigned machines (one per active renter)
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
      prong: pick(["3-prong", "4-prong", null], i * 11),
      sourced_from: pick(["Home Depot", "Lowe's", "Wholesale", "Refurbished", "Direct"], i * 13),
      notes: null,
      created_at: r.created_at,
      updated_at: NOW,
    });
  }

  // Extra unassigned/available machines
  const extraCount = 50;
  for (let i = 0; i < extraCount; i++) {
    const idx = activeRenters.length + i;
    const modelInfo = MACHINE_MODELS[idx % MACHINE_MODELS.length];
    const serial = `${modelInfo.type === "washer" ? "WF" : "DR"}-2024-${(2000 + i).toString()}`;
    const isRetired = i < 5;
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
      prong: pick(["3-prong", "4-prong"], i * 5),
      sourced_from: pick(["Home Depot", "Lowe's", "Wholesale"], i * 7),
      notes: isRetired ? "Retired due to age / excessive repair cost." : null,
      created_at: dateOffset(pickRange(60, 400, i * 11)) + "T00:00:00.000Z",
      updated_at: NOW,
    });
  }

  return machines;
}

// ─── Generate payments ───
function generatePayments(renters: RenterRow[]): PaymentRow[] {
  const payments: PaymentRow[] = [];
  let pIdx = 0;
  const activeRenters = renters.filter(r => ["active", "late", "maintenance", "closed"].includes(r.status));

  for (const r of activeRenters) {
    const months = r.status === "closed" ? 3 : 6;
    for (let m = 0; m < months; m++) {
      const dueDate = dateOffset(m * 30 + pickRange(0, 5, pIdx * 3));
      const isPaid = m > 0 || (r.status !== "late" && seededRandom(pIdx * 7) > 0.15);
      const isFailed = !isPaid && seededRandom(pIdx * 11) > 0.5;

      payments.push({
        id: demoId("pymt", pIdx),
        user_id: DEMO_USER_ID,
        renter_id: r.id,
        amount: r.monthly_rate,
        type: "rent",
        status: isPaid ? "paid" : isFailed ? "failed" : "overdue",
        due_date: dueDate,
        paid_date: isPaid ? dateOffset(m * 30 + pickRange(0, 3, pIdx * 13)) : null,
        payment_source: isPaid ? pick(["stripe", "cash", "zelle", "check", "venmo"], pIdx * 17) : null,
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
        payment_source: pick(["cash", "zelle", "check"], pIdx * 19),
        payment_notes: null,
        created_at: (r.lease_start_date || dateOffset(180)) + "T00:00:00.000Z",
        updated_at: NOW,
      });
      pIdx++;
    }
  }

  return payments;
}

// ─── Generate maintenance logs ───
function generateMaintenanceLogs(renters: RenterRow[], machines: MachineRow[]): MaintenanceRow[] {
  const logs: MaintenanceRow[] = [];
  const maintRenters = renters.filter(r => ["active", "late", "maintenance"].includes(r.status));
  
  for (let i = 0; i < 60; i++) {
    const r = maintRenters[i % maintRenters.length];
    const machine = machines.find(m => m.assigned_renter_id === r.id);
    if (!machine) continue;

    const category = MAINTENANCE_CATEGORIES[i % MAINTENANCE_CATEGORIES.length];
    const descs = MAINTENANCE_DESCS[category] || ["General maintenance issue"];
    const reportedDaysAgo = pickRange(1, 120, i * 7);
    const isResolved = i > 20;

    logs.push({
      id: demoId("mnt", i),
      user_id: DEMO_USER_ID,
      machine_id: machine.id,
      renter_id: r.id,
      issue_category: category,
      description: descs[i % descs.length],
      status: isResolved ? "resolved" : i < 10 ? "reported" : i < 15 ? "scheduled" : "in_progress",
      reported_date: dateOffset(reportedDaysAgo),
      resolved_date: isResolved ? dateOffset(reportedDaysAgo - pickRange(1, 7, i * 11)) : null,
      resolution_notes: isResolved ? "Replaced part and tested. Working normally." : null,
      cost: isResolved ? pickRange(25, 200, i * 13) : null,
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
    // Created event
    events.push({
      id: demoId("evnt", eIdx++),
      user_id: DEMO_USER_ID,
      renter_id: r.id,
      type: "created",
      description: `Renter ${r.name} added to system`,
      date: r.created_at.split("T")[0],
      created_at: r.created_at,
    });

    if (["active", "late", "maintenance", "closed"].includes(r.status)) {
      // Machine assigned
      events.push({
        id: demoId("evnt", eIdx++),
        user_id: DEMO_USER_ID,
        renter_id: r.id,
        type: "machine_assigned",
        description: "Machine installed and assigned",
        date: r.lease_start_date || dateOffset(120),
        created_at: (r.lease_start_date || dateOffset(120)) + "T00:00:00.000Z",
      });

      // A couple payment events
      for (let p = 0; p < 2; p++) {
        events.push({
          id: demoId("evnt", eIdx++),
          user_id: DEMO_USER_ID,
          renter_id: r.id,
          type: "payment",
          description: `Payment of $${r.monthly_rate} received`,
          date: dateOffset(p * 30 + pickRange(0, 5, eIdx)),
          created_at: dateOffset(p * 30) + "T00:00:00.000Z",
        });
      }
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
    business_name: "SunBelt Laundry Rentals",
    default_monthly_rate: 60,
    default_install_fee: 100,
    default_deposit: 150,
    late_fee_amount: 25,
    late_fee_after_days: 5,
    reminder_days_before: 3,
    email_reminders_enabled: true,
    reminder_upcoming_enabled: true,
    reminder_failed_enabled: true,
    reminder_latefee_enabled: true,
    stripe_secret_key: null,
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

export { DEMO_USER_ID };
export type { RenterRow, MachineRow, PaymentRow, MaintenanceRow, TimelineRow, OperatorSettingsRow };
