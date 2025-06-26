// hooks/useCajaDiaria.ts - VERSIÓN SIMPLE CON USD/ARS Y MODAL BONITO
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  orderBy, 
  limit,
  deleteDoc,  // 🔧 AGREGAR IMPORT PARA BORRAR
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useRol } from '../../../lib/useRol';
import { VentaDelDia, ResumenCaja, CajaHistorial, CapitalData } from '../types/caja';

export const useCajaDiaria = () => {
  const { rol } = useRol();
  
  // Estados principales
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [ventasDelDia, setVentasDelDia] = useState<VentaDelDia[]>([]);
  
  // 🔧 RESÚMENES SEPARADOS PARA USD Y ARS
  const [resumenCajaUSD, setResumenCajaUSD] = useState<ResumenCaja>({
    totalVentas: 0,
    efectivo: 0,
    transferencia: 0,
    cuentaCorriente: 0,
    efectivoEnCaja: 0
  });
  
  const [resumenCajaARS, setResumenCajaARS] = useState<ResumenCaja>({
    totalVentas: 0,
    efectivo: 0,
    transferencia: 0,
    cuentaCorriente: 0,
    efectivoEnCaja: 0
  });
  
  // Estados de caja
  const [cajaCerrada, setCajaCerrada] = useState(false);
  const [historialCajas, setHistorialCajas] = useState<CajaHistorial[]>([]);
  
  // Estados de capital
  const [capitalData, setCapitalData] = useState<CapitalData>({
    stockTelefonos: 0,
    stockAccesorios: 0,
    stockRepuestos: 0,
    stockExtra: 0,
    efectivoUSD: 0,
    efectivoARS: 0
  });
  const [cotizacionCapital, setCotizacionCapital] = useState(1000);
  
  // Estados de carga
  const [cargandoVentas, setCargandoVentas] = useState(false);
  const [cargandoCapital, setCargandoCapital] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // 🔧 DATOS DERIVADOS
  const isAdmin = rol?.tipo === 'admin';
  const negocioID = rol?.negocioID;
  const usuario = rol; // Asumiendo que rol contiene info del usuario

  // 🔧 DEBUG: Verificar usuario y admin - SIMPLE
  console.log('👤 USUARIO ADMIN CHECK:', usuario?.tipo, '| isAdmin:', isAdmin);

  // 🧮 CALCULAR DIFERENCIAS EN TIEMPO REAL
  const diferenciaCajaUSD = (resumenCajaUSD?.efectivoEnCaja || 0) - (resumenCajaUSD?.efectivo || 0);
  const diferenciaCajaARS = (resumenCajaARS?.efectivoEnCaja || 0) - (resumenCajaARS?.efectivo || 0);

  // 🔧 FUNCIÓN CORREGIDA - Cargar ventas separadas por moneda
  const cargarVentasDelDia = async (fecha: string) => {
    if (!rol?.negocioID) return;
    
    setCargandoVentas(true);
    console.log('🚀 Cargando ventas separadas por moneda para:', fecha);
    
    try {
      const ventasRef = collection(db, `negocios/${rol.negocioID}/ventasGeneral`);
      const snapshot = await getDocs(ventasRef);
      
      console.log('📊 Total documentos:', snapshot.docs.length);
      
      // Convertir fecha sin ceros a la izquierda
      const [año, mes, dia] = fecha.split('-');
      const fechaFirebase = `${parseInt(dia)}/${parseInt(mes)}/${año}`;
      
      // Filtrar y mapear ventas
      const ventasDelDiaFiltradas = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nroVenta: data.nroVenta || doc.id,
            cliente: data.cliente || 'Sin cliente',
            total: Number(data.total || 0), // 🔧 USAR TOTAL BRUTO, NO GANANCIA
            estado: data.estado || 'pendiente',
            metodoPago: data.pago?.forma || data.metodoPago || 'efectivo',
            moneda: data.moneda || 'ARS', // 🔧 CAMPO MONEDA
            fecha: data.fecha || '',
            // Campos adicionales para debug
            pagoCompleto: data.pago
          };
        })
        .filter((venta: any) => venta.fecha === fechaFirebase) as VentaDelDia[];

      console.log('✅ Ventas filtradas:', ventasDelDiaFiltradas.length);
      
      // 🔧 DEBUG: Verificar que usamos monto bruto
      if (ventasDelDiaFiltradas.length > 0) {
        const primeraVenta = ventasDelDiaFiltradas[0];
        console.log('🔍 Debug primera venta:');
        console.log('  - Total bruto (para caja):', primeraVenta.total);
        console.log('  - Moneda:', primeraVenta.moneda);
        console.log('  - Estado:', primeraVenta.estado);
        console.log('  - Método pago:', primeraVenta.metodoPago);
      }
      
      // 🔧 SEPARAR VENTAS POR MONEDA
      const ventasUSD = ventasDelDiaFiltradas.filter(v => v.moneda === 'USD');
      const ventasARS = ventasDelDiaFiltradas.filter(v => v.moneda === 'ARS');
      
      console.log('💵 Ventas USD:', ventasUSD.length);
      console.log('💰 Ventas ARS:', ventasARS.length);
      
      setVentasDelDia(ventasDelDiaFiltradas);

      // 🔧 CALCULAR RESUMEN USD
      const resumenUSD = ventasUSD.reduce((acc, venta) => {
        acc.totalVentas += venta.total || 0;
        
        if (venta.estado === 'pagado') {
          if (venta.metodoPago === 'efectivo' || venta.metodoPago?.toLowerCase().includes('efectivo')) {
            acc.efectivo += venta.total || 0;
          } else {
            acc.transferencia += venta.total || 0;
          }
        } else {
          acc.cuentaCorriente += venta.total || 0;
        }
        
        return acc;
      }, {
        totalVentas: 0,
        efectivo: 0,
        transferencia: 0,
        cuentaCorriente: 0,
        efectivoEnCaja: resumenCajaUSD.efectivoEnCaja // Mantener valor actual
      });

      // 🔧 CALCULAR RESUMEN ARS
      const resumenARS = ventasARS.reduce((acc, venta) => {
        acc.totalVentas += venta.total || 0;
        
        if (venta.estado === 'pagado') {
          if (venta.metodoPago === 'efectivo' || venta.metodoPago?.toLowerCase().includes('efectivo')) {
            acc.efectivo += venta.total || 0;
          } else {
            acc.transferencia += venta.total || 0;
          }
        } else {
          acc.cuentaCorriente += venta.total || 0;
        }
        
        return acc;
      }, {
        totalVentas: 0,
        efectivo: 0,
        transferencia: 0,
        cuentaCorriente: 0,
        efectivoEnCaja: resumenCajaARS.efectivoEnCaja // Mantener valor actual
      });

      console.log('💵 Resumen USD:', resumenUSD);
      console.log('💰 Resumen ARS:', resumenARS);

      setResumenCajaUSD(resumenUSD);
      setResumenCajaARS(resumenARS);
      
    } catch (error) {
      console.error('❌ Error cargando ventas:', error);
    } finally {
      setCargandoVentas(false);
    }
  };

  // 🔧 FUNCIÓN ACTUALIZADA CON ID
  const cargarHistorialCajas = async () => {
    if (!rol?.negocioID) return;
    
    setCargandoHistorial(true);
    try {
      const cajasRef = collection(db, `negocios/${rol.negocioID}/cajasDiarias`);
      const snapshot = await getDocs(query(cajasRef, orderBy('fecha', 'desc')));
      
      const cajas = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, // 🔧 INCLUIR ID DEL DOCUMENTO
          fecha: data.fecha || '',
          totalVentas: data.totalVentas || 0,
          efectivo: data.efectivo || 0,
          transferencia: data.transferencia || 0,
          cuentaCorriente: data.cuentaCorriente || 0,
          efectivoEnCaja: data.efectivoEnCaja || 0,
          diferencia: data.diferencia || 0,
          estado: data.estado || 'cerrada',
          fechaCierre: data.fechaCierre,
          // Nuevos campos USD
          totalVentasUSD: data.totalVentasUSD || 0,
          efectivoUSD: data.efectivoUSD || 0,
          transferenciaUSD: data.transferenciaUSD || 0,
          cuentaCorrienteUSD: data.cuentaCorrienteUSD || 0,
          efectivoEnCajaUSD: data.efectivoEnCajaUSD || 0,
          diferenciaCajaUSD: data.diferenciaCajaUSD || 0,
          diferenciaCajaARS: data.diferenciaCajaARS || data.diferencia || 0
        } as CajaHistorial;
      });
      
      setHistorialCajas(cajas);
      
    } catch (error) {
      console.error('❌ Error cargando historial de cajas:', error);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const cargarCapital = async () => {
    if (!rol?.negocioID) return;
    
    setCargandoCapital(true);
    try {
      console.log('🔄 Cargando datos de capital desde Firebase...');
      
      const [
        stockTelefonosSnap,
        stockAccesoriosSnap,
        stockRepuestosSnap,
        stockExtraSnap,
        capitalConfigSnap
      ] = await Promise.all([
        getDocs(collection(db, `negocios/${rol.negocioID}/stockTelefonos`)),
        getDocs(collection(db, `negocios/${rol.negocioID}/stockAccesorios`)),
        getDocs(collection(db, `negocios/${rol.negocioID}/stockRepuestos`)),
        getDocs(collection(db, `negocios/${rol.negocioID}/stockExtra`)),
        getDoc(doc(db, `negocios/${rol.negocioID}/configuracion/capital`))
      ]);

      const totalTelefonos = stockTelefonosSnap.docs.reduce((acc, doc) => {
        const data = doc.data();
        const costo = Number(data.precioCompra || data.precioCosto || 0);
        return acc + costo;
      }, 0);

      const totalAccesorios = stockAccesoriosSnap.docs.reduce((acc, doc) => {
        const data = doc.data();
        const costo = Number(data.precioCosto || 0);
        const cantidad = Number(data.cantidad || 0);
        return acc + (costo * cantidad);
      }, 0);

      const totalRepuestos = stockRepuestosSnap.docs.reduce((acc, doc) => {
        const data = doc.data();
        const costo = Number(data.precioCosto || 0);
        const cantidad = Number(data.cantidad || 0);
        return acc + (costo * cantidad);
      }, 0);

      const totalStockExtra = stockExtraSnap.docs.reduce((acc, doc) => {
        const data = doc.data();
        const costo = Number(data.precioCosto || 0);
        const cantidad = Number(data.cantidad || 0);
        return acc + (costo * cantidad);
      }, 0);

      let efectivoConfig = { efectivoUSD: 0, efectivoARS: 0 };
      if (capitalConfigSnap.exists()) {
        const data = capitalConfigSnap.data();
        efectivoConfig = {
          efectivoUSD: Number(data.efectivoUSD || 0),
          efectivoARS: Number(data.efectivoARS || 0)
        };
      }

      setCapitalData({
        stockTelefonos: totalTelefonos,
        stockAccesorios: totalAccesorios,
        stockRepuestos: totalRepuestos,
        stockExtra: totalStockExtra,
        ...efectivoConfig
      });

    } catch (error) {
      console.error('❌ Error cargando capital:', error);
    } finally {
      setCargandoCapital(false);
    }
  };

  const verificarCajaCerrada = async (fecha: string) => {
    if (!rol?.negocioID) return;
    
    try {
      const cajasRef = collection(db, `negocios/${rol.negocioID}/cajasDiarias`);
      const snapshot = await getDocs(query(cajasRef, where('fecha', '==', fecha)));
      
      if (!snapshot.empty) {
        setCajaCerrada(true);
        const cajaData = snapshot.docs[0].data();
        // Cargar los valores de efectivo en caja para mostrar las diferencias calculadas
        setResumenCajaUSD(prev => ({
          ...prev,
          efectivoEnCaja: cajaData.efectivoEnCajaUSD || 0
        }));
        setResumenCajaARS(prev => ({
          ...prev,
          efectivoEnCaja: cajaData.efectivoEnCaja || 0
        }));
      } else {
        setCajaCerrada(false);
      }
    } catch (error) {
      console.error('❌ Error verificando caja cerrada:', error);
    }
  };

  const handleCerrarCaja = async () => {
    if (!rol?.negocioID) return;
    
    const diferenciaUSD = resumenCajaUSD.efectivoEnCaja - resumenCajaUSD.efectivo;
    const diferenciaARS = resumenCajaARS.efectivoEnCaja - resumenCajaARS.efectivo;
    
    setCajaCerrada(true);

    // Por ahora mantener estructura original pero agregar campos USD/ARS
    const nuevaCaja = {
      fecha: fechaSeleccionada,
      // Datos tradicionales (ARS por compatibilidad)
      totalVentas: resumenCajaARS.totalVentas,
      efectivo: resumenCajaARS.efectivo,
      transferencia: resumenCajaARS.transferencia,
      cuentaCorriente: resumenCajaARS.cuentaCorriente,
      efectivoEnCaja: resumenCajaARS.efectivoEnCaja,
      diferencia: diferenciaARS,
      // Nuevos datos USD
      totalVentasUSD: resumenCajaUSD.totalVentas,
      efectivoUSD: resumenCajaUSD.efectivo,
      transferenciaUSD: resumenCajaUSD.transferencia,
      cuentaCorrienteUSD: resumenCajaUSD.cuentaCorriente,
      efectivoEnCajaUSD: resumenCajaUSD.efectivoEnCaja,
      diferenciaCajaUSD: diferenciaUSD,
      diferenciaCajaARS: diferenciaARS,
      estado: 'cerrada',
      fechaCierre: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, `negocios/${rol.negocioID}/cajasDiarias`), nuevaCaja);
      console.log('💾 Caja guardada correctamente');
      await cargarHistorialCajas();
    } catch (error) {
      console.error('❌ Error guardando caja:', error);
    }
  };

  const handleNuevaCaja = () => {
    setCajaCerrada(false);
    setResumenCajaUSD(prev => ({ ...prev, efectivoEnCaja: 0 }));
    setResumenCajaARS(prev => ({ ...prev, efectivoEnCaja: 0 }));
    const hoy = new Date().toISOString().split('T')[0];
    setFechaSeleccionada(hoy);
  };

  // 🔧 FUNCIONES ACTUALIZADAS PARA USD/ARS
  const actualizarEfectivoEnCajaUSD = (valor: number) => {
    setResumenCajaUSD(prev => ({ ...prev, efectivoEnCaja: valor }));
  };

  const actualizarEfectivoEnCajaARS = (valor: number) => {
    setResumenCajaARS(prev => ({ ...prev, efectivoEnCaja: valor }));
  };

  const actualizarEfectivo = async (tipo: keyof CapitalData, valor: string) => {
    if (!rol?.negocioID) return;
    
    const nuevoValor = Number(valor) || 0;
    setCapitalData(prev => ({ ...prev, [tipo]: nuevoValor }));
    
    try {
      const capitalRef = doc(db, `negocios/${rol.negocioID}/configuracion/capital`);
      await setDoc(capitalRef, { [tipo]: nuevoValor }, { merge: true });
      console.log(`💾 ${tipo} actualizado: ${nuevoValor}`);
    } catch (error) {
      console.error(`❌ Error actualizando ${tipo}:`, error);
    }
  };

  // 🔧 FUNCIÓN PARA BORRAR CAJA - ACTUALIZADA PARA MODAL BONITO
  const borrarCaja = async (cajaId: string, fecha: string): Promise<boolean> => {
    if (!rol?.negocioID) {
      console.error('❌ No hay negocioID');
      return false;
    }

    if (rol?.tipo !== 'admin') {
      console.error('❌ Solo administradores pueden borrar cajas');
      return false;
    }

    try {
      console.log('🗑️ Intentando borrar caja ID:', cajaId, 'fecha:', fecha);

      // Borrar directamente por ID del documento
      const cajaRef = doc(db, `negocios/${rol.negocioID}/cajasDiarias`, cajaId);
      await deleteDoc(cajaRef);
      
      console.log('✅ Caja borrada exitosamente - ID:', cajaId);
      
      // Recargar historial
      await cargarHistorialCajas();
      
      return true;
      
    } catch (error) {
      console.error('❌ Error borrando caja:', error);
      return false;
    }
  };

  useEffect(() => {
    if (rol?.negocioID) {
      cargarVentasDelDia(fechaSeleccionada);
      verificarCajaCerrada(fechaSeleccionada);
    }
  }, [fechaSeleccionada, rol?.negocioID]);

  useEffect(() => {
    if (rol?.negocioID) {
      cargarHistorialCajas();
      cargarCapital();
    }
  }, [rol?.negocioID]);

  return {
    // Estados principales
    fechaSeleccionada,
    setFechaSeleccionada,
    ventasDelDia,
    cajaCerrada,
    setCajaCerrada,
    
    // 🔧 NUEVOS ESTADOS PARA USD/ARS
    resumenCajaUSD,
    resumenCajaARS,
    diferenciaCajaUSD,
    diferenciaCajaARS,
    
    // Estados existentes
    historialCajas,
    capitalData,
    cotizacionCapital,
    setCotizacionCapital,
    
    // Estados de carga
    cargandoVentas,
    cargandoCapital,
    cargandoHistorial,
    
    // Funciones originales
    cerrarCaja: handleCerrarCaja,
    nuevaCaja: handleNuevaCaja,
    actualizarEfectivo,
    cargarCapital,
    borrarCaja, // 🔧 FUNCIÓN BORRAR ACTUALIZADA
    
    // 🔧 NUEVAS FUNCIONES PARA USD/ARS
    actualizarEfectivoEnCajaUSD,
    actualizarEfectivoEnCajaARS,
    
    // Datos derivados
    isAdmin,
    negocioID
  };
};