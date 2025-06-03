import { Suspense } from "react";
import VistaVentas from "./componentes/VistaVentas";

export default function PageVentasGeneral() {
  return (
    <Suspense fallback={<div>Cargando venta...</div>}>
      <VistaVentas />
    </Suspense>
  );
}
