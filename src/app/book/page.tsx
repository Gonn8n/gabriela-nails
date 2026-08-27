"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, Loader2, ArrowLeft, ArrowRight, CalendarDays, Clock, AlertTriangle, XCircle, Banknote, ArrowRightLeft, Copy, Check } from "lucide-react"
import { BookingCalendar } from "@/components/booking-calendar"

interface Service {
  id: string
  name: string
  description: string | null
  duration: number
  price: number
  color: string
}

interface Client {
  id: string
  dni: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  birthDate: string | null
}

interface Appointment {
  id: string
  identifier: string
  date: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  paymentMethod: string | null
  services: { name: string; color: string; price: number; duration: number }[]
}

type Step =
  | "id"
  | "my-appointments"
  | "services"
  | "datetime"
  | "confirm"
  | "success"
  | "cancel-confirm"
  | "cancel-success"
  | "reschedule"

const STATUS_LABELS: Record<string, string> = {
  booked: "Reservado",
  confirmed: "Confirmado",
}

export default function BookingPage() {
  const [step, setStep] = useState<Step>("id")
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [client, setClient] = useState<Client | null>(null)
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [dni, setDni] = useState("")
  const [error, setError] = useState("")

  // Cancel
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [cancelReason, setCancelReason] = useState("")

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("")
  const [aliasCopied, setAliasCopied] = useState(false)

  // Reschedule
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null)

  // Slots
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsReason, setSlotsReason] = useState("")

  // Settings
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6])
  const [cancellationHours, setCancellationHours] = useState(3)

  // Form
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
    serviceIds: [] as string[],
    date: "",
    startTime: "",
  })

  useEffect(() => {
    fetchServices()
    fetchSettings()
  }, [])

  useEffect(() => {
    if (formData.date && (step === "datetime" || step === "reschedule")) {
      fetchSlots()
    }
  }, [formData.date, formData.serviceIds, step])

  async function fetchServices() {
    const res = await fetch("/api/services")
    setServices(await res.json())
  }

  async function fetchSettings() {
    const res = await fetch("/api/settings")
    if (res.ok) {
      const data = await res.json()
      if (data.workingDays) setWorkingDays(data.workingDays)
      if (data.cancellationHours) setCancellationHours(parseInt(data.cancellationHours))
    }
  }

  async function fetchSlots() {
    setSlotsLoading(true)
    setSlotsReason("")
    const params = new URLSearchParams({ date: formData.date })
    if (formData.serviceIds.length > 0) {
      params.set("serviceIds", formData.serviceIds.join(","))
    }
    const res = await fetch(`/api/book/slots?${params}`)
    const data = await res.json()
    setAvailableSlots(data.slots || [])
    setSlotsReason(data.reason || "")
    if (data.slots?.length > 0 && !formData.startTime) {
      setFormData((prev) => ({ ...prev, startTime: data.slots[0] }))
    }
    setSlotsLoading(false)
  }

  async function handleDniSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch(`/api/book?dni=${dni}`)
    const data = await res.json()

    if (data.client) {
      setClient(data.client)
      setFormData((prev) => ({
        ...prev,
        firstName: data.client.firstName,
        lastName: data.client.lastName,
        email: data.client.email || "",
        phone: data.client.phone || "",
        birthDate: data.client.birthDate ? data.client.birthDate.split("T")[0] : "",
      }))

      if (data.appointments && data.appointments.length > 0) {
        setUpcomingAppointments(data.appointments)
        setLoading(false)
        setStep("my-appointments")
        return
      }
    }

    setLoading(false)
    setStep("services")
  }

  function toggleService(serviceId: string) {
    setFormData((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
      startTime: "",
    }))
  }

  async function handleFinalSubmit() {
    setError("")
    setLoading(true)

    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dni, ...formData, paymentMethod }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Error al crear el turno")
      setLoading(false)
      return
    }

    setLoading(false)
    setStep("success")
  }

  async function handleCancel() {
    if (!cancelTarget) return
    setError("")
    setLoading(true)

    const res = await fetch("/api/book/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: cancelTarget.id, reason: cancelReason || "Cancelado por el cliente" }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Error al cancelar")
      setLoading(false)
      return
    }

    setUpcomingAppointments((prev) => prev.filter((a) => a.id !== cancelTarget.id))
    setCancelTarget(null)
    setCancelReason("")
    setLoading(false)
    setStep("cancel-success")
  }

  function startReschedule(apt: Appointment) {
    setRescheduleTarget(apt)
    // Preseleccionar los servicios del turno original
    const aptServiceNames = apt.services.map((s) => s.name)
    const matchedIds = services.filter((s) => aptServiceNames.includes(s.name)).map((s) => s.id)
    setFormData((prev) => ({
      ...prev,
      serviceIds: matchedIds.length > 0 ? matchedIds : [],
      date: "",
      startTime: "",
    }))
    setStep("reschedule")
  }

  async function handleRescheduleSubmit() {
    if (!rescheduleTarget || !formData.date || !formData.startTime) return
    setError("")
    setLoading(true)

    const res = await fetch("/api/book/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: rescheduleTarget.id,
        newDate: formData.date,
        newTime: formData.startTime,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Error al reprogramar")
      setLoading(false)
      return
    }

    // Actualizar la lista de turnos
    setUpcomingAppointments((prev) =>
      prev
        .filter((a) => a.id !== rescheduleTarget.id)
        .concat(data.newAppointment ? [{
          ...data.newAppointment,
          services: rescheduleTarget.services,
        }] : [])
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    )
    setRescheduleTarget(null)
    setLoading(false)
    setStep("cancel-success")
  }

  const selectedServices = services.filter((s) => formData.serviceIds.includes(s.id))
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0)

  const today = new Date()
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)
  function toLocalStr(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
  const minDateStr = toLocalStr(today)
  const maxDateStr = toLocalStr(maxDate)

  function canCancelOrReschedule(apt: Appointment): boolean {
    const aptDateTime = new Date(`${apt.date.split("T")[0]}T${apt.startTime}`)
    const now = new Date()
    const diffHours = (aptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffHours >= cancellationHours
  }

  return (
    <div className="min-h-screen bg-pink-50 py-6 px-4 sm:py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Image src="/logo-gabriela.png" alt="Gabriela Nails" width={240} height={64} className="h-16 w-auto mx-auto" priority />
          <p className="text-muted-foreground mt-1 text-sm">Reservá tu turno online</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {/* ───── STEP: DNI ───── */}
        {step === "id" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">¿Cómo es tu DNI?</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDniSubmit} className="space-y-4">
                <Input
                  placeholder="Ingresá tu DNI"
                  value={dni}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 8); setDni(v); }}
                  onFocus={() => { if (typeof window !== "undefined" && window.history) { window.history.pushState(null, "", window.location.href) } }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  required
                />
                <Button type="submit" className="w-full" disabled={loading || !dni}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Continuar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ───── STEP: TURNOS PRÓXIMOS ───── */}
        {step === "my-appointments" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Hola {client?.firstName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {upcomingAppointments.length === 1
                  ? "Tenés un turno próximo:"
                  : `Tenés ${upcomingAppointments.length} turnos próximos:`}
              </p>

              {upcomingAppointments.map((apt) => {
                const canModify = canCancelOrReschedule(apt)
                return (
                  <div key={apt.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {STATUS_LABELS[apt.status] || apt.status} · {apt.identifier}
                        </div>
                        <div className="text-lg font-bold mt-1">
                          {new Date(apt.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3.5 w-3.5" />
                          {apt.startTime} - {apt.endTime}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${apt.totalPrice.toLocaleString("es-AR")}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {apt.services.map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-gray-100"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </span>
                      ))}
                    </div>

                    {apt.paymentMethod && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {apt.paymentMethod === "cash" ? (
                          <Banknote className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" />
                        )}
                        {apt.paymentMethod === "cash" ? "Efectivo" : "Transferencia"}
                      </div>
                    )}

                    {canModify ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => { setCancelTarget(apt); setStep("cancel-confirm"); }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => startReschedule(apt)}
                        >
                          <CalendarDays className="h-4 w-4 mr-1" />
                          Reprogramar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Faltan menos de {cancellationHours} horas. No se puede cancelar ni reprogramar.
                      </div>
                    )}
                  </div>
                )
              })}

              <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                ℹ️ Podés cancelar o reprogramar tu turno con hasta {cancellationHours} horas de anticipación.
              </div>

              <div className="border-t pt-4">
                <Button
                  className="w-full bg-pink-500 hover:bg-pink-600"
                  onClick={() => setStep("services")}
                >
                  Reservar nuevo turno
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ───── STEP: SERVICIOS ───── */}
        {step === "services" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {client ? `Hola ${client.firstName}` : "Completá tus datos"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!client && (
                <div className="space-y-3 pb-4 border-b">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre *</Label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Apellido *</Label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Teléfono</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+54 11 1234-5678"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cumpleaños</Label>
                      <Input
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      formData.serviceIds.includes(service.id)
                        ? "border-pink-500 bg-pink-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: service.color }}
                        />
                        <div>
                          <span className="font-medium text-sm">{service.name}</span>
                          {service.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold">${service.price.toLocaleString("es-AR")}</div>
                        <div className="text-[11px] text-muted-foreground">{service.duration} min</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {formData.serviceIds.length > 0 && (
                <div className="bg-pink-50 rounded-lg p-3 text-sm flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {formData.serviceIds.length} servicio{formData.serviceIds.length > 1 ? "s" : ""}
                  </span>
                  <span className="font-semibold">
                    ${totalPrice.toLocaleString("es-AR")} · {totalDuration} min
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(upcomingAppointments.length > 0 ? "my-appointments" : "id")}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                </Button>
                <Button
                  onClick={() => setStep("datetime")}
                  disabled={formData.serviceIds.length === 0 || (!client && !formData.firstName)}
                  className="flex-1"
                >
                  Elegir fecha <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ───── STEP: FECHA + HORA ───── */}
        {step === "datetime" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Elegí fecha y hora
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-3 bg-white">
                <BookingCalendar
                  selectedDate={formData.date}
                  onDateSelect={(d) => setFormData({ ...formData, date: d, startTime: "" })}
                  minDate={minDateStr}
                  maxDate={maxDateStr}
                  workingDays={workingDays}
                />
              </div>

              {formData.date && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Horarios — {new Date(formData.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                  </Label>
                  {slotsLoading ? (
                    <div className="text-sm text-muted-foreground py-3 text-center">
                      <Loader2 className="h-4 w-4 animate-spin inline-block mr-1" />
                      Buscando horarios...
                    </div>
                  ) : slotsReason ? (
                    <div className="text-sm text-muted-foreground py-3 bg-muted/30 rounded-lg px-3 text-center">
                      {slotsReason}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-3 bg-muted/30 rounded-lg px-3 text-center">
                      No hay horarios disponibles. Probá otro día.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant={formData.startTime === slot ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormData({ ...formData, startTime: slot })}
                          className={`text-sm h-9 ${formData.startTime === slot ? "bg-pink-500 hover:bg-pink-600" : ""}`}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("services")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                </Button>
                <Button
                  onClick={() => setStep("confirm")}
                  disabled={!formData.startTime}
                  className="flex-1"
                >
                  Revisar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ───── STEP: CONFIRMACIÓN ───── */}
        {step === "confirm" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Confirmá tu turno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="font-medium">
                    {new Date(formData.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hora</span>
                  <span className="font-medium">{formData.startTime} hs</span>
                </div>
                <div className="border-t pt-2.5">
                  <span className="text-muted-foreground text-xs">Servicios</span>
                  <div className="mt-1 space-y-1">
                    {selectedServices.map((s) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span>{s.name}</span>
                        </div>
                        <span>${s.price.toLocaleString("es-AR")}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-base font-semibold pt-2 border-t">
                  <span>Total · {totalDuration} min</span>
                  <span>${totalPrice.toLocaleString("es-AR")}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                ℹ️ Podés cancelar o reprogramar tu turno con hasta {cancellationHours} horas de anticipación.
              </div>

              {/* Forma de pago */}
              <div className="space-y-2">
                <Label className="text-sm">Forma de pago *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      paymentMethod === "cash"
                        ? "border-pink-400 bg-pink-50 text-pink-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Banknote className="h-4 w-4" />
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("transfer")}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      paymentMethod === "transfer"
                        ? "border-pink-400 bg-pink-50 text-pink-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Transferencia
                  </button>
                </div>

                {paymentMethod === "transfer" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 text-sm">
                    <p className="font-medium text-blue-800">Datos para transferir</p>
                    <div className="space-y-1.5 text-blue-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-600">Alias</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-blue-900">gabriela.c.24</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText("gabriela.c.24")
                              setAliasCopied(true)
                              setTimeout(() => setAliasCopied(false), 2000)
                            }}
                            className="p-1 rounded-md hover:bg-blue-100 transition-colors"
                            title="Copiar alias"
                          >
                            {aliasCopied ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-blue-600" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-600">Titular</span>
                        <span className="text-blue-900">Gabriela Analia Carabajal</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-600">CUIT</span>
                        <span className="text-blue-900">27-29376460-9</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-600">Banco</span>
                        <span className="text-blue-900">Galicia</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("datetime")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                </Button>
                <Button onClick={handleFinalSubmit} disabled={loading || !paymentMethod} className="flex-1 bg-pink-500 hover:bg-pink-600">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirmar Turno
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ───── STEP: ÉXITO ───── */}
        {step === "success" && (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-green-600">¡Turno Confirmado!</h2>
              <p className="text-muted-foreground">
                Te esperamos el{" "}
                <strong>
                  {new Date(formData.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                </strong>{" "}
                a las <strong>{formData.startTime} hs</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedServices.map((s) => s.name).join(", ")}
              </p>
              <p className="text-lg font-semibold">${totalPrice.toLocaleString("es-AR")}</p>
            </CardContent>
          </Card>
        )}

        {/* ───── STEP: CANCELAR - CONFIRMAR ───── */}
        {step === "cancel-confirm" && cancelTarget && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-600">Cancelar turno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-2">
                <p>¿Estás segura de que querés cancelar este turno?</p>
                <div className="bg-red-50 rounded-lg p-3 space-y-1">
                  <div className="font-medium">
                    {new Date(cancelTarget.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} a las {cancelTarget.startTime}
                  </div>
                  <div className="text-muted-foreground">
                    {cancelTarget.services.map((s) => s.name).join(", ")}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Motivo de la cancelación (opcional)</Label>
                <Input
                  placeholder="Ej: cambió mi horario, me surgió otro compromiso..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason(""); setStep("my-appointments"); }} className="flex-1">
                  Volver
                </Button>
                <Button variant="destructive" onClick={handleCancel} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sí, cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ───── STEP: CANCELAR - ÉXITO ───── */}
        {step === "cancel-success" && (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <XCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-green-600">
                {rescheduleTarget ? "¡Turno reprogramado!" : "¡Turno cancelado!"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {rescheduleTarget
                  ? "Se creó un nuevo turno con la fecha y hora elegidas."
                  : "Tu turno fue cancelado correctamente."}
              </p>

              {upcomingAppointments.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep("my-appointments")}
                  className="mt-4"
                >
                  Ver mis turnos
                </Button>
              )}

              <Button
                className="bg-pink-500 hover:bg-pink-600"
                onClick={() => {
                  setFormData({
                    firstName: client?.firstName || "",
                    lastName: client?.lastName || "",
                    email: client?.email || "",
                    phone: client?.phone || "",
                    birthDate: client?.birthDate ? client.birthDate.split("T")[0] : "",
                    serviceIds: [],
                    date: "",
                    startTime: "",
                  })
                  setStep("services")
                }}
              >
                Reservar nuevo turno
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ───── STEP: REPROGRAMAR ───── */}
        {step === "reschedule" && rescheduleTarget && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Reprogramar turno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">Original:</span>{" "}
                <span className="font-medium">
                  {new Date(rescheduleTarget.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} a las {rescheduleTarget.startTime}
                </span>
              </div>

              <div className="border rounded-lg p-3 bg-white">
                <BookingCalendar
                  selectedDate={formData.date}
                  onDateSelect={(d) => setFormData({ ...formData, date: d, startTime: "" })}
                  minDate={minDateStr}
                  maxDate={maxDateStr}
                  workingDays={workingDays}
                />
              </div>

              {formData.date && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Horarios — {new Date(formData.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                  </Label>
                  {slotsLoading ? (
                    <div className="text-sm text-muted-foreground py-3 text-center">
                      <Loader2 className="h-4 w-4 animate-spin inline-block mr-1" />
                      Buscando horarios...
                    </div>
                  ) : slotsReason ? (
                    <div className="text-sm text-muted-foreground py-3 bg-muted/30 rounded-lg px-3 text-center">
                      {slotsReason}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-3 bg-muted/30 rounded-lg px-3 text-center">
                      No hay horarios disponibles. Probá otro día.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant={formData.startTime === slot ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormData({ ...formData, startTime: slot })}
                          className={`text-sm h-9 ${formData.startTime === slot ? "bg-pink-500 hover:bg-pink-600" : ""}`}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { setRescheduleTarget(null); setStep("my-appointments"); }} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                </Button>
                <Button
                  onClick={handleRescheduleSubmit}
                  disabled={!formData.startTime || loading}
                  className="flex-1 bg-pink-500 hover:bg-pink-600"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirmar reprogramación
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
