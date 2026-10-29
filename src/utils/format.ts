export function formatClock(date: Date | null): string {
  if (!date) return '--:--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatUptime(seconds: number | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatHeap(bytes: number | undefined): string {
  if (!bytes) return '—';
  return `${Math.round(bytes / 1024)} KB`;
}
