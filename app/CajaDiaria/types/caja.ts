// types/caja.ts
export interface VentaDelDia {
    id: string;
    nroVenta: string;
    cliente: string;
    total: number;
    estado: 'pagado' | 'pendiente';
    metodoPago: string;
    fecha: string;
    productos?: any[];
  }
  
  export interface ResumenCaja {
    totalVentas: number;
    efectivo: number;
    transferencia: number;
    cuentaCorriente: number;
    efectivoEnCaja: number;
  }
  
  export interface CajaHistorial {
    fecha: string;
    totalVentas: number;
    efectivo: number;
    transferencia: number;
    cuentaCorriente: number;
    efectivoEnCaja: number;
    diferencia: number;
    estado: string;
    fechaCierre?: string;
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
  }