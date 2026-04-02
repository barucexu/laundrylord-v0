import { supabase } from "@/integrations/supabase/client";
import { ParsedData } from "./types";

export async function parseImage(file: File): Promise<ParsedData> {
  const base64 = await fileToBase64(file);

  const { data, error } = await supabase.functions.invoke("parse-image-table", {
    body: { image: base64, mimeType: file.type },
  });

  if (error) {
    throw new Error("Image parsing failed — try a CSV or Excel file instead");
  }

  const headers: string[] = data?.headers ?? [];
  const rows: string[][] = data?.rows ?? [];

  if (headers.length === 0 || rows.length === 0) {
    throw new Error("No table data found in image — try a clearer photo or use CSV/Excel");
  }

  return {
    headers: headers.map((h: string) => String(h).trim()),
    rows: rows.map((r: string[]) => r.map((c: string) => String(c))),
    sourceType: "image",
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}
