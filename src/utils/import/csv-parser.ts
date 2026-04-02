import Papa from "papaparse";
import { ParsedData } from "./types";

export function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length < 2) {
          reject(new Error("CSV must have at least a header row and one data row"));
          return;
        }
        const headers = data[0].map((h) => h.trim());
        const rows = data.slice(1).map((row) => row.map((cell) => String(cell ?? "")));
        resolve({ headers, rows, sourceType: "csv" });
      },
      error: () => reject(new Error("Failed to parse CSV")),
    });
  });
}
