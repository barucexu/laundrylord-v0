import { ImportField } from "./types";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[_\s#$().\-,]/g, "");
}

export function autoMap(
  csvHeaders: string[],
  fields: ImportField[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  for (const field of fields) {
    const normKey = normalize(field.key);
    const normLabel = normalize(field.label);
    const normSynonyms = (field.synonyms ?? []).map(normalize);

    let bestHeader: string | null = null;

    for (const header of csvHeaders) {
      if (usedHeaders.has(header)) continue;
      const normH = normalize(header);
      if (!normH) continue;

      if (normH === normKey || normH === normLabel) {
        bestHeader = header;
        break;
      }
      if (normSynonyms.includes(normH)) {
        bestHeader = header;
        break;
      }
      if (!bestHeader) {
        for (const syn of normSynonyms) {
          if (normH.includes(syn) || syn.includes(normH)) {
            bestHeader = header;
            break;
          }
        }
      }
    }

    if (bestHeader) {
      mapping[field.key] = bestHeader;
      usedHeaders.add(bestHeader);
    }
  }

  return mapping;
}

// Combined auto-mapper that handles both renter and machine fields
// Uses the same logic but operates on the combined field set with prefixed keys
export function autoMapCombined(
  csvHeaders: string[],
  combinedFields: ImportField[],
): Record<string, string> {
  return autoMap(csvHeaders, combinedFields);
}
