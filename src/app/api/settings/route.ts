import { NextResponse } from "next/server"
import { db } from "@/lib/db"

const DEFAULTS: Record<string, string> = {
  workingHoursStart: "09:00",
  workingHoursEnd: "19:00",
  slotDuration: "30",
  bookingWindowDays: "30",
  cancellationHours: "2",
  breakStart: "12:00",
  breakEnd: "13:00",
  workingDays: "1,2,3,4,5,6",
}

export async function GET() {
  try {
    const rows = db.prepare("SELECT key, value FROM Settings WHERE key LIKE 'setting:%'").all() as { key: string; value: string }[]
    const settings: Record<string, unknown> = {}
    for (const row of rows) {
      const k = row.key.replace("setting:", "")
      if (k === "workingDays") {
        settings[k] = row.value.split(",").map(Number)
      } else {
        settings[k] = row.value
      }
    }
    return NextResponse.json(settings)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const upsert = db.prepare("INSERT INTO Settings (id, key, value) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")

    for (const [key, value] of Object.entries(body)) {
      const val = Array.isArray(value) ? value.join(",") : String(value)
      upsert.run(crypto.randomUUID(), `setting:${key}`, val)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
