"use client";

import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import axios from "axios";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";

export default function VentaAccesorios() {
  const [fecha, setFecha] = useState("");
  const [cliente, setCliente] = useState("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState(0);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [cotizacion, setCotizacion] = useState(0);
  const [ventas, setVentas] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");

  useEffect(() => {
    const hoy = new Date();
    const fechaFormateada = hoy.toLocaleDateString("es-AR");
    setFecha(fechaFormateada);
    obtenerCotizacion();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchNegocioID = async () => {
        const snap = await getDocs(query(collection(db, "usuarios"), where("email", "==", user.email)));
        snap.forEach((docu) => {
          const data = docu.data();
          if (data.negocioID) {
            setNegocioID(data.negocioID);
          }
        });
      };
      fetchNegocioID();
    }
  }, [user]);

  useEffect(() => {
    if (negocioID) obtenerVentas();
  }, [negocioID]);

  const obtenerCotizacion = async () => {
    try {
      const res = await axios.get("https://dolarapi.com/v1/dolares/blue");
      setCotizacion(res.data.venta);
    } catch (error) {
      console.error("Error al obtener cotización:", error);
    }
  };

  const obtenerVentas = async () => {
    const querySnapshot = await getDocs(collection(db, `negocios/${negocioID}/ventaAccesorios`));
    const datos = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setVentas(datos);
  };

  const guardarVenta = async () => {
    if (!cliente || !producto || cantidad <= 0 || precio <= 0) return;

    const nuevaVenta = {
      fecha,
      cliente,
      producto,
      cantidad,
      precio,
      moneda,
      cotizacion,
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, `negocios/${negocioID}/ventaAccesorios`, editandoId), nuevaVenta);
        setEditandoId(null);
      } else {
        await addDoc(collection(db, `negocios/${negocioID}/ventaAccesorios`), nuevaVenta);
      }

      setCliente("");
      setProducto("");
      setCantidad(1);
      setPrecio(0);
      setMoneda("ARS");
      obtenerVentas();
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  const eliminarVenta = async (id: string) => {
    await deleteDoc(doc(db, `negocios/${negocioID}/ventaAccesorios`, id));
    obtenerVentas();
  };

  const editarVenta = (venta: any) => {
    setFecha(venta.fecha);
    setCliente(venta.cliente);
    setProducto(venta.producto);
    setCantidad(venta.cantidad);
    setPrecio(venta.precio);
    setMoneda(venta.moneda);
    setCotizacion(venta.cotizacion);
    setEditandoId(venta.id);
  };

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <h1 className="text-3xl font-bold mb-6 text-center">Venta de Accesorios</h1>

        <div className="flex flex-wrap gap-3 justify-center mb-6">
          <input
            type="text"
            value={fecha}
            readOnly
            className="p-2 border border-gray-400 rounded w-32 bg-gray-200"
          />

          <input
            type="text"
            name="fake-autofill"
            style={{ display: "none" }}
            autoComplete="off"
          />

          <input
            type="text"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Cliente"
            name="no-autofill"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="p-2 border border-gray-400 rounded w-40"
          />
          <input
            type="text"
            value={producto}
            onChange={(e) => setProducto(e.target.value)}
            placeholder="Producto"
            className="p-2 border border-gray-400 rounded w-40"
          />
          <input
            type="number"
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            placeholder="Cantidad"
            className="p-2 border border-gray-400 rounded w-24"
          />
          <input
            type="number"
            value={precio}
            onChange={(e) => setPrecio(Number(e.target.value))}
            placeholder="Precio"
            className="p-2 border border-gray-400 rounded w-24"
          />
          <select
            value={moneda}
            onChange={(e) => setMoneda(e.target.value as "ARS" | "USD")}
            className="p-2 border border-gray-400 rounded w-28"
          >
            <option value="ARS">Pesos</option>
            <option value="USD">Dólares</option>
          </select>

          {moneda === "USD" && (
            <input
              type="number"
              value={cotizacion}
              onChange={(e) => setCotizacion(Number(e.target.value))}
              placeholder="Cotización"
              className="p-2 border border-gray-400 rounded w-28"
            />
          )}

          <button
            onClick={guardarVenta}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {editandoId ? "Actualizar" : "Guardar"}
          </button>
        </div>

        <table className="w-full bg-white rounded shadow overflow-hidden">
          <thead className="bg-gray-300 text-left">
            <tr>
              <th className="p-2 border border-gray-400">Fecha</th>
              <th className="p-2 border border-gray-400">Cliente</th>
              <th className="p-2 border border-gray-400">Producto</th>
              <th className="p-2 border border-gray-400">Cantidad</th>
              <th className="p-2 border border-gray-400">Precio</th>
              <th className="p-2 border border-gray-400">Moneda</th>
              <th className="p-2 border border-gray-400">Total en pesos</th>
              <th className="p-2 border border-gray-400">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => {
              const totalPesos =
                v.moneda === "USD" ? v.precio * v.cotizacion : v.precio;

              return (
                <tr key={v.id} className="border-t border-gray-300">
                  <td className="p-2 border border-gray-300">{v.fecha}</td>
                  <td className="p-2 border border-gray-300">{v.cliente}</td>
                  <td className="p-2 border border-gray-300">{v.producto}</td>
                  <td className="p-2 border border-gray-300">{v.cantidad}</td>
                  <td className="p-2 border border-gray-300">
                    {v.moneda === "USD"
                      ? `USD ${v.precio}`
                      : `$${v.precio.toLocaleString("es-AR")}`}
                  </td>
                  <td className="p-2 border border-gray-300">{v.moneda}</td>
                  <td className="p-2 border border-gray-300">
                    ${totalPesos.toLocaleString("es-AR")}
                  </td>
                  <td className="p-2 border border-gray-300">
                    <button
                      onClick={() => editarVenta(v)}
                      className="text-blue-600 hover:underline mr-2"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarVenta(v.id)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>
    </>
  );
}
