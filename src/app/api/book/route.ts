import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET: Buscar cliente por DNI
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dni = searchParams.get("dni")

    if (!dni) {
      return NextResponse.json({ error: "DNI es requerido" }, { status: 400 })
    }

    const client = db.prepare("SELECT * FROM Client WHERE dni = ?").get(dni)
    return NextResponse.json({ client: client || null })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST: Crear turno público
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { dni, firstName, lastName, email, phone, birthDate, serviceIds, date, startTime } = body

    if (!dni || !firstName || !lastName || !serviceIds?.length || !date || !startTime) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Validate working day
    const workingDaysStr = db.prepare("SELECT value FROM Settings WHERE key = 'setting:workingDays'").get() as { value: string } | undefined
    const workingDays = (workingDaysStr?.value || "1,2,3,4,5,6").split(",").map(Number)
    const dateObj = new Date(date + "T12:00:00")
    if (!workingDays.includes(dateObj.getDay())) {
      return NextResponse.json({ error: "La fecha seleccionada no es un día laborable" }, { status: 400 })
    }

    // Buscar o crear cliente
    let client = db.prepare("SELECT * FROM Client WHERE dni = ?").get(dni) as Record<string, unknown> | undefined

    if (!client) {
      const clientId = crypto.randomUUID()
      db.prepare(
        "INSERT INTO Client (id, dni, firstName, lastName, email, phone, birthDate) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(clientId, dni, firstName, lastName, email || null, phone || null, birthDate || null)
      client = db.prepare("SELECT * FROM Client WHERE id = ?").get(clientId) as Record<string, unknown>
    }

    // Obtener servicios
    const placeholders = serviceIds.map(() => "?").join(",")
    const services = db.prepare(`SELECT * FROM Service WHERE id IN (${placeholders})`).all(...serviceIds) as Record<string, unknown>[]

    if (services.length !== serviceIds.length) {
      return NextResponse.json({ error: "Algunos servicios no fueron encontrados" }, { status: 400 })
    }

    const totalDuration = services.reduce((sum, s) => sum + (s.duration as number), 0)
    const totalPrice = services.reduce((sum, s) => sum + (s.price as number), 0)

    // Calcular hora de fin
    const [startHours, startMinutes] = startTime.split(":").map(Number)
    const endMinutes = startHours * 60 + startMinutes + totalDuration
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`

    // Validate not blocked
    const blocked = db.prepare("SELECT id FROM BlockedSlot WHERE date = ? AND startTime < ? AND endTime > ?").get(date, endTime, startTime)
    if (blocked) {
      return NextResponse.json({ error: "El horario seleccionado está bloqueado" }, { status: 409 })
    }

    // Generar identifier
    const lastAppointment = db.prepare("SELECT identifier FROM Appointment ORDER BY createdAt DESC LIMIT 1").get() as { identifier: string } | undefined
    const lastNumber = lastAppointment ? parseInt(lastAppointment.identifier.replace("GN-", "")) : 0
    const identifier = `GN-${lastNumber + 1}`

    // Verificar conflicto de horario
    const conflicting = db.prepare(
      "SELECT id FROM Appointment WHERE date = ? AND status != 'cancelled' AND startTime < ? AND endTime > ?"
    ).get(date, endTime, startTime)

    if (conflicting) {
      return NextResponse.json({ error: "El horario seleccionado no está disponible" }, { status: 409 })
    }

    const id = crypto.randomUUID()

    // Usar transaction
    const insertAppointment = db.prepare(
      "INSERT INTO Appointment (id, identifier, clientId, date, startTime, endTime, totalPrice, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'booked', datetime('now'))"
    )
    const insertService = db.prepare(
      "INSERT INTO AppointmentService (id, appointmentId, serviceId, price, duration) VALUES (?, ?, ?, ?, ?)"
    )

    const transaction = db.transaction(() => {
      insertAppointment.run(id, identifier, client!.id, date, startTime, endTime, totalPrice)
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
