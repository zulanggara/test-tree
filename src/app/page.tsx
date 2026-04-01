'use client';

import { useState, useCallback, useMemo } from 'react';
import { FamilyMember, HighlightState, SearchMode, TreeNode } from '@/types';
import {
  buildMemberMap, buildTree, getDescendants, getAncestors,
  getSpouseIds, getAvatarUrl, isActiveMarriage,
} from '@/lib/family';
import { SearchBar } from '@/components/SearchBar';
import { FamilyTree } from '@/components/FamilyTree';
import { DetailModal } from '@/components/DetailModal';
import { Legend } from '@/components/Legend';
import familyData from '../../data/family.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function collectSubtreeIds(node: TreeNode): Set<string> {
  const ids = new Set<string>();
  function walk(n: TreeNode) {
    ids.add(n.member.id);
    n.spouses.forEach(s => ids.add(s.id));
    n.children.forEach(walk);
  }
  walk(node);
  return ids;
}

function getSubtreeGenerations(node: TreeNode): number {
  let max = 0;
  function walk(n: TreeNode, d: number) {
    if (d > max) max = d;
    n.children.forEach(c => walk(c, d + 1));
  }
  walk(node, 0);
  return max + 1;
}

// ─── Card color palettes ──────────────────────────────────────────────────────
const CARD_COLORS = [
  { from: '#1e1b4b', to: '#312e81', accent: '#818cf8' },
  { from: '#064e3b', to: '#065f46', accent: '#34d399' },
  { from: '#4c0519', to: '#881337', accent: '#fb7185' },
  { from: '#451a03', to: '#7c2d12', accent: '#fb923c' },
  { from: '#0c4a6e', to: '#075985', accent: '#38bdf8' },
  { from: '#2e1065', to: '#4c1d95', accent: '#c084fc' },
];

// ─── FamilyCard ───────────────────────────────────────────────────────────────
function FamilyCard({ root, idx, memberMap, onClick }: {
  root: TreeNode;
  idx: number;
  memberMap: Map<string, FamilyMember>;
  onClick: () => void;
}) {
  const colors = CARD_COLORS[idx % CARD_COLORS.length];
  const ids = collectSubtreeIds(root);
  const totalCount = ids.size;
  const aliveCount = [...ids].filter(id => !memberMap.get(id)?.deathDate).length;
  const generations = getSubtreeGenerations(root);

  const displaySpouseIdx = (() => {
    const ai = root.spouseMarriages.findIndex(m => isActiveMarriage(m));
    return ai >= 0 ? ai : root.spouses.length > 0 ? 0 : -1;
  })();
  const spouse = displaySpouseIdx >= 0 ? root.spouses[displaySpouseIdx] : null;

  const surname = root.member.name.trim().split(' ').pop();

  return (
    <button
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden text-left w-full transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }} />
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.07) 0%, transparent 60%)' }} />

      <div className="relative p-6">
        {/* Avatars */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: `2.5px solid ${colors.accent}` }}>
            <img src={getAvatarUrl(root.member)} alt={root.member.name}
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(root.member.name)}`; }} />
          </div>
          {spouse && (
            <>
              <div className="text-sm font-bold" style={{ color: colors.accent }}>+</div>
              <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: '2.5px solid rgba(255,255,255,0.2)' }}>
                <img src={getAvatarUrl(spouse)} alt={spouse.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(spouse.name)}`; }} />
              </div>
            </>
          )}
        </div>

        {/* Label + name */}
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1"
          style={{ color: colors.accent }}>Keluarga</p>
        <h3 className="font-display text-2xl font-bold leading-tight mb-1 text-white">
          {surname}
        </h3>
        <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {root.member.name}{spouse ? ` & ${spouse.name}` : ''}
        </p>

        {/* Stats */}
        <div className="flex gap-5">
          {[
            { value: totalCount, label: 'anggota' },
            { value: generations, label: 'generasi' },
            { value: aliveCount, label: 'masih hidup' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-xl font-bold" style={{ color: colors.accent }}>{value}</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Origin */}
        {root.member.birthPlace && (
          <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {root.member.birthPlace.split(',')[0]}
          </p>
        )}

        {/* Hover arrow */}
        <div
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.12)' }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [activeRootId, setActiveRootId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [highlight, setHighlight] = useState<HighlightState | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const memberMap = useMemo(() => buildMemberMap(familyData as any), []);
  const members = useMemo(() => (familyData as any).members as FamilyMember[], []);
  const allRoots = useMemo(() => buildTree(members, memberMap), [members, memberMap]);

  const activeRoots = useMemo(
    () => activeRootId ? allRoots.filter(r => r.member.id === activeRootId) : allRoots,
    [allRoots, activeRootId],
  );

  const handleSearch = useCallback((query: string, mode: SearchMode) => {
    const found = members.find(m => m.name.toLowerCase().includes(query.toLowerCase()));
    if (!found) {
      setHighlight({ mode, highlightedIds: new Set(), searchQuery: query, foundId: null });
      return;
    }
    const relatedIds = mode === 'descendants'
      ? getDescendants(found.id, memberMap)
      : getAncestors(found.id, memberMap);
    for (const sid of getSpouseIds(found)) relatedIds.add(sid);
    setHighlight({ mode, highlightedIds: relatedIds, searchQuery: query, foundId: found.id });
    setFocusId(found.id);
  }, [members, memberMap]);

  const handleClear = useCallback(() => {
    setHighlight(null);
    setFocusId(null);
  }, []);

  const handleNodeClick = useCallback((member: FamilyMember) => {
    const relatedIds = getDescendants(member.id, memberMap);
    for (const sid of getSpouseIds(member)) relatedIds.add(sid);
    setHighlight({ mode: 'descendants', highlightedIds: relatedIds, searchQuery: member.name, foundId: member.id });
    setFocusId(member.id);
  }, [memberMap]);

  const handleNodeDoubleClick = useCallback((member: FamilyMember) => {
    setSelectedMember(member);
  }, []);

  const handleNavigate = useCallback((id: string) => {
    const member = memberMap.get(id);
    if (member) { setSelectedMember(member); setFocusId(id); }
  }, [memberMap]);

  const handleBackToList = useCallback(() => {
    setActiveRootId(null);
    setHighlight(null);
    setFocusId(null);
  }, []);

  const totalMembers = members.length;
  const aliveMembers = members.filter(m => !m.deathDate).length;

  // ── LIST VIEW ───────────────────────────────────────────────────────────────
  if (!activeRootId) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
        <header className="border-b px-4 sm:px-6 py-4" style={{
          borderColor: 'var(--border)',
          background: 'rgba(15,14,23,0.95)',
          backdropFilter: 'blur(12px)',
        }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-base font-semibold text-[var(--text)] leading-none">
                The Living Archive
              </h1>
              <p className="text-[10px] text-[var(--text-subtle)] leading-none mt-0.5">Silsilah Keluarga</p>
            </div>
          </div>
        </header>

        {/* Hero */}
        <div className="px-4 sm:px-6 pt-14 pb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--accent)' }}>
            The Living Archive
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text)] mb-3">
            Pohon Silsilah Keluarga
          </h2>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: 'var(--text-subtle)' }}>
            Pilih keluarga untuk menjelajahi pohon silsilahnya.
            List ini bertambah otomatis saat keluarga baru ditambahkan.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span><strong className="text-[var(--text)]">{totalMembers}</strong> total anggota</span>
            <span style={{ color: 'var(--border)' }}>•</span>
            <span><strong className="text-[var(--text)]">{aliveMembers}</strong> masih hidup</span>
            <span style={{ color: 'var(--border)' }}>•</span>
            <span><strong className="text-[var(--text)]">{allRoots.length}</strong> keluarga</span>
          </div>
        </div>

        {/* Cards */}
        <main className="flex-1 px-4 sm:px-6 pb-16">
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allRoots.map((root, idx) => (
              <FamilyCard
                key={root.member.id}
                root={root}
                idx={idx}
                memberMap={memberMap}
                onClick={() => setActiveRootId(root.member.id)}
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ── TREE VIEW ───────────────────────────────────────────────────────────────
  const activeRoot = allRoots.find(r => r.member.id === activeRootId)!;
  const activeSurname = activeRoot?.member.name.trim().split(' ').pop();

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-40 border-b" style={{
        background: 'rgba(15,14,23,0.92)',
        backdropFilter: 'blur(12px)',
        borderColor: 'var(--border)',
      }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Back + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToList}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Semua Keluarga</span>
            </button>
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="font-display font-semibold text-[var(--text)]">
                Keluarga {activeSurname}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3 text-xs" style={{ color: 'var(--text-subtle)' }}>
            <span><strong className="text-[var(--text)]">{totalMembers}</strong> anggota</span>
            <span>•</span>
            <span><strong className="text-[var(--text)]">{aliveMembers}</strong> masih hidup</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 sm:px-6 pb-3">
          <SearchBar onSearch={handleSearch} onClear={handleClear} />
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {highlight && (
          <div className="px-4 sm:px-6 py-2 border-b flex items-center gap-3"
            style={{
              background: highlight.mode === 'descendants' ? 'var(--green-dim)' : 'var(--blue-dim)',
              borderColor: 'var(--border)',
            }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: highlight.mode === 'descendants' ? 'var(--green)' : 'var(--blue)' }} />
            <p className="text-sm text-[var(--text-muted)]">
              {highlight.foundId ? (
                <>
                  Menampilkan{' '}
                  <strong className="text-[var(--text)]">
                    {highlight.mode === 'descendants' ? 'keturunan' : 'leluhur'}
                  </strong>{' '}
                  dari{' '}
                  <strong className="text-[var(--text)]">
                    {members.find(m => m.id === highlight.foundId)?.name}
                  </strong>
                  {' '}— {highlight.highlightedIds.size} anggota
                </>
              ) : (
                <span className="text-red-400">"{highlight.searchQuery}" tidak ditemukan</span>
              )}
            </p>
            <button onClick={handleClear}
              className="ml-auto text-xs transition-colors shrink-0"
              style={{ color: 'var(--text-subtle)' }}>
              Hapus filter
            </button>
          </div>
        )}

        <div className="flex-1 relative">
          <div className="w-full h-full" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <FamilyTree
              roots={activeRoots}
              memberMap={memberMap}
              highlight={highlight}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              onClearHighlight={handleClear}
              focusId={focusId}
            />
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 border-t"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <Legend />
        </div>
      </main>

      {selectedMember && (
        <DetailModal
          member={selectedMember}
          memberMap={memberMap}
          onClose={() => setSelectedMember(null)}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
