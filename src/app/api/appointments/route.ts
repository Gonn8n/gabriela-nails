import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendAppointmentConfirmation } from "@/lib/email"
import { createCalendarEvent } from "@/lib/google-calendar"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search") || ""

    let query = supabase
      .from("Appointment")
      .select("*, client:Client(id, firstName, lastName, phone), services:AppointmentService(id, service:Service(name, color, price, duration))")
      .order("date", { ascending: false })
      .order("startTime", { ascending: false })

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data: appointments } = await query

    let filtered = appointments || []
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((apt) => (
        apt.identifier?.toLowerCase().includes(q) ||
        apt.client?.firstName?.toLowerCase().includes(q) ||
        apt.client?.lastName?.toLowerCase().includes(q) ||
        apt.client?.phone?.includes(q)
      ))
    }

    const result = filtered.map((apt) => ({
      id: apt.id,
      identifier: apt.identifier,
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      totalPrice: apt.totalPrice,
      notes: apt.notes,
      cancelReason: apt.cancelReason,
      paymentMethod: apt.paymentMethod,
      paid: apt.paid ?? false,
      emailSent: apt.emailSent ?? false,
      calendarEventId: apt.calendarEventId ?? null,
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

    const { data: conflicting } = await supabase
      .from("Appointment")
      .select("id, identifier, client:Client(firstName, lastName)")
      .eq("date", date)
      .neq("status", "cancelled")
      .lt("startTime", endTime)
      .gt("endTime", startTime)
      .limit(1)

    if (conflicting && conflicting.length > 0) {
      const conflict = conflicting[0]
      const client = Array.isArray(conflict.client) ? conflict.client[0] : conflict.client
      return NextResponse.json(
        { error: `El horario se superpone con el turno ${conflict.identifier} (${client?.firstName} ${client?.lastName})` },
        { status: 409 }
      )
    }

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
      .select("*, client:Client(firstName, lastName, email), services:AppointmentService(service:Service(name))")
      .eq("id", id)
      .single()

    // Send confirmation email
    let emailSent = false
    if (appointment?.client?.email) {
      const servicesList = (appointment.services || [])
        .map((s: { service: { name: string } }) => s.service.name)
        .join(", ")
      emailSent = await sendAppointmentConfirmation(
        {
          identifier,
          date,
          startTime,
          endTime,
          totalPrice,
          paymentMethod: null,
          services: servicesList,
        },
        {
          firstName: appointment.client.firstName,
          lastName: appointment.client.lastName,
          email: appointment.client.email,
        }
      )
      if (emailSent) {
        await supabase.from("Appointment").update({ emailSent: true }).eq("id", id)
      }
    }

    // Create Google Calendar event
    let calendarEventId: string | null = null
    if (appointment) {
      const servicesList = (appointment.services || [])
        .map((s: { service: { name: string } }) => s.service.name)
        .join(", ")
      calendarEventId = await createCalendarEvent({
        identifier,
        date,
        startTime,
        endTime,
        clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
        clientEmail: appointment.client.email,
        services: servicesList,
        totalPrice,
        appointmentId: id,
      })
      if (calendarEventId) {
        await supabase.from("Appointment").update({ calendarEventId }).eq("id", id)
      }
    }

    return NextResponse.json({ ...appointment, emailSent, calendarEventId }, { status: 201 })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
