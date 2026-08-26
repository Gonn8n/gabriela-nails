import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search") || ""

    let query = supabase
      .from("Appointment")
      .select("*, client:Client(id, firstName, lastName, dni, phone), services:AppointmentService(id, service:Service(name, color, price, duration))")
      .order("date", { ascending: false })
      .order("startTime", { ascending: true })

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (search) {
      query = query.or(`identifier.ilike.%${search}%,client.firstName.ilike.%${search}%,client.lastName.ilike.%${search}%`)
    }

    const { data: appointments } = await query

    const result = (appointments || []).map((apt) => ({
      id: apt.id,
      identifier: apt.identifier,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      totalPrice: apt.totalPrice,
      notes: apt.notes,
      client: apt.client,
      services: apt.services,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clientId, date, startTime, serviceIds, notes } = body

    if (!clientId || !date || !startTime || !serviceIds?.length) {
      return NextResponse.json(
        { error: "Cliente, fecha, hora y servicios son requeridos" },
        { status: 400 }
      )
    }

    const { data: services } = await supabase
      .from("Service")
      .select("*")
      .in("id", serviceIds)

    if (!services || services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: "Algunos servicios no fueron encontrados" },
        { status: 400 }
      )
    }

    const totalDuration = services.reduce((sum, s) => sum + (s.duration as number), 0)
    const totalPrice = services.reduce((sum, s) => sum + (s.price as number), 0)

    const [startHours, startMinutes] = startTime.split(":").map(Number)
    const endMinutes = startHours * 60 + startMinutes + totalDuration
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`

    const { data: lastAppointment } = await supabase
      .from("Appointment")
      .select("identifier")
      .order("createdAt", { ascending: false })
      .limit(1)
      .single()

    const lastNumber = lastAppointment ? parseInt(lastAppointment.identifier.replace("GN-", "")) : 0
    const identifier = `GN-${lastNumber + 1}`

    const id = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from("Appointment")
      .insert({
        id,
        identifier,
        clientId,
        date,
        startTime,
        endTime,
        totalPrice,
        notes: notes || null,
        status: "booked",
        createdAt: new Date().toISOString(),
      })

    if (insertError) throw insertError

    const appointmentServices = services.map((service) => ({
      id: crypto.randomUUID(),
      appointmentId: id,
      serviceId: service.id,
      price: service.price,
      duration: service.duration,
    }))

    const { error: servicesError } = await supabase
      .from("AppointmentService")
      .insert(appointmentServices)

    if (servicesError) throw servicesError

    const { data: appointment } = await supabase
      .from("Appointment")
      .select("*")
      .eq("id", id)
      .single()

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
