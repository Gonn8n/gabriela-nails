import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    let clients
    if (search) {
      clients = db.prepare(
        `SELECT * FROM Client 
         WHERE firstName LIKE ? OR lastName LIKE ? OR dni LIKE ? OR email LIKE ? OR phone LIKE ?
         ORDER BY firstName ASC`
      ).all(...Array(5).fill(`%${search}%`)) as Record<string, unknown>[]
    } else {
      clients = db.prepare("SELECT * FROM Client ORDER BY firstName ASC").all() as Record<string, unknown>[]
    }

    return NextResponse.json(clients)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { dni, firstName, lastName, email, phone, birthDate } = body

    if (!dni || !firstName || !lastName) {
      return NextResponse.json(
        { error: "DNI, nombre y apellido son requeridos" },
        { status: 400 }
      )
    }

    // Check if DNI already exists
    const existing = db.prepare("SELECT id FROM Client WHERE dni = ?").get(dni)
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un cliente con este DNI" },
        { status: 409 }
      )
    }

    const id = crypto.randomUUID()
    db.prepare(
      "INSERT INTO Client (id, dni, firstName, lastName, email, phone, birthDate) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, dni, firstName, lastName, email || null, phone || null, birthDate || null)

    const client = db.prepare("SELECT * FROM Client WHERE id = ?").get(id) as Record<string, unknown>
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
