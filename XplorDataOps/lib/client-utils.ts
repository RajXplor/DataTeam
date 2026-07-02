/** Shared client-side helpers for both workspaces. No cross-workspace state lives here. */

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Vercel Functions cap request/response bodies at 4.5 MB. We warn client-side
 *  well before that so users get actionable feedback instead of a failed request. */
export const SOFT_UPLOAD_WARNING_BYTES = 3 * 1024 * 1024;
export const VERCEL_HARD_LIMIT_BYTES = 4.5 * 1024 * 1024;

/** Decode a base64 string returned from the API and trigger a browser download. */
export function downloadBase64File(base64: string, filename: string, mimeType: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const MIME_CSV = 'text/csv;charset=utf-8';
export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
