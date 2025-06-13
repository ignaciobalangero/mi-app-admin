"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle, XCircle, Upload, Download } from 'lucide-react';
import BotonImportarStock from "../components/BotonImportarStock";

// Tipos
interface ProductoFirebase {
  codigo?: string;
  categoria?: string;
  modelo?: string;
  cantidad?: number;
  precioUSD?: number;
  preciosPesos?: number;
  precioARS?: number;
  stockMinimo?: number;
  activo?: boolean;
  fechaActualizacion?: Date;
  origenSincronizacion?: string;
}

interface ProductoSheet {
  codigo: string;
  categoria: string;
  modelo: string;
  cantidad: number;
  precioUSD: number;
  precioARS: number;
}

interface EstadoSincronizacion {
  estadoConexion: 'conectado' | 'desconectado' | 'error';
  ultimaActualizacion: Date | null;
  totalFirebase: number;
  totalSheet: number;
  sincronizados: number;
  soloFirebase: number;
  soloSheet: number;
  preciosDesactualizados: number;
  stockBajo: number;
  sinPrecio: number;
}

interface Props {
  negocioID: string;
  sheetID: string;
  nombreHoja: string;
}

export default function DashboardSincronizacion({ negocioID, sheetID, nombreHoja }: Props) {
  // Estados
  const [estado, setEstado] = useState<EstadoSincronizacion>({
    estadoConexion: 'desconectado',
    ultimaActualizacion: null,
    totalFirebase: 0,
    totalSheet: 0,
    sincronizados: 0,
    soloFirebase: 0,
    soloSheet: 0,
    preciosDesactualizados: 0,
    stockBajo: 0,
    sinPrecio: 0
  });

  const [productosFirebase, setProductosFirebase] = useState<ProductoFirebase[]>([]);
  const [productosSheet, setProductosSheet] = useState<ProductoSheet[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [enviandoASheet, setEnviandoASheet] = useState(false);
  const [desplegado, setDesplegado] = useState(false);
  
  // Función para cargar datos de Firebase
  const cargarDatosFirebase = async (): Promise<ProductoFirebase[]> => {
    try {
      console.log('🔄 Cargando datos de Firebase...');
      const snapshot = await getDocs(collection(db, `negocios/${negocioID}/stockExtra`));
      const productos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProductoFirebase[];
      
      console.log(`✅ ${productos.length} modelos cargados de Firebase`);
      setProductosFirebase(productos);
      return productos;
    } catch (error) {
      console.error('❌ Error cargando Firebase:', error);
      throw error;
    }
  };

  // ✅ FUNCIÓN MEJORADA para cargar datos de Google Sheets
  const cargarDatosSheet = async (): Promise<ProductoSheet[]> => {
    try {
      console.log('📊 Cargando datos de Google Sheets...');
      
      if (!sheetID || !nombreHoja) {
        throw new Error('Configuración de Sheet incompleta');
      }

      const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:csv&sheet=${nombreHoja}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }
      
      const csvData = await response.text();
      console.log('📄 CSV recibido, longitud:', csvData.length);
      
      // Parsing mejorado que maneja comas dentro de comillas
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        result.push(current.trim());
        return result;
      };

      const lines = csvData.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        console.log('⚠️ Google Sheet vacío o sin datos suficientes, líneas encontradas:', lines.length);
        setProductosSheet([]);
        return [];
      }

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim().toLowerCase());
      console.log('📋 Headers encontrados:', headers);
      
      const productos: ProductoSheet[] = [];

      // Mapeo flexible de columnas
      const getColumnIndex = (possibleNames: string[]) => {
        for (const name of possibleNames) {
          const index = headers.findIndex(h => h.includes(name.toLowerCase()));
          if (index !== -1) {
            console.log(`✅ Columna '${name}' encontrada en índice ${index}`);
            return index;
          }
        }
        console.warn(`⚠️ No se encontró columna para: ${possibleNames.join(', ')}`);
        return -1;
      };

      const codigoIndex = getColumnIndex(['codigo', 'code', 'id']);
      const categoriaIndex = getColumnIndex(['categoria', 'category', 'tipo']);
      const modeloIndex = getColumnIndex(['modelo', 'nombre', 'name', 'item']);
      const cantidadIndex = getColumnIndex(['cantidad', 'stock', 'qty', 'quantity']);
      const precioUSDIndex = getColumnIndex(['preciousd', 'precio usd', 'usd', 'dolares']);
      const precioARSIndex = getColumnIndex(['precioars', 'precio ars', 'ars', 'pesos']);

      // Verificar que al menos tengamos código
      if (codigoIndex === -1) {
        throw new Error('No se encontró una columna de código válida en el Sheet');
      }

      console.log(`📊 Procesando ${lines.length - 1} filas de datos...`);

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]).map(v => v.replace(/"/g, '').trim());
        
        const codigo = codigoIndex >= 0 ? values[codigoIndex]?.trim() : '';
        
        if (codigo && codigo !== '') {
          // Función para normalizar precios
          const normalizarPrecio = (valor: string): number => {
            if (!valor || valor === '') return 0;
            
            try {
              // Remover prefijos como $, US$, etc.
              let cleanValue = valor.replace(/^\$\s*/, '')
                                   .replace(/^US\$\s*/, '')
                                   .replace(/^\s*\$\s*/, '');
              
              // Manejar formato argentino (1.234,56)
              if (cleanValue.includes(',') && cleanValue.lastIndexOf(',') > cleanValue.lastIndexOf('.')) {
                cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
              } else {
                // Remover comas como separadores de miles
                cleanValue = cleanValue.replace(/,/g, '');
              }
              
              const numero = parseFloat(cleanValue);
              return isNaN(numero) ? 0 : Math.max(0, numero);
            } catch (error) {
              console.warn(`⚠️ Error normalizando precio "${valor}":`, error);
              return 0;
            }
          };

          const productoNuevo = {
            codigo,
            categoria: categoriaIndex >= 0 ? (values[categoriaIndex] || 'Sin categoría') : 'Sin categoría',
            modelo: modeloIndex >= 0 ? (values[modeloIndex] || 'Sin nombre') : 'Sin nombre',
            cantidad: cantidadIndex >= 0 ? Math.max(0, Number(values[cantidadIndex]) || 0) : 0,
            precioUSD: precioUSDIndex >= 0 ? normalizarPrecio(values[precioUSDIndex]) : 0,
            precioARS: precioARSIndex >= 0 ? normalizarPrecio(values[precioARSIndex]) : 0
          };

          productos.push(productoNuevo);
          console.log(`📦 Modelo procesado: ${codigo}`);
        } else {
          console.warn(`⚠️ Fila ${i + 1} sin código válido, saltando`);
        }
      }

      console.log(`✅ ${productos.length} modelos cargados desde Google Sheets`);
      setProductosSheet(productos);
      return productos;
      
    } catch (error: any) {
      console.error('❌ Error cargando Google Sheets:', error);
      setProductosSheet([]);
      throw new Error(`Error cargando Google Sheets: ${error.message}`);
    }
  };

  // ✅ FUNCIÓN CORREGIDA - Enviar productos a Google Sheets usando API local
  const enviarProductosASheet = async () => {
    if (!sheetID || !nombreHoja || productosFirebase.length === 0) {
      setError('No hay modelos para enviar o configuración incompleta');
      return;
    }

    setEnviandoASheet(true);
    try {
      console.log('📤 Enviando modelos a Google Sheets...');
      
      // Convertir productos de Firebase al formato del Sheet
      const productosParaSheet = productosFirebase.map(p => ({
        codigo: p.codigo || '',
        categoria: p.categoria || 'Sin categoría',
        modelo: p.modelo || 'Sin nombre',
        cantidad: p.cantidad || 0,
        precioUSD: p.precioUSD || 0,
        precioARS: p.preciosPesos || p.precioARS || 0
      }));

      // ✅ USAR API LOCAL EN LUGAR DE APPS SCRIPT DIRECTO
      const response = await fetch("/api/actualizar-precios-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sheetID, 
          hoja: nombreHoja, 
          productos: productosParaSheet 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Modelos enviados a Google Sheets:', result);
      setError(null);
      
      // Recargar datos para verificar
      setTimeout(() => {
        refrescarDatos();
      }, 1000);

    } catch (error: any) {
      console.error('❌ Error enviando a Google Sheets:', error);
      setError('Error enviando modelos a Google Sheets: ' + error.message);
    } finally {
      setEnviandoASheet(false);
    }
  };

  // Función para analizar sincronización
  const analizarSincronizacion = (firebase: ProductoFirebase[], sheet: ProductoSheet[]): EstadoSincronizacion => {
    const sincronizados = firebase.filter(pf => 
      sheet.some(ps => ps.codigo.toLowerCase() === pf.codigo?.toLowerCase())
    ).length;

    const soloFirebase = firebase.filter(pf => 
      !sheet.some(ps => ps.codigo.toLowerCase() === pf.codigo?.toLowerCase())
    ).length;

    const soloSheet = sheet.filter(ps => 
      !firebase.some(pf => pf.codigo?.toLowerCase() === ps.codigo.toLowerCase())
    ).length;

    const stockBajo = firebase.filter(p => (p.cantidad || 0) <= (p.stockMinimo || 5)).length;
    const sinPrecio = firebase.filter(p => !p.precioUSD && !p.preciosPesos && !p.precioARS).length;

    let preciosDesactualizados = 0;
    firebase.forEach(pf => {
      const ps = sheet.find(s => s.codigo.toLowerCase() === pf.codigo?.toLowerCase());
      if (ps && pf.precioUSD !== ps.precioUSD) {
        preciosDesactualizados++;
      }
    });

    return {
      estadoConexion: sheet.length > 0 ? 'conectado' : 'desconectado',
      ultimaActualizacion: new Date(),
      totalFirebase: firebase.length,
      totalSheet: sheet.length,
      sincronizados,
      soloFirebase,
      soloSheet,
      preciosDesactualizados,
      stockBajo,
      sinPrecio
    };
  };

  // ✅ FUNCIÓN MEJORADA de sincronización automática
  const sincronizarAutomatico = async () => {
    if (productosSheet.length === 0) {
      console.log('⚠️ No hay modelos en Sheet para sincronizar');
      return;
    }

    setSincronizando(true);
    let exitosos = 0;
    let errores = 0;

    try {
      console.log(`🔄 Iniciando sincronización de ${productosSheet.length} modelos...`);

      for (const producto of productosSheet) {
        try {
          // ✅ Validación exhaustiva de datos
          if (!producto.codigo || producto.codigo.trim() === '') {
            console.warn('⚠️ Modelo sin código válido, saltando:', producto);
            continue;
          }

          const codigoLimpio = producto.codigo.trim();
          console.log(`📦 Procesando modelo: ${codigoLimpio}`);

          const docRef = doc(db, `negocios/${negocioID}/stockExtra`, codigoLimpio);
          
          // ✅ Datos normalizados y validados
          const datosFirebase = {
            codigo: codigoLimpio,
            categoria: String(producto.categoria || nombreHoja).trim(),
            modelo: String(producto.modelo || 'Sin nombre').trim(),
            cantidad: Math.max(0, Math.floor(Number(producto.cantidad) || 0)),
            precioUSD: Math.max(0, Number(producto.precioUSD) || 0),
            preciosPesos: Math.max(0, Number(producto.precioARS) || 0), // Mantener para compatibilidad
            precioARS: Math.max(0, Number(producto.precioARS) || 0), // Agregar también este campo
            stockMinimo: 5,
            negocioID: negocioID,
            hoja: nombreHoja,   
            fechaActualizacion: new Date(),
            origenSincronizacion: 'GoogleSheets',
            activo: true
          };

          // ✅ Guardar con merge: true (crea o actualiza)
          await setDoc(docRef, datosFirebase, { merge: true });
          
          console.log(`✅ Modelo ${codigoLimpio} sincronizado correctamente`);
          exitosos++;

        } catch (error: any) {
          console.error(`❌ Error procesando modelo ${producto.codigo}:`, error);
          errores++;
        }
      }

      setUltimaSincronizacion(new Date());
      console.log(`✅ Sincronización completada: ${exitosos} exitosos, ${errores} errores`);
      
      if (errores > 0) {
        setError(`Sincronización parcial: ${exitosos} exitosos, ${errores} errores`);
      } else {
        setError(null);
      }
      
      // Recargar datos después de sincronizar
      setTimeout(() => {
        refrescarDatos();
      }, 1000);

    } catch (error: any) {
      console.error('❌ Error general en sincronización automática:', error);
      setError('Hubo un problema al sincronizar: ' + error.message);
    } finally {
      setSincronizando(false);
    }
  };

  // Función para refrescar datos
  const refrescarDatos = async () => {
    setCargando(true);
    setError(null);
    
    try {
      console.log('🔄 Refrescando todos los datos...');
      const firebase = await cargarDatosFirebase();
      
      let sheet: ProductoSheet[] = [];
      if (sheetID && nombreHoja) {
        sheet = await cargarDatosSheet();
      }
      
      const estadoAnalizado = analizarSincronizacion(firebase, sheet);
      setEstado(estadoAnalizado);
      
      console.log('✅ Datos refrescados correctamente');
    } catch (error: any) {
      console.error('❌ Error al refrescar:', error);
      setError('No se pudieron actualizar los datos: ' + error.message);
      setEstado(prev => ({ ...prev, estadoConexion: 'error' }));
    } finally {
      setCargando(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      setError(null);
      
      try {
        console.log('🚀 Iniciando carga inicial de datos...');
        console.log('📋 Configuración:', { negocioID, sheetID, nombreHoja });
        
        const firebase = await cargarDatosFirebase();
        
        let sheet: ProductoSheet[] = [];
        if (sheetID && nombreHoja) {
          console.log('📊 Cargando Google Sheets...');
          sheet = await cargarDatosSheet();
          
        // Solo mostrar el estado, NO sincronizar automáticamente
if (sheet.length > 0) {
    console.log('📊 Google Sheet cargado con datos, listo para sincronización manual');
  } else {
    console.log('⚠️ Google Sheet vacío, no hay nada que sincronizar');
  }
        } else {
          console.log('⚠️ No hay configuración de Google Sheets');
        }
        
        const estadoAnalizado = analizarSincronizacion(firebase, sheet);
        setEstado(estadoAnalizado);
        
      } catch (error: any) {
        console.error('❌ Error cargando datos:', error);
        setError('No se pudieron cargar los datos: ' + error.message);
        setEstado(prev => ({ ...prev, estadoConexion: 'error' }));
      } finally {
        setCargando(false);
      }
    };

    if (negocioID) {
      cargarDatos();
    }
  }, [negocioID, sheetID, nombreHoja]);

  return (
    <div className="w-full max-w-7xl mx-auto"> {/* Más ancho - cambié de max-w-6xl a max-w-7xl */}
      {/* Header desplegable */}
      <div 
        className="bg-white rounded-lg shadow-md border border-gray-200 cursor-pointer hover:shadow-lg transition-all duration-200"
        onClick={() => setDesplegado(!desplegado)}
      >
        <div className="p-4 flex items-center justify-between">
          
          {/* Lado izquierdo - Título e información básica */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Sincronización Google Sheets
                </h2>
                <p className="text-sm text-gray-600">
                  {sincronizando ? 'Actualizando modelos...' : 'Gestiona la sincronización bidireccional'}
                </p>
              </div>
            </div>

            {/* Estado de conexión resumido */}
            <div className="hidden md:flex items-center gap-4">
              {estado.estadoConexion === 'conectado' && (
                <>
                  <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700">Conectado</span>
                  </div>
                  
                  {/* Estadísticas rápidas */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-blue-600">{estado.totalFirebase}</div>
                      <div className="text-gray-500 text-xs">Sistema</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-600">{estado.totalSheet}</div>
                      <div className="text-gray-500 text-xs">Sheets</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-orange-600">{estado.stockBajo}</div>
                      <div className="text-gray-500 text-xs">Stock bajo</div>
                    </div>
                  </div>
                </>
              )}

              {estado.estadoConexion === 'desconectado' && (
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Sin configurar</span>
                </div>
              )}

              {estado.estadoConexion === 'error' && (
                <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Error</span>
                </div>
              )}
            </div>
          </div>

          {/* Lado derecho - Botón actualizar y toggle */}
          <div className="flex items-center gap-3">
            {/* Botón de actualización rápida */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Evitar que se dispare el toggle
                refrescarDatos();
              }}
              disabled={cargando || sincronizando}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md hover:shadow-lg"
            >
              {cargando || sincronizando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">
                    {sincronizando ? 'Sincronizando...' : 'Cargando...'}
                  </span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Actualizar</span>
                </>
              )}
            </button>

            {/* Indicador de desplegado */}
            <div className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              {desplegado ? (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido desplegable */}
      {desplegado && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 mt-2 overflow-hidden">
          <div className="p-4 space-y-4">

            {/* Estados de conexión detallados */}
            {estado.estadoConexion === 'desconectado' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-800">
                      📋 Google Sheets vacío o sin configurar
                    </h3>
                    <p className="text-sm text-blue-700">
                      {!sheetID || !nombreHoja 
                        ? 'Configurá tu Google Sheet en la sección de integración'
                        : 'Tu Google Sheet está vacío. Agregá algunos modelos para empezar.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {estado.estadoConexion === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800">
                      ❌ Error de conexión
                    </h3>
                    <p className="text-sm text-red-700">
                      No se pudo conectar con Google Sheets. Verifica tu configuración.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {estado.estadoConexion === 'conectado' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-800">
                        ✅ Sincronización bidireccional activa
                      </h3>
                      <p className="text-sm text-green-700">
                        Los cambios se reflejan automáticamente en ambas direcciones
                      </p>
                    </div>
                  </div>
                  {ultimaSincronizacion && (
                    <div className="text-xs text-green-600">
                      Última actualización: {ultimaSincronizacion.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Estadísticas principales en grid más ancho */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {estado.totalFirebase}
                  </div>
                  <div className="text-sm font-medium text-blue-800">
                    Modelos en tu sistema
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Listos para vender
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {estado.totalSheet}
                  </div>
                  <div className="text-sm font-medium text-green-800">
                    Desde Google Sheets
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Sincronizados automáticamente
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {estado.stockBajo}
                  </div>
                  <div className="text-sm font-medium text-orange-800">
                    Con stock bajo
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    Necesitan reposición
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {estado.sincronizados}
                  </div>
                  <div className="text-sm font-medium text-purple-800">
                    Sincronizados
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    En ambos sistemas
                  </div>
                </div>
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="text-red-600 text-base font-medium mb-2">
                  😟 Ups, algo no salió bien
                </div>
                <div className="text-red-700 mb-3 text-sm">
                  {error}
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Entendido
                </button>
              </div>
            )}

            {/* Resumen detallado de sincronización */}
            {ultimaSincronizacion && (
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  📈 Detalle de última sincronización
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {estado.sincronizados}
                    </div>
                    <div className="text-sm text-gray-600">Sincronizados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {estado.soloFirebase}
                    </div>
                    <div className="text-sm text-gray-600">Solo en sistema</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {estado.soloSheet}
                    </div>
                    <div className="text-sm text-gray-600">Solo en Sheet</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {estado.preciosDesactualizados}
                    </div>
                    <div className="text-sm text-gray-600">Precios diferentes</div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-500">
                  Última actualización: {ultimaSincronizacion.toLocaleString()}
                </div>
              </div>
            )}
 {sheetID && nombreHoja && (
              <div className="-mt-1">
                <BotonImportarStock 
                  sheetID={sheetID} 
                  hoja={nombreHoja} 
                />
              </div>
            )}
            {/* Botones de acción */}
            <div className="flex flex-wrap justify-center gap-3 pt-2 border-t">
           
              <button
                onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${sheetID}/edit`, '_blank')}
                disabled={!sheetID}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
                Abrir Google Sheet
              </button>
              <button
                onClick={() => {
                  const data = {
                    configuracion: { negocioID, sheetID, nombreHoja },
                    estadisticas: estado,
                    ultimaSincronizacion: ultimaSincronizacion?.toISOString()
                  };
                  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                  alert('Información de diagnóstico copiada al portapapeles');
                }}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Copiar diagnóstico
              </button>
            </div>

            {/* Footer informativo */}
            <div className="text-center text-sm text-gray-500 pt-2 border-t">
              <div className="mb-1">
                🔄 Sincronización automática • 📊 Datos en tiempo real • 🔐 Seguro y confiable
              </div>
              <div>
                {estado.estadoConexion === 'conectado' ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Sistema conectado y funcionando
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Sistema en espera
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook exportable para usar la sincronización en otros componentes
export const useSincronizacionBidireccional = (negocioID: string, sheetID: string, nombreHoja: string) => {
  const [isConfigured] = useState(true);

  const sincronizarProducto = async (producto: {
    codigo: string;
    categoria?: string;
    modelo?: string;
    cantidad?: number;
    precioARS?: number;
    precioUSD?: number;
  }): Promise<boolean> => {
    try {
      console.log('🔄 Sincronizando modelo individual:', producto.codigo);
      
      // ✅ USAR API LOCAL EN LUGAR DE APPS SCRIPT DIRECTO
      const response = await fetch("/api/sincronizar-producto", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetID,
          nombreHoja,
          producto
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Modelo sincronizado a Google Sheets:', producto.codigo);
        return true;
      } else {
        console.error('❌ Error sincronizando:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      return false;
    }
  };

  const editarProductoEnFirebase = async (codigo: string, cambios: any): Promise<boolean> => {
    try {
      console.log(`🔧 Editando modelo ${codigo} en Firebase:`, cambios);
      
      if (!codigo || codigo.trim() === '') {
        throw new Error('Código de modelo inválido');
      }
      
      const docRef = doc(db, `negocios/${negocioID}/stockExtra`, codigo.trim());
      
      const datosActualizados = {
        ...cambios,
        fechaActualizacion: new Date(),
        codigo: codigo.trim()
      };
      
      // ✅ setDoc con merge para actualizar campos específicos
      await setDoc(docRef, datosActualizados, { merge: true });
      
      console.log(`✅ Modelo ${codigo} actualizado en Firebase`);
      return true;
      
    } catch (error: any) {
      console.error(`❌ Error editando modelo ${codigo}:`, error);
      return false;
    }
  };

  return {
    sincronizarProducto,
    editarProductoEnFirebase,
    tieneConfiguracion: isConfigured
  };
};