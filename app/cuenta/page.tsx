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
      ventasSnap.forEach((doc) => {
        const data = doc.data();
        const cliente = data.cliente;
        const total = Number(data.total || 0);
        const productos = data.productos || [];

        if (!cliente || productos.length === 0) return;

        if (!cuentasMap[cliente]) {
          cuentasMap[cliente] = { saldoPesos: 0, saldoUSD: 0 };
        }

        const primerTelefono = productos.find((p: any) => p.categoria === "Teléfono");

        if (primerTelefono) {
          const moneda = (primerTelefono.moneda || "ARS").toUpperCase();
          if (moneda === "USD") {
            cuentasMap[cliente].saldoUSD += total;
          } else {
            cuentasMap[cliente].saldoPesos += total;
          }
        } else {
          cuentasMap[cliente].saldoPesos += total;
        }
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
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-4 max-w-[1200px] mx-auto space-y-4">
          
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">📊</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Cuenta Corriente
                </h1>
                <p className="text-blue-100 text-sm">
                  Control de saldos y deudas por cliente
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#e74c3c] rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">💰</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#2c3e50]">Resumen Total</h3>
                <p className="text-[#7f8c8d] text-xs">Deuda acumulada de todos los clientes</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-[#fadbd8] to-[#f5b7b1] rounded-xl p-4 border-2 border-[#e74c3c]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#e74c3c]">Deuda Total en Pesos</p>
                    <p className="text-xl font-bold text-[#e74c3c]">
                      {formatPesos(totalPesos)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-[#e74c3c]/20 rounded-full flex items-center justify-center">
                    <span className="text-lg">🇦🇷</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#fadbd8] to-[#f5b7b1] rounded-xl p-4 border-2 border-[#e74c3c]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#e74c3c]">Deuda Total en USD</p>
                    <p className="text-xl font-bold text-[#e74c3c]">
                      {formatUSD(totalUSD)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-[#e74c3c]/20 rounded-full flex items-center justify-center">
                    <span className="text-lg">🇺🇸</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="🔍 Filtrar por cliente..."
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="p-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] text-sm placeholder-[#7f8c8d] w-64"
                />
              </div>
              
              <Link
                href="/pagos"
                className="bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#3f51b5] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-sm"
              >
                💳 Ir a Pagos
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
            <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                📊 Detalle por Cliente
              </h3>
              <p className="text-blue-100 mt-1 text-xs">
                {cuentasFiltradas.length} clientes con saldos pendientes
              </p>
            </div>

            <div className="overflow-x-auto border border-[#bdc3c7]">
              <table className="w-full min-w-[600px] border-collapse">
                <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
                  <tr>
                    <th className="p-3 border border-[#bdc3c7] text-sm font-semibold text-[#2c3e50] text-left">
                      👤 Cliente
                    </th>
                    <th className="p-3 border border-[#bdc3c7] text-sm font-semibold text-[#2c3e50] text-center">
                      🇦🇷 Saldo Pesos
                    </th>
                    <th className="p-3 border border-[#bdc3c7] text-sm font-semibold text-[#2c3e50] text-center">
                      🇺🇸 Saldo USD
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cuentasFiltradas.length === 0 ? (
                    <tr>
                      <td 
                        colSpan={3}
                        className="p-8 text-center text-[#7f8c8d] border border-[#bdc3c7]"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                            <span className="text-2xl">📊</span>
                          </div>
                          <div>
                            <p className="text-md font-medium text-[#7f8c8d]">
                              No hay cuentas pendientes
                            </p>
                            <p className="text-xs text-[#bdc3c7]">
                              Todos los clientes están al día con sus pagos
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cuentasFiltradas.map((c, index) => {
                      const isEven = index % 2 === 0;
                      const isDeudor = c.saldoPesos > 0 || c.saldoUSD > 0;
                      const isAcreedor = c.saldoPesos < 0 || c.saldoUSD < 0;
                      
                      let bgColor = isEven ? "bg-white" : "bg-[#f8f9fa]";
                      
                      if (isAcreedor) {
                        bgColor = "bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca]";
                      } else if (isDeudor) {
                        bgColor = "bg-gradient-to-r from-[#fadbd8] to-[#f5b7b1]";
                      }

                      return (
                        <tr
                          key={c.cliente}
                          className={`transition-colors duration-200 hover:bg-[#ebf3fd] ${bgColor}`}
                        >
                          <td className="p-3 border border-[#bdc3c7]">
                            <span className="text-sm font-medium text-[#2c3e50]">{c.cliente}</span>
                          </td>
                          <td className="p-3 border border-[#bdc3c7] text-center">
                            <span className={`text-sm font-bold ${
                              c.saldoPesos > 0 ? 'text-[#e74c3c]' : 
                              c.saldoPesos < 0 ? 'text-[#27ae60]' : 'text-[#7f8c8d]'
                            }`}>
                              {formatPesos(c.saldoPesos)}
                            </span>
                          </td>
                          <td className="p-3 border border-[#bdc3c7] text-center">
                            <span className={`text-sm font-bold ${
                              c.saldoUSD > 0 ? 'text-[#e74c3c]' : 
                              c.saldoUSD < 0 ? 'text-[#27ae60]' : 'text-[#7f8c8d]'
                            }`}>
                              {formatUSD(c.saldoUSD)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {cuentasFiltradas.length > 0 && (
              <div className="bg-[#f8f9fa] px-4 py-3 border-t border-[#bdc3c7]">
                <div className="flex justify-between items-center text-xs text-[#7f8c8d]">
                  <span>
                    Mostrando {cuentasFiltradas.length} clientes
                  </span>
                  <div className="flex gap-4">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-[#e74c3c] rounded-full"></div>
                      Debe dinero
                    </span>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-[#27ae60] rounded-full"></div>
                      A favor
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 border border-[#bdc3c7]">
            <div className="flex items-center gap-3 text-[#2c3e50]">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💡</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  <strong>Tip:</strong> Los saldos rojos indican dinero que te deben, los verdes son saldos a favor del cliente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </RequireAdmin>
  );
}