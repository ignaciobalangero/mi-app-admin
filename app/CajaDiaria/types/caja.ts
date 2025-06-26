// types/caja.ts - ACTUALIZADO CON USD/ARS
export interface VentaDelDia {
    id: string;
    nroVenta: string;
    cliente: string;
    total: number;
    estado: 'pagado' | 'pendiente';
    metodoPago: string;
    fecha: string;
    moneda: 'USD' | 'ARS'; // 🔧 NUEVO CAMPO
    productos?: any[];
    // Campos adicionales opcionales
    pago?: {
      forma: string;
      moneda: string;
      monto: number;
      montoUSD?: number;
    };
  }
  
  export interface ResumenCaja {
    totalVentas: number;
    efectivo: number;
    transferencia: number;
    cuentaCorriente: number;
    efectivoEnCaja: number;
  }
  
  // 🔧 NUEVO: Resumen separado por moneda
  export interface ResumenCajaCompleto {
    USD: ResumenCaja;
    ARS: ResumenCaja;
  }
  
  export interface CajaHistorial {
    id: string;
    fecha: string;
    totalVentas: number;
    efectivo: number;
    transferencia: number;
    cuentaCorriente: number;
    efectivoEnCaja: number;
    diferencia: number;
    estado: string;
    fechaCierre?: string;
    // 🔧 NUEVOS CAMPOS PARA USD
    totalVentasUSD?: number;
    efectivoUSD?: number;
    transferenciaUSD?: number;
    cuentaCorrienteUSD?: number;
    efectivoEnCajaUSD?: number;
    diferenciaCajaUSD?: number;
    diferenciaCajaARS?: number;
  }
  
  export interface CapitalData {
    stockTelefonos: number;
    stockAccesorios: number;
    stockRepuestos: number;
    stockExtra: number;
    efectivoUSD: number;
    efectivoARS: number;
  }
  
  export interface TotalesMes {
    mes: string;
    ventas: number;
    efectivo: number;
    transferencia: number;
    cuentaCorriente: number;
    diferenciasPositivas: number;
    diferenciasNegativas: number;
    diasTrabajados: number;
    diferenciaNeta: number;
    promedioVentas: number;
    // 🔧 NUEVOS CAMPOS PARA USD
    ventasUSD?: number;
    efectivoUSD?: number;
    transferenciaUSD?: number;
    cuentaCorrienteUSD?: number;
  }