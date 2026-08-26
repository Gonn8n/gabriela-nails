import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const DEFAULTS: Record<string, string> = {
  workingHoursStart: "09:00",
  workingHoursEnd: "19:00",
  slotDuration: "30",
  bookingWindowDays: "30",
  cancellationHours: "3",
  breakStart: "12:00",
  breakEnd: "13:00",
  workingDays: "1,2,3,4,5,6",
}

export async function GET() {
  try {
    const { data: rows } = await supabase
      .from("Settings")
      .select("key, value")
      .like("key", "setting:%")

    const settings: Record<string, unknown> = {}
    for (const row of rows || []) {
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

    for (const [key, value] of Object.entries(body)) {
      const val = Array.isArray(value) ? value.join(",") : String(value)
      const fullKey = `setting:${key}`

      const { data: existing } = await supabase
        .from("Settings")
        .select("id")
        .eq("key", fullKey)
        .single()

      if (existing) {
        await supabase
          .from("Settings")
          .update({ value: val })
          .eq("key", fullKey)
      } else {
        await supabase
          .from("Settings")
          .insert({ id: crypto.randomUUID(), key: fullKey, value: val })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
