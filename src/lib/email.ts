import { getGmailTransport, GMAIL_USER } from "./google"

interface AppointmentData {
  identifier: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  paymentMethod: string | null
  services: string
}

interface ClientData {
  firstName: string
  lastName: string
  email: string | null
}

function formatDateEs(dateStr: string): string {
  const [y, m, d] = dateStr.split("-")
  const date = new Date(`${dateStr}T12:00:00`)
  const weekday = date.toLocaleDateString("es-AR", { weekday: "long" })
  return `${weekday} ${d}/${m}/${y}`
}

function buildConfirmationHtml(apt: AppointmentData, client: ClientData): string {
  const paymentSection = apt.paymentMethod === "transfer"
    ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-top:16px;">
      <p style="font-weight:600;color:#1e40af;margin:0 0 8px;">Datos para transferir</p>
      <table style="font-size:14px;color:#1e3a8a;">
        <tr><td style="padding:2px 12px 2px 0;color:#3b82f6;">Alias</td><td style="font-weight:600;">gabriela.c.24</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#3b82f6;">Titular</td><td>Gabriela Analia Carabajal</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#3b82f6;">CUIT</td><td>27-29376460-9</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#3b82f6;">Banco</td><td>Galicia</td></tr>
      </table>
    </div>`
    : ""

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;">
    <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <h1 style="color:#16a34a;font-size:24px;margin:0 0 8px;">Turno Confirmado</h1>
      <p style="color:#6b7280;margin:0 0 24px;">${client.firstName} ${client.lastName}, tu turno está confirmado.</p>

      <table style="width:100%;font-size:15px;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Identificador</td>
          <td style="padding:8px 0;font-weight:600;border-bottom:1px solid #f3f4f6;text-align:right;">${apt.identifier}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Fecha</td>
          <td style="padding:8px 0;font-weight:600;border-bottom:1px solid #f3f4f6;text-align:right;">${formatDateEs(apt.date)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Hora</td>
          <td style="padding:8px 0;font-weight:600;border-bottom:1px solid #f3f4f6;text-align:right;">${apt.startTime} - ${apt.endTime}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;border-bottom:1px solid #f3f4f6;">Servicios</td>
          <td style="padding:8px 0;font-weight:600;border-bottom:1px solid #f3f4f6;text-align:right;">${apt.services}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Forma de pago</td>
          <td style="padding:8px 0;font-weight:600;text-align:right;">${apt.paymentMethod === "cash" ? "Efectivo" : "Transferencia"}</td>
        </tr>
      </table>

      <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin-top:24px;text-align:center;">
        <span style="font-size:28px;font-weight:700;color:#16a34a;">$${apt.totalPrice.toLocaleString("es-AR")}</span>
      </div>

      ${paymentSection}

      <div style="margin-top:24px;text-align:center;">
        <p style="color:#4b5563;font-size:13px;margin:0 0 4px;">
          📍 Sector A · Grupo B · Fracción 21 · Dpto 62
          <br />
          Bº Ejército Argentino, Santiago del Estero
        </p>
        <p style="margin:8px 0 0;">
          <a href="https://www.google.com/maps/search/-27.828931,+-64.249253" style="color:#3b82f6;text-decoration:none;font-size:13px;font-weight:600;">Ver en el mapa</a>
          <span style="color:#d1d5db;margin:0 8px;">|</span>
          <a href="https://wa.me/543854729522?text=Hola!%20Quiero%20consultar%20por%20turnos" style="color:#25D366;text-decoration:none;font-size:13px;font-weight:600;">WhatsApp</a>
        </p>
      </div>

      <p style="color:#9ca3af;font-size:12px;margin-top:16px;text-align:center;">
        Gabriela Nails · Reservá tu turno en www.gabriela.com.ar
      </p>
    </div>
  </body>
  </html>`
}

export async function sendAppointmentConfirmation(
  apt: AppointmentData,
  client: ClientData
): Promise<boolean> {
  if (!client.email) return false

  try {
    const transport = getGmailTransport()
    await transport.sendMail({
      from: `Gabriela Nails <${GMAIL_USER}>`,
      to: client.email,
      subject: `Confirmación turno ${apt.identifier}`,
      html: buildConfirmationHtml(apt, client),
    })
    return true
  } catch (error) {
    console.error("Error sending email:", error)
    return false
  }
}
