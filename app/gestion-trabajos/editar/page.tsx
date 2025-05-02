"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Import del formulario
const FormularioEdicion = dynamic(() => import("./FormularioEdicion.tsx"), {
  ssr: false,
});

export default function Page() {
  return (
    <Suspense fallback={<p className="text-center mt-10">Cargando edición...</p>}>
      <FormularioEdicion />
    </Suspense>
  );
}
