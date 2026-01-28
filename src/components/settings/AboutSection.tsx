import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { open } from '@tauri-apps/plugin-shell';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Github, Loader2, FileText, AlertCircle, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getText } from '@/lib/i18n';
import { useUsageGuide } from './hooks/useUsageGuide';
import iconUrl from '../../../src-tauri/icons/64x64.png';

const REPO_URL = "https://github.com/WinriseF/CtxRun";

export function AboutSection() {
  const { language } = useAppStore();
  const [appVersion, setAppVersion] = useState<string>('');
  const { content, isLoading, error } = useUsageGuide();

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion('Unknown'));
  }, []);

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-200">

      {/* Header Info */}
      <div className="flex flex-col items-center justify-center py-6 shrink-0 border-b border-border/50 bg-secondary/5">
        <img src={iconUrl} alt="CtxRun" className="w-16 h-16 rounded-2xl shadow-lg mb-3" />
        <h2 className="text-xl font-bold text-foreground tracking-tight">CtxRun</h2>
        <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                v{appVersion}
            </span>
        </div>

        <div className="flex gap-3 mt-4">
            <button
                onClick={() => open(REPO_URL)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-xs font-medium transition-all shadow-sm active:scale-95"
            >
                <Github size={14} />
                GitHub
            </button>
            <button
                onClick={() => open(`${REPO_URL}/issues`)}
                className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-full text-xs font-medium transition-all border border-border/50 active:scale-95"
            >
                <AlertCircle size={14} />
                Feedback
            </button>
        </div>
      </div>

      {/* Usage Guide Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative min-h-0 bg-background">
         <div className="px-6 py-3 border-b border-border/50 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-secondary/10 shrink-0">
            <FileText size={14} />
            {getText('settings', 'usageGuide', language)}
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 opacity-70">
                    <Loader2 size={24} className="animate-spin text-primary" />
                    <span className="text-xs">{getText('settings', 'loadingUsage', language)}</span>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-destructive gap-2 opacity-80">
                    <AlertCircle size={24} />
                    <span className="text-xs">{error}</span>
                    <button
                        onClick={() => open(`${REPO_URL}/blob/main/USAGE.md`)}
                        className="mt-2 text-xs flex items-center gap-1 hover:underline underline-offset-4"
                    >
                        {getText('settings', 'viewSource', language)} <ExternalLink size={10} />
                    </button>
                </div>
            ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-secondary/50 prose-pre:border prose-pre:border-border/50">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => {
                                e.preventDefault();
                                if (props.href) open(props.href);
                            }} />
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            )}
         </div>
      </div>
    </div>
  );
}
