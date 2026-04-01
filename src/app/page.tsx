'use client';

import { useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FamilyMember, HighlightState, SearchMode, TreeNode, ViewMode } from '@/types';
import {
  getDescendants, getAncestors, getSpouseIds, getAvatarUrl,
  isActiveMarriage, findRelationPath,
} from '@/lib/family';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useFamilyData } from '@/hooks/useFamilyData';
import { SearchBar } from '@/components/SearchBar';
import { FamilyTree } from '@/components/FamilyTree';
import { DetailModal } from '@/components/DetailModal';
import { Legend } from '@/components/Legend';
import { BirthdayPanel } from '@/components/BirthdayPanel';
import { StatsPanel } from '@/components/StatsPanel';
import { TimelineView } from '@/components/TimelineView';
import { usePhoto } from '@/contexts/PhotoContext';

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
  root: TreeNode; idx: number;
  memberMap: Map<string, FamilyMember>; onClick: () => void;
}) {
  const { getPhoto } = usePhoto();
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
        <div className="flex items-center gap-2 mb-5">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: `2.5px solid ${colors.accent}` }}>
            <img src={getPhoto(root.member.id, getAvatarUrl(root.member))} alt={root.member.name}
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(root.member.name)}`; }} />
          </div>
          {spouse && (
            <>
              <div className="text-sm font-bold" style={{ color: colors.accent }}>+</div>
              <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: '2.5px solid rgba(255,255,255,0.2)' }}>
                <img src={getPhoto(spouse.id, getAvatarUrl(spouse))} alt={spouse.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(spouse.name)}`; }} />
              </div>
            </>
          )}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: colors.accent }}>
          Keluarga
        </p>
        <h3 className="font-display text-2xl font-bold leading-tight mb-1 text-white">{surname}</h3>
        <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {root.member.name}{spouse ? ` & ${spouse.name}` : ''}
        </p>
        <div className="flex gap-5">
          {[{ value: totalCount, label: 'anggota' }, { value: generations, label: 'generasi' }, { value: aliveCount, label: 'masih hidup' }].map(({ value, label }) => (
            <div key={label}>
              <p className="text-xl font-bold" style={{ color: colors.accent }}>{value}</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
            </div>
          ))}
        </div>
        {root.member.birthPlace && (
          <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {root.member.birthPlace.split(',')[0]}
          </p>
        )}
        <div className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.12)' }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// ─── Relation Path Banner ─────────────────────────────────────────────────────
function RelationBanner({ path, memberMap, onClear, onNavigate }: {
  path: string[];
  memberMap: Map<string, FamilyMember>;
  onClear: () => void;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="px-4 sm:px-6 py-2 border-b flex items-center gap-2 overflow-x-auto"
      style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'var(--border)' }}>
      <span style={{ color: 'var(--gold)', fontSize: 14 }}>⛓</span>
      <div className="flex items-center gap-1 flex-nowrap">
        {path.map((id, i) => {
          const m = memberMap.get(id);
          if (!m) return null;
          return (
            <span key={id} className="flex items-center gap-1">
              {i > 0 && <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>→</span>}
              <button
                onClick={() => onNavigate(id)}
                className="text-xs font-medium px-2 py-0.5 rounded-md transition-all hover:opacity-80 shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--gold)', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                {m.name.split(' ')[0]}
              </button>
            </span>
          );
        })}
      </div>
      <span className="text-xs ml-2 shrink-0" style={{ color: 'var(--text-subtle)' }}>
        {path.length - 1} langkah
      </span>
      <button onClick={onClear} className="ml-auto text-xs shrink-0 transition-colors"
        style={{ color: 'var(--text-subtle)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}>
        Hapus
      </button>
    </div>
  );
}

// ─── ThemeToggle ──────────────────────────────────────────────────────────────
function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
      style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
    >
      {isDark ? (
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="5" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────
function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeRootId, setActiveRootId] = useState<string | null>(
    searchParams.get('family')
  );
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [highlight, setHighlight] = useState<HighlightState | null>(null);
  const [focusId, setFocusId] = useState<string | null>(searchParams.get('member'));
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [showBirthdays, setShowBirthdays] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [relationMode, setRelationMode] = useState(false);
  const [relationFrom, setRelationFrom] = useState<FamilyMember | null>(null);
  const [relationPath, setRelationPath] = useState<string[] | null>(null);

  const { isDark, toggle: toggleTheme } = useDarkMode();

  const { members, memberMap, allRoots, loading } = useFamilyData();

  const activeRoots = useMemo(
    () => (activeRootId && activeRootId !== '__all__')
      ? allRoots.filter(r => r.member.id === activeRootId)
      : allRoots,
    [allRoots, activeRootId],
  );

  // Members that belong to the active roots (for Stats / Birthday panels)
  const activeMembers = useMemo(() => {
    const ids = new Set<string>();
    function walk(node: TreeNode) {
      ids.add(node.member.id);
      node.spouses.forEach(s => ids.add(s.id));
      node.children.forEach(walk);
    }
    activeRoots.forEach(walk);
    return members.filter(m => ids.has(m.id));
  }, [activeRoots, members]);

  // Sync URL params
  useEffect(() => {
    if (!activeRootId) return;
    const params = new URLSearchParams();
    params.set('family', activeRootId);
    if (focusId) params.set('member', focusId);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [activeRootId, focusId]);

  // Open member from URL on load
  useEffect(() => {
    const memberId = searchParams.get('member');
    if (memberId) {
      const m = memberMap.get(memberId);
      if (m) setSelectedMember(m);
    } else if (activeRootId && activeRootId !== '__all__') {
      setFocusId(activeRootId);
    } else if (activeRootId === '__all__') {
      setFocusId(allRoots[0]?.member.id ?? null);
    }
  }, []);

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
    setRelationPath(null);
    setRelationFrom(null);
    setRelationMode(false);
  }, []);

  const handleNodeClick = useCallback((member: FamilyMember) => {
    if (relationMode) {
      if (!relationFrom) {
        setRelationFrom(member);
        return;
      }
      if (relationFrom.id === member.id) { setRelationFrom(null); return; }
      const path = findRelationPath(relationFrom.id, member.id, memberMap);
      setRelationPath(path);
      if (path) {
        const ids = new Set(path);
        setHighlight({ mode: 'descendants', highlightedIds: ids, searchQuery: '', foundId: member.id });
      }
      return;
    }
    const relatedIds = getDescendants(member.id, memberMap);
    for (const sid of getSpouseIds(member)) relatedIds.add(sid);
    setHighlight({ mode: 'descendants', highlightedIds: relatedIds, searchQuery: member.name, foundId: member.id });
    setFocusId(member.id);
  }, [memberMap, relationMode, relationFrom]);

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
    setRelationPath(null);
    setRelationFrom(null);
    setRelationMode(false);
    router.replace('/', { scroll: false });
  }, [router]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('Link disalin ke clipboard!');
    });
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const totalMembers = members.length;
  const aliveMembers = members.filter(m => !m.deathDate).length;

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-subtle)]">Memuat data keluarga…</p>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ───────────────────────────────────────────────────────────────
  if (!activeRootId) {
    return (
      <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
        <header className="border-b px-4 sm:px-6 py-4" style={{
          borderColor: 'var(--border)', background: 'var(--card)', backdropFilter: 'blur(12px)',
        }}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="font-display text-base font-semibold text-[var(--text)] leading-none">The Living Archive</h1>
                <p className="text-[10px] text-[var(--text-subtle)] leading-none mt-0.5">Silsilah Keluarga</p>
              </div>
            </div>
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </header>

        <div className="px-4 sm:px-6 pt-14 pb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
            The Living Archive
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text)] mb-3">
            Pohon Silsilah Keluarga
          </h2>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: 'var(--text-subtle)' }}>
            Pilih keluarga untuk menjelajahi pohon silsilahnya.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span><strong className="text-[var(--text)]">{totalMembers}</strong> total anggota</span>
            <span style={{ color: 'var(--border)' }}>•</span>
            <span><strong className="text-[var(--text)]">{aliveMembers}</strong> masih hidup</span>
            <span style={{ color: 'var(--border)' }}>•</span>
            <span><strong className="text-[var(--text)]">{allRoots.length}</strong> keluarga</span>
          </div>
        </div>

        <main className="flex-1 px-4 sm:px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            {/* View All button */}
            <div className="mb-6 flex justify-center">
              <button
                onClick={() => { setActiveRootId('__all__'); setFocusId(allRoots[0]?.member.id ?? null); }}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-lg"
                style={{
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="text-sm font-semibold">Lihat Semua Pohon Keluarga</span>
                <span className="text-xs opacity-60">({allRoots.length} keluarga)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allRoots.map((root, idx) => (
                <FamilyCard key={root.member.id} root={root} idx={idx} memberMap={memberMap}
                  onClick={() => { setActiveRootId(root.member.id); setFocusId(root.member.id); }} />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── TREE VIEW ───────────────────────────────────────────────────────────────
  const activeRoot = allRoots.find(r => r.member.id === activeRootId);
  const activeSurname = activeRootId === '__all__'
    ? 'Semua Keluarga'
    : activeRoot?.member.name.trim().split(' ').pop();

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <header className="shrink-0 border-b print:hidden" style={{
        background: 'var(--card)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)',
      }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 gap-2">
          {/* Back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={handleBackToList}
              className="flex items-center gap-1.5 text-sm transition-colors shrink-0"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Semua Keluarga</span>
            </button>
            <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />
            <span className="font-display font-semibold text-[var(--text)] truncate">
              {activeRootId === '__all__' ? 'Semua Keluarga' : `Keluarga ${activeSurname}`}
            </span>
          </div>

          {/* Right toolbar */}
          <div className="flex items-center gap-1 shrink-0">
            {/* View toggle */}
            <div className="hidden sm:flex items-center rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border)' }}>
              {(['tree', 'timeline'] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  className="px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    background: viewMode === v ? 'var(--accent-dim)' : 'transparent',
                    color: viewMode === v ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                  {v === 'tree' ? 'Pohon' : 'Timeline'}
                </button>
              ))}
            </div>

            {/* Relation path finder */}
            <button onClick={() => { setRelationMode(r => !r); setRelationFrom(null); setRelationPath(null); }}
              title="Cari hubungan antar anggota"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: relationMode ? 'rgba(245,158,11,0.15)' : 'transparent',
                border: `1px solid ${relationMode ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                color: relationMode ? 'var(--gold)' : 'var(--text-muted)',
              }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>

            {/* Birthday */}
            <button onClick={() => { setShowBirthdays(b => !b); setShowStats(false); }}
              title="Ulang tahun"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm"
              style={{
                background: showBirthdays ? 'rgba(245,158,11,0.15)' : 'transparent',
                border: `1px solid ${showBirthdays ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
              }}>
              🎂
            </button>

            {/* Stats */}
            <button onClick={() => { setShowStats(s => !s); setShowBirthdays(false); }}
              title="Statistik"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm"
              style={{
                background: showStats ? 'var(--accent-dim)' : 'transparent',
                border: `1px solid ${showStats ? 'var(--accent)' : 'var(--border)'}`,
              }}>
              📊
            </button>

            {/* Share */}
            <button onClick={handleShare} title="Salin link"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>

            {/* Print */}
            <button onClick={handlePrint} title="Cetak / Export PDF"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>

            {/* Theme toggle */}
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </div>

        {/* Relation mode hint */}
        {relationMode && (
          <div className="px-4 sm:px-6 pb-2 flex items-center gap-2">
            <span style={{ color: 'var(--gold)', fontSize: 12 }}>⛓</span>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {!relationFrom
                ? 'Klik anggota pertama untuk mencari jalur hubungan'
                : <><strong style={{ color: 'var(--gold)' }}>{relationFrom.name}</strong> dipilih — klik anggota kedua</>
              }
            </p>
          </div>
        )}

        {/* Search */}
        {viewMode === 'tree' && (
          <div className="px-4 sm:px-6 pb-3">
            <SearchBar onSearch={handleSearch} onClear={handleClear} />
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        {/* Highlight banner */}
        {highlight && !relationPath && (
          <div className="px-4 sm:px-6 py-2 border-b flex items-center gap-3 print:hidden"
            style={{
              background: highlight.mode === 'descendants' ? 'var(--green-dim)' : 'var(--blue-dim)',
              borderColor: 'var(--border)',
            }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: highlight.mode === 'descendants' ? 'var(--green)' : 'var(--blue)' }} />
            <p className="text-sm text-[var(--text-muted)]">
              {highlight.foundId ? (
                <>Menampilkan <strong className="text-[var(--text)]">
                  {highlight.mode === 'descendants' ? 'keturunan' : 'leluhur'}
                </strong> dari <strong className="text-[var(--text)]">
                  {members.find(m => m.id === highlight.foundId)?.name}
                </strong> — {highlight.highlightedIds.size} anggota</>
              ) : (
                <span className="text-red-400">"{highlight.searchQuery}" tidak ditemukan</span>
              )}
            </p>
            <button onClick={handleClear} className="ml-auto text-xs shrink-0 transition-colors"
              style={{ color: 'var(--text-subtle)' }}>Hapus filter</button>
          </div>
        )}

        {/* Relation path banner */}
        {relationPath && (
          <RelationBanner
            path={relationPath}
            memberMap={memberMap}
            onClear={handleClear}
            onNavigate={handleNavigate}
          />
        )}

        {/* Tree / Timeline */}
        <div className="flex-1 min-h-0 relative flex flex-col">
          {viewMode === 'tree' ? (
            <div className="flex-1 min-h-0">
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
          ) : (
            <TimelineView
              roots={activeRoots}
              onMemberClick={handleNodeClick}
              onMemberDoubleClick={handleNodeDoubleClick}
            />
          )}
        </div>

        {/* Legend */}
        {viewMode === 'tree' && (
          <div className="shrink-0 px-4 sm:px-6 py-3 border-t print:hidden"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <Legend />
          </div>
        )}
      </main>

      {/* Panels */}
      {showBirthdays && (
        <BirthdayPanel members={activeMembers} onNavigate={handleNavigate} onClose={() => setShowBirthdays(false)} />
      )}
      {showStats && (
        <StatsPanel members={activeMembers} onClose={() => setShowStats(false)} />
      )}

      {/* Detail Modal */}
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

// ─── Export wrapped in Suspense (for useSearchParams) ─────────────────────────
export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}
