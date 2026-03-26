import { useState, useCallback } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, CheckCircle, AlertTriangle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SupportFooter } from "@/components/SupportFooter";

const CUSTOMER_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "monthly_rate", label: "Monthly Rate" },
  { key: "balance", label: "Balance" },
  { key: "paid_through_date", label: "Paid Through Date" },
  { key: "notes", label: "Notes" },
  { key: "status", label: "Status" },
  { key: "secondary_contact", label: "Secondary Contact" },
  { key: "language", label: "Language" },
  { key: "install_notes", label: "Install Notes" },
];

const MACHINE_FIELDS = [
  { key: "type", label: "Type", required: true },
  { key: "model", label: "Model", required: true },
  { key: "serial", label: "Serial #", required: true },
  { key: "prong", label: "Prong" },
  { key: "condition", label: "Condition" },
  { key: "cost_basis", label: "Cost Basis ($)" },
  { key: "sourced_from", label: "Sourced From" },
  { key: "notes", label: "Notes" },
];

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

  const fields = tab === "customers" ? CUSTOMER_FIELDS : MACHINE_FIELDS;

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      Papa.parse(file, {
        complete: (results) => {
          const data = results.data as string[][];
          if (data.length < 2) {
            toast.error("CSV must have at least a header row and one data row");
            return;
          }
          const csvHeaders = data[0].map((h) => h.trim());
          setHeaders(csvHeaders);
          setRawData(data.slice(1).filter((row) => row.some((c) => c.trim())));

          // Auto-map columns
          const autoMap: Record<string, string> = {};
          fields.forEach((f) => {
            const match = csvHeaders.findIndex(
              (h) =>
                h.toLowerCase().replace(/[_\s#]/g, "") === f.key.toLowerCase().replace(/_/g, "") ||
                h.toLowerCase().includes(
                  f.label
                    .toLowerCase()
                    .replace(/[#$()]/g, "")
                    .trim(),
                ),
            );
            if (match >= 0) autoMap[f.key] = csvHeaders[match];
          });
          setMapping(autoMap);
          setStep("map");
        },
        error: () => toast.error("Failed to parse CSV"),
      });
    },
    [fields],
  );

  const handleImport = async () => {
    if (!user) return;
    setImporting(true);
    let imported = 0;
    let skipped = 0;

    try {
      for (const row of rawData) {
        const record: Record<string, any> = { user_id: user.id };
        let valid = true;

        fields.forEach((f) => {
          const csvCol = mapping[f.key];
          if (!csvCol) return;
          const colIdx = headers.indexOf(csvCol);
          if (colIdx < 0) return;
          const val = row[colIdx]?.trim() || "";
          if (f.required && !val) valid = false;
          if (val) record[f.key] = val;
        });

        if (!valid) {
          skipped++;
          continue;
        }

        // Parse numeric fields
        if (tab === "customers") {
          if (record.monthly_rate) record.monthly_rate = parseFloat(record.monthly_rate) || 150;
          if (record.balance) record.balance = parseFloat(record.balance) || 0;
          if (!record.status) record.status = "active";
        } else {
          if (record.cost_basis) record.cost_basis = parseFloat(record.cost_basis) || 0;
          if (!record.status) record.status = "available";
        }

        const table = tab === "customers" ? "renters" : "machines";
        const { error } = await supabase.from(table).insert(record as any);
        if (error) {
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
  };

  const getMappedValue = (row: string[], fieldKey: string) => {
    const csvCol = mapping[fieldKey];
    if (!csvCol) return "";
    const idx = headers.indexOf(csvCol);
    return idx >= 0 ? row[idx] : "";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Import Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Upload a CSV to import customers or machines in bulk</p>
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
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-12 cursor-pointer hover:bg-muted/30 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                  <span className="text-sm font-medium">Drop a CSV file or click to browse</span>
                  <span className="text-xs text-muted-foreground mt-1">Supports .csv files</span>
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </label>
              </CardContent>
            </Card>
          )}

          {step === "map" && (
            <Card>
              <CardHeader>
                <CardTitle>Map Columns</CardTitle>
                <CardDescription>
                  Match your CSV columns to {tab} fields. {rawData.length} rows detected.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {fields.map((f) => (
                  <div key={f.key} className="flex items-center gap-3">
                    <span className="text-sm w-40 shrink-0">
                      {f.label} {f.required ? "*" : ""}
                    </span>
                    <Select
                      value={mapping[f.key] || "skip"}
                      onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "skip" ? "" : v }))}
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
                  Showing first {Math.min(10, rawData.length)} of {rawData.length} rows
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
                    {rawData.slice(0, 10).map((row, i) => {
                      const requiredMissing = fields.some(
                        (f) => f.required && mapping[f.key] && !getMappedValue(row, f.key),
                      );
                      return (
                        <TableRow key={i} className={requiredMissing ? "bg-destructive/5" : ""}>
                          {fields
                            .filter((f) => mapping[f.key])
                            .map((f) => (
                              <TableCell key={f.key} className="text-xs font-mono">
                                {getMappedValue(row, f.key) || <span className="text-muted-foreground">—</span>}
                              </TableCell>
                            ))}
                        </TableRow>
                      );
                    })}
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
                      {result.skipped} rows skipped (missing required fields)
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
