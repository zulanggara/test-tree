'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { FamilyMember, TreeNode, HighlightState } from '@/types';
import { TreeNodeComponent } from './TreeNode';

interface TreeLayoutNode {
  treeNode: TreeNode;
  x: number;
  y: number;
  coupleWidth: number;
}

interface Connection {
  fromX: number; fromY: number;
  toX: number; toY: number;
  isHighlighted: boolean;
  highlightColor: string;
}

const NODE_WIDTH = 90;
const COUPLE_GAP = 32;
const SIBLING_GAP = 28;
const LEVEL_HEIGHT = 165;
const AVATAR_SIZE = 72;
const PADDING = 60;

function getMemberWidth(node: TreeNode): number {
  return NODE_WIDTH + node.spouses.length * (NODE_WIDTH + COUPLE_GAP);
}

function calcSubtreeWidth(node: TreeNode): number {
  if (node.children.length === 0) return getMemberWidth(node);
  const childrenWidth = node.children.reduce(
    (sum, child) => sum + calcSubtreeWidth(child) + SIBLING_GAP, -SIBLING_GAP
  );
  return Math.max(getMemberWidth(node), childrenWidth);
}

function layoutTree(nodes: TreeNode[]): {
  layouts: Map<string, TreeLayoutNode>;
  totalWidth: number;
  totalHeight: number;
} {
  const layouts = new Map<string, TreeLayoutNode>();

  function placeNode(node: TreeNode, x: number, y: number) {
    const coupleWidth = getMemberWidth(node);
    layouts.set(node.member.id, { treeNode: node, x, y, coupleWidth });

    if (node.children.length > 0) {
      const totalChildWidth = node.children.reduce(
        (sum, child) => sum + calcSubtreeWidth(child) + SIBLING_GAP, -SIBLING_GAP
      );
      let childX = x + coupleWidth / 2 - totalChildWidth / 2;
      for (const child of node.children) {
        const w = calcSubtreeWidth(child);
        placeNode(child, childX, y + LEVEL_HEIGHT);
        childX += w + SIBLING_GAP;
      }
    }
  }

  let cursorX = PADDING;
  for (const root of nodes) {
    const w = calcSubtreeWidth(root);
    placeNode(root, cursorX, PADDING);
    cursorX += w + SIBLING_GAP * 2;
  }

  // Shift jika ada node yang terlalu kiri
  let minX = Infinity;
  for (const layout of layouts.values()) {
    minX = Math.min(minX, layout.x);
  }
  const shift = minX < PADDING ? PADDING - minX : 0;
  if (shift > 0) {
    for (const layout of layouts.values()) {
      layout.x += shift;
    }
  }

  let maxX = 0, maxY = 0;
  for (const layout of layouts.values()) {
    maxX = Math.max(maxX, layout.x + layout.coupleWidth);
    maxY = Math.max(maxY, layout.y + AVATAR_SIZE + 70);
  }

  return { layouts, totalWidth: maxX + PADDING, totalHeight: maxY + PADDING };
}

interface FamilyTreeProps {
  roots: TreeNode[];
  memberMap: Map<string, FamilyMember>;
  highlight: HighlightState | null;
  onNodeClick: (member: FamilyMember) => void;
  focusId: string | null;
}

export function FamilyTree({ roots, memberMap, highlight, onNodeClick, focusId }: FamilyTreeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [zoom, setZoom] = useState(1);
  const [layout, setLayout] = useState<{
    layouts: Map<string, TreeLayoutNode>;
    totalWidth: number;
    totalHeight: number;
  } | null>(null);

  useEffect(() => {
    setLayout(layoutTree(roots));
  }, [roots]);

  // Scroll ke node hasil pencarian di dalam container, dengan memperhitungkan zoom
  useEffect(() => {
    if (!focusId || !scrollRef.current || !layout) return;
    const layoutNode = layout.layouts.get(focusId);
    if (!layoutNode) return;

    const nodeX = layoutNode.x * zoom;
    const nodeY = layoutNode.y * zoom;
    const container = scrollRef.current;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    container.scrollTo({
      left: nodeX - containerW / 2 + (NODE_WIDTH * zoom) / 2,
      top: nodeY - containerH / 2 + (AVATAR_SIZE * zoom) / 2,
      behavior: 'smooth',
    });
  }, [focusId, layout, zoom]);

  const getHighlight = useCallback((memberId: string) => {
    if (!highlight || !highlight.highlightedIds.size) return 'none' as const;
    if (memberId === highlight.foundId) return 'self' as const;
    if (highlight.highlightedIds.has(memberId))
      return highlight.mode === 'descendants' ? 'green' as const : 'blue' as const;
    return 'dimmed' as const;
  }, [highlight]);

  const buildConnections = useCallback((): Connection[] => {
    if (!layout) return [];
    const connections: Connection[] = [];

    for (const [memberId, layoutNode] of layout.layouts) {
      const { treeNode, x, y, coupleWidth } = layoutNode;
      const parentCenterX = x + coupleWidth / 2;
      const parentBottomY = y + AVATAR_SIZE / 2 + 14;

      for (const child of treeNode.children) {
        const childLayout = layout.layouts.get(child.member.id);
        if (!childLayout) continue;
        const childCenterX = childLayout.x + childLayout.coupleWidth / 2;
        const childTopY = childLayout.y + AVATAR_SIZE / 2 - 4;

        const bothHighlighted =
          highlight?.highlightedIds.has(memberId) &&
          highlight?.highlightedIds.has(child.member.id);

        connections.push({
          fromX: parentCenterX,
          fromY: parentBottomY,
          toX: childCenterX,
          toY: childTopY,
          isHighlighted: !!bothHighlighted,
          highlightColor: highlight?.mode === 'descendants' ? 'var(--green)' : 'var(--blue)',
        });
      }
    }
    return connections;
  }, [layout, highlight]);

  if (!layout) return (
    <div className="flex items-center justify-center h-64 text-[var(--text-subtle)]">
      <div className="text-sm animate-pulse">Menyusun pohon silsilah...</div>
    </div>
  );

  const connections = buildConnections();

  return (
    <div className="relative w-full h-full flex flex-col">

      {/* Zoom controls */}
      <div
        className="absolute top-3 right-3 z-10 flex items-center gap-1"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '4px 6px',
        }}
      >
        <button
          onClick={() => setZoom(z => Math.max(0.3, parseFloat((z - 0.1).toFixed(1))))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all"
          style={{ fontSize: 18, fontWeight: 300, lineHeight: 1 }}
        >−</button>
        <span
          className="text-xs text-[var(--text-subtle)] select-none"
          style={{ minWidth: 36, textAlign: 'center' }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.min(2, parseFloat((z + 0.1).toFixed(1))))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all"
          style={{ fontSize: 18, fontWeight: 300, lineHeight: 1 }}
        >+</button>
        <div style={{ width: 1, background: 'var(--border)', height: 16, margin: '0 2px' }} />
        <button
          onClick={() => setZoom(1)}
          title="Reset zoom"
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Scrollable container — scroll terjadi di sini, bukan di window */}
      <div
        ref={scrollRef}
        className="tree-scroll-container flex-1"
        style={{ overflow: 'auto', position: 'relative' }}
      >
        {/* Canvas yang di-zoom — transformOrigin top left agar scroll tetap konsisten */}
        <div
          className="tree-zoom-canvas"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: layout.totalWidth,
            height: layout.totalHeight,
            position: 'relative',
            // Beri ruang ekstra agar konten tidak terpotong saat di-zoom out
            minWidth: layout.totalWidth * zoom,
            minHeight: layout.totalHeight * zoom,
          }}
        >
          {/* SVG connectors */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={layout.totalWidth}
            height={layout.totalHeight}
          >
            {connections.map((conn, i) => {
              const midY = conn.fromY + (conn.toY - conn.fromY) * 0.45;
              const path = `M ${conn.fromX} ${conn.fromY} C ${conn.fromX} ${midY}, ${conn.toX} ${midY}, ${conn.toX} ${conn.toY}`;
              return (
                <path
                  key={i}
                  d={path}
                  fill="none"
                  className={`tree-connector ${conn.isHighlighted
                    ? (highlight?.mode === 'descendants' ? 'highlight-green' : 'highlight-blue')
                    : ''}`}
                  stroke={conn.isHighlighted ? conn.highlightColor : 'var(--connector)'}
                  strokeWidth={conn.isHighlighted ? 2 : 1.5}
                  opacity={!highlight || !highlight.highlightedIds.size ? 1 : conn.isHighlighted ? 1 : 0.12}
                />
              );
            })}
          </svg>

          {/* Node layer */}
          <div style={{ width: layout.totalWidth, height: layout.totalHeight, position: 'relative' }}>
            {[...layout.layouts.values()].map(({ treeNode, x, y }) => {
              const member = treeNode.member;
              return (
                <div key={member.id} className="absolute" style={{ left: x, top: y }}>
                  <TreeNodeComponent
                    member={member}
                    spouses={treeNode.spouses}
                    spouseMarriages={treeNode.spouseMarriages}
                    highlight={getHighlight(member.id)}
                    spouseHighlight={(spouse) => getHighlight(spouse.id)}
                    onClick={onNodeClick}
                    nodeRef={(el) => { if (el) nodeRefs.current.set(member.id, el); }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}