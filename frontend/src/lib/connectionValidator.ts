import type { Node, Edge } from '@xyflow/react';

export type ValidationSeverity = 'none' | 'warning' | 'error';

export interface ValidationResult {
  /** false only for hard errors that should block the connection entirely */
  valid: boolean;
  severity: ValidationSeverity;
  message: string;
}

export interface StructuralIssue {
  severity: 'error' | 'warning';
  message: string;
}

function p(node: Node, key: string, fallback: any = 0): any {
  return (node.data.params as Record<string, any>)?.[key] ?? fallback;
}

/**
 * Validate a connection between two nodes.
 * Returns { valid: false } only for hard errors (structurally impossible connections).
 * Returns { valid: true, severity: 'warning' } for dimension mismatches.
 */
export function validateConnection(sourceNode: Node, targetNode: Node): ValidationResult {
  const src = sourceNode.data.blockType as string;
  const tgt = targetNode.data.blockType as string;

  // ── Hard errors ─────────────────────────────────────────────────────────────

  if (tgt === 'dataset') {
    return {
      valid: false,
      severity: 'error',
      message: 'Dataset blocks cannot receive input.',
    };
  }

  if (src === 'output') {
    return {
      valid: false,
      severity: 'error',
      message: 'Output (Model) blocks cannot send output.',
    };
  }

  // Conv2d / ConvTranspose2d → Linear without Flatten is structurally wrong
  if ((src === 'conv2d' || src === 'convtranspose2d') && tgt === 'linear') {
    return {
      valid: false,
      severity: 'error',
      message: 'Conv2d → Linear is invalid. Insert a Flatten block in between.',
    };
  }

  // ── Soft warnings (dimension mismatches) ─────────────────────────────────────

  // Linear → Linear
  if (src === 'linear' && tgt === 'linear') {
    const out = p(sourceNode, 'out_features', 64);
    const inn = p(targetNode, 'in_features', 64);
    if (out !== inn) {
      return {
        valid: true,
        severity: 'warning',
        message: `out_features (${out}) ≠ in_features (${inn})`,
      };
    }
  }

  // Conv2d / ConvTranspose2d → Conv2d / ConvTranspose2d
  if (
    (src === 'conv2d' || src === 'convtranspose2d') &&
    (tgt === 'conv2d' || tgt === 'convtranspose2d')
  ) {
    const out = p(sourceNode, 'out_channels', 32);
    const inn = p(targetNode, 'in_channels', 1);
    if (out !== inn) {
      return {
        valid: true,
        severity: 'warning',
        message: `out_channels (${out}) ≠ in_channels (${inn})`,
      };
    }
  }

  // Linear → BatchNorm1d
  if (src === 'linear' && tgt === 'batchnorm1d') {
    const out = p(sourceNode, 'out_features', 64);
    const features = p(targetNode, 'num_features', 64);
    if (out !== features) {
      return {
        valid: true,
        severity: 'warning',
        message: `out_features (${out}) ≠ num_features (${features})`,
      };
    }
  }

  // LSTM / GRU → Linear  (bidirectional doubles hidden_size)
  if ((src === 'lstm' || src === 'gru') && tgt === 'linear') {
    const hidden = p(sourceNode, 'hidden_size', 128);
    const bidir = p(sourceNode, 'bidirectional', false);
    const effectiveOut = bidir ? hidden * 2 : hidden;
    const inn = p(targetNode, 'in_features', 64);
    if (effectiveOut !== inn) {
      const note = bidir ? ` (bidirectional ×2 = ${effectiveOut})` : '';
      return {
        valid: true,
        severity: 'warning',
        message: `hidden_size${note} (${effectiveOut}) ≠ in_features (${inn})`,
      };
    }
  }

  // RNN → Linear  (RNN has no bidirectional param)
  if (src === 'rnn' && tgt === 'linear') {
    const hidden = p(sourceNode, 'hidden_size', 64);
    const inn = p(targetNode, 'in_features', 64);
    if (hidden !== inn) {
      return {
        valid: true,
        severity: 'warning',
        message: `hidden_size (${hidden}) ≠ in_features (${inn})`,
      };
    }
  }

  // Embedding → LSTM / GRU / RNN
  if (src === 'embedding' && (tgt === 'lstm' || tgt === 'gru' || tgt === 'rnn')) {
    const embDim = p(sourceNode, 'embedding_dim', 64);
    const inputSize = p(targetNode, 'input_size', 64);
    if (embDim !== inputSize) {
      return {
        valid: true,
        severity: 'warning',
        message: `embedding_dim (${embDim}) ≠ input_size (${inputSize})`,
      };
    }
  }

  // No rule matched — connection is fine
  return { valid: true, severity: 'none', message: '' };
}

/**
 * Check the overall graph structure for issues that would prevent training.
 */
export function validateGraphStructure(nodes: Node[], edges: Edge[]): StructuralIssue[] {
  const issues: StructuralIssue[] = [];

  const hasDataset = nodes.some((n) => n.data.blockType === 'dataset');
  const hasOutput = nodes.some((n) => n.data.blockType === 'output');

  if (!hasDataset) {
    issues.push({ severity: 'error', message: 'Missing Dataset block' });
  }
  if (!hasOutput) {
    issues.push({ severity: 'error', message: 'Missing Output block' });
  }

  // Warn about blocks that have no edges at all (except Dataset and Output which
  // only have one handle each)
  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }
  const floating = nodes.filter(
    (n) =>
      !connectedIds.has(n.id) &&
      n.data.blockType !== 'dataset' &&
      n.data.blockType !== 'output',
  );
  if (floating.length > 0) {
    const label = floating.length === 1 ? '1 block is' : `${floating.length} blocks are`;
    issues.push({
      severity: 'warning',
      message: `${label} disconnected from the graph.`,
    });
  }

  return issues;
}
