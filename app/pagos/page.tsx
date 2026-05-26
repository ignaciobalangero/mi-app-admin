"use client";

import { useState } from "react";
import Header from "../Header";
import AdminPageMain from "@/app/components/AdminPageMain";
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
  detallesPago?: {
    tipo?: string;
    montoARSOriginal?: number;
    cotizacionPago?: number;
  };
  origen: "pagos" | "pagos";
}

export default function PagosPage() {
  const { rol } = useRol();
  const negocioID = rol?.negocioID ?? "";
  const [pagos, setPagos] = useState<PagoConOrigen[]>([]);

  return (
    <>
      <Header />
      <AdminPageMain>
          {/* Header de la página - Estilo GestiOne */}
          <div className="mb-2 rounded-2xl border border-[#ecf0f1] bg-gradient-to-r from-[#2c3e50] to-[#3498db] p-3 shadow-lg sm:p-4">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 sm:h-14 sm:w-14">
                <span className="text-3xl sm:text-4xl">💰</span>
              </div>
              <div>
                <h1 className="mb-1 text-xl font-bold text-white sm:text-2xl">
                  Gestión de Pagos
                </h1>
                <p className="text-sm text-blue-100">
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
      </AdminPageMain>
    </>
  );
}