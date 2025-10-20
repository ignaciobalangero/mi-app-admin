"use client";

interface Props {
  campos: string[];
  configuracion: any;
  datosEjemplo: any;
}

export default function VistaPreviaEtiqueta({ campos, configuracion, datosEjemplo }: Props) {
  
  // 🎯 DIMENSIONES REALES según el tamaño seleccionado
  const dimensionesReales = {
    '62x29': { width: '62mm', height: '29mm' },
    '38x90': { width: '38mm', height: '90mm' },
    'custom': { width: '50mm', height: '50mm' } // placeholder
  };

  // 🔄 APLICAR ORIENTACIÓN
  const esHorizontal = configuracion.orientacion === 'horizontal';
  const dimBase = dimensionesReales[configuracion.tamaño] || dimensionesReales['62x29'];
  
  const dimensiones = esHorizontal 
    ? { width: dimBase.width, height: dimBase.height }
    : { width: dimBase.height, height: dimBase.width }; // Invertir si es vertical

  // 📏 TAMAÑOS DE TEXTO adaptativos
  const tamañosTexto = {
    'muy-pequeño': { base: '6px', titulo: '7px', subtitulo: '5px' },
    'pequeño': { base: '7px', titulo: '8px', subtitulo: '6px' },
    'mediano': { base: '8px', titulo: '9px', subtitulo: '7px' }
  };

  const textoSize = tamañosTexto[configuracion.tamañoTexto] || tamañosTexto['pequeño'];

  return (
    <div 
      className={`bg-white font-sans flex flex-col justify-between p-1.5 ${
        configuracion.mostrarBorde ? 'border-2 border-black' : 'border border-gray-300'
      }`}
      style={{
        width: dimensiones.width,
        height: dimensiones.height,
        fontSize: textoSize.base,
        lineHeight: '1.2'
      }}
    >
      
      {/* NÚMERO DE ORDEN (destacado) */}
      {campos.includes('numeroOrden') && (
        <div 
          className={`text-center font-bold ${
            configuracion.fondoOrden 
              ? 'bg-black text-white px-1 py-0.5 -mx-1.5 -mt-1.5 mb-1' 
              : 'border-b border-gray-400 pb-0.5 mb-1'
          }`}
          style={{ fontSize: textoSize.titulo }}
        >
          {datosEjemplo.numeroOrden}
        </div>
      )}

      {/* INFORMACIÓN PRINCIPAL */}
      <div className="flex-1 space-y-0.5 overflow-hidden">
        
        {campos.includes('cliente') && (
          <div className="font-bold truncate text-black">
            👤 {datosEjemplo.cliente}
          </div>
        )}
        
        {campos.includes('modelo') && (
          <div className="truncate text-black font-medium">
            📱 {datosEjemplo.modelo}
          </div>
        )}
        
        {campos.includes('trabajo') && (
          <div className="truncate text-black" style={{ fontSize: textoSize.subtitulo }}>
            🔧 {datosEjemplo.trabajo}
          </div>
        )}
        
        {campos.includes('clave') && datosEjemplo.clave && (
          <div className="truncate text-black font-semibold">
            🔑 {datosEjemplo.clave}
          </div>
        )}

        {campos.includes('imei') && datosEjemplo.imei && (
          <div className="truncate text-black" style={{ fontSize: textoSize.subtitulo }}>
            IMEI: {datosEjemplo.imei.substring(0, 15)}...
          </div>
        )}
        
        {campos.includes('obs') && datosEjemplo.obs && (
          <div className="truncate text-black italic" style={{ fontSize: textoSize.subtitulo }}>
            💬 {datosEjemplo.obs}
          </div>
        )}
      </div>

      {/* CÓDIGO DE BARRAS (futuro - espacio reservado) */}
      {configuracion.incluirCodigoBarras && campos.includes('codigoBarras') && (
        <div className="text-center border-t border-gray-300 pt-1 mt-1">
          <div className="text-xs text-black font-mono tracking-wider">
            |||| |||| |||| ||||
          </div>
        </div>
      )}

      {/* PIE DE ETIQUETA (fecha o info adicional) */}
      <div className="text-right text-black mt-auto pt-0.5 border-t border-gray-200" style={{ fontSize: textoSize.subtitulo }}>
        GestiOne
      </div>
    </div>
  );
}