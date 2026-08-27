import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { firstName, lastName, email, phone, birthDate } = body

    await supabase
      .from("Client")
      .update({
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        birthDate: birthDate || null,
      })
      .eq("id", id)

    const { data: client } = await supabase
      .from("Client")
      .select("*")
      .eq("id", id)
      .single()

    return NextResponse.json(client)
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
    await supabase.from("Client").delete().eq("id", id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
