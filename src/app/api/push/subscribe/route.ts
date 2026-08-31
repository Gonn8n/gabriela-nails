import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { endpoint, p256dh, auth } = body

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "endpoint, p256dh y auth son requeridos" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("PushSubscription")
      .upsert(
        { endpoint, p256dh, auth },
        { onConflict: "endpoint" }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Push subscribe error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
