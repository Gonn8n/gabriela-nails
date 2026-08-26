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
    const range = searchParams.get("range") || "today"

    const now = new Date()
    const todayStr = getLocalDateStr(now)
    let startDate: string
    let endDate: string

    if (range === "today") {
      startDate = todayStr
      endDate = todayStr
    } else {
      const days = parseInt(range) || 7
      startDate = todayStr
      const end = new Date(now)
      end.setDate(end.getDate() + days)
      endDate = getLocalDateStr(end)
    }

    const { data: appointments } = await supabase
      .from("Appointment")
      .select("*, client:Client(id, firstName, lastName), services:AppointmentService(id, service:Service(name, color))")
      .gte("date", startDate)
      .lte("date", endDate)
      .neq("status", "cancelled")
      .order("date", { ascending: false })
      .order("startTime", { ascending: true })

    const formatted = (appointments || []).map((apt) => ({
      id: apt.id,
      identifier: apt.identifier,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      totalPrice: apt.totalPrice,
      client: apt.client,
      services: apt.services,
    }))

    const { count: upcomingCount } = await supabase
      .from("Appointment")
      .select("*", { count: "exact", head: true })
      .gte("date", startDate)
      .lte("date", endDate)
      .in("status", ["booked", "confirmed"])

    const { count: completedCount } = await supabase
      .from("Appointment")
      .select("*", { count: "exact", head: true })
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("status", "completed")

    const { count: cancelledCount } = await supabase
      .from("Appointment")
      .select("*", { count: "exact", head: true })
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("status", "cancelled")

    const { count: rescheduledCount } = await supabase
      .from("Appointment")
      .select("*", { count: "exact", head: true })
      .gte("date", startDate)
      .lte("date", endDate)
      .not("rescheduledFrom", "is", null)

    const { count: totalClients } = await supabase
      .from("Client")
      .select("*", { count: "exact", head: true })

    const { data: revenueData } = await supabase
      .from("Appointment")
      .select("totalPrice")
      .gte("date", startDate)
      .lte("date", endDate)
      .in("status", ["completed", "booked", "confirmed"])

    const revenue = (revenueData || []).reduce((sum, r) => sum + (r.totalPrice || 0), 0)

    return NextResponse.json({
      todayAppointments: formatted,
      upcomingCount: upcomingCount || 0,
      completedCount: completedCount || 0,
      cancelledCount: cancelledCount || 0,
      rescheduledCount: rescheduledCount || 0,
      totalClients: totalClients || 0,
      revenue,
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
