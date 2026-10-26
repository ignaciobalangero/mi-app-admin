"use client";

import { useCallback, useEffect, useState } from "react";
import { useRol } from "@/lib/useRol";
import { useRouter } from "next/navigation";
import Header from "@/app/Header";
import {
  calcularSaldoCajaMayor,
  cajaDiaPasaAMayor,
  guardarVinculoCajaDia,
  listarMovimientosCajaMayor,
  registrarMovimientoCajaMayor,
} from "@/lib/caja/cajaMayor";
import { formatearPrecioCaja, formatearUsdCaja } from "@/lib/caja/calcularResumenDia";
import {
  calcularCapital,
  guardarInclusionCapital,
  guardarPosicionCapital,
  inclusionInicial,
  leerInclusionCapital,
  leerPosicionCapital,
  posicionVacia,
  type CapitalNegocio,
  type ClaveCapital,
  type InclusionCapital,
  type MontosCapital,
  type PosicionCapital,
} from "@/lib/caja/capital";
import { puedeOperarCajaMayor } from "@/lib/caja/permisosCaja";
import type { MovimientoCajaMayor } from "@/lib/caja/cajaTypes";
import { auth } from "@/lib/auth";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

function Montos({ m, tono = "normal" }: { m: MontosCapital; tono?: "normal" | "total" }) {
  const hayArs = m.ars !== 0;
  const hayUsd = m.usd !== 0;
  const claseArs = tono === "total" ? "text-white" : "text-[#2c3e50]";
  const claseUsd = tono === "total" ? "text-blue-100" : "text-blue-700";
  const tamano = tono === "total" ? "text-2xl" : "text-lg";

  if (!hayArs && !hayUsd) {
    return <p className={`${tamano} font-bold ${tono === "total" ? "text-white/80" : "text-neutral-400"}`}>$ 0</p>;
  }

  return (
    <div>
      {hayArs ? <p className={`${tamano} font-bold leading-tight ${claseArs}`}>{formatearPrecioCaja(m.ars)}</p> : null}
      {hayUsd ? <p className={`font-semibold leading-tight ${tono === "total" ? "text-lg" : "text-sm"} ${claseUsd}`}>{formatearUsdCaja(m.usd)}</p> : null}
    </div>
  );
}

function MontosDeuda({ m }: { m: MontosCapital }) {
  const filas = [
    { key: "ars", valor: m.ars, texto: formatearPrecioCaja(Math.abs(m.ars)) },
    { key: "usd", valor: m.usd, texto: formatearUsdCaja(Math.abs(m.usd)) },
  ].filter((fila) => fila.valor !== 0);

  if (filas.length === 0) {
    return <p className="text-lg font-bold text-neutral-400">$ 0</p>;
  }

  return (
    <div className="space-y-1">
      {filas.map((fila) => (
        <p key={fila.key} className={`text-lg font-bold leading-tight ${fila.valor > 0 ? "text-red-700" : "text-emerald-700"}`}>
          {fila.texto}
          <span className="ml-2 text-xs font-medium">{fila.valor > 0 ? "a pagar" : "a favor"}</span>
        </p>
      ))}
    </div>
  );
}

function TarjetaElegible({
  label,
  detalle,
  montos,
  activo,
  resta,
  onClick,
}: {
  label: string;
  detalle?: string;
  montos: MontosCapital;
  activo: boolean;
  resta?: boolean;
  onClick: () => void;
}) {
  const marca = !activo ? "No suma" : resta ? "Resta" : "Suma";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl p-4 border text-left transition-colors ${
        activo
          ? resta
            ? "bg-red-50 border-red-300"
            : "bg-[#f5eef8] border-[#9b59b6]"
          : "bg-white border-[#ecf0f1]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-medium ${activo && resta ? "text-red-800" : "text-[#7f8c8d]"}`}>{label}</p>
        <span className={`text-xs font-semibold ${activo ? (resta ? "text-red-600" : "text-[#8e44ad]") : "text-[#bdc3c7]"}`}>
          {marca}
        </span>
      </div>
      <div className="mt-1">
        {resta ? <MontosDeuda m={montos} /> : <Montos m={montos} />}
      </div>
      {detalle ? <p className="text-xs text-[#95a5a6] mt-2">{detalle}</p> : null}
    </button>
  );
}

function textoNumero(valor: number) {
  return valor ? String(valor) : "";
}

function PanelCapital({
  capital,
  posicion,
  inclusion,
  vincularCajaDia,
  guardandoPosicion,
  onGuardarPosicion,
  onToggle,
  onVincular,
}: {
  capital: CapitalNegocio;
  posicion: PosicionCapital;
  inclusion: InclusionCapital;
  vincularCajaDia: boolean;
  guardandoPosicion: boolean;
  onGuardarPosicion: (posicion: PosicionCapital) => void;
  onToggle: (clave: ClaveCapital) => void;
  onVincular: (vinculado: boolean) => void;
}) {
  const [usd, setUsd] = useState(textoNumero(posicion.usd));
  const [efectivoManual, setEfectivoManual] = useState(textoNumero(posicion.efectivoARS));
  const [cripto, setCripto] = useState(textoNumero(posicion.cryptoUSD));

  useEffect(() => {
    setUsd(textoNumero(posicion.usd));
    setEfectivoManual(textoNumero(posicion.efectivoARS));
    setCripto(textoNumero(posicion.cryptoUSD));
  }, [posicion]);

  const partes: { clave: ClaveCapital; label: string; detalle?: string; montos: MontosCapital; resta?: boolean }[] = [
    { clave: "telefonos", label: "Teléfonos", montos: capital.telefonos },
    { clave: "repuestos", label: "Repuestos", montos: capital.repuestos },
    { clave: "accesorios", label: "Accesorios", montos: capital.accesorios },
    { clave: "extra", label: "Extra", montos: capital.extra },
    { clave: "efectivo", label: "Efectivo", detalle: "Pesos que cargaste a mano.", montos: { ars: posicion.efectivoARS, usd: 0 } },
    { clave: "usd", label: "USD", detalle: "Dólares que cargaste a mano.", montos: { ars: 0, usd: posicion.usd } },
    { clave: "cripto", label: "Cripto", detalle: "Valor en dólares.", montos: { ars: 0, usd: posicion.cryptoUSD } },
    { clave: "cajaMayor", label: "Caja mayor", montos: capital.cajaMayor },
    {
      clave: "cajaDia",
      label: "Caja del día",
      detalle: capital.cajaAbierta ? "Sigue abierta." : "Lo que quedó en el cajón.",
      montos: capital.cajon,
    },
    { clave: "cuentas", label: "Te deben", detalle: "Cuentas corrientes de los clientes.", montos: capital.cuentas },
    { clave: "proveedores", label: "Deuda con proveedor", montos: capital.proveedores, resta: true },
  ];
  const total = partes.reduce(
    (acc, parte) => {
      if (!inclusion[parte.clave]) return acc;
      const signo = parte.resta ? -1 : 1;
      return {
        ars: Math.round((acc.ars + signo * parte.montos.ars) * 100) / 100,
        usd: Math.round((acc.usd + signo * parte.montos.usd) * 100) / 100,
      };
    },
    { ars: 0, usd: 0 }
  );

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow border border-[#ecf0f1] space-y-5">
      <div>
        <h2 className="font-bold text-xl text-[#2c3e50]">Capital</h2>
        <p className="text-sm text-[#7f8c8d] mt-1">
          Tocá lo que querés sumar. Por ejemplo teléfonos, efectivo y cripto. Pesos y dólares van aparte.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-[#ecf0f1] bg-[#f8f9fa] p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={vincularCajaDia}
          onChange={(e) => onVincular(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[#9b59b6]"
        />
        <span>
          <span className="block text-sm font-semibold text-[#2c3e50]">Pasar la caja del día a Caja mayor al cerrar</span>
          <span className="block text-xs text-[#7f8c8d] mt-0.5">
            Apagalo cuando el día tiene pagos a proveedor u otros movimientos que no querés en Caja mayor.
          </span>
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {partes.map((parte) => (
          <TarjetaElegible
            key={parte.clave}
            label={parte.label}
            detalle={parte.detalle}
            montos={parte.montos}
            activo={inclusion[parte.clave]}
            resta={parte.resta}
            onClick={() => onToggle(parte.clave)}
          />
        ))}
      </div>

      <form
        className="rounded-2xl border border-[#ecf0f1] bg-[#f8f9fa] p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onGuardarPosicion({
            usd: Number(usd) || 0,
            efectivoARS: Number(efectivoManual) || 0,
            cryptoUSD: Number(cripto) || 0,
          });
        }}
      >
        <div>
          <p className="text-sm font-semibold text-[#2c3e50]">Actualizar lo que tengo ahora</p>
          <p className="text-xs text-[#7f8c8d] mt-0.5">USD, efectivo y cripto. Al guardar, se actualizan las tarjetas de arriba.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block text-sm text-[#7f8c8d]">
            USD
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0"
              value={usd}
              onChange={(e) => setUsd(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-xl text-[#2c3e50] bg-white"
            />
          </label>
          <label className="block text-sm text-[#7f8c8d]">
            Efectivo
            <input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              placeholder="0"
              value={efectivoManual}
              onChange={(e) => setEfectivoManual(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-xl text-[#2c3e50] bg-white"
            />
          </label>
          <label className="block text-sm text-[#7f8c8d]">
            Cripto, en USD
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0"
              value={cripto}
              onChange={(e) => setCripto(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-xl text-[#2c3e50] bg-white"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={guardandoPosicion}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#9b59b6] text-white font-semibold disabled:opacity-60"
        >
          {guardandoPosicion ? "Guardando..." : "Guardar"}
        </button>
      </form>

      <div className="rounded-2xl bg-[#2c3e50] px-5 py-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-white/70">Capital elegido</p>
          <p className="text-xs text-white/50 mt-1">Suma solo lo que marcaste.</p>
        </div>
        <Montos m={total} tono="total" />
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
  const [posicion, setPosicion] = useState<PosicionCapital>(posicionVacia());
  const [inclusion, setInclusion] = useState<InclusionCapital>(inclusionInicial());
  const [vincularCajaDia, setVincularCajaDia] = useState(true);
  const [guardandoPosicion, setGuardandoPosicion] = useState(false);

  const cargar = useCallback(async () => {
    if (!rol?.negocioID) return;
    setCargando(true);
    try {
      const s = await calcularSaldoCajaMayor(rol.negocioID);
      setSaldo(s);
      setCapital(await calcularCapital(rol.negocioID, { ars: s.ARS, usd: s.USD }));
      setPosicion(await leerPosicionCapital(rol.negocioID));
      setInclusion(await leerInclusionCapital(rol.negocioID));
      setVincularCajaDia(await cajaDiaPasaAMayor(rol.negocioID));
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

          {capital && (
            <PanelCapital
              capital={capital}
              posicion={posicion}
              inclusion={inclusion}
              vincularCajaDia={vincularCajaDia}
              guardandoPosicion={guardandoPosicion}
              onGuardarPosicion={async (siguiente) => {
                if (!rol?.negocioID) return;
                setGuardandoPosicion(true);
                try {
                  setPosicion(await guardarPosicionCapital(rol.negocioID, siguiente));
                } catch (e) {
                  alert(e instanceof Error ? e.message : "No se pudo guardar");
                } finally {
                  setGuardandoPosicion(false);
                }
              }}
              onToggle={async (clave) => {
                if (!rol?.negocioID) return;
                const siguiente = { ...inclusion, [clave]: !inclusion[clave] };
                setInclusion(siguiente);
                try {
                  await guardarInclusionCapital(rol.negocioID, siguiente);
                } catch (e) {
                  setInclusion(inclusion);
                  alert(e instanceof Error ? e.message : "No se pudo guardar");
                }
              }}
              onVincular={async (vinculado) => {
                if (!rol?.negocioID) return;
                const anterior = vincularCajaDia;
                setVincularCajaDia(vinculado);
                try {
                  await guardarVinculoCajaDia(rol.negocioID, vinculado);
                } catch (e) {
                  setVincularCajaDia(anterior);
                  alert(e instanceof Error ? e.message : "No se pudo guardar");
                }
              }}
            />
          )}

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
