'use client';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  canGoBack: boolean;
}

export function StepNavigation({
  currentStep,
  totalSteps,
  onBack,
  canGoBack,
}: StepNavigationProps) {
  return (
    <div className="flex justify-between mt-6 pt-6 border-t">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={`px-6 py-2 rounded-lg font-semibold transition ${
          canGoBack
            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        ← Atrás
      </button>
      <div className="text-sm text-gray-500 self-center">
        Paso {currentStep} de {totalSteps}
      </div>
    </div>
  );
}
