"use client";

interface Props {
  campos: string[];
  configuracion: any;
  datosEjemplo: any;
}

export default function VistaPreviaTicket({ campos, configuracion, datosEjemplo }: Props) {
  const getTextoTamaño = () => {
    switch(configuracion.tamaño) {
      case 'pequeño': return 'text-xs';
      case 'grande': return 'text-sm';
      default: return 'text-xs';
    }
  };

  const formatearPrecio = (precio: number) => {
    if (configuracion.formatoPrecio === 'argentino') {
      return `$${precio.toLocaleString('es-AR')}`;
    }
    return `$${precio}`;
  };

  return (
    <div 
      className={`bg-white border-2 border-gray-400 p-3 font-mono ${getTextoTamaño()} max-w-xs mx-auto`}
      style={{ width: '280px' }}
    >
      
      {/* Encabezado */}
      {configuracion.mostrarLogo && (
        <>
          <div className="text-center font-bold text-sm mb-1 text-black">
            {configuracion.nombreNegocio}
          </div>
          <div className="text-center text-xs mb-2 text-black">
            Sistema de Gestión
          </div>
          <div className="border-t border-dashed border-gray-400 my-2"></div>
        </>
      )}

      {/* Campos dinámicos */}
      <div className="space-y-1">
        {campos.includes('id') && (
          <div className="flex justify-between text-black">
            <span className="font-semibold">ID:</span>
            <span>{datosEjemplo.id}</span>
          </div>
        )}
        
        {campos.includes('cliente') && (
          <div className="flex justify-between text-black">
            <span className="font-semibold">Cliente:</span>
            <span className="text-right">{datosEjemplo.cliente}</span>
          </div>
        )}
        
        {campos.includes('telefono') && (
          <div className="flex justify-between text-black">
            <span className="font-semibold">Teléfono:</span>
            <span>{datosEjemplo.telefono}</span>
          </div>
        )}
        
        {campos.includes('modelo') && (
          <div className="flex justify-between text-black">
            <span className="font-semibold">Modelo:</span>
            <span className="text-right">{datosEjemplo.modelo}</span>
          </div>
        )}
        
        {campos.includes('trabajo') && (
          <div className="flex justify-between text-black">
            <span className="font-semibold">Trabajo:</span>
            <span className="text-right">{datosEjemplo.trabajo}</span>
          </div>
        )}
        
        {campos.includes('tecnico') && (
          <div className="flex justify-between text-black">
            <span className="font-semibold">Técnico:</span>
            <span className="text-right">{datosEjemplo.tecnico}</span>
          </div>
        )}
        
        {campos.includes('fecha') && (
          <div className="flex justify-between text-black">
            <span className="font-semibold text-black">Fecha:</span>
            <span>{datosEjemplo.fecha}</span>
          </div>
        )}
        
        {campos.includes('observaciones') && datosEjemplo.observaciones && (
          <div>
            <span className="font-semibold text-black">Obs:</span>
            <div className="text-xs mt-1 text-black">
              {datosEjemplo.observaciones}
            </div>
          </div>
        )}
      </div>

      {/* Precio (destacado) */}
      {campos.includes('precio') && (
        <>
          <div className="border-t border-dashed border-gray-400 my-2"></div>
          <div className="text-center font-bold text-sm text-black">
            TOTAL: {formatearPrecio(datosEjemplo.precio)}
          </div>
        </>
      )}

      {/* Garantía */}
      {configuracion.incluirGarantia && (
        <>
          <div className="border-t border-dashed border-gray-400 my-2"></div>
          <div className="text-xs text-center text-black">
            {configuracion.textoGarantia}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="border-t border-dashed border-gray-400 my-2"></div>
      <div className="text-center text-xs text-black">
        ¡Gracias por confiar en nosotros!
      </div>
      <div className="text-center text-xs text-black mt-1">
        Powered by GestiOne
      </div>
    </div>
  );
}