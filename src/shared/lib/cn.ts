type ClassValue = string | false | null | undefined;

/** Joins conditional class names. Later strings simply append. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
