// utils/cajaUtils.ts
import { CajaHistorial, TotalesMes } from '../types/caja';

export const formatearFecha = (fecha: string): string => {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
};

export const formatearMes = (fechaMes: string): string => {
  return new Date(fechaMes + '-01T12:00:00').toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric'
  });
};

export const agruparCajasPorMes = (historialCajas: CajaHistorial[]): Record<string, CajaHistorial[]> => {
  return historialCajas.reduce((acc, caja) => {
    const mes = caja.fecha.slice(0, 7); // YYYY-MM
    if (!acc[mes]) {
      acc[mes] = [];
    }
    acc[mes].push(caja);
    return acc;
  }, {} as Record<string, CajaHistorial[]>);
};

export const calcularTotalesPorMes = (cajasPorMes: Record<string, CajaHistorial[]>): TotalesMes[] => {
  return Object.keys(cajasPorMes).map(mes => {
    const cajas = cajasPorMes[mes];
    const totales = cajas.reduce((acc, caja) => ({
      ventas: acc.ventas + caja.totalVentas,
      efectivo: acc.efectivo + caja.efectivo,
      transferencia: acc.transferencia + caja.transferencia,
      cuentaCorriente: acc.cuentaCorriente + caja.cuentaCorriente,
      diferenciasPositivas: acc.diferenciasPositivas + (caja.diferencia > 0 ? caja.diferencia : 0),
      diferenciasNegativas: acc.diferenciasNegativas + (caja.diferencia < 0 ? Math.abs(caja.diferencia) : 0),
      diasTrabajados: acc.diasTrabajados + 1
    }), {
      ventas: 0,
      efectivo: 0,
      transferencia: 0,
      cuentaCorriente: 0,
      diferenciasPositivas: 0,
      diferenciasNegativas: 0,
      diasTrabajados: 0
    });

    return {
      mes,
      ...totales,
      diferenciaNeta: totales.diferenciasPositivas - totales.diferenciasNegativas,
      promedioVentas: Math.round(totales.ventas / totales.diasTrabajados)
    };
  }).sort((a, b) => b.mes.localeCompare(a.mes)); // Más reciente primero
};

export const calcularTotalHistorial = (historialCajas: CajaHistorial[]) => {
  return historialCajas.reduce((acc, caja) => ({
    ventas: acc.ventas + caja.totalVentas,
    efectivo: acc.efectivo + caja.efectivo,
    transferencia: acc.transferencia + caja.transferencia,
    cuentaCorriente: acc.cuentaCorriente + caja.cuentaCorriente
  }), { ventas: 0, efectivo: 0, transferencia: 0, cuentaCorriente: 0 });
};

export const calcularTotalInventario = (capitalData: any): number => {
  return capitalData.stockTelefonos + capitalData.stockAccesorios + 
         capitalData.stockRepuestos + capitalData.stockExtra;
};

export const calcularTotalEfectivo = (capitalData: any, cotizacion: number): number => {
  const arsEnUsd = capitalData.efectivoARS / cotizacion;
  return capitalData.efectivoUSD + arsEnUsd;
};

export const calcularCapitalTotal = (capitalData: any, cotizacion: number): number => {
  return calcularTotalInventario(capitalData) + calcularTotalEfectivo(capitalData, cotizacion);
};