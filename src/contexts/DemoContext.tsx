/**
 * DemoContext — provides in-memory demo data that mirrors the Supabase data hooks.
 * 
 * EXTENDING: When new entity types are added to useSupabaseData, add matching
 * state + CRUD helpers here and update the demo seed data generator.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { cloneDemoData, DEMO_USER_ID } from "@/data/demo-seed-data";
import type { RenterRow, MachineRow, PaymentRow, MaintenanceRow, TimelineRow, RenterApplicationRow, OperatorSettingsRow } from "@/data/demo-seed-data";
import { formatApplicationAddress } from "@/lib/renter-applications";

interface DemoState {
  renters: RenterRow[];
  machines: MachineRow[];
  payments: PaymentRow[];
  maintenanceLogs: MaintenanceRow[];
  timelineEvents: TimelineRow[];
  renterApplications: RenterApplicationRow[];
  operatorSettings: OperatorSettingsRow;
}

interface DemoContextType {
  isDemo: boolean;
  data: DemoState;
  // Mutations
  updateRenter: (id: string, updates: Partial<RenterRow>) => RenterRow | null;
  addRenter: (renter: Omit<RenterRow, "id" | "user_id" | "created_at" | "updated_at">) => RenterRow;
  updateMachine: (id: string, updates: Partial<MachineRow>) => MachineRow | null;
  addMachine: (machine: Omit<MachineRow, "id" | "user_id" | "created_at" | "updated_at">) => MachineRow;
  addPayment: (payment: Omit<PaymentRow, "id" | "user_id" | "created_at" | "updated_at">) => PaymentRow;
  addMaintenanceLog: (log: Omit<MaintenanceRow, "id" | "user_id" | "created_at" | "updated_at">) => MaintenanceRow;
  updateMaintenanceLog: (id: string, updates: Partial<MaintenanceRow>) => MaintenanceRow | null;
  archiveMaintenanceLog: (id: string) => MaintenanceRow | null;
  addTimelineEvent: (event: Omit<TimelineRow, "id" | "user_id" | "created_at">) => TimelineRow;
  updateRenterApplication: (id: string, updates: Partial<RenterApplicationRow>) => RenterApplicationRow | null;
  convertRenterApplication: (id: string) => string | null;
  updateSettings: (updates: Partial<OperatorSettingsRow>) => OperatorSettingsRow;
}

const DemoContext = createContext<DemoContextType | null>(null);

let nextId = 9000;
function genId(prefix: string) {
  return `d3m0-${prefix}-gen-${(nextId++).toString(16).padStart(8, "0")}`;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoState>(() => cloneDemoData());

  const updateRenter = useCallback((id: string, updates: Partial<RenterRow>) => {
    let result: RenterRow | null = null;
    setData(prev => {
      const renters = prev.renters.map(r => {
        if (r.id === id) { result = { ...r, ...updates, updated_at: new Date().toISOString() }; return result; }
        return r;
      });
      return { ...prev, renters };
    });
    return result;
  }, []);

  const addRenter = useCallback((renter: Omit<RenterRow, "id" | "user_id" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const newR: RenterRow = { ...renter, id: genId("rntr"), user_id: DEMO_USER_ID, created_at: now, updated_at: now } as RenterRow;
    setData(prev => ({ ...prev, renters: [newR, ...prev.renters] }));
    return newR;
  }, []);

  const updateMachine = useCallback((id: string, updates: Partial<MachineRow>) => {
    let result: MachineRow | null = null;
    setData(prev => {
      const machines = prev.machines.map(m => {
        if (m.id === id) { result = { ...m, ...updates, updated_at: new Date().toISOString() }; return result; }
        return m;
      });
      return { ...prev, machines };
    });
    return result;
  }, []);

  const addMachine = useCallback((machine: Omit<MachineRow, "id" | "user_id" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const newM: MachineRow = { ...machine, id: genId("mach"), user_id: DEMO_USER_ID, created_at: now, updated_at: now } as MachineRow;
    setData(prev => ({ ...prev, machines: [newM, ...prev.machines] }));
    return newM;
  }, []);

  const addPayment = useCallback((payment: Omit<PaymentRow, "id" | "user_id" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const newP: PaymentRow = { ...payment, id: genId("pymt"), user_id: DEMO_USER_ID, created_at: now, updated_at: now } as PaymentRow;
    setData(prev => ({ ...prev, payments: [newP, ...prev.payments] }));
    return newP;
  }, []);

  const addMaintenanceLog = useCallback((log: Omit<MaintenanceRow, "id" | "user_id" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const newLog: MaintenanceRow = { ...log, id: genId("mnt"), user_id: DEMO_USER_ID, created_at: now, updated_at: now } as MaintenanceRow;
    setData(prev => ({ ...prev, maintenanceLogs: [newLog, ...prev.maintenanceLogs] }));
    return newLog;
  }, []);

  const updateMaintenanceLog = useCallback((id: string, updates: Partial<MaintenanceRow>) => {
    let result: MaintenanceRow | null = null;
    setData(prev => {
      const maintenanceLogs = prev.maintenanceLogs.map(log => {
        if (log.id === id) { result = { ...log, ...updates, updated_at: new Date().toISOString() }; return result; }
        return log;
      });
      return { ...prev, maintenanceLogs };
    });
    return result;
  }, []);

  const archiveMaintenanceLog = useCallback((id: string) => {
    let result: MaintenanceRow | null = null;
    setData(prev => {
      const maintenanceLogs = prev.maintenanceLogs.map(log => {
        if (log.id === id) { result = { ...log, archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }; return result; }
        return log;
      });
      return { ...prev, maintenanceLogs };
    });
    return result;
  }, []);

  const addTimelineEvent = useCallback((event: Omit<TimelineRow, "id" | "user_id" | "created_at">) => {
    const now = new Date().toISOString();
    const newEvent: TimelineRow = {
      ...event,
      id: genId("tl"),
      user_id: DEMO_USER_ID,
      created_at: now,
    } as TimelineRow;
    setData(prev => ({ ...prev, timelineEvents: [newEvent, ...prev.timelineEvents] }));
    return newEvent;
  }, []);

  const updateRenterApplication = useCallback((id: string, updates: Partial<RenterApplicationRow>) => {
    let result: RenterApplicationRow | null = null;
    setData((prev) => {
      const renterApplications = prev.renterApplications.map((application) => {
        if (application.id === id) {
          result = { ...application, ...updates, updated_at: new Date().toISOString() };
          return result;
        }
        return application;
      });
      return { ...prev, renterApplications };
    });
    return result;
  }, []);

  const convertRenterApplication = useCallback((id: string) => {
    let renterId: string | null = null;

    setData((prev) => {
      const application = prev.renterApplications.find((entry) => entry.id === id);
      if (!application) return prev;
      if (application.converted_renter_id) {
        renterId = application.converted_renter_id;
        return prev;
      }

      const now = new Date().toISOString();
      const newRenterId = genId("rntr");
      renterId = newRenterId;

      const newRenter: RenterRow = {
        id: newRenterId,
        user_id: DEMO_USER_ID,
        name: application.applicant_name,
        phone: application.phone,
        email: application.email,
        address: formatApplicationAddress(application),
        status: "scheduled",
        monthly_rate: prev.operatorSettings.default_monthly_rate,
        balance: 0,
        days_late: 0,
        deposit_amount: prev.operatorSettings.default_deposit,
        deposit_collected: false,
        install_fee: prev.operatorSettings.default_install_fee,
        install_fee_collected: false,
        install_notes: `Application intake details:\nEquipment needed: ${application.equipment_needed.replaceAll("_", " ")}\nLayout: ${application.layout_preference.replaceAll("_", " ")}\nDryer connection: ${application.dryer_connection}${application.electric_prong ? ` (${application.electric_prong})` : ""}\n${application.floor_number ? `Install floor: ${application.floor_number}` : `Upstairs: ${application.upstairs ? "Yes" : "No"}`}${application.has_elevator ? `\nElevator: ${application.has_elevator}` : ""}`,
        late_fee: prev.operatorSettings.late_fee_amount,
        lease_start_date: null,
        min_term_end_date: null,
        next_due_date: null,
        paid_through_date: null,
        rent_collected: 0,
        has_payment_method: false,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        language: "en",
        dryer_outlet: application.dryer_connection === "electric" && application.electric_prong !== "unknown"
          ? application.electric_prong
          : null,
        notes: application.notes,
        secondary_contact: null,
        laundrylord_email: null,
        archived_at: null,
        billable_until: null,
        created_at: now,
        updated_at: now,
      };

      const renterApplications = prev.renterApplications.map((entry) => (
        entry.id === id
          ? {
            ...entry,
            status: "converted_billable",
            converted_renter_id: newRenterId,
            converted_at: now,
            converted_by_user_id: DEMO_USER_ID,
            updated_at: now,
          }
          : entry
      ));

      return {
        ...prev,
        renters: [newRenter, ...prev.renters],
        renterApplications,
      };
    });

    return renterId;
  }, []);

  const updateSettings = useCallback((updates: Partial<OperatorSettingsRow>) => {
    let result: OperatorSettingsRow = data.operatorSettings;
    setData(prev => {
      result = { ...prev.operatorSettings, ...updates, updated_at: new Date().toISOString() };
      return { ...prev, operatorSettings: result };
    });
    return result;
  }, [data.operatorSettings]);

  return (
    <DemoContext.Provider value={{ isDemo: true, data, updateRenter, addRenter, updateMachine, addMachine, addPayment, addMaintenanceLog, updateMaintenanceLog, archiveMaintenanceLog, addTimelineEvent, updateRenterApplication, convertRenterApplication, updateSettings }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextType | null {
  return useContext(DemoContext);
}

export function useDemoRequired(): DemoContextType {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemoRequired must be used within DemoProvider");
  return ctx;
}
