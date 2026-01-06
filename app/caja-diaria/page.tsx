"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc, doc, getDoc } from "firebase/firestore";
import { useRol } from "@/lib/useRol";
import Header from "@/app/Header";
import ModalAgregarGasto from "./components/ModalAgregarGasto";
import ModalCerrarCaja from "./components/ModalCerrarCaja";
import HistorialCierres from "./components/HistorialCierres";

interface Trabajo {
  id: string;
  cliente: string;
  precio: number;
  estado: string;
  fecha: string;
  fechaModificacion?: string;
}

interface Venta {
  id: string;
  cliente: string;
  productos: any[];
  formaPago: string;
  fecha: string;
  totalARS: number;
  totalUSD: number;
}

interface Gasto {
  id: string;
  concepto: string;
  monto: number;
  moneda: string;
  categoria: string;
  fecha: string;
  usuario: string;
}

export default function CajaDiariaPage() {
  const { rol } = useRol();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [mostrarModalGasto, setMostrarModalGasto] = useState(false);
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargando, setCargando] = useState(true);

  const hoy = new Date().toLocaleDateString("es-AR");

  useEffect(() => {
    if (rol?.negocioID) {
      cargarDatos();
    }
  }, [rol]);

  const cargarDatos = async () => {
    if (!rol?.negocioID) return;
    
    setCargando(true);
    
    try {
      // Cargar trabajos del día
      const trabajosSnap = await getDocs(
        query(
          collection(db, `negocios/${rol.negocioID}/trabajos`),
          where("fechaModificacion", "==", hoy)
        )
      );
      
      const trabajosData = trabajosSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Trabajo))
        .filter(t => ["ENTREGADO", "PAGADO"].includes(t.estado));

      setTrabajos(trabajosData);

      // Cargar ventas del día
      const ventasSnap = await getDocs(
        query(
          collection(db, `negocios/${rol.negocioID}/ventasGeneral`),
          where("fecha", "==", hoy)
        )
      );

      const ventasData = ventasSnap.docs.map(doc => {
        const data = doc.data();
        const productos = data.productos || [];
        
        let totalARS = 0;
        let totalUSD = 0;

        productos.forEach((p: any) => {
          const subtotal = p.precioUnitario * p.cantidad;
          if (p.moneda?.toUpperCase() === "USD") {
            totalUSD += subtotal;
          } else {
            totalARS += subtotal;
          }
        });

        return {
          id: doc.id,
          cliente: data.cliente,
          productos: data.productos,
          formaPago: data.formaPago,
          fecha: data.fecha,
          totalARS,
          totalUSD,
        } as Venta;
      });

      setVentas(ventasData);

      // Cargar gastos del día
      const gastosSnap = await getDocs(
        query(
          collection(db, `negocios/${rol.negocioID}/gastos`),
          where("fecha", "==", hoy)
        )
      );

      const gastosData = gastosSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Gasto));

      setGastos(gastosData);

// Cargar pagos del día
const pagosSnap = await getDocs(
  query(
    collection(db, `negocios/${rol.negocioID}/pagos`),
    where("fecha", "==", hoy)
  )
);

const pagosData = pagosSnap.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));

setPagos(pagosData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setCargando(false);
    }
  };

  // Calcular totales
  const calcularTotales = () => {
    let efectivoARS = 0;
    let efectivoUSD = 0;
    let transferenciasARS = 0;
    let transferenciasUSD = 0;
    let tarjetasARS = 0;
    let cuentaCorrienteARS = 0;
    let cuentaCorrienteUSD = 0;

    // Sumar trabajos
    trabajos.forEach(t => {
      // Por ahora asumimos ARS, si tenés moneda en trabajos agregalo
      efectivoARS += t.precio || 0;
    });

    // Sumar ventas según forma de pago
    ventas.forEach(v => {
      const formaPago = v.formaPago?.toLowerCase() || "";
      
      if (formaPago.includes("efectivo")) {
        efectivoARS += v.totalARS;
        efectivoUSD += v.totalUSD;
      } else if (formaPago.includes("transferencia")) {
        transferenciasARS += v.totalARS;
        transferenciasUSD += v.totalUSD;
      } else if (formaPago.includes("tarjeta")) {
        tarjetasARS += v.totalARS;
      } else if (formaPago.includes("cuenta corriente")) {
        cuentaCorrienteARS += v.totalARS;
        cuentaCorrienteUSD += v.totalUSD;
      }
    });
// Sumar pagos según forma de pago
pagos.forEach(p => {
  const forma = (p.forma || "").toLowerCase();
  const moneda = p.moneda || "ARS";
  const monto = moneda === "USD" ? (p.montoUSD || 0) : (p.monto || 0);
  
  if (forma.includes("efectivo")) {
    if (moneda === "USD") {
      efectivoUSD += monto;
    } else {
      efectivoARS += monto;
    }
  } else if (forma.includes("transferencia")) {
    if (moneda === "USD") {
      transferenciasUSD += monto;
    } else {
      transferenciasARS += monto;
    }
  } else if (forma.includes("tarjeta")) {
    tarjetasARS += monto;
  }
});
    // Restar gastos
    const gastosARS = gastos
      .filter(g => g.moneda === "ARS")
      .reduce((sum, g) => sum + g.monto, 0);

    const gastosUSD = gastos
      .filter(g => g.moneda === "USD")
      .reduce((sum, g) => sum + g.monto, 0);

    return {
      efectivoARS: efectivoARS - gastosARS,
      efectivoUSD: efectivoUSD - gastosUSD,
      transferenciasARS,
      transferenciasUSD,
      tarjetasARS,
      cuentaCorrienteARS,
      cuentaCorrienteUSD,
      gastosARS,
      gastosUSD,
      totalTrabajos: trabajos.length,
      totalVentas: ventas.length,
    };
  };

  const totales = calcularTotales();

  const formatearPrecio = (valor: number) => {
    return `$${valor.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (cargando) {
    return (
      <>
        <Header />
        <main className="pt-20 min-h-screen bg-[#f8f9fa] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#3498db] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#7f8c8d]">Cargando caja del día...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-[#f8f9fa] p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">💰</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Caja Diaria</h1>
                  <p className="text-blue-100 text-sm">{hoy}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarHistorial(true)}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all"
                >
                  📋 Historial
                </button>
              </div>
            </div>
          </div>

          {/* Resumen de movimientos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-lg border border-[#ecf0f1]">
              <h3 className="font-bold text-[#2c3e50] mb-3 flex items-center gap-2">
                <span>🔧</span> Trabajos del Día
              </h3>
              <p className="text-3xl font-bold text-[#3498db]">{totales.totalTrabajos}</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-lg border border-[#ecf0f1]">
              <h3 className="font-bold text-[#2c3e50] mb-3 flex items-center gap-2">
                <span>🛒</span> Ventas del Día
              </h3>
              <p className="text-3xl font-bold text-[#27ae60]">{totales.totalVentas}</p>
            </div>
          </div>

          {/* Desglose por forma de pago */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-[#ecf0f1]">
            <h2 className="text-xl font-bold text-[#2c3e50] mb-4">💵 Desglose por Forma de Pago</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Efectivo */}
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <p className="text-sm text-[#7f8c8d] mb-1">💵 Efectivo</p>
                <p className="text-xl font-bold text-green-700">{formatearPrecio(totales.efectivoARS)} ARS</p>
                {totales.efectivoUSD > 0 && (
                  <p className="text-lg font-bold text-green-600">${totales.efectivoUSD} USD</p>
                )}
              </div>

              {/* Transferencias */}
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <p className="text-sm text-[#7f8c8d] mb-1">🏦 Transferencias</p>
                <p className="text-xl font-bold text-blue-700">{formatearPrecio(totales.transferenciasARS)} ARS</p>
                {totales.transferenciasUSD > 0 && (
                  <p className="text-lg font-bold text-blue-600">${totales.transferenciasUSD} USD</p>
                )}
              </div>

              {/* Tarjetas */}
              <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                <p className="text-sm text-[#7f8c8d] mb-1">💳 Tarjetas</p>
                <p className="text-xl font-bold text-purple-700">{formatearPrecio(totales.tarjetasARS)} ARS</p>
              </div>

              {/* Cuenta Corriente */}
              <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
                <p className="text-sm text-[#7f8c8d] mb-1">📒 Cuenta Corriente</p>
                <p className="text-xl font-bold text-orange-700">{formatearPrecio(totales.cuentaCorrienteARS)} ARS</p>
                {totales.cuentaCorrienteUSD > 0 && (
                  <p className="text-lg font-bold text-orange-600">${totales.cuentaCorrienteUSD} USD</p>
                )}
              </div>
            </div>

            {/* Gastos */}
            {(totales.gastosARS > 0 || totales.gastosUSD > 0) && (
              <div className="mt-4 bg-red-50 rounded-lg p-4 border-2 border-red-200">
                <p className="text-sm text-[#7f8c8d] mb-1">❌ Gastos del Día</p>
                <p className="text-xl font-bold text-red-700">{formatearPrecio(totales.gastosARS)} ARS</p>
                {totales.gastosUSD > 0 && (
                  <p className="text-lg font-bold text-red-600">${totales.gastosUSD} USD</p>
                )}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4">
            <button
              onClick={() => setMostrarModalGasto(true)}
              className="flex-1 bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg"
            >
              ➕ Agregar Gasto
            </button>

            <button
              onClick={() => setMostrarModalCierre(true)}
              className="flex-1 bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg"
            >
              🔒 Cerrar Caja
            </button>
          </div>

        </div>
      </main>

      {/* Modales */}
      {mostrarModalGasto && (
        <ModalAgregarGasto
          negocioID={rol?.negocioID || ""}
          onClose={() => setMostrarModalGasto(false)}
          onGuardado={() => {
            cargarDatos();
            setMostrarModalGasto(false);
          }}
        />
      )}

      {mostrarModalCierre && (
        <ModalCerrarCaja
          negocioID={rol?.negocioID || ""}
          totales={totales}
          onClose={() => setMostrarModalCierre(false)}
          onCerrado={() => {
            cargarDatos();
            setMostrarModalCierre(false);
          }}
        />
      )}

      {mostrarHistorial && (
        <HistorialCierres
          negocioID={rol?.negocioID || ""}
          onClose={() => setMostrarHistorial(false)}
        />
      )}
    </>
  );
}