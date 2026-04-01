'use client';

import { useRef, useEffect, useState } from 'react';
import { FamilyMember, TreeNode, HighlightState, MarriageStatus } from '@/types';
import { getAge, getAvatarUrl, isActiveMarriage, getMarriageStatusLabel, getMarriageStatusColor } from '@/lib/family';
import { usePhoto } from '@/contexts/PhotoContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const NODE_W = 90;
const AVATAR = 72;
const SIBLING_GAP = 70;
const LEVEL_H = 220;
const PADDING = 80;
const COUPLE_CONNECTOR = 32;

// ─── Types ────────────────────────────────────────────────────────────────────
type HighlightType = 'self' | 'green' | 'blue' | 'dimmed' | 'none';

interface LayoutNode {
  treeNode: TreeNode;
  x: number;
  y: number;
  avatarCX: number;
  childAnchorCX: number; // midpoint pasangan, untuk centering anak & koneksi ke bawah
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

interface CrossConnection {
  x1: number; y1: number;
  x2: number; y2: number;
}

// ─── Layout engine ────────────────────────────────────────────────────────────
function nodeUnitWidth(node: TreeNode): number {
  // Tampilkan 1 pasangan inline (aktif maupun tidak) agar tidak ada yang hilang dari pohon
  const hasSpouse = node.spouseMarriages.length > 0;
  return NODE_W + (hasSpouse ? NODE_W + COUPLE_CONNECTOR : 0);
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

    // Midpoint antara dua pasangan → titik anchor koneksi ke anak
    // Gunakan semua pasangan (aktif maupun tidak) agar layout konsisten
    const hasSpouseDisplay = node.spouseMarriages.length > 0;
    const spouseCX = x + NODE_W + COUPLE_CONNECTOR + AVATAR / 2;
    const childAnchorCX = hasSpouseDisplay ? (avatarCX + spouseCX) / 2 : avatarCX;

    layouts.set(node.member.id, { treeNode: node, x, y, avatarCX, childAnchorCX, branchY: y + AVATAR + 20 });

    if (node.children.length > 0) {
      const childrenTotalW = node.children.reduce(
        (s, c) => s + subtreeWidth(c) + SIBLING_GAP, -SIBLING_GAP
      );
      // Center children under the midpoint of the full allocated subtree width.
      // Using childAnchorCX (couple midpoint, offset from x) causes children to
      // overflow the allocated space and overlap with siblings.
      const layoutCenterX = x + subtreeWidth(node) / 2;
      let childX = layoutCenterX - childrenTotalW / 2;
      for (const child of node.children) {
        const w = subtreeWidth(child);
        place(child, childX, y + LEVEL_H);
        childX += w + SIBLING_GAP;
      }
    }
  }

  let cursorX = PADDING;
  for (const root of roots) {
    place(root, cursorX, PADDING);
    cursorX += subtreeWidth(root) + SIBLING_GAP * 2;
  }

  let minX = Infinity;
  for (const l of layouts.values()) minX = Math.min(minX, l.x);
  const shift = minX < PADDING ? PADDING - minX : 0;
  if (shift > 0) {
    for (const l of layouts.values()) {
      l.x += shift;
      l.avatarCX += shift;
      l.childAnchorCX += shift;
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
    const { treeNode, childAnchorCX, y } = layout;
    const fromX = childAnchorCX; // keluar dari midpoint pasangan, bukan hanya primary
    const fromY = y + AVATAR;

    for (const child of treeNode.children) {
      const childLayout = layouts.get(child.member.id);
      if (!childLayout) continue;

      const toX = childLayout.avatarCX;
      const toY = childLayout.y;

      const parentHL = highlight?.highlightedIds.has(parentId) || parentId === highlight?.foundId;
      const childHL = highlight?.highlightedIds.has(child.member.id) || child.member.id === highlight?.foundId;
      const isHighlighted = !!(highlight?.highlightedIds.size && parentHL && childHL);

      conns.push({
        fromX, fromY, toX, toY,
        isDirect: true,
        isHighlighted,
        highlightColor: highlight?.mode === 'descendants' ? 'var(--green)' : 'var(--blue)',
      });
    }
  }
  return conns;
}

// Detect pairs where both spouses appear as primary layout nodes (cross-family marriages).
function buildCrossConnections(layouts: Map<string, LayoutNode>): CrossConnection[] {
  const seen = new Set<string>();
  const result: CrossConnection[] = [];
  for (const [id, layout] of layouts) {
    for (const spouse of layout.treeNode.spouses) {
      const key = [id, spouse.id].sort().join('-');
      if (seen.has(key)) continue;
      if (layouts.has(spouse.id)) {
        seen.add(key);
        const sl = layouts.get(spouse.id)!;
        result.push({
          x1: layout.avatarCX,
          y1: layout.y + AVATAR / 2,
          x2: sl.avatarCX,
          y2: sl.y + AVATAR / 2,
        });
      }
    }
  }
  return result;
}

function connPath(conn: Connection): string {
  const { fromX, fromY, toX, toY } = conn;
  const mid = fromY + (toY - fromY) * 0.45;
  return `M ${fromX} ${fromY} C ${fromX} ${mid}, ${toX} ${mid}, ${toX} ${toY}`;
}

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

// ─── NodeAvatar — single/double click ────────────────────────────────────────
function NodeAvatar({
  member, highlight, onClick, onDoubleClick, nodeRef, faded,
}: {
  member: FamilyMember;
  highlight: HighlightType;
  onClick: () => void;
  onDoubleClick: () => void;
  nodeRef?: (el: HTMLDivElement | null) => void;
  faded?: boolean;
}) {
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getPhoto } = usePhoto();

  const handleClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onDoubleClick();
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        onClick();
      }, 250);
    }
  };

  const isAlive = !member.deathDate;
  const ringColor = {
    self: 'var(--accent)', green: 'var(--green)',
    blue: 'var(--blue)', dimmed: 'var(--border)', none: 'var(--border-light)',
  }[highlight];
  const hlClass = {
    self: 'highlighted-self', green: 'highlighted-green',
    blue: 'highlighted-blue', dimmed: 'dimmed', none: '',
  }[highlight];

  return (
    <div
      ref={nodeRef}
      data-member-id={member.id}
      className={`tree-node ${hlClass} flex flex-col items-center cursor-pointer group`}
      style={{ width: NODE_W, opacity: faded ? 0.65 : 1 }}
      onClick={handleClick}
    >
      <div className="relative">
        <div
          className="node-avatar rounded-full overflow-hidden transition-all duration-300"
          style={{ width: AVATAR, height: AVATAR, border: `2.5px solid ${ringColor}` }}
        >
          <img
            src={getPhoto(member.id, getAvatarUrl(member))}
            alt={member.name}
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).src =
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}&backgroundColor=1a1828`;
            }}
          />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
            style={{ background: member.gender === 'male' ? 'var(--blue)' : '#ec4899' }} />
        </div>
        {isAlive && (
          <div className="absolute" style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--green)', border: '2px solid var(--bg)',
            top: 56, left: 54,
          }} />
        )}
        {!isAlive && (
          <div className="absolute inset-0 rounded-full flex items-end justify-center pb-0.5"
            style={{ pointerEvents: 'none' }}>
            <span style={{ fontSize: 9, color: '#9ca3af' }}>✝</span>
          </div>
        )}
      </div>
      <div className="mt-2 text-center px-1">
        <p className="text-xs font-medium text-[var(--text)] leading-tight line-clamp-2"
          style={{ maxWidth: 82, wordBreak: 'break-word' }}>
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
  treeNode, highlight, onClick, onDoubleClick, nodeRef, onShowSpouses,
}: {
  treeNode: TreeNode;
  highlight: HighlightState | null;
  onClick: (m: FamilyMember) => void;
  onDoubleClick: (m: FamilyMember) => void;
  nodeRef: (el: HTMLDivElement | null) => void;
  onShowSpouses: (m: FamilyMember) => void;
}) {
  const { member, spouses, spouseMarriages } = treeNode;
  const memberHL = getHL(member.id, highlight);
  const hasMultipleMarriages = spouseMarriages.length > 1;

  // Tampilkan pasangan aktif dulu; jika tidak ada, tampilkan pasangan pertama (widowed/divorced)
  // sehingga tidak ada anggota yang hilang dari pohon silsilah
  const displaySpouseIdx = (() => {
    const activeIdx = spouseMarriages.findIndex(m => isActiveMarriage(m));
    if (activeIdx >= 0) return activeIdx;
    return spouseMarriages.length > 0 ? 0 : -1;
  })();

  return (
    <div className="flex items-start">
      <NodeAvatar
        member={member}
        highlight={memberHL}
        onClick={() => onClick(member)}
        onDoubleClick={() => onDoubleClick(member)}
        nodeRef={nodeRef}
      />

      {displaySpouseIdx >= 0 && spouses[displaySpouseIdx] && (() => {
        const spouse = spouses[displaySpouseIdx];
        const marriage = spouseMarriages[displaySpouseIdx];
        const status = marriage?.status ?? 'married';
        const isActive = isActiveMarriage(marriage);
        const color = STATUS_COLOR[status];
        const icon = STATUS_ICON[status];
        return (
          <div className="flex items-start">
            <div style={{ width: COUPLE_CONNECTOR, paddingTop: AVATAR / 2 - 8 }}>
              <svg width={COUPLE_CONNECTOR} height="16" viewBox={`0 0 ${COUPLE_CONNECTOR} 16`}>
                <line x1="0" y1="8" x2={COUPLE_CONNECTOR} y2="8"
                  stroke={color} strokeWidth="1.5"
                  strokeDasharray={isActive ? undefined : '4 2'} />
                <text x={COUPLE_CONNECTOR / 2} y="14" textAnchor="middle"
                  fontSize="8" fill={color} fontFamily="system-ui">{icon}</text>
              </svg>
            </div>
            <NodeAvatar
              member={spouse}
              highlight={getHL(spouse.id, highlight)}
              onClick={() => onClick(spouse)}
              onDoubleClick={() => onDoubleClick(spouse)}
              faded={!isActive}
            />
          </div>
        );
      })()}

      {hasMultipleMarriages && (
        <button
          onClick={() => onShowSpouses(member)}
          className="self-start flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all hover:opacity-80"
          style={{
            background: 'var(--accent-dim)', border: '1px solid var(--accent)',
            color: 'var(--accent)', marginTop: AVATAR / 2 - 8, marginLeft: 4,
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
          background: 'var(--card)', borderLeft: '1px solid var(--border)',
          animation: 'slideInRight 0.25s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 border-b"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div>
            <p className="text-xs text-[var(--text-subtle)] mb-0.5">Riwayat Pernikahan</p>
            <h3 className="font-display text-base font-semibold text-[var(--text)]">{member.name}</h3>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--border)] transition-all">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {marriages.map((m, idx) => {
            const spouse = memberMap.get(m.spouseId);
            const active = isActiveMarriage(m);
            const colorClass = getMarriageStatusColor(m.status);
            const label = getMarriageStatusLabel(m.status);
            const icon = STATUS_ICON[m.status];
            const color = STATUS_COLOR[m.status];

            return (
              <div key={m.spouseId}
                className="rounded-xl p-3 transition-all"
                style={{
                  background: 'var(--bg)',
                  border: `1px solid ${active ? 'rgba(108,99,255,0.3)' : 'var(--border)'}`,
                  opacity: active ? 1 : 0.8,
                }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider">
                    Pernikahan ke-{idx + 1}
                  </span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${colorClass}`}>
                    {icon} {label}
                  </span>
                </div>

                {spouse ? (
                  <button
                    onClick={() => { onNavigate(spouse.id); onClose(); }}
                    className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity mb-3"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0"
                      style={{ border: `2px solid ${color}` }}>
                      <img src={getAvatarUrl(spouse)} alt={spouse.name}
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).src =
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(spouse.name)}`;
                        }} />
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

                <div className="flex flex-wrap gap-2 text-[10px] text-[var(--text-subtle)]">
                  {m.marriedDate && (
                    <span className="flex items-center gap-1">
                      <span style={{ color }}>●</span>
                      Menikah: {new Date(m.marriedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {m.endDate && (
                    <span className="flex items-center gap-1">
                      <span>○</span>
                      Berakhir: {new Date(m.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {marriages.length === 0 && (
            <p className="text-sm text-[var(--text-subtle)] text-center py-8">Tidak ada data pernikahan</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main FamilyTree ──────────────────────────────────────────────────────────
interface FamilyTreeProps {
  roots: TreeNode[];
  memberMap: Map<string, FamilyMember>;
  highlight: HighlightState | null;
  onNodeClick: (member: FamilyMember) => void;
  onNodeDoubleClick: (member: FamilyMember) => void;
  onClearHighlight: () => void;
  focusId: string | null;
}

const MINIMAP_W = 180;
const MINIMAP_H = 100;

export function FamilyTree({
  roots, memberMap, highlight, onNodeClick, onNodeDoubleClick, onClearHighlight, focusId,
}: FamilyTreeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [zoom, setZoom] = useState(1);
  const [layout, setLayout] = useState<ReturnType<typeof buildLayout> | null>(null);
  const [spousePanelMember, setSpousePanelMember] = useState<FamilyMember | null>(null);
  const [viewport, setViewport] = useState({ scrollLeft: 0, scrollTop: 0, w: 0, h: 0 });

  // Drag-to-pan state
  const dragRef = useRef<{ startX: number; startY: number; sl: number; st: number } | null>(null);
  // Mini-map drag state
  const mmDragRef = useRef<{ startX: number; startY: number; initSL: number; initST: number } | null>(null);

  useEffect(() => {
    setLayout(buildLayout(roots));
  }, [roots]);

  useEffect(() => {
    if (!focusId || !scrollRef.current || !layout) return;
    const l = layout.layouts.get(focusId);
    if (!l) return;
    const c = scrollRef.current;
    c.scrollTo({
      left: l.avatarCX * zoom - c.clientWidth / 2,
      top: l.y * zoom - c.clientHeight / 2 + (AVATAR * zoom) / 2,
      behavior: 'smooth',
    });
  }, [focusId, layout, zoom]);

  // Track viewport for mini-map
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setViewport({ scrollLeft: el.scrollLeft, scrollTop: el.scrollTop, w: el.clientWidth, h: el.clientHeight });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [layout]);

  // Drag-to-pan handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.tree-node, button, input')) return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
    el.style.cursor = 'grabbing';
    e.preventDefault();
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = dragRef.current.sl - (e.clientX - dragRef.current.startX);
    el.scrollTop = dragRef.current.st - (e.clientY - dragRef.current.startY);
  };
  const onMouseUp = () => {
    dragRef.current = null;
    if (scrollRef.current) scrollRef.current.style.cursor = '';
  };

  const connections = layout ? buildConnections(layout.layouts, highlight) : [];
  const crossConnections = layout ? buildCrossConnections(layout.layouts) : [];

  if (!layout) return (
    <div className="flex items-center justify-center h-64 text-[var(--text-subtle)]">
      <div className="text-sm animate-pulse">Menyusun pohon silsilah...</div>
    </div>
  );

  // Mini-map calculations
  const mmScaleX = MINIMAP_W / (layout.totalW || 1);
  const mmScaleY = MINIMAP_H / (layout.totalH || 1);
  const mmVpW = Math.min(MINIMAP_W, (viewport.w / zoom) * mmScaleX);
  const mmVpH = Math.min(MINIMAP_H, (viewport.h / zoom) * mmScaleY);
  const mmVpX = (viewport.scrollLeft / zoom) * mmScaleX;
  const mmVpY = (viewport.scrollTop / zoom) * mmScaleY;

  return (
    <div className="relative w-full h-full flex flex-col min-h-0">

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 6px' }}>
        <button onClick={() => setZoom(z => Math.max(0.3, parseFloat((z - 0.1).toFixed(1))))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all"
          style={{ fontSize: 18, fontWeight: 300 }}>−</button>
        <span className="text-xs text-[var(--text-subtle)] select-none" style={{ minWidth: 36, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => setZoom(z => Math.min(2, parseFloat((z + 0.1).toFixed(1))))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all"
          style={{ fontSize: 18, fontWeight: 300 }}>+</button>
        <div style={{ width: 1, background: 'var(--border)', height: 16, margin: '0 2px' }} />
        <button onClick={() => setZoom(1)} title="Reset zoom"
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Mini-map — interactive */}
      <div
        className="absolute bottom-4 right-3 z-10 rounded-xl overflow-hidden print:hidden"
        style={{
          width: MINIMAP_W, height: MINIMAP_H,
          background: 'var(--card)', border: '1px solid var(--border)',
          opacity: 0.92, cursor: 'crosshair',
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          // Jump scroll to clicked position (center viewport on click)
          const el = scrollRef.current;
          if (!el) return;
          const targetScrollLeft = (clickX / mmScaleX - viewport.w / zoom / 2) * zoom;
          const targetScrollTop  = (clickY / mmScaleY - viewport.h / zoom / 2) * zoom;
          el.scrollTo({ left: targetScrollLeft, top: targetScrollTop, behavior: 'smooth' });
          // Start drag on minimap
          mmDragRef.current = { startX: e.clientX, startY: e.clientY, initSL: targetScrollLeft, initST: targetScrollTop };
        }}
        onMouseMove={(e) => {
          if (!mmDragRef.current) return;
          e.stopPropagation();
          const el = scrollRef.current;
          if (!el) return;
          const dx = (e.clientX - mmDragRef.current.startX) / mmScaleX * zoom;
          const dy = (e.clientY - mmDragRef.current.startY) / mmScaleY * zoom;
          el.scrollLeft = mmDragRef.current.initSL + dx;
          el.scrollTop  = mmDragRef.current.initST + dy;
        }}
        onMouseUp={() => { mmDragRef.current = null; }}
        onMouseLeave={() => { mmDragRef.current = null; }}
      >
        <svg width={MINIMAP_W} height={MINIMAP_H} style={{ display: 'block' }}>
          {/* Connection lines */}
          {connections.map((conn, i) => (
            <line
              key={i}
              x1={conn.fromX * mmScaleX}
              y1={conn.fromY * mmScaleY}
              x2={conn.toX * mmScaleX}
              y2={conn.toY * mmScaleY}
              stroke={conn.isHighlighted ? conn.highlightColor : 'var(--border-light)'}
              strokeWidth={0.6}
              opacity={conn.isHighlighted ? 0.8 : 0.4}
            />
          ))}
          {[...layout.layouts.values()].map(({ treeNode, avatarCX, y }) => (
            <circle
              key={treeNode.member.id}
              cx={avatarCX * mmScaleX}
              cy={y * mmScaleY}
              r={2.5}
              fill={
                treeNode.member.id === highlight?.foundId ? 'var(--accent)' :
                highlight?.highlightedIds.has(treeNode.member.id) ? 'var(--green)' :
                treeNode.member.gender === 'male' ? 'var(--blue)' : '#ec4899'
              }
              opacity={highlight?.highlightedIds.size && !highlight.highlightedIds.has(treeNode.member.id) && treeNode.member.id !== highlight.foundId ? 0.2 : 0.85}
            />
          ))}
          {/* Viewport rect */}
          <rect
            x={Math.max(0, mmVpX)} y={Math.max(0, mmVpY)}
            width={Math.min(MINIMAP_W - Math.max(0, mmVpX), mmVpW)}
            height={Math.min(MINIMAP_H - Math.max(0, mmVpY), mmVpH)}
            fill="rgba(108,99,255,0.1)" stroke="var(--accent)" strokeWidth={1.5}
            rx={2} style={{ pointerEvents: 'none' }}
          />
        </svg>
      </div>

      {/* Scrollable canvas */}
      <div
        ref={scrollRef}
        className="tree-scroll-container flex-1"
        style={{ overflow: 'auto', position: 'relative', cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest('.tree-node')) return;
          onClearHighlight();
        }}
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
          <svg className="absolute inset-0 pointer-events-none" width={layout.totalW} height={layout.totalH}>
            {connections.map((conn, i) => {
              const dimmed = !!(highlight?.highlightedIds.size && !conn.isHighlighted);
              return (
                <path
                  key={i}
                  d={connPath(conn)}
                  fill="none"
                  stroke={conn.isHighlighted ? conn.highlightColor : 'var(--connector)'}
                  strokeWidth={conn.isHighlighted ? 3 : 1.5}
                  strokeLinecap="round"
                  opacity={dimmed ? 0.25 : 1}
                  style={{ transition: 'stroke 0.3s, stroke-width 0.3s, opacity 0.3s' }}
                />
              );
            })}
            {crossConnections.map((cc, i) => {
              const mx = (cc.x1 + cc.x2) / 2;
              const my = (cc.y1 + cc.y2) / 2 - 60;
              return (
                <path
                  key={`cross-${i}`}
                  d={`M ${cc.x1} ${cc.y1} Q ${mx} ${my}, ${cc.x2} ${cc.y2}`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  opacity={0.6}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          <div style={{ width: layout.totalW, height: layout.totalH, position: 'relative' }}>
            {[...layout.layouts.values()].map(({ treeNode, x, y }) => (
              <div key={treeNode.member.id} className="absolute" style={{ left: x, top: y }}>
                <TreeNodeRow
                  treeNode={treeNode}
                  highlight={highlight}
                  onClick={onNodeClick}
                  onDoubleClick={onNodeDoubleClick}
                  nodeRef={(el) => { if (el) nodeRefs.current.set(treeNode.member.id, el); }}
                  onShowSpouses={setSpousePanelMember}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spouses panel */}
      {spousePanelMember && (
        <SpousesPanel
          member={spousePanelMember}
          memberMap={memberMap}
          onClose={() => setSpousePanelMember(null)}
          onNavigate={(id) => {
            const m = memberMap.get(id);
            if (m) onNodeDoubleClick(m);
          }}
        />
      )}
    </div>
  );
}