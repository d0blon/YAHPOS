'use client';

import { useState } from 'react';

interface ResolucionStepProps {
  onComplete: (data: {
    nroResol: number;
    fchResol: string;
    acteco?: number;
  }) => void;
}

export function ResolucionStep({ onComplete }: ResolucionStepProps) {
  const [nroResol, setNroResol] = useState('');
  const [fchResol, setFchResol] = useState('');
  const [acteco, setActeco] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nroResol || !fchResol) {
      setError('Por favor ingresa el número y fecha de resolución');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/wizard/resolucion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nroResol: parseInt(nroResol),
          fchResol,
          acteco: acteco ? parseInt(acteco) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error desconocido');
      }

      onComplete(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar resolución');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Paso 3: Resolución SII</h2>
      <p className="text-gray-600 mb-6">
        Ingresa los datos de tu resolución del SII. Obtén estos datos del portal SII después de aprobar la certificación.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">
            Número de Resolución
          </label>
          <input
            type="number"
            value={nroResol}
            onChange={(e) => setNroResol(e.target.value)}
            placeholder="Ej: 80"
            min={0}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Número de resolución que te asignó el SII
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Fecha de Resolución
          </label>
          <input
            type="date"
            value={fchResol}
            onChange={(e) => setFchResol(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Fecha en que el SII emitió la resolución
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Código de Actividad Económica (Acteco)
          </label>
          <input
            type="number"
            value={acteco}
            onChange={(e) => setActeco(e.target.value)}
            placeholder="Ej: 471101 (opcional)"
            min={0}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Obligatorio para facturas y notas. Opcional para boletas.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !nroResol || !fchResol}
          className="w-full bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Guardar Resolución'}
        </button>
      </form>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">¿No tienes resolución aún?</h3>
        <p className="text-sm text-yellow-800">
          Debes completar el proceso de certificación con el SII primero. El SII te asignará un número de resolución después de aprobar tus documentos de prueba.
        </p>
        <p className="text-sm text-yellow-800 mt-2">
          <strong>Importante:</strong> No puedes emitir DTE reales sin una resolución del SII.
        </p>
      </div>
    </div>
  );
}
