// app/api/webhooks/mercadopago/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebaseAdmin';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Webhook recibido de MercadoPago');
    
    const body = await request.json();
    console.log('📋 Datos del webhook:', body);

    // ✅ VERIFICAR AUTENTICIDAD (opcional por ahora)
    const signature = request.headers.get('x-signature');
    const requestId = request.headers.get('x-request-id');
    
    // ✅ VERIFICAR QUE ES UNA NOTIFICACIÓN DE PAGO
    if (body.type === 'payment') {
      const paymentId = body.data.id;
      console.log('💳 Payment ID:', paymentId);

      // ✅ AQUÍ PODRÍAS VERIFICAR EL PAGO CON MERCADOPAGO API
      // Por ahora solo procesamos la notificación
      console.log('✅ Procesando pago:', paymentId);

      // ✅ ACTUALIZAR USUARIO EN FIREBASE
      // Los datos del metadata vienen en la notificación
      if (body.data && body.data.metadata) {
        const userId = body.data.metadata.userId;
        const plan = body.data.metadata.plan;

        if (userId && plan) {
          try {
            // Calcular nueva fecha de vencimiento (30 días)
            const fechaVencimiento = new Date();
            fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

            // Actualizar usuario en Firestore
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
        } else {
          console.log('⚠️ No se encontraron userId o plan en metadata');
        }
      }
    } else {
      console.log('ℹ️ Webhook recibido pero no es de tipo payment:', body.type);
    }

    // ✅ SIEMPRE RESPONDER 200 PARA QUE MERCADOPAGO NO REINTENTE
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    
    // ✅ INCLUSO CON ERROR, RESPONDER 200 PARA EVITAR REINTENTOS
    return NextResponse.json(
      { error: 'Error interno', received: true }, 
      { status: 200 }
    );
  }
}

// ✅ MANEJAR GET PARA VERIFICACIÓN
export async function GET() {
  return NextResponse.json({ 
    status: 'Webhook MercadoPago activo',
    timestamp: new Date().toISOString()
  }, { status: 200 });
}