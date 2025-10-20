export const ImpresionGestione = {
    // Ticket específico para Zerforce TP85E
    ticketZerforce: (trabajo) => {
      const ticket = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Ticket - ${trabajo.id}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              width: 300px; 
              margin: 0; 
              padding: 8px;
              line-height: 1.3;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .separator { border-top: 1px dashed #000; margin: 5px 0; padding: 2px 0; }
            .header { font-size: 14px; }
            .total { font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="center bold header">GESTIONE</div>
          <div class="center">Sistema de Gestión</div>
          <div class="separator"></div>
          
          <div><strong>ID:</strong> ${trabajo.id}</div>
          <div><strong>Cliente:</strong> ${trabajo.cliente}</div>
          <div><strong>Modelo:</strong> ${trabajo.modelo}</div>
          <div><strong>Trabajo:</strong> ${trabajo.trabajo}</div>
          <div><strong>Fecha:</strong> ${trabajo.fecha}</div>
          
          <div class="separator"></div>
          <div class="center bold total">TOTAL: $${trabajo.precio?.toLocaleString() || '0'}</div>
          <div class="separator"></div>
          
          <div class="center">¡Gracias por confiar en nosotros!</div>
          <div class="center" style="font-size: 10px; margin-top: 10px;">
            Powered by GestiOne
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 2000);
              }, 500);
            }
          </script>
        </body>
        </html>
      `;
      
      const ventana = window.open('', '_blank', 'width=400,height=600');
      if (ventana) {
        ventana.document.write(ticket);
        ventana.document.close();
      } else {
        alert('⚠️ Permitir ventanas emergentes para imprimir');
      }
    },
  
    // Etiqueta específica para Brother QL-800
    etiquetaBrother: (trabajo) => {
      const etiqueta = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Etiqueta - ${trabajo.id}</title>
          <style>
            @page { size: 62mm 29mm; margin: 0; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 2mm;
              width: 58mm;
              height: 25mm;
              border: 2px solid #000;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .id { 
              font-weight: bold; 
              text-align: center; 
              font-size: 12px;
              background: #000;
              color: #fff;
              margin: -2mm -2mm 2mm -2mm;
              padding: 1mm;
            }
            .info { font-size: 8px; line-height: 1.2; }
            .cliente { font-weight: bold; }
            .fecha { font-size: 7px; text-align: right; margin-top: auto; }
          </style>
        </head>
        <body>
          <div class="id">${trabajo.id}</div>
          <div class="info">
            <div class="cliente">${trabajo.cliente}</div>
            <div>${trabajo.modelo}</div>
          </div>
          <div class="fecha">${trabajo.fecha}</div>
          
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 2000);
              }, 500);
            }
          </script>
        </body>
        </html>
      `;
      
      const ventana = window.open('', '_blank', 'width=300,height=200');
      if (ventana) {
        ventana.document.write(etiqueta);
        ventana.document.close();
      } else {
        alert('⚠️ Permitir ventanas emergentes para imprimir');
      }
    },

    // 🔥 TICKET A4 ULTRA COMPACTO - TODO EN UNA PÁGINA
    ticketA4: (trabajo) => {
      const ticketA4 = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Orden de Trabajo - ${trabajo.id}</title>
          <style>
            @page { 
              size: A4; 
              margin: 10mm 15mm 8mm 15mm; 
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 10px; 
              line-height: 1.2;
              color: #000;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            
            /* Header compacto */
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 8px;
              border-bottom: 2px solid #2c3e50;
              padding-bottom: 6px;
            }
            .logo-section {
              flex: 1;
            }
            .logo-placeholder {
              width: 60px;
              height: 40px;
              border: 1px dashed #bdc3c7;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8px;
              color: #7f8c8d;
              margin-bottom: 4px;
              background: #f8f9fa;
            }
            .empresa-info h1 {
              font-size: 16px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 2px;
            }
            .empresa-info p {
              color: #7f8c8d;
              font-size: 9px;
            }
            
            .orden-info {
              text-align: right;
              flex: 1;
            }
            .orden-numero {
              font-size: 14px;
              font-weight: bold;
              color: #e74c3c;
              margin-bottom: 2px;
            }
            .fecha-impresion {
              font-size: 8px;
              color: #7f8c8d;
            }
            .qr-placeholder {
              width: 40px;
              height: 40px;
              border: 1px solid #bdc3c7;
              margin: 4px 0 0 auto;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 7px;
              background: #f8f9fa;
            }
            
            /* Secciones ultra compactas */
            .seccion {
              margin-bottom: 6px;
            }
            .seccion-titulo {
              background: #34495e;
              color: white;
              padding: 3px 6px;
              font-weight: bold;
              font-size: 9px;
            }
            .seccion-contenido {
              border: 1px solid #bdc3c7;
              border-top: none;
            }
            
            /* Grid compacto */
            .datos-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 0;
            }
            .dato-item {
              padding: 3px 6px;
              border-bottom: 1px solid #ecf0f1;
              border-right: 1px solid #ecf0f1;
            }
            .dato-item:nth-child(3n) {
              border-right: none;
            }
            .dato-label {
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 1px;
              font-size: 8px;
            }
            .dato-valor {
              color: #34495e;
              font-size: 9px;
            }
            
            /* Descripción mini */
            .descripcion-compacta {
              padding: 6px;
              background: #f8f9fa;
              font-size: 9px;
            }
            .desc-item {
              margin-bottom: 3px;
            }
            .desc-label {
              font-weight: bold;
              color: #2c3e50;
              display: inline;
            }
            .desc-valor {
              color: #34495e;
              margin-left: 4px;
            }
            
            /* Total compacto */
            .total-section {
              background: #27ae60;
              color: white;
              padding: 6px;
              text-align: center;
              font-size: 12px;
              font-weight: bold;
              margin: 6px 0;
            }
            
            /* Garantía mini */
            .garantia-compacta {
              border: 1px solid #bdc3c7;
              padding: 4px;
              font-size: 7px;
              line-height: 1.3;
              margin: 4px 0;
            }
            
            /* Firmas mini */
            .firmas-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin: 6px 0;
            }
            .firma-box {
              text-align: center;
            }
            .firma-linea {
              border-bottom: 1px solid #2c3e50;
              height: 15px;
              margin-bottom: 3px;
            }
            .firma-texto {
              font-weight: bold;
              color: #2c3e50;
              font-size: 8px;
            }
            
            /* Footer mini */
            .footer {
              margin-top: auto;
              padding-top: 4px;
              border-top: 1px solid #bdc3c7;
              text-align: center;
              font-size: 7px;
              color: #7f8c8d;
            }
            .footer-highlight {
              background: #3498db;
              color: white;
              padding: 3px;
              margin: 2px 0;
              border-radius: 2px;
              font-size: 8px;
            }
          </style>
        </head>
        <body>
          <!-- Header Compacto -->
          <div class="header">
            <div class="logo-section">
              <div class="logo-placeholder">LOGO</div>
              <div class="empresa-info">
                <h1>GESTIONE</h1>
                <p>Sistema de Gestión</p>
              </div>
            </div>
            <div class="orden-info">
              <div class="orden-numero">ORDEN N° ${trabajo.id}</div>
              <div class="fecha-impresion">Fecha: ${new Date().toLocaleDateString('es-AR')}</div>
              <div class="qr-placeholder">QR</div>
            </div>
          </div>
          
          <!-- Datos del Cliente -->
          <div class="seccion">
            <div class="seccion-titulo">DATOS DEL CLIENTE</div>
            <div class="seccion-contenido">
              <div class="datos-grid">
                <div class="dato-item">
                  <div class="dato-label">Cliente:</div>
                  <div class="dato-valor">${trabajo.cliente}</div>
                </div>
                <div class="dato-item">
                  <div class="dato-label">Teléfono:</div>
                  <div class="dato-valor">${trabajo.telefono || 'N/E'}</div>
                </div>
                <div class="dato-item">
                  <div class="dato-label">Email:</div>
                  <div class="dato-valor">${trabajo.email || 'N/E'}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Datos del Equipo -->
          <div class="seccion">
            <div class="seccion-titulo">DATOS DEL EQUIPO</div>
            <div class="seccion-contenido">
              <div class="datos-grid">
                <div class="dato-item">
                  <div class="dato-label">Marca:</div>
                  <div class="dato-valor">${trabajo.marca || 'N/E'}</div>
                </div>
                <div class="dato-item">
                  <div class="dato-label">Modelo:</div>
                  <div class="dato-valor">${trabajo.modelo}</div>
                </div>
                <div class="dato-item">
                  <div class="dato-label">N° Serie:</div>
                  <div class="dato-valor">${trabajo.numeroSerie || 'N/A'}</div>
                </div>
                <div class="dato-item">
                  <div class="dato-label">Ingreso:</div>
                  <div class="dato-valor">${trabajo.fecha}</div>
                </div>
                <div class="dato-item">
                  <div class="dato-label">Entrega:</div>
                  <div class="dato-valor">${trabajo.fechaEntrega || 'A coordinar'}</div>
                </div>
                <div class="dato-item">
                  <div class="dato-label">Técnico:</div>
                  <div class="dato-valor">${trabajo.tecnico || 'No asignado'}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Descripción del Trabajo -->
          <div class="seccion">
            <div class="seccion-titulo">DESCRIPCIÓN DEL TRABAJO</div>
            <div class="seccion-contenido">
              <div class="descripcion-compacta">
                <div class="desc-item">
                  <span class="desc-label">Trabajo:</span>
                  <span class="desc-valor">${trabajo.trabajo}</span>
                </div>
                <div class="desc-item">
                  <span class="desc-label">Diagnóstico:</span>
                  <span class="desc-valor">${trabajo.diagnostico || 'Pendiente'}</span>
                </div>
                <div class="desc-item">
                  <span class="desc-label">Solución:</span>
                  <span class="desc-valor">${trabajo.solucion || 'Pendiente'}</span>
                </div>
                <div class="desc-item">
                  <span class="desc-label">Repuestos:</span>
                  <span class="desc-valor">${trabajo.repuestos || 'No requiere'}</span>
                </div>
                <div class="desc-item">
                  <span class="desc-label">Observaciones:</span>
                  <span class="desc-valor">${trabajo.observaciones || 'Sin observaciones'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Total -->
          <div class="total-section">
            TOTAL: ${trabajo.precio || '$0'}
            ${trabajo.anticipo ? ` | Anticipo: ${trabajo.anticipo} | Saldo: ${trabajo.saldo || '$0'}` : ''}
          </div>
          
          <!-- Garantía Compacta -->
          <div class="garantia-compacta">
            <strong>GARANTÍA:</strong> 30 días por defectos de mano de obra. No cubre mal uso, golpes o líquidos. 
            <strong>CONDICIONES:</strong> Presentar esta orden para retirar. Plazo máximo 30 días.
          </div>
          
          <!-- Firmas -->
          <div class="firmas-section">
            <div class="firma-box">
              <div class="firma-linea"></div>
              <div class="firma-texto">FIRMA TÉCNICO</div>
            </div>
            <div class="firma-box">
              <div class="firma-linea"></div>
              <div class="firma-texto">FIRMA CLIENTE</div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-highlight">
              <strong>GESTIONE - SIGUE EL ESTADO DE TU REPARACIÓN</strong>
            </div>
            <div>
              Documento generado por Gestio.com - Powered by UniversoCreativo
            </div>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 2000);
              }, 500);
            }
          </script>
        </body>
        </html>
      `;
      
      const ventana = window.open('', '_blank', 'width=800,height=1000');
      if (ventana) {
        ventana.document.write(ticketA4);
        ventana.document.close();
      } else {
        alert('⚠️ Permitir ventanas emergentes para imprimir');
      }
    },

    // 🆕 ETIQUETA TELÉFONO BROTHER - Con código de barras
    etiquetaTelefono: (telefono, configuracion = {}) => {
      // Configuración por defecto
      const config = {
        nombreNegocio: 'GESTIONE',
        incluirCodigoBarras: true,
        tipoCodigoBarras: 'CODE128',
        generarCodigoAuto: true,
        prefijoCodigoBarras: 'TEL',
        campos: ['modelo', 'marca', 'gb', 'precioVenta'],
        colorFondo: '#ffffff',
        colorTexto: '#000000',
        orientacion: 'horizontal',
        mostrarBordes: true,
        ...configuracion
      };

      // Generar código de barras si es automático
      const generarCodigoBarras = () => {
        // Prioridad 1: Usar IMEI si está disponible
        if (telefono.imei) {
          return telefono.imei;
        }
        
        // Prioridad 2: Código manual si existe
        if (telefono.codigoBarras) {
          return telefono.codigoBarras;
        }
        
        // Prioridad 3: Generar automáticamente
        if (config.generarCodigoAuto) {
          const timestamp = Date.now().toString().slice(-6);
          return `${config.prefijoCodigoBarras}${timestamp}`;
        }
        
        // Fallback final
        return '123456789012345';
      };

      const codigoBarras = generarCodigoBarras();

      // Renderizar campos seleccionados con estilo centrado y orden específico
      const renderizarCampos = () => {
        let contenidoHTML = '';
        
        // Título/Empresa
        contenidoHTML += `
          <div style="text-align: center; font-size: 8px; font-weight: bold; margin-bottom: 3mm;">
            ${config.nombreNegocio}
          </div>
        `;
        
        // Modelo + Capacidad en la misma línea
        const modelo = config.campos.includes('modelo') ? (telefono.modelo || 'iPhone TEC') : '';
        const capacidad = config.campos.includes('gb') ? (telefono.gb ? ` ${telefono.gb} GB` : ' 128 GB') : '';
        if (modelo || capacidad) {
          contenidoHTML += `
            <div style="text-align: center; font-size: 11px; font-weight: bold; margin-bottom: 2mm;">
              ${modelo}${capacidad}
            </div>
          `;
        }
        
        // Estado y batería
        if (config.campos.includes('estado') && telefono.estado === 'usado') {
          const bateriaTexto = config.campos.includes('bateria') && telefono.bateria 
            ? ` - BAT: ${telefono.bateria}%` 
            : '';
          contenidoHTML += `
            <div style="text-align: center; font-size: 8px; margin-bottom: 2mm;">
              USADO${bateriaTexto}
            </div>
          `;
        }
        
        // IMEI
        if (config.campos.includes('imei') && telefono.imei) {
          contenidoHTML += `
            <div style="text-align: center; font-size: 6px; font-family: monospace; margin-bottom: 2mm;">
              IMEI: ${telefono.imei}
            </div>
          `;
        }
        
        // Precio
        if (config.campos.includes('precioVenta')) {
          contenidoHTML += `
            <div style="text-align: center; font-size: 10px; font-weight: bold; margin: 2mm 0;">
              ${telefono.precioVenta || '$850.000'}
            </div>
          `;
        }
        
        // Línea separadora + Garantía
        contenidoHTML += `
          <div style="text-align: center; font-size: 6px; border-top: 1px solid #ccc; padding-top: 2mm; margin-top: 3mm;">
            GARANTÍA: 30 DÍAS
          </div>
        `;
        
        return contenidoHTML;
      };

      // Renderizar código de barras
      const renderizarCodigoBarras = () => {
        if (!config.incluirCodigoBarras) return '';

        if (config.tipoCodigoBarras === 'QR') {
          return `
            <div style="text-align: center; margin: 4px 0;">
              <div style="
                width: 30px; 
                height: 30px; 
                border: 1px solid #000; 
                display: inline-flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 6px;
                background: #f0f0f0;
              ">
                QR
              </div>
              <div style="font-size: 6px; font-family: monospace; margin-top: 2px;">
                ${codigoBarras}
              </div>
            </div>
          `;
        }

        // Código de barras tradicional
        const barras = Array.from({ length: 40 }, (_, i) => {
          const altura = Math.random() * 40 + 60;
          const color = i % 2 === 0 ? '#000' : '#fff';
          return `<div style="width: 1px; height: ${altura}%; background: ${color}; display: inline-block;"></div>`;
        }).join('');

        return `
          <div style="text-align: center; margin: 4px 0;">
            <div style="height: 20px; display: flex; align-items: end; justify-content: center;">
              ${barras}
            </div>
            <div style="font-size: 6px; font-family: monospace; margin-top: 2px;">
              ${codigoBarras}
            </div>
          </div>
        `;
      };

      const etiqueta = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Etiqueta Teléfono - ${telefono.modelo}</title>
          <style>
            @page { size: 62mm 29mm; margin: 0; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 2mm;
              width: 58mm;
              height: 25mm;
              border: ${config.mostrarBordes ? '2px solid #000' : 'none'};
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: ${config.colorFondo};
              color: ${config.colorTexto};
            }
            .header { 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              margin-bottom: 3mm;
            }
            .logo { 
              width: 15px; 
              height: 10px; 
              border: 1px dashed #999; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 5px;
              background: #f0f0f0;
            }
            .empresa { 
              font-weight: bold; 
              font-size: 8px; 
              text-align: center; 
            }
            .contenido { 
              flex: 1; 
              text-align: center;
            }
            .codigo-barras {
              text-align: center;
              margin-bottom: 4mm;
            }
          </style>
        </head>
        <body>
          <!-- Código de Barras (si está incluido) - ARRIBA CENTRADO -->
          ${renderizarCodigoBarras()}
          
          <!-- Contenido principal centrado -->
          <div class="contenido">
            ${renderizarCampos()}
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 2000);
              }, 500);
            }
          </script>
        </body>
        </html>
      `;
      
      const ventana = window.open('', '_blank', 'width=300,height=200');
      if (ventana) {
        ventana.document.write(etiqueta);
        ventana.document.close();
      } else {
        alert('⚠️ Permitir ventanas emergentes para imprimir');
      }
    },

    // Etiquetas múltiples para Impresora A4
    etiquetasA4: (trabajos) => {
      const etiquetasHTML = trabajos.map(trabajo => `
        <div class="etiqueta">
          <div class="orden">${trabajo.id}</div>
          <div class="cliente">${trabajo.cliente}</div>
          <div class="modelo">${trabajo.modelo}</div>
          <div class="fecha">${trabajo.fecha}</div>
        </div>
      `).join('');

      const etiquetasA4 = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Etiquetas A4 - ${trabajos.length} etiquetas</title>
          <style>
            @page { size: A4; margin: 15mm 8mm; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
            }
            .grid-etiquetas {
              display: grid;
              grid-template-columns: repeat(3, 62mm);
              grid-template-rows: repeat(9, 29mm);
              gap: 2mm;
            }
            .etiqueta {
              width: 62mm;
              height: 29mm;
              border: 1px solid #000;
              padding: 2mm;
              font-size: 8px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .orden {
              background: #000;
              color: #fff;
              text-align: center;
              font-weight: bold;
              padding: 1mm;
              margin: -2mm -2mm 1mm -2mm;
            }
            .cliente {
              font-weight: bold;
              font-size: 9px;
            }
            .modelo {
              font-size: 7px;
            }
            .fecha {
              font-size: 6px;
              text-align: right;
              margin-top: auto;
            }
          </style>
        </head>
        <body>
          <div class="grid-etiquetas">
            ${etiquetasHTML}
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                setTimeout(() => window.close(), 2000);
              }, 500);
            }
          </script>
        </body>
        </html>
      `;
      
      const ventana = window.open('', '_blank', 'width=800,height=1000');
      if (ventana) {
        ventana.document.write(etiquetasA4);
        ventana.document.close();
      } else {
        alert('⚠️ Permitir ventanas emergentes para imprimir');
      }
    }
  };