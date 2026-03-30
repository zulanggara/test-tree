'use client';

import { FamilyMember, Marriage } from '@/types';
import { formatDate, getAge, getAvatarUrl, getMarriage, getSpouseIds,
         getMarriageStatusLabel, getMarriageStatusColor, isActiveMarriage } from '@/lib/family';

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
  const isAlive = !member.deathDate;

  // Sort marriages: active first, then by endDate desc
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
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden"
                  style={{ border: '3px solid var(--accent)' }}>
                  <img src={getAvatarUrl(member)} alt={member.name}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`;
                    }} />
                </div>
                {isAlive && (
                  <span className="absolute w-4 h-4 rounded-full bg-green-500 border-2"
                    style={{ borderColor: 'var(--card)', bottom: -2, right: -2 }} />
                )}
                {!isAlive && (
                  <span className="absolute w-5 h-5 rounded-full bg-gray-700 border-2 flex items-center justify-center"
                    style={{ borderColor: 'var(--card)', bottom: -2, right: -2, fontSize: 10, color: '#9ca3af' }}>✝</span>
                )}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="font-display text-xl font-semibold text-[var(--text)] leading-tight mb-1">
                  {member.name}
                </h2>
                <p className="text-xs text-[var(--text-subtle)]">{getAge(member.birthDate, member.deathDate)}</p>
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                  {member.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                  {!isAlive && ' · Almarhum/Almarhumah'}
                </p>
              </div>
            </div>

            {/* Info grid */}
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
            </div>

            {/* Biography */}
            {member.biography && (
              <div className="mb-4 rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-2">Biografi</p>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{member.biography}</p>
              </div>
            )}

            {/* Riwayat Pernikahan */}
            {sortedMarriages && sortedMarriages.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-2">
                  Riwayat Pernikahan ({sortedMarriages.length})
                </p>
                <div className="space-y-2">
                  {sortedMarriages.map((m, idx) => {
                    const spouse = memberMap.get(m.spouseId);
                    return (
                      <MarriageCard
                        key={m.spouseId}
                        marriage={m}
                        spouse={spouse}
                        index={idx + 1}
                        onNavigate={onNavigate}
                      />
                    );
                  })}
                </div>
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

              {/* Spouses (legacy) — only show if no marriages array */}
              {!member.marriages && spouses.length > 0 && (
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-1">{label}</p>
      <p className="text-sm font-medium text-[var(--text)]">{value}</p>
    </div>
  );
}

function MarriageCard({
  marriage, spouse, index, onNavigate
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
    <div className="rounded-lg p-3 transition-all"
      style={{
        background: 'var(--bg)',
        border: `1px solid ${active ? 'rgba(108,99,255,0.3)' : 'var(--border)'}`,
        opacity: active ? 1 : 0.75,
      }}>
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
            <img src={getAvatarUrl(spouse)} alt={spouse.name}
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(spouse.name)}`; }} />
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
        {marriage.marriedDate && (
          <span>Menikah: {formatDate(marriage.marriedDate)}</span>
        )}
        {marriage.endDate && (
          <span>· Berakhir: {formatDate(marriage.endDate)}</span>
        )}
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
