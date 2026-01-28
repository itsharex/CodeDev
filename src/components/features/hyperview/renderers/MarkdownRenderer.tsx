import { useEffect, useState } from "react";
import { FileMeta } from "@/types/hyperview";
import { readTextFile } from "@tauri-apps/plugin-fs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2 } from "lucide-react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { cn } from "@/lib/utils";

export function MarkdownRenderer({ meta }: { meta: FileMeta }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (meta.size > 1024 * 1024 * 2) { // > 2MB
             setContent("# File too large\n\nPreviewing large markdown files is disabled for performance.");
        } else {
             const text = await readTextFile(meta.path);
             setContent(text);
        }
      } catch (e) {
        setContent(`# Error\n\nCould not read file: ${e}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [meta.path]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-muted-foreground"/></div>;

  return (
    <>
      {/* Markdown 样式 - 与 AI 聊天保持一致 */}
      <style>{`
        .markdown-body p { margin-bottom: 0.5em; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body pre { margin: 0.5em 0; }
        .markdown-body code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.9em; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 { margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; line-height: 1.25; }
        .markdown-body h1:first-child, .markdown-body h2:first-child, .markdown-body h3:first-child { margin-top: 0; }
        .markdown-body h1 { font-size: 2em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; }
        .markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; }
        .markdown-body h3 { font-size: 1.25em; }
        .markdown-body ul, .markdown-body ol { padding-left: 2em; margin-bottom: 0.5em; }
        .markdown-body li { margin-bottom: 0.25em; }
        .markdown-body table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .markdown-body table th, .markdown-body table td { border: 1px solid rgba(255,255,255,0.1); padding: 0.5em; }
        .markdown-body table th { background: rgba(255,255,255,0.05); font-weight: 600; }
        .markdown-body blockquote { border-left: 4px solid rgba(168,85,247,0.5); padding-left: 1em; margin: 1em 0; color: rgba(255,255,255,0.6); }
        .markdown-body a { color: #a855f7; text-decoration: none; }
        .markdown-body a:hover { text-decoration: underline; }
        .markdown-body hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 2em 0; }
        .markdown-body img { max-width: 100%; height: auto; border-radius: 0.5em; margin: 1em 0; }
      `}</style>
      <div className="h-full w-full overflow-y-auto custom-scrollbar bg-background">
        <div className="markdown-body max-w-4xl mx-auto p-8 text-sm leading-relaxed text-foreground">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({node, inline, className, children, ...props}: any) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <CodeBlock language={match[1]} className="text-sm">
                      {String(children).replace(/\n$/, '')}
                  </CodeBlock>
                ) : (
                  <code className={cn("bg-secondary/50 px-1.5 py-0.5 rounded font-mono", className)} {...props}>
                    {children}
                  </code>
                )
              },
              a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </>
  );
}
