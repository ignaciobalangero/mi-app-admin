"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import RequireAdmin from "@/lib/RequireAdmin";
import Header from "../Header";
import Link from "next/link";
import { useRol } from "@/lib/useRol";

interface Trabajo {
  cliente: string;
  precio?: number | string;
  estado: string;
  moneda?: "ARS" | "USD";
}

interface Pago {
  cliente: string;
  monto?: number | null;
  montoUSD?: number | null;
  moneda: "ARS" | "USD";
  fecha: string;
}

interface CuentaCorriente {
  cliente: string;
  saldoPesos: number;
  saldoUSD: number;
}

export default function CuentaCorrientePage() {
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [user] = useAuthState(auth);
  const { rol } = useRol();
  const [negocioID, setNegocioID] = useState<string>("");

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);

  useEffect(() => {
    const cargarCuentas = async () => {
      if (!negocioID) return;

      const trabajosSnap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
      const pagosSnap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
      const ventasSnap = await getDocs(collection(db, `negocios/${negocioID}/ventasGeneral`));

      const cuentasMap: { [cliente: string]: { saldoPesos: number; saldoUSD: number } } = {};

      // Procesar trabajos
      trabajosSnap.forEach((doc) => {
        const data = doc.data() as Trabajo;
        if (data.estado !== "ENTREGADO" && data.estado !== "PAGADO") return;

        const cliente = data.cliente;
        const precio = Number(data.precio || 0);
        const moneda = data.moneda || "ARS";

        if (!cuentasMap[cliente]) {
          cuentasMap[cliente] = { saldoPesos: 0, saldoUSD: 0 };
        }

        if (moneda === "ARS") {
          cuentasMap[cliente].saldoPesos += precio;
        } else {
          cuentasMap[cliente].saldoUSD += precio;
        }
      });

      // Procesar ventas de ventasGeneral

// Procesar ventas de ventasGeneral
ventasSnap.forEach((doc) => {
  const data = doc.data();
  const cliente = data.cliente;
  const productos = data.productos || [];

  if (!cliente || productos.length === 0) return;

  if (!cuentasMap[cliente]) {
    cuentasMap[cliente] = { saldoPesos: 0, saldoUSD: 0 };
  }

  // ✅ LEER EXACTAMENTE COMO MUESTRA LA TABLA DE VENTAS
  const hayTelefono = productos.some((prod: any) => prod.categoria === "Teléfono");

  let totalVentaPesos = 0;
  let totalVentaUSD = 0;

  productos.forEach((p: any) => {
    if (hayTelefono) {
      // CON TELÉFONO: Mostrar moneda original
      if (p.categoria === "Teléfono") {
        totalVentaUSD += p.precioUnitario * p.cantidad;
      } else {
        // Accesorio/Repuesto: Según su moneda original
        if (p.moneda?.toUpperCase() === "USD") {
          totalVentaUSD += p.precioUnitario * p.cantidad;
        } else {
          totalVentaPesos += p.precioUnitario * p.cantidad;
        }
      }
    } else {
      // SIN TELÉFONO: TODO en pesos (no usar cotización aquí)
      totalVentaPesos += p.precioUnitario * p.cantidad;
    }
  });

  // Sumar a la cuenta del cliente
  cuentasMap[cliente].saldoPesos += totalVentaPesos;
  cuentasMap[cliente].saldoUSD += totalVentaUSD;
});

      // Procesar pagos
      pagosSnap.forEach((doc) => {
        const data = doc.data() as Pago;
        const cliente = data.cliente;
        const moneda = data.moneda || "ARS";

        if (!cuentasMap[cliente]) {
          cuentasMap[cliente] = { saldoPesos: 0, saldoUSD: 0 };
        }

        if (moneda === "ARS") {
          const monto = Number(data.monto || 0);
          cuentasMap[cliente].saldoPesos -= monto;
        } else {
          const montoUSD = Number(data.montoUSD || 0);
          cuentasMap[cliente].saldoUSD -= montoUSD;
        }
      });

      const cuentasFinales = Object.entries(cuentasMap)
        .map(([cliente, valores]) => ({
          cliente,
          saldoPesos: valores.saldoPesos,
          saldoUSD: valores.saldoUSD,
        }))
        .filter((c) => c.saldoPesos !== 0 || c.saldoUSD !== 0);

      setCuentas(cuentasFinales);
    };

    cargarCuentas();
  }, [negocioID]);

  const cuentasFiltradas = cuentas.filter((c) =>
    c.cliente.toLowerCase().includes(filtroCliente.toLowerCase())
  );

  const formatPesos = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(num);

  const formatUSD = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(num);

  const totalPesos = cuentas.reduce((acum, c) => acum + c.saldoPesos, 0);
  const totalUSD = cuentas.reduce((acum, c) => acum + c.saldoUSD, 0);

  return (
    <RequireAdmin>
      <Header />
      <main className="pt-20 min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header principal */}
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-xl flex items-center justify-center">
                  <span className="text-xl sm:text-2xl text-white">💳</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#2c3e50]">Cuenta Corriente</h1>
                  <p className="text-sm sm:text-base text-[#7f8c8d]">Gestión de saldos y deudas</p>
                </div>
              </div>
              
              <Link
                href="/pagos"
                className="bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <span>💰</span>
                Ir a Pagos
              </Link>
            </div>
          </div>

          {/* Resumen de totales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] rounded-xl shadow-lg p-4 sm:p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">💵</span>
                </div>
                <div>
                  <p className="text-sm text-red-100">Deuda Total ARS</p>
                  <p className="text-lg sm:text-xl font-bold">{formatPesos(totalPesos)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] rounded-xl shadow-lg p-4 sm:p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">💲</span>
                </div>
                <div>
                  <p className="text-sm text-orange-100">Deuda Total USD</p>
                  <p className="text-lg sm:text-xl font-bold">{formatUSD(totalUSD)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-[#27ae60] to-[#229954] rounded-xl shadow-lg p-4 sm:p-6 text-white sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">👥</span>
                </div>
                <div>
                  <p className="text-sm text-green-100">Total Clientes</p>
                  <p className="text-lg sm:text-xl font-bold">{cuentasFiltradas.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <label className="text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">🔍</span>
                Buscar cliente:
              </label>
              <input
                type="text"
                placeholder="🔍 Filtrar por cliente..."
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="flex-1 max-w-md p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
              />
            </div>
          </div>

          {/* Tabla principal */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#ecf0f1]">
            
            {/* Header de la tabla */}
            <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-lg sm:text-2xl">💳</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">Saldos por Cliente</h3>
                  <p className="text-blue-100 text-xs sm:text-sm">
                    {cuentasFiltradas.length} {cuentasFiltradas.length === 1 ? 'cliente' : 'clientes'} con saldo
                  </p>
                </div>
              </div>
            </div>

            {/* Tabla responsive */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead className="bg-[#ecf0f1]">
                  <tr>
                    <th className="p-3 sm:p-4 text-left text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                      <span className="flex items-center gap-2">
                        <span>👤</span>
                        Cliente
                      </span>
                    </th>
                    <th className="p-3 sm:p-4 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                      <span className="flex items-center justify-center gap-2">
                        <span>💵</span>
                        Saldo ARS
                      </span>
                    </th>
                    <th className="p-3 sm:p-4 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                      <span className="flex items-center justify-center gap-2">
                        <span>💲</span>
                        Saldo USD
                      </span>
                    </th>
                    <th className="p-3 sm:p-4 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                      <span className="flex items-center justify-center gap-2">
                        <span>📊</span>
                        Estado
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cuentasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 sm:p-12 text-center text-[#7f8c8d] border border-[#bdc3c7]">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                            <span className="text-2xl sm:text-3xl">💳</span>
                          </div>
                          <div>
                            <p className="text-sm sm:text-lg font-medium text-[#7f8c8d]">
                              {cuentas.length === 0 ? "No hay cuentas con saldo" : "No se encontraron resultados"}
                            </p>
                            <p className="text-xs sm:text-sm text-[#bdc3c7]">
                              {cuentas.length === 0 
                                ? "Las cuentas aparecerán aquí cuando haya saldos pendientes"
                                : "Intenta ajustar el filtro de búsqueda"
                              }
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cuentasFiltradas.map((cuenta, index) => {
                      const tieneDeuda = cuenta.saldoPesos > 0 || cuenta.saldoUSD > 0;
                      const tieneFavor = cuenta.saldoPesos < 0 || cuenta.saldoUSD < 0;
                      
                      return (
                        <tr
                          key={cuenta.cliente}
                          className={`transition-colors duration-200 hover:bg-[#ecf0f1] border border-[#bdc3c7] ${
                            tieneFavor ? "bg-green-50" : tieneDeuda ? "bg-red-50" : "bg-white"
                          }`}
                        >
                          <td className="p-3 sm:p-4 border border-[#bdc3c7]">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                tieneFavor ? "bg-[#27ae60]" : tieneDeuda ? "bg-[#e74c3c]" : "bg-[#7f8c8d]"
                              }`}>
                                {cuenta.cliente.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm sm:text-base font-medium text-[#2c3e50]">
                                {cuenta.cliente}
                              </span>
                            </div>
                          </td>
                          
                          <td className="p-3 sm:p-4 text-center border border-[#bdc3c7]">
                            <span className={`text-sm sm:text-base font-bold ${
                              cuenta.saldoPesos > 0 ? "text-[#e74c3c]" : cuenta.saldoPesos < 0 ? "text-[#27ae60]" : "text-[#7f8c8d]"
                            }`}>
                              {formatPesos(cuenta.saldoPesos)}
                            </span>
                          </td>
                          
                          <td className="p-3 sm:p-4 text-center border border-[#bdc3c7]">
                            <span className={`text-sm sm:text-base font-bold ${
                              cuenta.saldoUSD > 0 ? "text-[#e74c3c]" : cuenta.saldoUSD < 0 ? "text-[#27ae60]" : "text-[#7f8c8d]"
                            }`}>
                              {formatUSD(cuenta.saldoUSD)}
                            </span>
                          </td>
                          
                          <td className="p-3 sm:p-4 text-center border border-[#bdc3c7]">
                            <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                              tieneFavor 
                                ? "bg-[#27ae60] text-white"
                                : tieneDeuda
                                ? "bg-[#e74c3c] text-white"
                                : "bg-[#7f8c8d] text-white"
                            }`}>
                              {tieneFavor ? "💚 A Favor" : tieneDeuda ? "🔴 Debe" : "⚪ Sin Saldo"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer de la tabla */}
            {cuentasFiltradas.length > 0 && (
              <div className="bg-[#f8f9fa] px-3 sm:px-6 py-3 sm:py-4 border-t border-[#bdc3c7]">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#7f8c8d]">
                  <span>
                    Mostrando {cuentasFiltradas.length} de {cuentas.length} {cuentas.length === 1 ? 'cuenta' : 'cuentas'}
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                    <span>
                      Deudores: <strong className="text-[#e74c3c]">
                        {cuentasFiltradas.filter(c => c.saldoPesos > 0 || c.saldoUSD > 0).length}
                      </strong>
                    </span>
                    <span>
                      A Favor: <strong className="text-[#27ae60]">
                        {cuentasFiltradas.filter(c => c.saldoPesos < 0 || c.saldoUSD < 0).length}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </RequireAdmin>
  );
}