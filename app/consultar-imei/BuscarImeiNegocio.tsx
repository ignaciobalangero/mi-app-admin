"use client";

import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Hallazgo = {
  id: string;
  tipo: "stock" | "reparacion" | "venta" | "partePago";
  titulo: string;
  detalle: string;
};

function digitos(valor: unknown): string {
  return String(valor ?? "").replace(/\D/g, "");
}

function fechaTexto(valor: unknown): string {
  if (!valor) return "";
  if (typeof valor === "string") return valor;
  if (
    typeof valor === "object" &&
    valor !== null &&
    "toDate" in valor &&
    typeof (valor as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      return (valor as { toDate: () => Date }).toDate().toLocaleDateString("es-AR");
    } catch {
      return "";
    }
  }
  return "";
}

function coincide(guardado: unknown, buscado: string): boolean {
  const limpio = digitos(guardado);
  return limpio.length >= 10 && limpio === buscado;
}

function textoEquipo(data: Record<string, unknown>): string {
  const gb = String(data.gb ?? "").trim();
  const gbTexto = gb ? (gb.toLowerCase().includes("gb") ? gb : `${gb} GB`) : "";
  return [data.marca, data.modelo, gbTexto, data.color]
    .map((parte) => String(parte ?? "").trim())
    .filter((parte) => parte && parte !== "—")
    .join(" ");
}

export default function BuscarImeiNegocio({
  negocioID,
  imei,
}: {
  negocioID: string;
  imei: string;
}) {
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [hallazgos, setHallazgos] = useState<Hallazgo[] | null>(null);

  const buscar = async () => {
    const buscado = digitos(imei);
    if (buscado.length < 10) {
      setAviso("Ingresá el IMEI completo para buscarlo en el negocio.");
      setHallazgos(null);
      return;
    }
    setBuscando(true);
    setAviso("");
    setHallazgos(null);
    try {
      const base = `negocios/${negocioID}`;
      const [stockSnap, trabajosSnap, ventasTelSnap, ventasSnap] = await Promise.all([
        getDocs(collection(db, `${base}/stockTelefonos`)),
        getDocs(collection(db, `${base}/trabajos`)),
        getDocs(collection(db, `${base}/ventaTelefonos`)),
        getDocs(collection(db, `${base}/ventasGeneral`)),
      ]);

      const lista: Hallazgo[] = [];
      const ventasYaVistas = new Set<string>();
      const partesYaVistas = new Set<string>();

      stockSnap.docs.forEach((item) => {
        const data = item.data();
        if (!coincide(data.imei, buscado)) return;
        const equipo = textoEquipo(data) || "Teléfono en stock";
        lista.push({
          id: `stock-${item.id}`,
          tipo: "stock",
          titulo: "En stock",
          detalle: [equipo, data.estado ? String(data.estado) : "", fechaTexto(data.fechaIngreso)]
            .filter(Boolean)
            .join(" · "),
        });
      });

      trabajosSnap.docs.forEach((item) => {
        const data = item.data();
        if (!coincide(data.imei, buscado)) return;
        const orden = String(data.id || data.nroOrden || "").trim();
        lista.push({
          id: `rep-${item.id}`,
          tipo: "reparacion",
          titulo: "Reparación",
          detalle: [
            orden ? `Orden ${orden}` : "",
            String(data.cliente || "").trim(),
            textoEquipo(data) || String(data.modelo || "").trim(),
            String(data.estado || "").trim(),
            String(data.trabajo || "").trim(),
            fechaTexto(data.fecha),
          ]
            .filter(Boolean)
            .join(" · "),
        });
      });

      ventasTelSnap.docs.forEach((item) => {
        const data = item.data();
        const nro = String(data.nroVenta || "").trim();
        if (coincide(data.imei, buscado)) {
          if (nro) ventasYaVistas.add(nro);
          lista.push({
            id: `venta-${item.id}`,
            tipo: "venta",
            titulo: "Vendido",
            detalle: [
              nro ? `Venta #${nro}` : "",
              String(data.cliente || "").trim(),
              textoEquipo(data) || String(data.modelo || "").trim(),
              fechaTexto(data.fecha),
            ]
              .filter(Boolean)
              .join(" · "),
          });
        }

        const recibidos = [
          ...(Array.isArray(data.telefonosRecibidos) ? data.telefonosRecibidos : []),
          ...(data.telefonoRecibido ? [data.telefonoRecibido] : []),
        ];
        const tel = recibidos.find(
          (itemTel) =>
            itemTel &&
            typeof itemTel === "object" &&
            coincide((itemTel as Record<string, unknown>).imei, buscado)
        ) as Record<string, unknown> | undefined;
        if (!tel) return;
        if (nro) partesYaVistas.add(nro);
        lista.push({
          id: `pago-tel-${item.id}`,
          tipo: "partePago",
          titulo: "Entró como parte de pago",
          detalle: [
            nro ? `Venta #${nro}` : "",
            String(data.cliente || "").trim(),
            textoEquipo(tel) || String(tel.modelo || "").trim(),
            fechaTexto(data.fecha),
          ]
            .filter(Boolean)
            .join(" · "),
        });
      });

      ventasSnap.docs.forEach((item) => {
        const data = item.data();
        const nro = String(data.nroVenta || "").trim();
        const productos = Array.isArray(data.productos) ? data.productos : [];
        const vendido = productos.some((producto) => {
          if (!producto || typeof producto !== "object") return false;
          const linea = producto as Record<string, unknown>;
          const completo =
            linea.datosTelefonoCompletos && typeof linea.datosTelefonoCompletos === "object"
              ? (linea.datosTelefonoCompletos as Record<string, unknown>).imei
              : "";
          return coincide(linea.imei, buscado) || coincide(completo, buscado);
        });
        if (vendido && !(nro && ventasYaVistas.has(nro))) {
          const linea = productos.find((producto) => {
            if (!producto || typeof producto !== "object") return false;
            const p = producto as Record<string, unknown>;
            return coincide(p.imei, buscado);
          }) as Record<string, unknown> | undefined;
          lista.push({
            id: `vgen-${item.id}`,
            tipo: "venta",
            titulo: "Vendido",
            detalle: [
              nro ? `Venta #${nro}` : "",
              String(data.cliente || "").trim(),
              linea ? textoEquipo(linea) || String(linea.modelo || linea.descripcion || "").trim() : "",
              fechaTexto(data.fecha),
            ]
              .filter(Boolean)
              .join(" · "),
          });
        }

        const recibidos = [
          ...(Array.isArray(data.telefonosRecibidos) ? data.telefonosRecibidos : []),
          ...(data.telefonoRecibido ? [data.telefonoRecibido] : []),
        ];
        const entro = recibidos.some(
          (tel) => tel && typeof tel === "object" && coincide((tel as Record<string, unknown>).imei, buscado)
        );
        if (!entro || (nro && partesYaVistas.has(nro))) return;
        const tel = recibidos.find(
          (itemTel) =>
            itemTel &&
            typeof itemTel === "object" &&
            coincide((itemTel as Record<string, unknown>).imei, buscado)
        ) as Record<string, unknown> | undefined;
        lista.push({
          id: `pago-${item.id}`,
          tipo: "partePago",
          titulo: "Entró como parte de pago",
          detalle: [
            nro ? `Venta #${nro}` : "",
            String(data.cliente || "").trim(),
            tel ? textoEquipo(tel) || String(tel.modelo || "").trim() : "",
            fechaTexto(data.fecha),
          ]
            .filter(Boolean)
            .join(" · "),
        });
      });

      setHallazgos(lista);
      if (lista.length === 0) {
        setAviso("Este IMEI no figura en stock, reparaciones ni ventas.");
      }
    } catch (error) {
      console.error(error);
      setAviso("No se pudo buscar el IMEI en el negocio.");
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="mt-8 border-t border-[#ecf0f1] pt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#16a085]">En este negocio</p>
      <h2 className="mt-1 text-lg font-bold text-[#2c3e50]">¿Pasó por el sistema?</h2>
      <p className="mt-1 text-sm text-[#7f8c8d]">
        Busca el mismo IMEI en el stock, en las reparaciones y en las ventas, aunque ya no esté cargado ahora.
      </p>
      <button
        type="button"
        onClick={() => void buscar()}
        disabled={buscando || digitos(imei).length < 10}
        className="mt-4 rounded-xl bg-[#16a085] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
      >
        {buscando ? "Buscando…" : "Buscar en el negocio"}
      </button>
      {aviso ? <p className="mt-3 text-sm font-medium text-[#2c3e50]">{aviso}</p> : null}
      {hallazgos && hallazgos.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {hallazgos.map((item) => (
            <li key={item.id} className="rounded-xl border border-[#d5f5e3] bg-[#f4fbf7] px-4 py-3">
              <p className="text-sm font-bold text-[#0e6655]">{item.titulo}</p>
              <p className="mt-1 text-sm text-[#2c3e50]">{item.detalle}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
