'use client';

import { FamilyMember } from '@/types';
import { formatDate, getAge, getAvatarUrl } from '@/lib/family';

interface DetailModalProps {
  member: FamilyMember;
  memberMap: Map<string, FamilyMember>;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

export function DetailModal({ member, memberMap, onClose, onNavigate }: DetailModalProps) {
  const father = member.fatherId ? memberMap.get(member.fatherId) : null;
  const mother = member.motherId ? memberMap.get(member.motherId) : null;
  const spouses = member.spouseIds.map(id => memberMap.get(id)).filter(Boolean) as FamilyMember[];
  const children = member.childrenIds.map(id => memberMap.get(id)).filter(Boolean) as FamilyMember[];

  const isAlive = !member.deathDate;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="modal-panel relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header strip */}
        <div className="h-1 w-full" style={{
          background: member.gender === 'male'
            ? 'linear-gradient(90deg, var(--accent), var(--blue))'
            : 'linear-gradient(90deg, #ec4899, var(--accent))'
        }} />

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 4px)' }}>
          <div className="p-5 sm:p-6">
            {/* Close button */}
            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center
                         text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)]
                         transition-all z-10">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Avatar + Name */}
            <div className="flex items-start gap-4 mb-5">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden"
                  style={{ border: '3px solid var(--accent)' }}>
                  <img
                    src={getAvatarUrl(member)}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`;
                    }}
                  />
                </div>
                {isAlive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2"
                    style={{ borderColor: 'var(--card)' }} title="Masih hidup" />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="font-display text-xl font-semibold text-[var(--text)] leading-tight mb-1">
                  {member.name}
                </h2>
                <p className="text-xs text-[var(--text-subtle)]">
                  {getAge(member.birthDate, member.deathDate)}
                </p>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {member.birthDate && (
                <div className="rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-1">Tanggal Lahir</p>
                  <p className="text-sm font-medium text-[var(--text)]">{formatDate(member.birthDate)}</p>
                </div>
              )}
              {member.birthPlace && (
                <div className="rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-1">Tempat Lahir</p>
                  <p className="text-sm font-medium text-[var(--text)]">{member.birthPlace}</p>
                </div>
              )}
              {member.deathDate && (
                <div className="rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-1">Tanggal Wafat</p>
                  <p className="text-sm font-medium text-[var(--text)]">{formatDate(member.deathDate)}</p>
                </div>
              )}
            </div>

            {/* Biografi */}
            {member.biography && (
              <div className="mb-4 rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-2">Biografi</p>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{member.biography}</p>
              </div>
            )}

            {/* Relations */}
            <div className="space-y-3">
              {/* Parents */}
              {(father || mother) && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-2">Orang Tua</p>
                  <div className="flex flex-wrap gap-2">
                    {father && <RelationChip member={father} label="Ayah" color="blue" onNavigate={onNavigate} />}
                    {mother && <RelationChip member={mother} label="Ibu" color="pink" onNavigate={onNavigate} />}
                  </div>
                </div>
              )}

              {/* Spouses */}
              {spouses.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-2">
                    Pasangan ({spouses.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {spouses.map(s => (
                      <RelationChip key={s.id} member={s} label="Pasangan" color="purple" onNavigate={onNavigate} />
                    ))}
                  </div>
                </div>
              )}

              {/* Children */}
              {children.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-2">
                    Anak-anak ({children.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {children.map(c => (
                      <RelationChip key={c.id} member={c} label="Anak" color="green" onNavigate={onNavigate} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RelationChip({
  member, label, color, onNavigate
}: {
  member: FamilyMember;
  label: string;
  color: 'blue' | 'pink' | 'purple' | 'green';
  onNavigate: (id: string) => void;
}) {
  const colorMap = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    pink: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
  };

  return (
    <button
      onClick={() => onNavigate(member.id)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium
                  transition-all hover:scale-105 hover:brightness-125 ${colorMap[color]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {member.name}
    </button>
  );
}
