// hooks/useCajaDiaria.ts
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, getDoc, setDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useRol } from '../../../lib/useRol';
import { VentaDelDia, ResumenCaja, CajaHistorial, CapitalData } from '../types/caja';

export const useCajaDiaria = () => {
  const { rol } = useRol();
  
  // Estados principales
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [ventasDelDia, setVentasDelDia] = useState<VentaDelDia[]>([]);
  const [resumenCaja, setResumenCaja] = useState<ResumenCaja>({
    totalVentas: 0,
    efectivo: 0,
    transferencia: 0,
    cuentaCorriente: 0,
    efectivoEnCaja: 0
  });
  
  // Estados de caja
  const [cajaCerrada, setCajaCerrada] = useState(false);
  const [diferenciaCaja, setDiferenciaCaja] = useState(0);
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

  // Cargar ventas del día desde Firebase
  const cargarVentasDelDia = async (fecha: string) => {
    if (!rol?.negocioID) return;
    
    setCargandoVentas(true);
    try {
      const ventasRef = collection(db, `negocios/${rol.negocioID}/ventasGeneral`);
      const snapshot = await getDocs(ventasRef);
      
      const ventasDelDiaFiltradas = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((venta: any) => {
            if (!venta.fecha) return false;
            
            // Convertir fecha seleccionada YYYY-MM-DD a DD/MM/AAAA
            const [año, mes, dia] = fecha.split('-');
            const fechaSeleccionadaDD = `${dia}/${mes}/${año}`;
            
            return venta.fecha === fechaSeleccionadaDD;
          }).filter((venta: any) => venta.fecha === fecha) as VentaDelDia[];

      setVentasDelDia(ventasDelDiaFiltradas);

      // Calcular resumen
      const resumen = ventasDelDiaFiltradas.reduce((acc, venta) => {
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
        efectivoEnCaja: resumenCaja.efectivoEnCaja // Mantener el valor actual
      });

      setResumenCaja(resumen);
      
    } catch (error) {
      console.error('❌ Error cargando ventas del día:', error);
    } finally {
      setCargandoVentas(false);
    }
  };

  // Cargar historial de cajas desde Firebase
  const cargarHistorialCajas = async () => {
    if (!rol?.negocioID) return;
    
    try {
      const cajasRef = collection(db, `negocios/${rol.negocioID}/cajasDiarias`);
      const snapshot = await getDocs(query(cajasRef, orderBy('fecha', 'desc')));
      
      const cajas = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          fecha: data.fecha || '',
          totalVentas: data.totalVentas || 0,
          efectivo: data.efectivo || 0,
          transferencia: data.transferencia || 0,
          cuentaCorriente: data.cuentaCorriente || 0,
          efectivoEnCaja: data.efectivoEnCaja || 0,
          diferencia: data.diferencia || 0,
          estado: data.estado || 'cerrada',
          fechaCierre: data.fechaCierre
        } as CajaHistorial;
      });
      
      setHistorialCajas(cajas);
      
    } catch (error) {
      console.error('❌ Error cargando historial de cajas:', error);
    }
  };

  // Cargar datos de capital desde Firebase
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

      // Calcular totales
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

      // Cargar efectivo
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

  // Verificar si ya existe una caja cerrada
  const verificarCajaCerrada = async (fecha: string) => {
    if (!rol?.negocioID) return;
    
    try {
      const cajasRef = collection(db, `negocios/${rol.negocioID}/cajasDiarias`);
      const snapshot = await getDocs(query(cajasRef, where('fecha', '==', fecha)));
      
      if (!snapshot.empty) {
        setCajaCerrada(true);
        const cajaData = snapshot.docs[0].data();
        setDiferenciaCaja(cajaData.diferencia || 0);
      } else {
        setCajaCerrada(false);
        setDiferenciaCaja(0);
      }
    } catch (error) {
      console.error('❌ Error verificando caja cerrada:', error);
    }
  };

  // Funciones de manejo
  const handleCerrarCaja = async () => {
    if (!rol?.negocioID) return;
    
    const diferencia = resumenCaja.efectivoEnCaja - resumenCaja.efectivo;
    setDiferenciaCaja(diferencia);
    setCajaCerrada(true);

    const nuevaCaja: CajaHistorial = {
      fecha: fechaSeleccionada,
      totalVentas: resumenCaja.totalVentas,
      efectivo: resumenCaja.efectivo,
      transferencia: resumenCaja.transferencia,
      cuentaCorriente: resumenCaja.cuentaCorriente,
      efectivoEnCaja: resumenCaja.efectivoEnCaja,
      diferencia: diferencia,
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
    setDiferenciaCaja(0);
    setResumenCaja(prev => ({ ...prev, efectivoEnCaja: 0 }));
    const hoy = new Date().toISOString().split('T')[0];
    setFechaSeleccionada(hoy);
  };

  const actualizarEfectivoEnCaja = (valor: number) => {
    setResumenCaja(prev => ({ ...prev, efectivoEnCaja: valor }));
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

  // Efectos
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
    // Estados
    fechaSeleccionada,
    setFechaSeleccionada,
    ventasDelDia,
    resumenCaja,
    cajaCerrada,
    diferenciaCaja,
    historialCajas,
    capitalData,
    cotizacionCapital,
    setCotizacionCapital,
    cargandoVentas,
    cargandoCapital,
    
    // Funciones
    handleCerrarCaja,
    handleNuevaCaja,
    actualizarEfectivoEnCaja,
    actualizarEfectivo,
    cargarCapital,
    
    // Datos derivados
    isAdmin: rol?.tipo === 'admin',
    negocioID: rol?.negocioID
  };
};