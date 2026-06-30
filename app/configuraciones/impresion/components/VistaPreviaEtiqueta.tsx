"use client";

import {
  columnasEtiquetaTrabajo,
  LABELS_ETIQUETA_TRABAJO,
} from "@/lib/etiquetaTrabajoCampos";

interface Props {
  campos: string[];
  configuracion: any;
  datosEjemplo: any;
  nombreNegocio?: string; // ✨ NUEVO: nombre del negocio
}

export default function VistaPreviaEtiqueta({ campos, configuracion, datosEjemplo, nombreNegocio }: Props) {
  
  // 🎯 DIMENSIONES REALES
  const dimensionesReales = {
    '62x29': { width: '62mm', height: '29mm' },
    '38x90': { width: '38mm', height: '90mm' },
    '29x90': { width: '29mm', height: '90mm' },
    '62x100': { width: '62mm', height: '100mm' }
  };

  const esHorizontal = configuracion.orientacion === 'horizontal';
  const dimBase = dimensionesReales[configuracion.tamaño] || dimensionesReales['62x29'];
  
  const dimensiones = esHorizontal 
    ? { width: dimBase.width, height: dimBase.height }
    : { width: dimBase.height, height: dimBase.width };

  const tieneCodigoBarras = configuracion.incluirCodigoBarras && campos.includes('codigoBarras');

  // 📏 TAMAÑOS DE TEXTO OPTIMIZADOS PARA MULTILÍNEA
  const calcularTamañosTexto = () => {
    const base = configuracion.tamañoTexto || 'mediano';
    
    return {
      'muy-pequeño': { orden: '11px', campo: '8px', pie: '6px', gap: '2px' },
      'pequeño': { orden: '12px', campo: '9px', pie: '6px', gap: '2px' },
      'mediano': { orden: '13px', campo: '10px', pie: '7px', gap: '3px' }
    };
  };

  const tamañosTexto = calcularTamañosTexto();
  const baseSize = configuracion.tamañoTexto || 'mediano';
  const textoSize = tamañosTexto[baseSize];

  // 🎨 RENDERIZAR CAMPO - CON SOPORTE MULTILÍNEA
  const renderCampo = (etiqueta: string, valor: any, opciones?: { mono?: boolean; color?: string }) => {
    const valorMostrar = valor || '';
    
    return (
      <div style={{
        fontSize: textoSize.campo,
        fontWeight: 'bold',
        color: opciones?.color || 'black',
        lineHeight: '1.2',
        display: 'flex',
        flexDirection: 'column', // ✨ CAMBIO: columna en lugar de fila
        gap: '0.3mm',
        fontFamily: opciones?.mono ? 'Courier, monospace' : 'Arial, sans-serif',
        marginBottom: '1.2mm'
      }}>
        <span style={{
          fontWeight: '900',
          fontSize: textoSize.campo,
          flexShrink: 0
        }}>
          {etiqueta}
        </span>
        <span style={{
          fontWeight: 'bold',
          fontSize: textoSize.campo,
          wordWrap: 'break-word', // ✨ PERMITE SALTO DE LÍNEA
          overflowWrap: 'break-word',
          whiteSpace: 'normal', // ✨ PERMITE MÚLTIPLES LÍNEAS
          lineHeight: '1.1'
        }}>
          {valorMostrar}
        </span>
      </div>
    );
  };

  const datosLayout = {
    ...datosEjemplo,
    id: datosEjemplo.numeroOrden ?? datosEjemplo.id,
  };
  const { columnaIzq: colsIzq, columnaDer: colsDer } = columnasEtiquetaTrabajo(
    campos,
    datosLayout as Record<string, unknown>
  );

  const colorCampo = (id: string) => {
    if (id === "anticipo") return "#006400";
    if (id === "saldo") return "#8B0000";
    return undefined;
  };

  const columnaIzq = colsIzq.map((c) => (
    <div key={c.id}>
      {renderCampo(`${LABELS_ETIQUETA_TRABAJO[c.id] ?? c.label}:`, c.valor, {
        mono: c.mono,
        color: colorCampo(c.id),
      })}
    </div>
  ));

  const columnaDer = colsDer.map((c) => (
    <div key={c.id}>
      {renderCampo(`${LABELS_ETIQUETA_TRABAJO[c.id] ?? c.label}:`, c.valor, {
        mono: c.mono,
        color: colorCampo(c.id),
      })}
    </div>
  ));

  // 📏 CALCULAR PADDING COMPACTO
  const paddingDinamico = '1mm';

  return (
    <div style={{
      width: dimensiones.width,
      height: dimensiones.height,
      backgroundColor: 'white',
      border: configuracion.mostrarBorde ? '2px solid black' : 'none',
      padding: paddingDinamico,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      
      {/* 🏢 HEADER - NOMBRE DEL NEGOCIO */}
      {nombreNegocio && (
        <div style={{
          textAlign: 'center',
          marginBottom: '1mm',
          paddingBottom: '0.5mm',
          borderBottom: '2px solid black',
          flexShrink: 0
        }}>
          <div style={{
            fontSize: textoSize.campo,
            fontWeight: '900',
            color: 'black',
            letterSpacing: '0.3px'
          }}>
            {nombreNegocio}
          </div>
        </div>
      )}
      
      {/* 📋 CONTENIDO EN 2 COLUMNAS CON FLEXBOX */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        gap: '2mm',
        overflow: 'hidden',
        minHeight: 0
      }}>
        
        {/* COLUMNA IZQUIERDA */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {columnaIzq}
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {columnaDer}
        </div>
      </div>

      {/* 📊 CÓDIGO DE BARRAS */}
      {tieneCodigoBarras && (
        <div style={{
          textAlign: 'center',
          borderTop: '1px solid #ccc',
          paddingTop: '0.3mm',
          marginTop: '0.5mm',
          flexShrink: 0
        }}>
          <div style={{ 
            fontSize: '7px', 
            fontFamily: 'Courier, monospace',
            fontWeight: 'bold',
            letterSpacing: '1px',
            color: 'black'
          }}>
            |||| |||| |||| ||||
          </div>
        </div>
      )}

      {/* 🏷️ PIE */}
      <div style={{
        fontSize: textoSize.pie,
        fontWeight: 'bold',
        color: '#666',
        textAlign: 'right',
        borderTop: '1px solid #ddd',
        paddingTop: '0.2mm',
        marginTop: '0.5mm',
        flexShrink: 0
      }}>
        GestiOne
      </div>
    </div>
  );
}