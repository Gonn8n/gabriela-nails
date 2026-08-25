"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { NailIcon } from "@/components/icons"

interface Service {
  id: string
  name: string
  description: string | null
  duration: number
  price: number
  color: string
  category: string | null
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration: "",
    price: "",
    color: "#e91e63",
    category: "",
  })

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    const res = await fetch("/api/services")
    const data = await res.json()
    setServices(data)
    setLoading(false)
  }

  function openCreate() {
    setEditingService(null)
    setForm({ name: "", description: "", duration: "", price: "", color: "#e91e63", category: "" })
    setDialogOpen(true)
  }

  function openEdit(service: Service) {
    setEditingService(service)
    setForm({
      name: service.name,
      description: service.description || "",
      duration: service.duration.toString(),
      price: service.price.toString(),
      color: service.color,
      category: service.category || "",
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editingService ? `/api/services/${editingService.id}` : "/api/services"
    const method = editingService ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      setDialogOpen(false)
      fetchServices()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este servicio?")) return
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" })
    if (res.ok) fetchServices()
  }

  if (loading) {
    return <div className="text-center py-8">Cargando servicios...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
          <p className="text-sm text-muted-foreground">Gestiona los servicios de manicura</p>
        </div>
        <Button onClick={openCreate} className="sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Servicio
        </Button>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay servicios. Creá el primero para empezar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: service.color }} />
                  <CardTitle className="text-base">{service.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(service)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {service.description && (
                  <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{service.duration} min</span>
                  <span className="font-semibold">${service.price.toFixed(2)}</span>
                </div>
                {service.category && (
                  <span className="inline-block mt-2 text-xs bg-muted px-2 py-1 rounded">{service.category}</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Manicura clásica" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción del servicio" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duración (min) *</Label>
                <Input id="duration" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="45" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio *</Label>
                <Input id="price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="2500" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border" />
                  <Input id="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="#e91e63" className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ej: Básico" />
              </div>
            </div>
            <Button type="submit" className="w-full">{editingService ? "Guardar Cambios" : "Crear Servicio"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
