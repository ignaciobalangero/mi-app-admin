/** Cliente de tienda web — separado del rol `cliente` del portal de reparaciones. */

export type DireccionTienda = {
  id: string;
  etiqueta: string;
  calle: string;
  numero: string;
  pisoDepto: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  nombreRecepcion: string;
  telefono: string;
};

export type ClienteTiendaPerfil = {
  uid: string;
  negocioId: string;
  email: string;
  nombre: string;
  telefono: string;
  dniCuit: string;
  direcciones: DireccionTienda[];
  creadoEn: string;
  actualizadoEn: string;
};

export type TipoEnvioTienda = "envio" | "retiro_deposito";

export type TransportistaTienda =
  | "andreani"
  | "oca"
  | "credifin"
  | "sendbox"
  | "interprovincial"
  | "jetpaq";

export type MetodoPagoTienda = "transferencia" | "modo_qr";

export type LineaPedidoTienda = {
  itemId: string;
  codigo: string;
  producto: string;
  marca: string;
  cantidad: number;
  precioRefARS: number;
  subtotalRefARS: number;
};

export type PedidoTienda = {
  id: string;
  numero: string;
  uid: string;
  negocioId: string;
  cliente: {
    nombre: string;
    email: string;
    telefono: string;
    dniCuit: string;
  };
  envio: {
    tipo: TipoEnvioTienda;
    transportista: TransportistaTienda | null;
    valorDeclaradoPct: number | null;
    valorDeclaradoARS: number | null;
    direccion: DireccionTienda | null;
  };
  pago: {
    metodo: MetodoPagoTienda;
    recargoPct: number;
    totalRefARS: number;
    totalConRecargoARS: number;
  };
  lineas: LineaPedidoTienda[];
  totalRefARS: number;
  estado: "pendiente" | "confirmado" | "enviado" | "cancelado";
  origen: "tienda_web";
  creadoEn: string;
  /** Venta registrada en Gestione (`negocios/.../ventasGeneral`). */
  ventaGeneralId?: string;
  convertidoEn?: string;
  /** ISO — stock descontado al confirmar checkout en la tienda. */
  stockDescontadoEn?: string;
};

export const ROL_CLIENTE_TIENDA = "cliente_tienda" as const;
