export function formatTimelineDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "";

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString();
  }

  return new Date(dateValue).toLocaleDateString();
}
