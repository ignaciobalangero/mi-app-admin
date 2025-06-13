"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Trash2, Plus, ExternalLink, AlertCircle } from "lucide-react";

export default function IntegracionGoogleSheetPage() {
  const [sheetID, setSheetID] = useState("");
  const [nombreHoja, setNombreHoja] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [user] = useAuthState(auth);
  const [hojasVinculadas, setHojasVinculadas] = useState<{ hoja: string; id: string }[]>([]);
  const [cargando, setCargando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);

  useEffect(() => {
    const obtenerHojas = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        const negocioID = snap.exists() ? snap.data().negocioID : null;
        if (!negocioID) return;

        const configSnap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/datos`));
        const configData = configSnap.exists() ? configSnap.data() : {};
        const hojasGuardadas = configData.googleSheets || [];

        setHojasVinculadas(hojasGuardadas);
      } catch (error) {
        console.error("Error obteniendo hojas:", error);
        setMensaje("❌ Error al cargar las hojas vinculadas");
      }
    };

    obtenerHojas();
  }, [user]);

  const validarSheetID = (id: string) => {
    // Extraer ID del Sheet si se pega la URL completa
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = id.match(regex);
    return match ? match[1] : id;
  };

  const guardarHoja = async () => {
    if (!user) return setMensaje("⚠️ No hay usuario autenticado");
    if (!sheetID || !nombreHoja) return setMensaje("⚠️ Completá ambos campos");

    setCargando(true);
    
    try {
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      const negocioID = snap.exists() ? snap.data().negocioID : null;
      if (!negocioID) return setMensaje("⚠️ No se encontró el negocioID");

      const sheetIDLimpio = validarSheetID(sheetID);

      const configRef = doc(db, `negocios/${negocioID}/configuracion/datos`);
      const configSnap = await getDoc(configRef);
      const configData = configSnap.exists() ? configSnap.data() : {};
      const hojasActuales = configData.googleSheets || [];

      // 🔧 CORRECCIÓN: Solo verificar la combinación exacta (ID + nombre de hoja)
      // Permite mismo SheetID con diferentes pestañas
      const yaExiste = hojasActuales.some(
        (h: any) => h.hoja === nombreHoja && h.id === sheetIDLimpio
      );
      
      if (yaExiste) {
        setMensaje("⚠️ Esta combinación de Sheet ID y nombre de pestaña ya existe");
        return;
      }

      // Verificar solo si el nombre de hoja ya existe (independiente del ID)
      const nombreDuplicado = hojasActuales.some(
        (h: any) => h.hoja === nombreHoja
      );
      
      if (nombreDuplicado) {
        setMensaje("⚠️ Ya existe una hoja con ese nombre. Usa un nombre diferente.");
        return;
      }

      const nuevasHojas = [...hojasActuales, { hoja: nombreHoja, id: sheetIDLimpio }];

      await setDoc(configRef, {
        ...configData,
        googleSheets: nuevasHojas,
      });

      setMensaje("✅ Hoja vinculada correctamente");
      setSheetID("");
      setNombreHoja("");
      setHojasVinculadas(nuevasHojas);
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMensaje(""), 3000);
      
    } catch (error) {
      console.error("Error guardando hoja:", error);
      setMensaje("❌ Error al vincular la hoja");
    } finally {
      setCargando(false);
    }
  };

  const eliminarHoja = async (indice: number) => {
    if (!user) return;
    
    const hojaAEliminar = hojasVinculadas[indice];
    setEliminando(hojaAEliminar.hoja);

    try {
      const snap = await getDoc(doc(db, "usuarios", user.uid));
      const negocioID = snap.exists() ? snap.data().negocioID : null;
      if (!negocioID) return;

      const configRef = doc(db, `negocios/${negocioID}/configuracion/datos`);
      const configSnap = await getDoc(configRef);
      const configData = configSnap.exists() ? configSnap.data() : {};
      
      const nuevasHojas = hojasVinculadas.filter((_, i) => i !== indice);

      await setDoc(configRef, {
        ...configData,
        googleSheets: nuevasHojas,
      });

      setHojasVinculadas(nuevasHojas);
      setMensaje(`✅ Hoja "${hojaAEliminar.hoja}" eliminada correctamente`);
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMensaje(""), 3000);
      
    } catch (error) {
      console.error("Error eliminando hoja:", error);
      setMensaje("❌ Error al eliminar la hoja");
    } finally {
      setEliminando(null);
    }
  };

  const confirmarEliminacion = (indice: number) => {
    const hoja = hojasVinculadas[indice];
    if (window.confirm(`¿Estás seguro de eliminar la hoja "${hoja.hoja}"?`)) {
      eliminarHoja(indice);
    }
  };

  // 🆕 Función para agrupar hojas por SheetID
  const hojasAgrupadas = hojasVinculadas.reduce((grupos, hoja) => {
    if (!grupos[hoja.id]) {
      grupos[hoja.id] = [];
    }
    grupos[hoja.id].push(hoja);
    return grupos;
  }, {} as Record<string, typeof hojasVinculadas>);

  return (
    <main className="pt-24 px-4 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            🔗 <span>Vincular Google Sheets</span>
          </h1>
          <p className="text-gray-600">
            Conecta tus hojas de cálculo para sincronizar inventarios automáticamente
          </p>
        </div>

        {/* Formulario de agregar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Agregar nueva hoja</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la pestaña
              </label>
              <input
                type="text"
                value={nombreHoja}
                onChange={(e) => setNombreHoja(e.target.value)}
                placeholder="ej: Pantallas, Fundas, Accesorios..."
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID o URL de Google Sheet
              </label>
              <input
                type="text"
                value={sheetID}
                onChange={(e) => setSheetID(e.target.value)}
                placeholder="Pega la URL completa o solo el ID del Sheet"
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder-gray-500"
              />
              <p className="text-xs text-gray-600 mt-1 font-medium">
                💡 Podés pegar la URL completa del Sheet, se extraerá el ID automáticamente
              </p>
            </div>

            <button
              onClick={guardarHoja}
              disabled={cargando || !sheetID || !nombreHoja}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Vinculando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Agregar hoja</span>
                </>
              )}
            </button>
          </div>

          {/* Mensaje de estado */}
          {mensaje && (
            <div className={`mt-4 p-3 rounded-lg border-2 text-center font-medium ${
              mensaje.includes("✅") 
                ? "bg-green-50 border-green-200 text-green-700" 
                : mensaje.includes("⚠️")
                ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {mensaje}
            </div>
          )}
        </div>

        {/* Lista de hojas vinculadas - AGRUPADAS POR SHEET */}
        {hojasVinculadas.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">📄</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Hojas vinculadas</h2>
                  <p className="text-blue-100 text-sm">
                    {hojasVinculadas.length} {hojasVinculadas.length === 1 ? 'hoja conectada' : 'hojas conectadas'} en {Object.keys(hojasAgrupadas).length} {Object.keys(hojasAgrupadas).length === 1 ? 'documento' : 'documentos'}
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {Object.entries(hojasAgrupadas).map(([sheetID, hojas]) => (
                <div key={sheetID} className="p-6">
                  {/* Header del Sheet */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">📊</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-gray-200 px-3 py-1 rounded text-sm font-medium text-gray-800">
                          {sheetID}
                        </span>
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${sheetID}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline text-sm font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir Sheet</span>
                        </a>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 font-medium">
                        {hojas.length} {hojas.length === 1 ? 'pestaña' : 'pestañas'} configuradas
                      </p>
                    </div>
                  </div>

                  {/* Lista de pestañas */}
                  <div className="space-y-2 ml-11">
                    {hojas.map((hoja, hojaIndex) => {
                      const indiceGlobal = hojasVinculadas.findIndex(h => h.hoja === hoja.hoja && h.id === hoja.id);
                      return (
                        <div key={`${hoja.id}-${hoja.hoja}`} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-200 rounded flex items-center justify-center">
                              <span className="text-green-700 text-xs">📋</span>
                            </div>
                            <span className="font-semibold text-gray-900">{hoja.hoja}</span>
                          </div>
                          <button
                            onClick={() => confirmarEliminacion(indiceGlobal)}
                            disabled={eliminando === hoja.hoja}
                            className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 p-2 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            title={`Eliminar pestaña ${hoja.hoja}`}
                          >
                            {eliminando === hoja.hoja ? (
                              <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No hay hojas vinculadas
            </h3>
            <p className="text-gray-600 font-medium">
              Agrega tu primera hoja de Google Sheets para comenzar
            </p>
          </div>
        )}

        {/* Instrucciones */}
        <div className="mt-8 bg-blue-50 rounded-2xl border-2 border-blue-200 p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-blue-600 text-sm">💡</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-900 mb-2">Instrucciones</h3>
              <ul className="text-blue-800 space-y-1 text-sm leading-relaxed">
                <li className="font-medium">• El nombre debe coincidir exactamente con la pestaña del Sheet</li>
                <li className="font-medium">• <span className="font-bold text-blue-900">Podés usar el mismo SheetID para múltiples pestañas</span></li>
                <li className="font-medium">• Cada nombre de pestaña debe ser único (no importa el SheetID)</li>
                <li className="font-medium">• Asegurate de que el Sheet sea público o compartido con permisos de lectura</li>
                <li className="font-medium">• Los cambios se sincronizan automáticamente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}