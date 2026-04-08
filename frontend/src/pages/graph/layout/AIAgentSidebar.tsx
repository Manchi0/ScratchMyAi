import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bot, PanelRightClose, PanelRightOpen, Send } from 'lucide-react';

import { askAssistant, type AssistantMessagePayload } from '@/lib/assistantFunctions';
import { useStore } from '@/store/useStore';
import { ChatMessage, TypingIndicator } from '@/components/chat/ChatMessage';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function inferDataset(nodes: ReturnType<typeof useStore.getState>['nodes']): string {
  const datasetNode = nodes.find((node) => (node.data as Record<string, any>)?.blockType === 'dataset');
  if (!datasetNode) return 'unspecified';
  const params = ((datasetNode.data as Record<string, any>)?.params ?? {}) as Record<string, any>;
  return String(params.dataset_source ?? 'unspecified');
}

export function AIAgentSidebar() {
  const title = useStore((state) => state.title);
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const trainingConfig = useStore((state) => state.trainingConfig);
  const lastTrainingResult = useStore((state) => state.lastTrainingResult);

  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Ask me about your graph — I can suggest missing blocks, parameter fixes, and training improvements.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graphSnapshot = useMemo(
    () => ({
      title,
      dataset: inferDataset(nodes),
      nodes,
      edges,
      training_config: trainingConfig,
    }),
    [title, nodes, edges, trainingConfig]
  );

  useEffect(() => {
    const el = document.getElementById('ai-agent-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  const sendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMsg = { id: `user-${Date.now()}`, role: 'user', content: trimmed };
    const history: AssistantMessagePayload[] = messages.map((m) => ({ role: m.role, content: m.content }));

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const response = await askAssistant({
        provider: 'openai',
        message: trimmed,
        history,
        graph: graphSnapshot,
        training_results: lastTrainingResult ?? null,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.reply || 'No response returned.',
        },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Failed to contact AI assistant');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <aside
      className={`hidden lg:flex border-l border-[#e8e7e2] bg-white h-full transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-[360px]'
      }`}
    >
      <div className="flex h-full w-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e8e8e8] px-3 py-3 bg-white shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-[#555]" />
              <div>
                <h3 className="text-[13px] font-semibold text-[#111]">AI Tutor</h3>
                <p className="text-[11px] text-[#999]">{nodes.length} blocks · {edges.length} connections</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-md p-1.5 text-[#999] hover:text-[#333] hover:bg-[#f5f5f5] transition-colors ml-auto"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
          </button>
        </div>

        {collapsed ? (
          <div className="flex flex-1 flex-col items-center justify-start gap-4 py-4 text-[#bbb]">
            <Bot size={16} />
          </div>
        ) : (
          <>
            {/* Messages */}
            <div id="ai-agent-messages" className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((message) => (
                <ChatMessage key={message.id} role={message.role} content={message.content} />
              ))}
              {isSending && <TypingIndicator />}
            </div>

            {error && <div className="px-4 pb-2 text-[11px] text-red-500">{error}</div>}

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-[#e8e8e8]">
              <div className="relative flex flex-col border border-[#e5e5e5] rounded-xl bg-white focus-within:ring-1 focus-within:ring-[#111] focus-within:border-[#111] transition-all">
                <textarea
                  rows={3}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask about your graph…"
                  className="w-full resize-none bg-transparent border-0 focus:ring-0 p-3 pb-12 text-[13px] text-[#333] placeholder-[#bbb] outline-none min-h-[96px] rounded-xl"
                  disabled={isSending}
                />
                <div className="absolute bottom-2 right-2">
                  <button
                    type="submit"
                    disabled={isSending || !input.trim()}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1a1a] text-white hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </aside>
  );
}
