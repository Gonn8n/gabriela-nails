import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

async function getSetting(key: string, fallback: string): Promise<string> {
  const { data } = await supabase
    .from("Settings")
    .select("value")
    .eq("key", `setting:${key}`)
    .single()
  return data?.value ?? fallback
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const serviceIds = searchParams.get("serviceIds")?.split(",").filter(Boolean) || []

    if (!date) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 })
    }

    const workingDaysStr = await getSetting("workingDays", "1,2,3,4,5,6")
    const workingDays = workingDaysStr.split(",").map(Number)
    const dateObj = new Date(date + "T12:00:00")
    const dayOfWeek = dateObj.getDay()

    if (!workingDays.includes(dayOfWeek)) {
      return NextResponse.json({ slots: [], reason: "Día no laborable" })
    }

    const workStart = await getSetting("workingHoursStart", "09:00")
    const workEnd = await getSetting("workingHoursEnd", "19:00")
    const breakStart = await getSetting("breakStart", "12:00")
    const breakEnd = await getSetting("breakEnd", "13:00")
    const slotDuration = parseInt(await getSetting("slotDuration", "30"))

    let totalDuration = slotDuration
    if (serviceIds.length > 0) {
      const { data: services } = await supabase
        .from("Service")
        .select("duration")
        .in("id", serviceIds)

      if (services && services.length > 0) {
        totalDuration = services.reduce((sum, s) => sum + s.duration, 0)
      }
    }

    const { data: blocked } = await supabase
      .from("BlockedSlot")
      .select("startTime, endTime")
      .eq("date", date)

    const { data: appointments } = await supabase
      .from("Appointment")
      .select("startTime, endTime")
      .eq("date", date)
      .neq("status", "cancelled")

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
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`
    const isToday = date === todayLocal

    for (let min = dayStartMin; min + totalDuration <= dayEndMin; min += slotDuration) {
      const slotEnd = min + totalDuration
      const slotTime = `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`
      const slotEndTime = `${Math.floor(slotEnd / 60).toString().padStart(2, "0")}:${(slotEnd % 60).toString().padStart(2, "0")}`

      if (min < breakEndMin && slotEnd > breakStartMin) {
        continue
      }

      const overlapsBlocked = (blocked || []).some(
        (b) => min < timeToMinutes(b.endTime) && slotEnd > timeToMinutes(b.startTime)
      )
      if (overlapsBlocked) continue

      const overlapsAppointment = (appointments || []).some(
        (a) => min < timeToMinutes(a.endTime) && slotEnd > timeToMinutes(a.startTime)
      )
      if (overlapsAppointment) continue

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
