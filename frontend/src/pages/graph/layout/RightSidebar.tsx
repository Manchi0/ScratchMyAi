import { FormEvent, useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  Bot, Loader2, Send, BookOpen, ArrowRight,
  ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Lightbulb,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { Button, Label, ListBox, Select, Spinner, Tabs, TextArea } from '@heroui/react';

import { askAssistant, type AssistantProvider, type AssistantMessagePayload } from '@/lib/assistantFunctions';
import { updateCourseProgress } from '@/lib/courseFunctions';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { Course, LessonStep, CheckResult } from '@/pages/learn/courses/mlpIntro';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ─── Tiny markdown renderer ───────────────────────────────────────────────────

function inlineFormat(text: string): (string | ReactElement)[] {
  const parts: (string | ReactElement)[] = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let last = 0, k = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[0].startsWith('**'))
      parts.push(<strong key={k++} className="font-semibold text-[#111]">{match[2]}</strong>);
    else
      parts.push(<code key={k++} className="bg-[#f4f4f4] border border-[#e5e5e5] rounded px-1 font-mono text-[11px] text-[#444]">{match[3]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderMarkdown(text: string): ReactElement {
  const lines = text.split('\n');
  const elements: ReactElement[] = [];
  let i = 0, key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# '))  { elements.push(<h2 key={key++} className="text-sm font-semibold text-[#111] mb-2 mt-3">{inlineFormat(line.slice(2))}</h2>); i++; continue; }
    if (line.startsWith('## ')) { elements.push(<h3 key={key++} className="text-xs font-semibold text-[#333] mb-1 mt-2">{inlineFormat(line.slice(3))}</h3>); i++; continue; }
    if (line.trim() === '---')  { elements.push(<hr key={key++} className="border-[#e5e5e5] my-3" />); i++; continue; }
    if (line.trim().startsWith('|') && lines[i + 1]?.trim().startsWith('|---')) {
      const headers = line.split('|').filter(Boolean).map(h => h.trim());
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].trim().startsWith('|')) { rows.push(lines[j].split('|').filter(Boolean).map(c => c.trim())); j++; }
      elements.push(
        <div key={key++} className="overflow-x-auto mb-3">
          <table className="text-xs w-full border-collapse">
            <thead><tr className="bg-[#f7f7f7]">{headers.map((h, hi) => <th key={hi} className="border border-[#e5e5e5] px-2 py-1 text-left font-medium text-[#444]">{inlineFormat(h)}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri} className={ri % 2 ? 'bg-[#fafafa]' : ''}>{row.map((c, ci) => <td key={ci} className="border border-[#e5e5e5] px-2 py-1 text-[#555]">{inlineFormat(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      i = j; continue;
    }
    if (line.trim().startsWith('- ')) {
      const items: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('- ')) { items.push(lines[j].trim().slice(2)); j++; }
      elements.push(<ul key={key++} className="list-disc pl-4 mb-2 space-y-0.5">{items.map((item, ii) => <li key={ii} className="text-xs text-[#444] leading-relaxed">{inlineFormat(item)}</li>)}</ul>);
      i = j; continue;
    }
    if (line.trim() === '') { i++; continue; }
    elements.push(<p key={key++} className="text-xs text-[#444] leading-relaxed mb-2">{inlineFormat(line)}</p>);
    i++;
  }
  return <div>{elements}</div>;
}

function BlockBadge({ blockType, label }: { blockType: string; label: string }) {
  const colors: Record<string, string> = {
    dataset:   'bg-violet-100 text-violet-800 border-violet-200',
    conv2d:    'bg-blue-100 text-blue-800 border-blue-200',
    flatten:   'bg-blue-100 text-blue-800 border-blue-200',
    linear:    'bg-blue-100 text-blue-800 border-blue-200',
    avgpool2d: 'bg-blue-100 text-blue-800 border-blue-200',
    relu:      'bg-green-100 text-green-800 border-green-200',
    softmax:   'bg-green-100 text-green-800 border-green-200',
    output:    'bg-pink-100 text-pink-800 border-pink-200',
  };
  const cls = colors[blockType] ?? 'bg-stone-100 text-stone-700 border-stone-200';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-medium ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />{label}
    </span>
  );
}

// ─── AI panel ────────────────────────────────────────────────────────────────

function AIAgentPanel() {
  const title          = useStore(s => s.title);
  const nodes          = useStore(s => s.nodes);
  const edges          = useStore(s => s.edges);
  const trainingConfig = useStore(s => s.trainingConfig);

  const [provider,  setProvider]  = useState<AssistantProvider>('openai');
  const [messages,  setMessages]  = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', content: 'Ask me about your graph — I can suggest missing blocks, parameter fixes, and training improvements.' },
  ]);
  const [input,     setInput]     = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  function inferDataset(ns: typeof nodes) {
    const dn = ns.find(n => (n.data as any)?.blockType === 'dataset');
    return dn ? String(((dn.data as any)?.params ?? {})['dataset_source'] ?? 'unspecified') : 'unspecified';
  }

  const graphSnapshot = useMemo(() => ({
    title, dataset: inferDataset(nodes), nodes, edges, training_config: trainingConfig,
  }), [title, nodes, edges, trainingConfig]);

  useEffect(() => {
    const el = document.getElementById('ai-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  const sendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    const history: AssistantMessagePayload[] = messages.map(m => ({ role: m.role, content: m.content }));
    setInput(''); setError(null);
    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);
    try {
      const res = await askAssistant({ provider, message: text, history, graph: graphSnapshot });
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: res.reply || 'No response.' }]);
    } catch (err: any) {
      setError(err?.message || 'Failed to reach AI');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">

      {/* Messages */}
      <div id="ai-messages" className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'ml-auto bg-[#1a1a1a] text-white rounded-br-sm'
                : 'bg-[#f3f3f3] text-[#222] border border-[#e8e8e8] rounded-bl-sm'
            }`}
          >
            {msg.content}
          </div>
        ))}
        {isSending && (
          <div className="flex items-center gap-2 bg-[#f3f3f3] border border-[#e8e8e8] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px] text-[#555] w-fit">
            <Spinner size="sm" className="text-[#999]" />
            <span>Thinking…</span>
          </div>
        )}
      </div>

      {error && <p className="px-4 pb-1 text-[11px] text-red-500">{error}</p>}

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-[#ebebeb]">
        <div className="relative flex flex-col border border-[#e5e5e5] rounded-xl bg-white focus-within:ring-1 focus-within:ring-[#111] focus-within:border-[#111] transition-all">
          <textarea
            rows={3}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about your graph..."
            disabled={isSending}
            className="w-full resize-none bg-transparent border-0 focus:ring-0 p-3 pb-12 text-[13px] text-[#333] placeholder-[#aaa] outline-none min-h-[96px] rounded-xl"
            aria-label="Message input"
          />
          <div className="absolute bottom-2 right-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1a1a] text-white hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              aria-label="Send message"
            >
              {isSending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Lesson panel ─────────────────────────────────────────────────────────────

function LessonPanel({ course }: { course: Course }) {
  const nodes = useStore(s => s.nodes);
  const edges = useStore(s => s.edges);
  const { 
    stepIndex, setStepIndex,
    checkResult, setCheckResult,
    hintLevel, setHintLevel 
  } = useStore();

  const step: LessonStep = course.steps[stepIndex];
  const total = course.steps.length;
  const isFirst = stepIndex === 0;
  const isLast  = stepIndex === total - 1;
  const pct = Math.round((stepIndex / Math.max(total - 1, 1)) * 100);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (user && course.id) {
      let status: 'in_progress' | 'completed' = 'in_progress';
      if (isLast && (!step.check || checkResult?.passed)) {
        status = 'completed';
      }
      updateCourseProgress(user.id, course.id, pct, status).catch(console.error);
    }
  }, [stepIndex, pct, isLast, checkResult, user, course.id, step.check]);

  const goNext = () => { if (!isLast)  { setStepIndex(stepIndex + 1); setCheckResult(null); setHintLevel(0); } };
  const goPrev = () => { if (!isFirst) { setStepIndex(stepIndex - 1); setCheckResult(null); setHintLevel(0); } };
  const runCheck = () => {
    if (!step.check) return;
    const result = step.check(nodes, edges, hintLevel);
    setCheckResult(result);
    if (!result.passed) setHintLevel(h => Math.min(h + 1, (step.hints?.length ?? 1) - 1));
  };

  return (
    <div className="flex flex-col h-full bg-[#fafafa]">
      {/* Progress */}
      <div className="px-3 pt-3 pb-3 border-b border-[#e8e8e8] bg-[#f5f5f5]">
        <div className="flex justify-between text-[10px] text-[#888] font-medium mb-1.5">
          <span>Step {stepIndex + 1} of {total}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#e8e8e8] overflow-hidden">
          <div className="h-full rounded-full bg-[#1a1a1a] transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Step header */}
      <div className="px-3 py-2 border-b border-[#e8e8e8] bg-[#fafafa]">
        <p className="text-[11px] font-bold text-[#111] tracking-wide uppercase">{step.title}</p>
        {step.type === 'add-block' && step.blockType && step.blockLabel && (
          <div className="mt-1.5"><BlockBadge blockType={step.blockType} label={`Add: ${step.blockLabel}`} /></div>
        )}
        {step.type === 'check' && (
          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-[#555] bg-white border border-[#e8e8e8] rounded px-2 py-0.5 font-medium shadow-sm">
            <Lightbulb size={10} /> Validate your graph
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {renderMarkdown(step.content)}

        {step.type === 'check' && checkResult && (
          <div className={`mt-3 rounded-xl border p-3 text-xs ${
            checkResult.passed
              ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]'
              : 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
          }`}>
            <div className="flex items-start gap-2">
              {checkResult.passed
                ? <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-600" />
                : <XCircle     size={14} className="shrink-0 mt-0.5 text-red-600" />}
              <p className="leading-relaxed font-medium">{checkResult.message}</p>
            </div>
            {!checkResult.passed && checkResult.hint && (
              <div className="mt-3 flex items-start gap-1.5 bg-white rounded-lg p-2 text-[#555] border border-[#e8e8e8] shadow-sm">
                <Lightbulb size={12} className="shrink-0 mt-0.5 text-[#888]" />
                <p className="leading-snug">{checkResult.hint}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="border-t border-[#e8e8e8] p-3 flex items-center gap-2 bg-[#fafafa]">
        <button
          onClick={goPrev} disabled={isFirst}
          className="flex items-center justify-center gap-1 h-8 px-3 rounded-lg text-[12px] font-medium text-[#555] border border-[#e8e8e8] hover:bg-[#fafafa] hover:text-[#111] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        {step.type === 'check' && (
          <button
            onClick={runCheck}
            className="flex-1 flex items-center justify-center h-8 px-3 rounded-lg text-[12px] font-semibold bg-white border border-[#e8e8e8] text-[#111] hover:bg-[#fafafa] hover:border-[#d4d4d4] transition-colors shadow-sm"
          >
            Check My Graph
          </button>
        )}
        <button
          onClick={goNext}
          disabled={isLast || (step.type === 'check' && checkResult?.passed !== true)}
          className="flex items-center justify-center gap-1 h-8 px-3 rounded-lg text-[12px] font-medium bg-[#1a1a1a] text-white hover:bg-[#222] disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-auto shadow-sm"
        >
          {isLast ? 'Done' : 'Next'} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Unified Right Sidebar ────────────────────────────────────────────────────

interface RightSidebarProps {
  course?: Course;
}

export function RightSidebar({ course }: RightSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const showLesson = !!course;

  const [activeTab, setActiveTab] = useState<'lesson' | 'ai'>(showLesson ? 'lesson' : 'ai');

  // If course changes or becomes available, ensure we switch to lesson tab
  // If course is removed, fall back strictly to 'ai' tab
  useEffect(() => {
    if (showLesson) {
      setActiveTab('lesson');
    } else {
      setActiveTab('ai');
    }
  }, [course?.id, showLesson]);

  const safeTab = showLesson ? activeTab : 'ai';

  return (
    <>
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="absolute right-2 top-15 z-40 flex items-center justify-center w-9 h-9 rounded-full bg-white border border-[#e8e8e8] text-[#555] shadow-sm hover:bg-[#f5f5f5] hover:text-[#111] transition-all cursor-pointer"
          title="Expand panel"
        >
          <PanelRightOpen size={14} />
        </button>
      )}

      <aside
        className={`hidden lg:flex flex-col bg-white h-full transition-all duration-200 ease-in-out ${
          collapsed ? 'w-0 border-l-0 overflow-hidden' : 'w-[360px] border-l border-[#e8e8e8] overflow-hidden'
        }`}
      >
        {!collapsed && (
          <Tabs
            variant="secondary"
            selectedKey={safeTab}
            onSelectionChange={k => setActiveTab(k as 'lesson' | 'ai')}
            className="flex flex-col h-full gap-0 overflow-x-hidden overflow-y-hidden"
          >
            {/* Header */}
            <div className="flex items-center border-b border-[#e8e8e8] shrink-0 bg-white overflow-hidden">
              <Tabs.ListContainer className="flex-1 h-5.5 overflow-hidden">
                <Tabs.List
                  aria-label="Sidebar panels"
                  className="flex border-b-0 overflow-hidden [&>button]:h-auto [&>button]:px-4 [&>button]:py-3 [&>button]:rounded-none [&>button]:text-[11px] [&>button]:font-medium [&>button]:text-[#aaa] [&>button[data-selected=true]]:!text-[#1c1917] [&>button[data-selected=true]]:!font-semibold [&>button]:cursor-pointer [&>button:hover]:text-[#555] [&>button]:transition-colors"
                 >
                  {showLesson && (
                    <Tabs.Tab id="lesson">
                      <span className="flex mb-2 items-center gap-1.5"><BookOpen size={12} /> Lesson</span>
                      <Tabs.Indicator className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1a1a1a]" />
                    </Tabs.Tab>
                  )}
                  <Tabs.Tab id="ai">
                    <span className="flex mb-2 items-center gap-1.5"><Bot size={12} /> AI Agent</span>
                    <Tabs.Indicator className="absolute left-0 right-0 h-[2px] bg-[#1c1917]" />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
              <button
                type="button"
                onClick={() => setCollapsed(p => !p)}
                className="p-3 text-[#bbb] hover:text-[#555] hover:bg-[#f5f5f5] shrink-0 transition-colors ml-auto"
                title="Collapse"
              >
                <PanelRightClose size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {showLesson && (
                <Tabs.Panel id="lesson" className="flex-1 flex flex-col h-full p-0 overflow-hidden">
                  <LessonPanel course={course!} />
                </Tabs.Panel>
              )}
              <Tabs.Panel id="ai" className="flex-1 flex flex-col h-full p-0 overflow-hidden">
                <AIAgentPanel />
              </Tabs.Panel>
            </div>
          </Tabs>
        )}
      </aside>
    </>
  );
}
