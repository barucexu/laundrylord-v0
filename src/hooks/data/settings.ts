import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { queryKeys } from "./queryKeys";

export function useStripeConnection() {
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.stripeConnection,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-stripe-connection");
      if (error) return { connected: false, reason: "error" } as const;
      return data as {
        connected: boolean;
        reason?: string;
        account_name?: string;
        account_id?: string;
        webhook_path_token?: string;
        webhook_configured?: boolean;
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
        account_name: "SunBelt Laundry Rentals (Demo)",
        webhook_path_token: "demo-webhook-token",
        webhook_configured: true,
      },
      isLoading: false,
      error: null,
    };
  }
  return supaQuery;
}

export function useOperatorSettings() {
  const { user } = useAuth();
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.operatorSettings,
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
      if (!demo?.isDemo) queryClient.invalidateQueries({ queryKey: queryKeys.operatorSettings });
    },
  });
}
