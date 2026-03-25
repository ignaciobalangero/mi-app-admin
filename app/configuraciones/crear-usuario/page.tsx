"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import PanelCuentasNegocio from "../components/PanelCuentasNegocio";

type ClienteRow = { id: string; nombre: string };

export default function CrearUsuarioPage() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("empleado");
  /** Empleado: texto libre (minúsculas al guardar). Cliente: nombre exacto del doc en `clientes` (solo por buscador). */
  const [nombre, setNombre] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesLista, setClientesLista] = useState<ClienteRow[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const sugerenciasRef = useRef<HTMLDivElement>(null);

  const [mensaje, setMensaje] = useState("");
  const [mensajeOk, setMensajeOk] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resumenCreado, setResumenCreado] = useState<{
    email: string;
    rol: string;
    negocioID: string;
    nombre?: string;
  } | null>(null);
  const [refreshCuentas, setRefreshCuentas] = useState(0);

  useEffect(() => {
    const obtenerNegocio = async () => {
      if (user) {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists()) {
          const negocio = snap.data().negocioID;
          if (negocio) setNegocioID(negocio);
        }
      }
    };
    obtenerNegocio();
  }, [user]);

  useEffect(() => {
    const cargarClientes = async () => {
      if (!negocioID || rol !== "cliente") return;
      setCargandoClientes(true);
      try {
        const snap = await getDocs(collection(db, `negocios/${negocioID}/clientes`));
        const lista: ClienteRow[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.nombre && String(data.nombre).trim()) {
            lista.push({ id: d.id, nombre: String(data.nombre).trim() });
          }
        });
        lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        setClientesLista(lista);
      } catch (e) {
        console.error(e);
      } finally {
        setCargandoClientes(false);
      }
    };
    cargarClientes();
  }, [negocioID, rol]);

  const clientesFiltrados = useMemo(() => {
    const q = busquedaCliente.trim().toLowerCase();
    if (!q) return clientesLista.slice(0, 50);
    return clientesLista
      .filter((c) => c.nombre.toLowerCase().includes(q))
      .slice(0, 50);
  }, [clientesLista, busquedaCliente]);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (sugerenciasRef.current && !sugerenciasRef.current.contains(e.target as Node)) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  const crearUsuario = async () => {
    setMensajeOk(false);
    if (rol === "cliente") {
      if (!nombre.trim()) {
        return setMensaje("⚠️ Buscá y seleccioná un cliente de la lista.");
      }
    } else {
      if (!nombre.trim()) return setMensaje("⚠️ Ingresá el nombre del empleado.");
    }
    if (!email.trim()) return setMensaje("⚠️ Ingresá un email válido.");
    if (!password || password.length < 6)
      return setMensaje("⚠️ La contraseña debe tener al menos 6 caracteres.");
    if (!rol) return setMensaje("⚠️ Seleccioná un rol válido.");
    if (!negocioID)
      return setMensaje("❌ No se encontró un negocioID válido. Iniciá sesión nuevamente.");
    if (!user) return setMensaje("❌ Tenés que estar logueado.");

    setCargando(true);
    setMensaje("");
    setResumenCreado(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/crear-usuario-negocio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          rol,
          nombre: rol === "cliente" ? nombre.trim() : nombre.trim(),
          negocioID,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMensaje("❌ " + (typeof data.error === "string" ? data.error : "No se pudo crear el usuario."));
        return;
      }

      const nombreGuardado =
        rol === "cliente" ? nombre.trim() : nombre.trim().toLowerCase();

      setMensajeOk(true);
      setMensaje("");
      setResumenCreado({
        email: typeof data.email === "string" ? data.email : email.trim(),
        rol: typeof data.rol === "string" ? data.rol : rol,
        negocioID,
        nombre: typeof data.nombre === "string" ? data.nombre : nombreGuardado,
      });
      setEmail("");
      setPassword("");
      setRol("empleado");
      setNombre("");
      setBusquedaCliente("");
      setRefreshCuentas((k) => k + 1);
    } catch (error: unknown) {
      console.error("Error al crear usuario:", error);
      setMensaje("❌ " + (error instanceof Error ? error.message : "Error de red"));
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black pb-12">
      <h1 className="text-2xl font-bold mb-6 text-center">Crear usuario</h1>

      <div className="max-w-md mx-auto bg-white p-6 rounded shadow space-y-4">
        {mensajeOk && resumenCreado && (
          <div
            role="status"
            className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-950 shadow-sm"
          >
            <p className="font-bold text-emerald-900">Usuario creado con éxito</p>
            <p className="mt-1 text-sm text-emerald-900/90">
              <strong>{resumenCreado.email}</strong> — rol{" "}
              <strong>
                {resumenCreado.rol === "cliente"
                  ? "Cliente (portal)"
                  : resumenCreado.rol === "empleado"
                    ? "Empleado"
                    : resumenCreado.rol}
              </strong>
              {resumenCreado.nombre && (
                <>
                  <br />
                  Nombre vinculado: <strong>{resumenCreado.nombre}</strong>
                </>
              )}
            </p>
          </div>
        )}

        {rol === "empleado" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del empleado</label>
            <input
              type="text"
              placeholder="Nombre y apellido"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border p-2 rounded placeholder-gray-500"
            />
          </div>
        ) : (
          <div ref={sugerenciasRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente vinculado a la cuenta
            </label>
            <p className="text-xs text-gray-600 mb-2">
              Buscá y elegí el cliente: el nombre queda igual que en la ficha del negocio (trabajos, ventas y
              portal).
            </p>
            {cargandoClientes && (
              <p className="text-sm text-gray-500 mb-2">Cargando clientes...</p>
            )}
            {!cargandoClientes && clientesLista.length === 0 && (
              <p className="text-sm text-amber-700 mb-2">
                No hay clientes cargados.{" "}
                <Link href="/clientes/agregar" className="underline font-medium">
                  Crear cliente primero
                </Link>
                .
              </p>
            )}

            {nombre ? (
              <div className="flex flex-wrap items-center gap-2 rounded border border-green-200 bg-green-50 px-3 py-2">
                <span className="font-medium text-green-900">{nombre}</span>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => {
                    setNombre("");
                    setBusquedaCliente("");
                    setMostrarSugerencias(true);
                  }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Escribí para buscar por nombre..."
                  value={busquedaCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setMostrarSugerencias(true);
                  }}
                  onFocus={() => setMostrarSugerencias(true)}
                  className="w-full border p-2 rounded placeholder-gray-500"
                />
                {mostrarSugerencias && clientesLista.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded border border-gray-200 bg-white shadow-lg">
                    {clientesFiltrados.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-gray-500">Sin coincidencias</li>
                    ) : (
                      clientesFiltrados.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setNombre(c.nombre);
                              setBusquedaCliente("");
                              setMostrarSugerencias(false);
                            }}
                          >
                            {c.nombre}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        <input
          type="email"
          placeholder="Email del nuevo usuario"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded placeholder-gray-500"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded placeholder-gray-500"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select
            value={rol}
            onChange={(e) => {
              setRol(e.target.value);
              setNombre("");
              setBusquedaCliente("");
              setMostrarSugerencias(false);
            }}
            className="w-full border p-2 rounded"
          >
            <option value="empleado">Empleado</option>
            <option value="cliente">Cliente</option>
          </select>
        </div>

        <button
          onClick={crearUsuario}
          disabled={cargando}
          className={`w-full py-2 px-4 rounded text-white ${cargando ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          {cargando ? "Creando..." : "Crear usuario"}
        </button>

        {mensaje && (
          <p className="text-sm mt-2 text-center font-medium text-red-700">{mensaje}</p>
        )}
      </div>

      <div className="max-w-3xl mx-auto mt-8 px-2">
        <PanelCuentasNegocio refreshKey={refreshCuentas} compacto />
        <p className="mt-4 text-center text-sm text-slate-600">
          <Link href="/configuraciones" className="text-blue-600 font-semibold hover:underline">
            ← Volver a Configuraciones
          </Link>
        </p>
      </div>
    </main>
  );
}
