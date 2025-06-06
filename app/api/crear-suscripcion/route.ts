// app/api/crear-suscripcion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { auth, db } from '@/lib/firebaseAdmin'; // ✅ IMPORT CORREGIDO (nota la A mayúscula)

// ✅ CONFIGURAR MERCADOPAGO CON TUS CREDENCIALES
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!, // Tu token de MercadoPago
  options: { 
    timeout: 5000,
    idempotencyKey: 'abc'
  }
});

const preference = new Preference(client);

export async function POST(request: NextRequest) {
  try {
    const { plan, userId, userEmail } = await request.json(); // ✅ AGREGAR userEmail
    
    console.log('📥 Datos recibidos:', { plan, userId, userEmail });
    
    // ✅ DEFINIR PRECIOS
    const planes = {
        basico: { precio: 100, nombre: 'Plan Básico' },  // ← Cambiar de 45000 a 100
        pro: { precio: 200, nombre: 'Plan Pro' }         // ← Cambiar de 85000 a 200
      };
    const planSeleccionado = planes[plan as keyof typeof planes];
    
    if (!planSeleccionado) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }

    console.log('💰 Plan seleccionado:', planSeleccionado);

    // ✅ CREAR PREFERENCIA DE PAGO
    const preferenceData = {
      items: [
        {
          id: `plan-${plan}`,
          title: planSeleccionado.nombre,
          category_id: 'subscription',
          quantity: 1,
          currency_id: 'ARS', // Pesos argentinos
          unit_price: planSeleccionado.precio
        }
      ],
      payer: {
        email: userEmail || 'usuario@email.com' // ✅ USAR EMAIL REAL DEL USUARIO
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_URL}/paginas-retorno/pago-exitoso`,
        failure: `${process.env.NEXT_PUBLIC_URL}/paginas-retorno/pago-fallido`,
        pending: `${process.env.NEXT_PUBLIC_URL}/paginas-retorno/pago-pendiente`
      },
      auto_return: 'approved',
      notification_url: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/mercadopago`,
      metadata: {
        userId: userId,
        plan: plan
      }
    };

    console.log('🔧 Creando preferencia:', preferenceData);

    const result = await preference.create({ body: preferenceData });

    console.log('✅ Preferencia creada:', result.id);

    return NextResponse.json({
      preferenceId: result.id,
      initPoint: result.init_point // URL para redirigir al usuario
    });

  } catch (error) {
    console.error('❌ Error creando preferencia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}