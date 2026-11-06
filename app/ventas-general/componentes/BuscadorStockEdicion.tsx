"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ItemStockEdicion = {
  id: string;
  codigo: string;
  producto: string;
  modelo: string;
  marca: string;
  color: string;
  categoria: string;
  tipo: "accesorio" | "repuesto";
  moneda: "ARS" | "USD";
  precio1: number;
  precioCosto: number;
  cantidad: number;
};

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function useCatalogoAccesoriosRepuestos(negocioID: string, activo: boolean) {
  const [catalogo, setCatalogo] = useState<ItemStockEdicion[]>([]);

  useEffect(() => {
    if (!activo || !negocioID) return;
    let cancelado = false;
    void (async () => {
      const [accSnap, repSnap] = await Promise.all([
        getDocs(collection(db, `negocios/${negocioID}/stockAccesorios`)),
        getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`)),
      ]);
      if (cancelado) return;
      const accesorios: ItemStockEdicion[] = accSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          codigo: String(data.codigo || d.id),
          producto: String(data.producto || data.modelo || "Accesorio"),
          modelo: String(data.modelo || ""),
          marca: String(data.marca || ""),
          color: String(data.color || ""),
          categoria: String(data.categoria || "Accesorio"),
          tipo: "accesorio",
          moneda: data.moneda === "USD" ? "USD" : "ARS",
          precio1: Number(data.precio1) || 0,
          precioCosto: Number(data.precioCosto) || 0,
          cantidad: Number(data.cantidad) || 0,
        };
      });
      const repuestos: ItemStockEdicion[] = repSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          codigo: String(data.codigo || d.id),
          producto: String(data.producto || data.modelo || "Repuesto"),
          modelo: String(data.modelo || ""),
          marca: String(data.marca || ""),
          color: String(data.color || ""),
          categoria: String(data.categoria || "Repuesto"),
          tipo: "repuesto",
          moneda: data.moneda === "USD" ? "USD" : "ARS",
          precio1: Number(data.precio1) || 0,
          precioCosto: Number(data.precioCosto) || 0,
          cantidad: Number(data.cantidad) || 0,
        };
      });
      setCatalogo([...accesorios, ...repuestos]);
    })().catch((e) => console.error(e));
    return () => {
      cancelado = true;
    };
  }, [negocioID, activo]);

  return catalogo;
}

export default function BuscadorStockEdicion({
  catalogo,
  onElegir,
  placeholder,
}: {
  catalogo: ItemStockEdicion[];
  onElegir: (item: ItemStockEdicion) => void;
  placeholder: string;
}) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);

  const resultados = useMemo(() => {
    const palabras = normalizar(texto).split(" ").filter(Boolean);
    if (palabras.length === 0 || texto.trim().length < 2) return [];
    return catalogo
      .filter((item) => {
        const blob = normalizar(
          [item.producto, item.codigo, item.marca, item.modelo, item.color, item.categoria].join(" ")
        );
        return palabras.every((palabra) => blob.includes(palabra));
      })
      .slice(0, 8);
  }, [catalogo, texto]);

  return (
    <div className="relative">
      <input
        type="text"
        value={texto}
        placeholder={placeholder}
        onFocus={() => setAbierto(true)}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        className="w-full rounded-lg border-2 border-[#3498db] p-2 text-sm text-[#2c3e50]"
      />
      {abierto && texto.trim().length >= 2 ? (
        <ul className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[#bdc3c7] bg-white shadow-xl">
          {resultados.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[#7f8c8d]">Sin accesorios ni repuestos con ese texto.</li>
          ) : (
            resultados.map((item) => (
              <li key={`${item.tipo}-${item.id}`}>
                <button
                  type="button"
                  onClick={() => {
                    onElegir(item);
                    setTexto("");
                    setAbierto(false);
                  }}
                  className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-[#eaf2f8]"
                >
                  <span className="min-w-0">
                    <span
                      className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${
                        item.tipo === "accesorio" ? "bg-[#3498db]" : "bg-[#e67e22]"
                      }`}
                    >
                      {item.tipo === "accesorio" ? "Accesorio" : "Repuesto"}
                    </span>
                    <span className="text-sm font-semibold text-[#2c3e50]">{item.producto}</span>
                    <span className="mt-0.5 block text-xs text-[#7f8c8d]">
                      {item.codigo}
                      {item.marca ? ` · ${item.marca}` : ""}
                      {item.color ? ` · ${item.color}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[#2c3e50]">stock {item.cantidad}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
