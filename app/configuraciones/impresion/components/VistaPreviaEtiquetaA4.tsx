"use client";

interface CampoEtiquetaA4 {
  id: string;
  nombre: string;
  obligatorio: boolean;
}

interface ConfiguracionEtiquetaA4 {
  tamañoEtiqueta: string;
  etiquetasPorFila: number;
  etiquetasPorColumna: number;
  separacionHorizontal: number;
  separacionVertical: number;
  margenSuperior: number;
  margenIzquierdo: number;
  orientacionEtiqueta: string;
  tamañoTexto: string;
  mostrarBorde: boolean;
  fondoOrden: boolean;
  incluirCodigoBarras: boolean;
}

interface Props {
  camposSeleccionados: string[];
  configuracion: ConfiguracionEtiquetaA4;
  camposDisponibles: CampoEtiquetaA4[];
}

const datosEjemplo = [
  {
    cliente: 'Juan Pérez',
    numeroOrden: 'GT-001',
    modelo: 'iPhone 14',
    marca: 'Apple',
    clave: '1234',
    trabajo: 'Pantalla',
    fecha: '15/08',
    tecnico: 'Carlos',
    observaciones: 'Urgente',
    imei: '123456789',
    estado: 'En proceso',
    prioridad: 'Alta'
  },
  {
    cliente: 'María García',
    numeroOrden: 'GT-002',
    modelo: 'Galaxy S23',
    marca: 'Samsung',
    clave: '5678',
    trabajo: 'Batería',
    fecha: '16/08',
    tecnico: 'Ana',
    observaciones: 'Garantía',
    imei: '987654321',
    estado: 'Completado',
    prioridad: 'Media'
  },
  {
    cliente: 'Carlos López',
    numeroOrden: 'GT-003',
    modelo: 'Redmi Note 12',
    marca: 'Xiaomi',
    clave: '9999',
    trabajo: 'Software',
    fecha: '17/08',
    tecnico: 'Luis',
    observaciones: 'Reset',
    imei: '456789123',
    estado: 'Pendiente',
    prioridad: 'Baja'
  }
];

export default function VistaPreviaEtiquetaA4({ camposSeleccionados, configuracion, camposDisponibles }: Props) {
  
  const obtenerDimensiones = () => {
    const presets = {
      '62x29': { ancho: 62, alto: 29 },
      '38x90': { ancho: 38, alto: 90 },
      '52x29': { ancho: 52, alto: 29 }
    };
    return presets[configuracion.tamañoEtiqueta as keyof typeof presets] || presets['62x29'];
  };

  const obtenerTamañoTexto = () => {
    const tamaños = {
      'muy-pequeño': '8px',
      'pequeño': '10px',
      'mediano': '12px'
    };
    return tamaños[configuracion.tamañoTexto as keyof typeof tamaños] || '10px';
  };

  const truncarTexto = (texto: string, maxLength: number) => {
    return texto.length > maxLength ? texto.substring(0, maxLength) + '...' : texto;
  };

  const renderizarEtiqueta = (datos: any, index: number) => {
    const dimensiones = obtenerDimensiones();
    const fontSize = obtenerTamañoTexto();
    const maxLength = camposSeleccionados.length > 6 ? 6 : 10;
    
    // Escala para vista previa (más grande)
    const escala = 1.5;
    const anchoPixels = dimensiones.ancho * 0.8 * escala;
    const altoPixels = dimensiones.alto * 0.8 * escala;
    
    const esVertical = configuracion.orientacionEtiqueta === 'vertical';

    return (
      <div
        key={index}
        style={{
          width: `${esVertical ? altoPixels : anchoPixels}px`,
          height: `${esVertical ? anchoPixels : altoPixels}px`,
          border: configuracion.mostrarBorde ? '1px solid #000' : '1px solid #e5e7eb',
          backgroundColor: '#fff',
          padding: '4px',
          display: 'flex',
          flexDirection: esVertical ? 'column' : 'row',
          fontSize: fontSize,
          fontFamily: 'Arial, sans-serif',
          boxSizing: 'border-box',
          overflow: 'hidden',
          color: '#000'
        }}
      >
        {/* Código de barras arriba (si está habilitado) */}
        {configuracion.incluirCodigoBarras && (
          <div style={{
            backgroundColor: '#000',
            color: '#fff',
            height: '12px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2px',
            fontSize: '6px'
          }}>
            ||||| |||| |||||
          </div>
        )}

        {/* Contenido principal */}
        <div style={{
          flex: '1',
          display: 'flex',
          flexDirection: esVertical ? 'column' : 'row',
          gap: '2px'
        }}>
          
          {/* Campos principales */}
          <div style={{
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            gap: '1px'
          }}>
            {camposSeleccionados.slice(0, esVertical ? undefined : Math.ceil(camposSeleccionados.length / 2)).map(campoId => {
              const valor = datos[campoId] || 'N/A';
              const esOrden = campoId === 'numeroOrden';
              
              if (esOrden && configuracion.fondoOrden) {
                return (
                  <div key={campoId} style={{
                    backgroundColor: '#000',
                    color: '#fff',
                    padding: '2px 4px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: parseInt(fontSize) + 1 + 'px'
                  }}>
                    {truncarTexto(valor, maxLength)}
                  </div>
                );
              }
              
              return (
                <div key={campoId} style={{
                  fontWeight: esOrden ? 'bold' : 'normal',
                  lineHeight: '1.1',
                  color: '#000'
                }}>
                  {truncarTexto(valor, maxLength)}
                </div>
              );
            })}
          </div>

          {/* Campos secundarios (solo para horizontal) */}
          {!esVertical && camposSeleccionados.length > 2 && (
            <div style={{
              flex: '1',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              paddingLeft: '4px'
            }}>
              {camposSeleccionados.slice(Math.ceil(camposSeleccionados.length / 2)).map(campoId => {
                const valor = datos[campoId] || 'N/A';
                
                return (
                  <div key={campoId} style={{
                    textAlign: 'right',
                    lineHeight: '1.1',
                    color: '#000'
                  }}>
                    {truncarTexto(valor, maxLength)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalEtiquetas = configuracion.etiquetasPorFila * configuracion.etiquetasPorColumna;
  const etiquetasParaMostrar = Math.min(totalEtiquetas, 9); // Mostrar máximo 9

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Vista previa de las etiquetas */}
      <div style={{
        backgroundColor: '#fff',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '16px',
        margin: '0 auto',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        maxWidth: '100%',
        overflow: 'hidden'
      }}>
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(configuracion.etiquetasPorFila, 3)}, 1fr)`,
            gap: `${configuracion.separacionVertical * 0.5}px ${configuracion.separacionHorizontal * 0.5}px`,
            paddingTop: `${configuracion.margenSuperior * 0.3}px`,
            paddingLeft: `${configuracion.margenIzquierdo * 0.3}px`,
          }}
        >
          {Array.from({ length: etiquetasParaMostrar }, (_, index) => {
            const datoIndex = index % datosEjemplo.length;
            return renderizarEtiqueta(datosEjemplo[datoIndex], index);
          })}
        </div>
        
        {totalEtiquetas > etiquetasParaMostrar && (
          <div style={{
            textAlign: 'center',
            marginTop: '12px',
            fontSize: '12px',
            color: '#000'
          }}>
            ... y {totalEtiquetas - etiquetasParaMostrar} etiquetas más
          </div>
        )}
      </div>

      {/* Información de configuración */}
      <div style={{
        padding: '12px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#000'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <strong>Formato:</strong> A4<br/>
            <strong>Etiquetas:</strong> {totalEtiquetas} por hoja
          </div>
          <div>
            <strong>Tamaño:</strong> {obtenerDimensiones().ancho}×{obtenerDimensiones().alto}mm<br/>
            <strong>Campos:</strong> {camposSeleccionados.length}
          </div>
        </div>
      </div>

      {/* Consejos */}
      <div style={{
        padding: '12px',
        backgroundColor: '#fef3c7',
        borderRadius: '6px',
        border: '1px solid #f59e0b',
        fontSize: '11px',
        color: '#000'
      }}>
        <h5 style={{ 
          fontWeight: '600', 
          color: '#000', 
          margin: '0 0 8px 0' 
        }}>
          ⚠️ Consejos de Impresión:
        </h5>
        <ul style={{ margin: '0', paddingLeft: '16px', color: '#000' }}>
          <li>Usa papel adhesivo compatible con tu impresora</li>
          <li>Verifica que los márgenes coincidan con tu papel</li>
          <li>Haz una prueba en papel normal antes de usar adhesivo</li>
          <li>Ajusta la calidad de impresión a "Alta"</li>
        </ul>
      </div>
    </div>
  );
}