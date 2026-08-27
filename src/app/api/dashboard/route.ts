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

    // Query 1: Todas las appointments del rango (una sola query)
    const { data: appointments } = await supabase
      .from("Appointment")
      .select("*, client:Client(id, firstName, lastName), services:AppointmentService(id, service:Service(name, color))")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
      .order("startTime", { ascending: true })

    // Query 2: Total de clientes
    const { count: totalClients } = await supabase
      .from("Client")
      .select("*", { count: "exact", head: true })

    // Calcular todo en memoria a partir de la query 1
    let upcomingCount = 0
    let completedCount = 0
    let cancelledCount = 0
    let rescheduledCount = 0
    let revenue = 0
    const formatted: typeof appointments = []

    for (const apt of appointments || []) {
      if (apt.status === "cancelled") {
        cancelledCount++
      } else {
        if (apt.status === "booked" || apt.status === "confirmed") upcomingCount++
        if (apt.status === "completed") {
          completedCount++
          revenue += apt.totalPrice || 0
        }
        if (apt.status === "booked" || apt.status === "confirmed") revenue += apt.totalPrice || 0
        if (apt.rescheduledFrom) rescheduledCount++
        formatted.push({
          id: apt.id,
          identifier: apt.identifier,
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime,
          status: apt.status,
          totalPrice: apt.totalPrice,
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
      totalClients: totalClients || 0,
      revenue,
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
