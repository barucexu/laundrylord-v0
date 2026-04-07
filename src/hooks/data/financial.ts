import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { queryKeys } from "./queryKeys";
import type { MaintenanceRow, PaymentInsert, PaymentRow, TimelineRow } from "./types";

export function usePayments() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.payments,
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
        return demo.addPayment(payment as never);
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
        queryClient.invalidateQueries({ queryKey: queryKeys.payments });
        queryClient.invalidateQueries({ queryKey: queryKeys.renters });
      }
    },
  });
}

export function useMaintenanceLogs() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.maintenanceLogs,
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
    queryKey: queryKeys.timelineEvents(renterId),
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
      .filter((event) => event.renter_id === renterId)
      .sort((a, b) => b.date.localeCompare(a.date));
    return { ...supaQuery, data: renterId ? filtered : undefined, isLoading: false, error: null };
  }
  return supaQuery;
}

export function usePaymentsForRenter(renterId: string | undefined) {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.paymentsForRenter(renterId),
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
      .filter((payment) => payment.renter_id === renterId)
      .sort((a, b) => b.due_date.localeCompare(a.due_date));
    return { ...supaQuery, data: renterId ? filtered : undefined, isLoading: false, error: null };
  }
  return supaQuery;
}

export function useMaintenanceForRenter(renterId: string | undefined) {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.maintenanceForRenter(renterId),
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
      .filter((log) => log.renter_id === renterId)
      .sort((a, b) => b.reported_date.localeCompare(a.reported_date));
    return { ...supaQuery, data: renterId ? filtered : undefined, isLoading: false, error: null };
  }
  return supaQuery;
}
