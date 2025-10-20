"use client";

interface Props {
  campos: string[];
  configuracion: any;
  datosEjemplo: any;
}

export default function VistaPreviaEtiquetaTelefono({ campos, configuracion, datosEjemplo }: Props) {
  
  // 🎯 DIMENSIONES REALES según el tamaño seleccionado
  const dimensionesReales = {
    '62x29': { width: '62mm', height: '29mm' },
    '38x90': { width: '38mm', height: '90mm' },
    'custom': { width: '50mm', height: '50mm' }
  };

  // 🔄 APLICAR ORIENTACIÓN
  const esHorizontal = configuracion.orientacion === 'horizontal';
  const dimBase = dimensionesReales[configuracion.tamaño] || dimensionesReales['62x29'];
  
  const dimensiones = esHorizontal 
    ? { width: dimBase.width, height: dimBase.height }
    : { width: dimBase.height, height: dimBase.width };

  // 📏 TAMAÑOS DE TEXTO adaptativos
  const tamañosTexto = {
    'muy-pequeño': { base: '6px', titulo: '7px', precio: '8px', subtitulo: '5px' },
    'pequeño': { base: '7px', titulo: '8px', precio: '9px', subtitulo: '6px' },
    'mediano': { base: '8px', titulo: '9px', precio: '10px', subtitulo: '7px' }
  };

  const textoSize = tamañosTexto[configuracion.tamañoTexto] || tamañosTexto['pequeño'];

  // 🔢 Generar código de barras usando IMEI
  const generarCodigoBarras = () => {
    return datosEjemplo.imei || datosEjemplo.codigoBarras || '358240051111110';
  };

  // 📊 Renderizar código de barras
  const renderizarCodigoBarras = () => {
    if (!configuracion.incluirCodigoBarras) return null;
    
    const codigo = generarCodigoBarras();

    if (configuracion.tipoCodigoBarras === 'QR') {
      return (
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '2mm',
          padding: '1mm 0'
        }}>
          <div style={{
            width: '15mm',
            height: '15mm',
            border: '1px solid #000',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '5px',
            backgroundColor: '#f0f0f0',
            color: '#000'
          }}>
            QR
          </div>
        </div>
      );
    }

    // Código de barras tradicional (simulación visual)
    const barras = Array.from({ length: 40 }, (_, i) => (
      <div
        key={i}
        style={{
          width: '0.5mm',
          height: i % 2 === 0 ? '8mm' : '6mm',
          backgroundColor: i % 3 === 0 ? '#000' : (i % 2 === 0 ? '#000' : '#fff'),
          display: 'inline-block'
        }}
      />
    ));

    return (
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '1mm',
        padding: '1mm 0'
      }}>
        <div style={{
          height: '8mm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '0.5mm'
        }}>
          {barras}
        </div>
        <div style={{
          fontSize: textoSize.subtitulo,
          fontFamily: 'monospace',
          color: '#000',
          letterSpacing: '0.3px'
        }}>
          {codigo}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`bg-white font-sans flex flex-col justify-between p-1.5 ${
        configuracion.mostrarBordes ? 'border-2 border-black' : 'border border-gray-300'
      }`}
      style={{
        width: dimensiones.width,
        height: dimensiones.height,
        fontSize: textoSize.base,
        lineHeight: '1.2',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}
    >
      
      {/* CÓDIGO DE BARRAS (arriba si está incluido) */}
      {configuracion.incluirCodigoBarras && renderizarCodigoBarras()}

      {/* INFORMACIÓN PRINCIPAL - CENTRADA */}
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-0.5">
        
        {/* Nombre del negocio */}
        <div 
          className="font-bold text-black"
          style={{ fontSize: textoSize.titulo, marginBottom: '1mm' }}
        >
          {configuracion.nombreNegocio || 'GESTIONE'}
        </div>

        {/* Marca (si está seleccionada) */}
        {campos.includes('marca') && (
          <div 
            className="font-semibold text-black"
            style={{ fontSize: textoSize.base }}
          >
            {datosEjemplo.marca}
          </div>
        )}

        {/* Modelo + Capacidad en la misma línea */}
        <div 
          className="font-bold text-black"
          style={{ fontSize: textoSize.titulo }}
        >
          {campos.includes('modelo') && datosEjemplo.modelo}
          {campos.includes('gb') && datosEjemplo.gb && ` ${datosEjemplo.gb}GB`}
        </div>

        {/* Color */}
        {campos.includes('color') && datosEjemplo.color && (
          <div 
            className="text-black"
            style={{ fontSize: textoSize.subtitulo }}
          >
            {datosEjemplo.color}
          </div>
        )}

        {/* Estado + Batería */}
        {campos.includes('estado') && (
          <div 
            className="text-black"
            style={{ fontSize: textoSize.base }}
          >
            {datosEjemplo.estado === 'usado' ? 'USADO' : 'NUEVO'}
            {campos.includes('bateria') && datosEjemplo.bateria && (
              <span> - BAT: {datosEjemplo.bateria}%</span>
            )}
          </div>
        )}

        {/* IMEI visible (si está seleccionado y NO está en código de barras) */}
        {campos.includes('imei') && datosEjemplo.imei && !configuracion.incluirCodigoBarras && (
          <div 
            className="text-black font-mono"
            style={{ fontSize: textoSize.subtitulo }}
          >
            IMEI: {datosEjemplo.imei}
          </div>
        )}

        {/* Fecha de ingreso */}
        {campos.includes('fechaIngreso') && datosEjemplo.fechaIngreso && (
          <div 
            className="text-black"
            style={{ fontSize: textoSize.subtitulo }}
          >
            {datosEjemplo.fechaIngreso}
          </div>
        )}

        {/* PRECIO DE VENTA - DESTACADO */}
        {campos.includes('precioVenta') && (
          <div 
            className="font-bold text-black"
            style={{ 
              fontSize: textoSize.precio, 
              marginTop: '1mm',
              padding: '0.5mm 2mm',
              borderTop: '1px solid #000',
              borderBottom: '1px solid #000'
            }}
          >
            {datosEjemplo.precioVenta}
          </div>
        )}
      </div>

      {/* GARANTÍA (al final si está activada) */}
      {configuracion.mostrarGarantia && (
        <div 
          className="text-center text-black border-t border-gray-300 pt-0.5 mt-1"
          style={{ fontSize: textoSize.subtitulo }}
        >
          GARANTÍA: 30 DÍAS
        </div>
      )}
    </div>
  );
}