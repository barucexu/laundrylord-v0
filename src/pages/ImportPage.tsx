import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle, Mail, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SupportFooter } from "@/components/SupportFooter";

import { ParsedData } from "@/utils/import/types";
import { RENTER_FIELDS, MACHINE_FIELDS } from "@/utils/import/fields";
import { parseCSV } from "@/utils/import/csv-parser";
import { parseXLSX } from "@/utils/import/xlsx-parser";
import { parseImage } from "@/utils/import/image-parser";
import { autoMap } from "@/utils/import/auto-mapper";
import { ensureRequiredFields } from "@/utils/import/placeholders";

type Step = "upload" | "map" | "preview" | "done";

export default function ImportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"customers" | "machines">("customers");
  const [step, setStep] = useState<Step>("upload");
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [sourceType, setSourceType] = useState<ParsedData["sourceType"]>("csv");
  const [parsing, setParsing] = useState(false);

  const fields = tab === "customers" ? RENTER_FIELDS : MACHINE_FIELDS;

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
        setMapping(autoMap(parsed.headers, fields));
        setStep("map");
      } catch (err: any) {
        toast.error(err.message || "Failed to parse file");
      } finally {
        setParsing(false);
      }
    },
    [fields],
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

  const handleImport = async () => {
    if (!user) return;
    setImporting(true);
    let imported = 0;
    let skipped = 0;

    try {
      for (const row of rawData) {
        const record: Record<string, any> = { user_id: user.id };
        let hasRealContent = false;

        fields.forEach((f) => {
          const csvCol = mapping[f.key];
          if (!csvCol) return;
          const colIdx = headers.indexOf(csvCol);
          if (colIdx < 0) return;
          const val = row[colIdx]?.trim() || "";
          if (val) {
            record[f.key] = val;
            hasRealContent = true;
          }
        });

        if (!hasRealContent) {
          skipped++;
          continue;
        }

        // Parse booleans
        if (tab === "customers") {
          for (const boolKey of ["install_fee_collected", "deposit_collected", "has_payment_method"]) {
            if (record[boolKey] !== undefined) {
              const v = String(record[boolKey]).toLowerCase();
              record[boolKey] = v === "true" || v === "yes" || v === "1";
            }
          }
          // Parse numerics
          if (record.monthly_rate) record.monthly_rate = parseFloat(record.monthly_rate) || 150;
          if (record.balance) record.balance = parseFloat(record.balance) || 0;
          if (record.late_fee) record.late_fee = parseFloat(record.late_fee) || 25;
          if (record.install_fee) record.install_fee = parseFloat(record.install_fee) || 75;
          if (record.deposit_amount) record.deposit_amount = parseFloat(record.deposit_amount) || 0;
        } else {
          if (record.cost_basis) record.cost_basis = parseFloat(record.cost_basis) || 0;
        }

        // Fill placeholders for required DB fields
        ensureRequiredFields(tab, record);

        const table = tab === "customers" ? "renters" : "machines";
        const { error } = await supabase.from(table).insert(record as any);
        if (error) {
          console.error("Insert error:", error);
          skipped++;
        } else {
          imported++;
        }
      }

      setResult({ imported, skipped });
      setStep("done");
      queryClient.invalidateQueries({ queryKey: [tab === "customers" ? "renters" : "machines"] });
      toast.success(`Imported ${imported} records${skipped > 0 ? `, ${skipped} skipped` : ""}`);
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

  const getMappedValue = (row: string[], fieldKey: string) => {
    const csvCol = mapping[fieldKey];
    if (!csvCol) return "";
    const idx = headers.indexOf(csvCol);
    return idx >= 0 ? row[idx]?.trim() || "" : "";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Import Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload a CSV, Excel, or image file to import customers or machines in bulk
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

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as any);
          reset();
        }}
      >
        <TabsList>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="machines">Machines</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-4 mt-4">
          {step === "upload" && (
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
                    Supports .csv, .xlsx, .png, .jpg
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
          )}

          {step === "map" && (
            <Card>
              <CardHeader>
                <CardTitle>Map Columns</CardTitle>
                <CardDescription>
                  Match your file columns to {tab} fields. {rawData.length} rows detected.
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
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-40 shrink-0">
                    LaundryLord Field
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                    Your File's Column
                  </span>
                </div>

                {fields.map((f) => (
                  <div key={f.key} className="flex items-center gap-3">
                    <span className="text-sm w-40 shrink-0">{f.label}</span>
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
                  Showing first {Math.min(10, rawData.length)} of {rawData.length} rows.
                  {sourceType === "image" && " OCR results may need manual cleanup after import."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {fields
                        .filter((f) => mapping[f.key])
                        .map((f) => (
                          <TableHead key={f.key}>{f.label}</TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawData.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        {fields
                          .filter((f) => mapping[f.key])
                          .map((f) => {
                            const val = getMappedValue(row, f.key);
                            const placeholder = !val && f.placeholder;
                            return (
                              <TableCell key={f.key} className="text-xs font-mono">
                                {val || (
                                  <span className="text-muted-foreground italic">
                                    {placeholder || "—"}
                                  </span>
                                )}
                              </TableCell>
                            );
                          })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <div className="p-4 flex gap-2">
                <Button variant="outline" onClick={() => setStep("map")}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? "Importing..." : `Import ${rawData.length} rows`}
                </Button>
              </div>
            </Card>
          )}

          {step === "done" && result && (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-success mx-auto" />
                <div>
                  <div className="text-lg font-semibold">{result.imported} records imported</div>
                  {result.skipped > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {result.skipped} rows skipped (blank or failed to insert)
                    </div>
                  )}
                </div>
                <Button onClick={reset}>Import More</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <SupportFooter />
    </div>
  );
}
