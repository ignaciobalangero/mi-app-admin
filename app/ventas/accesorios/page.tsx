"use client";

import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import axios from "axios";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";
import { useAuthState } from "react-firebase-hooks/auth";
import Link from "next/link";
import FormularioVentaAccesorios from "./components/FormularioVentaAccesorios";
import TablaVentasAccesorios from "./components/TablaVentasAccesorios";
import { descontarAccesorioDelStock } from "./components/descontarAccesorioDelStock";
import { reponerAccesorioEnStock } from "./components/reponerAccesorioEnStock";
import { actualizarSaldoClienteNegocioDetalle } from "@/lib/actualizarSaldoCliente";

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
  const { rol } = useRol();

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
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);  

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

    const totalARS = moneda === "ARS" ? precio * cantidad : 0;
    const totalUSD = moneda === "USD" ? precio * cantidad : 0;

    const nuevaVenta = {
      fecha,
      cliente,
      producto,
      cantidad,
      precioUnitario: precio,
      moneda,
      cotizacion: moneda === "USD" ? cotizacion : null,
      total,
      totalARS,
      totalUSD,
      codigo: codigo || "",
      marca: marca || "",
      categoria: categoria || "",
      color: color || "",
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
        if (codigo) {
          await descontarAccesorioDelStock(negocioID, codigo, cantidad);
        }
        try {
          const docRef = await addDoc(
            collection(db, `negocios/${negocioID}/ventaAccesorios`),
            nuevaVenta
          );
          ventaId = docRef.id;
        } catch (errGuardar) {
          if (codigo) {
            await reponerAccesorioEnStock(negocioID, codigo, cantidad);
          }
          throw errGuardar;
        }

        // Deuda en cuenta corriente (misma lógica que ventas-general)
        if (cliente && (totalARS > 0 || totalUSD > 0)) {
          await actualizarSaldoClienteNegocioDetalle(
            negocioID,
            cliente,
            totalARS,
            totalUSD
          );
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
          collection(db, `negocios/${negocioID}/pagos`),
          datosPago
        );

        await updateDoc(docRef, { id: docRef.id });

        // Restar pago del saldo
        const pagoARS = pago.monedaPago === "ARS" ? pago.montoAbonado : 0;
        const pagoUSD = pago.monedaPago === "USD" ? pago.montoAbonado : 0;
        if (pagoARS || pagoUSD) {
          await actualizarSaldoClienteNegocioDetalle(
            negocioID,
            cliente,
            -pagoARS,
            -pagoUSD
          );
        }
      }

      setCliente("");
      setProducto("");
      setCantidad(1);
      setPrecio(0);
      setMoneda("ARS");
      setCodigo("");
      obtenerVentas();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert(error instanceof Error ? error.message : "Error al guardar la venta.");
    }
  };

  const eliminarVenta = async (id: string) => {
    if (!negocioID || !id) return;
    try {
      const ref = doc(db, `negocios/${negocioID}/ventaAccesorios`, id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        obtenerVentas();
        return;
      }
      const data = snap.data();
      const cod = String(data.codigo || "").trim();
      const cant = Number(data.cantidad) || 0;
      const totalARS = Number(data.totalARS) || (data.moneda === "ARS" ? Number(data.total) || 0 : 0);
      const totalUSD =
        Number(data.totalUSD) ||
        (data.moneda === "USD" ? Number(data.precioUnitario || 0) * cant : 0);
      const nombreCliente = String(data.cliente || "").trim();

      if (cod && cant > 0) {
        await reponerAccesorioEnStock(negocioID, cod, cant);
      }

      // Solo se revierte la DEUDA de la venta (como en ventas-general).
      // Si había pago, NO se borra ni se modifica: queda como crédito / a favor.
      // Cuenta corriente sin pago: solo baja la deuda.
      if (nombreCliente && (totalARS > 0 || totalUSD > 0)) {
        await actualizarSaldoClienteNegocioDetalle(
          negocioID,
          nombreCliente,
          -totalARS,
          -totalUSD
        );
      }

      await deleteDoc(ref);
      obtenerVentas();
    } catch (error) {
      console.error("Error al eliminar venta accesorios:", error);
      alert("No se pudo eliminar la venta.");
    }
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
