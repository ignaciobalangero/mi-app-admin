"use client";

interface Props {
  campos: string[];
  configuracion: any;
  datosEjemplo: any;
}

export default function VistaPreviaEtiqueta({ campos, configuracion, datosEjemplo }: Props) {
  
  const formatearMoneda = (valor: string | number): string => {
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(numero)) return '0';
    return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

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

  // 🧮 CONTAR SOLO CAMPOS DE CONTENIDO (sin numeroOrden ni codigoBarras)
  const cantidadCampos = campos.filter(c => 
    c !== 'numeroOrden' && c !== 'codigoBarras'
  ).length;

  const tieneCodigoBarras = configuracion.incluirCodigoBarras && campos.includes('codigoBarras');

  // 📏 TAMAÑOS DE TEXTO DINÁMICOS (según cantidad de campos)
  const calcularTamañosTexto = () => {
    const base = configuracion.tamañoTexto || 'mediano';
    
    // Ajuste según cantidad de campos
    if (cantidadCampos <= 4) {
      return {
        'muy-pequeño': { orden: '11px', campo: '9px', pie: '6px', gap: '2px', marginBottom: '1.5mm' },
        'pequeño': { orden: '12px', campo: '10px', pie: '7px', gap: '2px', marginBottom: '1.5mm' },
        'mediano': { orden: '13px', campo: '11px', pie: '7px', gap: '3px', marginBottom: '2mm' }
      };
    } else if (cantidadCampos <= 7) {
      return {
        'muy-pequeño': { orden: '10px', campo: '7.5px', pie: '6px', gap: '1px', marginBottom: '1mm' },
        'pequeño': { orden: '11px', campo: '8.5px', pie: '6px', gap: '1.5px', marginBottom: '1mm' },
        'mediano': { orden: '12px', campo: '9px', pie: '6px', gap: '2px', marginBottom: '1.2mm' }
      };
    } else {
      // 8+ campos: máxima compresión
      return {
        'muy-pequeño': { orden: '9px', campo: '6.5px', pie: '5px', gap: '0.5px', marginBottom: '0.8mm' },
        'pequeño': { orden: '10px', campo: '7px', pie: '5px', gap: '1px', marginBottom: '0.8mm' },
        'mediano': { orden: '11px', campo: '7.5px', pie: '5px', gap: '1px', marginBottom: '1mm' }
      };
    }
  };

  const tamañosTexto = calcularTamañosTexto();
  const baseSize = configuracion.tamañoTexto || 'mediano';
  const textoSize = tamañosTexto[baseSize];

  // 🎨 RENDERIZAR CAMPO - SIEMPRE MUESTRA, NUNCA FILTRA
  const renderCampo = (etiqueta: string, valor: any, opciones?: { mono?: boolean; color?: string }) => {
    // ✅ SIEMPRE renderiza, incluso si valor es null/undefined
    const valorMostrar = valor || '';
    
    return (
      <div style={{
        fontSize: textoSize.campo,
        fontWeight: 'bold',
        color: opciones?.color || 'black',
        lineHeight: '1.2',
        display: 'flex',
        gap: textoSize.gap,
        marginBottom: textoSize.marginBottom,
        fontFamily: opciones?.mono ? 'Courier, monospace' : 'Arial, sans-serif'
      }}>
        <span style={{
          fontWeight: '900',
          minWidth: 'fit-content',
          flexShrink: 0
        }}>
          {etiqueta}
        </span>
        <span style={{
          fontWeight: 'bold',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1
        }}>
          {valorMostrar}
        </span>
      </div>
    );
  };

  // 📏 CALCULAR PADDING DINÁMICO
  const paddingDinamico = cantidadCampos <= 4 ? '1.5mm' : (cantidadCampos <= 7 ? '1mm' : '0.8mm');

  // 🔍 DEBUG
  console.log('🏷️ VistaPreviaEtiqueta DEBUG:', {
    camposRecibidos: campos,
    cantidadCampos,
    datosEjemplo,
    textoSize
  });

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
      
      {/* 📌 CÓDIGO DE ORDEN - COMPACTO */}
      {campos.includes('numeroOrden') && (
        <div style={{
          fontSize: textoSize.orden,
          fontWeight: '900',
          color: 'black',
          textAlign: 'center',
          padding: '0.3mm 0',
          borderBottom: '1.5px solid black',
          marginBottom: '1mm',
          letterSpacing: '0.3px',
          flexShrink: 0
        }}>
          {datosEjemplo.numeroOrden || 'ORD-000'}
        </div>
      )}

      {/* 📋 CAMPOS - RENDERIZADO SIMPLE SIN FILTROS */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0
      }}>
        
        {/* CLIENTE */}
        {campos.includes('cliente') && renderCampo('Cliente:', datosEjemplo.cliente || 'Sin cliente')}
        
        {/* MODELO */}
        {campos.includes('modelo') && renderCampo('Modelo:', datosEjemplo.modelo || 'Sin modelo')}
        
        {/* TIPO DE TRABAJO */}
        {campos.includes('trabajo') && renderCampo('Trabajo:', datosEjemplo.trabajo || 'No especificado')}
        
        {/* CLAVE/PASSWORD - SIN FILTRO DE DATOS */}
        {campos.includes('clave') && renderCampo('Clave:', datosEjemplo.clave)}

        {/* IMEI - SIN FILTRO DE DATOS */}
        {campos.includes('imei') && renderCampo('IMEI:', datosEjemplo.imei ? datosEjemplo.imei.substring(0, 15) : '', { mono: true })}
        
        {/* ACCESORIOS - SIN FILTRO DE DATOS */}
        {campos.includes('accesorios') && renderCampo('Acces:', datosEjemplo.accesorios || '')}

        {/* ANTICIPO */}
        {campos.includes('anticipo') && renderCampo('Anticipo:', datosEjemplo.anticipo ? '$' + formatearMoneda(datosEjemplo.anticipo) : '$0', { color: '#006400' })}

        {/* SALDO */}
        {campos.includes('saldo') && renderCampo('Saldo:', datosEjemplo.saldo ? '$' + formatearMoneda(datosEjemplo.saldo) : '$0', { color: '#8B0000' })}
        
        {/* OBSERVACIONES - SIN FILTRO DE DATOS */}
        {campos.includes('obs') && renderCampo('Obs:', datosEjemplo.obs || '')}
      </div>

      {/* 📊 CÓDIGO DE BARRAS */}
      {tieneCodigoBarras && (
        <div style={{
          textAlign: 'center',
          borderTop: '1px solid #ccc',
          paddingTop: '0.3mm',
          marginTop: '0.3mm',
          flexShrink: 0
        }}>
          <div style={{ 
            fontSize: cantidadCampos <= 4 ? '8px' : '6px', 
            fontFamily: 'Courier, monospace',
            fontWeight: 'bold',
            letterSpacing: '1px',
            color: 'black'
          }}>
            |||| |||| |||| ||||
          </div>
        </div>
      )}

      {/* 🏷️ PIE - COMPACTO */}
      <div style={{
        fontSize: textoSize.pie,
        fontWeight: 'bold',
        color: '#666',
        textAlign: 'right',
        borderTop: '1px solid #ddd',
        paddingTop: '0.2mm',
        marginTop: '0.3mm',
        flexShrink: 0
      }}>
        GestiOne
      </div>
    </div>
  );
}