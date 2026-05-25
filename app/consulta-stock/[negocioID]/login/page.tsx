import { Suspense } from "react";
import TiendaLoginCliente from "./TiendaLoginCliente";

export default async function Page({ params }: { params: Promise<{ negocioID: string }> }) {
  const { negocioID } = await params;
  return (
    <Suspense
      fallback={
        <div data-tienda-publica className="min-h-screen bg-neutral-100 py-10 text-center text-sm text-neutral-600">
          Cargando…
        </div>
      }
    >
      <TiendaLoginCliente negocioID={negocioID} />
    </Suspense>
  );
}
