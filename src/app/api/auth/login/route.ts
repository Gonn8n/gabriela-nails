import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import crypto from "crypto"

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      )
    }

    const user = db.prepare("SELECT * FROM User WHERE email = ?").get(email) as Record<string, unknown> | undefined

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      )
    }

    // Get password hash from Settings
    const passwordData = db.prepare("SELECT value FROM Settings WHERE key = ?").get(`user:${user.id}:password`) as { value: string } | undefined

    if (!passwordData || passwordData.value !== hashPassword(password)) {
      return NextResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401 }
      )
    }

    // Create session token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    db.prepare("INSERT INTO Settings (id, key, value) VALUES (?, ?, ?)")
      .run(crypto.randomUUID(), `session:${token}`, JSON.stringify({ userId: user.id, expiresAt }))

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error("Auth Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
