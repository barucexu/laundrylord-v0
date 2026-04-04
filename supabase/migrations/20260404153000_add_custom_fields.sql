CREATE TABLE public.custom_field_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('renter', 'machine')),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'text' CHECK (value_type IN ('text', 'number', 'date', 'boolean')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT custom_field_definitions_user_entity_key_unique UNIQUE (user_id, entity_type, key)
);

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own custom field definitions"
  ON public.custom_field_definitions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom field definitions"
  ON public.custom_field_definitions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom field definitions"
  ON public.custom_field_definitions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom field definitions"
  ON public.custom_field_definitions FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_custom_field_definitions_updated_at
BEFORE UPDATE ON public.custom_field_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.custom_field_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('renter', 'machine')),
  entity_id UUID NOT NULL,
  field_definition_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  text_value TEXT,
  number_value NUMERIC(12,2),
  date_value DATE,
  boolean_value BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT custom_field_values_field_definition_entity_unique UNIQUE (field_definition_id, entity_id)
);

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own custom field values"
  ON public.custom_field_values FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom field values"
  ON public.custom_field_values FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom field values"
  ON public.custom_field_values FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom field values"
  ON public.custom_field_values FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_custom_field_values_updated_at
BEFORE UPDATE ON public.custom_field_values
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_custom_field_definitions_user_entity
  ON public.custom_field_definitions(user_id, entity_type);

CREATE INDEX idx_custom_field_values_user_entity
  ON public.custom_field_values(user_id, entity_type, entity_id);
