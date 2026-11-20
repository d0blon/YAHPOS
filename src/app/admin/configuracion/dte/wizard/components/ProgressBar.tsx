'use client';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  steps: Step[];
}

export function ProgressBar({ currentStep, totalSteps, steps }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex flex-col items-center flex-1 ${
              step.id <= currentStep ? 'text-brand-primary' : 'text-gray-400'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                step.id < currentStep
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : step.id === currentStep
                  ? 'bg-white text-brand-primary border-brand-primary'
                  : 'bg-white text-gray-400 border-gray-300'
              }`}
            >
              {step.id < currentStep ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                step.id
              )}
            </div>
            <div className="text-xs mt-2 text-center">
              <div className="font-semibold">{step.title}</div>
              <div className="text-xs opacity-75">{step.description}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="relative mt-4">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gray-200 rounded">
          <div
            className="h-full bg-brand-primary rounded transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
