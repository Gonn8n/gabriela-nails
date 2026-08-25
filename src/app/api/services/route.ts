import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const services = db.prepare("SELECT * FROM Service WHERE active = 1 ORDER BY name ASC").all() as Record<string, unknown>[]
    return NextResponse.json(services)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, duration, price, color, category } = body

    if (!name || !duration || !price) {
      return NextResponse.json(
        { error: "Nombre, duración y precio son requeridos" },
        { status: 400 }
      )
    }

    const id = crypto.randomUUID()
    db.prepare(
      "INSERT INTO Service (id, name, description, duration, price, color, category, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
    ).run(id, name, description || null, parseInt(duration), parseFloat(price), color || "#6b7280", category || null)

    const service = db.prepare("SELECT * FROM Service WHERE id = ?").get(id) as Record<string, unknown>
    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
