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

export function getPublicAppOrigin() {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_APP_ORIGIN?.trim();
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return "https://laundrylord.club";
}
