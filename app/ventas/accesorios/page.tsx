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
  serverTimestamp,
} from "firebase/firestore";
import axios from "axios";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import Link from "next/link";
import FormularioVentaAccesorios from "./components/FormularioVentaAccesorios";
import TablaVentasAccesorios from "./components/TablaVentasAccesorios";
import { descontarAccesorioDelStock } from "./components/descontarAccesorioDelStock";

export default function VentaAccesorios() {
  const [fecha, setFecha] = useState("");
  const [cliente, setCliente] = useState("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState(0);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [cotizacion, setCotizacion] = useState(0);
  const [codigo, setCodigo] = useState("");
  const [marca, setMarca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [color, setColor] = useState("");
  const [ventas, setVentas] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const hoy = new Date();
    const fechaFormateada = hoy.toLocaleDateString("es-AR");
    setFecha(fechaFormateada);
    obtenerCotizacion();
  }, []);

  useEffect(() => {
    const clienteGuardado = localStorage.getItem("clienteNuevo");
    if (clienteGuardado) {
      setCliente(clienteGuardado);
      localStorage.removeItem("clienteNuevo");
    }
  }, []);

  useEffect(() => {
    if (user) {
      const fetchNegocioID = async () => {
        const snap = await getDocs(
          query(collection(db, "usuarios"), where("email", "==", user.email))
        );
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

  useEffect(() => {
    const valor = moneda === "USD" ? precio * cantidad * cotizacion : precio * cantidad;
    setTotal(valor);
  }, [precio, cantidad, moneda, cotizacion]);

  const obtenerCotizacion = async () => {
    try {
      const res = await axios.get("https://dolarapi.com/v1/dolares/blue");
      setCotizacion(res.data.venta);
    } catch (error) {
      console.error("Error al obtener cotización:", error);
    }
  };

  const obtenerVentas = async () => {
    const querySnapshot = await getDocs(
      collection(db, `negocios/${negocioID}/ventaAccesorios`)
    );
    const datos = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setVentas(datos);
  };

  const guardarVenta = async (pago?: {
    montoAbonado: number;
    monedaPago: string;
    formaPago: string;
    observacionesPago: string;
  }) => {
    if (!cliente || !producto || cantidad <= 0 || precio <= 0) return;

    const nuevaVenta = {
      fecha,
      cliente,
      producto,
      cantidad,
      precioUnitario: precio,
      moneda,
      cotizacion: moneda === "USD" ? cotizacion : null,
      total,
    };

    try {
      let ventaId = editandoId;

      if (editandoId) {
        await updateDoc(
          doc(db, `negocios/${negocioID}/ventaAccesorios`, editandoId),
          nuevaVenta
        );
        setEditandoId(null);
      } else {
        const docRef = await addDoc(
          collection(db, `negocios/${negocioID}/ventaAccesorios`),
          nuevaVenta
        );
        ventaId = docRef.id;

        if (codigo) {
          await descontarAccesorioDelStock(negocioID, codigo, cantidad);
        }
      }

      if (pago && pago.montoAbonado > 0 && ventaId) {
        const datosPago = {
          fecha: serverTimestamp(),
          cliente,
          monto: pago.monedaPago === "ARS" ? pago.montoAbonado : null,
          montoUSD: pago.monedaPago === "USD" ? pago.montoAbonado : null,
          moneda: pago.monedaPago,
          forma: pago.formaPago,
          observaciones: pago.observacionesPago,
          destino: "ventaAccesorios",
          ventaId,
        };

        const docRef = await addDoc(
          collection(db, `negocios/${negocioID}/pagoClientes`),
          datosPago
        );

        await updateDoc(docRef, { id: docRef.id });
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
    setPrecio(venta.precioUnitario);
    setMoneda(venta.moneda);
    setCotizacion(venta.cotizacion);
    setEditandoId(venta.id);
  };

  return (
    <>
      <Header />
      <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
        <div className="mb-4">
          <Link
            href="/ventas"
            className="text-blue-600 hover:underline text-sm"
          >
            ← Atrás
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-center">
          Venta de Accesorios
        </h1>

        <FormularioVentaAccesorios
          fecha={fecha}
          cliente={cliente}
          setCliente={setCliente}
          producto={producto}
          setProducto={setProducto}
          cantidad={cantidad}
          setCantidad={setCantidad}
          precio={precio}
          setPrecio={setPrecio}
          moneda={moneda}
          setMoneda={setMoneda}
          cotizacion={cotizacion}
          setCotizacion={setCotizacion}
          onGuardar={guardarVenta}
          editandoId={editandoId}
          codigo={codigo}
          setCodigo={setCodigo}
          marca={marca}
          setMarca={setMarca}
          categoria={categoria}
          setCategoria={setCategoria}
          color={color}
          setColor={setColor}
        />

        <TablaVentasAccesorios
          ventas={ventas}
          onEditar={editarVenta}
          onEliminar={eliminarVenta}
        />
      </main>
    </>
  );
}
