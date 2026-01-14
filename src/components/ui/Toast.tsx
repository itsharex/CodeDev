import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  show: boolean;
  onDismiss: () => void;
}

const ICONS = {
  success: <CheckCircle2 size={20} className="text-green-500" />,
  warning: <AlertTriangle size={20} className="text-yellow-500" />,
  error: <XCircle size={20} className="text-red-500" />,
  info: <Info size={20} className="text-blue-500" />,
};

export function Toast({ message, type = 'success', show, onDismiss }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[100] flex items-center gap-3 min-w-[300px] max-w-sm p-4 rounded-xl border bg-background/95 backdrop-blur-md shadow-2xl transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)",
        show
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-8 scale-95 pointer-events-none"
      )}
    >
      <div className="shrink-0 p-1 bg-secondary/50 rounded-full">{ICONS[type]}</div>
      <div className="flex-1 text-sm font-medium text-foreground leading-relaxed">
        {message}
      </div>

      {show && (
        <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-secondary/50 rounded-full overflow-hidden">
            <div className="h-full bg-primary/50 animate-[progress_3s_linear_forwards]" />
        </div>
      )}
      
      <style>{`
        @keyframes progress {
            from { width: 100%; }
            to { width: 0%; }
        }
      `}</style>
    </div>
  );
}