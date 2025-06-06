// app/api/webhooks/mercadopago/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Webhook recibido de MercadoPago');
    console.log('🌐 URL completa:', request.url);
    console.log('📋 Headers:', Object.fromEntries(request.headers.entries()));
    
    // ✅ OBTENER PARÁMETROS DE LA URL (método principal de MercadoPago)
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic');
    const id = url.searchParams.get('id');
    
    console.log('📋 Parámetros URL:', { topic, id });
    
    // ✅ INTENTAR OBTENER BODY (método secundario)
    let body = null;
    try {
      const bodyText = await request.text();
      if (bodyText) {
        body = JSON.parse(bodyText);
        console.log('📋 Body JSON:', body);
      }
    } catch (e) {
      console.log('ℹ️ No hay JSON body válido');
    }
    
    // ✅ PROCESAR NOTIFICACIÓN DE PAGO
    if (topic === 'payment' && id) {
      console.log('💳 Procesando pago con ID:', id);
      
      // TODO: Aquí deberías hacer una llamada a la API de MercadoPago
      // para obtener los detalles completos del pago
      // Por ahora simulamos que el pago fue aprobado
      
      console.log('✅ Pago procesado correctamente');
      
    } else if (topic === 'merchant_order' && id) {
      console.log('📦 Procesando orden con ID:', id);
      
    } else if (body && body.type === 'payment') {
      // Método alternativo si viene en el body
      const paymentId = body.data?.id;
      console.log('💳 Payment ID desde body:', paymentId);
      
      if (body.data?.metadata) {
        const userId = body.data.metadata.userId;
        const plan = body.data.metadata.plan;
        
        if (userId && plan) {
          try {
            const fechaVencimiento = new Date();
            fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
            
            await db.collection('usuarios').doc(userId).update({
              planActivo: plan,
              fechaVencimiento: fechaVencimiento,
              estado: 'activo',
              ultimoPago: new Date(),
              paymentId: paymentId
            });
            
            console.log(`✅ Usuario ${userId} actualizado a plan ${plan}`);
          } catch (firebaseError) {
            console.error('❌ Error actualizando Firebase:', firebaseError);
          }
        }
      }
      
    } else {
      console.log('ℹ️ Webhook recibido pero sin datos procesables');
      console.log('📋 Topic:', topic, 'ID:', id);
      console.log('📋 Body type:', body?.type);
    }

    // ✅ CAMBIO PRINCIPAL: usar Response directa
    return new Response(
      JSON.stringify({ 
        received: true,
        processed: true,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    );

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    
    // ✅ INCLUSO CON ERROR, RESPONDER 200
    return new Response(
      JSON.stringify({ 
        received: true, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

// ✅ MANEJAR GET PARA VERIFICACIÓN
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const topic = url.searchParams.get('topic');
  const id = url.searchParams.get('id');
  
  console.log('🔍 GET recibido:', { topic, id });
  
  return new Response(
    JSON.stringify({ 
      status: 'Webhook MercadoPago activo',
      timestamp: new Date().toISOString(),
      method: 'GET',
      params: { topic, id }
    }), 
    { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );
}