import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, duration, price, color } = body

    await supabase
      .from("Service")
      .update({
        name,
        description: description || null,
        duration: parseInt(duration),
        price: parseFloat(price),
        color,
      })
      .eq("id", id)

    const { data: service } = await supabase
      .from("Service")
      .select("*")
      .eq("id", id)
      .single()

    return NextResponse.json(service)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await supabase.from("Service").delete().eq("id", id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
