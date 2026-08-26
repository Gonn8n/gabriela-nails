import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || ""
    const sessionMatch = cookieHeader.match(/session=([^;]+)/)

    if (sessionMatch) {
      const token = sessionMatch[1]
      await supabase.from("Settings").delete().eq("key", `session:${token}`)
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error("Auth Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
