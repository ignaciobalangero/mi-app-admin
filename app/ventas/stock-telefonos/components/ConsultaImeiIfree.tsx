"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import {
  CONSULTAS_IFREE,
  consultaIncluida,
  planControlImeiDesde,
  type ChequeoImei,
  type ConsultaImeiId,
  type PlanControlImei,
  type ResultadoConsultaImei,
} from "@/lib/ifree/consultasImei";

type Props = {
  negocioID: string;
  /** En el formulario el IMEI ya está escrito arriba. En la página suelta se tipea acá. */
  variante?: "compacto" | "libre";
  imei?: string;
  chequeo?: ChequeoImei | null;
  onChequeo?: (chequeo: ChequeoImei) => void;
};

const ORDEN: ConsultaImeiId[] = ["blacklist", "fmi", "icloud"];

const ESTILO: Record<ResultadoConsultaImei["nivel"], { caja: string; marca: string }> = {
  ok: { caja: "border-emerald-200 bg-emerald-50", marca: "text-emerald-800" },
  alerta: { caja: "border-amber-200 bg-amber-50", marca: "text-amber-900" },
  peligro: { caja: "border-red-200 bg-red-50", marca: "text-red-800" },
  info: { caja: "border-slate-200 bg-slate-50", marca: "text-slate-700" },
};

function digitos(valor: string): string {
  return String(valor || "").replace(/\D/g, "").slice(0, 15);
}

function imeiVisible(valor: string): string {
  const d = digitos(valor);
  return [d.slice(0, 6), d.slice(6, 12), d.slice(12)].filter(Boolean).join(" ");
}

function resumen(plan: PlanControlImei, chequeo: ChequeoImei | null, imeiOk: string): string | null {
  if (!chequeo || chequeo.imei !== imeiOk) return null;
  const incluidos = ORDEN.filter((id) => consultaIncluida(plan, id));
  const hechos = incluidos.map((id) => chequeo[id]).filter(Boolean) as ResultadoConsultaImei[];
  if (!hechos.length) return null;
  if (hechos.some((r) => r.nivel === "peligro")) return "No lo recibas: hay una alerta grave.";
  if (hechos.some((r) => r.nivel === "alerta")) return "Ojo: lo pueden bloquear a distancia.";
  if (hechos.length < incluidos.length) return "Falta consultar alguna opción para cerrar el panorama.";
  return "Las consultas hechas salieron bien.";
}

export default function ConsultaImeiIfree({
  negocioID,
  variante = "compacto",
  imei = "",
  chequeo = null,
  onChequeo,
}: Props) {
  const [user] = useAuthState(auth);
  const [plan, setPlan] = useState<PlanControlImei>("off");
  const [imeiLibre, setImeiLibre] = useState("");
  const [chequeoLibre, setChequeoLibre] = useState<ChequeoImei | null>(null);
  const [chequeoPropio, setChequeoPropio] = useState<ChequeoImei | null>(null);
  const [consultando, setConsultando] = useState<ConsultaImeiId | null>(null);
  const [aviso, setAviso] = useState("");

  const libre = variante === "libre";
  const imeiTexto = libre ? imeiLibre : imei;
  const chequeoActual = libre ? chequeoLibre : onChequeo ? chequeo : chequeoPropio;
  const guardar = (siguiente: ChequeoImei) => {
    if (libre) setChequeoLibre(siguiente);
    else if (onChequeo) onChequeo(siguiente);
    else setChequeoPropio(siguiente);
  };

  useEffect(() => {
    if (!negocioID) return;
    let cancelado = false;
    getDoc(doc(db, `negocios/${negocioID}/configuracion/datos`))
      .then((snap) => {
        if (!cancelado) setPlan(planControlImeiDesde(snap.data()));
      })
      .catch(() => {
        if (!cancelado) setPlan("off");
      });
    return () => {
      cancelado = true;
    };
  }, [negocioID]);

  const imeiOk = digitos(imeiTexto);
  const listo = imeiOk.length === 15;
  const vigente = chequeoActual && chequeoActual.imei === imeiOk ? chequeoActual : null;
  const frase = resumen(plan, vigente, imeiOk);

  const consultar = async (consulta: ConsultaImeiId) => {
    if (!consultaIncluida(plan, consulta)) {
      setAviso(
        plan === "imei"
          ? "Perdido y lista negra entran en Controlar todo. Pedilo y lo sumamos."
          : "El control de IMEI no está en tu plan. Pedilo y lo activamos."
      );
      return;
    }
    if (!user || !listo || consultando) return;
    setConsultando(consulta);
    setAviso("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/ifree/consultar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ negocioID, imei: imeiOk, consulta }),
      });
      const data = await res.json();
      if (!res.ok || !data.resultado) {
        setAviso(String(data.error || "No se pudo consultar el IMEI."));
        return;
      }
      guardar({
        imei: imeiOk,
        ...(vigente || {}),
        [consulta]: data.resultado as ResultadoConsultaImei,
      });
    } catch (e) {
      console.error(e);
      setAviso("No se pudo consultar el IMEI.");
    } finally {
      setConsultando(null);
    }
  };

  return (
    <div className={libre ? "space-y-5" : "mt-2 space-y-3"}>
      {libre && (
        <div>
          <label className="block text-sm font-semibold text-[#2c3e50] mb-2" htmlFor="imei-libre">
            IMEI
          </label>
          <input
            id="imei-libre"
            inputMode="numeric"
            autoComplete="off"
            value={imeiVisible(imeiLibre)}
            onChange={(e) => {
              setImeiLibre(digitos(e.target.value));
              setAviso("");
            }}
            placeholder="000000 000000 000"
            className="w-full rounded-xl border-2 border-[#d5dbdb] bg-white px-4 py-3 font-mono text-lg tracking-wide text-[#2c3e50] outline-none focus:border-[#3498db]"
          />
          <p className={`mt-1 text-xs ${listo ? "text-emerald-700" : "text-[#7f8c8d]"}`}>
            {imeiOk.length}/15 dígitos
          </p>
        </div>
      )}

      <div className={`grid gap-3 ${libre ? "sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
        {ORDEN.map((id) => {
          const item = CONSULTAS_IFREE[id];
          const incluido = consultaIncluida(plan, id);
          const resultado = vigente?.[id];
          const estilo = resultado ? ESTILO[resultado.nivel] : null;
          return (
            <div
              key={id}
              className={`flex flex-col rounded-xl border p-3 ${
                estilo ? estilo.caja : "border-[#d6eaf8] bg-white"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7f8c8d]">
                {item.pregunta}
              </p>
              <p className="mt-1 text-sm font-bold text-[#2c3e50]">{item.nombre}</p>
              {resultado ? (
                <div className="mt-2">
                  <p className={`text-sm font-bold ${estilo?.marca}`}>{resultado.titulo}</p>
                  <p className="mt-1 whitespace-pre-line text-xs leading-snug text-[#2c3e50]/80">
                    {resultado.detalle}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#7f8c8d]">{item.ayuda}</p>
              )}
              <button
                type="button"
                onClick={() => consultar(id)}
                disabled={incluido && (!listo || consultando !== null)}
                className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                  incluido
                    ? "bg-[#2c3e50] text-white disabled:opacity-40"
                    : "border border-dashed border-[#3498db] bg-[#f4f9fd] text-[#1a5276]"
                }`}
              >
                {consultando === id
                  ? "Consultando…"
                  : !incluido
                    ? "Pedir esta consulta"
                    : resultado
                      ? "Consultar de nuevo"
                      : "Consultar"}
              </button>
            </div>
          );
        })}
      </div>

      {frase && (
        <p
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            frase.startsWith("No lo recibas")
              ? "bg-red-100 text-red-800"
              : frase.startsWith("Ojo")
                ? "bg-amber-100 text-amber-900"
                : frase.startsWith("Falta")
                  ? "bg-slate-100 text-slate-700"
                  : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {frase}
        </p>
      )}
      {!listo && (plan === "imei" || plan === "todo") && !libre && (
        <p className="text-xs text-[#7f8c8d]">Completá los 15 dígitos del IMEI para consultar.</p>
      )}
      {aviso && <p className="text-xs font-medium text-[#1a5276]">{aviso}</p>}
    </div>
  );
}
