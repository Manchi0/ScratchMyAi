import { useState, type ReactElement, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Lightbulb, BookOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Course, LessonStep, CheckResult } from './courses/mlpIntro';

interface Props {
  course: Course;
}

// Very minimal markdown renderer (bold, inline code, headings, tables, lists)
function renderMarkdown(text: string): ReactElement {
  const lines = text.split('\n');
  const elements: ReactElement[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H1
    if (line.startsWith('# ')) {
      elements.push(<h2 key={key++} className="text-base font-bold text-[#1f2937] mb-2 mt-1">{inlineFormat(line.slice(2))}</h2>);
      i++; continue;
    }
    // H2
    if (line.startsWith('## ')) {
      elements.push(<h3 key={key++} className="text-sm font-semibold text-[#374151] mb-1 mt-2">{inlineFormat(line.slice(3))}</h3>);
      i++; continue;
    }
    // HR
    if (line.trim() === '---') {
      elements.push(<hr key={key++} className="border-[#e8e7e2] my-3" />);
      i++; continue;
    }
    // Table header row
    if (line.trim().startsWith('|') && lines[i + 1]?.trim().startsWith('|---')) {
      const headers = line.split('|').filter(Boolean).map(h => h.trim());
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        rows.push(lines[j].split('|').filter(Boolean).map(c => c.trim()));
        j++;
      }
      elements.push(
        <div key={key++} className="overflow-x-auto mb-3">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr className="bg-[#f4f1e7]">
                {headers.map((h, hi) => <th key={hi} className="border border-[#e8e7e2] px-2 py-1 text-left font-semibold">{inlineFormat(h)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-[#faf9f6]'}>
                  {row.map((cell, ci) => <td key={ci} className="border border-[#e8e7e2] px-2 py-1">{inlineFormat(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      i = j; continue;
    }
    // Bullet list
    if (line.trim().startsWith('- ')) {
      const items: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('- ')) {
        items.push(lines[j].trim().slice(2));
        j++;
      }
      elements.push(
        <ul key={key++} className="list-disc pl-4 mb-2 space-y-0.5">
          {items.map((item, ii) => <li key={ii} className="text-xs text-[#374151]">{inlineFormat(item)}</li>)}
        </ul>
      );
      i = j; continue;
    }
    // Empty line
    if (line.trim() === '') {
      i++; continue;
    }
    // Normal paragraph
    elements.push(<p key={key++} className="text-xs text-[#374151] leading-relaxed mb-2">{inlineFormat(line)}</p>);
    i++;
  }
  return <div>{elements}</div>;
}

function inlineFormat(text: string): (string | ReactElement)[] {
  // Process bold (**text**) and inline code (`code`)
  const parts: (string | ReactElement)[] = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let k = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[0].startsWith('**')) {
      parts.push(<strong key={k++} className="font-semibold text-[#1f2937]">{match[2]}</strong>);
    } else {
      parts.push(<code key={k++} className="bg-[#f0ece0] rounded px-1 font-mono text-[11px] text-[#92400e]">{match[3]}</code>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function BlockBadge({ blockType, label }: { blockType: string; label: string }) {
  const colors: Record<string, string> = {
    dataset: 'bg-violet-100 text-violet-800 border-violet-200',
    conv2d: 'bg-blue-100 text-blue-800 border-blue-200',
    flatten: 'bg-blue-100 text-blue-800 border-blue-200',
    linear: 'bg-blue-100 text-blue-800 border-blue-200',
    avgpool2d: 'bg-blue-100 text-blue-800 border-blue-200',
    rnn: 'bg-blue-100 text-blue-800 border-blue-200',
    lstm: 'bg-blue-100 text-blue-800 border-blue-200',
    positionalencoding: 'bg-blue-100 text-blue-800 border-blue-200',
    transformerencoderlayer: 'bg-blue-100 text-blue-800 border-blue-200',
    gelu: 'bg-green-100 text-green-800 border-green-200',
    relu: 'bg-green-100 text-green-800 border-green-200',
    softmax: 'bg-green-100 text-green-800 border-green-200',
    output: 'bg-pink-100 text-pink-800 border-pink-200',
  };
  const cls = colors[blockType] ?? 'bg-stone-100 text-stone-700 border-stone-200';
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${cls}`}>
      <span className="w-2 h-2 rounded-full bg-current opacity-60" />
      {label}
    </div>
  );
}

export function LessonSidebar({ course }: Props) {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);

  const [stepIndex, setStepIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [hintLevel, setHintLevel] = useState(0);

  const step: LessonStep = course.steps[stepIndex];
  const totalSteps = course.steps.length;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  const goNext = () => {
    if (!isLast) {
      setStepIndex((s) => s + 1);
      setCheckResult(null);
      setHintLevel(0);
    }
  };

  const goPrev = () => {
    if (!isFirst) {
      setStepIndex((s) => s - 1);
      setCheckResult(null);
      setHintLevel(0);
    }
  };

  const runCheck = () => {
    if (!step.check) return;
    const result = step.check(nodes, edges, hintLevel);
    setCheckResult(result);
    if (!result.passed) {
      setHintLevel((h) => Math.min(h + 1, (step.hints?.length ?? 1) - 1));
    }
  };

  // Progress: count check steps passed based on stepIndex (rough proxy)
  const progressPct = Math.round((stepIndex / (totalSteps - 1)) * 100);

  return (
    <aside
      className={`hidden lg:flex border-l border-[#e8e7e2] bg-[#fffdf8] h-full transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-[380px]'
      }`}
    >
      <div className="flex h-full w-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e8e7e2] px-3 py-3 bg-[#f4f1e7]">
          {!collapsed && (
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <BookOpen size={13} className="text-indigo-600 shrink-0" />
                <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">Lesson</span>
              </div>
              <h3 className="text-xs font-semibold text-[#1f2937] leading-tight truncate">{course.title}</h3>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            className="rounded-md p-1.5 text-[#4b5563] hover:bg-[#e8e4d7] shrink-0"
            title={collapsed ? 'Expand lesson panel' : 'Collapse lesson panel'}
          >
            {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
          </button>
        </div>

        {collapsed ? (
          <div className="flex flex-1 flex-col items-center justify-start gap-4 py-4 text-[#6b7280]">
            <BookOpen size={18} />
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="px-3 pt-2 pb-1 border-b border-[#e8e7e2]">
              <div className="flex justify-between text-[10px] text-[#9ca3af] mb-1">
                <span>Step {stepIndex + 1} of {totalSteps}</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#e8e7e2] overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Step title */}
            <div className="px-3 py-2 border-b border-[#e8e7e2] bg-[#faf9f5]">
              <p className="text-[11px] font-semibold text-[#374151] uppercase tracking-wide">{step.title}</p>
              {step.type === 'add-block' && step.blockType && step.blockLabel && (
                <div className="mt-1.5">
                  <BlockBadge blockType={step.blockType} label={`Add: ${step.blockLabel}`} />
                </div>
              )}
              {step.type === 'check' && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                  <Lightbulb size={10} />
                  Validate your graph
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {renderMarkdown(step.content)}

              {/* Check result */}
              {step.type === 'check' && checkResult && (
                <div className={`mt-3 rounded-lg border p-3 text-xs ${
                  checkResult.passed
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {checkResult.passed
                      ? <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-green-600" />
                      : <XCircle size={14} className="shrink-0 mt-0.5 text-red-600" />
                    }
                    <p className="leading-relaxed">{checkResult.message}</p>
                  </div>
                  {!checkResult.passed && checkResult.hint && (
                    <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded p-2 text-amber-800">
                      <Lightbulb size={12} className="shrink-0 mt-0.5" />
                      <p>{checkResult.hint}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer nav */}
            <div className="border-t border-[#e8e7e2] p-3 flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={isFirst}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-stone-600 border border-stone-200 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
                Prev
              </button>

              {step.type === 'check' && (
                <button
                  onClick={runCheck}
                  className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                >
                  Check My Graph
                </button>
              )}

              <button
                onClick={goNext}
                disabled={isLast || (step.type === 'check' && checkResult?.passed !== true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors ml-auto"
              >
                {isLast ? 'Done' : 'Next'}
                <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
