import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const { data: slots } = await supabase
      .from("BlockedSlot")
      .select("*")
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })

    return NextResponse.json(slots)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { date, startTime, endTime, reason } = body

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Fecha, hora inicio y hora fin son requeridos" },
        { status: 400 }
      )
    }

    const id = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from("BlockedSlot")
      .insert({
        id,
        date,
        startTime,
        endTime,
        reason: reason || null,
      })

    if (insertError) throw insertError

    return NextResponse.json({ id, date, startTime, endTime, reason }, { status: 201 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    await supabase.from("BlockedSlot").delete().eq("id", id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
