import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || ""
    const sessionMatch = cookieHeader.match(/session=([^;]+)/)

    if (sessionMatch) {
      const token = sessionMatch[1]
      db.prepare("DELETE FROM Settings WHERE key = ?").run(`session:${token}`)
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
