import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// GET: Buscar cliente por teléfono + turnos próximos
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")

    if (!phone) {
      return NextResponse.json({ error: "Teléfono es requerido" }, { status: 400 })
    }

    const { data: client } = await supabase
      .from("Client")
      .select("*")
      .eq("phone", phone)
      .single()

    if (!client) {
      return NextResponse.json({ client: null, appointments: [] })
    }

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

    const { data: appointments } = await supabase
      .from("Appointment")
      .select("*, services:AppointmentService(id, service:Service(name, color, price, duration))")
      .eq("clientId", client.id)
      .in("status", ["booked", "confirmed"])
      .or(`date.gt.${todayStr},and(date.eq.${todayStr},startTime.gte.${currentTime})`)
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })

    const result = (appointments || []).map((apt) => ({
      id: apt.id,
      identifier: apt.identifier,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      totalPrice: apt.totalPrice,
      services: (apt.services || []).map((s: { service: { name: string; color: string; price: number; duration: number } }) => ({
        name: s.service.name,
        color: s.service.color,
        price: s.service.price,
        duration: s.service.duration,
      })),
    }))

    return NextResponse.json({ client, appointments: result })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST: Crear turno público
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone, firstName, lastName, email, birthDate, serviceIds, date, startTime, paymentMethod } = body

    if (!phone || !firstName || !lastName || !serviceIds?.length || !date || !startTime) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    const { data: settingsRow } = await supabase
      .from("Settings")
      .select("value")
      .eq("key", "setting:workingDays")
      .single()

    const workingDays = (settingsRow?.value || "1,2,3,4,5,6").split(",").map(Number)
    const dateObj = new Date(date + "T12:00:00")
    if (!workingDays.includes(dateObj.getDay())) {
      return NextResponse.json({ error: "La fecha seleccionada no es un día laborable" }, { status: 400 })
    }

    let { data: client } = await supabase
      .from("Client")
      .select("*")
      .eq("phone", phone)
      .single()

    if (!client) {
      const clientId = crypto.randomUUID()
      const { error: insertError } = await supabase
        .from("Client")
        .insert({
          id: clientId,
          firstName,
          lastName,
          email: email || null,
          phone,
          birthDate: birthDate || null,
        })
      if (insertError) throw insertError

      const { data: newClient } = await supabase
        .from("Client")
        .select("*")
        .eq("id", clientId)
        .single()
      client = newClient
    } else if (birthDate && !client.birthDate) {
      await supabase
        .from("Client")
        .update({ birthDate })
        .eq("id", client.id)
    }

    const { data: services } = await supabase
      .from("Service")
      .select("*")
      .in("id", serviceIds)

    if (!services || services.length !== serviceIds.length) {
      return NextResponse.json({ error: "Algunos servicios no fueron encontrados" }, { status: 400 })
    }

    const totalDuration = services.reduce((sum, s) => sum + (s.duration as number), 0)
    const totalPrice = services.reduce((sum, s) => sum + (s.price as number), 0)

    const [startHours, startMinutes] = startTime.split(":").map(Number)
    const endMinutes = startHours * 60 + startMinutes + totalDuration
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`

    const { data: blocked } = await supabase
      .from("BlockedSlot")
      .select("id")
      .eq("date", date)
      .lt("startTime", endTime)
      .gt("endTime", startTime)
      .limit(1)

    if (blocked && blocked.length > 0) {
      return NextResponse.json({ error: "El horario seleccionado está bloqueado" }, { status: 409 })
    }

    const { data: lastAppointment } = await supabase
      .from("Appointment")
      .select("identifier")
      .order("createdAt", { ascending: false })
      .limit(1)
      .single()

    const lastNumber = lastAppointment ? parseInt(lastAppointment.identifier.replace("GN-", "")) : 0
    const identifier = `GN-${lastNumber + 1}`

    const { data: conflicting } = await supabase
      .from("Appointment")
      .select("id")
      .eq("date", date)
      .neq("status", "cancelled")
      .lt("startTime", endTime)
      .gt("endTime", startTime)
      .limit(1)

    if (conflicting && conflicting.length > 0) {
      return NextResponse.json({ error: "El horario seleccionado no está disponible" }, { status: 409 })
    }

    const id = crypto.randomUUID()

    const { error: insertAptError } = await supabase
      .from("Appointment")
      .insert({
        id,
        identifier,
        clientId: client!.id,
        date,
        startTime,
        endTime,
        totalPrice,
        status: "booked",
        paymentMethod: paymentMethod || null,
        createdAt: new Date().toISOString(),
      })
    if (insertAptError) throw insertAptError

    const appointmentServices = services.map((service) => ({
      id: crypto.randomUUID(),
      appointmentId: id,
      serviceId: service.id,
      price: service.price,
      duration: service.duration,
    }))

    const { error: insertSvcError } = await supabase
      .from("AppointmentService")
      .insert(appointmentServices)
    if (insertSvcError) throw insertSvcError

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
