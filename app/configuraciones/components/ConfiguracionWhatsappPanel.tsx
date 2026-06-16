"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  CONFIG_WHATSAPP_DEFAULT,
  ESTADOS_TRABAJO_WHATSAPP,
  type ParametroPlantillaWhatsapp,
  type WhatsappBusinessConfig,
} from "@/lib/whatsapp/whatsappBusinessTypes";

const PARAMETROS_DISPONIBLES: ParametroPlantillaWhatsapp[] = [
  "cliente",
  "modelo",
  "orden",
  "estado",
  "trabajo",
];

type Props = {
  negocioID: string;
};

function TutorialPaso({
  n,
  titulo,
  children,
}: {
  n: number;
  titulo: string;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(n === 1);
  return (
    <div className="border border-[#ecf0f1] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#f8f9fa] hover:bg-[#ecf0f1] text-left"
      >
        <span className="font-semibold text-[#2c3e50]">
          <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-[#25D366] text-white text-sm mr-2">
            {n}
          </span>
          {titulo}
        </span>
        <span className="text-[#7f8c8d]">{abierto ? "▲" : "▼"}</span>
      </button>
      {abierto && <div className="px-4 py-4 text-sm text-[#2c3e50] space-y-2">{children}</div>}
    </div>
  );
}

export default function ConfiguracionWhatsappPanel({ negocioID }: Props) {
  const [user] = useAuthState(auth);
  const [config, setConfig] = useState<WhatsappBusinessConfig>(CONFIG_WHATSAPP_DEFAULT);
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [telefonoPrueba, setTelefonoPrueba] = useState("");
  const [mostrarTutoriales, setMostrarTutoriales] = useState(true);

  useEffect(() => {
    if (!negocioID) return;
    const cargar = async () => {
      const snap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/whatsapp`));
      if (snap.exists()) {
        const d = snap.data();
        setConfig({
          activo: d.activo === true,
          phoneNumberId: String(d.phoneNumberId ?? ""),
          accessToken: String(d.accessToken ?? ""),
          estadosNotificar: {
            ...CONFIG_WHATSAPP_DEFAULT.estadosNotificar,
            ...(d.estadosNotificar || {}),
          },
          plantilla: {
            templateName: String(
              d.plantilla?.templateName ?? CONFIG_WHATSAPP_DEFAULT.plantilla.templateName
            ),
            languageCode: String(
              d.plantilla?.languageCode ?? CONFIG_WHATSAPP_DEFAULT.plantilla.languageCode
            ),
            parametros: Array.isArray(d.plantilla?.parametros)
              ? d.plantilla.parametros
              : CONFIG_WHATSAPP_DEFAULT.plantilla.parametros,
          },
          nombreNegocio: String(d.nombreNegocio ?? ""),
        });
      }
    };
    void cargar();
  }, [negocioID]);

  const guardar = async () => {
    if (!negocioID) return;
    setGuardando(true);
    setMensaje("");
    try {
      await setDoc(doc(db, `negocios/${negocioID}/configuracion/whatsapp`), config, {
        merge: true,
      });
      setMensaje("✅ Configuración guardada para este negocio.");
    } catch (e) {
      console.error("[whatsapp config]", e);
      setMensaje(
        `❌ No se pudo guardar: ${e instanceof Error ? e.message : "error desconocido"}`
      );
    } finally {
      setGuardando(false);
    }
  };

  const probarEnvio = async () => {
    if (!user || !negocioID) return;
    setProbando(true);
    setMensaje("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/whatsapp/enviar-estado-trabajo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          negocioID,
          trabajoId: "prueba",
          cliente: "Cliente prueba",
          modelo: "iPhone 13",
          trabajo: "Cambio de pantalla",
          estadoAnterior: "PENDIENTE",
          nuevoEstado: "REPARADO",
          ordenId: "TEST-001",
          telefonoPrueba,
        }),
      });
      const data = await res.json();
      if (data.ok && !data.skipped) {
        setMensaje("✅ Mensaje de prueba enviado. Revisá tu WhatsApp.");
      } else if (data.skipped) {
        setMensaje(`ℹ️ No enviado: ${data.reason || "omitido"}`);
      } else {
        setMensaje(`❌ ${data.reason || data.error || "Error"}`);
      }
    } catch {
      setMensaje("❌ Error de red al probar.");
    } finally {
      setProbando(false);
    }
  };

  const toggleEstado = (estado: (typeof ESTADOS_TRABAJO_WHATSAPP)[number]) => {
    setConfig((c) => ({
      ...c,
      estadosNotificar: {
        ...c.estadosNotificar,
        [estado]: !c.estadosNotificar[estado],
      },
    }));
  };

  const toggleParametro = (p: ParametroPlantillaWhatsapp) => {
    setConfig((c) => {
      const actuales = c.plantilla.parametros;
      const tiene = actuales.includes(p);
      const parametros = tiene ? actuales.filter((x) => x !== p) : [...actuales, p];
      return { ...c, plantilla: { ...c.plantilla, parametros } };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-[#2c3e50] flex items-center gap-2">
          <span className="text-xl">💬</span>
          WhatsApp Business — avisos de reparación
        </h3>
        <p className="text-sm text-[#7f8c8d] mt-1">
          Cada negocio configura <strong>su propio número</strong> y credenciales de Meta. Al
          cambiar el estado de un trabajo, Gestione puede avisar al cliente por WhatsApp.
        </p>
      </div>

      <div className="bg-[#e8f8f0] border border-[#25D366]/30 rounded-xl p-4 text-sm">
        <p className="font-semibold text-[#128C7E] mb-2">¿Qué se cobra?</p>
        <ul className="list-disc pl-5 space-y-1 text-[#2c3e50]">
          <li>
            <strong>Sí cobra:</strong> cada plantilla automática <strong>entregada</strong> por
            la API (categoría Utilidad, ~$38 ARS c/u en Argentina si el cliente no te escribió en
            las últimas 24 h).
          </li>
          <li>
            <strong>No cobra la API:</strong> si el envío falla, no se manda a Meta, o el cliente
            no tiene teléfono cargado (Gestione no llama a la API).
          </li>
          <li>
            <strong>WhatsApp manual</strong> desde la app en el celular no pasa por esta API: Meta
            no te factura esos chats como mensajes de plantilla de Gestione.
          </li>
        </ul>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setMostrarTutoriales((v) => !v)}
          className="text-sm font-semibold text-[#3498db] hover:underline"
        >
          {mostrarTutoriales ? "Ocultar tutorial de vinculación" : "Ver tutorial paso a paso"}
        </button>
      </div>

      {mostrarTutoriales && (
        <section className="space-y-3">
          <h4 className="font-bold text-[#2c3e50]">Tutorial: vincular tu WhatsApp Business</h4>

          <TutorialPaso n={1} titulo="Cuenta Meta Business y número">
            <p>
              Necesitás una{" "}
              <a
                href="https://business.facebook.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[#3498db] underline"
              >
                cuenta Meta Business
              </a>{" "}
              verificada y un número para WhatsApp Business (puede ser el de tu taller).
            </p>
            <p>
              En{" "}
              <a
                href="https://business.facebook.com/wa/manage/home/"
                target="_blank"
                rel="noreferrer"
                className="text-[#3498db] underline"
              >
                WhatsApp Manager
              </a>{" "}
              agregá y verificá el número si aún no está.
            </p>
          </TutorialPaso>

          <TutorialPaso n={2} titulo="Crear app en Meta for Developers">
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                Entrá a{" "}
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#3498db] underline"
                >
                  developers.facebook.com/apps
                </a>
                .
              </li>
              <li>Creá una app tipo <strong>Business</strong>.</li>
              <li>Agregá el producto <strong>WhatsApp</strong>.</li>
              <li>En el menú WhatsApp → <strong>API Setup</strong>, vinculá tu cuenta de WhatsApp Business.</li>
            </ol>
          </TutorialPaso>

          <TutorialPaso n={3} titulo="Obtener Phone Number ID">
            <p>
              En la misma pantalla <strong>API Setup</strong>, en la sección del número de
              prueba o tu número de producción, copiá el <strong>Phone number ID</strong> (número
              largo, no es tu teléfono).
            </p>
            <p>Pegalo abajo en el campo &quot;Phone Number ID&quot;.</p>
          </TutorialPaso>

          <TutorialPaso n={4} titulo="Generar Access Token permanente">
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                En{" "}
                <a
                  href="https://business.facebook.com/settings/system-users"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#3498db] underline"
                >
                  Business Settings → Usuarios del sistema
                </a>
                , creá un usuario sistema (rol Admin).
              </li>
              <li>Asignale activos: tu app de WhatsApp + la cuenta WABA, con permiso de mensajería.</li>
              <li>Generá un token con permiso <code className="bg-[#ecf0f1] px-1 rounded">whatsapp_business_messaging</code>.</li>
              <li>Copiá el token y pegalo abajo. <strong>No lo compartas.</strong></li>
            </ol>
            <p className="text-xs text-[#7f8c8d] mt-2">
              El token temporal de la pantalla API Setup sirve solo para pruebas rápidas (expira en
              24 h). Para producción usá el permanente del usuario sistema.
            </p>
          </TutorialPaso>

          <TutorialPaso n={5} titulo="Crear plantilla Utility (obligatoria)">
            <p>
              En{" "}
              <a
                href="https://business.facebook.com/wa/manage/message-templates/"
                target="_blank"
                rel="noreferrer"
                className="text-[#3498db] underline"
              >
                WhatsApp Manager → Plantillas
              </a>
              , creá una plantilla categoría <strong>Utilidad</strong>.
            </p>
            <p>Nombre sugerido: <code className="bg-[#ecf0f1] px-1 rounded">gestione_estado_trabajo</code></p>
            <p>Idioma: <strong>Español (Argentina)</strong> → código <code className="bg-[#ecf0f1] px-1 rounded">es_AR</code></p>
            <pre className="text-xs bg-[#f4f6f7] p-3 rounded-lg mt-2 overflow-x-auto">
              {`Hola {{1}}, tu equipo {{2}} (orden {{3}}) está en estado: {{4}}.`}
            </pre>
            <p>Esperá la aprobación de Meta (minutos u horas). El nombre y el orden de variables deben coincidir con la config de abajo.</p>
          </TutorialPaso>

          <TutorialPaso n={6} titulo="Cargar en Gestione y probar">
            <ol className="list-decimal pl-5 space-y-1">
              <li>Completá Phone Number ID y Token abajo.</li>
              <li>Activá los estados (ej. REPARADO, ENTREGADO).</li>
              <li>Marcá &quot;Activar avisos automáticos&quot; y guardá.</li>
              <li>En &quot;Probar envío&quot;, poné tu WhatsApp (549…) y enviá la prueba.</li>
              <li>Probá cambiando un trabajo real a REPARADO (el cliente debe tener teléfono en Clientes).</li>
            </ol>
          </TutorialPaso>
        </section>
      )}

      <section className="bg-white rounded-xl border border-[#ecf0f1] p-5 space-y-4">
        <h4 className="font-bold">Credenciales de este negocio</h4>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.activo}
            onChange={(e) => setConfig((c) => ({ ...c, activo: e.target.checked }))}
            className="w-5 h-5"
          />
          <span className="font-medium">Activar avisos automáticos</span>
        </label>

        <input
          type="text"
          value={config.phoneNumberId}
          onChange={(e) => setConfig((c) => ({ ...c, phoneNumberId: e.target.value }))}
          placeholder="Phone Number ID"
          className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg text-sm"
        />
        <input
          type="password"
          value={config.accessToken}
          onChange={(e) => setConfig((c) => ({ ...c, accessToken: e.target.value }))}
          placeholder="Access Token permanente"
          className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg text-sm"
        />
      </section>

      <section className="bg-white rounded-xl border border-[#ecf0f1] p-5 space-y-4">
        <h4 className="font-bold">Plantilla Meta</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={config.plantilla.templateName}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                plantilla: { ...c.plantilla, templateName: e.target.value },
              }))
            }
            placeholder="Nombre plantilla (gestione_estado_trabajo)"
            className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg text-sm"
          />
          <input
            type="text"
            value={config.plantilla.languageCode}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                plantilla: { ...c.plantilla, languageCode: e.target.value },
              }))
            }
            placeholder="Idioma (es_AR)"
            className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {PARAMETROS_DISPONIBLES.map((p) => (
            <label
              key={p}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer text-sm ${
                config.plantilla.parametros.includes(p)
                  ? "border-[#27ae60] bg-[#d5f4e6]"
                  : "border-[#bdc3c7]"
              }`}
            >
              <input
                type="checkbox"
                checked={config.plantilla.parametros.includes(p)}
                onChange={() => toggleParametro(p)}
              />
              {p}
            </label>
          ))}
        </div>
        <p className="text-xs text-[#7f8c8d]">
          Orden en plantilla:{" "}
          {config.plantilla.parametros.map((p, i) => `{{${i + 1}}}=${p}`).join(", ") || "ninguno"}
        </p>
      </section>

      <section className="bg-white rounded-xl border border-[#ecf0f1] p-5 space-y-2">
        <h4 className="font-bold">Estados que envían mensaje</h4>
        {ESTADOS_TRABAJO_WHATSAPP.map((estado) => (
          <label key={estado} className="flex items-center gap-3 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={!!config.estadosNotificar[estado]}
              onChange={() => toggleEstado(estado)}
            />
            {estado}
          </label>
        ))}
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-amber-900">Teléfono del cliente</p>
        <p className="text-amber-800 mt-1">
          El aviso va al teléfono en <strong>Clientes</strong> (mismo nombre que el trabajo). Sin
          teléfono → no se envía y <strong>no se cobra</strong>.
        </p>
      </section>

      <section className="bg-white rounded-xl border border-[#ecf0f1] p-5 space-y-3">
        <h4 className="font-bold">Probar envío</h4>
        <input
          type="text"
          value={telefonoPrueba}
          onChange={(e) => setTelefonoPrueba(e.target.value)}
          placeholder="Tu WhatsApp (5493511234567)"
          className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg text-sm"
        />
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={guardando}
          className="px-5 py-2.5 bg-[#25D366] hover:bg-[#1da851] text-white font-medium rounded-lg text-sm disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => void probarEnvio()}
          disabled={probando || !config.activo || !telefonoPrueba.trim()}
          className="px-5 py-2.5 bg-[#3498db] hover:bg-[#2980b9] text-white font-medium rounded-lg text-sm disabled:opacity-50"
        >
          {probando ? "Enviando…" : "Enviar prueba"}
        </button>
      </div>

      {mensaje && (
        <p className="text-sm font-medium p-3 bg-white rounded-lg border text-center">{mensaje}</p>
      )}
    </div>
  );
}
