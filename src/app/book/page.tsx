"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, Loader2 } from "lucide-react"

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

type Step = "dni" | "services" | "datetime" | "confirm" | "success"

export default function BookingPage() {
  const [step, setStep] = useState<Step>("dni")
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [client, setClient] = useState<Client | null>(null)
  const [dni, setDni] = useState("")
  const [error, setError] = useState("")

  // Available slots
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsReason, setSlotsReason] = useState("")

  // Form data
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
  }, [])

  useEffect(() => {
    if (formData.date && step === "datetime") {
      fetchSlots()
    }
  }, [formData.date, formData.serviceIds, step])

  async function fetchServices() {
    const res = await fetch("/api/services")
    const data = await res.json()
    setServices(data)
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
        birthDate: data.client.birthDate ? new Date(data.client.birthDate).toISOString().split("T")[0] : "",
      }))
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
    }))
  }

  async function handleFinalSubmit() {
    setError("")
    setLoading(true)

    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dni, ...formData }),
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

  const selectedServices = services.filter((s) => formData.serviceIds.includes(s.id))
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0)

  // Min date = today, max date = today + 30 days
  const today = new Date()
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)
  const minDateStr = today.toISOString().split("T")[0]
  const maxDateStr = maxDate.toISOString().split("T")[0]

  return (
    <div className="min-h-screen bg-pink-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pink-600">Gabriela Nails</h1>
          <p className="text-muted-foreground mt-2">Reservá tu turno online</p>
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {["dni", "services", "datetime", "confirm"].map((s, i) => (
            <div
              key={s}
              className={`w-8 h-2 rounded-full ${
                ["dni", "services", "datetime", "confirm"].indexOf(step) >= i
                  ? "bg-pink-500"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {/* Step: DNI */}
        {step === "dni" && (
          <Card>
            <CardHeader>
              <CardTitle>¿Cómo es tu DNI?</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDniSubmit} className="space-y-4">
                <Input placeholder="Ingresá tu DNI" value={dni} onChange={(e) => setDni(e.target.value)} required />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step: Services */}
        {step === "services" && (
          <Card>
            <CardHeader>
              <CardTitle>Seleccioná tus servicios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!client && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Completá tus datos para continuar</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre *</Label>
                      <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Apellido *</Label>
                      <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+54 11 1234-5678" />
                  </div>
                </div>
              )}

              {client && (
                <p className="text-sm text-muted-foreground">Hola {client.firstName}, seleccioná tus servicios:</p>
              )}

              <div className="space-y-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.serviceIds.includes(service.id)
                        ? "border-pink-500 bg-pink-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => toggleService(service.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${service.price.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{service.duration} min</div>
                      </div>
                    </div>
                    {service.description && <p className="text-sm text-muted-foreground mt-1">{service.description}</p>}
                  </div>
                ))}
              </div>

              {formData.serviceIds.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Total: <strong>${totalPrice.toFixed(2)}</strong> | Duración: <strong>{totalDuration} min</strong>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("dni")} className="flex-1">Volver</Button>
                <Button onClick={() => setStep("datetime")} disabled={formData.serviceIds.length === 0} className="flex-1">Continuar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Date/Time */}
        {step === "datetime" && (
          <Card>
            <CardHeader>
              <CardTitle>Elegí fecha y hora</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  min={minDateStr}
                  max={maxDateStr}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value, startTime: "" })}
                  required
                />
              </div>

              {formData.date && (
                <div className="space-y-2">
                  <Label>Hora disponible *</Label>
                  {slotsLoading ? (
                    <div className="text-sm text-muted-foreground py-2">Buscando horarios disponibles...</div>
                  ) : slotsReason ? (
                    <div className="text-sm text-muted-foreground py-2 bg-muted/30 rounded-lg px-3">{slotsReason}</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-2 bg-muted/30 rounded-lg px-3">
                      No hay horarios disponibles para esta fecha. Probá otro día.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant={formData.startTime === slot ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormData({ ...formData, startTime: slot })}
                          className="text-sm"
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("services")} className="flex-1">Volver</Button>
                <Button onClick={() => setStep("confirm")} disabled={!formData.startTime} className="flex-1">Continuar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <Card>
            <CardHeader>
              <CardTitle>Confirmá tu turno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span>{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha:</span>
                  <span>{new Date(formData.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hora:</span>
                  <span>{formData.startTime} hs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Servicios:</span>
                  <span>{selectedServices.map((s) => s.name).join(", ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duración:</span>
                  <span>{totalDuration} min</span>
                </div>
                <div className="flex justify-between font-medium text-base pt-2 border-t">
                  <span>Total:</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("datetime")} className="flex-1">Volver</Button>
                <Button onClick={handleFinalSubmit} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Turno"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-green-600">¡Turno Confirmado!</h2>
              <p className="text-muted-foreground">
                Te esperamos el {new Date(formData.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} a las {formData.startTime} hs
              </p>
              <p className="text-sm text-muted-foreground">
                Servicios: {selectedServices.map((s) => s.name).join(", ")}
              </p>
              <p className="text-lg font-medium">Total: ${totalPrice.toFixed(2)}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
