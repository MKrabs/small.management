import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Event } from "@/api/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// warning comments (e.g. system notices about invalidated votes) get a yellow tint
export function isWarning(body: string): boolean {
  return body.includes("⚠️")
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

// Standard .ics file, generated client-side — no account or server needed.
export function downloadIcs(event: Event, title: string) {
  const d = event.date.replaceAll("-", "")
  const t = (time: string) => time.slice(0, 5).replace(":", "") + "00"
  const dtstart = event.time_start ? `DTSTART:${d}T${t(event.time_start)}` : `DTSTART;VALUE=DATE:${d}`
  const dtend = event.time_start && event.time_end ? `DTEND:${d}T${t(event.time_end)}` : ""
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//small.management//EN",
    "BEGIN:VEVENT",
    `UID:event-${event.id}@small.management`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    dtstart,
    ...(dtend ? [dtend] : []),
    `SUMMARY:${title}`,
    ...(event.note ? [`DESCRIPTION:${event.note.replace(/\n/g, "\\n")}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.ics`
  a.click()
  URL.revokeObjectURL(a.href)
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
