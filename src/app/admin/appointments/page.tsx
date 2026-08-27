"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Plus,
  Search,
  CalendarClock,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageSquare,
  Calendar,
  Banknote,
  ArrowRightLeft,
  CircleDollarSign,
  MessageCircle,
} from "lucide-react"
import { toast } from "@/components/ui/toast"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { PageHeader } from "@/components/page-header"

interface Client {
  id: string
  firstName: string
  lastName: string
  phone: string | null
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
  cancelReason: string | null
  paymentMethod: string | null
  paid: boolean
  client: Client
  services: { service: Service }[]
}

const STATUS_ACTIONS = [
  { value: "booked", label: "Reservado", icon: CalendarClock, activeBg: "bg-blue-100", activeBorder: "border-blue-400", activeText: "text-blue-700", inactiveBg: "bg-gray-50", inactiveBorder: "border-gray-200", inactiveText: "text-gray-500" },
  { value: "completed", label: "Finalizado", icon: CheckCircle, activeBg: "bg-emerald-100", activeBorder: "border-emerald-400", activeText: "text-emerald-700", inactiveBg: "bg-gray-50", inactiveBorder: "border-gray-200", inactiveText: "text-gray-500" },
  { value: "cancelled", label: "Cancelado", icon: XCircle, activeBg: "bg-red-100", activeBorder: "border-red-400", activeText: "text-red-700", inactiveBg: "bg-gray-50", inactiveBorder: "border-gray-200", inactiveText: "text-gray-500" },
  { value: "rescheduled", label: "Reprogramar", icon: RefreshCw, activeBg: "bg-violet-100", activeBorder: "border-violet-400", activeText: "text-violet-700", inactiveBg: "bg-gray-50", inactiveBorder: "border-gray-200", inactiveText: "text-gray-500" },
]

const STATUS_CARD: Record<string, { border: string; badge: string }> = {
  booked: { border: "border-l-blue-400", badge: "bg-blue-100 text-blue-700" },
  completed: { border: "border-l-emerald-400", badge: "bg-emerald-100 text-emerald-700" },
  cancelled: { border: "border-l-red-300", badge: "bg-red-100 text-red-600" },
  rescheduled: { border: "border-l-violet-400", badge: "bg-violet-100 text-violet-700" },
}

const STATUS_LABELS: Record<string, string> = {
  booked: "Reservado",
  completed: "Finalizado",
  cancelled: "Cancelado",
  rescheduled: "Reprogramado",
}

const FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "booked", label: "Reservados" },
  { value: "completed", label: "Finalizados" },
  { value: "unpaid", label: "Sin cobrar" },
  { value: "cancelled", label: "Cancelados" },
  { value: "rescheduled", label: "Reprogramados" },
]

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; apt: Appointment | null }>({ open: false, apt: null })
  const [notesValue, setNotesValue] = useState("")
  const [lastCreated, setLastCreated] = useState<{ id: string; clientName: string; phone: string | null; date: string; startTime: string; endTime: string; services: string; totalPrice: number } | null>(null)

  function getTodayStr(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }

  const [form, setForm] = useState({
    clientId: "",
    date: getTodayStr(),
    startTime: "10:00",
    serviceIds: [] as string[],
    notes: "",
  })

  useEffect(() => {
    fetchData()
  }, [debouncedSearch, statusFilter])

  async function fetchData() {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (statusFilter !== "all" && statusFilter !== "unpaid") params.set("status", statusFilter)

    const [aptRes, cliRes, srvRes] = await Promise.all([
      fetch(`/api/appointments?${params}`),
      fetch("/api/clients"),
      fetch("/api/services"),
    ])

    if (!aptRes.ok || !cliRes.ok || !srvRes.ok) {
      toast.add({ type: "error", title: "Error", description: "No se pudieron cargar los datos." })
    }

    setAppointments(await aptRes.json())
    setClients(await cliRes.json())
    setServices(await srvRes.json())
    setLoading(false)
  }

  function openCreate() {
    setForm({
      clientId: "",
      date: getTodayStr(),
      startTime: "10:00",
      serviceIds: [],
      notes: "",
    })
    setLastCreated(null)
    setDialogOpen(true)
  }

  function sendWhatsApp() {
    if (!lastCreated) return
    const [y, m, d] = lastCreated.date.split("-")
    const msg = `Hola ${lastCreated.clientName.split(" ")[0]}, te confirmamos tu turno:\n\n📅 Fecha: ${d}/${m}\n⏰ Hora: ${lastCreated.startTime} - ${lastCreated.endTime}\n💅 Servicios: ${lastCreated.services}\n💰 Total: $${lastCreated.totalPrice.toLocaleString("es-AR")}\n\n¡Te esperamos!\nGabriela Nails`
    const phone = lastCreated.phone?.replace(/\D/g, "")
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, "_blank")
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const selectedClient = clients.find((c) => c.id === form.clientId)
    const selectedSvcs = services.filter((s) => form.serviceIds.includes(s.id))
    const total = selectedSvcs.reduce((sum, s) => sum + s.price, 0)
    const totalDur = selectedSvcs.reduce((sum, s) => sum + s.duration, 0)
    const [sh, sm] = form.startTime.split(":").map(Number)
    const endMin = sh * 60 + sm + totalDur
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`
    const servicesStr = selectedSvcs.map((s) => s.name).join(", ")

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const created = await res.json()
      toast.add({ type: "success", title: "Turno creado" })
      setLastCreated({
        id: created.id,
        clientName: `${selectedClient?.firstName} ${selectedClient?.lastName}`,
        phone: selectedClient?.phone || null,
        date: form.date,
        startTime: form.startTime,
        endTime,
        services: servicesStr,
        totalPrice: total,
      })
      fetchData()
    } else {
      const data = await res.json().catch(() => null)
      toast.add({ type: "error", title: "Error", description: data?.error || "No se pudo crear el turno." })
    }
  }

  async function handleStatusChange(id: string, status: string) {
    if (status === "cancelled") {
      const ok = window.confirm("¿Marcar como cancelado? Se quitará el turno de la agenda.")
      if (!ok) return
    }
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.add({ type: "success", title: "Estado actualizado" })
    } else {
      toast.add({ type: "error", title: "Error", description: "No se pudo actualizar el estado." })
    }
    fetchData()
  }

  async function togglePaid(id: string, currentPaid: boolean) {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !currentPaid }),
    })
    if (res.ok) {
      toast.add({ type: "success", title: currentPaid ? "Marcado como no cobrado" : "Marcado como cobrado" })
    } else {
      const data = await res.json().catch(() => ({}))
      const msg = typeof data?.error === "string" ? data.error : "No se pudo actualizar el cobro."
      toast.add({ type: "error", title: "Error", description: msg })
    }
    fetchData()
  }

  function openNotes(apt: Appointment) {
    setNotesDialog({ open: true, apt })
    setNotesValue(apt.notes || "")
  }

  async function saveNotes() {
    if (!notesDialog.apt) return
    const res = await fetch(`/api/appointments/${notesDialog.apt.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesValue }),
    })
    if (res.ok) {
      toast.add({ type: "success", title: "Nota guardada" })
    } else {
      toast.add({ type: "error", title: "Error", description: "No se pudo guardar la nota." })
    }
    setNotesDialog({ open: false, apt: null })
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

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split("-")
    return `${d}/${m}`
  }

  if (loading) return <div className="text-center py-8">Cargando turnos...</div>

  return (
    <div className="space-y-4">
      <PageHeader
        title="Turnos"
        description={`${appointments.length} turnos`}
        actions={
          <Button onClick={openCreate} className="sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Turno
          </Button>
        }
      />

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
        <div className="flex gap-1 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(opt.value)}
              aria-pressed={statusFilter === opt.value}
              className="text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No hay turnos</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search || statusFilter !== "all"
                ? "No se encontraron turnos con esos filtros"
                : "Creá el primer turno para comenzar"}
            </p>
            {!search && statusFilter === "all" && (
              <Button onClick={openCreate} size="sm" className="mt-4">
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Turno
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {appointments
            .filter((apt) => statusFilter === "unpaid" ? apt.status === "completed" && !apt.paid : true)
            .map((apt) => {
            const cardStyle = STATUS_CARD[apt.status] || STATUS_CARD.booked
            const isActive = (v: string) => apt.status === v
            return (
              <Card key={apt.id} className={`overflow-hidden border-l-4 ${cardStyle.border}`}>
                <CardContent className="p-3 sm:p-4">
                  {/* ── Fila 1: fecha + info del cliente ── */}
                  <div className="flex items-start gap-3">
                    <div className="text-center shrink-0 w-12 pt-0.5">
                      <div className="text-lg font-bold leading-tight text-gray-900">
                        {formatDate(apt.date)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {apt.startTime}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-gray-900 truncate text-[15px]">
                          {apt.client.firstName} {apt.client.lastName}
                        </div>
                        <button
                          onClick={() => openNotes(apt)}
                          className={`shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors ${
                            apt.notes
                              ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                              : "text-muted-foreground hover:bg-gray-100"
                          }`}
                          title={apt.notes ? `Nota: ${apt.notes}` : "Agregar nota"}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-sm text-muted-foreground truncate mt-0.5">
                        {apt.services.map((s) => s.service.name).join(", ")}
                      </div>
                      <div className="text-xs text-muted-foreground/70 mt-1">
                        {apt.identifier} · {apt.endTime} · ${apt.totalPrice.toLocaleString("es-AR")}
                      </div>
                    </div>
                  </div>

                  {/* ── Fila 2: badge + iconos de pago ── */}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md ${cardStyle.badge}`}>
                      {STATUS_LABELS[apt.status]}
                    </span>
                    {apt.paymentMethod && (
                      <div
                        className={`shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md border ${
                          apt.paymentMethod === "cash"
                            ? "bg-green-50 border-green-200 text-green-600"
                            : "bg-blue-50 border-blue-200 text-blue-600"
                        }`}
                        title={apt.paymentMethod === "cash" ? "Efectivo" : "Transferencia"}
                      >
                        {apt.paymentMethod === "cash" ? (
                          <Banknote className="h-4 w-4" />
                        ) : (
                          <ArrowRightLeft className="h-4 w-4" />
                        )}
                      </div>
                    )}
                    {apt.status === "completed" && (
                      <button
                        onClick={() => togglePaid(apt.id, apt.paid)}
                        className={`shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md border transition-colors ${
                          apt.paid
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                            : "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                        }`}
                        title={apt.paid ? "Cobrado" : "No cobrado — clic para marcar"}
                      >
                        <CircleDollarSign className="h-4 w-4" />
                      </button>
                    )}
                    {apt.status === "completed" && apt.paymentMethod === "transfer" && !apt.paid && (
                      <button
                        onClick={() => togglePaid(apt.id, false)}
                        className="shrink-0 px-2.5 py-1 rounded-md border bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors text-[10px] font-medium inline-flex items-center gap-1"
                        title="Confirmar pago por transferencia"
                      >
                        <CircleDollarSign className="h-3.5 w-3.5" />
                        <span>Confirmar</span>
                      </button>
                    )}
                  </div>

                  {/* Nota inline */}
                  {apt.notes && (
                    <button
                      onClick={() => openNotes(apt)}
                      className="w-full text-left text-xs text-amber-700/80 bg-amber-50/60 border border-amber-200/40 rounded-md px-2.5 py-1.5 mt-2 hover:bg-amber-50 transition-colors cursor-pointer truncate"
                    >
                      <MessageSquare className="h-3 w-3 inline mr-1 opacity-50" />
                      {apt.notes}
                    </button>
                  )}

                  {/* Motivo cancelación */}
                  {apt.status === "cancelled" && apt.cancelReason && (
                    <div className="w-full text-xs text-red-600/80 bg-red-50/60 border border-red-200/40 rounded-md px-2.5 py-1.5 mt-2 truncate">
                      Motivo: {apt.cancelReason}
                    </div>
                  )}

                  {/* ── Fila 3: botones de acción ── */}
                  <div className="flex gap-2 mt-3">
                    {STATUS_ACTIONS.map((action) => {
                      const Icon = action.icon
                      const active = isActive(action.value)
                      return (
                        <button
                          key={action.value}
                          onClick={() => handleStatusChange(apt.id, action.value)}
                          aria-pressed={active}
                          className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-medium border transition-all duration-150 ${
                            active
                              ? `${action.activeBg} ${action.activeBorder} ${action.activeText}`
                              : `${action.inactiveBg} ${action.inactiveBorder} ${action.inactiveText}`
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="hidden sm:inline">{action.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar cliente">
                    {form.clientId && clients.find((c) => c.id === form.clientId)
                      ? `${clients.find((c) => c.id === form.clientId)!.firstName} ${clients.find((c) => c.id === form.clientId)!.lastName} (${clients.find((c) => c.id === form.clientId)!.phone || "sin teléfono"})`
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.phone || "sin teléfono"})</SelectItem>
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
                    {s.name} - ${s.price.toLocaleString("es-AR")}
                  </Button>
                ))}
              </div>
              {form.serviceIds.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Total: ${totalPrice.toLocaleString("es-AR")} · {totalDuration} min
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionales..." />
            </div>
            {lastCreated ? (
              <div className="flex gap-2">
                <Button type="button" onClick={sendWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setLastCreated(null) }} className="flex-1">
                  Cerrar
                </Button>
              </div>
            ) : (
              <Button type="submit" className="w-full" disabled={!form.clientId || form.serviceIds.length === 0}>
                Crear Turno
              </Button>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={notesDialog.open} onOpenChange={(open) => setNotesDialog({ open, apt: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nota del turno</DialogTitle>
          </DialogHeader>
          {notesDialog.apt && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {notesDialog.apt.identifier} · {notesDialog.apt.client.firstName} {notesDialog.apt.client.lastName}
              </div>
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Agregar nota..."
                className="w-full min-h-[100px] border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setNotesDialog({ open: false, apt: null })} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={saveNotes} className="flex-1">
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
