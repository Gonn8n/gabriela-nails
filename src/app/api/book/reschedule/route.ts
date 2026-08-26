import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// POST: Reprogramar turno público
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { appointmentId, newDate, newTime } = body

    if (!appointmentId || !newDate || !newTime) {
      return NextResponse.json({ error: "appointmentId, newDate y newTime son requeridos" }, { status: 400 })
    }

    const { data: apt } = await supabase
      .from("Appointment")
      .select("*")
      .eq("id", appointmentId)
      .single()

    if (!apt) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
    }

    if (apt.status !== "booked" && apt.status !== "confirmed") {
      return NextResponse.json({ error: "Este turno no se puede reprogramar" }, { status: 400 })
    }

    const { data: settingsRow } = await supabase
      .from("Settings")
      .select("value")
      .eq("key", "setting:cancellationHours")
      .single()

    const cancellationHours = parseInt(settingsRow?.value || "3")
    const aptDateTime = new Date(`${(apt.date as string).split("T")[0]}T${apt.startTime}`)
    const now = new Date()
    const diffHours = (aptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (diffHours < cancellationHours) {
      return NextResponse.json(
        { error: `No se puede reprogramar con menos de ${cancellationHours} horas de anticipación` },
        { status: 400 }
      )
    }

    const { data: workingDaysRow } = await supabase
      .from("Settings")
      .select("value")
      .eq("key", "setting:workingDays")
      .single()

    const workingDays = (workingDaysRow?.value || "1,2,3,4,5,6").split(",").map(Number)
    const dateObj = new Date(newDate + "T12:00:00")
    if (!workingDays.includes(dateObj.getDay())) {
      return NextResponse.json({ error: "La fecha seleccionada no es un día laborable" }, { status: 400 })
    }

    const { data: originalServices } = await supabase
      .from("AppointmentService")
      .select("*")
      .eq("appointmentId", appointmentId)

    const totalDuration = (originalServices || []).reduce((sum, s) => sum + (s.duration as number), 0)

    const [startHours, startMinutes] = newTime.split(":").map(Number)
    const endMinutes = startHours * 60 + startMinutes + totalDuration
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`

    const { data: blocked } = await supabase
      .from("BlockedSlot")
      .select("id")
      .eq("date", newDate)
      .lt("startTime", endTime)
      .gt("endTime", newTime)
      .limit(1)

    if (blocked && blocked.length > 0) {
      return NextResponse.json({ error: "El horario seleccionado está bloqueado" }, { status: 409 })
    }

    const { data: conflicting } = await supabase
      .from("Appointment")
      .select("id")
      .eq("date", newDate)
      .neq("status", "cancelled")
      .lt("startTime", endTime)
      .gt("endTime", newTime)
      .limit(1)

    if (conflicting && conflicting.length > 0) {
      return NextResponse.json({ error: "El horario seleccionado no está disponible" }, { status: 409 })
    }

    const { data: lastAppointment } = await supabase
      .from("Appointment")
      .select("identifier")
      .order("createdAt", { ascending: false })
      .limit(1)
      .single()

    const lastNumber = lastAppointment ? parseInt(lastAppointment.identifier.replace("GN-", "")) : 0
    const newIdentifier = `GN-${lastNumber + 1}`

    const newId = crypto.randomUUID()

    const { error: insertAptError } = await supabase
      .from("Appointment")
      .insert({
        id: newId,
        identifier: newIdentifier,
        clientId: apt.clientId,
        date: newDate,
        startTime: newTime,
        endTime,
        totalPrice: apt.totalPrice,
        status: "booked",
        rescheduledFrom: appointmentId,
        createdAt: new Date().toISOString(),
      })
    if (insertAptError) throw insertAptError

    if (originalServices && originalServices.length > 0) {
      const appointmentServices = originalServices.map((svc) => ({
        id: crypto.randomUUID(),
        appointmentId: newId,
        serviceId: svc.serviceId,
        price: svc.price,
        duration: svc.duration,
      }))

      const { error: insertSvcError } = await supabase
        .from("AppointmentService")
        .insert(appointmentServices)
      if (insertSvcError) throw insertSvcError
    }

    await supabase
      .from("Appointment")
      .update({
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancelReason: `Reprogramado a ${newIdentifier}`,
      })
      .eq("id", appointmentId)

    const { data: newApt } = await supabase
      .from("Appointment")
      .select("*")
      .eq("id", newId)
      .single()

    return NextResponse.json({ success: true, newAppointment: newApt })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
