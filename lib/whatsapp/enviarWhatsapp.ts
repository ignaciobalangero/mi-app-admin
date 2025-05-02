// archivo: lib/whatsapp/enviarWhatsApp.ts

export async function enviarWhatsApp({
    telefonoCliente,
    clienteNombre,
    modelo,
    instanceID,
    token,
    plantilla,
  }: {
    telefonoCliente: string; // formato internacional: +549...
    clienteNombre: string;
    modelo: string;
    instanceID: string;
    token: string;
    plantilla: string; // texto con {{cliente}} y {{modelo}}
  }) {
    const mensaje = plantilla
      .replace("{{cliente}}", clienteNombre)
      .replace("{{modelo}}", modelo);
  
    const url = `https://api.ultramsg.com/${instanceID}/messages/chat`;
  
    const body = {
      token,
      to: telefonoCliente,
      body: mensaje,
    };
  
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
  
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Error enviando WhatsApp: ${errorData.message || res.statusText}`);
      }
  
      return await res.json();
    } catch (error) {
      console.error("❌ Error al enviar WhatsApp:", error);
      throw error;
    }
  }
  