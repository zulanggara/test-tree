'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FamilyMember, HighlightState, SearchMode, TreeNode } from '@/types';
import { buildMemberMap, buildTree, getDescendants, getAncestors } from '@/lib/family';
import { SearchBar } from '@/components/SearchBar';
import { FamilyTree } from '@/components/FamilyTree';
import { DetailModal } from '@/components/DetailModal';
import { Legend } from '@/components/Legend';
import familyData from '../../data/family.json';

export default function HomePage() {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [highlight, setHighlight] = useState<HighlightState | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const memberMap = useMemo(() => buildMemberMap(familyData as any), []);
  const members = useMemo(() => (familyData as any).members as FamilyMember[], []);
  const roots = useMemo(() => buildTree(members, memberMap), [members, memberMap]);

  const handleSearch = useCallback((query: string, mode: SearchMode) => {
    const found = members.find(m =>
      m.name.toLowerCase().includes(query.toLowerCase())
    );

    if (!found) {
      setHighlight({
        mode,
        highlightedIds: new Set(),
        searchQuery: query,
        foundId: null,
      });
      return;
    }

    const relatedIds = mode === 'descendants'
      ? getDescendants(found.id, memberMap)
      : getAncestors(found.id, memberMap);

    // Also include spouses of found person
    for (const spouseId of found.spouseIds) {
      relatedIds.add(spouseId);
    }

    setHighlight({
      mode,
      highlightedIds: relatedIds,
      searchQuery: query,
      foundId: found.id,
    });
    setFocusId(found.id);
  }, [members, memberMap]);

  const handleClear = useCallback(() => {
    setHighlight(null);
    setFocusId(null);
  }, []);

  const handleNodeClick = useCallback((member: FamilyMember) => {
    setSelectedMember(member);
  }, []);

  const handleNavigate = useCallback((id: string) => {
    const member = memberMap.get(id);
    if (member) {
      setSelectedMember(member);
      setFocusId(id);
    }
  }, [memberMap]);

  const totalMembers = members.length;
  const aliveMembers = members.filter(m => !m.deathDate).length;
  const generations = useMemo(() => {
    let maxLevel = 0;
    function traverse(nodes: TreeNode[], level: number) {
      for (const node of nodes) {
        maxLevel = Math.max(maxLevel, level);
        traverse(node.children, level + 1);
      }
    }
    traverse(roots, 0);
    return maxLevel + 1;
  }, [roots]);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{
        background: 'rgba(15,14,23,0.92)',
        backdropFilter: 'blur(12px)',
        borderColor: 'var(--border)',
      }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
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

          {/* Nav - desktop */}
          <nav className="hidden sm:flex items-center gap-1">
            {['Tree', 'Pencarian', 'Riwayat'].map((item, i) => (
              <button key={item}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${i === 0
                  ? 'text-[var(--accent)] bg-[var(--accent-dim)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)]'
                  }`}>
                {item}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-3 text-xs text-[var(--text-subtle)] mr-2">
              <span><strong className="text-[var(--text)]">{totalMembers}</strong> anggota</span>
              <span>•</span>
              <span><strong className="text-[var(--text)]">{aliveMembers}</strong> masih hidup</span>
              <span>•</span>
              <span><strong className="text-[var(--text)]">{generations}</strong> generasi</span>
            </div>
            <button className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)] transition-all">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)] transition-all">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search bar row */}
        <div className="px-4 sm:px-6 pb-3">
          <SearchBar onSearch={handleSearch} onClear={handleClear} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Search result banner */}
        {highlight && (
          <div className="px-4 sm:px-6 py-2 border-b flex items-center gap-3"
            style={{ background: highlight.mode === 'descendants' ? 'var(--green-dim)' : 'var(--blue-dim)', borderColor: 'var(--border)' }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: highlight.mode === 'descendants' ? 'var(--green)' : 'var(--blue)' }} />
            <p className="text-sm text-[var(--text-muted)]">
              {highlight.foundId ? (
                <>
                  Menampilkan <strong className="text-[var(--text)]">
                    {highlight.mode === 'descendants' ? 'keturunan' : 'leluhur'}
                  </strong> dari{' '}
                  <strong className="text-[var(--text)]">
                    {members.find(m => m.id === highlight.foundId)?.name}
                  </strong>
                  {' '}— {highlight.highlightedIds.size} anggota ditemukan
                </>
              ) : (
                <span className="text-red-400">Anggota "{highlight.searchQuery}" tidak ditemukan</span>
              )}
            </p>
            <button onClick={handleClear}
              className="ml-auto text-xs text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors shrink-0">
              Hapus filter
            </button>
          </div>
        )}

        {/* Tree container */}
        <div className="flex-1 relative">
          <div
            className="w-full"
style={{ height: "calc(100vh - 200px)" }}
          >
            <FamilyTree
              roots={roots}
              memberMap={memberMap}
              highlight={highlight}
              onNodeClick={handleNodeClick}
              focusId={focusId}
            />
          </div>
        </div>

        {/* Legend footer */}
        <div className="px-4 sm:px-6 py-3 border-t"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <Legend />
        </div>
      </main>

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
