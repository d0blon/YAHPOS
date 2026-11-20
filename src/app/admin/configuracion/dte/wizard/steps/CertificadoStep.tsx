'use client';

import { useState } from 'react';

interface CertificadoStepProps {
  onComplete: (data: {
    rut: string;
    razonSocial: string;
    notBefore: string;
    notAfter: string;
  }) => void;
}

export function CertificadoStep({ onComplete }: CertificadoStepProps) {
  const [pfxFile, setPfxFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pfxFile || !password) {
      setError('Por favor sube el archivo .pfx e ingresa la contraseña');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('pfx', pfxFile);
      formData.append('password', password);

      const response = await fetch('/api/wizard/certificado', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Error desconocido');
      }

      onComplete(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir certificado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Paso 1: Certificado Digital</h2>
      <p className="text-gray-600 mb-6">
        Sube tu archivo .pfx (certificado digital emitido por una notaría autorizada por el SII).
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">
            Archivo .pfx
          </label>
          <input
            type="file"
            accept=".pfx,.p12"
            onChange={(e) => setPfxFile(e.target.files?.[0] || null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Formato aceptado: .pfx o .p12
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Contraseña del certificado
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa la contraseña del .pfx"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !pfxFile || !password}
          className="w-full bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Validando certificado...' : 'Subir y Validar Certificado'}
        </button>
      </form>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">¿No tienes certificado digital?</h3>
        <p className="text-sm text-blue-800">
          Debes obtener un certificado digital (.pfx) de una notaría autorizada por el SII.
          El costo es de $30.000 a $80.000 pesos chilenos al año.
        </p>
        <p className="text-sm text-blue-800 mt-2">
          Notarías recomendadas: Notaría Central, Notaría Moderna, Notaría Española.
        </p>
      </div>
    </div>
  );
}
