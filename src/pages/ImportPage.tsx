import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle, Mail, AlertTriangle, ChevronDown, Link2, User, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SupportFooter } from "@/components/SupportFooter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { ParsedData, ImportMode, ImportField } from "@/utils/import/types";
import { RENTER_FIELDS, MACHINE_FIELDS, getCombinedFields, resolveFieldKey } from "@/utils/import/fields";
import { parseCSV } from "@/utils/import/csv-parser";
import { parseXLSX } from "@/utils/import/xlsx-parser";
import { parseImage } from "@/utils/import/image-parser";
import { autoMap, autoMapCombined } from "@/utils/import/auto-mapper";
import { ensureRequiredFields, ensureRequiredFieldsForGroup } from "@/utils/import/placeholders";

type Step = "upload" | "map" | "preview" | "done";

interface CombinedResult {
  rentersCreated: number;
  rentersMatched: number;
  machinesCreated: number;
  machinesMatched: number;
  machinesLinked: number;
  skipped: number;
}

export default function ImportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [importMode, setImportMode] = useState<ImportMode>("combined");
  const [step, setStep] = useState<Step>("upload");
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CombinedResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sourceType, setSourceType] = useState<ParsedData["sourceType"]>("csv");
  const [parsing, setParsing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const combinedFields = getCombinedFields();

  const getActiveFields = (): ImportField[] => {
    if (importMode === "customers") return RENTER_FIELDS;
    if (importMode === "machines") return MACHINE_FIELDS;
    return combinedFields;
  };

  const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".png", ".jpg", ".jpeg"];
  const ACCEPT_STRING = ".csv,.xlsx,.png,.jpg,.jpeg";

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
        if (ext === ".csv") {
          parsed = await parseCSV(file);
        } else if (ext === ".xlsx") {
          parsed = await parseXLSX(file);
        } else {
          parsed = await parseImage(file);
        }

        setHeaders(parsed.headers);
        setRawData(parsed.rows);
        setSourceType(parsed.sourceType);

        // Auto-map based on current mode
        const fields = importMode === "customers" ? RENTER_FIELDS
          : importMode === "machines" ? MACHINE_FIELDS
          : combinedFields;

        const autoMapping = importMode === "combined"
          ? autoMapCombined(parsed.headers, combinedFields)
          : autoMap(parsed.headers, fields);

        setMapping(autoMapping);
        setStep("map");
      } catch (err: any) {
        toast.error(err.message || "Failed to parse file");
      } finally {
        setParsing(false);
      }
    },
    [importMode, combinedFields],
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      processFile(file);
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const getMappedValue = (row: string[], fieldKey: string) => {
    const csvCol = mapping[fieldKey];
    if (!csvCol) return "";
    const idx = headers.indexOf(csvCol);
    return idx >= 0 ? row[idx]?.trim() || "" : "";
  };

  // Build payload for a group from a single row
  const buildPayload = (row: string[], fields: ImportField[]): { record: Record<string, any>; hasContent: boolean } => {
    const record: Record<string, any> = {};
    let hasContent = false;

    for (const f of fields) {
      const csvCol = mapping[f.key];
      if (!csvCol) continue;
      const colIdx = headers.indexOf(csvCol);
      if (colIdx < 0) continue;
      const val = row[colIdx]?.trim() || "";
      const dbKey = resolveFieldKey(f.key);
      if (val) {
        record[dbKey] = val;
        hasContent = true;
      }
    }

    return { record, hasContent };
  };

  const parseRenterRecord = (record: Record<string, any>) => {
    for (const boolKey of ["install_fee_collected", "deposit_collected", "has_payment_method"]) {
      if (record[boolKey] !== undefined) {
        const v = String(record[boolKey]).toLowerCase();
        record[boolKey] = v === "true" || v === "yes" || v === "1";
      }
    }
    if (record.monthly_rate) record.monthly_rate = parseFloat(record.monthly_rate) || 150;
    if (record.balance) record.balance = parseFloat(record.balance) || 0;
    if (record.late_fee) record.late_fee = parseFloat(record.late_fee) || 25;
    if (record.install_fee) record.install_fee = parseFloat(record.install_fee) || 75;
    if (record.deposit_amount) record.deposit_amount = parseFloat(record.deposit_amount) || 0;
  };

  const parseMachineRecord = (record: Record<string, any>) => {
    if (record.cost_basis) record.cost_basis = parseFloat(record.cost_basis) || 0;
  };

  // Dedup: try to find existing renter by email or phone
  const findExistingRenter = async (record: Record<string, any>): Promise<string | null> => {
    if (!user) return null;
    if (record.email) {
      const { data } = await supabase
        .from("renters")
        .select("id")
        .eq("user_id", user.id)
        .eq("email", record.email)
        .limit(1);
      if (data && data.length > 0) return data[0].id;
    }
    if (record.phone) {
      const { data } = await supabase
        .from("renters")
        .select("id")
        .eq("user_id", user.id)
        .eq("phone", record.phone)
        .limit(1);
      if (data && data.length > 0) return data[0].id;
    }
    return null;
  };

  // Dedup: try to find existing machine by serial
  const findExistingMachine = async (record: Record<string, any>): Promise<string | null> => {
    if (!user) return null;
    if (record.serial) {
      const { data } = await supabase
        .from("machines")
        .select("id")
        .eq("user_id", user.id)
        .eq("serial", record.serial)
        .limit(1);
      if (data && data.length > 0) return data[0].id;
    }
    return null;
  };

  const handleImport = async () => {
    if (!user) return;
    setImporting(true);

    const res: CombinedResult = {
      rentersCreated: 0,
      rentersMatched: 0,
      machinesCreated: 0,
      machinesMatched: 0,
      machinesLinked: 0,
      skipped: 0,
    };

    try {
      const activeFields = getActiveFields();
      const renterFields = activeFields.filter((f) => f.group === "renter");
      const machineFields = activeFields.filter((f) => f.group === "machine");

      if (importMode === "customers") {
        // Customers-only mode
        for (const row of rawData) {
          const { record, hasContent } = buildPayload(row, renterFields);
          if (!hasContent) { res.skipped++; continue; }
          record.user_id = user.id;
          parseRenterRecord(record);
          ensureRequiredFields("customers", record);

          const existingId = await findExistingRenter(record);
          if (existingId) {
            res.rentersMatched++;
          } else {
            const { error } = await supabase.from("renters").insert(record as any);
            if (error) { console.error("Insert error:", error); res.skipped++; }
            else res.rentersCreated++;
          }
        }
      } else if (importMode === "machines") {
        // Machines-only mode
        for (const row of rawData) {
          const { record, hasContent } = buildPayload(row, machineFields);
          if (!hasContent) { res.skipped++; continue; }
          record.user_id = user.id;
          parseMachineRecord(record);
          ensureRequiredFields("machines", record);

          const existingId = await findExistingMachine(record);
          if (existingId) {
            res.machinesMatched++;
          } else {
            const { error } = await supabase.from("machines").insert(record as any);
            if (error) { console.error("Insert error:", error); res.skipped++; }
            else res.machinesCreated++;
          }
        }
      } else {
        // Combined mode
        for (const row of rawData) {
          const renterResult = buildPayload(row, renterFields);
          const machineResult = buildPayload(row, machineFields);

          if (!renterResult.hasContent && !machineResult.hasContent) {
            res.skipped++;
            continue;
          }

          let renterId: string | null = null;

          // Handle renter side
          if (renterResult.hasContent) {
            const rRecord = renterResult.record;
            rRecord.user_id = user.id;
            parseRenterRecord(rRecord);
            ensureRequiredFieldsForGroup("renter", rRecord);

            const existingId = await findExistingRenter(rRecord);
            if (existingId) {
              renterId = existingId;
              res.rentersMatched++;
            } else {
              const { data, error } = await supabase.from("renters").insert(rRecord as any).select("id").single();
              if (error) {
                console.error("Renter insert error:", error);
              } else {
                renterId = data.id;
                res.rentersCreated++;
              }
            }
          }

          // Handle machine side
          if (machineResult.hasContent) {
            const mRecord = machineResult.record;
            mRecord.user_id = user.id;
            parseMachineRecord(mRecord);
            ensureRequiredFieldsForGroup("machine", mRecord);

            // Link to renter if we have one
            if (renterId) {
              mRecord.assigned_renter_id = renterId;
              mRecord.status = "assigned";
            }

            const existingId = await findExistingMachine(mRecord);
            if (existingId) {
              res.machinesMatched++;
              // If machine exists and is unassigned, link it
              if (renterId) {
                await supabase
                  .from("machines")
                  .update({ assigned_renter_id: renterId, status: "assigned" } as any)
                  .eq("id", existingId)
                  .is("assigned_renter_id", null);
                res.machinesLinked++;
              }
            } else {
              const { error } = await supabase.from("machines").insert(mRecord as any);
              if (error) {
                console.error("Machine insert error:", error);
              } else {
                res.machinesCreated++;
                if (renterId) res.machinesLinked++;
              }
            }
          }
        }
      }

      setResult(res);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["renters"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });

      const totalCreated = res.rentersCreated + res.machinesCreated;
      const totalMatched = res.rentersMatched + res.machinesMatched;
      toast.success(
        `Imported ${totalCreated} records${totalMatched > 0 ? `, matched ${totalMatched} existing` : ""}${res.skipped > 0 ? `, ${res.skipped} skipped` : ""}`
      );
    } catch (err: any) {
      toast.error(err.message || "Import failed");
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
    setSourceType("csv");
  };

  // Preview helpers
  const getPreviewRowInfo = (row: string[]) => {
    const activeFields = getActiveFields();
    const renterFields = activeFields.filter((f) => f.group === "renter");
    const machineFields = activeFields.filter((f) => f.group === "machine");

    const renterData: { label: string; value: string; isPlaceholder: boolean }[] = [];
    const machineData: { label: string; value: string; isPlaceholder: boolean }[] = [];

    const collectFields = (fields: ImportField[], target: typeof renterData) => {
      for (const f of fields) {
        if (!mapping[f.key]) continue;
        const val = getMappedValue(row, f.key);
        target.push({
          label: f.label,
          value: val || f.placeholder || "—",
          isPlaceholder: !val,
        });
      }
    };

    if (importMode !== "machines") collectFields(renterFields, renterData);
    if (importMode !== "customers") collectFields(machineFields, machineData);

    const hasRenter = renterData.some((d) => !d.isPlaceholder);
    const hasMachine = machineData.some((d) => !d.isPlaceholder);

    let linkResult = "";
    if (importMode === "combined") {
      if (hasRenter && hasMachine) linkResult = "Will create renter + machine and link them";
      else if (hasRenter) linkResult = "Will create renter only";
      else if (hasMachine) linkResult = "Will create machine only";
      else linkResult = "Will be skipped (blank row)";
    } else if (importMode === "customers") {
      linkResult = hasRenter ? "Will create renter" : "Will be skipped";
    } else {
      linkResult = hasMachine ? "Will create machine" : "Will be skipped";
    }

    return { renterData, machineData, hasRenter, hasMachine, linkResult };
  };

  const activeFields = getActiveFields();
  const renterFieldsForMapping = activeFields.filter((f) => f.group === "renter");
  const machineFieldsForMapping = activeFields.filter((f) => f.group === "machine");

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
        {step === "upload" && (
          <>
            <Card>
              <CardContent className="p-8">
                <label
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 cursor-pointer transition-colors ${
                    dragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                  } ${parsing ? "pointer-events-none opacity-60" : ""}`}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                  <span className="text-sm font-medium">
                    {parsing ? "Parsing file..." : "Drop a CSV, Excel, or image file — or click to browse"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Supports .csv, .xlsx, .png, .jpg — renter data, machine data, or both
                  </span>
                  <input
                    type="file"
                    accept={ACCEPT_STRING}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </CardContent>
            </Card>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                  <ChevronDown className={`h-3 w-3 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                  Advanced options
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      By default, the importer handles both customer and machine data. Narrow if needed:
                    </p>
                    <div className="flex gap-2">
                      {(["combined", "customers", "machines"] as ImportMode[]).map((mode) => (
                        <Button
                          key={mode}
                          variant={importMode === mode ? "default" : "outline"}
                          size="sm"
                          onClick={() => setImportMode(mode)}
                          className="text-xs"
                        >
                          {mode === "combined" ? "Default (Both)" : mode === "customers" ? "Customers only" : "Machines only"}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {step === "map" && (
          <Card>
            <CardHeader>
              <CardTitle>Map Columns</CardTitle>
              <CardDescription>
                Match your file columns to LaundryLord fields. {rawData.length} rows detected.
                {importMode === "combined" && " Renter and machine fields are shown together."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sourceType === "image" && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800 mb-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Imported from image — check mappings carefully. OCR may have errors.</span>
                </div>
              )}

              {/* Column headers */}
              <div className="flex items-center gap-3 pb-2 border-b">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-44 shrink-0">
                  LaundryLord's Label
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                  Your Imported Data's Section Title
                </span>
              </div>

              {/* Renter fields section */}
              {renterFieldsForMapping.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Renter Fields
                    </span>
                    <Separator className="flex-1" />
                  </div>
                  {renterFieldsForMapping.map((f) => (
                    <div key={f.key} className="flex items-center gap-3">
                      <span className="text-sm w-44 shrink-0">{f.label}</span>
                      <Select
                        value={mapping[f.key] || "skip"}
                        onValueChange={(v) =>
                          setMapping((m) => ({ ...m, [f.key]: v === "skip" ? "" : v }))
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Skip" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">— Skip —</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </>
              )}

              {/* Machine fields section */}
              {machineFieldsForMapping.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-4">
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Machine Fields
                    </span>
                    <Separator className="flex-1" />
                  </div>
                  {machineFieldsForMapping.map((f) => (
                    <div key={f.key} className="flex items-center gap-3">
                      <span className="text-sm w-44 shrink-0">{f.label}</span>
                      <Select
                        value={mapping[f.key] || "skip"}
                        onValueChange={(v) =>
                          setMapping((m) => ({ ...m, [f.key]: v === "skip" ? "" : v }))
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Skip" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">— Skip —</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={reset}>
                  Back
                </Button>
                <Button onClick={() => setStep("preview")}>Preview Import</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Showing first {Math.min(5, rawData.length)} of {rawData.length} rows.
                {sourceType === "image" && " OCR results may need manual cleanup after import."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rawData.slice(0, 5).map((row, i) => {
                const info = getPreviewRowInfo(row);
                return (
                  <Card key={i} className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Row {i + 1}</span>
                        <Badge variant="outline" className="text-xs font-normal">
                          {info.linkResult}
                        </Badge>
                      </div>

                      {info.renterData.length > 0 && info.hasRenter && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Renter Record
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {info.renterData.map((d) => (
                              <div key={d.label} className="flex items-baseline gap-1.5 text-xs">
                                <span className="text-muted-foreground shrink-0">{d.label}:</span>
                                <span className={d.isPlaceholder ? "text-muted-foreground/50 italic" : ""}>
                                  {d.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {info.machineData.length > 0 && info.hasMachine && (
                        <div>
                          {info.hasRenter && <Separator className="my-2" />}
                          <div className="flex items-center gap-1.5 mb-2">
                            <Cpu className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Machine Record
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {info.machineData.map((d) => (
                              <div key={d.label} className="flex items-baseline gap-1.5 text-xs">
                                <span className="text-muted-foreground shrink-0">{d.label}:</span>
                                <span className={d.isPlaceholder ? "text-muted-foreground/50 italic" : ""}>
                                  {d.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {importMode === "combined" && info.hasRenter && info.hasMachine && (
                        <>
                          <Separator className="my-1" />
                          <div className="flex items-center gap-1.5 text-xs text-primary">
                            <Link2 className="h-3 w-3" />
                            <span>Machine will be linked to renter</span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("map")}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? "Importing..." : `Import ${rawData.length} rows`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && result && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div className="space-y-1">
                {(result.rentersCreated > 0 || result.rentersMatched > 0) && (
                  <div className="text-sm">
                    <span className="font-semibold">{result.rentersCreated}</span> renters created
                    {result.rentersMatched > 0 && (
                      <span className="text-muted-foreground"> · {result.rentersMatched} matched existing</span>
                    )}
                  </div>
                )}
                {(result.machinesCreated > 0 || result.machinesMatched > 0) && (
                  <div className="text-sm">
                    <span className="font-semibold">{result.machinesCreated}</span> machines created
                    {result.machinesMatched > 0 && (
                      <span className="text-muted-foreground"> · {result.machinesMatched} matched existing</span>
                    )}
                  </div>
                )}
                {result.machinesLinked > 0 && (
                  <div className="text-sm text-primary">
                    <Link2 className="h-3 w-3 inline mr-1" />
                    {result.machinesLinked} machines linked to renters
                  </div>
                )}
                {result.skipped > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {result.skipped} rows skipped (blank or failed)
                  </div>
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
