'use client';

import { FamilyMember, Marriage } from '@/types';
import { formatDate, getAge, getAvatarUrl, getMarriage, getSpouseIds,
         getMarriageStatusLabel, getMarriageStatusColor, isActiveMarriage } from '@/lib/family';
import { InfoCard } from '@/components/ui/InfoCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { RelationChip } from '@/components/ui/RelationChip';
import { Avatar } from '@/components/ui/Avatar';

interface DetailModalProps {
  member: FamilyMember;
  memberMap: Map<string, FamilyMember>;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

export function DetailModal({ member, memberMap, onClose, onNavigate }: DetailModalProps) {
  const father = member.fatherId ? memberMap.get(member.fatherId) : null;
  const mother = member.motherId ? memberMap.get(member.motherId) : null;
  const spouseIds = getSpouseIds(member);
  const spouses = spouseIds.map(id => memberMap.get(id)).filter(Boolean) as FamilyMember[];
  const children = member.childrenIds.map(id => memberMap.get(id)).filter(Boolean) as FamilyMember[];

  const sortedMarriages = member.marriages
    ? [...member.marriages].sort((a, b) => {
        if (isActiveMarriage(a) && !isActiveMarriage(b)) return -1;
        if (!isActiveMarriage(a) && isActiveMarriage(b)) return 1;
        return 0;
      })
    : null;

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
        <div className="h-1 w-full" style={{
          background: member.gender === 'male'
            ? 'linear-gradient(90deg, var(--accent), var(--blue))'
            : 'linear-gradient(90deg, #ec4899, var(--accent))'
        }} />

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 4px)' }}>
          <div className="p-5 sm:p-6">
            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center
                         text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all z-10">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Avatar + Name */}
            <div className="flex items-start gap-4 mb-5">
              <div className="pb-5">
                <Avatar member={member} size={80} showStatusDot allowUpload />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="font-display text-xl font-semibold text-[var(--text)] leading-tight mb-0.5">
                  {member.name}
                </h2>
                {member.nickname && (
                  <p className="text-xs text-[var(--text-subtle)] mb-0.5">"{member.nickname}"</p>
                )}
                <p className="text-xs text-[var(--text-subtle)]">{getAge(member.birthDate, member.deathDate)}</p>
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                  {member.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                  {!member.deathDate ? '' : ' · Almarhum/Almarhumah'}
                </p>
              </div>
            </div>

            {/* Core info grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {member.birthDate && (
                <InfoCard label="Tanggal Lahir" value={formatDate(member.birthDate)} />
              )}
              {member.birthPlace && (
                <InfoCard label="Tempat Lahir" value={member.birthPlace} />
              )}
              {member.deathDate && (
                <InfoCard label="Tanggal Wafat" value={formatDate(member.deathDate)} />
              )}
              {member.profession && (
                <InfoCard label="Profesi Terakhir" value={member.profession} />
              )}
              {member.education && (
                <InfoCard label="Pendidikan Terakhir" value={member.education} />
              )}
              {member.religion && (
                <InfoCard label="Agama" value={member.religion} />
              )}
              {member.nationality && (
                <InfoCard label="Kewarganegaraan" value={member.nationality} />
              )}
            </div>

            {/* Hobbies */}
            {member.hobbies && member.hobbies.length > 0 && (
              <div className="mb-4 rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <SectionLabel>Hobi</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {member.hobbies.map(hobby => (
                    <span
                      key={hobby}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                    >
                      {hobby}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Biography */}
            {member.biography && (
              <div className="mb-4 rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <SectionLabel>Biografi</SectionLabel>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{member.biography}</p>
              </div>
            )}

            {/* Social links */}
            {member.socialLinks && member.socialLinks.length > 0 && (
              <div className="mb-4 rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <SectionLabel>Tautan</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {member.socialLinks.map(link => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80"
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Marriage history */}
            {sortedMarriages && sortedMarriages.length > 0 && (
              <div className="mb-4">
                <SectionLabel>Riwayat Pernikahan ({sortedMarriages.length})</SectionLabel>
                <div className="space-y-2">
                  {sortedMarriages.map((m, idx) => (
                    <MarriageCard
                      key={m.spouseId}
                      marriage={m}
                      spouse={memberMap.get(m.spouseId)}
                      index={idx + 1}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Relations */}
            <div className="space-y-3">
              {(father || mother) && (
                <div>
                  <SectionLabel>Orang Tua</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {father && <RelationChip member={father} label="Ayah" color="blue" onNavigate={onNavigate} />}
                    {mother && <RelationChip member={mother} label="Ibu" color="pink" onNavigate={onNavigate} />}
                  </div>
                </div>
              )}

              {/* Spouses (legacy) — only show if no marriages array */}
              {!member.marriages && spouses.length > 0 && (
                <div>
                  <SectionLabel>Pasangan ({spouses.length})</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {spouses.map(s => (
                      <RelationChip key={s.id} member={s} label="Pasangan" color="purple" onNavigate={onNavigate} />
                    ))}
                  </div>
                </div>
              )}

              {children.length > 0 && (
                <div>
                  <SectionLabel>Anak-anak ({children.length})</SectionLabel>
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

function MarriageCard({
  marriage, spouse, index, onNavigate,
}: {
  marriage: Marriage;
  spouse?: FamilyMember;
  index: number;
  onNavigate: (id: string) => void;
}) {
  const active = isActiveMarriage(marriage);
  const colorClass = getMarriageStatusColor(marriage.status);
  const statusLabel = getMarriageStatusLabel(marriage.status);

  const STATUS_ICON: Record<string, string> = {
    married: '♥', widowed: '✝', divorced: '÷', separated: '~', annulled: '✕',
  };

  return (
    <div
      className="rounded-lg p-3 transition-all"
      style={{
        background: 'var(--bg)',
        border: `1px solid ${active ? 'rgba(108,99,255,0.3)' : 'var(--border)'}`,
        opacity: active ? 1 : 0.75,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
          Pernikahan ke-{index}
        </span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${colorClass}`}>
          {STATUS_ICON[marriage.status]} {statusLabel}
        </span>
      </div>

      {spouse && (
        <button
          onClick={() => onNavigate(spouse.id)}
          className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity mb-2"
        >
          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0"
            style={{ border: '1.5px solid var(--border-light)' }}>
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
              {spouse.gender === 'male' ? 'Suami' : 'Istri'}
            </p>
          </div>
        </button>
      )}

      <div className="flex gap-3 text-[10px] text-[var(--text-subtle)]">
        {marriage.marriedDate && <span>Menikah: {formatDate(marriage.marriedDate)}</span>}
        {marriage.endDate && <span>· Berakhir: {formatDate(marriage.endDate)}</span>}
      </div>
    </div>
  );
}
