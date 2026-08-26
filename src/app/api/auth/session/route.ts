import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || ""
    const sessionMatch = cookieHeader.match(/session=([^;]+)/)

    if (!sessionMatch) {
      return NextResponse.json({ user: null })
    }

    const token = sessionMatch[1]

    const { data: sessionData } = await supabase
      .from("Settings")
      .select("value")
      .eq("key", `session:${token}`)
      .single()

    if (!sessionData) {
      return NextResponse.json({ user: null })
    }

    const session = JSON.parse(sessionData.value)

    if (new Date(session.expiresAt) < new Date()) {
      await supabase.from("Settings").delete().eq("key", `session:${token}`)
      return NextResponse.json({ user: null })
    }

    const { data: user } = await supabase
      .from("User")
      .select("id, email, name")
      .eq("id", session.userId)
      .single()

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Auth Error:", error)
    return NextResponse.json({ user: null })
  }
}
