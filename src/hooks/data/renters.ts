import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { queryKeys } from "./queryKeys";
import type { RenterInsert, RenterRow } from "./types";

export function useRenters() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.renters,
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
    const nonArchived = demo.data.renters.filter((r) => r.status !== "archived");
    return { ...supaQuery, data: nonArchived, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useArchivedRenters() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.archivedRenters,
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
    const archived = demo.data.renters.filter((r) => r.status === "archived");
    return { ...supaQuery, data: archived, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useRenter(id: string | undefined) {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.renter(id),
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
    const found = demo.data.renters.find((r) => r.id === id);
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
        return demo.addRenter(renter as never);
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
      if (!demo?.isDemo) queryClient.invalidateQueries({ queryKey: queryKeys.renters });
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
        queryClient.invalidateQueries({ queryKey: queryKeys.renters });
        queryClient.invalidateQueries({ queryKey: queryKeys.renter(data.id) });
      }
    },
  });
}
