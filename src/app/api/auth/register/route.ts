import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import crypto from "crypto"

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from("User")
      .select("id")
      .eq("email", email)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      )
    }

    const userId = crypto.randomUUID()
    const passwordId = crypto.randomUUID()

    const { error: userError } = await supabase
      .from("User")
      .insert({
        id: userId,
        email,
        name: name || email.split("@")[0],
        role: "admin",
        createdAt: new Date().toISOString(),
      })

    if (userError) throw userError

    const { error: passError } = await supabase
      .from("Settings")
      .insert({
        id: passwordId,
        key: `user:${userId}:password`,
        value: hashPassword(password),
      })

    if (passError) throw passError

    return NextResponse.json({ success: true, userId })
  } catch (error) {
    console.error("Register Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
