import SelectorTelefonoStock from "./SelectorTelefonoStock";
interface Props {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>; 
  clientes: { id: string; nombre: string }[];
  stock: any[];
  setStock: React.Dispatch<React.SetStateAction<any[]>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onAgregarCliente: () => void;
  rol: string;
}

export default function FormularioCamposVenta({
  form,
  setForm,
  clientes,
  stock,
  setStock,
  handleChange,
  onAgregarCliente,
  rol,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input
        type="text"
        name="fecha"
        value={form.fecha}
        onChange={handleChange}
        placeholder="Fecha"
        className="p-2 border rounded w-full"
      />
      <input
        type="text"
        name="proveedor"
        value={form.proveedor}
        onChange={handleChange}
        placeholder="Proveedor"
        className="p-2 border rounded w-full"
      />

      <div className="flex gap-2">
        <div className="w-full">
          <input
            type="text"
            name="cliente"
            value={form.cliente}
            onChange={handleChange}
            list="clientes-options"
            placeholder="Buscar cliente..."
            className="p-2 border rounded w-full"
          />
          <datalist id="clientes-options">
            {clientes.map((c) => (
              <option key={c.id} value={c.nombre} />
            ))}
          </datalist>
        </div>
        <button
          onClick={onAgregarCliente}
          type="button"
          className="bg-blue-500 text-white px-3 rounded"
        >
          +
        </button>
      </div>

      <SelectorTelefonoStock stock={stock} form={form} setForm={setForm} />

      <select 
        name="estado"
        value={form.estado}
        onChange={handleChange}
        className="p-2 border rounded w-full"
      >
        <option value="nuevo">Nuevo</option>
        <option value="usado">Usado</option>
      </select>

      <input
        type="text"
        name="color"
        value={form.color}
        onChange={handleChange}
        placeholder="Color"
        className="p-2 border rounded w-full"
      />

      {form.estado === "usado" && (
        <input
          type="text"
          name="bateria"
          value={form.bateria}
          onChange={handleChange}
          placeholder="% Batería"
          className="p-2 border rounded w-full"
        />
      )}

      <input
        type="text"
        name="gb"
        value={form.gb}
        onChange={handleChange}
        placeholder="GB"
        className="p-2 border rounded w-full"
      />
      <input
        type="text"
        name="imei"
        value={form.imei}
        onChange={handleChange}
        placeholder="IMEI"
        className="p-2 border rounded w-full"
      />
      <input
        type="text"
        name="serie"
        value={form.serie}
        onChange={handleChange}
        placeholder="Serie"
        className="p-2 border rounded w-full"
      />
      {rol === "admin" && (
  <input
    type="number"
    name="precioCosto"
    value={form.precioCosto}
    onChange={handleChange}
    placeholder="Precio Costo"
    className="p-2 border rounded w-full"
  />
)}
      <input
        type="number"
        name="precioVenta"
        value={form.precioVenta}
        onChange={handleChange}
        placeholder="Precio Venta"
        className="p-2 border rounded w-full"
      />
      {rol === "admin" && (
  <p className="text-green-600 font-semibold">
    Ganancia: ${form.precioVenta - form.precioCosto}
  </p>
)}
    </div>
  );
}
