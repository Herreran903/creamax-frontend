'use client';
import * as React from 'react';

export default function FinalStep() {
  return (
    <div className="text-white space-y-2">
      <h3 className="text-xl font-semibold">¡Listo!</h3>
      <p>
        Tu pedido fue registrado con estado <b>PENDIENTE_REVISION</b>. Te contactaremos para
        confirmar detalles.
      </p>
    </div>
  );
}
