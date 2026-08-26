import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const { data: services } = await supabase
      .from("Service")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true })

    return NextResponse.json(services)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, duration, price, color } = body

    if (!name || !duration || !price) {
      return NextResponse.json(
        { error: "Nombre, duración y precio son requeridos" },
        { status: 400 }
      )
    }

    const id = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from("Service")
      .insert({
        id,
        name,
        description: description || null,
        duration: parseInt(duration),
        price: parseFloat(price),
        color: color || "#6b7280",
        active: true,
      })

    if (insertError) throw insertError

    const { data: service } = await supabase
      .from("Service")
      .select("*")
      .eq("id", id)
      .single()

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
