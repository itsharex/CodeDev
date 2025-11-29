import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'warning' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  show: boolean;
  onDismiss: () => void;
}

const ICONS = {
  success: <CheckCircle2 size={20} className="text-green-500" />,
  warning: <AlertTriangle size={20} className="text-yellow-500" />,
  error: <XCircle size={20} className="text-red-500" />,
};

export function Toast({ message, type, show, onDismiss }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 2500); // 持续 2.5 秒
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return (
    <div
      className={cn(
        "fixed bottom-5 left-5 z-[100] flex items-center gap-4 w-auto max-w-sm p-4 pr-6 rounded-xl border bg-background shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 ease-in-out",
        show
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <div className="shrink-0">{ICONS[type]}</div>
      <div className="flex-1 text-sm font-medium text-foreground">
        {message}
      </div>
    </div>
  );
}