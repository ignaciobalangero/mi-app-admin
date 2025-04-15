"use client";
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Header from "../Header";
import RequireAuth from "../../lib/requireAuth"; // 👈 Protección de acceso

export default function Ingreso() {
  const [fecha, setFecha] = useState("");
  const [id, setId] = useState("");
  const [cliente, setCliente] = useState("");
  const [modelo, setModelo] = useState("");
  const [trabajo, setTrabajo] = useState("");
  const [clave, setClave] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    const hoy = new Date();
    setFecha(hoy.toLocaleDateString("es-AR"));
    const generado = "EQ-" + hoy.getTime().toString().slice(-5);
    setId(generado);
  }, []);

  const handleGuardar = async () => {
    const datos = {
      fecha,
      id,
      cliente,
      modelo,
      trabajo,
      clave,
      observaciones,
      estado: "PENDIENTE",
      creadoEn: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "trabajos"), datos);
      alert("✅ Trabajo guardado en la nube correctamente");

      const filaCSV = `ID,Cliente,Modelo,Trabajo,Clave,Observaciones\n${id},${cliente},${modelo},${trabajo},${clave},${observaciones}`;
      const blob = new Blob([filaCSV], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Etiqueta-ACTUAL.csv";
      link.click();

      setCliente("");
      setModelo("");
      setTrabajo("");
      setClave("");
      setObservaciones("");
    } catch (error) {
      alert("❌ Error al guardar el trabajo");
      console.error("Firebase error:", error);
    }
  };

  return (
    <RequireAuth>
      <Header />
      <div className="pt-20 min-h-screen bg-gray-900 text-white p-8">
        <h2 className="text-4xl font-bold mb-8 text-center">Ingreso de trabajo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <input type="text" value={fecha} readOnly className="p-3 rounded-xl bg-gray-800 border border-gray-600" placeholder="Fecha" />
          <input type="text" value={id} readOnly className="p-3 rounded-xl bg-gray-800 border border-gray-600" placeholder="ID" />
          
          {/* 👇 CAMPO CLIENTE corregido 👇 */}
          <input
             type="text"
             name="nombreCliente"
             id="nombreCliente"
             value={cliente}
             onChange={(e) => setCliente(e.target.value)}
             className="p-3 rounded-xl bg-gray-800 border border-gray-600"
             placeholder="Cliente"
             autoComplete="off"
             autoCorrect="off"
             spellCheck={false}
          />

          <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} className="p-3 rounded-xl bg-gray-800 border border-gray-600" placeholder="Modelo" />
          <input type="text" value={trabajo} onChange={(e) => setTrabajo(e.target.value)} className="p-3 rounded-xl bg-gray-800 border border-gray-600" placeholder="Trabajo" />
          <input type="text" value={clave} onChange={(e) => setClave(e.target.value)} className="p-3 rounded-xl bg-gray-800 border border-gray-600" placeholder="Clave" />
          <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="p-3 rounded-xl bg-gray-800 border border-gray-600 col-span-1 md:col-span-2" placeholder="Observaciones" />
        </div>
        <div className="flex justify-center mt-8">
          <button onClick={handleGuardar} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl text-lg font-semibold transition">
            Guardar e imprimir
          </button>
        </div>
      </div>
    </RequireAuth>
  );
}
