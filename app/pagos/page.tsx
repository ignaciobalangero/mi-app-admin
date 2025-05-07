// Archivo: app/pagos/page.tsx

"use client";

import { useState } from "react";
import Header from "../Header";
import FormularioPago from "./componentes/FormularioPago";
import TablaPagos from "./componentes/TablaPagos";
import { useRol } from "@/lib/useRol";

export interface PagoConOrigen {
  id: string;
  fecha: any;
  cliente: string;
  monto?: number;
  montoUSD?: number;
  moneda: string;
  forma: string;
  destino?: string;
  cotizacion?: number;
  origen: "pagos" | "pagoClientes";
}

export default function PagosPage() {
  const { rol } = useRol();
  const negocioID = rol?.negocioID ?? "";
  interface PagoConFecha extends PagoConOrigen {
    fechaParseada: Date | null;
  }
  
  const [pagos, setPagos] = useState<PagoConFecha[]>([]);
  

  return (
    <>
      <Header />
      <main className="pt-28 p-4 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold mb-4 text-black">Pagos de clientes</h1>
        <FormularioPago negocioID={negocioID} setPagos={setPagos} />
        <TablaPagos negocioID={negocioID} pagos={pagos} setPagos={setPagos} />
      </main>
    </>
  );
}
