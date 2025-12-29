import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';

interface ResumenMes {
  totalMes: number;
  cantidadGastos: number;
  ultimaActualizacion: Date;
}

export async function POST(request: NextRequest) {
  try {
    // Obtener datos del body
    const body = await request.json();
    const { monto, categoria, descripcion, metodoPago, tipo, negocioID } = body;

    // Validación
    if (!monto || !categoria || !negocioID) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Faltan campos requeridos',
          required: ['monto', 'categoria', 'negocioID']
        },
        { status: 400 }
      );
    }

    // Validar que monto sea un número válido
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'El monto debe ser un número positivo'
        },
        { status: 400 }
      );
    }

    const ahora = new Date();
    const mesGasto = ahora.toISOString().slice(0, 7); // YYYY-MM

    // Crear objeto de gasto
    const gastoData = {
      monto: montoNum,
      categoria,
      descripcion: descripcion || '',
      metodoPago: metodoPago || 'efectivo',
      tipo: tipo || 'personal',
      fecha: ahora.toLocaleDateString('es-AR'),
      fechaCompleta: ahora,
      usuario: 'Siri Shortcut',
      negocioID,
      creadoDesde: 'atajo_ios'
    };

    // 1. Guardar el gasto en Firebase
    const docRef = await addDoc(
      collection(db, `negocios/${negocioID}/gastos`),
      gastoData
    );

    // 2. Actualizar resumen del mes (suma incremental, no recalcular)
    const resumenRef = doc(db, `negocios/${negocioID}/gastosResumen/${mesGasto}`);
    const resumenSnap = await getDoc(resumenRef);
    
    if (resumenSnap.exists()) {
      // Ya existe resumen → Solo sumar
      const resumenActual = resumenSnap.data() as ResumenMes;
      await setDoc(resumenRef, {
        totalMes: resumenActual.totalMes + montoNum,
        cantidadGastos: resumenActual.cantidadGastos + 1,
        ultimaActualizacion: ahora
      });
    } else {
      // Primera vez este mes → Crear resumen
      await setDoc(resumenRef, {
        totalMes: montoNum,
        cantidadGastos: 1,
        ultimaActualizacion: ahora
      });
    }

    // Respuesta exitosa en español para Siri
    return NextResponse.json({
      success: true,
      id: docRef.id,
      mensaje: `Gasto de $${montoNum.toLocaleString('es-AR')} registrado en ${categoria}`,
      data: {
        monto: montoNum,
        categoria,
        descripcion: gastoData.descripcion,
        fecha: gastoData.fecha,
        mes: mesGasto
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error en API gastos/agregar:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al guardar el gasto',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Endpoint GET para documentación
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/gastos/agregar',
    method: 'POST',
    descripcion: 'Registrar un nuevo gasto desde Siri Shortcuts',
    requiredFields: {
      monto: 'number - Monto del gasto (mayor a 0)',
      categoria: 'string - Categoría del gasto',
      negocioID: 'string - ID del negocio'
    },
    optionalFields: {
      descripcion: 'string - Descripción opcional',
      metodoPago: 'string - efectivo, tarjeta, transferencia, mercadopago (default: efectivo)',
      tipo: 'string - personal o negocio (default: personal)'
    },
    categorias: [
      'Comida',
      'Transporte',
      'Hogar',
      'Salud',
      'Entretenimiento',
      'Servicios',
      'Compras',
      'Educación',
      'Trabajo',
      'Otros'
    ],
    example: {
      monto: 5000,
      categoria: 'Comida',
      descripcion: 'Almuerzo',
      metodoPago: 'efectivo',
      tipo: 'personal',
      negocioID: 'abc123'
    },
    respuesta_exitosa: {
      success: true,
      id: 'gasto_id',
      mensaje: 'Gasto de $5,000 registrado en Comida',
      data: {
        monto: 5000,
        categoria: 'Comida',
        descripcion: 'Almuerzo',
        fecha: '29/12/2024',
        mes: '2024-12'
      }
    }
  });
}