export function formatScoreDate(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'long',
    timeStyle: 'short',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(iso));
}
