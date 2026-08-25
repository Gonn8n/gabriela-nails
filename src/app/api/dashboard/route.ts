import { NextResponse } from "next/server"
import { db } from "@/lib/db"

interface Row {
  id: string
  identifier: string
  date: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  clientFirstName: string
  clientLastName: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "today"

    const now = new Date()
    let startDate: string
    const endDate = now.toISOString().split("T")[0]

    if (range === "today") {
      startDate = endDate
    } else {
      const days = parseInt(range) || 7
      const start = new Date(now)
      start.setDate(start.getDate() - days)
      startDate = start.toISOString().split("T")[0]
    }

    // Get appointments in range (excluding cancelled)
    const appointments = db.prepare(`
      SELECT a.*, c.firstName as clientFirstName, c.lastName as clientLastName
      FROM Appointment a
      JOIN Client c ON a.clientId = c.id
      WHERE a.date >= ? AND a.date <= ? AND a.status != 'cancelled'
      ORDER BY a.date DESC, a.startTime ASC
    `).all(startDate, endDate) as Row[]

    // Get services for each appointment
    const servicesStmt = db.prepare(`
      SELECT s.name, s.color FROM AppointmentService aps
      JOIN Service s ON aps.serviceId = s.id WHERE aps.appointmentId = ?
    `)

    const formatted = appointments.map((apt) => ({
      id: apt.id,
      identifier: apt.identifier,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      totalPrice: apt.totalPrice,
      client: { firstName: apt.clientFirstName, lastName: apt.clientLastName },
      services: (servicesStmt.all(apt.id) as { name: string; color: string }[]).map((s) => ({
        service: { name: s.name, color: s.color },
      })),
    }))

    // Stats
    const upcoming = db.prepare(
      "SELECT COUNT(*) as count FROM Appointment WHERE date >= ? AND date <= ? AND status IN ('booked', 'confirmed')"
    ).get(startDate, endDate) as { count: number }

    const completed = db.prepare(
      "SELECT COUNT(*) as count FROM Appointment WHERE date >= ? AND date <= ? AND status = 'completed'"
    ).get(startDate, endDate) as { count: number }

    const cancelled = db.prepare(
      "SELECT COUNT(*) as count FROM Appointment WHERE date >= ? AND date <= ? AND status = 'cancelled'"
    ).get(startDate, endDate) as { count: number }

    const totalClients = db.prepare("SELECT COUNT(*) as count FROM Client").get() as { count: number }

    const revenue = db.prepare(
      "SELECT COALESCE(SUM(totalPrice), 0) as total FROM Appointment WHERE date >= ? AND date <= ? AND status = 'completed'"
    ).get(startDate, endDate) as { total: number }

    return NextResponse.json({
      todayAppointments: formatted,
      upcomingCount: upcoming.count,
      completedCount: completed.count,
      cancelledCount: cancelled.count,
      totalClients: totalClients.count,
      revenue: revenue.total,
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
