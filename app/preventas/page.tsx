"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, doc, getDocs, updateDoc } from "firebase/firestore";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import useCotizacion from "@/lib/hooks/useCotizacion";
import ModalPreventa from "./ModalPreventa";
import { stockearProductos } from "@/lib/preventas/stockear";
import {
  STORAGE_PREVENTA_VENTA,
  etiquetaDestino,
  etiquetaEstado,
  gananciasPreventa,
  gananciaLinea,
  normalizarPreventa,
  pagoDesdeSena,
  productoParaGuardar,
  productoParaVenta,
  saldosPreventa,
  textoMoneda,
  textoSaldo,
  totalesPreventa,
  type EstadoPreventa,
  type Preventa,
  type ProductoPreventa,
} from "@/lib/preventas/modelo";

type Filtro = "abiertas" | "todas" | EstadoPreventa;

export default function PreventasPage() {
  const { rol } = useRol();
  const router = useRouter();
  const negocioID = rol?.negocioID || "";
  const { cotizacion } = useCotizacion(negocioID);
  const [lista, setLista] = useState<Preventa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("abiertas");
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<Preventa | null | "nueva">(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");

  const cargar = async () => {
    if (!negocioID) return;
    setCargando(true);
    try {
      const snap = await getDocs(collection(db, `negocios/${negocioID}/preventas`));
      const items = snap.docs
        .map((d) => normalizarPreventa(d.id, d.data() as Record<string, unknown>))
        .filter((p): p is Preventa => p !== null)
        .sort((a, b) => b.actualizadoEn - a.actualizadoEn);
      setLista(items);
    } catch (error) {
      console.error(error);
      setAviso("No se pudieron cargar las preventas.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (negocioID) void cargar();
  }, [negocioID]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter((p) => {
      if (filtro === "abiertas" && p.estado !== "abierta") return false;
      if (filtro !== "abiertas" && filtro !== "todas" && p.estado !== filtro) return false;
      if (!q) return true;
      return (
        p.clienteNombre.toLowerCase().includes(q) ||
        p.productos.some((prod) => prod.nombre.toLowerCase().includes(q))
      );
    });
  }, [lista, filtro, busqueda]);

  const resumen = useMemo(() => {
    const abiertas = lista.filter((p) => p.estado === "abierta");
    return abiertas.reduce(
      (acc, p) => {
        const tot = totalesPreventa(p.productos);
        const saldo = saldosPreventa(p.productos, p.sena, p.senaMoneda);
        acc.senaARS += p.senaMoneda === "ARS" ? p.sena : 0;
        acc.senaUSD += p.senaMoneda === "USD" ? p.sena : 0;
        acc.saldoARS += saldo.ars;
        acc.saldoUSD += saldo.usd;
        const gan = gananciasPreventa(p.productos);
        acc.totalARS += tot.ars;
        acc.totalUSD += tot.usd;
        acc.gananciaARS += gan.ars;
        acc.gananciaUSD += gan.usd;
        acc.cantidad += 1;
        return acc;
      },
      {
        cantidad: 0,
        senaARS: 0,
        senaUSD: 0,
        saldoARS: 0,
        saldoUSD: 0,
        totalARS: 0,
        totalUSD: 0,
        gananciaARS: 0,
        gananciaUSD: 0,
      }
    );
  }, [lista]);

  const guardar = async (datos: {
    clienteId: string;
    clienteNombre: string;
    productos: ProductoPreventa[];
    ingresarIds: string[];
    sena: number;
    senaMoneda: "ARS" | "USD";
    notas: string;
  }) => {
    if (!negocioID) return;
    setGuardando(true);
    setAviso("");
    try {
      const productos = await stockearProductos(negocioID, datos.productos, datos.ingresarIds);
      const ahora = Date.now();
      const base = {
        clienteId: datos.clienteId,
        clienteNombre: datos.clienteNombre,
        productos: productos.map(productoParaGuardar),
        sena: datos.sena,
        senaMoneda: datos.senaMoneda,
        notas: datos.notas,
        actualizadoEn: ahora,
      };
      if (modal && modal !== "nueva") {
        await updateDoc(doc(db, `negocios/${negocioID}/preventas/${modal.id}`), base);
      } else {
        await addDoc(collection(db, `negocios/${negocioID}/preventas`), {
          ...base,
          estado: "abierta",
          creadoEn: ahora,
        });
      }
      setModal(null);
      await cargar();
    } catch (error) {
      console.error(error);
      setAviso("No se pudo guardar la preventa.");
    } finally {
      setGuardando(false);
    }
  };

  const stockearPendientes = async (preventa: Preventa) => {
    const ids = preventa.productos.filter((p) => !p.stockeado).map((p) => p.id);
    if (!ids.length || !negocioID) return;
    setGuardando(true);
    setAviso("");
    try {
      const productos = await stockearProductos(negocioID, preventa.productos, ids);
      await updateDoc(doc(db, `negocios/${negocioID}/preventas/${preventa.id}`), {
        productos: productos.map(productoParaGuardar),
        actualizadoEn: Date.now(),
      });
      await cargar();
    } catch (error) {
      console.error(error);
      setAviso("No se pudo stockear.");
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = async (preventa: Preventa) => {
    if (!negocioID) return;
    if (!window.confirm(`¿Cancelar la preventa de ${preventa.clienteNombre}? El stock que ya ingresó queda en el depósito.`)) return;
    await updateDoc(doc(db, `negocios/${negocioID}/preventas/${preventa.id}`), {
      estado: "cancelada",
      actualizadoEn: Date.now(),
    });
    await cargar();
  };

  const pasarAVenta = (preventa: Preventa) => {
    if (preventa.estado !== "abierta" || preventa.productos.length === 0) return;
    const ok = window.confirm(
      `Se abre Ventas general con ${preventa.clienteNombre}, los productos y la seña como pago. No se guarda sola: tenés que confirmarla ahí.`
    );
    if (!ok) return;
    const saldo = saldosPreventa(preventa.productos, preventa.sena, preventa.senaMoneda);
    localStorage.setItem(
      STORAGE_PREVENTA_VENTA,
      JSON.stringify({
        preventaId: preventa.id,
        negocioID,
        cliente: preventa.clienteNombre,
        clienteId: preventa.clienteId,
        productos: preventa.productos.map(productoParaVenta),
        pago: pagoDesdeSena(preventa.sena, preventa.senaMoneda),
        observaciones: [
          preventa.notas,
          preventa.sena > 0 ? `Seña de preventa: ${textoMoneda(preventa.senaMoneda, preventa.sena)}` : "",
          `Saldo pesos: ${textoSaldo(saldo.ars, "ARS")}`,
          `Saldo dólares: ${textoSaldo(saldo.usd, "USD")}`,
        ]
          .filter(Boolean)
          .join(" · "),
      })
    );
    router.push("/ventas-general?desdePreventa=1");
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f4f6f7] pt-16 text-[#2c3e50]">
        <div className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Preventas</h1>
              <p className="mt-1 text-sm text-[#7f8c8d]">
                Reservas de varios clientes. La seña y el saldo quedan acá hasta que pases la preventa a una venta.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModal("nueva")}
              className="rounded-xl bg-[#8e44ad] px-4 py-2 font-bold text-white"
            >
              Nueva preventa
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tarjeta titulo="Abiertas" valor={String(resumen.cantidad)} />
            <Tarjeta titulo="Señas" valor={`${textoMoneda("ARS", resumen.senaARS)} · ${textoMoneda("USD", resumen.senaUSD)}`} />
            <Tarjeta titulo="Saldo" valor={`${textoMoneda("ARS", resumen.saldoARS)} · ${textoMoneda("USD", resumen.saldoUSD)}`} />
            <Tarjeta titulo="Total reservado" valor={`${textoMoneda("ARS", resumen.totalARS)} · ${textoMoneda("USD", resumen.totalUSD)}`} />
            <Tarjeta titulo="Ganancia" valor={`${textoMoneda("ARS", resumen.gananciaARS)} · ${textoMoneda("USD", resumen.gananciaUSD)}`} />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["abiertas", "Abiertas"],
                ["todas", "Todas"],
                ["migrada", "Pasadas a venta"],
                ["cancelada", "Canceladas"],
              ] as [Filtro, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFiltro(id)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  filtro === id ? "bg-[#8e44ad] text-white" : "bg-white text-[#2c3e50]"
                }`}
              >
                {label}
              </button>
            ))}
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente o producto"
              className="min-w-[180px] flex-1 rounded-full border bg-white px-3 py-1 text-sm"
            />
          </div>

          {aviso ? <p className="text-sm text-red-700">{aviso}</p> : null}
          {cargando ? <p className="text-sm text-[#7f8c8d]">Cargando…</p> : null}
          {!cargando && visibles.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-sm text-[#7f8c8d]">No hay preventas en este filtro.</p>
          ) : null}

          <div className="space-y-3">
            {visibles.map((p) => {
              const tot = totalesPreventa(p.productos);
              const saldo = saldosPreventa(p.productos, p.sena, p.senaMoneda);
              const gan = gananciasPreventa(p.productos);
              const pendientes = p.productos.some((prod) => !prod.stockeado && !prod.desdeStock);
              return (
                <article key={p.id} className="rounded-2xl border border-[#ecf0f1] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold">{p.clienteNombre}</h2>
                      <p className="text-xs text-[#95a5a6]">
                        {p.creadoEn ? new Date(p.creadoEn).toLocaleString("es-AR") : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#f5eef8] px-3 py-1 text-xs font-bold text-[#8e44ad]">
                      {etiquetaEstado(p)}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {p.productos.map((prod) => {
                      const g = gananciaLinea(prod);
                      return (
                      <li key={prod.id} className="flex justify-between gap-2">
                        <span>
                          {prod.cantidad} × {prod.nombre}
                          <span className="text-[#95a5a6]">
                            {" · "}
                            {prod.desdeStock ? "del stock" : etiquetaDestino(prod.destinoStock)}
                            {prod.precioCosto > 0 ? ` · costo ${textoMoneda(prod.moneda, prod.precioCosto)}` : ""}
                          </span>
                          {prod.stockeado ? <span className="text-emerald-700"> · ingresado</span> : null}
                          {g != null ? (
                            <span className={g > 0 ? " font-semibold text-[#27ae60]" : g < 0 ? " font-semibold text-[#e74c3c]" : ""}>
                              {" · ganancia "}
                              {textoMoneda(prod.moneda, g)}
                              {prod.moneda === "USD" && (cotizacion || 0) > 0
                                ? ` (≈ ${textoMoneda("ARS", Math.round(g * (cotizacion || 0)))})`
                                : ""}
                            </span>
                          ) : (
                            <span className="text-[#95a5a6]"> · sin costo</span>
                          )}
                        </span>
                        <span className="font-semibold">
                          {textoMoneda(prod.moneda, Math.round(prod.precioUnitario * prod.cantidad * 100) / 100)}
                        </span>
                      </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                    <p>Total: {textoMoneda("ARS", tot.ars)} · {textoMoneda("USD", tot.usd)}</p>
                    <p>Seña: {p.sena > 0 ? textoMoneda(p.senaMoneda, p.sena) : "Sin seña"}</p>
                    <p>Saldo pesos: <strong>{textoSaldo(saldo.ars, "ARS")}</strong></p>
                    <p>Saldo dólares: <strong>{textoSaldo(saldo.usd, "USD")}</strong></p>
                    <p>
                      Ganancia:{" "}
                      <strong className={gan.ars > 0 ? "text-[#27ae60]" : gan.ars < 0 ? "text-[#e74c3c]" : ""}>
                        {textoMoneda("ARS", gan.ars)}
                      </strong>
                      {" · "}
                      <strong className={gan.usd > 0 ? "text-[#27ae60]" : gan.usd < 0 ? "text-[#e74c3c]" : ""}>
                        {textoMoneda("USD", gan.usd)}
                      </strong>
                    </p>
                  </div>
                  {p.notas ? <p className="mt-2 text-sm text-[#7f8c8d]">{p.notas}</p> : null}
                  {p.estado === "abierta" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setModal(p)} className="rounded-xl border px-3 py-2 text-sm font-semibold">
                        Editar
                      </button>
                      {pendientes ? (
                        <button
                          type="button"
                          disabled={guardando}
                          onClick={() => void stockearPendientes(p)}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          Stockear ingresados
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => pasarAVenta(p)}
                        className="rounded-xl bg-[#2c3e50] px-3 py-2 text-sm font-semibold text-white"
                      >
                        Pasar a venta
                      </button>
                      <button type="button" onClick={() => void cancelar(p)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                        Cancelar
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </main>

      {modal && negocioID ? (
        <ModalPreventa
          negocioID={negocioID}
          inicial={modal === "nueva" ? null : modal}
          guardando={guardando}
          onClose={() => setModal(null)}
          onGuardar={(datos) => void guardar(datos)}
        />
      ) : null}
    </>
  );
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <p className="text-xs font-medium text-[#7f8c8d]">{titulo}</p>
      <p className="mt-1 text-sm font-bold">{valor}</p>
    </div>
  );
}
