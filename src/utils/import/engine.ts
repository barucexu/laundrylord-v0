import { format, isValid, parse } from "date-fns";
import type { ClassifiedRow, ImportField, ImportMode, ImportRowResult, ImportSummary, PreviewRowStatus } from "./types";

type ExecuteImportArgs = {
  rows: ClassifiedRow[];
  mode: ImportMode;
  userId: string;
  renterSlotsAvailable: number;
  insertRow: (tableName: "renters" | "machines", record: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
};

const DATE_PATTERNS = [
  "yyyy-MM-dd",
  "yyyy/MM/dd",
  "M/d/yyyy",
  "M/d/yy",
  "MM/dd/yyyy",
  "MM-dd-yyyy",
  "M-d-yyyy",
  "MMM d yyyy",
  "MMMM d yyyy",
  "M/d/yyyy H:mm:ss",
  "M/d/yyyy h:mm:ss a",
  "yyyy-MM-dd HH:mm:ss",
];

const BOOLEAN_TRUE_VALUES = new Set(["true", "yes", "y", "1"]);
const BOOLEAN_FALSE_VALUES = new Set(["false", "no", "n", "0"]);

export function classifyImportRows(args: {
  headers: string[];
  rows: string[][];
  mapping: Record<string, string>;
  fields: ImportField[];
  mode: ImportMode;
}): ClassifiedRow[] {
  const { headers, rows, mapping, fields, mode } = args;
  const headerIndexes = new Map(headers.map((header, index) => [header, index]));
  const mappedHeaders = new Set(Object.values(mapping).filter(Boolean));

  return rows.map((row, index) => {
    const source = collectSourceValues(headers, row);
    const hasAnyContent = Object.keys(source).length > 0;

    if (!hasAnyContent) {
      return {
        index,
        baseStatus: "skipped_empty",
        decision: "active",
        hasAnyContent: false,
        hasMappedContent: false,
        source: {},
        mapped: {},
        record: {},
        extrasPreview: [],
        warnings: [],
      };
    }

    const mapped: Record<string, string> = {};
    const record: Record<string, unknown> = {};
    const extras: string[] = [];
    const warnings: string[] = [];
    let mappedNotes = "";
    let hasMappedContent = false;

    for (const field of fields) {
      const header = mapping[field.key];
      if (!header) continue;

      const headerIndex = headerIndexes.get(header);
      if (headerIndex === undefined) continue;

      const rawValue = normalizeCell(row[headerIndex]);
      if (!rawValue) continue;

      mapped[field.key] = rawValue;
      hasMappedContent = true;

      if (field.key === "notes") {
        mappedNotes = rawValue;
        continue;
      }

      const { value, reviewWarning, invalidNote } = coerceMappedValue(field, rawValue);
      record[field.key] = value;

      if (reviewWarning) warnings.push(reviewWarning);
      if (invalidNote) extras.push(invalidNote);
    }

    for (const header of headers) {
      if (mappedHeaders.has(header)) continue;
      const headerIndex = headerIndexes.get(header);
      if (headerIndex === undefined) continue;
      const rawValue = normalizeCell(row[headerIndex]);
      if (!rawValue) continue;
      extras.push(`${header}: ${rawValue}`);
    }

    const notes = appendImportedExtras(mappedNotes, extras);
    if (notes) {
      record.notes = notes;
    }

    if (mode === "machines") {
      for (const key of ["type", "model", "serial"]) {
        if (!normalizeCell(String(mapped[key] ?? ""))) {
          warnings.push(`${findFieldLabel(fields, key)} missing`);
        }
      }
    } else if (!normalizeCell(String(mapped.name ?? ""))) {
      warnings.push("Name missing");
    }

    if (!hasMappedContent) {
      warnings.push("Only unknown columns contained data");
    }

    return {
      index,
      baseStatus: warnings.length > 0 ? "review_needed" : "ready",
      decision: "active",
      hasAnyContent: true,
      hasMappedContent,
      source,
      mapped,
      record,
      extrasPreview: extras,
      warnings,
    };
  });
}

export async function executeImport(args: ExecuteImportArgs): Promise<{
  results: ImportRowResult[];
  summary: ImportSummary;
}> {
  const { rows, mode, userId, renterSlotsAvailable, insertRow } = args;
  const tableName = mode === "renters" ? "renters" : "machines";
  const summary = createEmptySummary();
  const results: ImportRowResult[] = [];
  let importedRenters = 0;

  for (const row of rows) {
    const previewStatus = getPreviewStatus(row);

    if (previewStatus === "skipped_empty") {
      summary.skipped_empty++;
      results.push({ index: row.index, status: "skipped_empty" });
      continue;
    }

    if (previewStatus === "deleted_by_operator") {
      summary.deleted_by_operator++;
      results.push({ index: row.index, status: "deleted_by_operator" });
      continue;
    }

    if (mode === "renters" && importedRenters >= renterSlotsAvailable) {
      summary.blocked_by_plan++;
      results.push({ index: row.index, status: "blocked_by_plan" });
      continue;
    }

    const payload = prepareInsertPayload(row.record, userId);
    const { error } = await insertRow(tableName, payload);

    if (error) {
      if (mode === "renters" && isPlanLimitError(error.message)) {
        summary.blocked_by_plan++;
        if (!summary.firstError) summary.firstError = error.message;
        results.push({ index: row.index, status: "blocked_by_plan", error: error.message });

        for (const remainingRow of rows.slice(results.length)) {
          const remainingStatus = getPreviewStatus(remainingRow);

          if (remainingStatus === "skipped_empty") {
            summary.skipped_empty++;
            results.push({ index: remainingRow.index, status: "skipped_empty" });
            continue;
          }

          if (remainingStatus === "deleted_by_operator") {
            summary.deleted_by_operator++;
            results.push({ index: remainingRow.index, status: "deleted_by_operator" });
            continue;
          }

          summary.blocked_by_plan++;
          results.push({ index: remainingRow.index, status: "blocked_by_plan", error: error.message });
        }

        break;
      }

      summary.failed_insert++;
      if (!summary.firstError) summary.firstError = error.message;
      results.push({ index: row.index, status: "failed_insert", error: error.message });
      continue;
    }

    summary.imported++;
    if (mode === "renters") importedRenters++;
    results.push({ index: row.index, status: "imported" });
  }

  return { results, summary };
}

export function getPreviewStatus(row: ClassifiedRow): PreviewRowStatus {
  if (row.decision === "deleted_by_operator") return "deleted_by_operator";
  return row.baseStatus;
}

export function toggleRowDeleted(rows: ClassifiedRow[], index: number): ClassifiedRow[] {
  return rows.map((row) =>
    row.index === index
      ? {
          ...row,
          decision: row.decision === "deleted_by_operator" ? "active" : "deleted_by_operator",
        }
      : row,
  );
}

export function createEmptySummary(): ImportSummary {
  return {
    imported: 0,
    blocked_by_plan: 0,
    failed_insert: 0,
    skipped_empty: 0,
    deleted_by_operator: 0,
  };
}

export function appendImportedExtras(existingNotes: string | null | undefined, extras: string[]): string | null {
  const cleanNotes = normalizeCell(existingNotes ?? "");
  const cleanExtras = extras.map(normalizeCell).filter(Boolean);

  if (cleanExtras.length === 0) {
    return cleanNotes || null;
  }

  const extrasBlock = `Imported extras: ${cleanExtras.join(" | ")}`;
  return cleanNotes ? `${cleanNotes}\n\n${extrasBlock}` : extrasBlock;
}

function isPlanLimitError(message: string | null | undefined): boolean {
  const normalized = normalizeCell(message ?? "").toLowerCase();
  return normalized.includes("plan limit reached") || normalized.includes("subscribe to add more renters");
}

function collectSourceValues(headers: string[], row: string[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    const value = normalizeCell(row[index]);
    if (value) acc[header] = value;
    return acc;
  }, {});
}

function coerceMappedValue(field: ImportField, rawValue: string): {
  value: string | number | boolean | null;
  reviewWarning?: string;
  invalidNote?: string;
} {
  switch (field.valueType) {
    case "number":
      return coerceNumberField(field, rawValue);
    case "date":
      return coerceDateField(field, rawValue);
    case "boolean":
      return coerceBooleanField(field, rawValue);
    case "enum":
      return coerceEnumField(field, rawValue);
    default:
      return { value: rawValue };
  }
}

function coerceNumberField(field: ImportField, rawValue: string) {
  const sanitized = rawValue.replace(/[$,]/g, "").trim();
  if (/^-?\d+(\.\d+)?$/.test(sanitized)) {
    return { value: Number(sanitized) };
  }
  return {
    value: null,
    reviewWarning: `${field.label} invalid`,
    invalidNote: `${field.label} (raw): ${rawValue}`,
  };
}

function coerceDateField(field: ImportField, rawValue: string) {
  const parsed = parseStrictDate(rawValue);
  if (parsed) {
    return { value: parsed };
  }
  return {
    value: null,
    reviewWarning: `${field.label} invalid`,
    invalidNote: `${field.label} (raw): ${rawValue}`,
  };
}

function coerceBooleanField(field: ImportField, rawValue: string) {
  const normalized = rawValue.trim().toLowerCase();
  if (BOOLEAN_TRUE_VALUES.has(normalized)) {
    return { value: true };
  }
  if (BOOLEAN_FALSE_VALUES.has(normalized)) {
    return { value: false };
  }
  return {
    value: null,
    reviewWarning: `${field.label} invalid`,
    invalidNote: `${field.label} (raw): ${rawValue}`,
  };
}

function coerceEnumField(field: ImportField, rawValue: string) {
  const normalizedValue = normalizeEnumValue(rawValue, field.enumMap ?? {});
  if (normalizedValue) {
    return { value: normalizedValue };
  }
  return {
    value: null,
    reviewWarning: `${field.label} invalid`,
    invalidNote: `${field.label} (raw): ${rawValue}`,
  };
}

function parseStrictDate(rawValue: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const parsed = parse(rawValue, pattern, new Date());
    if (!isValid(parsed)) continue;
    if (format(parsed, pattern) !== rawValue) continue;
    return format(parsed, "yyyy-MM-dd");
  }
  return null;
}

function normalizeEnumValue(rawValue: string, enumMap: Record<string, string>): string | null {
  const normalizedCandidates = new Set([
    rawValue.trim().toLowerCase(),
    rawValue.trim().toLowerCase().replace(/[_\s]+/g, " "),
    rawValue.trim().toLowerCase().replace(/[_\s]+/g, "_"),
    rawValue.trim().toLowerCase().replace(/\s+/g, "-"),
  ]);

  for (const candidate of normalizedCandidates) {
    if (enumMap[candidate]) return enumMap[candidate];
  }

  return null;
}

function prepareInsertPayload(record: Record<string, unknown>, userId: string): Record<string, unknown> {
  const payload: Record<string, unknown> = { user_id: userId };

  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") continue;
    payload[key] = value;
  }

  return payload;
}

function normalizeCell(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function findFieldLabel(fields: ImportField[], key: string): string {
  return fields.find((field) => field.key === key)?.label ?? key;
}
