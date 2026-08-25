import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const slots = db.prepare(
      "SELECT * FROM BlockedSlot ORDER BY date ASC, startTime ASC"
    ).all() as { id: string; date: string; startTime: string; endTime: string; reason: string | null }[]
    return NextResponse.json(slots)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { date, startTime, endTime, reason } = body

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Fecha, hora inicio y hora fin son requeridos" },
        { status: 400 }
      )
    }

    const id = crypto.randomUUID()
    db.prepare(
      "INSERT INTO BlockedSlot (id, date, startTime, endTime, reason) VALUES (?, ?, ?, ?, ?)"
    ).run(id, date, startTime, endTime, reason || null)

    return NextResponse.json({ id, date, startTime, endTime, reason }, { status: 201 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    db.prepare("DELETE FROM BlockedSlot WHERE id = ?").run(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
