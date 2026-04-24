import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Cpu, Info, Mail, Trash2, Undo2, Upload, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SupportFooter } from "@/components/SupportFooter";
import { useAuth } from "@/hooks/useAuth";
import { useOperatorSettings } from "@/hooks/useSupabaseData";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { BILLABLE_RENTER_COUNT_QUERY_KEY } from "@/lib/billing-counts";
import { getErrorMessage } from "@/lib/errors";
import { autoMap } from "@/utils/import/auto-mapper";
import { parseCSV } from "@/utils/import/csv-parser";
import { classifyImportRows, executeImport, getPreviewStatus, toggleRowDeleted } from "@/utils/import/engine";
import { RENTER_FIELDS, MACHINE_FIELDS } from "@/utils/import/fields";
import { parseImage } from "@/utils/import/image-parser";
import type { ClassifiedRow, ImportField, ImportMode, ImportSummary, ParsedData, PreviewRowStatus } from "@/utils/import/types";
import { parseXLSX } from "@/utils/import/xlsx-parser";

type Step = "upload" | "map" | "preview" | "done";

const ROWS_PER_PAGE = 25;
const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".png", ".jpg", ".jpeg"];
const ACCEPT_STRING = ".csv,.xlsx,.png,.jpg,.jpeg";
const FALLBACK_IMPORT_DEFAULTS = {
  default_monthly_rate: 150,
  default_install_fee: 75,
  default_deposit: 0,
  late_fee_amount: 25,
};

export default function ImportPage() {
  const { user } = useAuth();
  const { tier, billableCount, subscribed, loading: planLoading } = useSubscription();
  const { data: operatorSettings, isLoading: operatorSettingsLoading } = useOperatorSettings();
  const queryClient = useQueryClient();

  const [importMode, setImportMode] = useState<ImportMode>("renters");
  const [step, setStep] = useState<Step>("upload");
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sourceType, setSourceType] = useState<ParsedData["sourceType"]>("csv");
  const [parsing, setParsing] = useState(false);
  const [classifiedRows, setClassifiedRows] = useState<ClassifiedRow[]>([]);
  const [previewPage, setPreviewPage] = useState(0);

  const activeFields = importMode === "renters" ? RENTER_FIELDS : MACHINE_FIELDS;

  const renterSlotsAvailable = useMemo(() => {
    if (importMode !== "renters") return Number.POSITIVE_INFINITY;
    if (tier.max === Infinity) return Number.POSITIVE_INFINITY;
    if (tier.price === 0) return Math.max(0, tier.max - billableCount);
    if (!subscribed) return 0;
    return Math.max(0, tier.max - billableCount);
  }, [billableCount, importMode, subscribed, tier.max, tier.price]);

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
        setClassifiedRows([]);
        setPreviewPage(0);
        setStep("map");
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, "Failed to parse file"));
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

  const goToPreview = () => {
    if (importMode === "renters" && operatorSettingsLoading) {
      toast.error("Loading billing defaults. Please try again in a moment.");
      return;
    }

    const rows = classifyImportRows({
      headers,
      rows: rawData,
      mapping,
      fields: activeFields,
      mode: importMode,
      operatorDefaults:
        importMode === "renters"
          ? {
              default_monthly_rate: operatorSettings?.default_monthly_rate ?? FALLBACK_IMPORT_DEFAULTS.default_monthly_rate,
              default_install_fee: operatorSettings?.default_install_fee ?? FALLBACK_IMPORT_DEFAULTS.default_install_fee,
              default_deposit: operatorSettings?.default_deposit ?? FALLBACK_IMPORT_DEFAULTS.default_deposit,
              late_fee_amount: operatorSettings?.late_fee_amount ?? FALLBACK_IMPORT_DEFAULTS.late_fee_amount,
            }
          : null,
    });

    setClassifiedRows(rows);
    setPreviewPage(0);
    setStep("preview");
  };

  const handleToggleDeleted = (index: number) => {
    setClassifiedRows((prev) => toggleRowDeleted(prev, index));
  };

  const handleImport = async () => {
    if (!user) return;

    const hasMappedColumns = Object.values(mapping).some(Boolean);
    if (!hasMappedColumns) {
      toast.error("No columns mapped. Map at least one column before importing.");
      return;
    }

    if (planLoading) {
      toast.error("Checking plan status. Please try again in a moment.");
      return;
    }

    setImporting(true);
    try {
      const { summary } = await executeImport({
        rows: classifiedRows,
        mode: importMode,
        userId: user.id,
        renterSlotsAvailable,
        insertRow: async (tableName, record) =>
          supabase.from(tableName).insert(record as never).select("id").single(),
        ensureCustomFieldDefinition: async ({ userId, entityType, key, label }) =>
          supabase
            .from("custom_field_definitions")
            .upsert(
              {
                user_id: userId,
                entity_type: entityType,
                key,
                label,
                value_type: "text",
              } as never,
              { onConflict: "user_id,entity_type,key" },
            )
            .select("id")
            .single(),
        upsertCustomFieldValue: async ({ userId, entityType, entityId, fieldDefinitionId, value }) =>
          supabase.from("custom_field_values").upsert(
            {
              user_id: userId,
              entity_type: entityType,
              entity_id: entityId,
              field_definition_id: fieldDefinitionId,
              text_value: value,
              number_value: null,
              date_value: null,
              boolean_value: null,
            } as never,
            { onConflict: "field_definition_id,entity_id" },
          ),
      });

      setResult(summary);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: [importMode === "renters" ? "renters" : "machines"] });
      if (importMode === "renters") {
        queryClient.invalidateQueries({ queryKey: BILLABLE_RENTER_COUNT_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["custom_fields", "renter", "batch"] });
      }

      if (summary.imported === 0) {
        toast.error("No rows imported. Review the summary for details.");
      } else {
        toast.success(`Imported ${summary.imported} ${importMode === "renters" ? "renters" : "machines"}.`);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Import failed"));
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setRawData([]);
    setHeaders([]);
    setMapping({});
    setResult(null);
    setClassifiedRows([]);
    setSourceType("csv");
    setPreviewPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(classifiedRows.length / ROWS_PER_PAGE));
  const pagedRows = classifiedRows.slice(previewPage * ROWS_PER_PAGE, (previewPage + 1) * ROWS_PER_PAGE);

  const previewCounts = useMemo(() => {
    const counts: Record<PreviewRowStatus, number> = {
      ready: 0,
      review_needed: 0,
      validation_blocked: 0,
      skipped_empty: 0,
      deleted_by_operator: 0,
    };

    for (const row of classifiedRows) {
      counts[getPreviewStatus(row)]++;
    }

    return counts;
  }, [classifiedRows]);

  const importableRows = useMemo(
    () =>
      classifiedRows.filter((row) => {
        const status = getPreviewStatus(row);
        return status !== "skipped_empty" && status !== "deleted_by_operator" && status !== "validation_blocked";
      }).length,
    [classifiedRows],
  );

  const blockedByPlanEstimate =
    importMode === "renters" && Number.isFinite(renterSlotsAvailable)
      ? Math.max(0, importableRows - renterSlotsAvailable)
      : 0;

  const previewColumns = useMemo(
    () => activeFields.filter((field) => mapping[field.key]).slice(0, 5),
    [activeFields, mapping],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Import Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload a CSV, Excel, or image file to import your data.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="p-4 flex items-start gap-3">
          <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            Importing your data did not fully work?{" "}
            <a href="mailto:don.brucexu@gmail.com" className="text-primary font-medium hover:underline">
              Email don.brucexu@gmail.com
            </a>{" "}
            or text 8455987279 for free manual data upload.
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {step === "upload" && (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3">What are you importing?</p>
                <div className="flex gap-2">
                  <Button
                    variant={importMode === "renters" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setImportMode("renters")}
                    className="gap-1.5"
                  >
                    <User className="h-3.5 w-3.5" />
                    Renters
                  </Button>
                  <Button
                    variant={importMode === "machines" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setImportMode("machines")}
                    className="gap-1.5"
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    Machines
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <label
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 cursor-pointer transition-colors ${
                    dragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                  } ${parsing ? "pointer-events-none opacity-60" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragging(false);
                  }}
                  onDrop={handleDrop}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                  <span className="text-sm font-medium">
                    {parsing ? "Parsing file..." : "Drop a CSV, Excel, or image file — or click to browse"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">Supports .csv, .xlsx, .png, .jpg</span>
                  <input type="file" accept={ACCEPT_STRING} className="hidden" onChange={handleFileUpload} />
                </label>
              </CardContent>
            </Card>
          </>
        )}

        {step === "map" && (
          <Card>
            <CardHeader>
              <CardTitle>Map Columns</CardTitle>
              <CardDescription>
                Match your file columns to LaundryLord fields. {rawData.length} rows detected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-blue-200 bg-blue-50/80 px-3 py-2 text-sm text-blue-900">
                Custom columns will be created as custom fields.
              </div>

              {sourceType === "image" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800 mb-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Imported from image — check mappings carefully. OCR may have errors.</span>
                </div>
              )}

              <div className="flex items-center gap-3 pb-2 border-b">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-44 shrink-0">
                  LaundryLord Field
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                  Your Column
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {importMode === "renters" ? (
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {importMode === "renters" ? "Renter" : "Machine"} Fields
                </span>
                <Separator className="flex-1" />
              </div>

              {activeFields.map((field: ImportField) => (
                <div key={field.key} className="flex items-center gap-3">
                  <span className="text-sm w-44 shrink-0">{field.label}</span>
                  <Select
                    value={mapping[field.key] || "skip"}
                    onValueChange={(value) =>
                      setMapping((current) => ({ ...current, [field.key]: value === "skip" ? "" : value }))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">— Skip —</SelectItem>
                      {headers.filter(Boolean).map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={reset}>
                  Back
                </Button>
                <Button onClick={goToPreview} disabled={parsing}>
                  Preview Import
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle>Preview — {classifiedRows.length} Rows</CardTitle>
              <CardDescription className="flex flex-wrap gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {previewCounts.ready} ready
                </Badge>
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                  {previewCounts.review_needed} review needed
                </Badge>
                <Badge variant="outline" className="text-xs border-destructive/40 text-destructive">
                  {previewCounts.validation_blocked} validation blocked
                </Badge>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {previewCounts.skipped_empty} fully empty
                </Badge>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {previewCounts.deleted_by_operator} removed
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-blue-200 bg-blue-50/80 px-3 py-2 text-sm text-blue-900">
                Custom columns will be created as custom fields. Invalid mapped values should be reviewed before import.
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900">
                Carefully review this preview before importing. LaundryLord does not check for duplicate{" "}
                {importMode === "renters" ? "renters" : "machines"} in this importer.
              </div>

              {importMode === "renters" && Number.isFinite(renterSlotsAvailable) && (
                <div className="rounded-md border px-3 py-2 text-sm">
                  {renterSlotsAvailable > 0 ? (
                    <span>
                      Your plan currently allows <span className="font-medium">{renterSlotsAvailable}</span> more renter
                      {renterSlotsAvailable === 1 ? "" : "s"}.
                      {blockedByPlanEstimate > 0 && (
                        <span className="text-destructive">
                          {" "}
                          {blockedByPlanEstimate} row{blockedByPlanEstimate === 1 ? "" : "s"} will be blocked by plan.
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-destructive">
                      Your plan has no renter slots remaining. All renter rows in this import will be blocked by plan.
                    </span>
                  )}
                </div>
              )}

              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {previewColumns.map((field) => (
                        <TableHead key={field.key}>{field.label}</TableHead>
                      ))}
                      <TableHead>Extras</TableHead>
                      <TableHead className="w-40">Status</TableHead>
                      <TableHead className="w-56">Warnings</TableHead>
                      <TableHead className="w-24 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRows.map((row) => {
                      const status = getPreviewStatus(row);
                      return (
                        <TableRow
                          key={row.index}
                          className={status === "skipped_empty" || status === "deleted_by_operator" ? "opacity-50" : ""}
                        >
                          <TableCell className="text-xs text-muted-foreground">{row.index + 1}</TableCell>
                          {previewColumns.map((field) => (
                            <TableCell key={field.key} className="text-xs max-w-[180px] truncate">
                              {renderPreviewValue(row.record[field.key])}
                            </TableCell>
                          ))}
                          <TableCell className="text-xs max-w-[260px]">
                            {row.extrasPreview.length > 0 ? (
                              <span className="line-clamp-3 break-words">{row.extrasPreview.join(" | ")}</span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {status === "ready" && (
                              <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                                Ready
                              </Badge>
                            )}
                            {status === "review_needed" && (
                              <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                                Review Needed
                              </Badge>
                            )}
                            {status === "validation_blocked" && (
                              <Badge variant="outline" className="text-xs text-destructive border-destructive/40">
                                Blocked
                              </Badge>
                            )}
                            {status === "skipped_empty" && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Empty
                              </Badge>
                            )}
                            {status === "deleted_by_operator" && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Removed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-amber-700">
                            {[...row.validationErrors, ...row.warnings].length > 0
                              ? [...row.validationErrors, ...row.warnings].join(", ")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {status === "skipped_empty" ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : row.decision === "deleted_by_operator" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => handleToggleDeleted(row.index)}
                              >
                                <Undo2 className="h-3.5 w-3.5" />
                                Undo
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => handleToggleDeleted(row.index)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Page {previewPage + 1} of {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={previewPage === 0}
                      onClick={() => setPreviewPage((page) => page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={previewPage >= totalPages - 1}
                      onClick={() => setPreviewPage((page) => page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("map")}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? "Importing..." : `Import ${importableRows} Rows`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-primary mx-auto" />
              <div className="space-y-2 text-sm">
                <SummaryLine label="Imported" value={result?.imported ?? 0} />
                <SummaryLine label="Validation blocked" value={result?.validation_blocked ?? 0} highlight="destructive" />
                <SummaryLine label="Blocked by plan" value={result?.blocked_by_plan ?? 0} highlight="destructive" />
                <SummaryLine label="Failed insert" value={result?.failed_insert ?? 0} highlight="destructive" />
                <SummaryLine label="Skipped empty" value={result?.skipped_empty ?? 0} />
                <SummaryLine label="Deleted by operator" value={result?.deleted_by_operator ?? 0} />
                {result?.firstError && (
                  <div className="text-xs text-muted-foreground">
                    First insert error: <span className="font-medium">{result.firstError}</span>
                  </div>
                )}
              </div>

              {importMode === "renters" && (result?.blocked_by_plan ?? 0) > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-amber-900">
                  Upgrade your plan to import the blocked renter rows.
                </div>
              )}

              <Button onClick={reset}>Import More</Button>
            </CardContent>
          </Card>
        )}
      </div>

      <SupportFooter />
    </div>
  );
}

function renderPreviewValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function SummaryLine({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: "destructive";
}) {
  return (
    <div className={`flex items-center justify-center gap-2 ${highlight === "destructive" ? "text-destructive" : ""}`}>
      <Info className="h-3.5 w-3.5" />
      <span>
        <span className="font-semibold">{value}</span> {label.toLowerCase()}
      </span>
    </div>
  );
}
