"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, X } from "lucide-react"

interface Client {
  id: string
  dni: string
  firstName: string
  lastName: string
}

interface Service {
  id: string
  name: string
  duration: number
  price: number
  color: string
}

interface Appointment {
  id: string
  identifier: string
  date: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  notes: string | null
  client: Client
  services: { service: Service }[]
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "booked", label: "Reservados" },
  { value: "confirmed", label: "Confirmados" },
  { value: "in_progress", label: "En curso" },
  { value: "completed", label: "Completados" },
  { value: "cancelled", label: "Cancelados" },
]

const STATUS_LABELS: Record<string, string> = {
  booked: "Reservado",
  confirmed: "Confirmado",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    booked: "default",
    confirmed: "secondary",
    in_progress: "outline",
    completed: "secondary",
    cancelled: "destructive",
  }
  return <Badge variant={variants[status] || "default"}>{STATUS_LABELS[status] || status}</Badge>
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    clientId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    serviceIds: [] as string[],
    notes: "",
  })

  useEffect(() => {
    fetchData()
  }, [search, statusFilter])

  async function fetchData() {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (statusFilter !== "all") params.set("status", statusFilter)

    const [aptRes, cliRes, srvRes] = await Promise.all([
      fetch(`/api/appointments?${params}`),
      fetch("/api/clients"),
      fetch("/api/services"),
    ])

    setAppointments(await aptRes.json())
    setClients(await cliRes.json())
    setServices(await srvRes.json())
    setLoading(false)
  }

  function openCreate() {
    setForm({
      clientId: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "10:00",
      serviceIds: [],
      notes: "",
    })
    setDialogOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setDialogOpen(false)
      fetchData()
    }
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  async function handleCancel(id: string) {
    const apt = appointments.find((a) => a.id === id)
    if (apt) {
      const aptDateTime = new Date(`${apt.date.split("T")[0]}T${apt.startTime}`)
      if (aptDateTime < new Date(Date.now() + 2 * 60 * 60 * 1000)) {
        alert("No se puede cancelar con menos de 2 horas de anticipación")
        return
      }
    }
    if (!confirm("¿Cancelar este turno?")) return
    await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    })
    fetchData()
  }

  function toggleService(serviceId: string) {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }))
  }

  const selectedServices = services.filter((s) => form.serviceIds.includes(s.id))
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0)

  if (loading) return <div className="text-center py-8">Cargando turnos...</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Turnos</h1>
          <p className="text-sm text-muted-foreground">{appointments.length} turnos</p>
        </div>
        <Button onClick={openCreate} className="sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Turno
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No se encontraron turnos
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[52px] shrink-0">
                      <div className="text-lg font-bold leading-tight">
                        {new Date(apt.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                      </div>
                      <div className="text-xs text-muted-foreground">{apt.startTime}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{apt.client.firstName} {apt.client.lastName}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {apt.services.map((s) => s.service.name).join(", ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {apt.identifier} | {apt.endTime} | ${apt.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(apt.status)}
                    <Select value={apt.status} onValueChange={(v) => v && handleStatusChange(apt.id, v)}>
                      <SelectTrigger className="w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).filter(([k]) => k !== "cancelled").map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {apt.status !== "cancelled" && (
                      <Button variant="ghost" size="icon" onClick={() => handleCancel(apt.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Turno</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v || "" })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.dni})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Hora *</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Servicios *</Label>
              <div className="flex flex-wrap gap-2">
                {services.map((s) => (
                  <Button
                    key={s.id}
                    type="button"
                    variant={form.serviceIds.includes(s.id) ? "default" : "outline"}
                    onClick={() => toggleService(s.id)}
                    className="text-sm"
                  >
                    {s.name} - ${s.price}
                  </Button>
                ))}
              </div>
              {form.serviceIds.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Total: ${totalPrice.toFixed(2)} | Duración: {totalDuration} min
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionales..." />
            </div>
            <Button type="submit" className="w-full" disabled={!form.clientId || form.serviceIds.length === 0}>
              Crear Turno
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
