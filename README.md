# Gabriela Nails - Sistema de Reserva de Turnos

Sistema de gestión y reserva de turnos para manicurería. Next.js 16 + React 19 + Tailwind + SQLite.

## Funcionalidades

### Admin (`/admin`)
- **Dashboard** — Resumen con filtros (Hoy, 7d, 15d, 30d), estadísticas de turnos, facturación y clientes
- **Calendario** — Vistas Día / Semana / Mes, indicador de hora actual
- **Turnos** — Lista con filtros por estado, búsqueda, cambio de estado rápido
- **Clientes** — CRUD con búsqueda, tabla desktop / cards mobile
- **Servicios** — CRUD con color, categoría, duración y precio
- **Configuración** — Horarios de atención, días laborables, duración de slot, ventana de reservas, antelación de cancelación, horarios bloqueados

### Público (`/book`)
- Reserva en 4 pasos: DNI → Servicios → Fecha/Hora → Confirmación
- Registro automático de nuevos clientes
- Slots disponibles calculados automáticamente (respeta horarios, bloqueos, almuerzo)
- Validación de día laborable y horario bloqueado

### Autenticación
- Auth local con sesiones en cookie (mejora a Supabase cuando se configure)
- Credenciales test: `admin@gabrielanails.com` / `admin123`

## Stack

| Tecnología | Uso |
|------------|-----|
| Next.js 16 | Framework React con App Router |
| React 19 | UI |
| Tailwind CSS v4 | Estilos |
| shadcn/ui v4 (Base UI) | Componentes UI |
| better-sqlite3 | Base de datos local |
| Prisma | Migraciones (schema only) |
| Open Sans | Tipografía |
| Lucide Icons | Iconografía |

## Instalación

```bash
npm install
npx prisma migrate dev
node seed-admin.js   # Crea usuario admin de test
npm run dev
```

## Estructura

```
gabriela-nails/
├── src/
│   ├── app/
│   │   ├── admin/          # Panel administrativo
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── calendar/         # Calendario
│   │   │   ├── appointments/     # Turnos
│   │   │   ├── clients/          # Clientes
│   │   │   ├── services/         # Servicios
│   │   │   └── settings/         # Configuración
│   │   ├── api/            # API routes
│   │   ├── book/           # Reserva pública
│   │   └── login/          # Login
│   ├── components/         # UI components
│   └── lib/                # Utilidades, DB, tipos
├── prisma/                 # Schema y migraciones
└── dev.db                  # SQLite (no commitear)
```

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/services` | Listar servicios |
| POST | `/api/services` | Crear servicio |
| GET | `/api/clients` | Buscar clientes |
| POST | `/api/clients` | Crear cliente |
| GET | `/api/appointments` | Listar turnos |
| POST | `/api/appointments` | Crear turno (admin) |
| GET | `/api/calendar` | Datos calendario |
| GET | `/api/dashboard` | Stats dashboard |
| GET/PUT | `/api/settings` | Configuración |
| GET/POST/DELETE | `/api/settings/blocked-dates` | Horarios bloqueados |
| GET | `/api/book?dni=` | Buscar cliente por DNI |
| POST | `/api/book` | Crear turno público |
| GET | `/api/book/slots?date=` | Slots disponibles |

## Próximos pasos

- [ ] Notificaciones WhatsApp (YCloud)
- [ ] Notificaciones Gmail
- [ ] Sincronización Google Calendar
- [ ] Dashboard con gráficos analytics
- [ ] Bloquear horarios desde calendario admin
- [ ] Editar turno existente
- [ ] Exportar datos a CSV
- [ ] Dark mode
- [ ] PWA para móvil
