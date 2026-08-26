import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

function getLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get("start")
    const end = searchParams.get("end")

    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end dates are required" },
        { status: 400 }
      )
    }

    const { data: appointments } = await supabase
      .from("Appointment")
      .select("*, client:Client(id, firstName, lastName, phone), services:AppointmentService(id, service:Service(name, color))")
      .gte("date", start)
      .lte("date", end)
      .neq("status", "cancelled")
      .order("startTime", { ascending: true })

    const { data: blockedSlots } = await supabase
      .from("BlockedSlot")
      .select("*")
      .gte("date", start)
      .lte("date", end)
      .order("startTime", { ascending: true })

    const result = {
      appointments: (appointments || []).map((apt) => ({
        id: apt.id,
        identifier: apt.identifier,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        totalPrice: apt.totalPrice,
        client: apt.client,
        services: apt.services,
      })),
      blockedSlots: blockedSlots || [],
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
