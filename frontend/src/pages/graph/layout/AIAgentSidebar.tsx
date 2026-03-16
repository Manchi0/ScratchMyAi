import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bot, Loader2, PanelRightClose, PanelRightOpen, Send } from 'lucide-react';

import { askAssistant, type AssistantProvider, type AssistantMessagePayload } from '@/lib/assistantFunctions';
import { useStore } from '@/store/useStore';

interface ChatMessage {
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

  const [collapsed, setCollapsed] = useState(false);
  const [provider, setProvider] = useState<AssistantProvider>('openai');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Ask me about your graph. I can suggest missing blocks, parameter fixes, and training setup improvements.',
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
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isSending]);

  const sendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const history: AssistantMessagePayload[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const response = await askAssistant({
        provider,
        message: trimmed,
        history,
        graph: graphSnapshot,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.reply || 'No response returned by the assistant.',
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
      className={`hidden lg:flex border-l border-[#e8e7e2] bg-[#fffdf8] h-full transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-[360px]'
      }`}
    >
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center justify-between border-b border-[#e8e7e2] px-3 py-3 bg-[#f4f1e7]">
          {!collapsed && (
            <div>
              <h3 className="text-sm font-semibold text-[#1f2937]">AI Graph Agent</h3>
              <p className="text-xs text-[#6b7280]">Context-aware help for your current graph</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-md p-1.5 text-[#4b5563] hover:bg-[#e8e4d7]"
            title={collapsed ? 'Expand AI sidebar' : 'Collapse AI sidebar'}
          >
            {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
          </button>
        </div>

        {collapsed ? (
          <div className="flex flex-1 flex-col items-center justify-start gap-4 py-4 text-[#6b7280]">
            <Bot size={18} />
          </div>
        ) : (
          <>
            <div className="border-b border-[#e8e7e2] px-3 py-2 flex items-center gap-2">
              <label className="text-xs font-medium text-[#6b7280]">Provider</label>
              <select
                className="rounded-md border border-[#d6d3cc] bg-white px-2 py-1 text-xs"
                value={provider}
                onChange={(e) => setProvider(e.target.value as AssistantProvider)}
                disabled={isSending}
              >
                <option value="claude">Claude</option>
                <option value="openai">OpenAI</option>
              </select>
              <div className="ml-auto text-[10px] text-[#9ca3af]">
                {nodes.length} nodes • {edges.length} edges
              </div>
            </div>

            <div id="ai-agent-messages" className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'ml-auto bg-[#1f2937] text-white'
                      : 'bg-[#eef2ff] text-[#111827] border border-[#dbe2ff]'
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {isSending && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-[#dbe2ff] bg-[#eef2ff] px-3 py-2 text-sm text-[#111827]">
                  <Loader2 size={14} className="animate-spin" />
                  Thinking...
                </div>
              )}
            </div>

            {error && <div className="px-3 pb-2 text-xs text-red-600">{error}</div>}

            <form onSubmit={sendMessage} className="border-t border-[#e8e7e2] p-3 flex items-end gap-2">
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
                placeholder="Ask about your graph"
                className="flex-1 resize-none rounded-lg border border-[#d6d3cc] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#94a3b8]"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563eb] text-white disabled:opacity-40"
                title="Send"
              >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </>
        )}
      </div>
    </aside>
  );
}
