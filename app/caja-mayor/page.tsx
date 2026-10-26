"use client";

import { useCallback, useEffect, useState } from "react";
import { useRol } from "@/lib/useRol";
import { useRouter } from "next/navigation";
import Header from "@/app/Header";
import { calcularSaldoCajaMayor, listarMovimientosCajaMayor, registrarMovimientoCajaMayor } from "@/lib/caja/cajaMayor";
import { formatearPrecioCaja, formatearUsdCaja } from "@/lib/caja/calcularResumenDia";
import { calcularCapital, totalesCapital, type CapitalNegocio, type MontosCapital } from "@/lib/caja/capital";
import { puedeOperarCajaMayor } from "@/lib/caja/permisosCaja";
import type { MovimientoCajaMayor } from "@/lib/caja/cajaTypes";
import { auth } from "@/lib/auth";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

function montosTexto(m: MontosCapital) {
  return (
    <span className="text-right">
      <span className="block font-semibold text-[#2c3e50]">{formatearPrecioCaja(m.ars)}</span>
      <span className="block text-sm font-semibold text-blue-700">{formatearUsdCaja(m.usd)}</span>
    </span>
  );
}

function PanelCapital({ capital }: { capital: CapitalNegocio }) {
  const efectivo = {
    ars: capital.cajaMayor.ars + capital.cajon.ars,
    usd: capital.cajaMayor.usd + capital.cajon.usd,
  };
  const total = totalesCapital(capital);
  const filas: { label: string; montos: MontosCapital; detalle?: string }[] = [
    { label: "Stock repuestos", montos: capital.repuestos },
    { label: "Stock accesorios", montos: capital.accesorios },
    { label: "Stock teléfonos", montos: capital.telefonos },
    { label: "Stock extra", montos: capital.extra },
    {
      label: "Efectivo",
      montos: efectivo,
      detalle: capital.cajaAbierta
        ? "Caja mayor más el efectivo de la caja del día, que sigue abierta."
        : "Caja mayor más el efectivo que quedó en el cajón.",
    },
    { label: "Cuentas corrientes", montos: capital.cuentas, detalle: "Lo que los clientes deben, en total." },
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow border border-[#ecf0f1]">
      <h2 className="font-bold text-lg text-[#2c3e50]">Capital</h2>
      <p className="text-sm text-[#7f8c8d] mt-1 mb-4">
        Costo de lo que hay en stock, el efectivo y el total de las cuentas. Pesos y dólares van separados.
      </p>
      <div className="divide-y divide-[#ecf0f1]">
        {filas.map((fila) => (
          <div key={fila.label} className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="font-medium text-[#2c3e50]">{fila.label}</p>
              {fila.detalle ? <p className="text-xs text-[#7f8c8d] mt-0.5">{fila.detalle}</p> : null}
            </div>
            {montosTexto(fila.montos)}
          </div>
        ))}
      </div>
      <div className="flex items-start justify-between gap-4 pt-4 mt-2 border-t-2 border-[#2c3e50]">
        <p className="font-bold text-[#2c3e50]">Total</p>
        {montosTexto(total)}
      </div>
    </div>
  );
}

export default function CajaMayorPage() {
  const { rol } = useRol();
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [saldo, setSaldo] = useState({ ARS: 0, USD: 0 });
  const [movimientos, setMovimientos] = useState<MovimientoCajaMayor[]>([]);
  const [cierresRecientes, setCierresRecientes] = useState<Record<string, unknown>[]>([]);
  const [mostrarManual, setMostrarManual] = useState(false);
  const [tipoManual, setTipoManual] = useState<"ingreso" | "egreso">("ingreso");
  const [montoManual, setMontoManual] = useState("");
  const [descManual, setDescManual] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [capital, setCapital] = useState<CapitalNegocio | null>(null);

  const cargar = useCallback(async () => {
    if (!rol?.negocioID) return;
    setCargando(true);
    try {
      const s = await calcularSaldoCajaMayor(rol.negocioID);
      setSaldo(s);
      setCapital(await calcularCapital(rol.negocioID, { ars: s.ARS, usd: s.USD }));
      const movs = await listarMovimientosCajaMayor(rol.negocioID, 50);
      setMovimientos(movs);

      const cierresSnap = await getDocs(
        query(collection(db, `negocios/${rol.negocioID}/cierresCaja`), orderBy("fechaCierre", "desc"), limit(5))
      );
      setCierresRecientes(cierresSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }, [rol?.negocioID]);

  useEffect(() => {
    if (!rol) return;
    if (!puedeOperarCajaMayor(rol.tipo)) {
      router.push("/");
      return;
    }
    cargar();
  }, [rol, router, cargar]);

  const guardarManual = async () => {
    const user = auth.currentUser;
    if (!user || !rol?.negocioID || !montoManual || !descManual.trim()) return;
    setGuardando(true);
    try {
      await registrarMovimientoCajaMayor({
        negocioId: rol.negocioID,
        tipo: tipoManual,
        categoria: tipoManual === "ingreso" ? "ingreso_manual" : "egreso_manual",
        montoARS: Number(montoManual),
        descripcion: descManual.trim(),
        origen: "manual",
        usuario: user.email || user.uid,
        usuarioId: user.uid,
      });
      setMostrarManual(false);
      setMontoManual("");
      setDescManual("");
      cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <>
        <Header />
        <main className="pt-16 min-h-screen bg-[#f8f9fa] flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-[#9b59b6] border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-16 min-h-screen bg-[#f8f9fa] p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] rounded-2xl p-6 text-white shadow-lg flex flex-wrap justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Caja Mayor</h1>
              <p className="text-purple-100 text-sm">Acumulado de cierres diarios y movimientos del dueño</p>
            </div>
            <button
              onClick={() => router.push("/caja-diaria")}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg"
            >
              Caja Diaria
            </button>
          </div>

          <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-2xl p-8 text-white shadow-lg">
            <p className="text-green-100 text-sm">Saldo Caja Mayor</p>
            <p className="text-4xl font-bold">{formatearPrecioCaja(saldo.ARS)} ARS</p>
            {saldo.USD > 0 && (
              <p className="text-xl text-green-100 mt-1">USD {saldo.USD.toLocaleString("es-AR")}</p>
            )}
          </div>

          {capital && <PanelCapital capital={capital} />}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setTipoManual("ingreso");
                setMostrarManual(true);
              }}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold"
            >
              + Ingreso manual
            </button>
            <button
              onClick={() => {
                setTipoManual("egreso");
                setMostrarManual(true);
              }}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold"
            >
              − Egreso manual
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow border border-[#ecf0f1]">
            <h2 className="font-bold text-lg mb-4">Historial de movimientos</h2>
            {movimientos.length === 0 ? (
              <p className="text-[#7f8c8d] text-sm">Sin movimientos aún. Se acumulan al cerrar la caja diaria.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {movimientos.map((m) => (
                  <div
                    key={m.id}
                    className="flex justify-between items-start gap-4 p-3 bg-[#f8f9fa] rounded-lg text-sm border"
                  >
                    <div>
                      <p className="font-medium text-[#2c3e50]">{m.descripcion}</p>
                      <p className="text-xs text-[#7f8c8d]">
                        {m.fecha} · {m.categoria} · {m.usuario}
                      </p>
                    </div>
                    <span
                      className={`font-bold whitespace-nowrap ${m.tipo === "ingreso" ? "text-green-600" : "text-red-600"}`}
                    >
                      {m.tipo === "ingreso" ? "+" : "−"}
                      {formatearPrecioCaja(m.montoARS)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cierresRecientes.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow border border-[#ecf0f1]">
              <h2 className="font-bold text-lg mb-4">Últimos cierres diarios</h2>
              <div className="space-y-2">
                {cierresRecientes.map((c) => (
                  <div key={String(c.id)} className="p-3 bg-[#f8f9fa] rounded-lg text-sm flex justify-between">
                    <span>{String(c.fecha ?? c.id)}</span>
                    <span className="font-bold text-green-600">
                      +{formatearPrecioCaja(Number(c.enviadoCajaMayorARS ?? 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {mostrarManual && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-lg">
              {tipoManual === "ingreso" ? "Ingreso" : "Egreso"} manual — Caja Mayor
            </h3>
            <input
              type="number"
              placeholder="Monto ARS"
              value={montoManual}
              onChange={(e) => setMontoManual(e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-lg"
            />
            <textarea
              placeholder="Descripción / justificación"
              value={descManual}
              onChange={(e) => setDescManual(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border-2 rounded-lg resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setMostrarManual(false)} className="flex-1 py-2 bg-gray-400 text-white rounded-lg">
                Cancelar
              </button>
              <button
                onClick={guardarManual}
                disabled={guardando}
                className="flex-1 py-2 bg-[#9b59b6] text-white rounded-lg font-bold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
