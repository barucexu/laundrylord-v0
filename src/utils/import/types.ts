export type ParsedData = {
  headers: string[];
  rows: string[][];
  sourceType: "csv" | "xlsx" | "image";
};

export type ImportMode = "customers" | "machines";

export type ImportField = {
  key: string;
  label: string;
  placeholder?: string;
  synonyms?: string[];
  group?: "renter" | "machine";
};

export type RowStatus = "empty" | "has_data" | "likely_duplicate";

export type ClassifiedRow = {
  index: number;
  status: RowStatus;
  record: Record<string, any>;
  duplicateOf?: { id: string; label: string };
  importDecision: "import" | "skip";
};
