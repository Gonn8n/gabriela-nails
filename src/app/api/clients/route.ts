import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    let query = supabase
      .from("Client")
      .select("*")
      .order("firstName", { ascending: true })

    if (search) {
      query = query.or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data: clients } = await query

    return NextResponse.json(clients)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, birthDate } = body

    if (!phone || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Teléfono, nombre y apellido son requeridos" },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from("Client")
      .select("id")
      .eq("phone", phone)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un cliente con este teléfono" },
        { status: 409 }
      )
    }

    const id = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from("Client")
      .insert({
        id,
        firstName,
        lastName,
        email: email || null,
        phone,
        birthDate: birthDate || null,
      })

    if (insertError) throw insertError

    const { data: client } = await supabase
      .from("Client")
      .select("*")
      .eq("id", id)
      .single()

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
