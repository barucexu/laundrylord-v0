import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { buildCustomFieldValuePayload, getCustomFieldValue, type CustomFieldEntityType, type CustomFieldValueType } from "@/lib/custom-fields";
import { queryKeys } from "./queryKeys";
import type { CustomFieldDefinitionRow, CustomFieldEntry, CustomFieldValueRow } from "./types";

export function useEntityCustomFields(entityType: CustomFieldEntityType, entityId: string | undefined) {
  const { user } = useAuth();
  const demo = useDemo();
  const supaQuery = useQuery({
    queryKey: queryKeys.customFields(entityType, entityId),
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
        queryClient.invalidateQueries({ queryKey: queryKeys.customFields(entityType, variables.entityId) });
      }
    },
  });
}
