import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import type { Database } from "@/integrations/supabase/types";

type RenterRow = Database["public"]["Tables"]["renters"]["Row"];
type RenterInsert = Database["public"]["Tables"]["renters"]["Insert"];
type MachineRow = Database["public"]["Tables"]["machines"]["Row"];
type MachineInsert = Database["public"]["Tables"]["machines"]["Insert"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
type MaintenanceRow = Database["public"]["Tables"]["maintenance_logs"]["Row"];
type TimelineRow = Database["public"]["Tables"]["timeline_events"]["Row"];

/**
 * DEMO MODE INTEGRATION:
 * Each hook below checks `useDemo()?.isDemo`. If true, it returns in-memory
 * demo data instead of querying Supabase. Mutations modify demo context state.
 * This keeps Demo Mode automatically in sync with UI — same hooks, same components.
 */

// ─── Helper: static query result for demo mode ───
function useDemoQuery<T>(key: string[], data: T | undefined, enabled = true) {
  return useQuery({
    queryKey: ["demo", ...key],
    queryFn: () => data as T,
    enabled: enabled && data !== undefined,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useRenters() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["renters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renters")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RenterRow[];
    },
    enabled: !demo?.isDemo,
  });
  if (demo?.isDemo) return { ...supaQuery, data: demo.data.renters, isLoading: false, error: null };
  return supaQuery;
}

export function useRenter(id: string | undefined) {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["renters", id],
    enabled: !!id && !demo?.isDemo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renters")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as RenterRow;
    },
  });
  if (demo?.isDemo) {
    const found = demo.data.renters.find(r => r.id === id);
    return { ...supaQuery, data: found, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useCreateRenter() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const demo = useDemo();

  return useMutation({
    mutationFn: async (renter: Omit<RenterInsert, "user_id">) => {
      if (demo?.isDemo) {
        return demo.addRenter(renter as any);
      }
      const { data, error } = await supabase
        .from("renters")
        .insert({ ...renter, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (!demo?.isDemo) queryClient.invalidateQueries({ queryKey: ["renters"] });
    },
  });
}

export function useMachines() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MachineRow[];
    },
    enabled: !demo?.isDemo,
  });
  if (demo?.isDemo) return { ...supaQuery, data: demo.data.machines, isLoading: false, error: null };
  return supaQuery;
}

export function useCreateMachine() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const demo = useDemo();

  return useMutation({
    mutationFn: async (machine: Omit<MachineInsert, "user_id">) => {
      if (demo?.isDemo) {
        return demo.addMachine(machine as any);
      }
      const { data, error } = await supabase
        .from("machines")
        .insert({ ...machine, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (!demo?.isDemo) queryClient.invalidateQueries({ queryKey: ["machines"] });
    },
  });
}

export function useUpdateMachine() {
  const queryClient = useQueryClient();
  const demo = useDemo();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MachineRow> & { id: string }) => {
      if (demo?.isDemo) {
        return demo.updateMachine(id, updates) as MachineRow;
      }
      const { data, error } = await supabase
        .from("machines")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (!demo?.isDemo) queryClient.invalidateQueries({ queryKey: ["machines"] });
    },
  });
}

export function useUpdateRenter() {
  const queryClient = useQueryClient();
  const demo = useDemo();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RenterRow> & { id: string }) => {
      if (demo?.isDemo) {
        return demo.updateRenter(id, updates) as RenterRow;
      }
      const { data, error } = await supabase
        .from("renters")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["renters"] });
        queryClient.invalidateQueries({ queryKey: ["renters", data.id] });
      }
    },
  });
}

export function usePayments() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data as PaymentRow[];
    },
    enabled: !demo?.isDemo,
  });
  if (demo?.isDemo) return { ...supaQuery, data: demo.data.payments, isLoading: false, error: null };
  return supaQuery;
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const demo = useDemo();

  return useMutation({
    mutationFn: async (payment: Omit<PaymentInsert, "user_id">) => {
      if (demo?.isDemo) {
        return demo.addPayment(payment as any);
      }
      const { data, error } = await supabase
        .from("payments")
        .insert({ ...payment, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["payments"] });
        queryClient.invalidateQueries({ queryKey: ["renters"] });
      }
    },
  });
}

export function useMaintenanceLogs() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["maintenance_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*")
        .order("reported_date", { ascending: false });
      if (error) throw error;
      return data as MaintenanceRow[];
    },
    enabled: !demo?.isDemo,
  });
  if (demo?.isDemo) return { ...supaQuery, data: demo.data.maintenanceLogs, isLoading: false, error: null };
  return supaQuery;
}

export function useTimelineEvents(renterId: string | undefined) {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["timeline_events", renterId],
    enabled: !!renterId && !demo?.isDemo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("renter_id", renterId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as TimelineRow[];
    },
  });
  if (demo?.isDemo) {
    const filtered = demo.data.timelineEvents
      .filter(e => e.renter_id === renterId)
      .sort((a, b) => b.date.localeCompare(a.date));
    return { ...supaQuery, data: renterId ? filtered : undefined, isLoading: false, error: null };
  }
  return supaQuery;
}

export function usePaymentsForRenter(renterId: string | undefined) {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["payments", "renter", renterId],
    enabled: !!renterId && !demo?.isDemo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("renter_id", renterId!)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data as PaymentRow[];
    },
  });
  if (demo?.isDemo) {
    const filtered = demo.data.payments
      .filter(p => p.renter_id === renterId)
      .sort((a, b) => b.due_date.localeCompare(a.due_date));
    return { ...supaQuery, data: renterId ? filtered : undefined, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useMaintenanceForRenter(renterId: string | undefined) {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["maintenance_logs", "renter", renterId],
    enabled: !!renterId && !demo?.isDemo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*")
        .eq("renter_id", renterId!)
        .order("reported_date", { ascending: false });
      if (error) throw error;
      return data as MaintenanceRow[];
    },
  });
  if (demo?.isDemo) {
    const filtered = demo.data.maintenanceLogs
      .filter(m => m.renter_id === renterId)
      .sort((a, b) => b.reported_date.localeCompare(a.reported_date));
    return { ...supaQuery, data: renterId ? filtered : undefined, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useMachineForRenter(machineId: string | null | undefined) {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["machines", machineId],
    enabled: !!machineId && !demo?.isDemo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .eq("id", machineId!)
        .single();
      if (error) throw error;
      return data as MachineRow;
    },
  });
  if (demo?.isDemo) {
    const found = demo.data.machines.find(m => m.id === machineId);
    return { ...supaQuery, data: found, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useMachinesForRenter(renterId: string | undefined) {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["machines", "renter", renterId],
    enabled: !!renterId && !demo?.isDemo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .eq("assigned_renter_id", renterId!);
      if (error) throw error;
      return data as MachineRow[];
    },
  });
  if (demo?.isDemo) {
    const filtered = demo.data.machines.filter(m => m.assigned_renter_id === renterId);
    return { ...supaQuery, data: renterId ? filtered : undefined, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useStripeConnection() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["stripe-connection"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-stripe-connection");
      if (error) return { connected: false, reason: "error" } as const;
      return data as { connected: boolean; reason?: string; account_name?: string; account_id?: string };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !demo?.isDemo,
  });
  if (demo?.isDemo) {
    return { ...supaQuery, data: { connected: true, account_name: "SunBelt Laundry Rentals (Demo)" }, isLoading: false, error: null };
  }
  return supaQuery;
}

// Operator Settings
export function useOperatorSettings() {
  const { user } = useAuth();
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["operator_settings"],
    enabled: !!user && !demo?.isDemo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operator_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (demo?.isDemo) {
    return { ...supaQuery, data: demo.data.operatorSettings, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useSaveOperatorSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const demo = useDemo();

  return useMutation({
    mutationFn: async (settings: {
      default_monthly_rate: number;
      default_install_fee: number;
      default_deposit: number;
      late_fee_amount: number;
      late_fee_after_days: number;
      reminder_days_before: number;
      email_reminders_enabled?: boolean;
      reminder_upcoming_enabled?: boolean;
      reminder_failed_enabled?: boolean;
      reminder_latefee_enabled?: boolean;
      business_name?: string;
      template_upcoming_subject?: string;
      template_upcoming_body?: string;
      template_failed_subject?: string;
      template_failed_body?: string;
      template_latefee_subject?: string;
      template_latefee_body?: string;
    }) => {
      if (demo?.isDemo) {
        return demo.updateSettings(settings);
      }
      const { data, error } = await supabase
        .from("operator_settings")
        .upsert(
          { ...settings, user_id: user!.id },
          { onConflict: "user_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (!demo?.isDemo) queryClient.invalidateQueries({ queryKey: ["operator_settings"] });
    },
  });
}

export type { RenterRow, MachineRow, PaymentRow, PaymentInsert, MaintenanceRow, TimelineRow };
