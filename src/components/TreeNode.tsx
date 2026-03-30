'use client';

import { FamilyMember, Marriage, MarriageStatus } from '@/types';
import { getAge, getAvatarUrl, isActiveMarriage } from '@/lib/family';

type HighlightType = 'self' | 'green' | 'blue' | 'dimmed' | 'none';

interface TreeNodeProps {
  member: FamilyMember;
  spouses: FamilyMember[];
  spouseMarriages: Marriage[];
  highlight: HighlightType;
  spouseHighlight: (spouse: FamilyMember) => HighlightType;
  onClick: (member: FamilyMember) => void;
  nodeRef?: (el: HTMLDivElement | null) => void;
}

const STATUS_ICON: Record<MarriageStatus, string> = {
  married: '♥',
  widowed: '✝',
  divorced: '÷',
  separated: '~',
  annulled: '✕',
};

const STATUS_COLOR: Record<MarriageStatus, string> = {
  married: '#22c55e',
  widowed: '#9ca3af',
  divorced: '#f59e0b',
  separated: '#f97316',
  annulled: '#ef4444',
};

export function TreeNodeComponent({ member, spouses, spouseMarriages, highlight, spouseHighlight, onClick, nodeRef }: TreeNodeProps) {
  return (
    <div className="flex items-center gap-0">
      <NodeAvatar member={member} highlight={highlight} onClick={() => onClick(member)} nodeRef={nodeRef} />

      {spouses.map((spouse, idx) => {
        const marriage = spouseMarriages[idx];
        const active = isActiveMarriage(marriage);
        const status = marriage?.status ?? 'married';
        const icon = STATUS_ICON[status];
        const color = STATUS_COLOR[status];

        return (
          <div key={spouse.id} className="flex items-center gap-0">
            {/* Connector line */}
            <div className="flex items-center" style={{ width: 32 }}>
              <svg width="32" height="20" viewBox="0 0 32 20" className="overflow-visible">
                {/* Line: solid if active, dashed if ended */}
                {active ? (
                  <line x1="0" y1="10" x2="32" y2="10"
                    stroke={color} strokeWidth="1.5" />
                ) : (
                  <line x1="0" y1="10" x2="32" y2="10"
                    stroke={color} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
                )}
                {/* Status icon in center */}
                <text x="16" y="15" textAnchor="middle" fontSize="9"
                  fill={color} fontFamily="system-ui">
                  {icon}
                </text>
              </svg>
            </div>
            <NodeAvatar
              member={spouse}
              highlight={spouseHighlight(spouse)}
              onClick={() => onClick(spouse)}
              marriageStatus={status}
              isActiveMarriage={active}
            />
          </div>
        );
      })}
    </div>
  );
}

interface NodeAvatarProps {
  member: FamilyMember;
  highlight: HighlightType;
  onClick: () => void;
  nodeRef?: (el: HTMLDivElement | null) => void;
  marriageStatus?: MarriageStatus;
  isActiveMarriage?: boolean;
}

function NodeAvatar({ member, highlight, onClick, nodeRef, marriageStatus, isActiveMarriage: activeMrg }: NodeAvatarProps) {
  const isAlive = !member.deathDate;

  const highlightClass = {
    self: 'highlighted-self', green: 'highlighted-green',
    blue: 'highlighted-blue', dimmed: 'dimmed', none: '',
  }[highlight];

  const ringColor = {
    self: 'var(--accent)', green: 'var(--green)',
    blue: 'var(--blue)', dimmed: 'var(--border)', none: 'var(--border-light)',
  }[highlight];

  return (
    <div
      ref={nodeRef}
      data-member-id={member.id}
      className={`tree-node ${highlightClass} flex flex-col items-center cursor-pointer group`}
      style={{ width: 90 }}
      onClick={onClick}
    >
      <div className="relative">
        <div
          className="node-avatar relative rounded-full overflow-hidden transition-all duration-300"
          style={{
            width: 72, height: 72,
            border: `2.5px solid ${ringColor}`,
            // Past marriages get faded ring
            opacity: (marriageStatus && !activeMrg) ? 0.75 : 1,
          }}
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
          <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
            style={{ background: member.gender === 'male' ? 'var(--blue)' : '#ec4899' }} />
        </div>

        {/* Alive indicator */}
        {isAlive && (
          <div className="absolute"
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--green)',
              border: '2px solid var(--bg)',
              top: 56, left: 54,
            }} />
        )}

        {/* Deceased overlay */}
        {!isAlive && (
          <div className="absolute inset-0 rounded-full flex items-end justify-center pb-0.5"
            style={{ pointerEvents: 'none' }}>
            <span style={{ fontSize: 9, color: '#9ca3af', lineHeight: 1 }}>✝</span>
          </div>
        )}
      </div>

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
