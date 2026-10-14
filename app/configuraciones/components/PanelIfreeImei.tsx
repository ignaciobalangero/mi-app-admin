"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CONSULTAS_IFREE,
  consultaIncluida,
  planControlImeiDesde,
  type ConsultaImeiId,
  type PlanControlImei,
} from "@/lib/ifree/consultasImei";

type Props = { negocioID: string };

const ORDEN: ConsultaImeiId[] = ["fmi", "icloud", "blacklist"];

const TEXTO_PLAN: Record<PlanControlImei, string> = {
  off: "Todavía no está en tu suscripción. Pedilo y lo activamos.",
  imei: "Tenés Controlar IMEI. Al cargar un teléfono podés ver si Buscar mi iPhone está activado.",
  todo: "Tenés Controlar todo. Al cargar un teléfono podés ver Buscar mi iPhone, si está en perdido y la lista negra.",
};

export default function PanelIfreeImei({ negocioID }: Props) {
  const [plan, setPlan] = useState<PlanControlImei>("off");

  useEffect(() => {
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

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold text-[#2c3e50]">Control de IMEI</h3>
        <p className="text-sm text-[#7f8c8d] mt-1">
          Cuando entra un equipo, en stock o como parte de pago, podés chequearlo antes de quedártelo.
        </p>
      </div>

      <div
        className={`rounded-xl border p-4 text-sm font-medium ${
          plan === "off"
            ? "border-[#f5cba7] bg-[#fef5e7] text-[#9a7d0a]"
            : "border-[#abebc6] bg-[#e8f8f5] text-[#196f3d]"
        }`}
      >
        {TEXTO_PLAN[plan]}
      </div>

      <div className="space-y-3">
        {ORDEN.map((id) => {
          const item = CONSULTAS_IFREE[id];
          const incluido = consultaIncluida(plan, id);
          return (
            <div key={id} className="rounded-xl border border-[#ecf0f1] p-4">
              <p className="font-semibold text-[#2c3e50]">
                {item.nombre}{" "}
                <span className={incluido ? "text-[#196f3d]" : "text-[#7f8c8d]"}>
                  {incluido ? "· incluido" : "· no incluido"}
                </span>
              </p>
              <p className="text-sm text-[#7f8c8d] mt-1">{item.ayuda}</p>
            </div>
          );
        })}
      </div>

      {plan !== "todo" && (
        <p className="text-sm text-[#2c3e50]">
          {plan === "imei"
            ? "Perdido y lista negra entran en Controlar todo."
            : "Hay dos opciones: Controlar IMEI (Buscar mi iPhone) o Controlar todo (también perdido y lista negra)."}
        </p>
      )}
    </div>
  );
}
