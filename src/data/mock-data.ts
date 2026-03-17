export type RenterStatus = 'lead' | 'scheduled' | 'active' | 'late' | 'maintenance' | 'termination_requested' | 'pickup_scheduled' | 'closed' | 'defaulted';
export type MachineStatus = 'available' | 'assigned' | 'maintenance' | 'retired';
export type PaymentStatus = 'upcoming' | 'due_soon' | 'overdue' | 'failed' | 'paid';
export type MaintenanceStatus = 'reported' | 'scheduled' | 'in_progress' | 'resolved';

export interface Renter {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  status: RenterStatus;
  leaseStartDate: string;
  minTermEndDate: string;
  machineId: string | null;
  monthlyRate: number;
  balance: number;
  paidThroughDate: string;
  nextDueDate: string;
  daysLate: number;
  notes: string;
}

export interface Machine {
  id: string;
  type: 'washer' | 'dryer';
  model: string;
  serial: string;
  prong: '3-prong' | '4-prong';
  status: MachineStatus;
  assignedRenterId: string | null;
  condition: string;
  notes: string;
}

export interface Payment {
  id: string;
  renterId: string;
  renterName: string;
  amount: number;
  status: PaymentStatus;
  dueDate: string;
  paidDate: string | null;
  type: 'rent' | 'install_fee' | 'deposit' | 'late_fee' | 'early_termination';
}

export interface MaintenanceLog {
  id: string;
  renterId: string | null;
  renterName: string;
  machineId: string;
  machineModel: string;
  issueCategory: string;
  description: string;
  status: MaintenanceStatus;
  reportedDate: string;
  resolvedDate: string | null;
  resolutionNotes: string;
  cost: number | null;
}

export interface TimelineEvent {
  id: string;
  renterId: string;
  type: 'created' | 'machine_assigned' | 'payment_succeeded' | 'payment_failed' | 'late_fee' | 'maintenance_opened' | 'maintenance_resolved' | 'pickup_scheduled' | 'pickup_completed' | 'note';
  description: string;
  date: string;
}

export const renters: Renter[] = [
  { id: 'r1', name: 'Marcus Johnson', phone: '(404) 555-0112', email: 'marcus.j@email.com', address: '1247 Peachtree Ln, Atlanta, GA 30309', status: 'active', leaseStartDate: '2025-01-15', minTermEndDate: '2025-07-15', machineId: 'm1', monthlyRate: 150, balance: 0, paidThroughDate: '2026-04-15', nextDueDate: '2026-04-15', daysLate: 0, notes: '' },
  { id: 'r2', name: 'Sarah Chen', phone: '(404) 555-0198', email: 'sarah.c@email.com', address: '892 Magnolia Dr, Atlanta, GA 30312', status: 'late', leaseStartDate: '2024-11-01', minTermEndDate: '2025-05-01', machineId: 'm3', monthlyRate: 175, balance: 350, paidThroughDate: '2026-01-01', nextDueDate: '2026-02-01', daysLate: 44, notes: 'Called twice, no answer' },
  { id: 'r3', name: 'DeShawn Williams', phone: '(770) 555-0234', email: 'deshawn.w@email.com', address: '3401 Cascade Rd SW, Atlanta, GA 30311', status: 'active', leaseStartDate: '2025-03-01', minTermEndDate: '2025-09-01', machineId: 'm5', monthlyRate: 150, balance: 0, paidThroughDate: '2026-04-01', nextDueDate: '2026-04-01', daysLate: 0, notes: '' },
  { id: 'r4', name: 'Emily Rodriguez', phone: '(678) 555-0156', email: 'emily.r@email.com', address: '567 Ponce de Leon Ave, Atlanta, GA 30308', status: 'active', leaseStartDate: '2025-02-15', minTermEndDate: '2025-08-15', machineId: 'm7', monthlyRate: 200, balance: 0, paidThroughDate: '2026-03-15', nextDueDate: '2026-03-15', daysLate: 2, notes: 'Premium setup, washer + dryer' },
  { id: 'r5', name: 'Tyrone Davis', phone: '(404) 555-0321', email: 'tyrone.d@email.com', address: '2100 MLK Jr Dr, Atlanta, GA 30310', status: 'late', leaseStartDate: '2024-09-01', minTermEndDate: '2025-03-01', machineId: 'm2', monthlyRate: 150, balance: 600, paidThroughDate: '2025-12-01', nextDueDate: '2026-01-01', daysLate: 75, notes: 'Sent final notice 2/28' },
  { id: 'r6', name: 'Ashley Kim', phone: '(770) 555-0478', email: 'ashley.k@email.com', address: '4521 Roswell Rd, Atlanta, GA 30342', status: 'scheduled', leaseStartDate: '2026-03-25', minTermEndDate: '2026-09-25', machineId: null, monthlyRate: 175, balance: 0, paidThroughDate: '', nextDueDate: '2026-04-25', daysLate: 0, notes: 'Install scheduled 3/25' },
  { id: 'r7', name: 'James Wright', phone: '(678) 555-0289', email: 'james.w@email.com', address: '789 Memorial Dr, Atlanta, GA 30316', status: 'maintenance', leaseStartDate: '2025-01-01', minTermEndDate: '2025-07-01', machineId: 'm4', monthlyRate: 150, balance: 0, paidThroughDate: '2026-04-01', nextDueDate: '2026-04-01', daysLate: 0, notes: 'Washer leaking, tech scheduled' },
  { id: 'r8', name: 'Maria Santos', phone: '(404) 555-0543', email: 'maria.s@email.com', address: '1890 Glenwood Ave, Atlanta, GA 30316', status: 'termination_requested', leaseStartDate: '2024-08-01', minTermEndDate: '2025-02-01', machineId: 'm6', monthlyRate: 150, balance: 150, paidThroughDate: '2026-02-01', nextDueDate: '2026-03-01', daysLate: 16, notes: 'Moving out of state, wants pickup by 3/31' },
  { id: 'r9', name: 'Robert Taylor', phone: '(770) 555-0612', email: 'rob.t@email.com', address: '3200 Northside Dr, Atlanta, GA 30305', status: 'pickup_scheduled', leaseStartDate: '2024-06-01', minTermEndDate: '2024-12-01', machineId: 'm8', monthlyRate: 175, balance: 0, paidThroughDate: '2026-03-01', nextDueDate: '', daysLate: 0, notes: 'Pickup 3/22, confirmed' },
  { id: 'r10', name: 'Lisa Nguyen', phone: '(678) 555-0777', email: 'lisa.n@email.com', address: '450 Boulevard SE, Atlanta, GA 30312', status: 'lead', leaseStartDate: '', minTermEndDate: '', machineId: null, monthlyRate: 150, balance: 0, paidThroughDate: '', nextDueDate: '', daysLate: 0, notes: 'Inquired via FB Marketplace 3/14' },
  { id: 'r11', name: 'Kevin Brown', phone: '(404) 555-0888', email: 'kev.b@email.com', address: '2750 Campbellton Rd, Atlanta, GA 30311', status: 'closed', leaseStartDate: '2024-03-01', minTermEndDate: '2024-09-01', machineId: null, monthlyRate: 150, balance: 0, paidThroughDate: '2025-11-01', nextDueDate: '', daysLate: 0, notes: 'Clean close, machine returned good condition' },
  { id: 'r12', name: 'Priya Patel', phone: '(770) 555-0999', email: 'priya.p@email.com', address: '6100 Jimmy Carter Blvd, Norcross, GA 30071', status: 'active', leaseStartDate: '2025-02-01', minTermEndDate: '2025-08-01', machineId: 'm9', monthlyRate: 150, balance: 0, paidThroughDate: '2026-04-01', nextDueDate: '2026-04-01', daysLate: 0, notes: '' },
];

export const machines: Machine[] = [
  { id: 'm1', type: 'washer', model: 'Samsung WF45R6100AW', serial: 'WF-2024-0441', prong: '3-prong', status: 'assigned', assignedRenterId: 'r1', condition: 'Good', notes: '' },
  { id: 'm2', type: 'washer', model: 'LG WM3600HWA', serial: 'LG-2024-0892', prong: '3-prong', status: 'assigned', assignedRenterId: 'r5', condition: 'Fair', notes: 'Minor dent on side' },
  { id: 'm3', type: 'dryer', model: 'Samsung DVE45R6100W', serial: 'DV-2024-0443', prong: '4-prong', status: 'assigned', assignedRenterId: 'r2', condition: 'Good', notes: '' },
  { id: 'm4', type: 'washer', model: 'Whirlpool WTW5000DW', serial: 'WP-2023-1102', prong: '3-prong', status: 'maintenance', assignedRenterId: 'r7', condition: 'Needs repair', notes: 'Leaking from bottom seal' },
  { id: 'm5', type: 'dryer', model: 'LG DLE3600W', serial: 'LG-2024-0991', prong: '4-prong', status: 'assigned', assignedRenterId: 'r3', condition: 'Excellent', notes: '' },
  { id: 'm6', type: 'washer', model: 'GE GTW465ASNWW', serial: 'GE-2023-0556', prong: '3-prong', status: 'assigned', assignedRenterId: 'r8', condition: 'Good', notes: '' },
  { id: 'm7', type: 'washer', model: 'Samsung WF45R6300AW', serial: 'WF-2025-0102', prong: '4-prong', status: 'assigned', assignedRenterId: 'r4', condition: 'Excellent', notes: 'Premium model' },
  { id: 'm8', type: 'dryer', model: 'Whirlpool WED5000DW', serial: 'WP-2023-1201', prong: '4-prong', status: 'assigned', assignedRenterId: 'r9', condition: 'Good', notes: 'Pickup scheduled' },
  { id: 'm9', type: 'washer', model: 'LG WM3400CW', serial: 'LG-2025-0110', prong: '3-prong', status: 'assigned', assignedRenterId: 'r12', condition: 'Excellent', notes: '' },
  { id: 'm10', type: 'dryer', model: 'Samsung DVE45T6000W', serial: 'DV-2025-0220', prong: '4-prong', status: 'available', assignedRenterId: null, condition: 'New', notes: 'Ready for next install' },
  { id: 'm11', type: 'washer', model: 'GE GTW335ASNWW', serial: 'GE-2022-0331', prong: '3-prong', status: 'retired', assignedRenterId: null, condition: 'Poor', notes: 'Motor failed, not worth repairing' },
];

export const payments: Payment[] = [
  { id: 'p1', renterId: 'r1', renterName: 'Marcus Johnson', amount: 150, status: 'paid', dueDate: '2026-03-15', paidDate: '2026-03-14', type: 'rent' },
  { id: 'p2', renterId: 'r2', renterName: 'Sarah Chen', amount: 175, status: 'overdue', dueDate: '2026-02-01', paidDate: null, type: 'rent' },
  { id: 'p3', renterId: 'r2', renterName: 'Sarah Chen', amount: 175, status: 'overdue', dueDate: '2026-03-01', paidDate: null, type: 'rent' },
  { id: 'p4', renterId: 'r3', renterName: 'DeShawn Williams', amount: 150, status: 'paid', dueDate: '2026-03-01', paidDate: '2026-03-01', type: 'rent' },
  { id: 'p5', renterId: 'r4', renterName: 'Emily Rodriguez', amount: 200, status: 'due_soon', dueDate: '2026-03-15', paidDate: null, type: 'rent' },
  { id: 'p6', renterId: 'r5', renterName: 'Tyrone Davis', amount: 150, status: 'failed', dueDate: '2026-01-01', paidDate: null, type: 'rent' },
  { id: 'p7', renterId: 'r5', renterName: 'Tyrone Davis', amount: 150, status: 'overdue', dueDate: '2026-02-01', paidDate: null, type: 'rent' },
  { id: 'p8', renterId: 'r5', renterName: 'Tyrone Davis', amount: 150, status: 'overdue', dueDate: '2026-03-01', paidDate: null, type: 'rent' },
  { id: 'p9', renterId: 'r5', renterName: 'Tyrone Davis', amount: 50, status: 'overdue', dueDate: '2026-02-01', paidDate: null, type: 'late_fee' },
  { id: 'p10', renterId: 'r7', renterName: 'James Wright', amount: 150, status: 'paid', dueDate: '2026-03-01', paidDate: '2026-03-01', type: 'rent' },
  { id: 'p11', renterId: 'r8', renterName: 'Maria Santos', amount: 150, status: 'overdue', dueDate: '2026-03-01', paidDate: null, type: 'rent' },
  { id: 'p12', renterId: 'r12', renterName: 'Priya Patel', amount: 150, status: 'paid', dueDate: '2026-03-01', paidDate: '2026-02-28', type: 'rent' },
  { id: 'p13', renterId: 'r1', renterName: 'Marcus Johnson', amount: 150, status: 'upcoming', dueDate: '2026-04-15', paidDate: null, type: 'rent' },
  { id: 'p14', renterId: 'r3', renterName: 'DeShawn Williams', amount: 150, status: 'upcoming', dueDate: '2026-04-01', paidDate: null, type: 'rent' },
  { id: 'p15', renterId: 'r12', renterName: 'Priya Patel', amount: 150, status: 'upcoming', dueDate: '2026-04-01', paidDate: null, type: 'rent' },
  { id: 'p16', renterId: 'r6', renterName: 'Ashley Kim', amount: 100, status: 'paid', dueDate: '2026-03-20', paidDate: '2026-03-20', type: 'install_fee' },
];

export const maintenanceLogs: MaintenanceLog[] = [
  { id: 'mt1', renterId: 'r7', renterName: 'James Wright', machineId: 'm4', machineModel: 'Whirlpool WTW5000DW', issueCategory: 'Leak', description: 'Water leaking from bottom during spin cycle', status: 'scheduled', reportedDate: '2026-03-10', resolvedDate: null, resolutionNotes: '', cost: null },
  { id: 'mt2', renterId: 'r2', renterName: 'Sarah Chen', machineId: 'm3', machineModel: 'Samsung DVE45R6100W', issueCategory: 'Noise', description: 'Loud rattling during drying cycle', status: 'reported', reportedDate: '2026-03-14', resolvedDate: null, resolutionNotes: '', cost: null },
  { id: 'mt3', renterId: 'r1', renterName: 'Marcus Johnson', machineId: 'm1', machineModel: 'Samsung WF45R6100AW', issueCategory: 'Error Code', description: 'UE error code showing intermittently', status: 'resolved', reportedDate: '2026-02-20', resolvedDate: '2026-02-25', resolutionNotes: 'Rebalanced drum, replaced shock absorber', cost: 85 },
  { id: 'mt4', renterId: 'r5', renterName: 'Tyrone Davis', machineId: 'm2', machineModel: 'LG WM3600HWA', issueCategory: 'Not Starting', description: 'Machine won\'t power on', status: 'in_progress', reportedDate: '2026-03-12', resolvedDate: null, resolutionNotes: '', cost: null },
];

export const timelineEvents: TimelineEvent[] = [
  { id: 't1', renterId: 'r1', type: 'created', description: 'Renter record created', date: '2025-01-10' },
  { id: 't2', renterId: 'r1', type: 'machine_assigned', description: 'Samsung WF45R6100AW assigned', date: '2025-01-15' },
  { id: 't3', renterId: 'r1', type: 'payment_succeeded', description: 'Monthly rent $150.00 paid', date: '2026-03-14' },
  { id: 't4', renterId: 'r1', type: 'maintenance_opened', description: 'UE error code reported', date: '2026-02-20' },
  { id: 't5', renterId: 'r1', type: 'maintenance_resolved', description: 'Rebalanced drum, replaced shock absorber — $85', date: '2026-02-25' },
  { id: 't6', renterId: 'r2', type: 'payment_failed', description: 'Monthly rent $175.00 payment failed', date: '2026-02-01' },
  { id: 't7', renterId: 'r2', type: 'late_fee', description: 'Late fee of $25.00 applied', date: '2026-02-15' },
  { id: 't8', renterId: 'r5', type: 'payment_failed', description: 'Monthly rent $150.00 payment failed', date: '2026-01-01' },
  { id: 't9', renterId: 'r5', type: 'note', description: 'Sent final notice via text and email', date: '2026-02-28' },
  { id: 't10', renterId: 'r8', type: 'note', description: 'Termination requested — moving out of state', date: '2026-03-05' },
  { id: 't11', renterId: 'r9', type: 'pickup_scheduled', description: 'Pickup scheduled for 3/22', date: '2026-03-15' },
];

export const getMachineForRenter = (renterId: string) => machines.find(m => m.assignedRenterId === renterId);
export const getRenterForMachine = (machineId: string) => renters.find(r => r.machineId === machineId);
export const getTimelineForRenter = (renterId: string) => timelineEvents.filter(t => t.renterId === renterId).sort((a, b) => b.date.localeCompare(a.date));
export const getMaintenanceForRenter = (renterId: string) => maintenanceLogs.filter(m => m.renterId === renterId);
export const getPaymentsForRenter = (renterId: string) => payments.filter(p => p.renterId === renterId);
