"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  monedaDe,
  nuevaLineaId,
  textoMoneda,
  type DestinoStockPreventa,
  type MonedaPreventa,
  type ProductoPreventa,
} from "@/lib/preventas/modelo";

type ItemStock = {
  id: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  precio: number;
  costo: number;
  moneda: MonedaPreventa;
  destino: DestinoStockPreventa;
};

function numero(valor: unknown): number {
  return Math.round(Math.max(0, Number(valor) || 0) * 100) / 100;
}

function nombreDe(data: Record<string, unknown>): string {
  return String(data.producto || data.modelo || "").trim();
}

function mapItem(id: string, data: Record<string, unknown>, destino: DestinoStockPreventa): ItemStock | null {
  const nombre = nombreDe(data);
  if (!nombre) return null;
  const moneda = monedaDe(data.moneda || (destino === "stockAccesorios" ? "ARS" : "ARS"));
  const precio = numero(data.precio1) || numero(data.precio1Pesos);
  const costo = numero(data.precioCosto) || (moneda === "ARS" ? numero(data.precioCostoPesos) : 0);
  return {
    id,
    codigo: String(data.codigo || id),
    nombre,
    cantidad: Math.max(0, Math.round(Number(data.cantidad) || 0)),
    precio,
    costo,
    moneda,
    destino,
  };
}

export default function SelectorStockPreventa({
  negocioID,
  onClose,
  onElegir,
}: {
  negocioID: string;
  onClose: () => void;
  onElegir: (producto: ProductoPreventa) => void;
}) {
  const [origen, setOrigen] = useState<"stockAccesorios" | "stockRepuestos">("stockAccesorios");
  const [items, setItems] = useState<ItemStock[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState<ItemStock | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      setCargando(true);
      try {
        const [acc, rep] = await Promise.all([
          getDocs(collection(db, `negocios/${negocioID}/stockAccesorios`)),
          getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`)),
        ]);
        if (cancel) return;
        const lista = [
          ...acc.docs.map((d) => mapItem(d.id, d.data() as Record<string, unknown>, "stockAccesorios")),
          ...rep.docs.map((d) => mapItem(d.id, d.data() as Record<string, unknown>, "stockRepuestos")),
        ].filter((item): item is ItemStock => item !== null);
        lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        setItems(lista);
      } catch (error) {
        console.error(error);
        if (!cancel) setAviso("No se pudo cargar el stock.");
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [negocioID]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((item) => {
      if (item.destino !== origen) return false;
      if (!q) return true;
      return `${item.nombre} ${item.codigo}`.toLowerCase().includes(q);
    });
  }, [items, origen, busqueda]);

  const tomar = (item: ItemStock) => {
    setElegido(item);
    setCantidad("1");
    setPrecio(item.precio > 0 ? String(item.precio) : "");
    setCosto(item.costo > 0 ? String(item.costo) : "");
    setAviso("");
  };

  const confirmar = () => {
    if (!elegido) return;
    const cant = Math.round(Number(String(cantidad).replace(",", ".")) || 0);
    const precioNum = numero(String(precio).replace(",", "."));
    const costoNum = numero(String(costo).replace(",", "."));
    if (cant < 1) {
      setAviso("La cantidad tiene que ser al menos 1.");
      return;
    }
    if (!(precioNum > 0)) {
      setAviso("El precio de venta tiene que ser mayor a 0.");
      return;
    }
    onElegir({
      id: nuevaLineaId(),
      nombre: elegido.nombre,
      cantidad: cant,
      precioUnitario: precioNum,
      precioCosto: costoNum,
      moneda: elegido.moneda,
      destinoStock: elegido.destino,
      desdeStock: true,
      stockeado: false,
      stockDocId: elegido.id,
      codigo: elegido.codigo,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#2c3e50]">Producto del stock</h3>
            <p className="mt-1 text-sm text-[#7f8c8d]">No descuenta unidades hasta que pases la preventa a una venta.</p>
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-full bg-gray-100 text-lg font-bold" aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOrigen("stockAccesorios")}
            className={`rounded-xl py-2 text-sm font-semibold ${origen === "stockAccesorios" ? "bg-[#8e44ad] text-white" : "bg-gray-100"}`}
          >
            Accesorios
          </button>
          <button
            type="button"
            onClick={() => setOrigen("stockRepuestos")}
            className={`rounded-xl py-2 text-sm font-semibold ${origen === "stockRepuestos" ? "bg-[#8e44ad] text-white" : "bg-gray-100"}`}
          >
            Repuestos
          </button>
        </div>

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o código"
          className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
        />

        {cargando ? <p className="mt-3 text-sm text-[#7f8c8d]">Cargando stock…</p> : null}
        {!cargando && visibles.length === 0 ? (
          <p className="mt-3 text-sm text-[#7f8c8d]">No hay productos en esta lista.</p>
        ) : null}

        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
          {visibles.slice(0, 40).map((item) => (
            <button
              key={`${item.destino}-${item.id}`}
              type="button"
              onClick={() => tomar(item)}
              className={`block w-full rounded-xl border px-3 py-2 text-left text-sm ${
                elegido?.id === item.id && elegido.destino === item.destino ? "border-[#8e44ad] bg-[#f8f4fc]" : "border-[#ecf0f1]"
              }`}
            >
              <span className="font-semibold text-[#2c3e50]">{item.nombre}</span>
              <span className="mt-0.5 block text-xs text-[#7f8c8d]">
                Hay {item.cantidad}
                {item.precio > 0 ? ` · ${textoMoneda(item.moneda, item.precio)}` : ""}
                {item.codigo ? ` · ${item.codigo}` : ""}
              </span>
            </button>
          ))}
        </div>

        {elegido ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <label className="text-sm font-medium">
              Cantidad
              <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded-xl border px-2 py-2" />
            </label>
            <label className="text-sm font-medium">
              Precio
              <input value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border px-2 py-2" />
            </label>
            <label className="text-sm font-medium">
              Costo
              <input value={costo} onChange={(e) => setCosto(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border px-2 py-2" />
            </label>
          </div>
        ) : null}

        {elegido && Number(cantidad) > elegido.cantidad ? (
          <p className="mt-2 text-xs text-[#e67e22]">Pedís más de lo que hay en stock ({elegido.cantidad}).</p>
        ) : null}
        {aviso ? <p className="mt-2 text-sm text-red-700">{aviso}</p> : null}

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-200 py-2 font-semibold">
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!elegido}
            className="flex-1 rounded-xl bg-[#27ae60] py-2 font-bold text-white disabled:opacity-60"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
