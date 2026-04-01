'use client';

import { FamilyMember, TreeNode } from '@/types';
import { getAvatarUrl } from '@/lib/family';
import { usePhoto } from '@/contexts/PhotoContext';

interface TimelineViewProps {
  roots: TreeNode[];
  onMemberClick: (member: FamilyMember) => void;
  onMemberDoubleClick: (member: FamilyMember) => void;
}

const GEN_COLORS = [
  { bg: 'rgba(108,99,255,0.08)', border: 'rgba(108,99,255,0.25)', accent: '#6c63ff' },
  { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', accent: '#3b82f6' },
  { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', accent: '#22c55e' },
  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', accent: '#f59e0b' },
  { bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)', accent: '#ec4899' },
  { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', accent: '#f97316' },
];

const ROOT_ACCENT_COLORS = [
  '#6c63ff', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#f97316',
];

/** Traverse a TreeNode subtree and collect {member, gen} relative to the root (gen=0). */
function collectRootMembers(root: TreeNode): { member: FamilyMember; gen: number }[] {
  const seen = new Set<string>();
  const result: { member: FamilyMember; gen: number }[] = [];

  function walk(node: TreeNode, gen: number) {
    if (!seen.has(node.member.id)) {
      seen.add(node.member.id);
      result.push({ member: node.member, gen });
    }
    for (const s of node.spouses) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        result.push({ member: s, gen });
      }
    }
    for (const child of node.children) walk(child, gen + 1);
  }

  walk(root, 0);
  return result;
}

function MemberCard({
  member, accent, onClick, onDoubleClick,
}: {
  member: FamilyMember;
  accent: string;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const { getPhoto } = usePhoto();
  const isAlive = !member.deathDate;
  const birthYear = member.birthDate ? new Date(member.birthDate).getFullYear() : null;
  const deathYear = member.deathDate ? new Date(member.deathDate).getFullYear() : null;

  const clickTimer = { current: null as ReturnType<typeof setTimeout> | null };
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

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105 group w-24 shrink-0"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full overflow-hidden"
          style={{ border: `2px solid ${accent}` }}>
          <img
            src={getPhoto(member.id, getAvatarUrl(member))}
            alt={member.name}
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).src =
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`;
            }}
          />
        </div>
        {isAlive && (
          <span className="absolute" style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--green)', border: '1.5px solid var(--card)',
            bottom: 1, right: 1,
          }} />
        )}
        {!isAlive && (
          <span className="absolute inset-0 rounded-full flex items-end justify-center pb-0.5"
            style={{ pointerEvents: 'none' }}>
            <span style={{ fontSize: 8, color: '#9ca3af' }}>✝</span>
          </span>
        )}
      </div>
      <div className="text-center w-full">
        <p className="text-[10px] font-medium text-[var(--text)] leading-tight line-clamp-2"
          style={{ wordBreak: 'break-word' }}>
          {member.name}
        </p>
        <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-subtle)' }}>
          {birthYear}{deathYear ? `–${deathYear}` : isAlive ? '–' : ''}
        </p>
      </div>
    </button>
  );
}

export function TimelineView({ roots, onMemberClick, onMemberDoubleClick }: TimelineViewProps) {
  const multiRoot = roots.length > 1;

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 print:overflow-visible">
      <div className="max-w-6xl mx-auto space-y-10">
        {roots.map((root, rootIdx) => {
          const rootAccent = ROOT_ACCENT_COLORS[rootIdx % ROOT_ACCENT_COLORS.length];
          const surname = root.member.name.trim().split(' ').pop();
          const allMembers = collectRootMembers(root);

          // Group by generation (relative to this root)
          const genGroups = new Map<number, FamilyMember[]>();
          for (const { member, gen } of allMembers) {
            if (!genGroups.has(gen)) genGroups.set(gen, []);
            genGroups.get(gen)!.push(member);
          }

          const sortedGens = [...genGroups.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([gen, list]) => ({
              gen,
              members: [...list].sort((a, b) => {
                const ya = a.birthDate ? new Date(a.birthDate).getFullYear() : 9999;
                const yb = b.birthDate ? new Date(b.birthDate).getFullYear() : 9999;
                return ya - yb;
              }),
            }));

          const totalAlive = allMembers.filter(({ member: m }) => !m.deathDate).length;

          return (
            <div key={root.member.id}>
              {/* Root family header — only shown when multiple roots */}
              {multiRoot && (
                <div className="flex items-center gap-4 mb-6 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: rootAccent }} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
                      style={{ color: rootAccent }}>Keluarga</p>
                    <h3 className="font-display text-xl font-bold text-[var(--text)] leading-none">{surname}</h3>
                  </div>
                  <div className="ml-4 flex gap-5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span><strong className="text-[var(--text)]">{allMembers.length}</strong> anggota</span>
                    <span><strong style={{ color: 'var(--green)' }}>{totalAlive}</strong> masih hidup</span>
                    <span><strong className="text-[var(--text)]">{sortedGens.length}</strong> generasi</span>
                  </div>
                </div>
              )}

              {/* Generations */}
              <div className="space-y-8">
                {sortedGens.map(({ gen, members: genMembers }) => {
                  const color = GEN_COLORS[gen % GEN_COLORS.length];
                  const birthYears = genMembers
                    .filter(m => m.birthDate)
                    .map(m => new Date(m.birthDate!).getFullYear());
                  const minYear = birthYears.length > 0 ? Math.min(...birthYears) : null;
                  const maxYear = birthYears.length > 0 ? Math.max(...birthYears) : null;
                  const alive = genMembers.filter(m => !m.deathDate).length;

                  return (
                    <div key={gen}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                          style={{ background: color.bg, border: `1px solid ${color.border}` }}>
                          <span className="text-xs font-bold" style={{ color: color.accent }}>
                            Generasi ke-{gen + 1}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                          {minYear && maxYear && minYear !== maxYear
                            ? `${minYear} – ${maxYear}`
                            : minYear ?? ''}
                          <span className="mx-1.5" style={{ color: 'var(--border)' }}>·</span>
                          {genMembers.length} anggota
                          <span className="mx-1.5" style={{ color: 'var(--border)' }}>·</span>
                          <span style={{ color: 'var(--green)' }}>{alive} masih hidup</span>
                        </div>
                        <div className="flex-1 h-px" style={{ background: color.border }} />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {genMembers.map(m => (
                          <MemberCard
                            key={m.id}
                            member={m}
                            accent={color.accent}
                            onClick={() => onMemberClick(m)}
                            onDoubleClick={() => onMemberDoubleClick(m)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Divider between families */}
              {multiRoot && rootIdx < roots.length - 1 && (
                <div className="mt-10 h-px" style={{ background: 'var(--border)' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
