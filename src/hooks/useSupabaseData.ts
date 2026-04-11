import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { BILLABLE_RENTER_COUNT_QUERY_KEY } from "@/lib/billing-counts";
import { buildCustomFieldValuePayload, getCustomFieldValue, type CustomFieldEntityType, type CustomFieldValueType } from "@/lib/custom-fields";
import { getUnassignedMachineStatus, isMachineAssignable } from "@/lib/machine-assignment";
import type { Database } from "@/integrations/supabase/types";

export type RenterRow = Database["public"]["Tables"]["renters"]["Row"];
type RenterInsert = Database["public"]["Tables"]["renters"]["Insert"];
export type MachineRow = Database["public"]["Tables"]["machines"]["Row"];
type MachineInsert = Database["public"]["Tables"]["machines"]["Insert"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
type MaintenanceRow = Database["public"]["Tables"]["maintenance_logs"]["Row"];
type TimelineRow = Database["public"]["Tables"]["timeline_events"]["Row"];
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
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-stripe-connection");
      if (error) return { connected: false, reason: "error" } as const;
      return data as {
        connected: boolean;
        webhook_configured?: boolean;
        renter_billing_ready?: boolean;
        reason?: string;
        account_name?: string;
        account_id?: string;
        stripe_livemode?: boolean | null;
        webhook_url?: string | null;
      };
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
        account_name: "SunBelt Laundry Rentals (Demo)",
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
  TimelineRow,
  CustomFieldDefinitionRow,
  CustomFieldValueRow,
};
