"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { esSuperAdminUsuario } from "@/lib/superAdminConstants";
import {
  previsualizarRenombrarCliente,
  renombrarClienteEnSistema,
  renombrarFichaClienteSiExiste,
  type ResultadoRenombrarCliente,
} from "@/lib/renombrarClienteEnSistema";

function mostrarNombreConEspacios(s: string): string {
  return JSON.stringify(s);
}

export default function UnificarNombreClientePage() {
  const auth = getAuth();
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const [negocioID, setNegocioID] = useState("");
  const [nombreAnterior, setNombreAnterior] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [tambienFicha, setTambienFicha] = useState(true);

  const [preview, setPreview] = useState<ResultadoRenombrarCliente | null>(null);
  const [resultado, setResultado] = useState<string>("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
      setEmail(user?.email ?? null);
      setListo(true);
    });
    return () => unsub();
  }, [auth]);

  const esSuper = esSuperAdminUsuario({ uid, email });

  useEffect(() => {
    if (!listo) return;
    if (!esSuper) router.push("/");
  }, [listo, esSuper, router]);

  const previsualizar = async () => {
    setResultado("");
    setPreview(null);
    const nid = negocioID.trim();
    if (!nid) {
      setResultado("⚠️ Ingresá el negocioID");
      return;
    }
    if (nombreAnterior === "") {
      setResultado("⚠️ Ingresá el nombre anterior (exacto, con espacios si los tiene)");
      return;
    }
    setCargando(true);
    try {
      const r = await previsualizarRenombrarCliente(nid, nombreAnterior);
      setPreview(r);
      setResultado(
        r.total === 0
          ? `No hay registros con cliente = ${mostrarNombreConEspacios(nombreAnterior)} en ${nid}`
          : `Se actualizarían ${r.total} registros en ${nid}`
      );
    } catch (e) {
      setResultado(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCargando(false);
    }
  };

  const ejecutar = async () => {
    setResultado("");
    const nid = negocioID.trim();
    if (!nid) {
      setResultado("⚠️ Ingresá el negocioID");
      return;
    }
    if (nombreAnterior === "" || nombreNuevo === "") {
      setResultado("⚠️ Completá nombre anterior y nombre nuevo");
      return;
    }
    if (nombreAnterior === nombreNuevo) {
      setResultado("⚠️ Son iguales; no hay nada que cambiar");
      return;
    }

    const ok = window.confirm(
      `¿Unificar en negocio "${nid}"?\n\n` +
        `De: ${mostrarNombreConEspacios(nombreAnterior)}\n` +
        `A:  ${mostrarNombreConEspacios(nombreNuevo)}\n\n` +
        `Solo este negocio. No toca otros.`
    );
    if (!ok) return;

    setCargando(true);
    try {
      const r = await renombrarClienteEnSistema(nid, nombreAnterior, nombreNuevo);
      let fichas = 0;
      if (tambienFicha) {
        fichas = await renombrarFichaClienteSiExiste(nid, nombreAnterior, nombreNuevo);
      }
      setPreview(r);
      setResultado(
        `✅ Listo en ${nid}: ${r.total} movimientos actualizados` +
          (fichas ? `, ${fichas} ficha(s) en Clientes` : "") +
          `. Después conviene Recalcular saldos en esa cuenta.`
      );
    } catch (e) {
      setResultado(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCargando(false);
    }
  };

  if (!listo || !esSuper) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <p className="text-[#7f8c8d]">Verificando acceso…</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-8">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#16a085] rounded-2xl p-6 text-white shadow-lg">
          <h1 className="text-2xl font-bold mb-1">Unificar nombre de cliente</h1>
          <p className="text-white/90 text-sm">
            Super admin · por negocio (no global). Actualiza trabajos, pagos,
            ventasGeneral, ventaTelefonos y ventaAccesorios.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#ecf0f1] p-6 shadow space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[#2c3e50]">negocioID</span>
            <input
              className="mt-1 w-full border border-[#bdc3c7] rounded-lg px-3 py-2"
              value={negocioID}
              onChange={(e) => setNegocioID(e.target.value)}
              placeholder="ej. iphonetec"
              autoComplete="off"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#2c3e50]">
              Nombre anterior (exacto)
            </span>
            <input
              className="mt-1 w-full border border-[#bdc3c7] rounded-lg px-3 py-2 font-mono text-sm"
              value={nombreAnterior}
              onChange={(e) => setNombreAnterior(e.target.value)}
              placeholder={'Martin Giordano '}
              autoComplete="off"
              spellCheck={false}
            />
            <span className="text-xs text-[#7f8c8d]">
              Valor exacto: {mostrarNombreConEspacios(nombreAnterior)} · largo{" "}
              {nombreAnterior.length}
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#2c3e50]">Nombre nuevo</span>
            <input
              className="mt-1 w-full border border-[#bdc3c7] rounded-lg px-3 py-2 font-mono text-sm"
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="Martin Giordano"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="text-xs text-[#7f8c8d]">
              Valor exacto: {mostrarNombreConEspacios(nombreNuevo)} · largo{" "}
              {nombreNuevo.length}
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm text-[#2c3e50]">
            <input
              type="checkbox"
              checked={tambienFicha}
              onChange={(e) => setTambienFicha(e.target.checked)}
            />
            También renombrar ficha en Clientes si existe con el nombre anterior
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={cargando}
              onClick={previsualizar}
              className="px-4 py-2 rounded-lg bg-[#3498db] text-white font-medium disabled:opacity-50"
            >
              Previsualizar
            </button>
            <button
              type="button"
              disabled={cargando}
              onClick={ejecutar}
              className="px-4 py-2 rounded-lg bg-[#16a085] text-white font-medium disabled:opacity-50"
            >
              Ejecutar en este negocio
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/super")}
              className="px-4 py-2 rounded-lg border border-[#bdc3c7] text-[#2c3e50]"
            >
              Volver
            </button>
          </div>

          {resultado && (
            <p className="text-sm text-[#2c3e50] whitespace-pre-wrap border-t pt-3">
              {resultado}
            </p>
          )}

          {preview && (
            <ul className="text-sm text-[#34495e] space-y-1 border-t pt-3">
              {Object.entries(preview.porColeccion).map(([col, n]) => (
                <li key={col}>
                  <code>{col}</code>: {n}
                </li>
              ))}
              <li className="font-semibold">Total: {preview.total}</li>
            </ul>
          )}
        </div>

        <p className="text-xs text-[#7f8c8d]">
          Tip: para un espacio al final, escribí el nombre y dejá el espacio, o
          pegalo desde Firebase. El recuadro muestra el valor entre comillas para
          verificarlo. Repetí el proceso por cada negocioID que lo necesite.
        </p>
      </div>
    </main>
  );
}
