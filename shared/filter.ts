export function matchesProject(query: string, values: readonly string[]): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return values.some((value) => value.toLocaleLowerCase().includes(needle));
}
