// lib/qzPrinter.ts
declare global {
    interface Window {
      qz: any;
    }
  }
  
  export const initQZ = async () => {
    if (!window.qz) throw new Error("QZ Tray no está disponible");
  
    await window.qz.websocket.connect();
    console.log("🖨️ QZ Tray conectado");
  };
  
  export const imprimirEtiqueta = async (texto: string, impresora?: string) => {
    await initQZ();
  
    const config = window.qz.configs.create(impresora || null); // usa predeterminada
    const data = [{ type: 'raw', format: 'plain', data: texto }];
  
    await window.qz.print(config, data);
    console.log("✅ Impresión enviada");
  };
  