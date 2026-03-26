export type ParsedData = {
  headers: string[];
  rows: string[][];
  sourceType: "csv" | "xlsx" | "image";
};

export type ImportField = {
  key: string;
  label: string;
  placeholder?: string;
  synonyms?: string[];
};
