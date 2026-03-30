'use client';

import { FamilyMember } from '@/types';
import { getAge, getAvatarUrl } from '@/lib/family';

type HighlightType = 'self' | 'green' | 'blue' | 'dimmed' | 'none';

interface TreeNodeProps {
  member: FamilyMember;
  spouses: FamilyMember[];
  highlight: HighlightType;
  spouseHighlight: (spouse: FamilyMember) => HighlightType;
  onClick: (member: FamilyMember) => void;
  nodeRef?: (el: HTMLDivElement | null) => void;
}

export function TreeNodeComponent({ member, spouses, highlight, spouseHighlight, onClick, nodeRef }: TreeNodeProps) {
  return (
    <div className="flex items-center gap-0">
      {/* Main member */}
      <NodeAvatar
        member={member}
        highlight={highlight}
        onClick={() => onClick(member)}
        nodeRef={nodeRef}
      />

      {/* Spouse connector + spouses */}
      {spouses.map((spouse, idx) => (
        <div key={spouse.id} className="flex items-center gap-0">
          {/* Dashed connector line between couple */}
          <div className="flex items-center" style={{ width: 28 }}>
            <svg width="28" height="12" viewBox="0 0 28 12" className="overflow-visible">
              <line x1="0" y1="6" x2="28" y2="6"
                stroke="var(--border-light)" strokeWidth="1.5" strokeDasharray="4 3" />
              {/* Heart icon in center */}
              {idx === 0 && (
                <text x="14" y="10" textAnchor="middle" fontSize="8" fill="var(--text-subtle)">♥</text>
              )}
            </svg>
          </div>
          <NodeAvatar
            member={spouse}
            highlight={spouseHighlight(spouse)}
            onClick={() => onClick(spouse)}
          />
        </div>
      ))}
    </div>
  );
}

interface NodeAvatarProps {
  member: FamilyMember;
  highlight: HighlightType;
  onClick: () => void;
  nodeRef?: (el: HTMLDivElement | null) => void;
}

function NodeAvatar({ member, highlight, onClick, nodeRef }: NodeAvatarProps) {
  const isAlive = !member.deathDate;

  const highlightClass = {
    self: 'highlighted-self',
    green: 'highlighted-green',
    blue: 'highlighted-blue',
    dimmed: 'dimmed',
    none: '',
  }[highlight];

  const ringColor = {
    self: 'var(--accent)',
    green: 'var(--green)',
    blue: 'var(--blue)',
    dimmed: 'var(--border)',
    none: 'var(--border-light)',
  }[highlight];

  return (
    <div
      ref={nodeRef}
      data-member-id={member.id}
      className={`tree-node ${highlightClass} flex flex-col items-center cursor-pointer group`}
      style={{ width: 90 }}
      onClick={onClick}
    >
      <div
        className="node-avatar relative rounded-full overflow-hidden transition-all duration-300"
        style={{
          width: 72,
          height: 72,
          border: `2.5px solid ${ringColor}`,
          transition: 'box-shadow 0.3s, border-color 0.3s',
        }}
      >
        <img
          src={getAvatarUrl(member)}
          alt={member.name}
          className="w-full h-full object-cover"
          onError={e => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}&backgroundColor=1a1828`;
          }}
        />
        {/* Gender overlay tint */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
          style={{ background: member.gender === 'male' ? 'var(--blue)' : '#ec4899' }} />
      </div>

      {/* Live indicator */}
      {isAlive && (
        <div className="absolute"
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--green)',
            border: '2px solid var(--bg)',
            transform: 'translate(26px, -12px)',
          }} />
      )}

      {/* Name */}
      <div className="mt-2 text-center px-1">
        <p className="text-xs font-medium text-[var(--text)] leading-tight line-clamp-2"
          style={{ maxWidth: 80, wordBreak: 'break-word' }}>
          {member.name}
        </p>
        <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">
          {getAge(member.birthDate, member.deathDate)}
        </p>
      </div>
    </div>
  );
}
