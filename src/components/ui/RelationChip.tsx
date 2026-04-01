import { FamilyMember } from '@/types';

const COLOR_MAP = {
  blue:   'bg-blue-500/10 border-blue-500/30 text-blue-400',
  pink:   'bg-pink-500/10 border-pink-500/30 text-pink-400',
  purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  green:  'bg-green-500/10 border-green-500/30 text-green-400',
} as const;

type ChipColor = keyof typeof COLOR_MAP;

interface RelationChipProps {
  member: FamilyMember;
  label: string;
  color: ChipColor;
  onNavigate: (id: string) => void;
}

export function RelationChip({ member, label, color, onNavigate }: RelationChipProps) {
  return (
    <button
      onClick={() => onNavigate(member.id)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium
                  transition-all hover:scale-105 hover:brightness-125 ${COLOR_MAP[color]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {member.name}
    </button>
  );
}
