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
      const start = new Date(now)
      start.setDate(start.getDate() - days)
      startDate = getLocalDateStr(start)
      const end = new Date(now)
      end.setDate(end.getDate() + days)
      endDate = getLocalDateStr(end)
    }

    const { data: appointments } = await supabase
      .from("Appointment")
      .select("*, client:Client(id, firstName, lastName, phone, email), services:AppointmentService(serviceId, service:Service(id, name, color, price, duration))")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
      .order("startTime", { ascending: true })

    const { count: totalClients } = await supabase
      .from("Client")
      .select("*", { count: "exact", head: true })

    let upcomingCount = 0
    let completedCount = 0
    let cancelledCount = 0
    let rescheduledCount = 0
    let paidCount = 0
    let unpaidCompletedCount = 0
    let revenue = 0
    const formatted: typeof appointments = []

    for (const apt of appointments || []) {
      if (apt.status === "cancelled") {
        cancelledCount++
      } else {
        if (apt.status === "booked" || apt.status === "confirmed") upcomingCount++
        if (apt.status === "completed") {
          completedCount++
          if (apt.paid) {
            paidCount++
            revenue += apt.totalPrice || 0
          } else {
            unpaidCompletedCount++
          }
        }
        if (apt.rescheduledFrom) rescheduledCount++
        formatted.push({
          id: apt.id,
          identifier: apt.identifier,
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime,
          status: apt.status,
          totalPrice: apt.totalPrice,
          paid: apt.paid ?? false,
          client: apt.client,
          services: apt.services,
        })
      }
    }

    return NextResponse.json({
      todayAppointments: formatted,
      upcomingCount,
      completedCount,
      cancelledCount,
      rescheduledCount,
      paidCount,
      unpaidCompletedCount,
      totalClients: totalClients || 0,
      revenue,
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
