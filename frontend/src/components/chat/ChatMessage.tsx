import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TriangleAlert } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

/** Split warning callouts (lines starting with ⚠) from the main markdown body. */
function splitWarnings(content: string): { body: string; warnings: string[] } {
  const lines = content.split('\n');
  const bodyLines: string[] = [];
  const warnings: string[] = [];
  let inWarning = false;
  let currentWarning = '';

  for (const line of lines) {
    if (line.trimStart().startsWith('⚠')) {
      if (inWarning && currentWarning) warnings.push(currentWarning.trim());
      currentWarning = line.trimStart().replace(/^⚠\s*/, '');
      inWarning = true;
    } else if (inWarning) {
      // Continuation of a warning block (indented or empty)
      if (line.trim() === '' || line.startsWith(' ') || line.startsWith('\t')) {
        currentWarning += ' ' + line.trim();
      } else {
        warnings.push(currentWarning.trim());
        currentWarning = '';
        inWarning = false;
        bodyLines.push(line);
      }
    } else {
      bodyLines.push(line);
    }
  }
  if (inWarning && currentWarning) warnings.push(currentWarning.trim());

  return { body: bodyLines.join('\n').trim(), warnings };
}

function AssistantBubble({ content }: { content: string }) {
  const { body, warnings } = splitWarnings(content);

  return (
    <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-[#f3f3f3] border border-[#e8e8e8] px-3.5 py-2.5 text-[13px] text-[#222]">
      {body && (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="text-[13px] text-[#333] leading-relaxed mb-2 last:mb-0">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-[13px] text-[#444] leading-relaxed">{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-[#111]">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-[#444]">{children}</em>
            ),
            code: ({ children, className }) => {
              const isBlock = !!className;
              if (isBlock) {
                return (
                  <code className="block bg-[#1a1a1a] text-[#e5e5e5] font-mono text-[12px] leading-relaxed p-3 rounded-xl overflow-x-auto whitespace-pre">
                    {children}
                  </code>
                );
              }
              return (
                <code className="bg-[#f4f4f4] border border-[#e5e5e5] rounded px-1 py-0.5 font-mono text-[11px] text-[#444]">
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="mb-2 rounded-xl overflow-hidden">{children}</pre>
            ),
            h1: ({ children }) => (
              <h1 className="text-[14px] font-semibold text-[#111] mb-2 mt-3 first:mt-0">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-[13px] font-semibold text-[#222] mb-1.5 mt-2.5 first:mt-0">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-[12px] font-semibold text-[#333] mb-1 mt-2 first:mt-0">{children}</h3>
            ),
            hr: () => <hr className="border-[#e5e5e5] my-3" />,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-[#d4d4d4] pl-3 my-2 text-[#666] italic">
                {children}
              </blockquote>
            ),
          }}
        >
          {body}
        </ReactMarkdown>
      )}

      {warnings.map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-[12px] mt-2 leading-relaxed"
        >
          <TriangleAlert size={13} className="shrink-0 mt-0.5" />
          <span>{w}</span>
        </div>
      ))}
    </div>
  );
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#1a1a1a] text-white px-3.5 py-2.5 text-[13px] leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <AssistantBubble content={content} />
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-sm bg-[#f3f3f3] border border-[#e8e8e8] px-3.5 py-3">
        <div className="flex gap-1 items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#bbb] animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#bbb] animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#bbb] animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
