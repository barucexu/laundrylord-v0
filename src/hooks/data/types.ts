import type { Database } from "@/integrations/supabase/types";
import type { CustomFieldValueType } from "@/lib/custom-fields";

export type RenterRow = Database["public"]["Tables"]["renters"]["Row"];
export type RenterInsert = Database["public"]["Tables"]["renters"]["Insert"];
export type MachineRow = Database["public"]["Tables"]["machines"]["Row"];
export type MachineInsert = Database["public"]["Tables"]["machines"]["Insert"];
export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type MaintenanceRow = Database["public"]["Tables"]["maintenance_logs"]["Row"];
export type TimelineRow = Database["public"]["Tables"]["timeline_events"]["Row"];
export type CustomFieldDefinitionRow = Database["public"]["Tables"]["custom_field_definitions"]["Row"];
export type CustomFieldValueRow = Database["public"]["Tables"]["custom_field_values"]["Row"];

export type CustomFieldEntry = {
  field_definition_id: string;
  key: string;
  label: string;
  value_type: CustomFieldValueType;
  value: string;
};
