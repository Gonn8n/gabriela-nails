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
      query = query.or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,dni.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
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
    const { dni, firstName, lastName, email, phone, birthDate } = body

    if (!dni || !firstName || !lastName) {
      return NextResponse.json(
        { error: "DNI, nombre y apellido son requeridos" },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from("Client")
      .select("id")
      .eq("dni", dni)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un cliente con este DNI" },
        { status: 409 }
      )
    }

    const id = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from("Client")
      .insert({
        id,
        dni,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
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
