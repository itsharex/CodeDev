import { useState, useEffect } from 'react';
import { getVersion, getName } from '@tauri-apps/api/app';
import { open } from '@tauri-apps/plugin-shell';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Github, Loader2, FileText, AlertCircle, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getText } from '@/lib/i18n';
import { useUsageGuide } from './hooks/useUsageGuide';
import { CodeBlock } from '@/components/ui/CodeBlock';
import iconUrl from '../../../src-tauri/icons/64x64.png';

const REPO_URL = "https://github.com/WinriseF/CtxRun";

export function AboutSection() {
  const { language } = useAppStore();
  const [appVersion, setAppVersion] = useState<string>('');
  const [appName, setAppName] = useState<string>('CtxRun');
  const { content, isLoading, error } = useUsageGuide();

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion('Unknown'));
    getName().then(setAppName).catch(() => setAppName('CtxRun'));
  }, []);

  return (
    // 布局修复:整体滚动容器
    <div className="h-full overflow-y-auto custom-scrollbar bg-background relative">

      {/* Markdown 样式修复:与预览组件保持一致 */}
      <style>{`
        .about-md-body { color: var(--foreground); line-height: 1.6; }
        .about-md-body p { margin-bottom: 0.75em; }
        .about-md-body p:last-child { margin-bottom: 0; }
        .about-md-body code:not(pre code) {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.85em;
          background: rgba(150, 150, 150, 0.1);
          padding: 0.2em 0.4em;
          border-radius: 4px;
          border: 1px solid var(--border);
        }
        .about-md-body h1, .about-md-body h2, .about-md-body h3, .about-md-body h4 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
          line-height: 1.25;
          color: var(--foreground);
        }
        .about-md-body h1:first-child { margin-top: 0; }
        .about-md-body h1 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
        .about-md-body h2 { font-size: 1.25em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
        .about-md-body h3 { font-size: 1.1em; }
        .about-md-body ul, .about-md-body ol { padding-left: 1.5em; margin-bottom: 0.75em; }
        .about-md-body li { margin-bottom: 0.25em; }
        .about-md-body blockquote {
          border-left: 4px solid var(--primary);
          padding-left: 1em;
          margin: 1em 0;
          color: var(--muted-foreground);
          background: var(--secondary);
          padding-top: 0.5em;
          padding-bottom: 0.5em;
          border-radius: 0 4px 4px 0;
        }
        .about-md-body a { color: var(--primary); text-decoration: none; font-weight: 500; }
        .about-md-body a:hover { text-decoration: underline; }
        .about-md-body hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
        .about-md-body img { max-width: 100%; height: auto; border-radius: 0.5em; margin: 1em 0; border: 1px solid var(--border); }
        .about-md-body strong { font-weight: 700; color: var(--foreground); }
      `}</style>

      {/* 头部信息 (随页面滚动) */}
      <div className="flex flex-col items-center justify-center pt-12 pb-8 bg-secondary/5 border-b border-border/30">
        <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img
                src={iconUrl}
                alt="App Icon"
                className="w-24 h-24 drop-shadow-xl relative z-10 transition-transform duration-300 group-hover:scale-105 rounded-2xl"
            />
        </div>

        <h2 className="text-3xl font-bold text-foreground tracking-tight mt-6">{appName}</h2>

        <div className="flex items-center gap-3 mt-3">
            <span className="text-xs font-mono text-muted-foreground bg-secondary/50 px-3 py-0.5 rounded-full border border-border">
                v{appVersion}
            </span>
        </div>

        <div className="flex gap-3 mt-6">
            <button
                onClick={() => open(REPO_URL)}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-sm font-medium transition-all shadow-sm active:scale-95 shadow-primary/20"
            >
                <Github size={16} />
                GitHub
            </button>
            <button
                onClick={() => open(`${REPO_URL}/issues`)}
                className="flex items-center gap-2 px-5 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-full text-sm font-medium transition-all border border-border/50 active:scale-95"
            >
                <AlertCircle size={16} />
                Feedback
            </button>
        </div>
      </div>

      {/* 粘性标题栏 (Sticky Header) */}
      <div className="sticky top-0 z-10 px-8 py-3 border-y border-border/50 bg-background/95 backdrop-blur-md flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider shadow-sm">
         <FileText size={14} />
         {getText('settings', 'usageGuide', language)}
      </div>

      {/* 内容区域 */}
      <div className="p-0 min-h-[300px] relative">
         {isLoading ? (
             <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 opacity-70">
                 <Loader2 size={28} className="animate-spin text-primary" />
                 <span className="text-xs font-medium">{getText('settings', 'loadingUsage', language)}</span>
             </div>
         ) : error ? (
             <div className="flex flex-col items-center justify-center py-20 text-destructive gap-3 opacity-80 p-6 text-center">
                 <div className="p-3 bg-destructive/10 rounded-full">
                     <AlertCircle size={24} />
                 </div>
                 <span className="text-sm font-medium">{error}</span>
                 <button
                     onClick={() => open(`${REPO_URL}/blob/main/USAGE.md`)}
                     className="mt-2 text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                 >
                     {getText('settings', 'viewSource', language)} <ExternalLink size={12} />
                 </button>
             </div>
         ) : (
             <div className="about-md-body px-8 py-8 text-sm max-w-4xl mx-auto">
                 <ReactMarkdown
                     remarkPlugins={[remarkGfm]}
                     components={{
                         // 使用 CodeBlock 组件渲染代码块
                         code({node, inline, className, children, ...props}: any) {
                             const match = /language-(\w+)/.exec(className || '')
                             return !inline && match ? (
                               <CodeBlock language={match[1]} className="text-sm my-4 border border-border/50 shadow-sm">
                                   {String(children).replace(/\n$/, '')}
                               </CodeBlock>
                             ) : (
                               <code className={className} {...props}>
                                 {children}
                               </code>
                             )
                         },
                         // 链接在新窗口打开
                         a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" onClick={(e) => {
                             e.preventDefault();
                             if (props.href) open(props.href);
                         }} />
                     }}
                 >
                     {content}
                 </ReactMarkdown>

                 {/* 底部留白 */}
                 <div className="h-12" />
             </div>
         )}
      </div>
    </div>
  );
}
