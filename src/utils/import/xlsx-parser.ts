import * as XLSX from "xlsx";
import { ParsedData } from "./types";

export function parseXLSX(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error("No sheets found in Excel file"));
          return;
        }
        const sheet = workbook.Sheets[sheetName];
        const raw: string[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
          raw: false,
        });
        if (raw.length < 2) {
          reject(new Error("Excel file must have at least a header row and one data row"));
          return;
        }
        const headers = raw[0].map((h) => String(h).trim());
        const rows = raw.slice(1).map((r) => r.map((c) => String(c)));
        resolve({ headers, rows, sourceType: "xlsx" });
      } catch {
        reject(new Error("Failed to parse Excel file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}
