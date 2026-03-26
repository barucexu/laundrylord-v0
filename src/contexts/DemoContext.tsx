/**
 * DemoContext — provides in-memory demo data that mirrors the Supabase data hooks.
 * 
 * EXTENDING: When new entity types are added to useSupabaseData, add matching
 * state + CRUD helpers here and update the demo seed data generator.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { cloneDemoData, DEMO_USER_ID } from "@/data/demo-seed-data";
import type { RenterRow, MachineRow, PaymentRow, MaintenanceRow, TimelineRow, OperatorSettingsRow } from "@/data/demo-seed-data";

interface DemoState {
  renters: RenterRow[];
  machines: MachineRow[];
  payments: PaymentRow[];
  maintenanceLogs: MaintenanceRow[];
  timelineEvents: TimelineRow[];
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

  const updateSettings = useCallback((updates: Partial<OperatorSettingsRow>) => {
    let result: OperatorSettingsRow = data.operatorSettings;
    setData(prev => {
      result = { ...prev.operatorSettings, ...updates, updated_at: new Date().toISOString() };
      return { ...prev, operatorSettings: result };
    });
    return result;
  }, [data.operatorSettings]);

  return (
    <DemoContext.Provider value={{ isDemo: true, data, updateRenter, addRenter, updateMachine, addMachine, addPayment, updateSettings }}>
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
