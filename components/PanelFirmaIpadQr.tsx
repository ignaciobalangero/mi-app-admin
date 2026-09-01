"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import QRCode from "qrcode";
import { generarTokenPublicoTrabajo, urlFirmarTrabajoPublico } from "@/lib/trabajosFotos";

type Props = {
  negocioID: string;
  tokenPublico?: string;
  trabajoFirebaseId?: string;
  /** Carga el QR al montar (por defecto true). */
  autoLoad?: boolean;
  /** Si falta el id del trabajo en Firebase, muestra aviso en lugar del QR. */
  pendienteGuardado?: boolean;
  className?: string;
  onTokenGenerado?: (token: string) => void;
};

export default function PanelFirmaIpadQr({
  negocioID,
  tokenPublico: tokenInicial,
  trabajoFirebaseId,
  autoLoad = true,
  pendienteGuardado = false,
  className = "",
  onTokenGenerado,
}: Props) {
  const [urlFirmar, setUrlFirmar] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [visible, setVisible] = useState(autoLoad);
  const [error, setError] = useState("");

  const preparar = useCallback(async (): Promise<string> => {
    if (!negocioID || pendienteGuardado) return "";

    setCargando(true);
    setError("");

    try {
      let token = String(tokenInicial || "").trim();
      const firebaseId = String(trabajoFirebaseId || "").trim();

      if (!token && firebaseId) {
        token = generarTokenPublicoTrabajo();
        try {
          await updateDoc(doc(db, `negocios/${negocioID}/trabajos/${firebaseId}`), {
            tokenPublico: token,
          });
          onTokenGenerado?.(token);
        } catch (e) {
          console.warn("No se pudo guardar tokenPublico:", e);
        }
      }

      if (!token) {
        setError("Guardá el trabajo e intentá de nuevo.");
        setUrlFirmar("");
        setQrDataUrl("");
        return "";
      }

      const url = urlFirmarTrabajoPublico(window.location.origin, negocioID, token);
      setUrlFirmar(url);
      setQrDataUrl(await QRCode.toDataURL(url, { width: 200, margin: 1 }));
      return url;
    } catch (e) {
      console.warn("PanelFirmaIpadQr:", e);
      setError("No se pudo generar el QR de firma.");
      return "";
    } finally {
      setCargando(false);
    }
  }, [negocioID, tokenInicial, trabajoFirebaseId, pendienteGuardado, onTokenGenerado]);

  useEffect(() => {
    if (visible && !pendienteGuardado) {
      void preparar();
    }
  }, [visible, pendienteGuardado, preparar]);

  const copiarLink = async () => {
    const url = urlFirmar || (await preparar());
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      alert("No se pudo copiar el link");
    }
  };

  const abrirLink = async () => {
    const url = urlFirmar || (await preparar());
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (pendienteGuardado) {
    return (
      <div
        className={`rounded-xl border border-[#9b59b6]/30 bg-[#f5eef8] p-3 text-xs text-[#2c3e50] ${className}`}
      >
        <p className="font-semibold text-sm">📱 Firmar desde el iPad</p>
        <p className="text-[#7f8c8d] mt-1">
          Guardá la orden primero. Al guardar, vas a ver el QR en las opciones de impresión para que el
          cliente firme en el iPad.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[#9b59b6]/40 bg-[#f5eef8] p-3 text-xs text-[#2c3e50] space-y-2 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">📱 Firmar desde el iPad</p>
          <p className="text-[#7f8c8d] mt-0.5">
            Escaneá el QR o abrí el link en el iPad. El cliente firma con el dedo o Apple Pencil, sin
            entrar a toda la app.
          </p>
        </div>
        {!autoLoad && !visible ? (
          <button
            type="button"
            onClick={() => setVisible(true)}
            className="px-3 py-1.5 rounded-lg bg-[#9b59b6] text-white text-xs font-semibold hover:bg-[#8e44ad] shrink-0"
          >
            Mostrar QR
          </button>
        ) : null}
      </div>

      {visible ? (
        <>
          {cargando ? (
            <p className="text-center text-[#7f8c8d] py-4">Generando QR…</p>
          ) : error ? (
            <p className="text-center text-[#e74c3c] py-2">{error}</p>
          ) : qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR firmar en iPad"
              className="w-40 h-40 mx-auto border border-[#d7bde2] rounded-lg bg-white"
            />
          ) : null}

          {urlFirmar ? (
            <a
              href={urlFirmar}
              target="_blank"
              rel="noreferrer"
              className="text-[#8e44ad] break-all underline block text-center"
            >
              {urlFirmar}
            </a>
          ) : null}

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={abrirLink}
              disabled={cargando}
              className="px-3 py-1.5 rounded-lg bg-[#9b59b6] text-white text-xs font-semibold hover:bg-[#8e44ad] disabled:opacity-50"
            >
              Abrir en iPad / nueva pestaña
            </button>
            <button
              type="button"
              onClick={copiarLink}
              disabled={cargando}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#9b59b6] text-[#8e44ad] text-xs font-semibold hover:bg-[#ebdef0] disabled:opacity-50"
            >
              {copiado ? "✓ Link copiado" : "Copiar link"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
