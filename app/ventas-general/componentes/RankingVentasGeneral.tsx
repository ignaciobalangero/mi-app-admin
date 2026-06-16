"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import useCotizacion from "@/lib/hooks/useCotizacion";
import {
  agregarLineasVenta,
  fechaDeVenta,
  inicioMesActual,
  inicioSemanaActual,
  topVentasDesdeMapa,
  type LineaVentaAgregada,
} from "@/lib/ventasRankingHelpers";

function TablaRanking({
  titulo,
  filas,
  cargando,
}: {
  titulo: string;
  filas: LineaVentaAgregada[];
  cargando: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#ecf0f1] p-4 shadow-sm">
      <h4 className="font-bold text-[#2c3e50] mb-3">{titulo}</h4>
      {cargando ? (
        <p className="text-sm text-[#7f8c8d]">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="text-sm text-[#7f8c8d]">Sin ventas en el período.</p>
      ) : (
        <ol className="space-y-2">
          {filas.map((f, i) => (
            <li
              key={f.clave}
              className="flex items-start justify-between gap-2 text-sm border-b border-[#ecf0f1] pb-2 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-[#3498db] mr-2">#{i + 1}</span>
                <span className="text-[#2c3e50]">{f.nombre}</span>
                {f.codigo && (
                  <span className="block text-xs text-[#7f8c8d]">Cód: {f.codigo}</span>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-[#27ae60]">{f.cantidad} u.</div>
                <div className="text-xs text-[#7f8c8d]">
                  ${Math.round(f.importeARS).toLocaleString("es-AR")}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function RankingVentasGeneral() {
  const { rol } = useRol();
  const { cotizacion } = useCotizacion(rol?.negocioID || "");
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [topSemana, setTopSemana] = useState<LineaVentaAgregada[]>([]);
  const [topMes, setTopMes] = useState<LineaVentaAgregada[]>([]);
  const [totalVentasMes, setTotalVentasMes] = useState(0);

  useEffect(() => {
    if (!abierto || !rol?.negocioID) return;

    const cargar = async () => {
      setCargando(true);
      try {
        const desde = inicioMesActual();
        const snap = await getDocs(
          query(
            collection(db, `negocios/${rol.negocioID}/ventasGeneral`),
            where("timestamp", ">=", Timestamp.fromDate(desde)),
            orderBy("timestamp", "desc")
          )
        );

        const inicioSem = inicioSemanaActual();
        const mapaSemana = new Map<string, LineaVentaAgregada>();
        const mapaMes = new Map<string, LineaVentaAgregada>();
        const cot = cotizacion > 0 ? cotizacion : 1200;

        snap.docs.forEach((d) => {
          const venta = d.data();
          const f = fechaDeVenta(venta);
          if (!f || f < desde) return;

          agregarLineasVenta(mapaMes, venta, cot);
          if (f >= inicioSem) {
            agregarLineasVenta(mapaSemana, venta, cot);
          }
        });

        setTotalVentasMes(snap.size);
        setTopSemana(topVentasDesdeMapa(mapaSemana, 10));
        setTopMes(topVentasDesdeMapa(mapaMes, 10));
      } catch (e) {
        console.error("[RankingVentas]", e);
        setTopSemana([]);
        setTopMes([]);
      } finally {
        setCargando(false);
      }
    };

    void cargar();
  }, [abierto, rol?.negocioID, cotizacion]);

  return (
    <div className="bg-white rounded-xl border border-[#ecf0f1] shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f8f9fa] text-left"
      >
        <span className="font-bold text-[#2c3e50] flex items-center gap-2">
          📈 Más vendidos (semana y mes)
        </span>
        <span className="text-[#7f8c8d] text-sm">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div className="px-4 pb-4 border-t border-[#ecf0f1] pt-4">
          <p className="text-xs text-[#7f8c8d] mb-4">
            Top 10 por unidades vendidas. Semana = últimos 7 días. Mes = mes calendario actual (
            {totalVentasMes} ventas cargadas).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TablaRanking titulo="🏆 Top 10 — semana" filas={topSemana} cargando={cargando} />
            <TablaRanking titulo="🏆 Top 10 — mes" filas={topMes} cargando={cargando} />
          </div>
        </div>
      )}
    </div>
  );
}
