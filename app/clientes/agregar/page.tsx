    "use client";
    import { useState, useEffect } from "react";
    import { useRouter } from "next/navigation";
    import { collection, addDoc, getDoc, doc } from "firebase/firestore";
    import { db } from "@/lib/firebase";
    import { auth } from "@/lib/auth";
    import { useAuthState } from "react-firebase-hooks/auth";
    import Header from "@/app/Header";

    export default function AgregarClientePage() {
    const router = useRouter();
    const [cliente, setCliente] = useState({
        nombre: "",
        telefono: "",
        dni: "",
        direccion: "",
        email: "",
    });

    const [user] = useAuthState(auth);
    const [negocioID, setNegocioID] = useState("");

    useEffect(() => {
        const obtenerNegocio = async () => {
        if (user) {
            const snap = await getDoc(doc(db, "usuarios", user.uid));
            if (snap.exists()) {
            setNegocioID(snap.data().negocioID);
            }
        }
        };
        obtenerNegocio();
    }, [user]);

    const handleGuardar = async () => {
        if (!negocioID) {
        alert("❌ No se pudo identificar el negocio. Recargá la página.");
        return;
        }

        try {
        await addDoc(collection(db, `negocios/${negocioID}/clientes`), cliente);
        alert("✅ Cliente guardado correctamente");
        router.push("/clientes");
        } catch (error) {
        console.error("Error al guardar cliente:", error);
        alert("❌ Ocurrió un error");
        }
    };

    return (
        <>
        <Header />
        <main className="pt-24 px-4 bg-gray-100 min-h-screen text-black">
            <h1 className="text-2xl font-bold mb-6 text-center">Agregar cliente</h1>

            <div className="max-w-lg mx-auto grid gap-4">
            <input
                type="text"
                placeholder="Nombre"
                value={cliente.nombre}
                onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                className="p-2 border border-gray-400 rounded"
            />
            <input
                type="text"
                placeholder="Teléfono"
                value={cliente.telefono}
                onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                className="p-2 border border-gray-400 rounded"
            />
            <input
                type="text"
                placeholder="DNI"
                value={cliente.dni}
                onChange={(e) => setCliente({ ...cliente, dni: e.target.value })}
                className="p-2 border border-gray-400 rounded"
            />
            <input
                type="text"
                placeholder="Dirección"
                value={cliente.direccion}
                onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })}
                className="p-2 border border-gray-400 rounded"
            />
            <input
                type="email"
                placeholder="Email"
                value={cliente.email}
                onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                className="p-2 border border-gray-400 rounded"
            />

            <button
                onClick={handleGuardar}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
            >
                Guardar cliente
            </button>
            </div>
        </main>
        </>
    );
    }
