'use client';

import { useState } from 'react';
import { CertificadoStep } from './steps/CertificadoStep';
import { CafStep } from './steps/CafStep';
import { ResolucionStep } from './steps/ResolucionStep';
import { PruebaStep } from './steps/PruebaStep';
import { ProgressBar } from './components/ProgressBar';
import { StepNavigation } from './components/StepNavigation';

export interface WizardData {
  certificado?: {
    rut: string;
    razonSocial: string;
    notBefore: string;
    notAfter: string;
  };
  caf?: {
    tipoDte: number;
    folioDesde: number;
    folioHasta: number;
    totalFolios: number;
  };
  resolucion?: {
    nroResol: number;
    fchResol: string;
    acteco?: number;
  };
  prueba?: {
    folio: number;
  };
}

const STEPS = [
  { id: 1, title: 'Certificado Digital', description: 'Sube tu archivo .pfx' },
  { id: 2, title: 'CAF (Folios)', description: 'Carga o solicita folios al SII' },
  { id: 3, title: 'Resolución SII', description: 'Ingresa tu resolución' },
  { id: 4, title: 'Prueba', description: 'Emite un DTE de prueba' },
];

export default function WizardPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({});

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CertificadoStep
            onComplete={(data) => {
              setWizardData({ ...wizardData, certificado: data });
              handleNext();
            }}
          />
        );
      case 2:
        return (
          <CafStep
            onComplete={(data) => {
              setWizardData({ ...wizardData, caf: data });
              handleNext();
            }}
          />
        );
      case 3:
        return (
          <ResolucionStep
            onComplete={(data) => {
              setWizardData({ ...wizardData, resolucion: data });
              handleNext();
            }}
          />
        );
      case 4:
        return (
          <PruebaStep
            wizardData={wizardData}
            onComplete={(data) => {
              setWizardData({ ...wizardData, prueba: data });
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configurar Facturación Electrónica</h1>
        <p className="text-gray-600">
          Completa estos 4 pasos para comenzar a emitir DTE con YAHPOS!
        </p>
      </div>

      <ProgressBar currentStep={currentStep} totalSteps={STEPS.length} steps={STEPS} />

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        {renderStep()}

        {currentStep < 4 && (
          <StepNavigation
            currentStep={currentStep}
            totalSteps={STEPS.length}
            onBack={handleBack}
            canGoBack={currentStep > 1}
          />
        )}
      </div>

      {currentStep === 4 && wizardData.prueba && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-green-900 mb-2">
            ✅ ¡Configuración Completa!
          </h2>
          <p className="text-green-800 mb-4">
            Tu DTE de prueba fue emitido correctamente (folio {wizardData.prueba.folio}).
            Ya puedes comenzar a emitir DTE reales.
          </p>
          <a
            href="/admin/facturacion"
            className="inline-block bg-brand-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-primary/90 transition"
          >
            Ir a Facturación
          </a>
        </div>
      )}
    </div>
  );
}
