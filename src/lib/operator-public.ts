export function sanitizeOperatorSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildOperatorPublicPath(slug: string | null | undefined, path: "apply" | "portal") {
  if (!slug) return null;
  return `/o/${slug}/${path}`;
}
