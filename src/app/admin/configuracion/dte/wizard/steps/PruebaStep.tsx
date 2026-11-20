'use client';

import { useState } from 'react';
import { WizardData } from '../page';

interface PruebaStepProps {
  wizardData: WizardData;
  onComplete: (data: { folio: number }) => void;
}

export function PruebaStep({ wizardData, onComplete }: PruebaStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<{ folio: number } | null>(null);

  const handleEmitir = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/wizard/prueba', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Error desconocido');
      }

      setResultado({ folio: data.data.folio });
      onComplete({ folio: data.data.folio });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al emitir DTE de prueba');
    } finally {
      setLoading(false);
    }
  };

  const resumen = (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-gray-900 mb-3">Resumen de tu configuración:</h3>
      <div className="space-y-2 text-sm">
        {wizardData.certificado && (
          <div className="flex justify-between">
            <span className="text-gray-600">✅ Certificado:</span>
            <span className="font-mono text-gray-900">
              {wizardData.certificado.rut} ({wizardData.certificado.razonSocial})
            </span>
          </div>
        )}
        {wizardData.caf && (
          <div className="flex justify-between">
            <span className="text-gray-600">✅ CAF:</span>
            <span className="font-mono text-gray-900">
              Tipo {wizardData.caf.tipoDte}, folios {wizardData.caf.folioDesde}-{wizardData.caf.folioHasta}
            </span>
          </div>
        )}
        {wizardData.resolucion && (
          <div className="flex justify-between">
            <span className="text-gray-600">✅ Resolución:</span>
            <span className="font-mono text-gray-900">
              N°{wizardData.resolucion.nroResol} del {wizardData.resolucion.fchResol}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Paso 4: Prueba</h2>
      <p className="text-gray-600 mb-6">
        Emite un DTE de prueba para validar que todo esté configurado correctamente.
      </p>

      {resumen}

      {!resultado && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">¿Qué se emitirá?</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              <li>Boleta tipo 39 (boleta electrónica)</li>
              <li>Por $1.000 pesos</li>
              <li>Consumidor Final (RUT 66.666.666-6)</li>
              <li>Producto: &quot;Producto de prueba&quot;</li>
              <li><strong>Este DTE es solo de prueba, NO se envía al SII</strong></li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          <button
            onClick={handleEmitir}
            disabled={loading}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Emitiendo DTE de prueba...' : '🚀 Emitir DTE de Prueba'}
          </button>
        </div>
      )}

      {resultado && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">
            ✅ ¡DTE de prueba emitido correctamente!
          </h3>
          <p className="text-sm text-green-800 mb-3">
            Folio: <strong>{resultado.folio}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
