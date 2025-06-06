// lib/mercadopago.ts
const crearSuscripcion = async (planId: string, userEmail: string) => {
    const response = await fetch('/api/mercadopago/crear-suscripcion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: planId,
        email: userEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: planId === 'pro' ? 25 : 15
        }
      })
    });
    
    return response.json();
  };