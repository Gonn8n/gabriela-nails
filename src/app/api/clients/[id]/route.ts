import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { dni, firstName, lastName, email, phone, birthDate } = body

    db.prepare(
      "UPDATE Client SET dni = ?, firstName = ?, lastName = ?, email = ?, phone = ?, birthDate = ? WHERE id = ?"
    ).run(dni, firstName, lastName, email || null, phone || null, birthDate || null, id)

    const client = db.prepare("SELECT * FROM Client WHERE id = ?").get(id)
    return NextResponse.json(client)
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
    db.prepare("DELETE FROM Client WHERE id = ?").run(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
