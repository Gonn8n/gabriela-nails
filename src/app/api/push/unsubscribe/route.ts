import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint es requerido" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("PushSubscription")
      .delete()
      .eq("endpoint", endpoint)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Push unsubscribe error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
