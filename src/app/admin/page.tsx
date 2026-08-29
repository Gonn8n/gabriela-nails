"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Calendar, Users, DollarSign, Clock, RefreshCw, CircleDollarSign, AlertTriangle, MessageCircle, Pencil, CheckCircle, XCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { useDashboardCache } from "@/hooks/use-dashboard-cache"
import { toast } from "@/components/ui/toast"

const RANGE_OPTIONS = [
  { value: "today", label: "Hoy" },
  { value: "7", label: "7 días" },
  { value: "15", label: "15 días" },
  { value: "30", label: "30 días" },
]

const STATUS_LABELS: Record<string, string> = {
  booked: "Reservado",
  confirmed: "Confirmado",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
  rescheduled: "Reprogramado",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  booked: "default",
  confirmed: "secondary",
  in_progress: "outline",
  completed: "secondary",
  cancelled: "destructive",
  rescheduled: "outline",
}

interface DashboardService {
  serviceId: string
  service: { id: string; name: string; color: string; price: number; duration: number }
}

interface DashboardClient {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
}

interface DashboardAppointment {
  id: string
  identifier: string
  date: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  paid: boolean
  client: DashboardClient | null
  services: DashboardService[]
}

interface Service {
  id: string
  name: string
  duration: number
  price: number
  color: string
}

interface Client {
  id: string
  firstName: string
  lastName: string
  phone: string | null
}

export default function DashboardPage() {
  const [range, setRange] = useState("today")
  const { data, loading, fetchData, invalidate } = useDashboardCache()
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; apt: DashboardAppointment | null }>({ open: false, apt: null })
  const [editDialog, setEditDialog] = useState<{ open: boolean; apt: DashboardAppointment | null }>({ open: false, apt: null })
  const [allServices, setAllServices] = useState<Service[]>([])
  const [allClients, setAllClients] = useState<Client[]>([])
  const [editForm, setEditForm] = useState({ clientId: "", date: "", startTime: "10:00", serviceIds: [] as string[] })

  useEffect(() => {
    fetchData(range)
  }, [range, fetchData])

  async function fetchServicesAndClients() {
    const [srvRes, cliRes] = await Promise.all([
      fetch("/api/services"),
      fetch("/api/clients"),
    ])
    if (srvRes.ok) setAllServices(await srvRes.json())
    if (cliRes.ok) setAllClients(await cliRes.json())
  }

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split("-")
    return `${d}/${m}`
  }

  function formatDateLong(dateStr: string) {
    const date = new Date(dateStr + "T12:00:00")
    return date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
  }

  function openEdit(apt: DashboardAppointment) {
    setEditDialog({ open: true, apt })
    setEditForm({
      clientId: apt.client?.id || "",
      date: apt.date,
      startTime: apt.startTime,
      serviceIds: apt.services.map((s) => s.serviceId),
    })
    fetchServicesAndClients()
  }

  function toggleEditService(serviceId: string) {
    setEditForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }))
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editDialog.apt) return
    const res = await fetch(`/api/appointments/${editDialog.apt.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: editForm.clientId,
        date: editForm.date,
        startTime: editForm.startTime,
        serviceIds: editForm.serviceIds,
      }),
    })
    if (res.ok) {
      toast.add({ type: "success", title: "Turno actualizado" })
      setEditDialog({ open: false, apt: null })
      setDetailDialog({ open: false, apt: null })
      invalidate()
      fetchData(range)
    } else {
      const data = await res.json().catch(() => null)
      toast.add({ type: "error", title: "Error", description: data?.error || "No se pudo actualizar el turno." })
    }
  }

  async function changeStatus(id: string, status: string) {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.add({ type: "success", title: "Estado actualizado" })
      setDetailDialog({ open: false, apt: null })
      invalidate()
      fetchData(range)
    } else {
      toast.add({ type: "error", title: "Error", description: "No se pudo actualizar el estado." })
    }
  }

  async function togglePaid(id: string, currentPaid: boolean) {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !currentPaid }),
    })
    if (res.ok) {
      toast.add({ type: "success", title: currentPaid ? "Marcado como no cobrado" : "Marcado como cobrado" })
      setDetailDialog({ open: false, apt: null })
      invalidate()
      fetchData(range)
    } else {
      toast.add({ type: "error", title: "Error", description: "No se pudo actualizar el cobro." })
    }
  }

  function sendWhatsApp(apt: DashboardAppointment) {
    const clientName = apt.client?.firstName || "Cliente"
    const services = apt.services.map((s) => s.service.name).join(", ")
    const [y, m, d] = apt.date.split("-")
    const msg = `Hola ${clientName}, te confirmamos tu turno:\n\n📅 Fecha: ${d}/${m}\n⏰ Hora: ${apt.startTime} - ${apt.endTime}\n💅 Servicios: ${services}\n💰 Total: $${apt.totalPrice.toLocaleString("es-AR")}\n\n¡Te esperamos!\nGabriela Nails`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
  }

  const editServices = allServices.filter((s) => editForm.serviceIds.includes(s.id))
  const editTotalPrice = editServices.reduce((sum, s) => sum + s.price, 0)
  const editTotalDuration = editServices.reduce((sum, s) => sum + s.duration, 0)

  if (loading || !data) {
    return <div className="text-center py-8">Cargando dashboard...</div>
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description={range === "today" ? "Resumen del día" : `Próximos ${range} días`}
        actions={
          <div className="flex gap-1 border rounded-md p-0.5" role="group" aria-label="Rango de fechas">
            {RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={range === opt.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setRange(opt.value)}
                className="text-xs px-3"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        }
      />

      {/* Row 1: Métricas principales */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Turnos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.upcomingCount + data.completedCount}</div>
            <p className="text-xs text-muted-foreground">{data.completedCount} finalizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Cobrado</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{data.paidCount}</div>
            <p className="text-xs text-muted-foreground">turnos cobrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Facturación</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">${data.revenue.toLocaleString("es-AR")}</div>
            <p className="text-xs text-muted-foreground">cobrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Métricas secundarias */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Reservados</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.upcomingCount}</div>
            <p className="text-xs text-muted-foreground">agendados, pendientes</p>
          </CardContent>
        </Card>
        <Card className={data.unpaidCompletedCount > 0 ? "border-amber-300 bg-amber-50/30" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Pendiente de cobro</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${data.unpaidCompletedCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.unpaidCompletedCount > 0 ? "text-amber-600" : ""}`}>
              {data.unpaidCompletedCount}
            </div>
            <p className="text-xs text-muted-foreground">finalizados sin cobrar</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalClients}</div>
            <p className="text-xs text-muted-foreground">registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats secundarias */}
      {(data.rescheduledCount > 0 || data.cancelledCount > 0) && (
        <div className="flex gap-3 flex-wrap">
          {data.rescheduledCount > 0 && (
            <div className="flex items-center gap-2 text-sm bg-card border rounded-lg px-3 py-2">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">Reprogramados:</span>
              <span className="font-semibold">{data.rescheduledCount}</span>
            </div>
          )}
          {data.cancelledCount > 0 && (
            <div className="flex items-center gap-2 text-sm bg-card border rounded-lg px-3 py-2">
              <span className="text-muted-foreground">Cancelados:</span>
              <span className="font-semibold">{data.cancelledCount}</span>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {range === "today" ? "Turnos de Hoy" : "Turnos del Período"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.todayAppointments.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">No hay turnos en este período</p>
          ) : (
            <div className="space-y-3">
              {data.todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg gap-3 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onDoubleClick={() => setDetailDialog({ open: true, apt })}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-center shrink-0 w-16">
                      <div className="text-[10px] text-muted-foreground font-medium">{formatDate(apt.date)}</div>
                      <div className="text-sm font-bold">{apt.startTime}</div>
                      <div className="text-[10px] text-muted-foreground">{apt.endTime}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{apt.client?.firstName} {apt.client?.lastName}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {apt.services.map((s) => s.service.name).join(", ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <Badge variant={STATUS_VARIANTS[apt.status] || "default"} className="text-[10px]">
                      {STATUS_LABELS[apt.status] || apt.status}
                    </Badge>
                    <div className="flex items-center gap-1.5 mt-1">
                      {apt.status === "completed" && (
                        <CircleDollarSign className={`h-3.5 w-3.5 ${apt.paid ? "text-emerald-500" : "text-amber-400"}`} />
                      )}
                      <span className="text-sm font-medium">${apt.totalPrice.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog({ open, apt: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailDialog.apt?.identifier}
              <Badge variant={STATUS_VARIANTS[detailDialog.apt?.status || "default"]} className="text-xs">
                {STATUS_LABELS[detailDialog.apt?.status || ""]}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {detailDialog.apt && (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Cliente</div>
                <div className="font-medium">{detailDialog.apt.client?.firstName} {detailDialog.apt.client?.lastName}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Fecha</div>
                  <div className="font-medium text-sm">{formatDateLong(detailDialog.apt.date)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Horario</div>
                  <div className="font-medium text-sm">{detailDialog.apt.startTime} - {detailDialog.apt.endTime}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Servicios</div>
                <div className="space-y-1">
                  {detailDialog.apt.services.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.service.color }} />
                      {s.service.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-lg font-bold">${detailDialog.apt.totalPrice.toLocaleString("es-AR")}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Estado de cobro</div>
                <div className="flex items-center gap-1.5">
                  <CircleDollarSign className={`h-4 w-4 ${detailDialog.apt.paid ? "text-emerald-500" : "text-amber-400"}`} />
                  <span className="text-sm font-medium">{detailDialog.apt.paid ? "Cobrado" : "Sin cobrar"}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => sendWhatsApp(detailDialog.apt!)}>
                  <MessageCircle className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(detailDialog.apt!)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              </div>
              {detailDialog.apt.status === "booked" && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => changeStatus(detailDialog.apt!.id, "completed")}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Finalizar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => changeStatus(detailDialog.apt!.id, "cancelled")}>
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              )}
              {detailDialog.apt.status === "completed" && !detailDialog.apt.paid && (
                <Button variant="outline" size="sm" className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => togglePaid(detailDialog.apt!.id, false)}>
                  <CircleDollarSign className="h-4 w-4 mr-1" />
                  Marcar como cobrado
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, apt: null })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Turno {editDialog.apt?.identifier}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={editForm.clientId} onValueChange={(v) => setEditForm({ ...editForm, clientId: v || "" })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar cliente">
                    {editForm.clientId && allClients.find((c) => c.id === editForm.clientId)
                      ? `${allClients.find((c) => c.id === editForm.clientId)!.firstName} ${allClients.find((c) => c.id === editForm.clientId)!.lastName}`
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.phone || "sin tel."})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Hora *</Label>
                <Input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Servicios *</Label>
              <div className="flex flex-wrap gap-2">
                {allServices.map((s) => (
                  <Button key={s.id} type="button" variant={editForm.serviceIds.includes(s.id) ? "default" : "outline"} onClick={() => toggleEditService(s.id)} className="text-sm">
                    {s.name} - ${s.price.toLocaleString("es-AR")}
                  </Button>
                ))}
              </div>
              {editForm.serviceIds.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Total: ${editTotalPrice.toLocaleString("es-AR")} · {editTotalDuration} min
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setEditDialog({ open: false, apt: null })} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={!editForm.clientId || editForm.serviceIds.length === 0} className="flex-1">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
