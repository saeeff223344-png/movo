/**
 * Strips everything except safe, unambiguous path characters and caps
 * length — shared by every Supabase Storage path builder in this codebase
 * (narration audio, final video) so a `userId/projectId/xyz` segment can
 * never contain "/", "..", or other characters that would create an
 * unintended nested path or collide across users/projects.
 */
export function sanitizeStoragePathSegment(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return cleaned.length > 0 ? cleaned : "_";
}
