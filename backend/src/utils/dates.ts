import { env } from '../config/env';

export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) {
    return null;
  }

  const date = new Date(`${birthDate}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - date.getUTCMonth();
  const isBeforeBirthday =
    monthDiff < 0 ||
    (monthDiff === 0 && today.getUTCDate() < date.getUTCDate());

  if (isBeforeBirthday) {
    age -= 1;
  }

  return age;
}

export function getIsoDate(date = new Date()): string {
  return date.toISOString().split('T')[0] ?? '';
}

export function getWeekStart(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getUTCDay();
  const diff = copy.getUTCDate() - day + (day === 0 ? -6 : 1);

  copy.setUTCDate(diff);
  copy.setUTCHours(0, 0, 0, 0);

  return copy;
}

export function getDayIndexFromDate(
  date = new Date(),
  timeZone = env.APP_TIME_ZONE,
): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date);
  const dayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  const day = dayMap[weekday] ?? 1;
  return day === 0 ? 7 : day;
}
