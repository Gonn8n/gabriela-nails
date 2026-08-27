"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Save, Plus, Trash2, Clock, CalendarDays, Ban } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { toast } from "@/components/ui/toast"

interface Settings {
  workingHoursStart: string
  workingHoursEnd: string
  slotDuration: number
  bookingWindowDays: number
  cancellationHours: number
  breakStart: string
  breakEnd: string
  workingDays: number[] // 0=Sun, 1=Mon, ..., 6=Sat
}

interface BlockedDate {
  id: string
  date: string
  startTime: string
  endTime: string
  reason: string | null
}

const defaultSettings: Settings = {
  workingHoursStart: "09:00",
  workingHoursEnd: "19:00",
  slotDuration: 30,
  bookingWindowDays: 30,
  cancellationHours: 3,
  breakStart: "12:00",
  breakEnd: "13:00",
  workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat by default
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const DAY_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [loading, setLoading] = useState(true)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockForm, setBlockForm] = useState({
    date: "",
    startTime: "08:00",
    endTime: "09:30",
    reason: "",
  })

  useEffect(() => {
    fetchSettings()
    fetchBlockedDates()
  }, [])

  async function fetchSettings() {
    const res = await fetch("/api/settings")
    if (res.ok) {
      const data = await res.json()
      setSettings({ ...defaultSettings, ...data, workingDays: data.workingDays || defaultSettings.workingDays })
    }
    setLoading(false)
  }

  async function fetchBlockedDates() {
    const res = await fetch("/api/settings/blocked-dates")
    if (res.ok) {
      setBlockedDates(await res.json())
    }
  }

  async function handleSave() {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    if (res.ok) {
      toast.add({ type: "success", title: "Configuración guardada" })
    } else {
      toast.add({ type: "error", title: "Error", description: "No se pudo guardar la configuración." })
    }
  }

  function toggleDay(day: number) {
    setSettings((prev) => {
      const days = prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day].sort()
      return { ...prev, workingDays: days }
    })
  }

  async function handleAddBlockedDate(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/settings/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blockForm),
    })
    if (res.ok) {
      setBlockDialogOpen(false)
      setBlockForm({ date: "", startTime: "08:00", endTime: "09:30", reason: "" })
      fetchBlockedDates()
      toast.add({ type: "success", title: "Horario bloqueado" })
    } else {
      toast.add({ type: "error", title: "Error", description: "No se pudo bloquear el horario." })
    }
  }

  async function handleDeleteBlockedDate(id: string) {
    if (!confirm("¿Eliminar este bloqueo?")) return
    const res = await fetch(`/api/settings/blocked-dates?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      fetchBlockedDates()
      toast.add({ type: "success", title: "Bloqueo eliminado" })
    } else {
      toast.add({ type: "error", title: "Error", description: "No se pudo eliminar el bloqueo." })
    }
  }

  if (loading) return <div className="text-center py-8">Cargando configuración...</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Horarios, reglas y días de atención"
        actions={
          <Button onClick={handleSave} className="sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        }
      />

      {/* Row 1: Working hours + Break */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horarios de Atención
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Apertura</Label>
                <Input id="start" type="time" value={settings.workingHoursStart} onChange={(e) => setSettings({ ...settings, workingHoursStart: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Cierre</Label>
                <Input id="end" type="time" value={settings.workingHoursEnd} onChange={(e) => setSettings({ ...settings, workingHoursEnd: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="breakStart">Almuerzo desde</Label>
                <Input id="breakStart" type="time" value={settings.breakStart} onChange={(e) => setSettings({ ...settings, breakStart: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breakEnd">Almuerzo hasta</Label>
                <Input id="breakEnd" type="time" value={settings.breakEnd} onChange={(e) => setSettings({ ...settings, breakEnd: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Días de Atención
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Seleccioná los días de la semana que atendés</p>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((name, i) => (
                <Button
                  key={i}
                  variant={settings.workingDays.includes(i) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(i)}
                  className="w-14 h-10 text-xs"
                >
                  {name}
                </Button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {settings.workingDays.length > 0
                ? `Atiende ${settings.workingDays.map((d) => DAY_FULL[d]).join(", ")}`
                : "Sin días configurados"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Booking rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reglas de Agendamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="slotDuration">Duración del slot (min)</Label>
              <Input id="slotDuration" type="number" value={settings.slotDuration} onChange={(e) => setSettings({ ...settings, slotDuration: parseInt(e.target.value) || 30 })} />
              <p className="text-xs text-muted-foreground">Intervalo de tiempo para cada turno disponible (ej: 30 = turnos a las 9:00, 9:30, 10:00...)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingWindow">Ventana de reservas (días)</Label>
              <Input id="bookingWindow" type="number" value={settings.bookingWindowDays} onChange={(e) => setSettings({ ...settings, bookingWindowDays: parseInt(e.target.value) || 30 })} />
              <p className="text-xs text-muted-foreground">Cuántos días adelante puede reservar un cliente</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancellation">Antelación cancelación (hs)</Label>
              <Input id="cancellation" type="number" value={settings.cancellationHours} onChange={(e) => setSettings({ ...settings, cancellationHours: parseInt(e.target.value) || 2 })} />
              <p className="text-xs text-muted-foreground">Horas mínimas antes para cancelar o reprogramar un turno</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Blocked dates */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Horarios Bloqueados
            </CardTitle>
            <Button size="sm" onClick={() => setBlockDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Horarios y días que no estarán disponibles para reserva. El cliente no los verá al agendar.
          </p>
          {blockedDates.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg bg-muted/20">
              No hay horarios bloqueados. Clickeá &quot;Agregar&quot; para bloquear un día u horario específico.
            </div>
          ) : (
            <div className="space-y-2">
              {blockedDates.map((bd) => (
                <div key={bd.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="destructive" className="text-xs shrink-0">Bloqueado</Badge>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {new Date(bd.date + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {bd.startTime} - {bd.endTime}
                        {bd.reason && ` · ${bd.reason}`}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteBlockedDate(bd.id)} className="shrink-0" aria-label="Eliminar bloqueo">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add blocked date dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bloquear Horario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBlockedDate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blockDate">Fecha *</Label>
              <Input id="blockDate" type="date" value={blockForm.date} onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blockStart">Desde *</Label>
                <Input id="blockStart" type="time" value={blockForm.startTime} onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blockEnd">Hasta *</Label>
                <Input id="blockEnd" type="time" value={blockForm.endTime} onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blockReason">Motivo (opcional)</Label>
              <Input id="blockReason" value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} placeholder="Ej: Visita al médico, feriado..." />
            </div>
            <Button type="submit" className="w-full" disabled={!blockForm.date}>
              Bloquear Horario
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
