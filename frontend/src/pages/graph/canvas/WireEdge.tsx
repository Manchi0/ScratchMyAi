import { getBezierPath, EdgeProps } from '@xyflow/react';

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
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const baseColor = (data?.color as string) || '#8b5cf6';
  const glowColor = (data?.color as string) || '#a78bfa';

  return (
    <>
      {/* Solid colored line */}
      <path
        id="electric-wire"
        d={edgePath}
        fill="none"
        stroke={baseColor}
        strokeWidth={3}
        markerEnd={markerEnd}
        style={style}
      />
    </>
  );
}
