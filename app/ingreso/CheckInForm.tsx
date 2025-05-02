"use client";

interface CheckData {
  imeiEstado: string;
  color: string;
  pantalla: string;
  camaras: string;
  microfonos: string;
  cargaCable: string;
  cargaInalambrica: string;
  tapaTrasera: string;
}

interface Props {
  checkData: CheckData;
  setCheckData: (data: CheckData) => void;
}

export default function CheckInForm({ checkData, setCheckData }: Props) {
  const handleChange = (campo: keyof CheckData, valor: string) => {
    setCheckData({ ...checkData, [campo]: valor });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mt-6 bg-gray-400 p-4 rounded-xl">
      <input
        type="text"
        placeholder="Estado del IMEI"
        value={checkData.imeiEstado}
        onChange={(e) => handleChange("imeiEstado", e.target.value)}
        className="p-2 rounded bg-gray-200 border border-gray-600 text-black placeholder-opacity-60"
      />
      <input
        type="text"
        placeholder="Color"
        value={checkData.color}
        onChange={(e) => handleChange("color", e.target.value)}
        className="p-2 rounded bg-gray-200 border border-gray-600 text-black placeholder-opacity-60"
      />
      <input
        type="text"
        placeholder="Pantalla"
        value={checkData.pantalla}
        onChange={(e) => handleChange("pantalla", e.target.value)}
        className="p-2 rounded bg-gray-200 border border-gray-600 text-black placeholder-opacity-60"
      />
      <input
        type="text"
        placeholder="Cámaras"
        value={checkData.camaras}
        onChange={(e) => handleChange("camaras", e.target.value)}
        className="p-2 rounded bg-gray-200 border border-gray-600 text-black placeholder-opacity-60"
      />
      <input
        type="text"
        placeholder="Micrófonos"
        value={checkData.microfonos}
        onChange={(e) => handleChange("microfonos", e.target.value)}
        className="p-2 rounded bg-gray-200 border border-gray-600 text-black placeholder-opacity-60"
      />
      <input
        type="text"
        placeholder="Carga con cable"
        value={checkData.cargaCable}
        onChange={(e) => handleChange("cargaCable", e.target.value)}
        className="p-2 rounded bg-gray-200 border border-gray-600 text-black placeholder-opacity-60"
      />
      <input
        type="text"
        placeholder="Carga inalámbrica"
        value={checkData.cargaInalambrica}
        onChange={(e) => handleChange("cargaInalambrica", e.target.value)}
        className="p-2 rounded bg-gray-200 border border-gray-600 text-black placeholder-opacity-60"
      />
      <input
        type="text"
        placeholder="Tapa trasera"
        value={checkData.tapaTrasera}
        onChange={(e) => handleChange("tapaTrasera", e.target.value)}
        className="p-2 rounded bg-gray-200 border border-gray-600 text-black placeholder-opacity-60"
      />
    </div>
  );
}
