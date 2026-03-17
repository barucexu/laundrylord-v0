import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type RenterRow = Database["public"]["Tables"]["renters"]["Row"];
type RenterInsert = Database["public"]["Tables"]["renters"]["Insert"];
type MachineRow = Database["public"]["Tables"]["machines"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type MaintenanceRow = Database["public"]["Tables"]["maintenance_logs"]["Row"];
type TimelineRow = Database["public"]["Tables"]["timeline_events"]["Row"];

export function useRenters() {
  return useQuery({
    queryKey: ["renters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renters")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RenterRow[];
    },
  });
}

export function useRenter(id: string | undefined) {
  return useQuery({
    queryKey: ["renters", id],
    enabled: !!id,
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
}

export function useCreateRenter() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (renter: Omit<RenterInsert, "user_id">) => {
      const { data, error } = await supabase
        .from("renters")
        .insert({ ...renter, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renters"] });
    },
  });
}

export function useMachines() {
  return useQuery({
    queryKey: ["machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MachineRow[];
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data as PaymentRow[];
    },
  });
}

export function useMaintenanceLogs() {
  return useQuery({
    queryKey: ["maintenance_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*")
        .order("reported_date", { ascending: false });
      if (error) throw error;
      return data as MaintenanceRow[];
    },
  });
}

export function useTimelineEvents(renterId: string | undefined) {
  return useQuery({
    queryKey: ["timeline_events", renterId],
    enabled: !!renterId,
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
}

export function usePaymentsForRenter(renterId: string | undefined) {
  return useQuery({
    queryKey: ["payments", "renter", renterId],
    enabled: !!renterId,
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
}

export function useMaintenanceForRenter(renterId: string | undefined) {
  return useQuery({
    queryKey: ["maintenance_logs", "renter", renterId],
    enabled: !!renterId,
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
}

export function useMachineForRenter(machineId: string | null | undefined) {
  return useQuery({
    queryKey: ["machines", machineId],
    enabled: !!machineId,
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
}

export type { RenterRow, MachineRow, PaymentRow, MaintenanceRow, TimelineRow };
