"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, limit, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import Header from "@/app/Header";
import { useRol } from "@/lib/useRol";
import { useSearchParams } from "next/navigation";

interface Gasto {
  id: string;
  monto: number;
  categoria: string;
  descripcion: string;
  fecha: string;
  fechaCompleta: Date;
  usuario: string;
  metodoPago: string;
  tipo: "personal" | "negocio";
}

interface ResumenMes {
  totalMes: number;
  cantidadGastos: number;
  ultimaActualizacion: Date;
}

const CATEGORIAS = [
  { nombre: "Comida", emoji: "🍕", color: "from-orange-500 to-red-500" },
  { nombre: "Transporte", emoji: "🚗", color: "from-blue-500 to-cyan-500" },
  { nombre: "Hogar", emoji: "🏠", color: "from-green-500 to-emerald-500" },
  { nombre: "Salud", emoji: "💊", color: "from-red-500 to-pink-500" },
  { nombre: "Entretenimiento", emoji: "🎮", color: "from-purple-500 to-indigo-500" },
  { nombre: "Servicios", emoji: "💰", color: "from-yellow-500 to-orange-500" },
  { nombre: "Compras", emoji: "🛒", color: "from-pink-500 to-rose-500" },
  { nombre: "Educación", emoji: "📚", color: "from-indigo-500 to-blue-500" },
  { nombre: "Trabajo", emoji: "💼", color: "from-gray-600 to-gray-800" },
  { nombre: "Otros", emoji: "🎁", color: "from-teal-500 to-cyan-500" },
];

const METODOS_PAGO = [
  { id: "efectivo", nombre: "Efectivo", emoji: "💵" },
  { id: "tarjeta", nombre: "Tarjeta", emoji: "💳" },
  { id: "transferencia", nombre: "Transferencia", emoji: "📱" },
  { id: "mercadopago", nombre: "MercadoPago", emoji: "🔵" },
];

export default function GastosPage() {
  const [user] = useAuthState(auth);
  const { rol } = useRol();
  const [negocioID, setNegocioID] = useState("");
  const searchParams = useSearchParams();
  
  // Estados principales
  const [vistaCompleta, setVistaCompleta] = useState(false);
  const [totalMes, setTotalMes] = useState(0);
  const [cantidadGastos, setCantidadGastos] = useState(0);
  const [ultimosGastos, setUltimosGastos] = useState<Gasto[]>([]);
  const [todosGastos, setTodosGastos] = useState<Gasto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoCompleto, setCargandoCompleto] = useState(false);
  const [mesesConGastos, setMesesConGastos] = useState<string[]>([]);
  
  // Estados del formulario
  const [mostrarForm, setMostrarForm] = useState(false);
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [tipo, setTipo] = useState<"personal" | "negocio">("personal");
  const [guardando, setGuardando] = useState(false);
  
  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const mesActual = new Date().toISOString().slice(0, 7);
  const [filtroMes, setFiltroMes] = useState(mesActual);

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);

  // Detectar parámetros de URL (desde Siri)
  useEffect(() => {
    const quick = searchParams.get("quick");
    const montoURL = searchParams.get("monto");
    const categoriaURL = searchParams.get("categoria");
    const descURL = searchParams.get("desc");
    
    if (quick === "true") {
      setMostrarForm(true);
      if (montoURL) setMonto(montoURL);
      if (categoriaURL) setCategoria(categoriaURL);
      if (descURL) setDescripcion(descURL);
    }
  }, [searchParams]);

  // 🔥 CARGAR LISTA DE MESES CON GASTOS (1 sola vez)
  useEffect(() => {
    const cargarMesesDisponibles = async () => {
      if (!negocioID) return;

      try {
        // Leer la colección de resúmenes para saber qué meses tienen datos
        const resumenesRef = collection(db, `negocios/${negocioID}/gastosResumen`);
        const snapshot = await getDocs(resumenesRef);
        
        const meses = snapshot.docs
          .map(doc => doc.id)
          .sort((a, b) => b.localeCompare(a)); // Más reciente primero
        
        setMesesConGastos(meses);
        
        // Si el mes actual no tiene gastos, seleccionar el más reciente
        if (meses.length > 0 && !meses.includes(mesActual)) {
          setFiltroMes(meses[0]);
        }
        
        console.log(`📅 ${meses.length} meses con gastos encontrados`);
      } catch (error) {
        console.error("Error cargando meses:", error);
      }
    };

    cargarMesesDisponibles();
  }, [negocioID]);

  // 🔥 CARGAR RESUMEN DEL MES (solo total + últimos 3)
  useEffect(() => {
    const cargarResumen = async () => {
      if (!negocioID || !filtroMes) return;
      
      setCargando(true);

      try {
        // 1️⃣ Leer el resumen pre-calculado (1 lectura)
        const resumenRef = doc(db, `negocios/${negocioID}/gastosResumen/${filtroMes}`);
        const resumenSnap = await getDoc(resumenRef);
        
        if (resumenSnap.exists()) {
          const resumen = resumenSnap.data() as ResumenMes;
          setTotalMes(resumen.totalMes);
          setCantidadGastos(resumen.cantidadGastos);
          console.log(`✅ Resumen pre-calculado: ${resumen.totalMes} (1 lectura)`);
        } else {
          // Si no existe el resumen, calcularlo ahora
          await recalcularResumenMes(filtroMes);
        }

        // 2️⃣ Obtener solo últimos 3 gastos (3 lecturas)
        const [year, month] = filtroMes.split('-').map(Number);
        const inicioMes = new Date(year, month - 1, 1);
        const finMes = new Date(year, month, 0, 23, 59, 59);

        const ultimosQuery = query(
          collection(db, `negocios/${negocioID}/gastos`),
          where("fechaCompleta", ">=", inicioMes),
          where("fechaCompleta", "<=", finMes),
          orderBy("fechaCompleta", "desc"),
          limit(3)
        );
        
        const ultimosSnapshot = await getDocs(ultimosQuery);
        const ultimos = ultimosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          fechaCompleta: doc.data().fechaCompleta?.toDate()
        })) as Gasto[];
        
        setUltimosGastos(ultimos);
        
        console.log(`📝 ${ultimos.length} gastos recientes cargados (3 lecturas)`);

      } catch (error) {
        console.error("Error cargando resumen:", error);
        alert("Error al cargar el resumen");
      } finally {
        setCargando(false);
      }
    };

    cargarResumen();
    setVistaCompleta(false);
  }, [negocioID, filtroMes]);

  // 🔥 RECALCULAR RESUMEN DE UN MES (solo para corrección excepcional)
  // Normalmente NO se usa - solo para cuando el resumen no existe o está corrupto
  const recalcularResumenMes = async (mes: string) => {
    if (!negocioID) return;

    try {
      const [year, month] = mes.split('-').map(Number);
      const inicioMes = new Date(year, month - 1, 1);
      const finMes = new Date(year, month, 0, 23, 59, 59);

      // Obtener todos los gastos del mes
      const q = query(
        collection(db, `negocios/${negocioID}/gastos`),
        where("fechaCompleta", ">=", inicioMes),
        where("fechaCompleta", "<=", finMes)
      );
      
      const snapshot = await getDocs(q);
      
      // Calcular total
      let total = 0;
      snapshot.docs.forEach(doc => {
        total += doc.data().monto || 0;
      });

      // Guardar resumen
      const resumenRef = doc(db, `negocios/${negocioID}/gastosResumen/${mes}`);
      await setDoc(resumenRef, {
        totalMes: total,
        cantidadGastos: snapshot.size,
        ultimaActualizacion: new Date()
      });

      setTotalMes(total);
      setCantidadGastos(snapshot.size);

      console.log(`💾 Resumen recalculado desde cero para ${mes}: ${total} (${snapshot.size} lecturas)`);
    } catch (error) {
      console.error("Error recalculando resumen:", error);
    }
  };

  // 🔥 CARGA COMPLETA: Solo cuando hace clic en "Ver todos"
  const cargarTodosLosGastos = async () => {
    if (!negocioID || !filtroMes) return;
    
    setCargandoCompleto(true);

    try {
      const [year, month] = filtroMes.split('-').map(Number);
      const inicioMes = new Date(year, month - 1, 1);
      const finMes = new Date(year, month, 0, 23, 59, 59);

      const q = query(
        collection(db, `negocios/${negocioID}/gastos`),
        where("fechaCompleta", ">=", inicioMes),
        where("fechaCompleta", "<=", finMes),
        orderBy("fechaCompleta", "desc")
      );
      
      const snapshot = await getDocs(q);
      const todos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCompleta: doc.data().fechaCompleta?.toDate()
      })) as Gasto[];
      
      setTodosGastos(todos);
      setVistaCompleta(true);
      
      console.log(`📊 Vista completa: ${todos.length} gastos (${snapshot.size} lecturas)`);

    } catch (error) {
      console.error("Error cargando todos los gastos:", error);
      alert("Error al cargar los gastos");
    } finally {
      setCargandoCompleto(false);
    }
  };

  // Guardar gasto
  const guardarGasto = async () => {
    if (!monto || !categoria || !negocioID) return;

    setGuardando(true);
    try {
      const ahora = new Date();
      const mesGasto = ahora.toISOString().slice(0, 7);

      const gastoData = {
        monto: parseFloat(monto),
        categoria,
        descripcion,
        metodoPago,
        tipo,
        fecha: ahora.toLocaleDateString('es-AR'),
        fechaCompleta: ahora,
        usuario: user?.email || "Anónimo",
        negocioID
      };

      // 1. Guardar el gasto
      await addDoc(collection(db, `negocios/${negocioID}/gastos`), gastoData);
      
      // 2. Actualizar resumen (suma simple, no recalcular todo)
      const resumenRef = doc(db, `negocios/${negocioID}/gastosResumen/${mesGasto}`);
      const resumenSnap = await getDoc(resumenRef);
      
      if (resumenSnap.exists()) {
        // Ya existe resumen → Solo sumar
        const resumenActual = resumenSnap.data() as ResumenMes;
        await setDoc(resumenRef, {
          totalMes: resumenActual.totalMes + parseFloat(monto),
          cantidadGastos: resumenActual.cantidadGastos + 1,
          ultimaActualizacion: new Date()
        });
        
        console.log(`💾 Resumen actualizado: +${monto} (2 lecturas + 1 escritura)`);
      } else {
        // Primera vez este mes → Crear resumen
        await setDoc(resumenRef, {
          totalMes: parseFloat(monto),
          cantidadGastos: 1,
          ultimaActualizacion: new Date()
        });
        
        console.log(`💾 Resumen creado para ${mesGasto} (1 escritura)`);
      }

      // 3. Actualizar UI local si es el mes actual
      if (mesGasto === filtroMes) {
        setTotalMes(prev => prev + parseFloat(monto));
        setCantidadGastos(prev => prev + 1);
        
        const nuevoGasto = {
          id: 'temp-' + Date.now(),
          ...gastoData
        };
        setUltimosGastos(prev => [nuevoGasto, ...prev.slice(0, 2)]);
        
        if (vistaCompleta) {
          setTodosGastos(prev => [nuevoGasto, ...prev]);
        }
      }

      // 4. Actualizar lista de meses si es nuevo
      if (!mesesConGastos.includes(mesGasto)) {
        setMesesConGastos(prev => [mesGasto, ...prev].sort((a, b) => b.localeCompare(a)));
      }

      // Reset form
      setMonto("");
      setCategoria("");
      setDescripcion("");
      setMetodoPago("efectivo");
      setMostrarForm(false);

    } catch (error) {
      console.error("Error guardando gasto:", error);
      alert("Error al guardar el gasto");
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar gasto
  const eliminarGasto = async (id: string, montoGasto: number) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    
    try {
      if (!id.startsWith('temp-')) {
        // 1. Eliminar el gasto
        await deleteDoc(doc(db, `negocios/${negocioID}/gastos/${id}`));
        
        // 2. Actualizar resumen (restar simple, no recalcular todo)
        const resumenRef = doc(db, `negocios/${negocioID}/gastosResumen/${filtroMes}`);
        const resumenSnap = await getDoc(resumenRef);
        
        if (resumenSnap.exists()) {
          const resumenActual = resumenSnap.data() as ResumenMes;
          const nuevoTotal = resumenActual.totalMes - montoGasto;
          const nuevaCantidad = resumenActual.cantidadGastos - 1;
          
          if (nuevaCantidad === 0) {
            // Si era el último gasto del mes, eliminar el resumen
            await deleteDoc(resumenRef);
            
            // Quitar mes del selector
            setMesesConGastos(prev => prev.filter(m => m !== filtroMes));
            
            console.log(`🗑️ Último gasto eliminado, resumen del mes borrado`);
          } else {
            // Actualizar resumen
            await setDoc(resumenRef, {
              totalMes: nuevoTotal,
              cantidadGastos: nuevaCantidad,
              ultimaActualizacion: new Date()
            });
            
            console.log(`💾 Resumen actualizado: -${montoGasto} (1 lectura + 1 escritura)`);
          }
        }
      }
      
      // 3. Actualizar UI local
      setTotalMes(prev => prev - montoGasto);
      setCantidadGastos(prev => prev - 1);
      setUltimosGastos(prev => prev.filter(g => g.id !== id));
      
      if (vistaCompleta) {
        setTodosGastos(prev => prev.filter(g => g.id !== id));
      }

    } catch (error) {
      console.error("Error eliminando gasto:", error);
      alert("Error al eliminar el gasto");
    }
  };

  // Gastos filtrados (solo para vista completa)
  const gastosFiltrados = useMemo(() => {
    if (!vistaCompleta) return [];
    
    return todosGastos.filter(gasto => {
      const cumpleCategoria = !filtroCategoria || gasto.categoria === filtroCategoria;
      return cumpleCategoria;
    });
  }, [todosGastos, filtroCategoria, vistaCompleta]);

  // Estadísticas (solo para vista completa)
  const estadisticas = useMemo(() => {
    if (!vistaCompleta) return null;

    const porCategoria = CATEGORIAS.map(cat => {
      const gastosCategoria = gastosFiltrados.filter(g => g.categoria === cat.nombre);
      const totalCategoria = gastosCategoria.reduce((sum, g) => sum + g.monto, 0);
      return {
        ...cat,
        total: totalCategoria,
        cantidad: gastosCategoria.length,
        porcentaje: totalMes > 0 ? (totalCategoria / totalMes) * 100 : 0
      };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    return { porCategoria };
  }, [gastosFiltrados, totalMes, vistaCompleta]);

  const formatPesos = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(num);

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-[#e74c3c] to-[#c0392b] rounded-xl flex items-center justify-center">
                  <span className="text-2xl">💸</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#2c3e50]">Mis Gastos</h1>
                  <p className="text-[#7f8c8d]">Control personal de gastos</p>
                </div>
              </div>
              
              <button
                onClick={() => setMostrarForm(true)}
                className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                Agregar Gasto
              </button>
            </div>
          </div>

          {/* Selector de Mes - SOLO meses con gastos */}
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-[#2c3e50]">📅 Mes:</label>
              {mesesConGastos.length === 0 ? (
                <div className="flex-1 text-[#7f8c8d]">
                  No hay gastos registrados aún
                </div>
              ) : (
                <>
                  <select
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value)}
                    className="flex-1 max-w-xs p-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-[#2c3e50] font-semibold bg-white"
                  >
                    {mesesConGastos.map(mes => {
                      const fecha = new Date(mes + '-01');
                      const nombreMes = fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
                      return (
                        <option key={mes} value={mes}>
                          📅 {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
                        </option>
                      );
                    })}
                  </select>
                  <span className="text-xs text-[#7f8c8d]">
                    {mesesConGastos.length} {mesesConGastos.length === 1 ? 'mes' : 'meses'} con gastos
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Dashboard Resumido */}
          {!vistaCompleta && mesesConGastos.length > 0 && (
            <>
              {/* Total del Mes */}
              <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-xl shadow-lg p-8 text-white">
                {cargando ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-lg">Cargando resumen...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-lg mb-2">💰 Total del Mes</p>
                      <p className="text-5xl font-bold">{formatPesos(totalMes)}</p>
                      <p className="text-green-100 text-sm mt-2">
                        {new Date(filtroMes + '-01').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-green-200 text-xs mt-1">
                        {cantidadGastos} {cantidadGastos === 1 ? 'gasto' : 'gastos'} registrados
                      </p>
                    </div>
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-4xl">📊</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Últimos 3 Gastos */}
              <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] overflow-hidden">
                <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <span>📝</span>
                    Últimos Gastos
                  </h3>
                </div>

                {cargando ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 border-4 border-[#3498db] border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-[#7f8c8d] mt-4">Cargando gastos...</p>
                  </div>
                ) : ultimosGastos.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-[#ecf0f1] rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">💸</span>
                    </div>
                    <p className="text-lg font-medium text-[#2c3e50]">No hay gastos este mes</p>
                    <p className="text-sm text-[#7f8c8d]">Comienza agregando tu primer gasto</p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-[#ecf0f1]">
                      {ultimosGastos.map(gasto => {
                        const cat = CATEGORIAS.find(c => c.nombre === gasto.categoria);
                        return (
                          <div key={gasto.id} className="p-4 hover:bg-[#f8f9fa] transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-12 h-12 bg-gradient-to-r ${cat?.color} rounded-xl flex items-center justify-center text-white text-xl`}>
                                  {cat?.emoji}
                                </div>
                                <div className="flex-1">
                                  <span className="font-semibold text-[#2c3e50]">{gasto.categoria}</span>
                                  <p className="text-sm text-[#7f8c8d]">
                                    {gasto.descripcion || "Sin descripción"}
                                  </p>
                                  <p className="text-xs text-[#bdc3c7]">{gasto.fecha}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="text-xl font-bold text-[#e74c3c]">
                                  {formatPesos(gasto.monto)}
                                </p>
                                <button
                                  onClick={() => eliminarGasto(gasto.id, gasto.monto)}
                                  className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors flex items-center justify-center"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Botón Ver Todos */}
                    {cantidadGastos > 3 && (
                      <div className="bg-[#f8f9fa] p-6 border-t border-[#ecf0f1]">
                        <button
                          onClick={cargarTodosLosGastos}
                          disabled={cargandoCompleto}
                          className="w-full bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white px-6 py-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                        >
                          {cargandoCompleto ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Cargando todos los gastos...
                            </>
                          ) : (
                            <>
                              <span>📊</span>
                              Ver todos los {cantidadGastos} gastos del mes
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Vista Completa */}
          {vistaCompleta && (
            <>
              {/* Botón Volver */}
              <button
                onClick={() => setVistaCompleta(false)}
                className="bg-white border-2 border-[#3498db] text-[#3498db] hover:bg-[#3498db] hover:text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
              >
                <span>←</span>
                Volver al resumen
              </button>

              {/* Estadísticas por Categoría */}
              {estadisticas && estadisticas.porCategoria.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-6">
                  <h3 className="text-xl font-bold text-[#2c3e50] mb-4 flex items-center gap-2">
                    <span>📊</span>
                    Por Categoría
                  </h3>
                  <div className="space-y-3">
                    {estadisticas.porCategoria.map((cat, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-[#2c3e50] flex items-center gap-2">
                            <span>{cat.emoji}</span>
                            {cat.nombre}
                          </span>
                          <span className="text-sm font-bold text-[#2c3e50]">
                            {formatPesos(cat.total)} ({cat.porcentaje.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#ecf0f1] rounded-full h-2">
                          <div
                            className={`bg-gradient-to-r ${cat.color} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${cat.porcentaje}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro de Categoría */}
              <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-6">
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📂 Filtrar por categoría:
                </label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db]"
                >
                  <option value="">Todas las categorías</option>
                  {CATEGORIAS.map(cat => (
                    <option key={cat.nombre} value={cat.nombre}>
                      {cat.emoji} {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista Completa */}
              <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] overflow-hidden">
                <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <span>📝</span>
                    Todos los Gastos ({gastosFiltrados.length})
                  </h3>
                </div>

                <div className="divide-y divide-[#ecf0f1] max-h-[600px] overflow-y-auto">
                  {gastosFiltrados.map(gasto => {
                    const cat = CATEGORIAS.find(c => c.nombre === gasto.categoria);
                    return (
                      <div key={gasto.id} className="p-4 hover:bg-[#f8f9fa] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-12 h-12 bg-gradient-to-r ${cat?.color} rounded-xl flex items-center justify-center text-white text-xl`}>
                              {cat?.emoji}
                            </div>
                            <div className="flex-1">
                              <span className="font-semibold text-[#2c3e50]">{gasto.categoria}</span>
                              <p className="text-sm text-[#7f8c8d]">
                                {gasto.descripcion || "Sin descripción"}
                              </p>
                              <p className="text-xs text-[#bdc3c7]">{gasto.fecha}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xl font-bold text-[#e74c3c]">
                              {formatPesos(gasto.monto)}
                            </p>
                            <button
                              onClick={() => eliminarGasto(gasto.id, gasto.monto)}
                              className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal de agregar gasto */}
        {mostrarForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#ecf0f1] max-h-[90vh] overflow-y-auto">
              
              <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-6 flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h3 className="text-2xl font-bold">Nuevo Gasto</h3>
                  <p className="text-green-100 text-sm">Registra rápidamente</p>
                </div>
                <button
                  onClick={() => setMostrarForm(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Monto */}
                <div>
                  <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                    Monto: *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0"
                    className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] text-2xl font-bold text-[#2c3e50]"
                    autoFocus
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                    Categoría: *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIAS.map(cat => (
                      <button
                        key={cat.nombre}
                        onClick={() => setCategoria(cat.nombre)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          categoria === cat.nombre
                            ? `border-[#27ae60] bg-green-50 shadow-lg scale-105`
                            : 'border-[#ecf0f1] hover:border-[#bdc3c7]'
                        }`}
                      >
                        <div className="text-2xl mb-1">{cat.emoji}</div>
                        <div className="text-xs font-medium text-[#2c3e50]">{cat.nombre}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                    Descripción (opcional):
                  </label>
                  <input
                    type="text"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="¿En qué gastaste?"
                    className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] text-[#2c3e50] placeholder:text-[#95a5a6]"
                  />
                </div>

                {/* Método de pago */}
                <div>
                  <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                    Método de pago:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {METODOS_PAGO.map(metodo => (
                      <button
                        key={metodo.id}
                        onClick={() => setMetodoPago(metodo.id)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          metodoPago === metodo.id
                            ? 'border-[#27ae60] bg-green-50'
                            : 'border-[#ecf0f1] hover:border-[#bdc3c7]'
                        }`}
                      >
                        <div className="text-xl mb-1">{metodo.emoji}</div>
                        <div className="text-xs font-semibold text-[#2c3e50]">{metodo.nombre}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setMostrarForm(false)}
                    className="flex-1 px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={guardarGasto}
                    disabled={!monto || !categoria || guardando}
                    className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                      !monto || !categoria || guardando
                        ? 'bg-[#bdc3c7] cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white'
                    }`}
                  >
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}