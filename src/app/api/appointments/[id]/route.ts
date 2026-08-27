import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes, paymentMethod } = body

    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status
      if (status === "cancelled") {
        updateData.cancelledAt = new Date().toISOString()
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (paymentMethod !== undefined) {
      updateData.paymentMethod = paymentMethod
    }

    await supabase
      .from("Appointment")
      .update(updateData)
      .eq("id", id)

    const { data: appointment } = await supabase
      .from("Appointment")
      .select("*")
      .eq("id", id)
      .single()

    return NextResponse.json(appointment)
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

    await supabase.from("AppointmentService").delete().eq("appointmentId", id)
    await supabase.from("ActivityNote").delete().eq("appointmentId", id)
    await supabase.from("Appointment").delete().eq("id", id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
