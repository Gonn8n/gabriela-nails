import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, duration, price, color, category } = body

    db.prepare(
      "UPDATE Service SET name = ?, description = ?, duration = ?, price = ?, color = ?, category = ? WHERE id = ?"
    ).run(name, description || null, parseInt(duration), parseFloat(price), color, category || null, id)

    const service = db.prepare("SELECT * FROM Service WHERE id = ?").get(id)
    return NextResponse.json(service)
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
    db.prepare("DELETE FROM Service WHERE id = ?").run(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
