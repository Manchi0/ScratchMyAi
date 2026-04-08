import { getBezierPath, EdgeProps, EdgeLabelRenderer } from '@xyflow/react';

export function WireEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const severity = (data?.validationSeverity as string) || 'none';
  const message = (data?.validationMessage as string) || '';

  const strokeColor =
    severity === 'error'
      ? '#ef4444'
      : severity === 'warning'
        ? '#f59e0b'
        : (data?.color as string) || '#8b5cf6';

  const badgeBg = severity === 'error' ? '#ef4444' : '#f59e0b';

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={3}
        markerEnd={markerEnd}
        style={style}
      />

      {severity !== 'none' && message && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 10,
            }}
            className="nodrag nopan"
          >
            <div
              style={{
                background: badgeBg,
                color: '#fff',
                borderRadius: '9999px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                cursor: 'default',
                userSelect: 'none',
              }}
            >
              {severity === 'error' ? '✕ ' : ''}{message}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
