import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// "2026-07-04" → "Fri, Jul 4" (local-date safe: avoid UTC shift from Date("YYYY-MM-DD"))
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function formatDay(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(dateStr).toLocaleDateString(undefined, opts ?? { weekday: "short", month: "short", day: "numeric" })
}

// "20:30:00" → "20:30"
export function formatTime(t: string): string {
  return t.slice(0, 5)
}

// "passed" = one day after the event date (per docs)
export function isEventPast(eventDate: string): boolean {
  const dayAfter = parseLocalDate(eventDate)
  dayAfter.setDate(dayAfter.getDate() + 1)
  return dayAfter < new Date()
}

// Day-granular relative label: "today", "yesterday", "3 days ago", "2 weeks ago"…
export function relativeDay(iso: string): string {
  const then = new Date(iso)
  then.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((today.getTime() - then.getTime()) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) {
    const weeks = Math.round(days / 7)
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`
  }
  const months = Math.round(days / 30)
  return `${months} month${months === 1 ? "" : "s"} ago`
}

export function timeAgo(iso: string): string {
  const secs = (Date.now() - new Date(iso).getTime()) / 1000
  if (secs < 60) return "just now"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}
