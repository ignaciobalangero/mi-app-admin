"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import Header from "../Header";
import Link from "next/link";
import { useRol } from "@/lib/useRol";
import { useRouter } from "next/navigation";
import html2canvas from 'html2canvas';

interface Trabajo {
  firebaseId?: string;
  cliente: string;
  precio?: number | string;
  estado: string;
  moneda?: "ARS" | "USD";
  trabajo?: string;
  modelo?: string;
  fecha?: string;
  fechaCompleta?: Date;
}

interface Pago {
  cliente: string;
  monto?: number | null;
  montoUSD?: number | null;
  moneda: "ARS" | "USD";
  fecha: string;
  fechaCompleta?: Date;
}

interface CuentaCorriente {
  cliente: string;
  saldoPesos: number;
  saldoUSD: number;
  trabajosPendientes?: Trabajo[];
}

interface PagoForm {
  monto: string;
  moneda: string;
  formaPago: string;
  destino: string;
  observaciones: string;
}

export default function CuentaCorrientePage() {
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [user] = useAuthState(auth);
  const { rol } = useRol();
  const [negocioID, setNegocioID] = useState<string>("");
  const router = useRouter();

  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<CuentaCorriente | null>(null);
  const [pago, setPago] = useState<PagoForm>({
    monto: "",
    moneda: "ARS",
    formaPago: "",
    destino: "",
    observaciones: ""
  });
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [pagoGuardado, setPagoGuardado] = useState(false);
  const [cargandoTrabajos, setCargandoTrabajos] = useState(false);

  useEffect(() => {
    if (rol && rol.tipo === "cliente") {
      router.push("/");
      return;
    }
  }, [rol, router]);

  if (rol?.tipo === "cliente") {
    return null;
  }

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);

  useEffect(() => {
    const cargarCuentas = async () => {
      if (!negocioID) return;

      const clientesSnap = await getDocs(
        collection(db, `negocios/${negocioID}/clientes`)
      );

      const cuentasFinales = clientesSnap.docs
        .map((doc) => {
          const data = doc.data();
          return {
            cliente: data.nombre || doc.id,
            saldoPesos: data.saldoARS || 0,
            saldoUSD: data.saldoUSD || 0,
            trabajosPendientes: [],
          };
        })
        .filter((c) => Math.abs(c.saldoPesos) > 0.01 || Math.abs(c.saldoUSD) > 0.01)
        .sort((a, b) => a.cliente.localeCompare(b.cliente));

      setCuentas(cuentasFinales);
    };

    cargarCuentas();
  }, [negocioID]);

  const cargarTrabajosPendientes = async (nombreCliente: string) => {
    if (!negocioID) return [];
    
    setCargandoTrabajos(true);
    try {
      const trabajosSnap = await getDocs(
        query(
          collection(db, `negocios/${negocioID}/trabajos`),
          where("cliente", "==", nombreCliente),
          where("estado", "==", "ENTREGADO")
        )
      );
      
      const trabajos = trabajosSnap.docs.map(doc => ({
        ...doc.data() as Trabajo,
        firebaseId: doc.id
      }));

      return trabajos;
    } catch (error) {
      console.error("Error cargando trabajos:", error);
      return [];
    } finally {
      setCargandoTrabajos(false);
    }
  };

  const handlePagoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPago(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const guardarPago = async () => {
    if (!clienteSeleccionado || !pago.monto || !pago.formaPago) return;

    setGuardandoPago(true);
    try {
      const montoNumerico = parseFloat(pago.monto);
      
      const pagoData = {
        monto: pago.moneda === "USD" ? null : montoNumerico,
        montoUSD: pago.moneda === "USD" ? montoNumerico : null,
        moneda: pago.moneda,
        forma: pago.formaPago,
        destino: pago.destino,
        observaciones: pago.observaciones,
        cliente: clienteSeleccionado.cliente,
        fecha: new Date().toLocaleDateString('es-AR'),
        fechaCompleta: new Date(),
        tipo: 'ingreso',
        negocioID: negocioID
      };

      await addDoc(collection(db, `negocios/${negocioID}/pagos`), pagoData);

      if (clienteSeleccionado.trabajosPendientes && clienteSeleccionado.trabajosPendientes.length > 0) {
        let montoRestante = montoNumerico;
        const trabajosOrdenados = [...clienteSeleccionado.trabajosPendientes].sort((a, b) => {
          const fechaA = new Date(a.fecha || '');
          const fechaB = new Date(b.fecha || '');
          return fechaA.getTime() - fechaB.getTime();
        });

        for (const trabajo of trabajosOrdenados) {
          if (montoRestante <= 0) break;
          
          const precioTrabajo = Number(trabajo.precio || 0);
          const monedaTrabajo = trabajo.moneda || "ARS";
          
          if (monedaTrabajo === pago.moneda && trabajo.firebaseId) {
            if (montoRestante >= precioTrabajo) {
              const trabajoRef = doc(db, `negocios/${negocioID}/trabajos/${trabajo.firebaseId}`);
              await updateDoc(trabajoRef, {
                estado: "PAGADO",
                estadoCuentaCorriente: "PAGADO",
                fechaModificacion: new Date().toLocaleDateString('es-AR')
              });
              montoRestante -= precioTrabajo;
            }
          }
        }
      }

      setPagoGuardado(true);

      setTimeout(() => {
        // ✅ Actualizar saldo localmente sin recargar
        setCuentas(prevCuentas => 
          prevCuentas.map(cuenta => {
            if (cuenta.cliente === clienteSeleccionado.cliente) {
              const nuevoSaldoPesos = pago.moneda === "ARS" 
                ? cuenta.saldoPesos - parseFloat(pago.monto)
                : cuenta.saldoPesos;
              
              const nuevoSaldoUSD = pago.moneda === "USD"
                ? cuenta.saldoUSD - parseFloat(pago.monto)
                : cuenta.saldoUSD;
      
              return {
                ...cuenta,
                saldoPesos: nuevoSaldoPesos,
                saldoUSD: nuevoSaldoUSD
              };
            }
            return cuenta;
          })
        );
      
        // ✅ Cerrar modal y limpiar estado
        setMostrarModalPago(false);
        setClienteSeleccionado(null);
        setPago({
          monto: "",
          moneda: "ARS",
          formaPago: "",
          destino: "",
          observaciones: ""
        });
        setPagoGuardado(false);
      }, 1500);

    } catch (error) {
      console.error("Error al guardar pago:", error);
      alert("Error al guardar el pago");
    } finally {
      setGuardandoPago(false);
    }
  };

  const cuentasFiltradas = cuentas.filter((c) =>
    c.cliente.toLowerCase().includes(filtroCliente.toLowerCase())
  );

  const formatPesos = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(num);

  const formatUSD = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(num);

  const totalPesos = cuentas.reduce((acum, c) => acum + c.saldoPesos, 0);
  const totalUSD = cuentas.reduce((acum, c) => acum + c.saldoUSD, 0);

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-xl flex items-center justify-center">
                  <span className="text-xl sm:text-2xl text-white">💳</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#2c3e50]">Cuenta Corriente</h1>
                  <p className="text-sm sm:text-base text-[#7f8c8d]">Gestión de saldos y pagos</p>
                </div>
              </div>
              
              <Link
                href="/pagos"
                className="bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <span>💰</span>
                Ir a Pagos
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] rounded-xl shadow-lg p-4 sm:p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">💵</span>
                </div>
                <div>
                  <p className="text-sm text-red-100">Deuda Total ARS</p>
                  <p className="text-lg sm:text-xl font-bold">{formatPesos(totalPesos)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] rounded-xl shadow-lg p-4 sm:p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">💲</span>
                </div>
                <div>
                  <p className="text-sm text-orange-100">Deuda Total USD</p>
                  <p className="text-lg sm:text-xl font-bold">{formatUSD(totalUSD)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-[#27ae60] to-[#229954] rounded-xl shadow-lg p-4 sm:p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">👥</span>
                </div>
                <div>
                  <p className="text-sm text-green-100">Total Clientes</p>
                  <p className="text-lg sm:text-xl font-bold">{cuentasFiltradas.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] rounded-xl shadow-lg p-4 sm:p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <p className="text-sm text-purple-100">Con Deuda</p>
                  <p className="text-lg sm:text-xl font-bold">
                    {cuentasFiltradas.filter(c => c.saldoPesos > 0 || c.saldoUSD > 0).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <label className="text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">🔍</span>
                Buscar cliente:
              </label>
              <input
                type="text"
                placeholder="🔍 Filtrar por cliente..."
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="flex-1 max-w-md p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#ecf0f1]">
            
            <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-lg sm:text-2xl">💳</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">Saldos por Cliente</h3>
                  <p className="text-blue-100 text-xs sm:text-sm">
                    {cuentasFiltradas.length} {cuentasFiltradas.length === 1 ? 'cliente' : 'clientes'} con saldo
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse">
                <thead className="bg-[#ecf0f1]">
                  <tr>
                    <th className="p-3 sm:p-4 text-left text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                      <span className="flex items-center gap-2">
                        <span>👤</span>
                        Cliente
                      </span>
                    </th>
                    <th className="p-3 sm:p-4 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                      <span className="flex items-center justify-center gap-2">
                        <span>💵</span>
                        Saldo ARS
                      </span>
                    </th>
                    <th className="p-3 sm:p-4 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                      <span className="flex items-center justify-center gap-2">
                        <span>💲</span>
                        Saldo USD
                      </span>
                    </th>
                    <th className="p-3 sm:p-4 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                      <span className="flex items-center justify-center gap-2">
                        <span>📊</span>
                        Estado
                      </span>
                    </th>
                    <th className="p-3 sm:p-4 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                      <span className="flex items-center justify-center gap-2">
                        <span>💳</span>
                        Acción
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cuentasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 sm:p-12 text-center text-[#7f8c8d] border border-[#bdc3c7]">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                            <span className="text-2xl sm:text-3xl">💳</span>
                          </div>
                          <div>
                            <p className="text-sm sm:text-lg font-medium text-[#7f8c8d]">
                              {cuentas.length === 0 ? "No hay cuentas con saldo" : "No se encontraron resultados"}
                            </p>
                            <p className="text-xs sm:text-sm text-[#bdc3c7]">
                              {cuentas.length === 0 
                                ? "Las cuentas aparecerán aquí cuando haya saldos pendientes"
                                : "Intenta ajustar el filtro de búsqueda"
                              }
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cuentasFiltradas.map((cuenta, index) => {
                      const tieneDeuda = cuenta.saldoPesos > 0 || cuenta.saldoUSD > 0;
                      const tieneFavor = cuenta.saldoPesos < 0 || cuenta.saldoUSD < 0;
                      
                      return (
                        <tr
                          key={cuenta.cliente}
                          className={`transition-colors duration-200 hover:bg-[#ecf0f1] border border-[#bdc3c7] ${
                            tieneFavor ? "bg-green-50" : tieneDeuda ? "bg-red-50" : "bg-white"
                          }`}
                        >
                          <td className="p-3 sm:p-4 border border-[#bdc3c7]">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                tieneFavor ? "bg-[#27ae60]" : tieneDeuda ? "bg-[#e74c3c]" : "bg-[#7f8c8d]"
                              }`}>
                                {cuenta.cliente.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm sm:text-base font-medium text-[#2c3e50]">
                                {cuenta.cliente}
                              </span>
                            </div>
                          </td>
                          
                          <td className="p-3 sm:p-4 text-center border border-[#bdc3c7]">
                            <span className={`text-sm sm:text-base font-bold ${
                              cuenta.saldoPesos > 0 ? "text-[#e74c3c]" : cuenta.saldoPesos < 0 ? "text-[#27ae60]" : "text-[#7f8c8d]"
                            }`}>
                              {formatPesos(cuenta.saldoPesos)}
                            </span>
                          </td>
                          
                          <td className="p-3 sm:p-4 text-center border border-[#bdc3c7]">
                            <span className={`text-sm sm:text-base font-bold ${
                              cuenta.saldoUSD > 0 ? "text-[#e74c3c]" : cuenta.saldoUSD < 0 ? "text-[#27ae60]" : "text-[#7f8c8d]"
                            }`}>
                              {formatUSD(cuenta.saldoUSD)}
                            </span>
                          </td>
                          
                          <td className="p-3 sm:p-4 text-center border border-[#bdc3c7]">
                            <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                              tieneFavor 
                                ? "bg-[#27ae60] text-white"
                                : tieneDeuda
                                ? "bg-[#e74c3c] text-white"
                                : "bg-[#7f8c8d] text-white"
                            }`}>
                              {tieneFavor ? "💚 A Favor" : tieneDeuda ? "🔴 Debe" : "⚪ Sin Saldo"}
                            </span>
                          </td>

                          <td className="p-3 sm:p-4 text-center border border-[#bdc3c7]">
  <div className="flex items-center justify-center gap-2">
    {tieneDeuda ? (
      <>
        <button
          onClick={async () => {
            const trabajos = await cargarTrabajosPendientes(cuenta.cliente);
            
            setClienteSeleccionado({
              ...cuenta,
              trabajosPendientes: trabajos
            });
            
            const montoSugerido = Math.abs(cuenta.saldoPesos) > Math.abs(cuenta.saldoUSD) 
              ? Math.abs(cuenta.saldoPesos).toString()
              : Math.abs(cuenta.saldoUSD).toString();
            const monedaSugerida = Math.abs(cuenta.saldoPesos) > Math.abs(cuenta.saldoUSD) ? "ARS" : "USD";
            
            setPago(prev => ({
              ...prev,
              monto: montoSugerido,
              moneda: monedaSugerida
            }));
            
            setMostrarModalPago(true);
          }}
          disabled={cargandoTrabajos}
          className={`bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-sm flex items-center gap-1 ${
            cargandoTrabajos ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {cargandoTrabajos ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              <span>💳</span>
              <span className="hidden sm:inline">Pagar</span>
            </>
          )}
        </button>

        <button
  onClick={async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-9999px';
      tempDiv.style.background = 'white';
      tempDiv.style.padding = '20px';
      tempDiv.style.borderRadius = '12px';
      tempDiv.style.width = '400px';
      
      // ✅ Determinar qué saldos mostrar
      const tienePesos = Math.abs(cuenta.saldoPesos) > 0.01;
      const tieneUSD = Math.abs(cuenta.saldoUSD) > 0.01;
      
      let saldosHTML = '';
      
      if (tienePesos) {
        saldosHTML += `
          <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; ${tieneUSD ? 'margin-bottom: 12px;' : ''}">
            <p style="color: #7f8c8d; font-size: 12px; margin: 0 0 4px 0;">Saldo en Pesos</p>
            <p style="color: ${cuenta.saldoPesos > 0 ? '#e74c3c' : '#27ae60'}; font-size: 24px; font-weight: bold; margin: 0;">
              ${formatPesos(cuenta.saldoPesos)}
            </p>
          </div>
        `;
      }
      
      if (tieneUSD) {
        saldosHTML += `
          <div style="background: #f8f9fa; padding: 16px; border-radius: 8px;">
            <p style="color: #7f8c8d; font-size: 12px; margin: 0 0 4px 0;">Saldo en Dólares</p>
            <p style="color: ${cuenta.saldoUSD > 0 ? '#e74c3c' : '#27ae60'}; font-size: 24px; font-weight: bold; margin: 0;">
              ${formatUSD(cuenta.saldoUSD)}
            </p>
          </div>
        `;
      }
      
      tempDiv.innerHTML = `
        <div style="font-family: system-ui, -apple-system, sans-serif;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="font-size: 24px; color: #2c3e50; margin: 0 0 8px 0;">Estado de Cuenta</h2>
            <p style="font-size: 14px; color: #7f8c8d; margin: 0;">${new Date().toLocaleDateString('es-AR')}</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; margin-bottom: 16px;">
            <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 8px 0;">Cliente</p>
            <p style="color: white; font-size: 20px; font-weight: bold; margin: 0;">${cuenta.cliente}</p>
          </div>

          ${saldosHTML}
        </div>
      `;
      
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      document.body.removeChild(tempDiv);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          
          // ✅ Mostrar toast personalizado
          const toast = document.createElement('div');
          toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px 32px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 99999;
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 18px;
            font-weight: 600;
            animation: fadeIn 0.2s ease-in;
          `;
          
          toast.innerHTML = `
            <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              ✓
            </div>
            <span>Imagen copiada al portapapeles</span>
          `;
          
          document.body.appendChild(toast);
          
          setTimeout(() => {
            toast.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => {
              document.body.removeChild(toast);
            }, 200);
          }, 1000);
        }
      });
    } catch (error) {
      console.error('Error al copiar:', error);
      
      // ✅ Toast de error
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
        padding: 24px 32px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 18px;
        font-weight: 600;
      `;
      
      toast.innerHTML = `
        <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
          ✕
        </div>
        <span>Error al copiar la imagen</span>
      `;
      
      document.body.appendChild(toast);
      
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 1000);
    }
  }}
  className="bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-sm flex items-center gap-1"
>
  <span>📋</span>
  <span className="hidden sm:inline">Copiar</span>
</button>
      </>
    ) : (
      <span className="text-[#bdc3c7] text-sm">—</span>
    )}
  </div>
</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {cuentasFiltradas.length > 0 && (
              <div className="bg-[#f8f9fa] px-3 sm:px-6 py-3 sm:py-4 border-t border-[#bdc3c7]">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#7f8c8d]">
                  <span>
                    Mostrando {cuentasFiltradas.length} de {cuentas.length} {cuentas.length === 1 ? 'cuenta' : 'cuentas'}
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                    <span>
                      Deudores: <strong className="text-[#e74c3c]">
                        {cuentasFiltradas.filter(c => c.saldoPesos > 0 || c.saldoUSD > 0).length}
                      </strong>
                    </span>
                    <span>
                      A Favor: <strong className="text-[#27ae60]">
                        {cuentasFiltradas.filter(c => c.saldoPesos < 0 || c.saldoUSD < 0).length}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {mostrarModalPago && clienteSeleccionado && (
          <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
            <div className="w-full h-full sm:h-auto sm:max-w-2xl lg:max-w-3xl bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border-2 border-[#ecf0f1] overflow-hidden transform transition-all duration-300 flex flex-col sm:max-h-[95vh]">
              
              <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-4 sm:p-6 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <span className="text-lg sm:text-2xl">💳</span>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-2xl font-bold">Registrar Pago</h3>
                    <p className="text-green-100 text-xs sm:text-sm">
                      Cliente: {clienteSeleccionado.cliente}
                    </p>
                    <p className="text-green-200 text-xs">
                      Deuda: {formatPesos(clienteSeleccionado.saldoPesos)} | {formatUSD(clienteSeleccionado.saldoUSD)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMostrarModalPago(false);
                    setClienteSeleccionado(null);
                    setPagoGuardado(false);
                    setPago({
                      monto: "",
                      moneda: "ARS",
                      formaPago: "",
                      destino: "",
                      observaciones: ""
                    });
                  }}
                  disabled={guardandoPago}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-lg sm:text-xl font-bold transition-all duration-200 hover:scale-110 disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8f9fa] min-h-0">
                
                <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded-xl p-4 text-white">
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <span>📋</span>
                    Resumen de la Cuenta
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/20 rounded-lg p-3">
                      <p className="text-blue-100 text-xs">Saldo en Pesos</p>
                      <p className="font-bold text-lg">{formatPesos(clienteSeleccionado.saldoPesos)}</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <p className="text-blue-100 text-xs">Saldo en USD</p>
                      <p className="font-bold text-lg">{formatUSD(clienteSeleccionado.saldoUSD)}</p>
                    </div>
                  </div>
                  
                  {clienteSeleccionado.trabajosPendientes && clienteSeleccionado.trabajosPendientes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <p className="text-blue-100 text-xs mb-2">Trabajos Pendientes:</p>
                      <div className="space-y-1">
                        {clienteSeleccionado.trabajosPendientes.slice(0, 3).map((trabajo, idx) => (
                          <div key={idx} className="text-xs bg-white/10 rounded px-2 py-1">
                            {trabajo.modelo} - {trabajo.trabajo} - {trabajo.moneda === "USD" ? "USD $" : "$"}{trabajo.precio}
                          </div>
                        ))}
                        {clienteSeleccionado.trabajosPendientes.length > 3 && (
                          <div className="text-xs text-blue-200">
                            +{clienteSeleccionado.trabajosPendientes.length - 3} más...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border-2 border-[#3498db] p-4 sm:p-6 shadow-sm">
                  <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm">💰</span>
                    </div>
                    <span className="text-sm sm:text-base">Monto del Pago</span>
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[#2c3e50]">
                        Monto recibido: *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="monto"
                        value={pago.monto}
                        onChange={handlePagoChange}
                        placeholder={pago.moneda === "USD" ? "0.00" : "0"}
                        className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-base sm:text-lg font-medium text-[#2c3e50] placeholder-[#7f8c8d]"
                        disabled={guardandoPago}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[#2c3e50]">
                        Moneda: *
                      </label>
                      <select
                        name="moneda"
                        value={pago.moneda}
                        onChange={handlePagoChange}
                        disabled={guardandoPago}
                        className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-sm sm:text-base text-[#2c3e50]"
                      >
                        <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
                        <option value="USD">🇺🇸 Dólares (USD)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-sm text-[#7f8c8d] w-full mb-1">Montos sugeridos:</span>
                    {clienteSeleccionado.saldoPesos > 0 && (
                      <button
                        type="button"
                        onClick={() => setPago(prev => ({
                          ...prev,
                          monto: clienteSeleccionado.saldoPesos.toString(),
                          moneda: "ARS"
                        }))}
                        disabled={guardandoPago}
                        className="bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50] px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      >
                        Total ARS: {formatPesos(clienteSeleccionado.saldoPesos)}
                      </button>
                    )}
                    {clienteSeleccionado.saldoUSD > 0 && (
                      <button
                        type="button"
                        onClick={() => setPago(prev => ({
                          ...prev,
                          monto: clienteSeleccionado.saldoUSD.toString(),
                          moneda: "USD"
                        }))}
                        disabled={guardandoPago}
                        className="bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50] px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      >
                        Total USD: {formatUSD(clienteSeleccionado.saldoUSD)}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border-2 border-[#9b59b6] p-4 sm:p-6 shadow-sm">
                  <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm">🏦</span>
                    </div>
                    <span className="text-sm sm:text-base">Método de Pago</span>
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[#2c3e50]">
                        Forma de pago: *
                      </label>
                      <input
                        type="text"
                        name="formaPago"
                        value={pago.formaPago}
                        onChange={handlePagoChange}
                        placeholder="🔍 Ej: Efectivo, Transferencia..."
                        disabled={guardandoPago}
                        className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d] disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-[#2c3e50]">
                        Destino (opcional):
                      </label>
                      <input
                        type="text"
                        name="destino"
                        value={pago.destino}
                        onChange={handlePagoChange}
                        placeholder="🏪 Cuenta bancaria, caja..."
                        disabled={guardandoPago}
                        className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d] disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-xs text-gray-600 w-full mb-1">Formas comunes:</span>
                    {['Efectivo', 'Transferencia', 'Tarjeta', 'MercadoPago'].map((forma) => (
                      <button
                        key={forma}
                        type="button"
                        onClick={() => setPago(prev => ({ ...prev, formaPago: forma }))}
                        disabled={guardandoPago}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors disabled:opacity-50"
                      >
                        {forma}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border-2 border-[#f39c12] p-4 sm:p-6 shadow-sm">
                  <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#f39c12] rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm">📝</span>
                    </div>
                    <span className="text-sm sm:text-base">Observaciones</span>
                  </h4>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-[#2c3e50]">
                      Notas adicionales (opcional):
                    </label>
                    <textarea
                      name="observaciones"
                      value={pago.observaciones}
                      onChange={handlePagoChange}
                      placeholder="💭 Cualquier información adicional sobre el pago..."
                      rows={3}
                      disabled={guardandoPago}
                      className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all resize-none text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d] disabled:opacity-50"
                    />
                  </div>
                </div>

                {pagoGuardado && (
                  <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] border-2 border-[#27ae60] rounded-xl p-3 sm:p-4 animate-pulse">
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                        <span className="text-[#27ae60] text-xs sm:text-sm font-bold">✓</span>
                      </div>
                      <span className="text-white font-semibold text-sm sm:text-lg">
                        ¡Pago registrado con éxito! Actualizando cuenta...
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#ecf0f1] border-t-2 border-[#bdc3c7] p-3 sm:p-6 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
                  <button
                    onClick={() => {
                      setMostrarModalPago(false);
                      setClienteSeleccionado(null);
                      setPagoGuardado(false);
                      setPago({
                        monto: "",
                        moneda: "ARS",
                        formaPago: "",
                        destino: "",
                        observaciones: ""
                      });
                    }}
                    disabled={guardandoPago}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm sm:text-base disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={guardarPago}
                    disabled={!pago.monto || !pago.formaPago || guardandoPago || pagoGuardado}
                    className={`w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium text-white transition-all duration-200 transform shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base ${
                      !pago.monto || !pago.formaPago || guardandoPago || pagoGuardado
                        ? "bg-[#bdc3c7] cursor-not-allowed"
                        : "bg-[#27ae60] hover:bg-[#229954] hover:scale-105"
                    }`}
                  >
                    {guardandoPago ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Guardando...
                      </>
                    ) : (
                      <>💾 Guardar Pago</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}