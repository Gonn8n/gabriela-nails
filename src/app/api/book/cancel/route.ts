import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { sendPushIfEnabled } from "@/lib/push"

// POST: Cancelar turno público
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { appointmentId, reason } = body

    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId es requerido" }, { status: 400 })
    }

    const { data: apt } = await supabase
      .from("Appointment")
      .select("*, client:Client(firstName, lastName)")
      .eq("id", appointmentId)
      .single()

    if (!apt) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
    }

    if (apt.status !== "booked" && apt.status !== "confirmed") {
      return NextResponse.json({ error: "Este turno no se puede cancelar" }, { status: 400 })
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
        { error: `No se puede cancelar con menos de ${cancellationHours} horas de anticipación` },
        { status: 400 }
      )
    }

    await supabase
      .from("Appointment")
      .update({
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancelReason: reason || "Cancelado por el cliente",
      })
      .eq("id", appointmentId)

    // Send push notification to admin
    const client = Array.isArray(apt.client) ? apt.client[0] : apt.client
    const clientName = client ? `${client.firstName} ${client.lastName}` : "Cliente"
    sendPushIfEnabled("pushCancellation", {
      title: "Cancelación",
      body: `${clientName} canceló el turno ${apt.identifier}`,
      tag: "cancellation",
      url: "/admin",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
