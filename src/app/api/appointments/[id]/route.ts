import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    if (status) {
      db.prepare("UPDATE Appointment SET status = ?, cancelledAt = CASE WHEN ? = 'cancelled' THEN datetime('now') ELSE cancelledAt END WHERE id = ?")
        .run(status, status, id)
    }

    if (notes !== undefined) {
      db.prepare("UPDATE Appointment SET notes = ? WHERE id = ?").run(notes, id)
    }

    const appointment = db.prepare("SELECT * FROM Appointment WHERE id = ?").get(id)
    return NextResponse.json(appointment)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    db.prepare("DELETE FROM AppointmentService WHERE appointmentId = ?").run(id)
    db.prepare("DELETE FROM ActivityNote WHERE appointmentId = ?").run(id)
    db.prepare("DELETE FROM Appointment WHERE id = ?").run(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
