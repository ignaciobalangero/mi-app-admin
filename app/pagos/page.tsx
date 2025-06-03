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
  origen: "pagos" | "pagos";
}

export default function PagosPage() {
  const { rol } = useRol();
  const negocioID = rol?.negocioID ?? "";
  const [pagos, setPagos] = useState<PagoConOrigen[]>([]);

  return (
    <>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1600px] mx-auto">
          
          {/* Header de la página - Estilo GestiOne */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-4 mb-2 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">💰</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Gestión de Pagos
                </h1>
                <p className="text-blue-100 text-sm">
                  Administra todos los pagos y cobros de tu negocio
                </p>
              </div>
            </div>
          </div>

          {/* Formulario y tabla */}
          {negocioID && (
            <div className="space-y-8">
              <FormularioPago negocioID={negocioID} setPagos={setPagos} />
              <TablaPagos negocioID={negocioID} pagos={pagos} setPagos={setPagos} />
            </div>
          )}

          {/* Estado de carga - Estilo GestiOne */}
          {!negocioID && (
            <div className="bg-white rounded-2xl p-12 shadow-lg border border-[#ecf0f1] text-center">
              <div className="w-16 h-16 bg-[#ecf0f1] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏳</span>
              </div>
              <h3 className="text-xl font-semibold text-[#2c3e50] mb-2">
                Cargando información del negocio...
              </h3>
              <p className="text-[#7f8c8d]">
                Por favor espera mientras verificamos los permisos
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}