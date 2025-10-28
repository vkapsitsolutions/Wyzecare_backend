export function capitalize(text: string): string {
  if (!text) return text;
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}
