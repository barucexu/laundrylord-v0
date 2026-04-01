import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle, Mail, AlertTriangle, User, Cpu, Trash2, Undo2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SupportFooter } from "@/components/SupportFooter";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { ParsedData, ImportMode, ImportField, ClassifiedRow, RowStatus } from "@/utils/import/types";
import { RENTER_FIELDS, MACHINE_FIELDS } from "@/utils/import/fields";
import { parseCSV } from "@/utils/import/csv-parser";
import { parseXLSX } from "@/utils/import/xlsx-parser";
import { parseImage } from "@/utils/import/image-parser";
import { autoMap } from "@/utils/import/auto-mapper";
import { applyInsertDefaults } from "@/utils/import/placeholders";

type Step = "upload" | "map" | "preview" | "duplicates" | "done";

interface ImportResult {
  imported: number;
  duplicateImported: number;
  duplicateSkipped: number;
  emptySkipped: number;
  deletedCount: number;
  blockedByPlan: number;
  insertErrors: number;
  firstError?: string;
}

const ROWS_PER_PAGE = 25;

// ─── Enum maps ───

const RENTER_STATUS_MAP: Record<string, string> = {
  active: "active", lead: "lead", scheduled: "scheduled", late: "late",
  maintenance: "maintenance", termination_requested: "termination_requested",
  "termination requested": "termination_requested", pickup_scheduled: "pickup_scheduled",
  "pickup scheduled": "pickup_scheduled", closed: "closed", defaulted: "defaulted",
  archived: "archived", "former customer": "archived", former: "archived",
  inactive: "archived", cancelled: "closed", canceled: "closed", new: "lead",
  pending: "scheduled", current: "active", delinquent: "late", "past due": "late",
  overdue: "late",
};

const MACHINE_STATUS_MAP: Record<string, string> = {
  available: "available", assigned: "assigned", maintenance: "maintenance",
  retired: "retired", "in use": "assigned", "in-use": "assigned",
  active: "assigned", broken: "maintenance", repair: "maintenance",
  decommissioned: "retired", "out of service": "retired",
};

const MACHINE_TYPE_MAP: Record<string, string> = {
  washer: "washer", dryer: "dryer", w: "washer", d: "dryer",
  "washing machine": "washer", wash: "washer", dry: "dryer", set: "set",
};

const MACHINE_PRONG_MAP: Record<string, string> = {
  "3-prong": "3-prong", "4-prong": "4-prong", "3 prong": "3-prong",
  "4 prong": "4-prong", "3": "3-prong", "4": "4-prong",
};

// ─── Generic coercion pipeline ───

const NUMBER_FIELDS = new Set(["monthly_rate", "balance", "late_fee", "install_fee", "deposit_amount", "cost_basis", "rent_collected", "days_late"]);
const BOOLEAN_FIELDS = new Set(["install_fee_collected", "deposit_collected", "has_payment_method"]);
const DATE_FIELDS = new Set(["lease_start_date", "next_due_date", "paid_through_date", "min_term_end_date"]);

function coerceBoolean(v: string): boolean | null {
  const lc = v.toLowerCase().trim();
  if (["true", "yes", "1", "y"].includes(lc)) return true;
  if (["false", "no", "0", "n"].includes(lc)) return false;
  return null;
}

function coerceNumber(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function coerceDate(v: string): string | null {
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function prepareRecord(record: Record<string, any>, mode: ImportMode): string[] {
  const nullCells: string[] = [];

  for (const key of Object.keys(record)) {
    const raw = record[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const strVal = String(raw);

    if (NUMBER_FIELDS.has(key)) {
      const n = coerceNumber(strVal);
      if (n === null) { nullCells.push(key); record[key] = null; } else record[key] = n;
      continue;
    }
    if (BOOLEAN_FIELDS.has(key)) {
      const b = coerceBoolean(strVal);
      if (b === null) { nullCells.push(key); record[key] = null; } else record[key] = b;
      continue;
    }
    if (DATE_FIELDS.has(key)) {
      const d = coerceDate(strVal);
      if (d === null) { nullCells.push(key); record[key] = null; } else record[key] = d;
      continue;
    }

    // Enum fields
    if (key === "status") {
      const map = mode === "customers" ? RENTER_STATUS_MAP : MACHINE_STATUS_MAP;
      const normalized = map[strVal.toLowerCase().trim()];
      if (normalized) { record[key] = normalized; } else { nullCells.push(key); record[key] = null; }
      continue;
    }
    if (key === "type" && mode === "machines") {
      const normalized = MACHINE_TYPE_MAP[strVal.toLowerCase().trim()];
      if (normalized) { record[key] = normalized; } else { nullCells.push(key); record[key] = null; }
      continue;
    }
    if (key === "prong") {
      const normalized = MACHINE_PRONG_MAP[strVal.toLowerCase().trim()];
      if (normalized) { record[key] = normalized; } else { nullCells.push(key); record[key] = null; }
      continue;
    }
    if (key === "dryer_outlet") {
      const normalized = MACHINE_PRONG_MAP[strVal.toLowerCase().trim()];
      if (normalized) { record[key] = normalized; } else { nullCells.push(key); record[key] = null; }
      continue;
    }
  }

  return nullCells;
}

export default function ImportPage() {
  const { user } = useAuth();
  const { tier, renterCount, subscribed, loading: planLoading } = useSubscription();
  const queryClient = useQueryClient();

  const [importMode, setImportMode] = useState<ImportMode>("customers");
  const [step, setStep] = useState<Step>("upload");
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sourceType, setSourceType] = useState<ParsedData["sourceType"]>("csv");
  const [parsing, setParsing] = useState(false);
  const [classifiedRows, setClassifiedRows] = useState<ClassifiedRow[]>([]);
  const [previewPage, setPreviewPage] = useState(0);

  const activeFields = importMode === "customers" ? RENTER_FIELDS : MACHINE_FIELDS;

  const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".png", ".jpg", ".jpeg"];
  const ACCEPT_STRING = ".csv,.xlsx,.png,.jpg,.jpeg";

  // ─── File handling ───

  const processFile = useCallback(
    async (file: File) => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        toast.error("Unsupported file type. Use CSV, Excel, or image files.");
        return;
      }
      setParsing(true);
      try {
        let parsed: ParsedData;
        if (ext === ".csv") parsed = await parseCSV(file);
        else if (ext === ".xlsx") parsed = await parseXLSX(file);
        else parsed = await parseImage(file);

        setHeaders(parsed.headers);
        setRawData(parsed.rows);
        setSourceType(parsed.sourceType);
        setMapping(autoMap(parsed.headers, activeFields));
        setStep("map");
      } catch (err: any) {
        toast.error(err.message || "Failed to parse file");
      } finally {
        setParsing(false);
      }
    },
    [activeFields],
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  // ─── Row classification (shared by preview + import) ───

  const getMappedRecord = (row: string[]): { record: Record<string, any>; hasContent: boolean } => {
    const record: Record<string, any> = {};
    let hasContent = false;
    for (const f of activeFields) {
      const csvCol = mapping[f.key];
      if (!csvCol) continue;
      const idx = headers.indexOf(csvCol);
      if (idx < 0) continue;
      const val = row[idx]?.trim() || "";
      if (val) {
        record[f.key] = val;
        hasContent = true;
      }
    }
    return { record, hasContent };
  };

  const classifyAllRows = async () => {
    if (!user) return;

    let existingRecords: any[] = [];
    if (importMode === "customers") {
      const { data } = await supabase.from("renters").select("id, name, email, phone").eq("user_id", user.id);
      existingRecords = data || [];
    } else {
      const { data } = await supabase.from("machines").select("id, serial, type, model").eq("user_id", user.id);
      existingRecords = data || [];
    }

    const classified: ClassifiedRow[] = rawData.map((row, index) => {
      const { record, hasContent } = getMappedRecord(row);

      if (!hasContent) {
        return { index, status: "empty" as RowStatus, record, importDecision: "import" as const, warnings: [], nullCells: [] };
      }

      // Generic coercion — mutates record, returns list of null-coerced cells
      const nullCells = prepareRecord(record, importMode);

      // Check for likely duplicates
      let duplicateOf: ClassifiedRow["duplicateOf"] = undefined;
      if (importMode === "customers") {
        for (const existing of existingRecords) {
          if (record.email && existing.email && record.email.toLowerCase() === existing.email.toLowerCase()) {
            duplicateOf = { id: existing.id, label: existing.name || existing.email }; break;
          }
          if (record.phone && existing.phone && record.phone.replace(/\D/g, "") === existing.phone.replace(/\D/g, "")) {
            duplicateOf = { id: existing.id, label: existing.name || existing.phone }; break;
          }
        }
      } else {
        for (const existing of existingRecords) {
          if (record.serial && existing.serial && record.serial.toLowerCase() === existing.serial.toLowerCase()) {
            duplicateOf = { id: existing.id, label: `${existing.type || ""} ${existing.model || ""} (${existing.serial})`.trim() }; break;
          }
        }
      }

      // Missing-field warnings (short, non-blocking)
      const warnings: string[] = [];
      if (importMode === "customers") {
        if (!record.name) warnings.push("No name");
        if (!record.phone && !record.email) warnings.push("No contact");
      } else {
        if (!record.serial) warnings.push("No serial");
      }

      const status: RowStatus = duplicateOf ? "likely_duplicate" : "has_data";
      return { index, status, record, duplicateOf, importDecision: "import" as const, warnings, nullCells };
    });

    setClassifiedRows(classified);
    setPreviewPage(0);
  };

  const goToPreview = async () => {
    setParsing(true);
    try {
      await classifyAllRows();
      setStep("preview");
    } finally {
      setParsing(false);
    }
  };

  // ─── Row decisions ───

  const duplicateRows = useMemo(
    () => classifiedRows.filter((r) => r.status === "likely_duplicate"),
    [classifiedRows],
  );

  const setRowDecision = (index: number, decision: ClassifiedRow["importDecision"]) => {
    setClassifiedRows((prev) =>
      prev.map((r) => (r.index === index ? { ...r, importDecision: decision } : r)),
    );
  };

  const setBulkDuplicateDecision = (decision: "import" | "skip") => {
    setClassifiedRows((prev) =>
      prev.map((r) => (r.status === "likely_duplicate" ? { ...r, importDecision: decision } : r)),
    );
  };

  // ─── Import execution ───

  const handleImport = async () => {
    if (!user) return;
    const hasMapped = Object.values(mapping).some((v) => v && v !== "skip");
    if (!hasMapped) { toast.error("No columns mapped."); return; }
    if (planLoading) { toast.error("Checking plan status…"); return; }
    setImporting(true);

    const res: ImportResult = {
      imported: 0, duplicateImported: 0, duplicateSkipped: 0,
      emptySkipped: 0, deletedCount: 0, blockedByPlan: 0, insertErrors: 0,
    };

    const slotsAvailable = importMode === "customers"
      ? (() => {
          if (tier.price === 0) return Math.max(0, tier.max - renterCount);
          if (!subscribed) return 0;
          return Math.max(0, tier.max - renterCount);
        })()
      : Infinity;
    let created = 0;

    try {
      const tableName = importMode === "customers" ? "renters" : "machines";

      for (const classified of classifiedRows) {
        if (classified.status === "empty") { res.emptySkipped++; continue; }
        if (classified.importDecision === "deleted") { res.deletedCount++; continue; }
        if (classified.status === "likely_duplicate" && classified.importDecision === "skip") { res.duplicateSkipped++; continue; }
        if (importMode === "customers" && created >= slotsAvailable) { res.blockedByPlan++; continue; }

        // Record is already coerced by prepareRecord — just add ownership + defaults
        const record = { ...classified.record, user_id: user.id, laundrylord_email: user.email };
        applyInsertDefaults(importMode, record);

        const { error } = await supabase.from(tableName).insert(record as any);
        if (error) {
          console.error("Insert error:", error);
          if (!res.firstError) res.firstError = error.message;
          res.insertErrors++;
        } else {
          if (classified.status === "likely_duplicate") res.duplicateImported++;
          else res.imported++;
          created++;
        }
      }

      setResult(res);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: [importMode === "customers" ? "renters" : "machines"] });

      const totalCreated = res.imported + res.duplicateImported;
      if (totalCreated === 0) toast.error(`No records imported. ${res.insertErrors} errors.`);
      else toast.success(`Imported ${totalCreated} records.`);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep("upload"); setRawData([]); setHeaders([]); setMapping({});
    setResult(null); setClassifiedRows([]); setSourceType("csv"); setPreviewPage(0);
  };

  // ─── Pagination ───

  const totalPages = Math.max(1, Math.ceil(classifiedRows.length / ROWS_PER_PAGE));
  const pagedRows = classifiedRows.slice(previewPage * ROWS_PER_PAGE, (previewPage + 1) * ROWS_PER_PAGE);

  const statusCounts = useMemo(() => {
    const counts = { empty: 0, has_data: 0, likely_duplicate: 0, deleted: 0 };
    for (const r of classifiedRows) {
      if (r.importDecision === "deleted") counts.deleted++;
      else counts[r.status]++;
    }
    return counts;
  }, [classifiedRows]);

  const previewColumns = useMemo(() => {
    return activeFields.filter((f) => mapping[f.key]).slice(0, 5);
  }, [activeFields, mapping]);

  // ─── Render ───

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Import Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload a CSV, Excel, or image file to import your data
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="p-4 flex items-start gap-3">
          <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            Importing your data didn't fully work?{" "}
            <a href="mailto:don.brucexu@gmail.com" className="text-primary font-medium hover:underline">
              Email don.brucexu@gmail.com
            </a>{" "}
            or text 8455987279 for free manual data upload.
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {/* ─── UPLOAD STEP ─── */}
        {step === "upload" && (
          <>
            {/* Mode selector */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3">What are you importing?</p>
                <div className="flex gap-2">
                  <Button variant={importMode === "customers" ? "default" : "outline"} size="sm" onClick={() => setImportMode("customers")} className="gap-1.5">
                    <User className="h-3.5 w-3.5" /> Renters
                  </Button>
                  <Button variant={importMode === "machines" ? "default" : "outline"} size="sm" onClick={() => setImportMode("machines")} className="gap-1.5">
                    <Cpu className="h-3.5 w-3.5" /> Machines
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Plan/billing notice */}
            {importMode === "customers" && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-4 flex items-start gap-3">
                  <Info className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-900 space-y-1">
                    <p>
                      <span className="font-medium">Free plan includes up to 10 billable renters.</span>{" "}
                      Need more? Check Settings first. You can always import later, even one at a time.
                    </p>
                    <p className="text-amber-700 text-xs">
                      Imported renters count as billable. Even if archived later, they still count for 30 days.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Drop zone */}
            <Card>
              <CardContent className="p-8">
                <label
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 cursor-pointer transition-colors ${
                    dragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                  } ${parsing ? "pointer-events-none opacity-60" : ""}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                  onDrop={handleDrop}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                  <span className="text-sm font-medium">
                    {parsing ? "Parsing file…" : "Drop a CSV, Excel, or image file — or click to browse"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">Supports .csv, .xlsx, .png, .jpg</span>
                  <input type="file" accept={ACCEPT_STRING} className="hidden" onChange={handleFileUpload} />
                </label>
              </CardContent>
            </Card>
          </>
        )}

        {/* ─── MAP STEP ─── */}
        {step === "map" && (
          <Card>
            <CardHeader>
              <CardTitle>Map Columns</CardTitle>
              <CardDescription>
                Match your file columns to LaundryLord fields. {rawData.length} rows detected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sourceType === "image" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800 mb-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Imported from image — check mappings carefully. OCR may have errors.</span>
                </div>
              )}

              <div className="flex items-center gap-3 pb-2 border-b">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-44 shrink-0">LaundryLord Field</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">Your Column</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {importMode === "customers" ? <User className="h-3.5 w-3.5 text-muted-foreground" /> : <Cpu className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {importMode === "customers" ? "Renter" : "Machine"} Fields
                </span>
                <Separator className="flex-1" />
              </div>

              {activeFields.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="text-sm w-44 shrink-0">{f.label}</span>
                  <Select
                    value={mapping[f.key] || "skip"}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "skip" ? "" : v }))}
                  >
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Skip" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">— Skip —</SelectItem>
                      {headers.filter((h) => h !== "").map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={reset}>Back</Button>
                <Button onClick={goToPreview} disabled={parsing}>
                  {parsing ? "Loading preview…" : "Preview Import"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── PREVIEW STEP ─── */}
        {step === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle>Preview — {rawData.length} Rows</CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{statusCounts.has_data} ready</Badge>
                {statusCounts.likely_duplicate > 0 && (
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                    {statusCounts.likely_duplicate} likely duplicates
                  </Badge>
                )}
                {statusCounts.empty > 0 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">{statusCounts.empty} empty</Badge>
                )}
                {statusCounts.deleted > 0 && (
                  <Badge variant="outline" className="text-xs text-destructive border-destructive/30">{statusCounts.deleted} removed</Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Global null coercion note */}
              <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 border text-xs text-muted-foreground mb-3">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Some values couldn't be mapped and will be stored as empty. You can edit records after import.</span>
              </div>

              <TooltipProvider>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        {previewColumns.map((f) => (
                          <TableHead key={f.key}>{f.label}</TableHead>
                        ))}
                        <TableHead className="w-28">Status</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedRows.map((cr) => {
                        const isDeleted = cr.importDecision === "deleted";
                        const isEmpty = cr.status === "empty";
                        return (
                          <TableRow
                            key={cr.index}
                            className={isEmpty ? "opacity-40" : isDeleted ? "opacity-40 line-through" : ""}
                          >
                            <TableCell className="text-xs text-muted-foreground">{cr.index + 1}</TableCell>
                            {previewColumns.map((f) => {
                              const isNull = cr.nullCells.includes(f.key);
                              const val = cr.record[f.key];
                              return (
                                <TableCell key={f.key} className="text-xs max-w-[200px] truncate">
                                  {isNull ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground bg-muted/50 font-normal cursor-help">
                                          null
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs max-w-[200px]">
                                        Value couldn't be mapped. Will be stored as empty — edit after import.
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : val !== undefined && val !== null && val !== "" ? (
                                    String(val)
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell>
                              {isDeleted && <Badge variant="outline" className="text-xs text-destructive border-destructive/30">Removed</Badge>}
                              {!isDeleted && isEmpty && <Badge variant="outline" className="text-xs text-muted-foreground">Empty</Badge>}
                              {!isDeleted && cr.status === "has_data" && (
                                cr.nullCells.length > 0
                                  ? <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">Needs review</Badge>
                                  : <Badge variant="outline" className="text-xs text-green-700 border-green-300">Ready</Badge>
                              )}
                              {!isDeleted && cr.status === "likely_duplicate" && (
                                <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">Duplicate?</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {!isEmpty && (
                                isDeleted ? (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRowDecision(cr.index, "import")}>
                                    <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRowDecision(cr.index, "deleted")}>
                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                )
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TooltipProvider>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">Page {previewPage + 1} of {totalPages}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={previewPage === 0} onClick={() => setPreviewPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={previewPage >= totalPages - 1} onClick={() => setPreviewPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
                {duplicateRows.length > 0 ? (
                  <>
                    <Button variant="outline" onClick={handleImport} disabled={importing}>
                      {importing ? "Importing…" : "Skip Review & Import All"}
                    </Button>
                    <Button onClick={() => setStep("duplicates")}>
                      Review {duplicateRows.length} Duplicates
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? "Importing…" : `Import ${statusCounts.has_data + statusCounts.likely_duplicate} Rows`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── DUPLICATE REVIEW STEP ─── */}
        {step === "duplicates" && (
          <Card>
            <CardHeader>
              <CardTitle>Review Likely Duplicates</CardTitle>
              <CardDescription>
                {duplicateRows.length} rows matched existing records. Unreviewed rows import by default.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => setBulkDuplicateDecision("import")}>All: Import</Button>
                <Button variant="outline" size="sm" onClick={() => setBulkDuplicateDecision("skip")}>All: Skip</Button>
              </div>

              {duplicateRows.map((cr) => (
                <Card key={cr.index} className="border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">Row {cr.index + 1}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {activeFields.filter((f) => cr.record[f.key] != null).map((f) => (
                            <div key={f.key} className="text-xs">
                              <span className="text-muted-foreground">{f.label}: </span>
                              <span>{String(cr.record[f.key])}</span>
                            </div>
                          ))}
                        </div>
                        {cr.duplicateOf && (
                          <div className="text-xs text-amber-700">
                            Matches: <span className="font-medium">{cr.duplicateOf.label}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant={cr.importDecision === "import" ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setRowDecision(cr.index, "import")}>Import</Button>
                        <Button variant={cr.importDecision === "skip" ? "destructive" : "outline"} size="sm" className="text-xs" onClick={() => setRowDecision(cr.index, "skip")}>Skip</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep("preview")}>Back</Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? "Importing…" : "Confirm & Import"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── DONE STEP ─── */}
        {step === "done" && result && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-primary mx-auto" />
              <div className="space-y-1 text-sm">
                {result.imported > 0 && (
                  <div><span className="font-semibold">{result.imported}</span> {importMode === "customers" ? "renters" : "machines"} imported</div>
                )}
                {result.duplicateImported > 0 && (
                  <div><span className="font-semibold">{result.duplicateImported}</span> duplicate rows imported (by your choice)</div>
                )}
                {result.duplicateSkipped > 0 && (
                  <div className="text-muted-foreground">{result.duplicateSkipped} duplicates skipped</div>
                )}
                {result.emptySkipped > 0 && (
                  <div className="text-muted-foreground">{result.emptySkipped} empty rows skipped</div>
                )}
                {result.deletedCount > 0 && (
                  <div className="text-muted-foreground">{result.deletedCount} rows removed by you</div>
                )}
                {result.blockedByPlan > 0 && (
                  <div className="text-destructive font-medium">
                    {result.blockedByPlan} rows blocked by plan limit — upgrade in Settings
                  </div>
                )}
                {result.insertErrors > 0 && (
                  <div className="text-destructive">
                    {result.insertErrors} rows failed
                    {result.firstError && <span className="block text-xs mt-0.5 opacity-80">Error: {result.firstError}</span>}
                  </div>
                )}
                {result.imported + result.duplicateImported === 0 && result.insertErrors === 0 && (
                  <div className="text-muted-foreground">No records imported. Check column mappings.</div>
                )}
              </div>
              <Button onClick={reset}>Import More</Button>
            </CardContent>
          </Card>
        )}
      </div>

      <SupportFooter />
    </div>
  );
}
