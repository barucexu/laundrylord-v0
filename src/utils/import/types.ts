export type ParsedData = {
  headers: string[];
  rows: string[][];
  sourceType: "csv" | "xlsx" | "image";
};

export type ImportMode = "renters" | "machines";

export type ImportFieldValueType = "string" | "number" | "date" | "boolean" | "enum";

export type ImportField = {
  key: string;
  label: string;
  placeholder?: string;
  synonyms?: string[];
  group?: "renter" | "machine";
  valueType?: ImportFieldValueType;
  enumMap?: Record<string, string>;
  reviewWhenBlank?: boolean;
};

export type ImportOperatorDefaults = {
  default_monthly_rate: number;
  default_install_fee: number;
  default_deposit: number;
  late_fee_amount: number;
};

export type PreviewRowStatus =
  | "ready"
  | "review_needed"
  | "skipped_empty"
  | "deleted_by_operator";

export type ImportExecutionStatus =
  | "imported"
  | "blocked_by_plan"
  | "failed_insert"
  | "skipped_empty"
  | "deleted_by_operator";

export type ClassifiedRow = {
  index: number;
  baseStatus: Exclude<PreviewRowStatus, "deleted_by_operator">;
  decision: "active" | "deleted_by_operator";
  hasAnyContent: boolean;
  hasMappedContent: boolean;
  source: Record<string, string>;
  mapped: Record<string, string>;
  record: Record<string, unknown>;
  extrasPreview: string[];
  customFields: ImportedCustomField[];
  warnings: string[];
};

export type ImportSummary = Record<ImportExecutionStatus, number> & {
  firstError?: string;
};

export type ImportRowResult = {
  index: number;
  status: ImportExecutionStatus;
  error?: string;
};

export type ImportedCustomField = {
  key: string;
  label: string;
  value: string;
};
