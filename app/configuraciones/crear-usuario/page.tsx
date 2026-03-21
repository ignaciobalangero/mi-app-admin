"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  getAuth,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

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
  const [cargando, setCargando] = useState(false);
  const [resumenCreado, setResumenCreado] = useState<{
    email: string;
    rol: string;
    negocioID: string;
    nombre?: string;
  } | null>(null);

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

    setCargando(true);
    setMensaje("");
    setResumenCreado(null);

    try {
      const authAdmin = getAuth();

      const metodos = await fetchSignInMethodsForEmail(authAdmin, email);
      if (metodos.length > 0) {
        setMensaje("❌ Ya existe un usuario con este email.");
        setCargando(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(authAdmin, email, password);
      const nuevoUID = userCredential.user.uid;

      const nombreGuardado =
        rol === "cliente" ? nombre.trim() : nombre.trim().toLowerCase();

      const datosUsuario = {
        email: email.toLowerCase(),
        negocioID,
        rol,
        nombre: nombreGuardado,
      };

      await setDoc(doc(db, "usuarios", nuevoUID), datosUsuario);
      console.log("✅ Usuario creado en /usuarios/");

      await setDoc(doc(db, "negocios", negocioID, "usuarios", nuevoUID), {
        ...datosUsuario,
        fechaCreacion: new Date().toISOString(),
        creadoPor: user?.email || "admin",
      });
      console.log("✅ Usuario creado en /negocios/{negocioID}/usuarios/");

      const configRef = doc(db, "configuracion", negocioID);
      const configSnap = await getDoc(configRef);
      if (!configSnap.exists()) {
        await setDoc(configRef, {
          logoUrl: "",
          creado: new Date().toISOString(),
        });
        console.log("✅ Configuración del negocio creada");
      } else {
        console.log("ℹ️ Configuración ya existente");
      }

      setMensaje("✅ Usuario creado correctamente en ambas ubicaciones.");
      setResumenCreado({
        email,
        rol,
        negocioID,
        nombre: nombreGuardado,
      });
      setEmail("");
      setPassword("");
      setRol("empleado");
      setNombre("");
      setBusquedaCliente("");
    } catch (error: any) {
      console.error("Error al crear usuario:", error);
      setMensaje("❌ " + error.message);
    }

    setCargando(false);
  };

  return (
    <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
      <h1 className="text-2xl font-bold mb-6 text-center">Crear usuario</h1>

      <div className="max-w-md mx-auto bg-white p-6 rounded shadow space-y-4">
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

        {mensaje && <p className="text-sm mt-2 text-center">{mensaje}</p>}

        {resumenCreado && (
          <div className="mt-4 text-sm text-green-700 text-center">
            <p>
              Usuario creado: <strong>{resumenCreado.email}</strong> ({resumenCreado.rol})<br />
              {resumenCreado.nombre && (
                <>
                  Nombre vinculado: <strong>{resumenCreado.nombre}</strong>
                  <br />
                </>
              )}
              Asociado a: <strong>{resumenCreado.negocioID}</strong>
              <br />
              📍 Creado en ambas ubicaciones ✅
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
