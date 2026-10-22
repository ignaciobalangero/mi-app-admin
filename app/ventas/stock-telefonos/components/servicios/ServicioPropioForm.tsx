"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  costoEnMonedaEquipo,
  type RepuestoServicioPropio,
  type RegistroServicioPropio,
} from "./useServicios";

type ItemStock = {
  id: string;
  coleccion: "stockRepuestos" | "stockExtra";
  nombre: string;
  codigo: string;
  cantidad: number;
  costoUnitario: number;
  costoPesos?: number;
  moneda: string;
  origen: "Repuesto" | "Stock extra";
};

type Props = {
  negocioID: string;
  monedaEquipo: string;
  precioCompra: number;
  cotizacion: number | null;
  onCancelar: () => void;
  onConfirmar: (payload: RegistroServicioPropio) => void;
  guardando: boolean;
};

export default function ServicioPropioForm({
  negocioID,
  monedaEquipo,
  precioCompra,
  cotizacion,
  onCancelar,
  onConfirmar,
  guardando,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const [manoObra, setManoObra] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [catalogo, setCatalogo] = useState<ItemStock[]>([]);
  const [cargando, setCargando] = useState(false);
  const [elegidos, setElegidos] = useState<RepuestoServicioPropio[]>([]);

  useEffect(() => {
    if (!negocioID) return;
    let cancel = false;
    setCargando(true);
    (async () => {
      try {
        const [rep, extra] = await Promise.all([
          getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`)),
          getDocs(collection(db, `negocios/${negocioID}/stockExtra`)),
        ]);
        const mapear = (
          docs: typeof rep.docs,
          coleccion: ItemStock["coleccion"],
          origen: ItemStock["origen"]
        ): ItemStock[] =>
          docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              coleccion,
              nombre: String(data.producto || data.modelo || "Repuesto"),
              codigo: String(data.codigo || d.id),
              cantidad: Number(data.cantidad ?? data.stock) || 0,
              costoUnitario: Number(data.precioCosto) || 0,
              costoPesos:
                data.precioCostoPesos != null ? Number(data.precioCostoPesos) : undefined,
              moneda: String(data.moneda || (coleccion === "stockExtra" ? "USD" : "ARS")),
              origen,
            };
          });
        if (!cancel) {
          setCatalogo([
            ...mapear(rep.docs, "stockRepuestos", "Repuesto"),
            ...mapear(extra.docs, "stockExtra", "Stock extra"),
          ]);
        }
      } catch (error) {
        console.error(error);
        if (!cancel) alert("No se pudo leer el stock de repuestos.");
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [negocioID]);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (q.length < 2) return [];
    return catalogo
      .filter((p) => p.cantidad > 0)
      .filter((p) => `${p.nombre} ${p.codigo} ${p.origen}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [busqueda, catalogo]);

  const costoDe = (item: ItemStock) =>
    costoEnMonedaEquipo(
      item.costoUnitario,
      item.moneda,
      monedaEquipo,
      cotizacion
    );

  const agregar = (item: ItemStock) => {
    setElegidos((prev) => {
      const ya = prev.find((p) => p.id === item.id && p.coleccion === item.coleccion);
      if (ya) {
        if (ya.cantidad >= item.cantidad) return prev;
        return prev.map((p) =>
          p.id === item.id && p.coleccion === item.coleccion
            ? { ...p, cantidad: p.cantidad + 1 }
            : p
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          coleccion: item.coleccion,
          nombre: item.nombre,
          codigo: item.codigo,
          cantidad: 1,
          costoUnitario: item.costoUnitario,
          moneda: item.moneda,
          costoPesos: item.costoPesos,
        },
      ];
    });
    setBusqueda("");
  };

  const cambiarCantidad = (id: string, coleccion: string, cantidad: number) => {
    const stock = catalogo.find((p) => p.id === id && p.coleccion === coleccion);
    const tope = stock?.cantidad ?? cantidad;
    const n = Math.max(1, Math.min(tope, cantidad));
    setElegidos((prev) =>
      prev.map((p) => (p.id === id && p.coleccion === coleccion ? { ...p, cantidad: n } : p))
    );
  };

  const quitar = (id: string, coleccion: string) => {
    setElegidos((prev) => prev.filter((p) => !(p.id === id && p.coleccion === coleccion)));
  };

  const costoRepuestos = elegidos.reduce((sum, linea) => {
    const item = catalogo.find((p) => p.id === linea.id && p.coleccion === linea.coleccion);
    const unit = item ? costoDe(item) : null;
    return sum + (unit || 0) * linea.cantidad;
  }, 0);
  const mano = Math.max(0, Number(manoObra) || 0);
  const total = Math.round((costoRepuestos + mano) * 100) / 100;
  const faltaCotizacion = elegidos.some((linea) => {
    const item = catalogo.find((p) => p.id === linea.id && p.coleccion === linea.coleccion);
    return item ? costoDe(item) == null : true;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Podés sumar varios: tapa, batería, cámara. Cada uno sale de su stock y los costos se suman al equipo.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Qué se le hizo *</label>
        <input
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Cambio de batería"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Repuestos de stock o stock extra
        </label>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={
            cargando
              ? "Cargando stock…"
              : elegidos.length > 0
                ? "Buscá otro para sumarlo"
                : "Escribí tapa, batería, cámara…"
          }
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        />
        {resultados.length > 0 && (
          <ul className="mt-2 border border-gray-200 rounded-lg divide-y max-h-40 overflow-y-auto">
            {resultados.map((item) => (
              <li key={`${item.coleccion}-${item.id}`}>
                <button
                  type="button"
                  onClick={() => agregar(item)}
                  className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm"
                >
                  <span className="font-medium">{item.nombre}</span>
                  <span className="text-gray-500">
                    {" "}
                    · {item.origen} · stock {item.cantidad}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {elegidos.length > 0 && (
        <ul className="space-y-2">
          {elegidos.map((linea) => {
            const item = catalogo.find((p) => p.id === linea.id && p.coleccion === linea.coleccion);
            const unit = item ? costoDe(item) : null;
            const subtotal = unit == null ? null : Math.round(unit * linea.cantidad * 100) / 100;
            return (
              <li
                key={`${linea.coleccion}-${linea.id}`}
                className="flex items-center gap-2 border border-gray-200 rounded-lg p-2 text-sm"
              >
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{linea.nombre}</span>
                  {subtotal != null && (
                    <span className="text-xs text-gray-500">
                      ${subtotal.toLocaleString("es-AR")} {monedaEquipo}
                    </span>
                  )}
                </span>
                <input
                  type="number"
                  min={1}
                  max={item?.cantidad || 1}
                  value={linea.cantidad}
                  onChange={(e) =>
                    cambiarCantidad(linea.id, linea.coleccion, Number(e.target.value) || 1)
                  }
                  className="w-16 p-1 border rounded text-center"
                />
                <button
                  type="button"
                  onClick={() => quitar(linea.id, linea.coleccion)}
                  className="text-red-600 font-semibold px-2"
                >
                  Quitar
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mano de obra ({monedaEquipo})
        </label>
        <input
          type="number"
          min={0}
          value={manoObra}
          onChange={(e) => setManoObra(e.target.value)}
          placeholder="0 si no se paga por este equipo"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        />
      </div>
      {faltaCotizacion && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          Hay un repuesto en otra moneda. La conversión usa solo la cotización de Venta general
          {cotizacion && cotizacion > 0 ? "" : ", y todavía no está cargada"}.
        </p>
      )}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <div>
          Cotización de Venta general:{" "}
          {cotizacion && cotizacion > 0
            ? `$${cotizacion.toLocaleString("es-AR")}`
            : "sin cargar"}
        </div>
        <div>Costo actual del equipo: ${precioCompra.toLocaleString("es-AR")} {monedaEquipo}</div>
        <div>Repuestos + mano de obra: +${total.toLocaleString("es-AR")}</div>
        <div className="font-semibold border-t border-blue-200 mt-2 pt-2">
          Nuevo costo: ${(precioCompra + total).toLocaleString("es-AR")} {monedaEquipo}
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancelar}
          className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={guardando || !motivo.trim() || faltaCotizacion}
          onClick={() =>
            onConfirmar({
              motivo,
              manoObra: mano,
              repuestos: elegidos,
            })
          }
          className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Registrar y sumar al costo"}
        </button>
      </div>
    </div>
  );
}
