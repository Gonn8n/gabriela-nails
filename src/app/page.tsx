import { redirect } from "next/navigation"

export default function Home() {
  // Por ahora, redirigir al booking
  // En el futuro, mostrar una landing page
  redirect("/book")
}
