import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search") || ""

    let query = `
      SELECT a.*, 
        c.firstName as clientFirstName, c.lastName as clientLastName, c.dni as clientDni, c.phone as clientPhone
      FROM Appointment a
      JOIN Client c ON a.clientId = c.id
      WHERE 1=1
    `
    const params: string[] = []

    if (status && status !== "all") {
      query += " AND a.status = ?"
      params.push(status)
    }

    if (search) {
      query += " AND (a.identifier LIKE ? OR c.firstName LIKE ? OR c.lastName LIKE ?)"
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    query += " ORDER BY a.date DESC, a.startTime ASC"

    const appointments = db.prepare(query).all(...params) as Record<string, unknown>[]

    // Get services for each appointment
    const servicesStmt = db.prepare(`
      SELECT s.name, s.color, s.price, s.duration
      FROM AppointmentService aps
      JOIN Service s ON aps.serviceId = s.id
      WHERE aps.appointmentId = ?
    `)

    const result = appointments.map((apt: Record<string, unknown>) => ({
      id: apt.id,
      identifier: apt.identifier,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      totalPrice: apt.totalPrice,
      notes: apt.notes,
      client: {
        id: apt.clientId,
        firstName: apt.clientFirstName,
        lastName: apt.clientLastName,
        dni: apt.clientDni,
        phone: apt.clientPhone,
      },
      services: (servicesStmt.all(apt.id) as Record<string, unknown>[]).map((s) => ({
        service: {
          name: s.name,
          color: s.color,
          price: s.price,
          duration: s.duration,
        },
      })),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clientId, date, startTime, serviceIds, notes } = body

    if (!clientId || !date || !startTime || !serviceIds?.length) {
      return NextResponse.json(
        { error: "Cliente, fecha, hora y servicios son requeridos" },
        { status: 400 }
      )
    }

    // Get services
    const placeholders = serviceIds.map(() => "?").join(",")
    const services = db.prepare(
      `SELECT * FROM Service WHERE id IN (${placeholders})`
    ).all(...serviceIds) as Record<string, unknown>[]

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: "Algunos servicios no fueron encontrados" },
        { status: 400 }
      )
    }

    const totalDuration = services.reduce((sum, s) => sum + (s.duration as number), 0)
    const totalPrice = services.reduce((sum, s) => sum + (s.price as number), 0)

    // Calculate end time
    const [startHours, startMinutes] = startTime.split(":").map(Number)
    const endMinutes = startHours * 60 + startMinutes + totalDuration
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`

    // Generate identifier
    const lastAppointment = db.prepare("SELECT identifier FROM Appointment ORDER BY createdAt DESC LIMIT 1").get() as { identifier: string } | undefined
    const lastNumber = lastAppointment ? parseInt(lastAppointment.identifier.replace("GN-", "")) : 0
    const identifier = `GN-${lastNumber + 1}`

    const id = crypto.randomUUID()

    // Use transaction
    const insertAppointment = db.prepare(
      "INSERT INTO Appointment (id, identifier, clientId, date, startTime, endTime, totalPrice, notes, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'booked', datetime('now'))"
    )
    const insertService = db.prepare(
      "INSERT INTO AppointmentService (id, appointmentId, serviceId, price, duration) VALUES (?, ?, ?, ?, ?)"
    )

    const transaction = db.transaction(() => {
      insertAppointment.run(id, identifier, clientId, date, startTime, endTime, totalPrice, notes || null)
      for (const service of services) {
        insertService.run(crypto.randomUUID(), id, service.id, service.price, service.duration)
      }
    })

    transaction()

    const appointment = db.prepare("SELECT * FROM Appointment WHERE id = ?").get(id)
    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
