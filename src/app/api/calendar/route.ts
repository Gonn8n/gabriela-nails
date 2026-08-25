import { NextResponse } from "next/server"
import { db } from "@/lib/db"

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

    const endDate = new Date(end)
    endDate.setHours(23, 59, 59, 999)

    const appointments = db.prepare(`
      SELECT a.*, 
        c.firstName as clientFirstName, c.lastName as clientLastName, c.phone as clientPhone
      FROM Appointment a
      JOIN Client c ON a.clientId = c.id
      WHERE a.date >= ? AND a.date <= ? AND a.status != 'cancelled'
      ORDER BY a.startTime ASC
    `).all(start, endDate.toISOString()) as Record<string, unknown>[]

    const blockedSlots = db.prepare(
      "SELECT * FROM BlockedSlot WHERE date >= ? AND date <= ? ORDER BY startTime ASC"
    ).all(start, endDate.toISOString()) as Record<string, unknown>[]

    // Get services for each appointment
    const servicesStmt = db.prepare(`
      SELECT s.name, s.color, s.price, s.duration
      FROM AppointmentService aps
      JOIN Service s ON aps.serviceId = s.id
      WHERE aps.appointmentId = ?
    `)

    const result = {
      appointments: appointments.map((apt: Record<string, unknown>) => ({
        id: apt.id,
        identifier: apt.identifier,
        date: apt.date,
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        totalPrice: apt.totalPrice,
        client: {
          firstName: apt.clientFirstName,
          lastName: apt.clientLastName,
          phone: apt.clientPhone,
        },
        services: (servicesStmt.all(apt.id) as Record<string, unknown>[]).map((s) => ({
          service: {
            name: s.name,
            color: s.color,
          },
        })),
      })),
      blockedSlots,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
