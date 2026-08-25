import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || ""
    const sessionMatch = cookieHeader.match(/session=([^;]+)/)

    if (!sessionMatch) {
      return NextResponse.json({ user: null })
    }

    const token = sessionMatch[1]
    const sessionData = db.prepare("SELECT value FROM Settings WHERE key = ?").get(`session:${token}`) as { value: string } | undefined

    if (!sessionData) {
      return NextResponse.json({ user: null })
    }

    const session = JSON.parse(sessionData.value)

    if (new Date(session.expiresAt) < new Date()) {
      db.prepare("DELETE FROM Settings WHERE key = ?").run(`session:${token}`)
      return NextResponse.json({ user: null })
    }

    const user = db.prepare("SELECT id, email, name FROM User WHERE id = ?").get(session.userId)

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Auth Error:", error)
    return NextResponse.json({ user: null })
  }
}
