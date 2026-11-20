'use client';

import { useState } from 'react';

function safeCafDetail(value: unknown): string {
  if (typeof value === 'string') {
    const text = value.trim();
    return text.length <= 400 && !/-----BEGIN|<[A-Za-z!/]|[A-Za-z0-9+/]{80,}/.test(text) ? text : '';
  }
  if (Array.isArray(value)) {
    return value.map(safeCafDetail).filter(Boolean).join('; ');
  }
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    const message = safeCafDetail(item.message);
    const path = typeof item.path === 'string' && /^[A-Za-z0-9_.-]{1,60}$/.test(item.path) ? item.path : '';
    return message && path ? `${path}: ${message}` : message;
  }
  return '';
}

function cafErrorMessage(data: unknown, fallback: string): string {
  const payload = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const rawCode = typeof payload.code === 'string' ? payload.code.trim() : '';
  const code = /^[A-Za-z0-9_-]{2,40}$/.test(rawCode) ? rawCode : '';
  const rawError = typeof payload.error === 'string' ? payload.error.trim() : '';
  const error = rawError && rawError.length <= 400 && !/-----BEGIN|<[A-Za-z!/]|[A-Za-z0-9+/]{80,}/.test(rawError) ? rawError : fallback;
  const details = safeCafDetail(payload.details);
  return [code ? `[${code}]` : '', error, details].filter(Boolean).join(' — ');
}

interface CafStepProps {
  onComplete: (data: {
    tipoDte: number;
    folioDesde: number;
    folioHasta: number;
    totalFolios: number;
  }) => void;
}

export function CafStep({ onComplete }: CafStepProps) {
  const [modo, setModo] = useState<'cargar' | 'solicitar'>('cargar');
  const [cafFile, setCafFile] = useState<File | null>(null);
  const [tipoDte, setTipoDte] = useState(39);
  const [folioDesde, setFolioDesde] = useState(1);
  const [folioHasta, setFolioHasta] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [solicitudGenerada, setSolicitudGenerada] = useState(false);

  const handleCargar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cafFile) {
      setError('Por favor sube el archivo CAF');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('caf', cafFile);

      const response = await fetch('/api/wizard/caf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(cafErrorMessage(data, 'Error desconocido'));
      }

      onComplete(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar CAF');
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);

    try {
      const response = await fetch('/api/wizard/caf/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoDte, folioDesde, folioHasta }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(cafErrorMessage(data, 'Error desconocido'));
      }

      setSolicitudGenerada(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Paso 2: CAF (Folios)</h2>
      <p className="text-gray-600 mb-6">
        Carga los folios autorizados por el SII (CAF) o solicita nuevos folios.
      </p>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setModo('cargar')}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
            modo === 'cargar'
              ? 'bg-brand-primary text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Ya tengo un CAF
        </button>
        <button
          onClick={() => setModo('solicitar')}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
            modo === 'solicitar'
              ? 'bg-brand-primary text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Solicitar CAF al SII
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {modo === 'cargar' && (
        <form onSubmit={handleCargar} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Archivo CAF (.xml o .dat)
            </label>
            <input
              type="file"
              accept=".xml,.dat"
              onChange={(e) => setCafFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !cafFile}
            className="w-full bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando CAF...' : 'Cargar CAF'}
          </button>
        </form>
      )}

      {modo === 'solicitar' && !solicitudGenerada && (
        <form onSubmit={handleSolicitar} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Tipo de Documento
            </label>
            <select
              value={tipoDte}
              onChange={(e) => setTipoDte(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              disabled={loading}
            >
              <option value={39}>Boleta Electrónica (39)</option>
              <option value={41}>Boleta Exenta (41)</option>
              <option value={33}>Factura Electrónica (33)</option>
              <option value={34}>Factura Exenta (34)</option>
              <option value={61}>Nota de Crédito (61)</option>
              <option value={56}>Nota de Débito (56)</option>
              <option value={52}>Guía de Despacho (52)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Folio Desde
              </label>
              <input
                type="number"
                value={folioDesde}
                onChange={(e) => setFolioDesde(parseInt(e.target.value))}
                min={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">
                Folio Hasta
              </label>
              <input
                type="number"
                value={folioHasta}
                onChange={(e) => setFolioHasta(parseInt(e.target.value))}
                min={folioDesde}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generando solicitud...' : 'Generar Solicitud de CAF'}
          </button>
        </form>
      )}

      {modo === 'solicitar' && solicitudGenerada && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">
              ✅ Solicitud generada
            </h3>
            <p className="text-sm text-green-800 mb-3">
              Sigue estas instrucciones en el portal SII:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-green-800">
              <li>Ingresa al portal SII (www.sii.cl)</li>
              <li>Ve a: Factura Electrónica &gt; Solicitar Folios</li>
              <li>Genera y descarga el XML firmado con tu certificado</li>
              <li>El SII te devolverá un CAF firmado</li>
              <li>Vuelve a esta página y carga el CAF recibido</li>
            </ol>
          </div>

          <button
            onClick={() => setModo('cargar')}
            className="w-full bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-primary/90 transition"
          >
            Ya tengo el CAF, cargarlo
          </button>
        </div>
      )}
    </div>
  );
}
