"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirige a la pestaña WhatsApp dentro de Configuraciones. */
export default function ConfiguracionWhatsappRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/configuraciones?tab=whatsapp");
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center text-[#7f8c8d]">
      Redirigiendo a Configuraciones → WhatsApp…
    </main>
  );
}
