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
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { toast } from "@/components/ui/toast"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  birthDate: string | null
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    birthDate: "",
  })

  useEffect(() => {
    fetchClients()
  }, [debouncedSearch])

  async function fetchClients() {
    const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ""
    const res = await fetch(`/api/clients${params}`)
    if (!res.ok) {
      toast.add({ type: "error", title: "Error", description: "No se pudieron cargar los clientes." })
      setLoading(false)
      return
    }
    const data = await res.json()
    setClients(data)
    setLoading(false)
  }

  function openCreate() {
    setEditingClient(null)
    setForm({ firstName: "", lastName: "", email: "", phone: "", birthDate: "" })
    setDialogOpen(true)
  }

  function openEdit(client: Client) {
    setEditingClient(client)
    setForm({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email || "",
      phone: client.phone || "",
      birthDate: client.birthDate ? client.birthDate.split("T")[0] : "",
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients"
    const method = editingClient ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      setDialogOpen(false)
      fetchClients()
      toast.add({ type: "success", title: editingClient ? "Cliente actualizado" : "Cliente creado" })
    } else {
      const data = await res.json()
      toast.add({ type: "error", title: "Error", description: data.error || "No se pudo guardar el cliente." })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este cliente?")) return
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" })
    if (res.ok) {
      fetchClients()
      toast.add({ type: "success", title: "Cliente eliminado" })
    } else {
      toast.add({ type: "error", title: "Error", description: "No se pudo eliminar el cliente." })
    }
  }

  if (loading) {
    return <div className="text-center py-8">Cargando clientes...</div>
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description={`${clients.length} registrados`}
        actions={
          <Button onClick={openCreate} className="sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar nombre, teléfono, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {search ? "No se encontraron clientes" : "No hay clientes. Creá el primero."}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-sm">Nombre</th>
                  <th className="text-left p-3 font-medium text-sm">Teléfono</th>
                  <th className="text-left p-3 font-medium text-sm">Email</th>
                  <th className="text-left p-3 font-medium text-sm">Nacimiento</th>
                  <th className="text-right p-3 font-medium text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{client.firstName} {client.lastName}</td>
                    <td className="p-3 text-sm">{client.phone || "-"}</td>
                    <td className="p-3 text-muted-foreground text-sm">{client.email || "-"}</td>
                    <td className="p-3 text-muted-foreground text-sm">
                      {client.birthDate ? (() => { const [y,m,d] = client.birthDate.split("T")[0].split("-"); return `${d}/${m}/${y}` })() : "-"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(client)} aria-label="Editar cliente">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)} aria-label="Eliminar cliente">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {clients.map((client) => (
              <Card key={client.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 min-w-0">
                      <div className="font-medium">{client.firstName} {client.lastName}</div>
                      {client.phone && <div className="text-sm font-mono">{client.phone}</div>}
                      {client.email && <div className="text-sm text-muted-foreground truncate">{client.email}</div>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(client)} aria-label="Editar cliente">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)} aria-label="Eliminar cliente">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 15) })} placeholder="3855841593" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                <Input id="birthDate" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className="w-full" />
              </div>
            </div>
            <Button type="submit" className="w-full">{editingClient ? "Guardar Cambios" : "Crear Cliente"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
