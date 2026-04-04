
CREATE TABLE public.custom_field_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  value_type text NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, key)
);

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own definitions" ON public.custom_field_definitions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own definitions" ON public.custom_field_definitions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own definitions" ON public.custom_field_definitions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own definitions" ON public.custom_field_definitions FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.custom_field_values (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  field_definition_id uuid NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  text_value text,
  number_value numeric,
  date_value date,
  boolean_value boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(field_definition_id, entity_id)
);

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own values" ON public.custom_field_values FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own values" ON public.custom_field_values FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own values" ON public.custom_field_values FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own values" ON public.custom_field_values FOR DELETE USING (auth.uid() = user_id);
