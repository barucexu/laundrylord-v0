export type ParsedData = {
  headers: string[];
  rows: string[][];
  sourceType: "csv" | "xlsx" | "image";
};

export type ImportMode = "combined" | "customers" | "machines";

export type ImportField = {
  key: string;
  label: string;
  placeholder?: string;
  synonyms?: string[];
  group?: "renter" | "machine";
};
