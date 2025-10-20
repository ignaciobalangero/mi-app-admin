"use client";

interface Props {
  camposSeleccionados: string[];
  configuracion: any;
  datosEjemplo: any;
}

export default function VistaPreviaTicketA4({ camposSeleccionados, configuracion, datosEjemplo }: Props) {
  
  const campos = camposSeleccionados;
  const esMediaHoja = configuracion.tamañoHoja === 'media-hoja';
  
  // 📏 DIMENSIONES - SIEMPRE VERTICAL
  const dimensiones = {
    'media-hoja': {
      width: '148mm',
      height: '210mm'
    },
    'hoja-completa': {
      width: '210mm',
      height: '297mm'
    }
  };

  const dim = dimensiones[configuracion.tamañoHoja as keyof typeof dimensiones] || dimensiones['hoja-completa'];

  // 📐 ESPACIADO MUY REDUCIDO para evitar cortes
  const espaciadosMediaHoja = {
    'compacto': { 
      padding: '3mm',
      gap: '1.5mm',
      fontSize: '7.5px',
      titleSize: '9px',
      headerPadding: '3mm',
      sectionPadding: '2.5mm',
      logoSize: '24px',
      headerTitle: '10px',
      headerSubtitle: '7px'
    },
    'normal': { 
      padding: '4mm',
      gap: '2mm',
      fontSize: '8px',
      titleSize: '9.5px',
      headerPadding: '4mm',
      sectionPadding: '3mm',
      logoSize: '26px',
      headerTitle: '11px',
      headerSubtitle: '7.5px'
    },
    'espacioso': { 
      padding: '5mm',
      gap: '2.5mm',
      fontSize: '8.5px',
      titleSize: '10px',
      headerPadding: '5mm',
      sectionPadding: '3.5mm',
      logoSize: '28px',
      headerTitle: '12px',
      headerSubtitle: '8px'
    }
  };

  const espaciadosHojaCompleta = {
    'compacto': { 
      padding: '4mm',
      gap: '2mm',
      fontSize: '8.5px',
      titleSize: '10px',
      headerPadding: '4mm',
      sectionPadding: '3mm',
      logoSize: '30px',
      headerTitle: '12px',
      headerSubtitle: '7.5px'
    },
    'normal': { 
      padding: '5mm',
      gap: '2.5mm',
      fontSize: '9px',
      titleSize: '10.5px',
      headerPadding: '5mm',
      sectionPadding: '3.5mm',
      logoSize: '32px',
      headerTitle: '13px',
      headerSubtitle: '8px'
    },
    'espacioso': { 
      padding: '6mm',
      gap: '3mm',
      fontSize: '9.5px',
      titleSize: '11px',
      headerPadding: '6mm',
      sectionPadding: '4mm',
      logoSize: '34px',
      headerTitle: '14px',
      headerSubtitle: '8.5px'
    }
  };

  const espaciadosSet = esMediaHoja ? espaciadosMediaHoja : espaciadosHojaCompleta;
  const esp = espaciadosSet[configuracion.espaciado as keyof typeof espaciadosSet] || espaciadosSet['normal'];

  // 🎨 Renderizar un ticket individual
  const renderTicket = (esCopia: boolean = false) => (
    <div style={{
      boxSizing: 'border-box',
      width: dim.width,
      minHeight: dim.height,
      maxWidth: dim.width,
      backgroundColor: '#fff',
      padding: esp.padding,
      fontFamily: 'Arial, sans-serif',
      fontSize: esp.fontSize,
      color: '#000',
      position: 'relative',
      overflow: 'hidden',
      margin: '0 auto',
      border: 'none'
    }}>

      {/* MARCA DE AGUA si es copia */}
      {esCopia && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-45deg)',
          fontSize: esMediaHoja ? '36px' : '50px',
          color: 'rgba(0,0,0,0.04)',
          fontWeight: 'bold',
          pointerEvents: 'none',
          zIndex: 0,
          whiteSpace: 'nowrap'
        }}>
          COPIA
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        {/* ENCABEZADO */}
        <div style={{
          backgroundColor: configuracion.colorEncabezado,
          color: '#fff',
          padding: esp.headerPadding,
          marginBottom: esp.gap,
          borderRadius: '3px',
          boxSizing: 'border-box',
          width: '100%',
          overflow: 'hidden'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start', 
            gap: '2mm',
            width: '100%'
          }}>
            <div style={{ flex: '1 1 auto', minWidth: 0, maxWidth: '58%' }}>
              {configuracion.incluirLogo && (
                <div style={{
                  width: esp.logoSize,
                  height: esp.logoSize,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '3px',
                  marginBottom: '2mm',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: `${parseInt(esp.logoSize) / 2}px`
                }}>
                  📱
                </div>
              )}
              <h1 style={{ 
                margin: 0, 
                fontSize: esp.headerTitle,
                fontWeight: 'bold',
                letterSpacing: '0.2px',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {configuracion.nombreNegocio}
              </h1>
              <p style={{ 
                margin: '1mm 0 0 0', 
                fontSize: esp.headerSubtitle, 
                opacity: 0.9,
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {configuracion.telefonoNegocio}
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: esp.headerSubtitle, 
                opacity: 0.9,
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {configuracion.direccionNegocio}
              </p>
            </div>
            <div style={{ 
              textAlign: 'right', 
              flex: '0 0 auto',
              maxWidth: '38%',
              minWidth: 0
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: esp.headerTitle,
                fontWeight: 'bold',
                letterSpacing: '0.2px',
                lineHeight: '1.2',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {configuracion.textoEncabezado}
              </h2>
              {campos.includes('id') && (
                <p style={{ 
                  margin: '2mm 0 0 0', 
                  fontSize: esp.fontSize,
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  padding: '1mm 2mm',
                  borderRadius: '2px',
                  display: 'inline-block',
                  lineHeight: '1.2',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}>
                  {datosEjemplo.id}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* DATOS DEL CLIENTE */}
        {(campos.includes('cliente') || campos.includes('telefono') || campos.includes('email') || campos.includes('direccion')) && (
          <div style={{
            border: configuracion.mostrarBordes ? '1px solid #ddd' : 'none',
            borderRadius: '3px',
            padding: esp.sectionPadding,
            marginBottom: esp.gap,
            backgroundColor: '#f9fafb',
            boxSizing: 'border-box',
            width: '100%',
            overflow: 'hidden'
          }}>
            <h3 style={{ 
              margin: `0 0 ${esp.gap} 0`, 
              fontSize: esp.titleSize, 
              fontWeight: 'bold',
              color: configuracion.colorEncabezado,
              borderBottom: '1.5px solid ' + configuracion.colorEncabezado,
              paddingBottom: '1mm',
              lineHeight: '1.2'
            }}>
              👤 DATOS DEL CLIENTE
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: esp.gap,
              lineHeight: '1.4',
              width: '100%'
            }}>
              {campos.includes('cliente') && (
                <div style={{ wordBreak: 'break-word', overflow: 'hidden' }}>
                  <strong>Cliente:</strong> {datosEjemplo.cliente}
                </div>
              )}
              {campos.includes('telefono') && (
                <div style={{ wordBreak: 'break-word', overflow: 'hidden' }}>
                  <strong>Teléfono:</strong> {datosEjemplo.telefono}
                </div>
              )}
              {campos.includes('email') && (
                <div style={{ gridColumn: '1 / -1', wordBreak: 'break-all', overflow: 'hidden' }}>
                  <strong>Email:</strong> {datosEjemplo.email}
                </div>
              )}
              {campos.includes('direccion') && (
                <div style={{ gridColumn: '1 / -1', wordBreak: 'break-word', overflow: 'hidden' }}>
                  <strong>Dirección:</strong> {datosEjemplo.direccion}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DATOS DEL EQUIPO */}
        {(campos.includes('modelo') || campos.includes('marca') || campos.includes('numeroSerie') || 
          campos.includes('estadoIngreso') || campos.includes('accesorios') || campos.includes('bateria') || campos.includes('bloqueo')) && (
          <div style={{
            border: configuracion.mostrarBordes ? '1px solid #ddd' : 'none',
            borderRadius: '3px',
            padding: esp.sectionPadding,
            marginBottom: esp.gap,
            backgroundColor: '#f9fafb',
            boxSizing: 'border-box',
            width: '100%',
            overflow: 'hidden'
          }}>
            <h3 style={{ 
              margin: `0 0 ${esp.gap} 0`, 
              fontSize: esp.titleSize, 
              fontWeight: 'bold',
              color: configuracion.colorEncabezado,
              borderBottom: '1.5px solid ' + configuracion.colorEncabezado,
              paddingBottom: '1mm',
              lineHeight: '1.2'
            }}>
              📱 DATOS DEL EQUIPO
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: esp.gap,
              lineHeight: '1.4',
              width: '100%'
            }}>
              {campos.includes('marca') && (
                <div style={{ wordBreak: 'break-word', overflow: 'hidden' }}><strong>Marca:</strong> {datosEjemplo.marca}</div>
              )}
              {campos.includes('modelo') && (
                <div style={{ wordBreak: 'break-word', overflow: 'hidden' }}><strong>Modelo:</strong> {datosEjemplo.modelo}</div>
              )}
              {campos.includes('numeroSerie') && (
                <div style={{ gridColumn: '1 / -1', wordBreak: 'break-all', overflow: 'hidden' }}>
                  <strong>N° Serie/IMEI:</strong> {datosEjemplo.numeroSerie}
                </div>
              )}
              {campos.includes('bateria') && (
                <div style={{ overflow: 'hidden' }}><strong>Batería:</strong> {datosEjemplo.bateria}</div>
              )}
              {campos.includes('bloqueo') && (
                <div style={{ wordBreak: 'break-word', overflow: 'hidden' }}><strong>Bloqueo:</strong> {datosEjemplo.bloqueo}</div>
              )}
              {campos.includes('estadoIngreso') && (
                <div style={{ gridColumn: '1 / -1', wordBreak: 'break-word', overflow: 'hidden' }}>
                  <strong>Estado:</strong> {datosEjemplo.estadoIngreso}
                </div>
              )}
              {campos.includes('accesorios') && (
                <div style={{ gridColumn: '1 / -1', wordBreak: 'break-word', overflow: 'hidden' }}>
                  <strong>Accesorios:</strong> {datosEjemplo.accesorios}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRABAJO REALIZADO */}
        {(campos.includes('trabajo') || campos.includes('diagnostico') || campos.includes('solucion') || 
          campos.includes('repuestos') || campos.includes('tecnico')) && (
          <div style={{
            border: configuracion.mostrarBordes ? '1px solid #ddd' : 'none',
            borderRadius: '3px',
            padding: esp.sectionPadding,
            marginBottom: esp.gap,
            backgroundColor: '#f9fafb',
            boxSizing: 'border-box',
            width: '100%',
            overflow: 'hidden'
          }}>
            <h3 style={{ 
              margin: `0 0 ${esp.gap} 0`, 
              fontSize: esp.titleSize, 
              fontWeight: 'bold',
              color: configuracion.colorEncabezado,
              borderBottom: '1.5px solid ' + configuracion.colorEncabezado,
              paddingBottom: '1mm',
              lineHeight: '1.2'
            }}>
              🔧 TRABAJO REALIZADO
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr', 
              gap: esp.gap,
              lineHeight: '1.4',
              width: '100%'
            }}>
              {campos.includes('trabajo') && (
                <div style={{ wordBreak: 'break-word', overflow: 'hidden' }}><strong>Tipo:</strong> {datosEjemplo.trabajo}</div>
              )}
              {campos.includes('diagnostico') && (
                <div style={{ wordBreak: 'break-word', overflow: 'hidden' }}><strong>Diagnóstico:</strong> {datosEjemplo.diagnostico}</div>
              )}
              {campos.includes('solucion') && (
                <div style={{ wordBreak: 'break-word', overflow: 'hidden' }}><strong>Solución:</strong> {datosEjemplo.solucion}</div>
              )}
              {campos.includes('repuestos') && (
                <div style={{ wordBreak: 'break-word', overflow: 'hidden' }}><strong>Repuestos:</strong> {datosEjemplo.repuestos}</div>
              )}
              {campos.includes('tecnico') && (
                <div style={{ overflow: 'hidden' }}><strong>Técnico:</strong> {datosEjemplo.tecnico}</div>
              )}
            </div>
          </div>
        )}

        {/* INFORMACIÓN DE PAGO */}
        {(campos.includes('precio') || campos.includes('anticipo') || campos.includes('saldo') || campos.includes('metodoPago')) && (
          <div style={{
            border: configuracion.mostrarBordes ? '2px solid ' + configuracion.colorEncabezado : 'none',
            borderRadius: '3px',
            padding: esp.sectionPadding,
            marginBottom: esp.gap,
            backgroundColor: '#fffbeb',
            boxSizing: 'border-box',
            width: '100%',
            overflow: 'hidden'
          }}>
            <h3 style={{ 
              margin: `0 0 ${esp.gap} 0`, 
              fontSize: esp.titleSize, 
              fontWeight: 'bold',
              color: configuracion.colorEncabezado,
              borderBottom: '1.5px solid ' + configuracion.colorEncabezado,
              paddingBottom: '1mm',
              lineHeight: '1.2'
            }}>
              💰 PAGO
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: esp.gap,
              lineHeight: '1.4',
              width: '100%'
            }}>
              {campos.includes('precio') && (
                <div style={{ fontSize: `${parseInt(esp.fontSize) + 0.5}px`, overflow: 'hidden' }}>
                  <strong>TOTAL:</strong> <span style={{ fontSize: `${parseInt(esp.fontSize) + 2}px`, fontWeight: 'bold' }}>{datosEjemplo.precio}</span>
                </div>
              )}
              {campos.includes('anticipo') && (
                <div style={{ fontSize: `${parseInt(esp.fontSize) + 0.5}px`, overflow: 'hidden' }}>
                  <strong>Anticipo:</strong> {datosEjemplo.anticipo}
                </div>
              )}
              {campos.includes('saldo') && (
                <div style={{ fontSize: `${parseInt(esp.fontSize) + 0.5}px`, color: '#dc2626', overflow: 'hidden' }}>
                  <strong>SALDO:</strong> <span style={{ fontSize: `${parseInt(esp.fontSize) + 2}px`, fontWeight: 'bold' }}>{datosEjemplo.saldo}</span>
                </div>
              )}
              {campos.includes('metodoPago') && (
                <div style={{ wordBreak: 'break-word', overflow: 'hidden' }}><strong>Método:</strong> {datosEjemplo.metodoPago}</div>
              )}
            </div>
          </div>
        )}

        {/* FECHAS */}
        {(campos.includes('fecha') || campos.includes('fechaEntrega')) && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: esp.gap, 
            fontSize: `${parseInt(esp.fontSize) - 0.5}px`,
            flexWrap: 'wrap',
            gap: '2mm',
            lineHeight: '1.4',
            width: '100%'
          }}>
            {campos.includes('fecha') && (
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>Ingreso:</strong> {datosEjemplo.fecha}</div>
            )}
            {campos.includes('fechaEntrega') && (
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>Entrega:</strong> {datosEjemplo.fechaEntrega}</div>
            )}
          </div>
        )}

        {/* OBSERVACIONES */}
        {campos.includes('observaciones') && datosEjemplo.observaciones && (
          <div style={{
            border: '1px dashed #999',
            borderRadius: '3px',
            padding: esp.sectionPadding,
            marginBottom: esp.gap,
            backgroundColor: '#fef3c7',
            wordBreak: 'break-word',
            lineHeight: '1.4',
            overflow: 'hidden',
            width: '100%'
          }}>
            <strong>⚠️ Obs:</strong> {datosEjemplo.observaciones}
          </div>
        )}

        {/* FIRMAS */}
        {configuracion.incluirFirmas && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: esMediaHoja ? '4mm' : '6mm',
            marginTop: esMediaHoja ? '3mm' : '4mm',
            marginBottom: esp.gap,
            width: '100%'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                borderTop: '1px solid #000',
                marginBottom: '1mm',
                paddingTop: esMediaHoja ? '4mm' : '6mm'
              }}></div>
              <strong style={{ fontSize: `${parseInt(esp.fontSize) - 0.5}px` }}>Firma Cliente</strong>
              <br />
              <span style={{ fontSize: `${parseInt(esp.fontSize) - 1.5}px`, color: '#666' }}>Aclaración</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                borderTop: '1px solid #000',
                marginBottom: '1mm',
                paddingTop: esMediaHoja ? '4mm' : '6mm'
              }}></div>
              <strong style={{ fontSize: `${parseInt(esp.fontSize) - 0.5}px` }}>Firma Técnico</strong>
              <br />
              <span style={{ fontSize: `${parseInt(esp.fontSize) - 1.5}px`, color: '#666' }}>Aclaración</span>
            </div>
          </div>
        )}

        {/* GARANTÍA */}
        {configuracion.incluirGarantia && (
          <div style={{
            backgroundColor: '#f3f4f6',
            padding: esp.sectionPadding,
            borderRadius: '3px',
            fontSize: `${parseInt(esp.fontSize) - 0.5}px`,
            lineHeight: '1.3',
            marginBottom: esp.gap,
            border: '1px solid #d1d5db',
            wordBreak: 'break-word',
            overflow: 'hidden',
            width: '100%'
          }}>
            <strong>📋 GARANTÍA:</strong> {configuracion.textoGarantia}
          </div>
        )}

        {/* PIE DE PÁGINA */}
        {configuracion.incluirPiePagina && (
          <div style={{
            textAlign: 'center',
            fontSize: `${parseInt(esp.fontSize) - 0.5}px`,
            color: '#666',
            paddingTop: '2mm',
            borderTop: '1px solid #ddd',
            wordBreak: 'break-word',
            lineHeight: '1.3',
            overflow: 'hidden',
            width: '100%'
          }}>
            {configuracion.textoPiePagina}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: configuracion.duplicarTicket ? 'column' : 'row',
      gap: 0,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 0,
      padding: 0,
      width: '100%'
    }}>
      {renderTicket(false)}
      {configuracion.duplicarTicket && renderTicket(true)}
    </div>
  );
}