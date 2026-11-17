function fuzzyMatch(query: string, value: string): boolean {
  const needle = query.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const haystack = value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  let index = 0;
  for (const character of haystack) {
    if (character === needle[index]) index++;
  }
  return index === needle.length;
}

export function matchesProject(query: string, values: readonly string[]): boolean {
  if (!query.trim()) return true;
  return values.some((value) => fuzzyMatch(query, value));
}
