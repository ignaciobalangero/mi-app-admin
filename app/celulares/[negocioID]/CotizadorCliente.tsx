"use client";

import { useMemo, useState } from "react";
import {
  armarConsultaWhatsapp,
  saldoCotizacion,
  textoMoneda,
  urlWhatsapp,
  type ModeloCotizacion,
} from "@/lib/cotizador/telefonos";

type EquipoCotizable = {
  id: string;
  marca: string;
  modelo: string;
  color: string;
  gb: string;
  moneda: "ARS" | "USD";
  precio: number;
};

function nombreEquipo(e: EquipoCotizable): string {
  const base =
    e.marca && !e.modelo.toLowerCase().includes(e.marca.toLowerCase())
      ? `${e.marca} ${e.modelo}`
      : e.modelo;
  return [base, e.gb, e.color].filter(Boolean).join(" ");
}

export default function CotizadorCliente({
  equipos,
  modelos,
  whatsapp,
  equipoId,
  onElegirEquipo,
}: {
  equipos: EquipoCotizable[];
  modelos: ModeloCotizacion[];
  whatsapp: string;
  equipoId: string;
  onElegirEquipo: (id: string) => void;
}) {
  const [modeloId, setModeloId] = useState("");
  const equipo = equipos.find((e) => e.id === equipoId) || null;
  const mio = modelos.find((m) => m.id === modeloId) || null;

  const cuenta = useMemo(() => {
    if (!equipo || !mio || !(equipo.precio > 0)) return null;
    return saldoCotizacion(equipo.moneda, equipo.precio, mio.moneda, mio.precio);
  }, [equipo, mio]);

  const link = useMemo(() => {
    if (!whatsapp || !equipo || !mio) return "";
    const texto = armarConsultaWhatsapp({
      equipo: nombreEquipo(equipo),
      precioEquipo: equipo.precio > 0 ? textoMoneda(equipo.moneda, equipo.precio) : "Consultar",
      miTelefono: mio.modelo,
      toma: textoMoneda(mio.moneda, mio.precio),
      saldo: cuenta?.mismaMoneda ? cuenta.texto : "",
      mismaMoneda: Boolean(cuenta?.mismaMoneda),
    });
    return urlWhatsapp(whatsapp, texto);
  }, [whatsapp, equipo, mio, cuenta]);

  return (
    <aside className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 space-y-3">
      <div>
        <h2 className="font-bold text-lg">Cotizador</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Elegí un equipo de la lista y el teléfono que entregás. Te queda el saldo para consultar por WhatsApp.
        </p>
      </div>

      <label className="block text-sm font-medium text-neutral-700">
        Equipo de la lista
        <select
          value={equipoId}
          onChange={(e) => onElegirEquipo(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Elegí un modelo</option>
          {equipos.map((e) => (
            <option key={e.id} value={e.id}>
              {nombreEquipo(e)} · {e.precio > 0 ? textoMoneda(e.moneda, e.precio) : "Consultar"}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-neutral-700">
        Tu teléfono
        <select
          value={modeloId}
          onChange={(e) => setModeloId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Elegí el que entregás</option>
          {modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.modelo} · {textoMoneda(m.moneda, m.precio)}
            </option>
          ))}
        </select>
      </label>

      {equipo && mio ? (
        <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-sm space-y-1">
          <p>
            <span className="text-neutral-500">Equipo: </span>
            <span className="font-semibold">{equipo.precio > 0 ? textoMoneda(equipo.moneda, equipo.precio) : "Consultar"}</span>
          </p>
          <p>
            <span className="text-neutral-500">Toman el tuyo: </span>
            <span className="font-semibold">{textoMoneda(mio.moneda, mio.precio)}</span>
          </p>
          {cuenta?.mismaMoneda ? (
            <p>
              <span className="text-neutral-500">Saldo: </span>
              <span className="font-bold text-emerald-700">{cuenta.texto}</span>
            </p>
          ) : (
            <p className="text-neutral-500">El saldo se confirma por WhatsApp porque están en monedas distintas.</p>
          )}
        </div>
      ) : null}

      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white"
        >
          Consultar por WhatsApp
        </a>
      ) : (
        <p className="text-xs text-neutral-400">
          {whatsapp
            ? "Elegí el equipo y tu teléfono para armar la consulta."
            : "El local todavía no cargó el WhatsApp."}
        </p>
      )}
    </aside>
  );
}
