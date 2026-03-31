'use client';

import { useRef, useEffect, useState } from 'react';
import { FamilyMember, TreeNode, HighlightState, Marriage, MarriageStatus } from '@/types';
import { getAge, getAvatarUrl, isActiveMarriage, getMarriageStatusLabel, getMarriageStatusColor } from '@/lib/family';

// ─── Constants ────────────────────────────────────────────────────────────────
const NODE_W = 90;
const AVATAR = 72;
const SIBLING_GAP = 32;
const LEVEL_H = 180;
const PADDING = 80;
const COUPLE_CONNECTOR = 28;

// ─── Types ────────────────────────────────────────────────────────────────────
type HighlightType = 'self' | 'green' | 'blue' | 'dimmed' | 'none';

interface LayoutNode {
  treeNode: TreeNode;
  x: number;
  y: number;
  avatarCX: number;
  branchY: number;
}

interface Connection {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isDirect: boolean;
  isHighlighted: boolean;
  highlightColor: string;
}

// ─── Layout engine ────────────────────────────────────────────────────────────
function nodeUnitWidth(node: TreeNode): number {
  return NODE_W + node.spouses.length * (NODE_W + COUPLE_CONNECTOR);
}

function subtreeWidth(node: TreeNode): number {
  if (node.children.length === 0) return nodeUnitWidth(node);
  const childrenTotalW = node.children.reduce(
    (s, c) => s + subtreeWidth(c) + SIBLING_GAP, -SIBLING_GAP
  );
  return Math.max(nodeUnitWidth(node), childrenTotalW);
}

function buildLayout(roots: TreeNode[]): {
  layouts: Map<string, LayoutNode>;
  totalW: number;
  totalH: number;
} {
  const layouts = new Map<string, LayoutNode>();

  function place(node: TreeNode, x: number, y: number) {
    const avatarCX = x + AVATAR / 2;

    layouts.set(node.member.id, {
      treeNode: node,
      x,
      y,
      avatarCX,
      branchY: y + AVATAR + 20,
    });

    if (node.children.length > 0) {
      const childrenTotalW = node.children.reduce(
        (s, c) => s + subtreeWidth(c) + SIBLING_GAP, -SIBLING_GAP
      );
      let childX = avatarCX - childrenTotalW / 2;
      for (const child of node.children) {
        const w = subtreeWidth(child);
        place(child, childX, y + LEVEL_H);
        childX += w + SIBLING_GAP;
      }
    }
  }

  let cursorX = PADDING;
  for (const root of roots) {
    const w = subtreeWidth(root);
    place(root, cursorX, PADDING);
    cursorX += w + SIBLING_GAP * 2;
  }

  // Shift right if any node underflowed left edge
  let minX = Infinity;
  for (const l of layouts.values()) minX = Math.min(minX, l.x);
  const shift = minX < PADDING ? PADDING - minX : 0;
  if (shift > 0) {
    for (const l of layouts.values()) {
      l.x += shift;
      l.avatarCX += shift;
    }
  }

  let maxX = 0, maxY = 0;
  for (const l of layouts.values()) {
    maxX = Math.max(maxX, l.x + nodeUnitWidth(l.treeNode));
    maxY = Math.max(maxY, l.y + AVATAR + 60);
  }

  return { layouts, totalW: maxX + PADDING, totalH: maxY + PADDING };
}

// ─── Connection builder ───────────────────────────────────────────────────────
function buildConnections(
  layouts: Map<string, LayoutNode>,
  highlight: HighlightState | null
): Connection[] {
  const conns: Connection[] = [];

  for (const [parentId, layout] of layouts) {
    const { treeNode, avatarCX, y } = layout;
    const fromX = avatarCX;
    const fromY = y + AVATAR;

    for (const child of treeNode.children) {
      const childLayout = layouts.get(child.member.id);
      if (!childLayout) continue;

      const toX = childLayout.avatarCX;
      const toY = childLayout.y;

      const parentHL =
        highlight?.highlightedIds.has(parentId) || parentId === highlight?.foundId;
      const childHL =
        highlight?.highlightedIds.has(child.member.id) ||
        child.member.id === highlight?.foundId;
      const isHighlighted = !!(highlight?.highlightedIds.size && parentHL && childHL);

      conns.push({
        fromX, fromY,
        toX, toY,
        isDirect: true,
        isHighlighted,
        highlightColor:
          highlight?.mode === 'descendants' ? 'var(--green)' : 'var(--blue)',
      });
    }
  }

  return conns;
}

// ─── SVG path ─────────────────────────────────────────────────────────────────
function connPath(conn: Connection): string {
  const { fromX, fromY, toX, toY } = conn;
  const mid = fromY + (toY - fromY) * 0.45;
  return `M ${fromX} ${fromY} C ${fromX} ${mid}, ${toX} ${mid}, ${toX} ${toY}`;
}

// ─── Highlight helper ─────────────────────────────────────────────────────────
function getHL(memberId: string, highlight: HighlightState | null): HighlightType {
  if (!highlight || !highlight.highlightedIds.size) return 'none';
  if (memberId === highlight.foundId) return 'self';
  if (highlight.highlightedIds.has(memberId))
    return highlight.mode === 'descendants' ? 'green' : 'blue';
  return 'dimmed';
}

// ─── Status visuals ───────────────────────────────────────────────────────────
const STATUS_ICON: Record<MarriageStatus, string> = {
  married: '♥', widowed: '✝', divorced: '÷', separated: '~', annulled: '✕',
};
const STATUS_COLOR: Record<MarriageStatus, string> = {
  married: '#22c55e', widowed: '#9ca3af', divorced: '#f59e0b',
  separated: '#f97316', annulled: '#ef4444',
};

// ─── NodeAvatar ───────────────────────────────────────────────────────────────
function NodeAvatar({
  member, highlight, onClick, nodeRef, faded,
}: {
  member: FamilyMember;
  highlight: HighlightType;
  onClick: () => void;
  nodeRef?: (el: HTMLDivElement | null) => void;
  faded?: boolean;
}) {
  const isAlive = !member.deathDate;

  const ringColor = {
    self: 'var(--accent)',
    green: 'var(--green)',
    blue: 'var(--blue)',
    dimmed: 'var(--border)',
    none: 'var(--border-light)',
  }[highlight];

  const hlClass = {
    self: 'highlighted-self',
    green: 'highlighted-green',
    blue: 'highlighted-blue',
    dimmed: 'dimmed',
    none: '',
  }[highlight];

  return (
    <div
      ref={nodeRef}
      data-member-id={member.id}
      className={`tree-node ${hlClass} flex flex-col items-center cursor-pointer group`}
      style={{ width: NODE_W, opacity: faded ? 0.65 : 1 }}
      onClick={onClick}
    >
      <div className="relative">
        <div
          className="node-avatar rounded-full overflow-hidden transition-all duration-300"
          style={{ width: AVATAR, height: AVATAR, border: `2.5px solid ${ringColor}` }}
        >
          <img
            src={getAvatarUrl(member)}
            alt={member.name}
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).src =
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}&backgroundColor=1a1828`;
            }}
          />
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
            style={{ background: member.gender === 'male' ? 'var(--blue)' : '#ec4899' }}
          />
        </div>
        {isAlive && (
          <div
            className="absolute"
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--green)', border: '2px solid var(--bg)',
              top: 56, left: 54,
            }}
          />
        )}
        {!isAlive && (
          <div
            className="absolute inset-0 rounded-full flex items-end justify-center pb-0.5"
            style={{ pointerEvents: 'none' }}
          >
            <span style={{ fontSize: 9, color: '#9ca3af' }}>✝</span>
          </div>
        )}
      </div>
      <div className="mt-2 text-center px-1">
        <p
          className="text-xs font-medium text-[var(--text)] leading-tight line-clamp-2"
          style={{ maxWidth: 82, wordBreak: 'break-word' }}
        >
          {member.name}
        </p>
        <p className="text-[10px] text-[var(--text-subtle)] mt-0.5 leading-tight">
          {getAge(member.birthDate, member.deathDate)}
        </p>
      </div>
    </div>
  );
}

// ─── TreeNodeRow ──────────────────────────────────────────────────────────────
function TreeNodeRow({
  treeNode, highlight, onClick, nodeRef, memberMap, onShowSpouses,
}: {
  treeNode: TreeNode;
  highlight: HighlightState | null;
  onClick: (m: FamilyMember) => void;
  nodeRef: (el: HTMLDivElement | null) => void;
  memberMap: Map<string, FamilyMember>;
  onShowSpouses: (m: FamilyMember) => void;
}) {
  const { member, spouses, spouseMarriages } = treeNode;
  const memberHL = getHL(member.id, highlight);

  // Only active spouse shown inline; past spouses go to side panel
  const activeSpouseIdx = spouseMarriages.findIndex(m => isActiveMarriage(m));
  const hasMultipleMarriages = spouseMarriages.length > 1;

  return (
    <div className="flex items-start">
      {/* Primary member */}
      <NodeAvatar
        member={member}
        highlight={memberHL}
        onClick={() => onClick(member)}
        nodeRef={nodeRef}
      />

      {/* Active spouse inline */}
      {activeSpouseIdx >= 0 && spouses[activeSpouseIdx] && (() => {
        const spouse = spouses[activeSpouseIdx];
        const marriage = spouseMarriages[activeSpouseIdx];
        const status = marriage?.status ?? 'married';
        const color = STATUS_COLOR[status];
        const icon = STATUS_ICON[status];
        return (
          <div className="flex items-start">
            <div style={{ width: COUPLE_CONNECTOR, paddingTop: AVATAR / 2 - 8 }}>
              <svg width={COUPLE_CONNECTOR} height="16" viewBox={`0 0 ${COUPLE_CONNECTOR} 16`}>
                <line x1="0" y1="8" x2={COUPLE_CONNECTOR} y2="8"
                  stroke={color} strokeWidth="1.5" />
                <text x={COUPLE_CONNECTOR / 2} y="14" textAnchor="middle"
                  fontSize="8" fill={color} fontFamily="system-ui">{icon}</text>
              </svg>
            </div>
            <NodeAvatar
              member={spouse}
              highlight={getHL(spouse.id, highlight)}
              onClick={() => onClick(spouse)}
            />
          </div>
        );
      })()}

      {/* Badge for multiple marriages */}
      {hasMultipleMarriages && (
        <button
          onClick={() => onShowSpouses(member)}
          className="self-start flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all hover:opacity-80"
          style={{
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
            marginTop: AVATAR / 2 - 8,
            marginLeft: 4,
          }}
          title="Lihat semua riwayat pernikahan"
        >
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {spouseMarriages.length}
        </button>
      )}
    </div>
  );
}

// ─── SpousesPanel ─────────────────────────────────────────────────────────────
function SpousesPanel({
  member, memberMap, onClose, onNavigate,
}: {
  member: FamilyMember;
  memberMap: Map<string, FamilyMember>;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const marriages = member.marriages ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="relative h-full w-full max-w-xs overflow-y-auto"
        style={{
          background: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          animation: 'slideInRight 0.25s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 border-b"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div>
            <p className="text-xs text-[var(--text-subtle)] mb-0.5">Riwayat Pernikahan</p>
            <h3 className="font-display text-base font-semibold text-[var(--text)]">
              {member.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--border)] transition-all"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Marriage cards */}
        <div className="p-4 space-y-3">
          {marriages.map((m, idx) => {
            const spouse = memberMap.get(m.spouseId);
            const active = isActiveMarriage(m);
            const colorClass = getMarriageStatusColor(m.status);
            const label = getMarriageStatusLabel(m.status);
            const icon = STATUS_ICON[m.status];
            const color = STATUS_COLOR[m.status];

            return (
              <div
                key={m.spouseId}
                className="rounded-xl p-3 transition-all"
                style={{
                  background: 'var(--bg)',
                  border: `1px solid ${active ? 'rgba(108,99,255,0.3)' : 'var(--border)'}`,
                  opacity: active ? 1 : 0.8,
                }}
              >
                {/* Status badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider">
                    Pernikahan ke-{idx + 1}
                  </span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${colorClass}`}>
                    {icon} {label}
                  </span>
                </div>

                {/* Spouse info */}
                {spouse ? (
                  <button
                    onClick={() => { onNavigate(spouse.id); onClose(); }}
                    className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity mb-3"
                  >
                    <div
                      className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0"
                      style={{ border: `2px solid ${color}` }}
                    >
                      <img
                        src={getAvatarUrl(spouse)}
                        alt={spouse.name}
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).src =
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(spouse.name)}`;
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{spouse.name}</p>
                      <p className="text-[10px] text-[var(--text-subtle)]">
                        {spouse.gender === 'male' ? 'Suami' : 'Istri'} · {getAge(spouse.birthDate, spouse.deathDate)}
                      </p>
                    </div>
                  </button>
                ) : (
                  <p className="text-sm text-[var(--text-subtle)] mb-3 italic">Data tidak tersedia</p>
                )}

                {/* Dates */}
                <div className="flex flex-wrap gap-2 text-[10px] text-[var(--text-subtle)]">
                  {m.marriedDate && (
                    <span className="flex items-center gap-1">
                      <span style={{ color }}>●</span>
                      Menikah:{' '}
                      {new Date(m.marriedDate).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  )}
                  {m.endDate && (
                    <span className="flex items-center gap-1">
                      <span>○</span>
                      Berakhir:{' '}
                      {new Date(m.endDate).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {marriages.length === 0 && (
            <p className="text-sm text-[var(--text-subtle)] text-center py-8">
              Tidak ada data pernikahan
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main FamilyTree component ────────────────────────────────────────────────
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
  const [layout, setLayout] = useState<ReturnType<typeof buildLayout> | null>(null);
  const [spousePanelMember, setSpousePanelMember] = useState<FamilyMember | null>(null);

  useEffect(() => {
    setLayout(buildLayout(roots));
  }, [roots]);

  // Scroll to focused node inside the container (accounts for zoom)
  useEffect(() => {
    if (!focusId || !scrollRef.current || !layout) return;
    const l = layout.layouts.get(focusId);
    if (!l) return;
    const nodeX = l.avatarCX * zoom;
    const nodeY = l.y * zoom;
    const c = scrollRef.current;
    c.scrollTo({
      left: nodeX - c.clientWidth / 2,
      top: nodeY - c.clientHeight / 2 + (AVATAR * zoom) / 2,
      behavior: 'smooth',
    });
  }, [focusId, layout, zoom]);

  const connections = layout ? buildConnections(layout.layouts, highlight) : [];

  if (!layout) return (
    <div className="flex items-center justify-center h-64 text-[var(--text-subtle)]">
      <div className="text-sm animate-pulse">Menyusun pohon silsilah...</div>
    </div>
  );

  return (
    <div className="relative w-full h-full flex flex-col">

      {/* ── Zoom controls ── */}
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
          style={{ fontSize: 18, fontWeight: 300 }}
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
          style={{ fontSize: 18, fontWeight: 300 }}
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

      {/* ── Scrollable canvas ── */}
      <div
        ref={scrollRef}
        className="tree-scroll-container flex-1"
        style={{ overflow: 'auto', position: 'relative' }}
      >
        <div
          className="tree-zoom-canvas"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: layout.totalW,
            height: layout.totalH,
            minWidth: layout.totalW * zoom,
            minHeight: layout.totalH * zoom,
            position: 'relative',
          }}
        >
          {/* SVG connections */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={layout.totalW}
            height={layout.totalH}
          >
            {connections.map((conn, i) => {
              const dimmed = !!(highlight?.highlightedIds.size && !conn.isHighlighted);
              const sw = conn.isHighlighted ? 3 : 1.5;
              return (
                <path
                  key={i}
                  d={connPath(conn)}
                  fill="none"
                  stroke={conn.isHighlighted ? conn.highlightColor : 'var(--connector)'}
                  strokeWidth={sw}
                  strokeLinecap="round"
                  opacity={dimmed ? 0.1 : 1}
                  style={{ transition: 'stroke 0.3s, stroke-width 0.3s, opacity 0.3s' }}
                />
              );
            })}
          </svg>

          {/* Tree nodes */}
          <div style={{ width: layout.totalW, height: layout.totalH, position: 'relative' }}>
            {[...layout.layouts.values()].map(({ treeNode, x, y }) => (
              <div key={treeNode.member.id} className="absolute" style={{ left: x, top: y }}>
                <TreeNodeRow
                  treeNode={treeNode}
                  highlight={highlight}
                  onClick={onNodeClick}
                  nodeRef={(el) => { if (el) nodeRefs.current.set(treeNode.member.id, el); }}
                  memberMap={memberMap}
                  onShowSpouses={setSpousePanelMember}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spouses side panel */}
      {spousePanelMember && (
        <SpousesPanel
          member={spousePanelMember}
          memberMap={memberMap}
          onClose={() => setSpousePanelMember(null)}
          onNavigate={(id) => {
            const m = memberMap.get(id);
            if (m) onNodeClick(m);
          }}
        />
      )}
    </div>
  );
}