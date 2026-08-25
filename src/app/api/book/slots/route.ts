import { NextResponse } from "next/server"
import { db } from "@/lib/db"

function getSetting(key: string, fallback: string): string {
  const row = db.prepare("SELECT value FROM Settings WHERE key = ?").get(`setting:${key}`) as { value: string } | undefined
  return row?.value ?? fallback
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const serviceIds = searchParams.get("serviceIds")?.split(",").filter(Boolean) || []

    if (!date) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 })
    }

    // Check if date is a working day
    const workingDaysStr = getSetting("workingDays", "1,2,3,4,5,6")
    const workingDays = workingDaysStr.split(",").map(Number)
    const dateObj = new Date(date + "T12:00:00")
    const dayOfWeek = dateObj.getDay()

    if (!workingDays.includes(dayOfWeek)) {
      return NextResponse.json({ slots: [], reason: "Día no laborable" })
    }

    // Get settings
    const workStart = getSetting("workingHoursStart", "09:00")
    const workEnd = getSetting("workingHoursEnd", "19:00")
    const breakStart = getSetting("breakStart", "12:00")
    const breakEnd = getSetting("breakEnd", "13:00")
    const slotDuration = parseInt(getSetting("slotDuration", "30"))

    // Get total duration for selected services
    let totalDuration = slotDuration
    if (serviceIds.length > 0) {
      const placeholders = serviceIds.map(() => "?").join(",")
      const services = db.prepare(`SELECT duration FROM Service WHERE id IN (${placeholders})`).all(...serviceIds) as { duration: number }[]
      if (services.length > 0) {
        totalDuration = services.reduce((sum, s) => sum + s.duration, 0)
      }
    }

    // Get blocked slots for this date
    const blocked = db.prepare(
      "SELECT startTime, endTime FROM BlockedSlot WHERE date = ?"
    ).all(date) as { startTime: string; endTime: string }[]

    // Get existing appointments for this date
    const appointments = db.prepare(
      "SELECT startTime, endTime FROM Appointment WHERE date = ? AND status != 'cancelled'"
    ).all(date) as { startTime: string; endTime: string }[]

    // Generate all possible slots
    const [startH, startM] = workStart.split(":").map(Number)
    const [endH, endM] = workEnd.split(":").map(Number)
    const [breakStartH, breakStartM] = breakStart.split(":").map(Number)
    const [breakEndH, breakEndM] = breakEnd.split(":").map(Number)

    const dayStartMin = startH * 60 + startM
    const dayEndMin = endH * 60 + endM
    const breakStartMin = breakStartH * 60 + breakStartM
    const breakEndMin = breakEndH * 60 + breakEndM

    const slots: string[] = []
    const now = new Date()
    const isToday = date === now.toISOString().split("T")[0]

    for (let min = dayStartMin; min + totalDuration <= dayEndMin; min += slotDuration) {
      const slotEnd = min + totalDuration
      const slotTime = `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`
      const slotEndTime = `${Math.floor(slotEnd / 60).toString().padStart(2, "0")}:${(slotEnd % 60).toString().padStart(2, "0")}`

      // Skip if slot overlaps with break
      if (min < breakEndMin && slotEnd > breakStartMin) {
        continue
      }

      // Skip if slot overlaps with blocked time
      const overlapsBlocked = blocked.some(
        (b) => min < timeToMinutes(b.endTime) && slotEnd > timeToMinutes(b.startTime)
      )
      if (overlapsBlocked) continue

      // Skip if slot overlaps with existing appointment
      const overlapsAppointment = appointments.some(
        (a) => min < timeToMinutes(a.endTime) && slotEnd > timeToMinutes(a.startTime)
      )
      if (overlapsAppointment) continue

      // Skip if slot is in the past (for today)
      if (isToday) {
        const currentMin = now.getHours() * 60 + now.getMinutes()
        if (min <= currentMin) continue
      }

      slots.push(slotTime)
    }

    return NextResponse.json({ slots, duration: totalDuration })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}
