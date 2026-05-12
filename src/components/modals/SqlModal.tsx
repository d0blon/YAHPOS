import React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface SqlModalProps {
  show: boolean;
  onClose: () => void;
}

const SqlModal: React.FC<SqlModalProps> = ({ show, onClose }) => {
  if (!show) return null;
  const sql = `CREATE TABLE IF NOT EXISTS public.terminals (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id                    SERIAL PRIMARY KEY,
  terminal_id           INTEGER REFERENCES public.terminals(id),
  cashier_name          TEXT,
  opened_at             TIMESTAMPTZ DEFAULT NOW(),
  closed_at             TIMESTAMPTZ,
  opening_amount        NUMERIC(12,0) NOT NULL,
  closing_amount        NUMERIC(12,0),
  total_cash_sales      NUMERIC(12,0) DEFAULT 0,
  total_card_sales      NUMERIC(12,0) DEFAULT 0,
  total_transfer_sales  NUMERIC(12,0) DEFAULT 0,
  notes                 TEXT,
  status                TEXT DEFAULT 'open'
);

ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.terminals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.cash_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all_settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.terminals (name, description) VALUES ('Caja 1', 'Terminal principal') ON CONFLICT DO NOTHING;`;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-20 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl p-8 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black">Crear tabla en Supabase</h3>
        <p className="text-sm text-gray-500">Copia y pega este SQL en <strong>Supabase Studio → SQL Editor</strong> y ejecuta (Run):</p>
        <div className="relative">
          <pre className="bg-gray-950 text-green-400 text-xs p-4 rounded-xl overflow-x-auto font-mono leading-relaxed">
            {sql}
          </pre>
          <button
            className="absolute top-3 right-3 bg-gray-800 text-white text-xs px-3 py-1 rounded-lg hover:bg-gray-700"
            onClick={() => {
              navigator.clipboard.writeText(sql);
              toast.success('SQL copiado al portapapeles');
            }}
          >
            Copiar
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Después de ejecutarlo, regresa aquí y haz clic en <strong>Inicializar BD</strong> nuevamente.
        </p>
        <Button onClick={onClose} className="w-full rounded-xl">Cerrar</Button>
      </div>
    </div>
  );
};

export default SqlModal;
