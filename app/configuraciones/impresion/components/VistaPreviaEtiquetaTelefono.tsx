"use client";

interface Props {
  campos: string[];
  configuracion: any;
  datosEjemplo: any;
  nombreNegocio?: string;
}

export default function VistaPreviaEtiquetaTelefono({ campos, configuracion, datosEjemplo, nombreNegocio }: Props) {

  const formatearPrecio = (valor: string | number): string => {
    const numero = typeof valor === 'string' ? parseFloat(valor.replace(/\./g, '').replace(',', '.')) : valor;
    if (isNaN(numero)) return '0';
    return numero.toLocaleString('es-AR');
  };

  // 🎯 DIMENSIONES REALES
  const dimensionesReales: Record<string, { width: string; height: string }> = {
    '62x29': { width: '62mm', height: '29mm' },
    '38x90': { width: '38mm', height: '90mm' },
    '29x90': { width: '29mm', height: '90mm' },
    '62x100': { width: '62mm', height: '100mm' },
  };

  const esHorizontal = configuracion.orientacion !== 'vertical';
  const dimBase = dimensionesReales[configuracion.tamaño] || dimensionesReales['62x29'];

  const dimensiones = esHorizontal
    ? { width: dimBase.width, height: dimBase.height }
    : { width: dimBase.height, height: dimBase.width };

  // 📏 TAMAÑOS DE TEXTO — igual que VistaPreviaEtiqueta
  const tamañosTexto: Record<string, { orden: string; campo: string; pie: string; gap: string }> = {
    'muy-pequeño': { orden: '11px', campo: '8px', pie: '6px', gap: '2px' },
    'pequeño':     { orden: '12px', campo: '9px', pie: '6px', gap: '2px' },
    'mediano':     { orden: '13px', campo: '10px', pie: '7px', gap: '3px' },
  };

  const baseSize = configuracion.tamañoTexto || 'mediano';
  const textoSize = tamañosTexto[baseSize] || tamañosTexto['mediano'];

  // 🎨 RENDERIZAR CAMPO — igual estructura que VistaPreviaEtiqueta
  const renderCampo = (etiqueta: string, valor: any, opciones?: { mono?: boolean; color?: string }) => {
    const valorMostrar = valor || '';
    return (
      <div style={{
        fontSize: textoSize.campo,
        fontWeight: 'bold',
        color: opciones?.color || 'black',
        lineHeight: '1.2',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3mm',
        fontFamily: opciones?.mono ? 'Courier, monospace' : 'Arial, sans-serif',
        marginBottom: '1.2mm',
      }}>
        <span style={{ fontWeight: '900', fontSize: textoSize.campo, flexShrink: 0 }}>
          {etiqueta}
        </span>
        <span style={{
          fontWeight: 'bold',
          fontSize: textoSize.campo,
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'normal',
          lineHeight: '1.1',
        }}>
          {valorMostrar}
        </span>
      </div>
    );
  };

  // 📋 ORGANIZAR EN 2 COLUMNAS — misma lógica que VistaPreviaEtiqueta
  const organizarCamposEnColumnas = () => {
    const columnaIzq: React.ReactNode[] = [];
    const columnaDer: React.ReactNode[] = [];

    // FILA 1: marca (izq) + modelo (der)
    if (campos.includes('marca')) {
      columnaIzq.push(
        <div key="marca">{renderCampo('Marca:', datosEjemplo.marca || '—')}</div>
      );
    }
    if (campos.includes('modelo')) {
      columnaDer.push(
        <div key="modelo">{renderCampo('Modelo:', datosEjemplo.modelo || '—')}</div>
      );
    }

    // FILA 2: gb (izq) + color (der)
    if (campos.includes('gb')) {
      columnaIzq.push(
        <div key="gb">{renderCampo('GB:', datosEjemplo.gb ? `${datosEjemplo.gb} GB` : '—')}</div>
      );
    }
    if (campos.includes('color')) {
      columnaDer.push(
        <div key="color">{renderCampo('Color:', datosEjemplo.color || '—')}</div>
      );
    }

    // FILA 3: estado (izq) + bateria (der)
    if (campos.includes('estado')) {
      columnaIzq.push(
        <div key="estado">{renderCampo('Estado:', datosEjemplo.estado === 'usado' ? 'USADO' : 'NUEVO')}</div>
      );
    }
    if (campos.includes('bateria')) {
      columnaDer.push(
        <div key="bateria">{renderCampo('Batería:', datosEjemplo.bateria ? `${datosEjemplo.bateria}%` : '—')}</div>
      );
    }

    // FILA 4: imei (izq) + fechaIngreso (der)
    if (campos.includes('imei')) {
      columnaIzq.push(
        <div key="imei">{renderCampo('IMEI:', datosEjemplo.imei ? datosEjemplo.imei.substring(0, 15) : '—', { mono: true })}</div>
      );
    }
    if (campos.includes('fechaIngreso')) {
      columnaDer.push(
        <div key="fechaIngreso">{renderCampo('Ingreso:', datosEjemplo.fechaIngreso || '—')}</div>
      );
    }

    // FILA 5: precioVenta ocupa ambas columnas (izq)
    if (campos.includes('precioVenta')) {
      columnaIzq.push(
        <div key="precioVenta">{renderCampo('Precio:', datosEjemplo.precioVenta ? `$${formatearPrecio(datosEjemplo.precioVenta)}` : '—', { color: '#006400' })}</div>
      );
    }

    return { columnaIzq, columnaDer };
  };

  const { columnaIzq, columnaDer } = organizarCamposEnColumnas();

  return (
    <div style={{
      width: dimensiones.width,
      height: dimensiones.height,
      backgroundColor: 'white',
      border: configuracion.mostrarBorde ? '2px solid black' : 'none',
      padding: '1mm',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>

      {/* 🏢 HEADER — nombre del negocio, igual que VistaPreviaEtiqueta */}
      {nombreNegocio && (
        <div style={{
          textAlign: 'center',
          marginBottom: '1mm',
          paddingBottom: '0.5mm',
          borderBottom: '2px solid black',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: textoSize.campo,
            fontWeight: '900',
            color: 'black',
            letterSpacing: '0.3px',
          }}>
            {nombreNegocio}
          </div>
        </div>
      )}

      {/* 📋 CONTENIDO EN 2 COLUMNAS */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        gap: '2mm',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* COLUMNA IZQUIERDA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {columnaIzq}
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {columnaDer}
        </div>
      </div>

      {/* GARANTÍA (opcional) */}
      {configuracion.mostrarGarantia && (
        <div style={{
          fontSize: textoSize.pie,
          fontWeight: 'bold',
          color: '#444',
          textAlign: 'center',
          borderTop: '1px solid #ccc',
          paddingTop: '0.3mm',
          marginTop: '0.5mm',
          flexShrink: 0,
        }}>
          GARANTÍA: 30 DÍAS
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
        flexShrink: 0,
      }}>
        GestiOne
      </div>
    </div>
  );
}