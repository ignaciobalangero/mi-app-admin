/** Shape público devuelto por GET /api/stock-publico (sin datos de costo). */
export type ItemStockPublico = {
  id: string;
  codigo: string;
  producto: string;
  modelo: string;
  marca: string;
  categoria: string;
  /** Color / variante (ej. tapas agrupadas por título). */
  color?: string;
  stock: number;
  moneda: "ARS" | "USD";
  precio1: number;
  precioVentaARS: number;
  /** URL portada (= fotosURLs[0] o legacy fotoURL). */
  fotoURL: string | null;
  /** Galería completa ordenada; la primera es la portada. */
  fotosURLs?: string[];
  /** Texto corto bajo el título en la tienda web (ej. calidad, variante). */
  observacion: string | null;
};

/** Opciones en `negocios/{id}/configuracion/datos` → objeto `catalogoPublico`. */
export type CatalogoPublicoOpciones = {
  mostrarCodigo?: boolean;
  mostrarMarca?: boolean;
  mostrarCategoria?: boolean;
  mostrarStock?: boolean;
  mostrarPrecio?: boolean;
  mostrarFoto?: boolean;
  /** Si true, la grilla agrupa títulos por marca. */
  agruparPorMarca?: boolean;
  /** Campo extra del documento repuesto donde está la URL de la foto (si no usás los nombres por defecto). */
  campoFoto?: string;
  /** Si true, el catálogo web solo incluye repuestos con `publicarEnCatalogoWeb: true`. */
  catalogoSoloRepuestosMarcados?: boolean;
};
