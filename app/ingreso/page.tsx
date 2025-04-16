"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import Header from "../Header";
import RequireAuth from "../../lib/requireAuth";

interface Cliente {
  nombre: string;
  telefono: string;
  dni: string;
  direccion: string;
  email: string;
}

export default function Ingreso() {
  const router = useRouter();
  const [fecha, setFecha] = useState("");
  const [fechaManual, setFechaManual] = useState(false);
  const [id, setId] = useState("");
  const [cliente, setCliente] = useState("");
  const [modelo, setModelo] = useState("");
  const [trabajo, setTrabajo] = useState("");
  const [clave, setClave] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [imei, setImei] = useState("");
  const [mostrarCheckIn, setMostrarCheckIn] = useState(false);
  const [clientesGuardados, setClientesGuardados] = useState<Cliente[]>([]);
  const [checkData, setCheckData] = useState({
    imeiEstado: "",
    color: "",
    pantalla: "",
    camaras: "",
    microfonos: "",
    cargaCable: "",
    cargaInalambrica: "",
    tapaTrasera: "",
  });

  useEffect(() => {
    const hoy = new Date();
    const fechaFormateada = hoy.toLocaleDateString("es-AR");
    setFecha(fechaFormateada);
    const generado = "EQ-" + hoy.getTime().toString().slice(-5);
    setId(generado);
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    const snapshot = await getDocs(collection(db, "clientes"));
    const lista: Cliente[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      lista.push({
        nombre: data.nombre,
        telefono: data.telefono,
        dni: data.dni,
        direccion: data.direccion,
        email: data.email,
      });
    });
    setClientesGuardados(lista);
  };

  const handleGuardar = async () => {
    const datos = {
      fecha,
      id,
      cliente,
      modelo,
      trabajo,
      clave,
      observaciones,
      imei,
      estado: "PENDIENTE",
      creadoEn: serverTimestamp(),
      checkIn: mostrarCheckIn ? checkData : null,
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
      setImei("");
      setMostrarCheckIn(false);
      setCheckData({
        imeiEstado: "",
        color: "",
        pantalla: "",
        camaras: "",
        microfonos: "",
        cargaCable: "",
        cargaInalambrica: "",
        tapaTrasera: "",
      });
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

        <div className="mb-4 text-right">
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            onClick={() => router.push("/clientes/agregar")}
          >
            ➕ Agregar cliente
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={fecha}
              readOnly={!fechaManual}
              onChange={(e) => setFecha(e.target.value)}
              className="p-3 rounded-xl bg-gray-800 border border-gray-600 w-full"
              placeholder="Fecha"
            />
            <label className="text-sm">
              <input
                type="checkbox"
                checked={fechaManual}
                onChange={() => setFechaManual(!fechaManual)}
                className="mr-1"
              />
              Editar
            </label>
          </div>
          <input type="text" value={id} readOnly className="p-3 rounded-xl bg-gray-800 border border-gray-600" placeholder="ID" />
          <input
            type="text"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            list="clientes-lista"
            className="p-3 rounded-xl bg-gray-800 border border-gray-600"
            placeholder="Cliente"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <datalist id="clientes-lista">
            {clientesGuardados.map((c, i) => (
              <option key={i} value={c.nombre} />
            ))}
          </datalist>
          <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} className="p-3 rounded-xl bg-gray-800 border border-gray-600" placeholder="Modelo" />
          <input type="text" value={trabajo} onChange={(e) => setTrabajo(e.target.value)} className="p-3 rounded-xl bg-gray-800 border border-gray-600" placeholder="Trabajo" />
          <input type="text" value={clave} onChange={(e) => setClave(e.target.value)} className="p-3 rounded-xl bg-gray-800 border border-gray-600" placeholder="Clave" />
          <input type="text" value={imei} onChange={(e) => setImei(e.target.value)} className="p-3 rounded-xl bg-gray-800 border border-gray-600" placeholder="IMEI" />
          <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="p-3 rounded-xl bg-gray-800 border border-gray-600 col-span-1 md:col-span-2" placeholder="Observaciones" />
        </div>

        <div className="flex justify-center mt-4">
          <button
            onClick={() => setMostrarCheckIn(!mostrarCheckIn)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-2xl font-semibold"
          >
            {mostrarCheckIn ? "Ocultar CHECK IN" : "Agregar CHECK IN"}
          </button>
        </div>

        {mostrarCheckIn && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mt-6 bg-gray-800 p-4 rounded-xl">
            <input type="text" placeholder="Estado del IMEI" value={checkData.imeiEstado} onChange={(e) => setCheckData({ ...checkData, imeiEstado: e.target.value })} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input type="text" placeholder="Color" value={checkData.color} onChange={(e) => setCheckData({ ...checkData, color: e.target.value })} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input type="text" placeholder="Pantalla" value={checkData.pantalla} onChange={(e) => setCheckData({ ...checkData, pantalla: e.target.value })} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input type="text" placeholder="Cámaras" value={checkData.camaras} onChange={(e) => setCheckData({ ...checkData, camaras: e.target.value })} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input type="text" placeholder="Micrófonos" value={checkData.microfonos} onChange={(e) => setCheckData({ ...checkData, microfonos: e.target.value })} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input type="text" placeholder="Carga con cable" value={checkData.cargaCable} onChange={(e) => setCheckData({ ...checkData, cargaCable: e.target.value })} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input type="text" placeholder="Carga inalámbrica" value={checkData.cargaInalambrica} onChange={(e) => setCheckData({ ...checkData, cargaInalambrica: e.target.value })} className="p-2 rounded bg-gray-700 border border-gray-600" />
            <input type="text" placeholder="Tapa trasera" value={checkData.tapaTrasera} onChange={(e) => setCheckData({ ...checkData, tapaTrasera: e.target.value })} className="p-2 rounded bg-gray-700 border border-gray-600" />
          </div>
        )}

        <div className="flex justify-center mt-8">
          <button onClick={handleGuardar} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl text-lg font-semibold transition">
            Guardar e imprimir
          </button>
        </div>
      </div>
    </RequireAuth>
  );
}
