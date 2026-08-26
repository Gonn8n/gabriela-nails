import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
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

    const { data: user } = await supabase
      .from("User")
      .select("*")
      .eq("email", email)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      )
    }

    const { data: passwordData } = await supabase
      .from("Settings")
      .select("value")
      .eq("key", `user:${user.id}:password`)
      .single()

    if (!passwordData || passwordData.value !== hashPassword(password)) {
      return NextResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401 }
      )
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await supabase
      .from("Settings")
      .insert({
        id: crypto.randomUUID(),
        key: `session:${token}`,
        value: JSON.stringify({ userId: user.id, expiresAt }),
      })

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
