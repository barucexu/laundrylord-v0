import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { BILLABLE_RENTER_COUNT_QUERY_KEY } from "@/lib/billing-counts";
import { buildCustomFieldValuePayload, getCustomFieldValue, type CustomFieldEntityType, type CustomFieldValueType } from "@/lib/custom-fields";
import { getUnassignedMachineStatus, isMachineAssignable } from "@/lib/machine-assignment";
import { isActiveMaintenanceLog } from "@/lib/maintenance";
import type { Database } from "@/integrations/supabase/types";

export type RenterRow = Database["public"]["Tables"]["renters"]["Row"];
type RenterInsert = Database["public"]["Tables"]["renters"]["Insert"];
export type MachineRow = Database["public"]["Tables"]["machines"]["Row"];
type MachineInsert = Database["public"]["Tables"]["machines"]["Insert"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type RenterBalanceAdjustmentRow = Database["public"]["Tables"]["renter_balance_adjustments"]["Row"];
type MaintenanceRow = Database["public"]["Tables"]["maintenance_logs"]["Row"];
type MaintenanceInsert = Database["public"]["Tables"]["maintenance_logs"]["Insert"];
type TimelineRow = Database["public"]["Tables"]["timeline_events"]["Row"];
export type RenterApplicationRow = Database["public"]["Tables"]["renter_applications"]["Row"];
type RenterApplicationInsert = Database["public"]["Tables"]["renter_applications"]["Insert"];
type CustomFieldDefinitionRow = Database["public"]["Tables"]["custom_field_definitions"]["Row"];
type CustomFieldValueRow = Database["public"]["Tables"]["custom_field_values"]["Row"];

export type CustomFieldEntry = {
  field_definition_id: string;
  key: string;
  label: string;
  value_type: CustomFieldValueType;
  value: string;
};

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
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RenterRow[];
    },
    enabled: !demo?.isDemo,
  });
  if (demo?.isDemo) {
    const nonArchived = demo.data.renters.filter(r => r.status !== "archived");
    return { ...supaQuery, data: nonArchived, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useRenterApplications() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["renter_applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renter_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RenterApplicationRow[];
    },
    enabled: !demo?.isDemo,
  });
  if (demo?.isDemo) {
    return { ...supaQuery, data: demo.data.renterApplications, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useUpdateRenterApplication() {
  const queryClient = useQueryClient();
  const demo = useDemo();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RenterApplicationRow> & { id: string }) => {
      if (demo?.isDemo) {
        const updated = demo.updateRenterApplication(id, updates);
        if (!updated) throw new Error("Application not found");
        return updated;
      }

      const { data, error } = await supabase
        .from("renter_applications")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as RenterApplicationRow;
    },
    onSuccess: () => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["renter_applications"] });
      }
    },
  });
}

export function useConvertRenterApplication() {
  const queryClient = useQueryClient();
  const demo = useDemo();

  return useMutation({
    mutationFn: async ({ applicationId }: { applicationId: string }) => {
      if (demo?.isDemo) {
        const converted = demo.convertRenterApplication(applicationId);
        if (!converted) throw new Error("Application not found");
        return converted;
      }

      const { data, error } = await supabase.rpc("convert_renter_application", {
        p_application_id: applicationId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (renterId) => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["renter_applications"] });
        queryClient.invalidateQueries({ queryKey: ["renters"] });
        queryClient.invalidateQueries({ queryKey: ["renters", renterId] });
        queryClient.invalidateQueries({ queryKey: BILLABLE_RENTER_COUNT_QUERY_KEY });
      }
    },
  });
}

export function useArchivedRenters() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["renters", "archived"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renters")
        .select("*")
        .eq("status", "archived")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as RenterRow[];
    },
    enabled: !demo?.isDemo,
  });
  if (demo?.isDemo) {
    const archived = demo.data.renters.filter(r => r.status === "archived");
    return { ...supaQuery, data: archived, isLoading: false, error: null };
  }
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
        return demo.addRenter(renter as Parameters<typeof demo.addRenter>[0]);
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
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["renters"] });
        queryClient.invalidateQueries({ queryKey: BILLABLE_RENTER_COUNT_QUERY_KEY });
      }
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
        return demo.addMachine(machine as Parameters<typeof demo.addMachine>[0]);
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

export function useAssignMachineToRenter() {
  const queryClient = useQueryClient();
  const demo = useDemo();

  return useMutation({
    mutationFn: async ({ machineId, renterId }: { machineId: string; renterId: string }) => {
      if (demo?.isDemo) {
        const machine = demo.data.machines.find((m) => m.id === machineId);
        if (!machine || !isMachineAssignable(machine)) {
          throw new Error("Machine is no longer available");
        }
        return demo.updateMachine(machineId, {
          assigned_renter_id: renterId,
          status: "assigned",
        }) as MachineRow;
      }

      const { data, error } = await supabase
        .from("machines")
        .update({ assigned_renter_id: renterId, status: "assigned" })
        .eq("id", machineId)
        .is("assigned_renter_id", null)
        .eq("status", "available")
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Machine is no longer available");
      return data as MachineRow;
    },
    onSettled: (_data, _error, variables) => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["machines"] });
        queryClient.invalidateQueries({ queryKey: ["machines", "renter", variables.renterId] });
      }
    },
  });
}

export function useUnassignMachineFromRenter() {
  const queryClient = useQueryClient();
  const demo = useDemo();

  return useMutation({
    mutationFn: async ({ machineId, renterId }: { machineId: string; renterId: string }) => {
      if (demo?.isDemo) {
        const machine = demo.data.machines.find((m) => m.id === machineId);
        if (!machine || machine.assigned_renter_id !== renterId) {
          throw new Error("Machine is no longer assigned to this renter");
        }
        return demo.updateMachine(machineId, {
          assigned_renter_id: null,
          status: getUnassignedMachineStatus(machine.status),
        }) as MachineRow;
      }

      const { data: currentMachine, error: readError } = await supabase
        .from("machines")
        .select("*")
        .eq("id", machineId)
        .single();

      if (readError) throw readError;
      if (currentMachine.assigned_renter_id !== renterId) {
        throw new Error("Machine is no longer assigned to this renter");
      }

      const { data, error } = await supabase
        .from("machines")
        .update({
          assigned_renter_id: null,
          status: getUnassignedMachineStatus(currentMachine.status),
        })
        .eq("id", machineId)
        .eq("assigned_renter_id", renterId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Machine is no longer assigned to this renter");
      return data as MachineRow;
    },
    onSettled: (_data, _error, variables) => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["machines"] });
        queryClient.invalidateQueries({ queryKey: ["machines", "renter", variables.renterId] });
      }
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
        queryClient.invalidateQueries({ queryKey: ["renters", "archived"] });
        queryClient.invalidateQueries({ queryKey: BILLABLE_RENTER_COUNT_QUERY_KEY });
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
        return demo.addPayment(payment as Parameters<typeof demo.addPayment>[0]);
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

export function useRecordManualPayment() {
  const queryClient = useQueryClient();
  const demo = useDemo();

  return useMutation({
    mutationFn: async (args: {
      renter_id: string;
      amount: number;
      paid_date: string;
      type: string;
      payment_source: string;
      payment_notes?: string;
    }) => {
      if (demo?.isDemo) {
        const payment = demo.addPayment({
          renter_id: args.renter_id,
          amount: args.amount,
          due_date: args.paid_date,
          paid_date: args.paid_date,
          status: "paid",
          type: args.type,
          payment_source: args.payment_source,
          payment_notes: args.payment_notes ?? "",
        } as Parameters<typeof demo.addPayment>[0]);

        const renter = demo.data.renters.find((entry) => entry.id === args.renter_id);
        if (renter) {
          const nextBalance = Math.max(0, Number(renter.balance ?? 0) - args.amount);
          demo.updateRenter(args.renter_id, {
            balance: nextBalance,
            rent_collected: args.type === "rent"
              ? Number(renter.rent_collected ?? 0) + args.amount
              : renter.rent_collected,
            paid_through_date: args.type === "rent" && nextBalance === 0 ? args.paid_date : renter.paid_through_date,
            days_late: args.type === "rent" && nextBalance === 0 ? 0 : renter.days_late,
            status: renter.status === "late" && nextBalance === 0 ? "active" : renter.status,
          });
          demo.addTimelineEvent({
            renter_id: args.renter_id,
            type: "payment_succeeded",
            description: `Manual ${args.type.replace("_", " ")} payment recorded: $${args.amount.toFixed(2)} via ${args.payment_source}`,
            date: args.paid_date,
          });
        }

        return payment;
      }

      const { data, error } = await supabase.rpc("record_manual_payment", {
        p_renter_id: args.renter_id,
        p_amount: args.amount,
        p_paid_date: args.paid_date,
        p_type: args.type,
        p_payment_source: args.payment_source,
        p_payment_notes: args.payment_notes ?? null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["payments"] });
        queryClient.invalidateQueries({ queryKey: ["payments", "renter", variables.renter_id] });
        queryClient.invalidateQueries({ queryKey: ["renters"] });
        queryClient.invalidateQueries({ queryKey: ["renters", variables.renter_id] });
        queryClient.invalidateQueries({ queryKey: ["timeline_events", variables.renter_id] });
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
        .is("archived_at", null)
        .order("reported_date", { ascending: false });
      if (error) throw error;
      return data as MaintenanceRow[];
    },
    enabled: !demo?.isDemo,
  });
  if (demo?.isDemo) {
    return { ...supaQuery, data: demo.data.maintenanceLogs.filter(isActiveMaintenanceLog), isLoading: false, error: null };
  }
  return supaQuery;
}

export function useArchivedMaintenanceLogs() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["maintenance_logs", "archived"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false });
      if (error) throw error;
      return data as MaintenanceRow[];
    },
    enabled: !demo?.isDemo,
  });
  if (demo?.isDemo) {
    return { ...supaQuery, data: demo.data.maintenanceLogs.filter((log) => !isActiveMaintenanceLog(log)), isLoading: false, error: null };
  }
  return supaQuery;
}

export function useCreateMaintenanceLog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const demo = useDemo();

  return useMutation({
    mutationFn: async (maintenanceLog: Omit<MaintenanceInsert, "user_id" | "source">) => {
      if (demo?.isDemo) {
        return demo.addMaintenanceLog({
          ...maintenanceLog,
          source: "operator",
        } as Parameters<typeof demo.addMaintenanceLog>[0]);
      }

      const { data, error } = await supabase
        .from("maintenance_logs")
        .insert({ ...maintenanceLog, source: "operator", user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as MaintenanceRow;
    },
    onSuccess: (data) => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["maintenance_logs"] });
        queryClient.invalidateQueries({ queryKey: ["maintenance_logs", "archived"] });
        if (data.renter_id) {
          queryClient.invalidateQueries({ queryKey: ["maintenance_logs", "renter", data.renter_id] });
        }
      }
    },
  });
}

export function useUpdateMaintenanceLog() {
  const queryClient = useQueryClient();
  const demo = useDemo();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaintenanceRow> & { id: string }) => {
      if (demo?.isDemo) {
        const updated = demo.updateMaintenanceLog(id, updates);
        if (!updated) throw new Error("Maintenance log not found");
        return updated;
      }

      const { data, error } = await supabase
        .from("maintenance_logs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as MaintenanceRow;
    },
    onSuccess: (data) => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["maintenance_logs"] });
        queryClient.invalidateQueries({ queryKey: ["maintenance_logs", "archived"] });
        if (data.renter_id) {
          queryClient.invalidateQueries({ queryKey: ["maintenance_logs", "renter", data.renter_id] });
        }
      }
    },
  });
}

export function useArchiveMaintenanceLog() {
  const queryClient = useQueryClient();
  const demo = useDemo();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const archivedAt = new Date().toISOString();

      if (demo?.isDemo) {
        const updated = demo.archiveMaintenanceLog(id);
        if (!updated) throw new Error("Maintenance log not found");
        return updated;
      }

      const { data, error } = await supabase
        .from("maintenance_logs")
        .update({ archived_at: archivedAt })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as MaintenanceRow;
    },
    onSuccess: (data) => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["maintenance_logs"] });
        queryClient.invalidateQueries({ queryKey: ["maintenance_logs", "archived"] });
        if (data.renter_id) {
          queryClient.invalidateQueries({ queryKey: ["maintenance_logs", "renter", data.renter_id] });
        }
      }
    },
  });
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

export function useRenterBalanceAdjustments(renterId: string | undefined) {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["renter_balance_adjustments", renterId],
    enabled: !!renterId && !demo?.isDemo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renter_balance_adjustments")
        .select("*")
        .eq("renter_id", renterId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RenterBalanceAdjustmentRow[];
    },
  });
  if (demo?.isDemo) {
    return { ...supaQuery, data: [], isLoading: false, error: null };
  }
  return supaQuery;
}

export function useAddRenterBalanceAdjustment() {
  const queryClient = useQueryClient();
  const demo = useDemo();

  return useMutation({
    mutationFn: async (args: {
      renter_id: string;
      description: string;
      amount: number;
    }) => {
      if (demo?.isDemo) {
        const renter = demo.data.renters.find((entry) => entry.id === args.renter_id);
        if (!renter) throw new Error("Renter not found");
        const nextBalance = Number(renter.balance ?? 0) + args.amount;
        demo.updateRenter(args.renter_id, { balance: nextBalance });
        demo.addTimelineEvent({
          renter_id: args.renter_id,
          type: "note",
          description: `Added fee add-on: ${args.description} ($${args.amount.toFixed(2)})`,
          date: new Date().toISOString(),
        });
        return {
          adjustment_id: crypto.randomUUID(),
          renter_id: args.renter_id,
          balance: nextBalance,
        };
      }

      const { data, error } = await supabase.rpc("add_renter_balance_adjustment", {
        p_renter_id: args.renter_id,
        p_description: args.description,
        p_amount: args.amount,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["renter_balance_adjustments", variables.renter_id] });
        queryClient.invalidateQueries({ queryKey: ["renters"] });
        queryClient.invalidateQueries({ queryKey: ["renters", variables.renter_id] });
        queryClient.invalidateQueries({ queryKey: ["timeline_events", variables.renter_id] });
      }
    },
  });
}

export function useRemoveRenterBalanceAdjustment() {
  const queryClient = useQueryClient();
  const demo = useDemo();

  return useMutation({
    mutationFn: async (args: {
      renter_id: string;
      adjustment_id: string;
    }) => {
      if (demo?.isDemo) {
        throw new Error("Removing balance adjustments is not available in demo mode");
      }

      const { data, error } = await supabase.rpc("remove_renter_balance_adjustment", {
        p_renter_id: args.renter_id,
        p_adjustment_id: args.adjustment_id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["renter_balance_adjustments", variables.renter_id] });
        queryClient.invalidateQueries({ queryKey: ["renters"] });
        queryClient.invalidateQueries({ queryKey: ["renters", variables.renter_id] });
        queryClient.invalidateQueries({ queryKey: ["timeline_events", variables.renter_id] });
      }
    },
  });
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
        .is("archived_at", null)
        .order("reported_date", { ascending: false });
      if (error) throw error;
      return data as MaintenanceRow[];
    },
  });
  if (demo?.isDemo) {
    const filtered = demo.data.maintenanceLogs
      .filter(m => m.renter_id === renterId)
      .filter(isActiveMaintenanceLog)
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

export function useEntityCustomFields(entityType: CustomFieldEntityType, entityId: string | undefined) {
  const { user } = useAuth();
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["custom_fields", entityType, entityId],
    enabled: !!user && !!entityId && !demo?.isDemo,
    queryFn: async () => {
      const { data: valuesData, error: valuesError } = await supabase
        .from("custom_field_values")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!);
      if (valuesError) throw valuesError;

      const values = (valuesData ?? []) as CustomFieldValueRow[];
      if (values.length === 0) return [] as CustomFieldEntry[];

      const definitionIds = [...new Set(values.map((value) => value.field_definition_id))];
      const { data: definitionsData, error: definitionsError } = await supabase
        .from("custom_field_definitions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("entity_type", entityType)
        .in("id", definitionIds);
      if (definitionsError) throw definitionsError;

      const definitions = new Map(
        ((definitionsData ?? []) as CustomFieldDefinitionRow[]).map((definition) => [definition.id, definition]),
      );

      return values
        .map((value) => {
          const definition = definitions.get(value.field_definition_id);
          if (!definition) return null;

          return {
            field_definition_id: definition.id,
            key: definition.key,
            label: definition.label,
            value_type: definition.value_type as CustomFieldValueType,
            value: getCustomFieldValue(definition.value_type as CustomFieldValueType, value),
          } satisfies CustomFieldEntry;
        })
        .filter((entry): entry is CustomFieldEntry => entry !== null)
        .sort((a, b) => a.label.localeCompare(b.label));
    },
  });

  if (demo?.isDemo) {
    return { ...supaQuery, data: [], isLoading: false, error: null };
  }

  return supaQuery;
}

export function useBatchedRenterCustomFieldSearch(renterIds: string[]) {
  const { user } = useAuth();
  const demo = useDemo();
  const stableRenterIds = [...new Set(renterIds)].sort();

  const supaQuery = useQuery({
    queryKey: ["custom_fields", "renter", "batch", stableRenterIds.join("|")],
    enabled: !!user && stableRenterIds.length > 0 && !demo?.isDemo,
    queryFn: async () => {
      const { data: valuesData, error: valuesError } = await supabase
        .from("custom_field_values")
        .select("*")
        .eq("user_id", user!.id)
        .eq("entity_type", "renter")
        .in("entity_id", stableRenterIds);
      if (valuesError) throw valuesError;

      const values = (valuesData ?? []) as CustomFieldValueRow[];
      if (values.length === 0) return {} as Record<string, CustomFieldEntry[]>;

      const definitionIds = [...new Set(values.map((value) => value.field_definition_id))];
      const { data: definitionsData, error: definitionsError } = await supabase
        .from("custom_field_definitions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("entity_type", "renter")
        .in("id", definitionIds);
      if (definitionsError) throw definitionsError;

      const definitions = new Map(
        ((definitionsData ?? []) as CustomFieldDefinitionRow[]).map((definition) => [definition.id, definition]),
      );

      return values.reduce<Record<string, CustomFieldEntry[]>>((acc, value) => {
        const definition = definitions.get(value.field_definition_id);
        if (!definition) return acc;

        const entry = {
          field_definition_id: definition.id,
          key: definition.key,
          label: definition.label,
          value_type: definition.value_type as CustomFieldValueType,
          value: getCustomFieldValue(definition.value_type as CustomFieldValueType, value),
        } satisfies CustomFieldEntry;

        acc[value.entity_id] = [...(acc[value.entity_id] ?? []), entry];
        return acc;
      }, {});
    },
  });

  if (demo?.isDemo || stableRenterIds.length === 0) {
    return { ...supaQuery, data: {}, isLoading: false, error: null };
  }

  return supaQuery;
}

export function useUpsertCustomFieldValues(entityType: CustomFieldEntityType) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const demo = useDemo();

  return useMutation({
    mutationFn: async (args: { entityId: string; values: Array<{ field_definition_id: string; value: string }> }) => {
      if (demo?.isDemo) return args.values;

      const valuesToSave = args.values.map((entry) => ({
        user_id: user!.id,
        entity_type: entityType,
        entity_id: args.entityId,
        field_definition_id: entry.field_definition_id,
        ...buildCustomFieldValuePayload(entry.value),
      }));

      const emptyFieldIds = args.values
        .filter((entry) => !entry.value.trim())
        .map((entry) => entry.field_definition_id);
      const populatedValues = valuesToSave.filter((entry) => (entry.text_value ?? "").trim());

      if (emptyFieldIds.length > 0) {
        const { error } = await supabase
          .from("custom_field_values")
          .delete()
          .eq("entity_type", entityType)
          .eq("entity_id", args.entityId)
          .in("field_definition_id", emptyFieldIds);
        if (error) throw error;
      }

      if (populatedValues.length > 0) {
        const { error } = await supabase
          .from("custom_field_values")
          .upsert(populatedValues, { onConflict: "field_definition_id,entity_id" });
        if (error) throw error;
      }

      return args.values;
    },
    onSuccess: (_data, variables) => {
      if (!demo?.isDemo) {
        queryClient.invalidateQueries({ queryKey: ["custom_fields", entityType, variables.entityId] });
      }
    },
  });
}

export function useStripeConnection() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: ["stripe-connection"],
    queryFn: async (): Promise<{
        connected: boolean;
        webhook_configured: boolean;
        renter_billing_ready: boolean;
        reason: string;
        account_name: string | null;
        account_id: string | null;
        stripe_livemode: boolean | null;
        webhook_url: string | null;
      }> => {
      const { data, error } = await supabase.functions.invoke("check-stripe-connection");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !demo?.isDemo,
  });
  if (demo?.isDemo) {
    return {
      ...supaQuery,
      data: {
        connected: true,
        webhook_configured: true,
        renter_billing_ready: true,
        reason: "ready",
        account_name: "SunBelt Laundry Rentals (Demo)",
        account_id: null,
        stripe_livemode: false,
        webhook_url: "https://demo.supabase.co/functions/v1/stripe-webhook?token=demo-token",
      },
      isLoading: false,
      error: null,
    };
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
      public_slug?: string | null;
      public_responsibility_template?: string | null;
      public_responsibility_version?: number;
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

export type {
  PaymentRow,
  PaymentInsert,
  MaintenanceRow,
  MaintenanceInsert,
  TimelineRow,
  CustomFieldDefinitionRow,
  CustomFieldValueRow,
  RenterApplicationInsert,
};
