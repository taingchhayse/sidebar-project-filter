function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function fuzzyMatch(query: string, value: string): boolean {
  const needle = normalize(query);
  const haystack = normalize(value);
  let index = 0;
  for (const character of haystack) {
    if (character === needle[index]) index++;
  }
  return index === needle.length;
}

export function hasProjectQuery(query: string): boolean {
  return normalize(query).length > 0;
}

export function matchesProject(query: string, values: readonly string[]): boolean {
  if (!hasProjectQuery(query)) return true;
  return values.some((value) => fuzzyMatch(query, value));
}
