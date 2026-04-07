import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { queryKeys } from "./queryKeys";
import type { MachineInsert, MachineRow } from "./types";

export function useMachines() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.machines,
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

export function useMachineForRenter(machineId: string | null | undefined) {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.machine(machineId),
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
    const found = demo.data.machines.find((machine) => machine.id === machineId);
    return { ...supaQuery, data: found, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useMachinesForRenter(renterId: string | undefined) {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.machinesForRenter(renterId),
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
    const filtered = demo.data.machines.filter((machine) => machine.assigned_renter_id === renterId);
    return { ...supaQuery, data: renterId ? filtered : undefined, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useCreateMachine() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const demo = useDemo();

  return useMutation({
    mutationFn: async (machine: Omit<MachineInsert, "user_id">) => {
      if (demo?.isDemo) {
        return demo.addMachine(machine as never);
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
      if (!demo?.isDemo) queryClient.invalidateQueries({ queryKey: queryKeys.machines });
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
      if (!demo?.isDemo) queryClient.invalidateQueries({ queryKey: queryKeys.machines });
    },
  });
}
