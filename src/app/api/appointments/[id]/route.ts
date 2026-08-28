import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes, paymentMethod, paid, date, startTime, clientId, serviceIds, force } = body

    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status
      if (status === "cancelled") {
        updateData.cancelledAt = new Date().toISOString()
      }
    }

    if (notes !== undefined) updateData.notes = notes
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod
    if (paid !== undefined) updateData.paid = paid

    // Full edit: date, time, services, client
    const isFullEdit = date || startTime || clientId || serviceIds

    if (isFullEdit) {
      // Fetch current appointment
      const { data: current } = await supabase
        .from("Appointment")
        .select("*, services:AppointmentService(service:Service(id, name, duration, price))")
        .eq("id", id)
        .single()

      if (!current) {
        return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
      }

      const newDate = date || current.date
      const newClientId = clientId || current.clientId
      let newServiceIds = serviceIds
      let newStartTime = startTime || current.startTime
      let newEndTime = current.endTime
      let newTotalPrice = current.totalPrice

      // If services changed, recalculate
      if (serviceIds && serviceIds.length > 0) {
        const { data: services } = await supabase
          .from("Service")
          .select("*")
          .in("id", serviceIds)

        if (!services || services.length !== serviceIds.length) {
          return NextResponse.json({ error: "Algunos servicios no fueron encontrados" }, { status: 400 })
        }

        const totalDuration = services.reduce((sum, s) => sum + (s.duration as number), 0)
        newTotalPrice = services.reduce((sum, s) => sum + (s.price as number), 0)

        const [sh, sm] = newStartTime.split(":").map(Number)
        const endMin = sh * 60 + sm + totalDuration
        newEndTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`

        // Replace AppointmentService records
        await supabase.from("AppointmentService").delete().eq("appointmentId", id)

        const appointmentServices = services.map((service) => ({
          id: crypto.randomUUID(),
          appointmentId: id,
          serviceId: service.id,
          price: service.price,
          duration: service.duration,
        }))

        const { error: svcError } = await supabase
          .from("AppointmentService")
          .insert(appointmentServices)

        if (svcError) throw svcError
      } else if (startTime && startTime !== current.startTime) {
        // Only time changed, recalculate endTime based on existing services
        const totalDuration = (current.services || []).reduce(
          (sum: number, s: { service: { duration: number } }) => sum + s.service.duration,
          0
        )
        const [sh, sm] = startTime.split(":").map(Number)
        const endMin = sh * 60 + sm + totalDuration
        newEndTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`
      }

      // Validate working days
      const { data: settingsRow } = await supabase
        .from("Settings")
        .select("value")
        .eq("key", "setting:workingDays")
        .single()

      const workingDays = (settingsRow?.value || "1,2,3,4,5,6").split(",").map(Number)
      const dateObj = new Date(newDate + "T12:00:00")
      if (!workingDays.includes(dateObj.getDay())) {
        return NextResponse.json({ error: "La fecha seleccionada no es un día laborable" }, { status: 400 })
      }

      // Check conflicts (exclude self)
      if (!force) {
        const { data: conflicting } = await supabase
          .from("Appointment")
          .select("id, identifier, client:Client(firstName, lastName)")
          .eq("date", newDate)
          .neq("status", "cancelled")
          .neq("id", id)
          .lt("startTime", newEndTime)
          .gt("endTime", newStartTime)
          .limit(1)

        if (conflicting && conflicting.length > 0) {
          const conflict = conflicting[0]
          const client = Array.isArray(conflict.client) ? conflict.client[0] : conflict.client
          return NextResponse.json(
            { error: `El horario se superpone con el turno ${conflict.identifier} (${client?.firstName} ${client?.lastName})`, conflict: true },
            { status: 409 }
          )
        }
      }

      // Check blocked slots
      const { data: blocked } = await supabase
        .from("BlockedSlot")
        .select("id")
        .eq("date", newDate)
        .lt("startTime", newEndTime)
        .gt("endTime", newStartTime)
        .limit(1)

      if (blocked && blocked.length > 0) {
        return NextResponse.json({ error: "El horario seleccionado está bloqueado" }, { status: 409 })
      }

      updateData.date = newDate
      updateData.startTime = newStartTime
      updateData.endTime = newEndTime
      updateData.clientId = newClientId
      updateData.totalPrice = newTotalPrice
    }

    const { error: updateError } = await supabase
      .from("Appointment")
      .update(updateData)
      .eq("id", id)

    if (updateError) throw updateError

    // Fetch updated appointment with relations
    const { data: appointment } = await supabase
      .from("Appointment")
      .select("*, client:Client(id, firstName, lastName, phone, email), services:AppointmentService(service:Service(name, color, price, duration))")
      .eq("id", id)
      .single()

    // Update Google Calendar event if it exists
    if (appointment?.calendarEventId && isFullEdit) {
      const servicesList = (appointment.services || [])
        .map((s: { service: { name: string } }) => s.service.name)
        .join(", ")

      await updateCalendarEvent(appointment.calendarEventId, {
        identifier: appointment.identifier,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        clientName: `${appointment.client.firstName} ${appointment.client.lastName}`,
        clientEmail: appointment.client.email,
        services: servicesList,
        totalPrice: appointment.totalPrice,
        appointmentId: appointment.id,
      })
    }

    // Delete calendar event if cancelled
    if (status === "cancelled" && appointment?.calendarEventId) {
      await deleteCalendarEvent(appointment.calendarEventId)
    }

    return NextResponse.json(appointment)
  } catch (error) {
    console.error("API Error:", error)
    const message = error instanceof Error ? error.message : typeof error === "object" ? JSON.stringify(error) : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Delete calendar event if exists
    const { data: apt } = await supabase
      .from("Appointment")
      .select("calendarEventId")
      .eq("id", id)
      .single()

    if (apt?.calendarEventId) {
      await deleteCalendarEvent(apt.calendarEventId)
    }

    await supabase.from("AppointmentService").delete().eq("appointmentId", id)
    await supabase.from("ActivityNote").delete().eq("appointmentId", id)
    await supabase.from("Appointment").delete().eq("id", id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
