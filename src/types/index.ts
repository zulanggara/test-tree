export interface FamilyMember {
  id: string;
  name: string;
  photo: string;
  gender: 'male' | 'female';
  birthDate?: string;
  deathDate?: string | null;
  birthPlace?: string;
  fatherId: string | null;
  motherId: string | null;
  spouseIds: string[];
  childrenIds: string[];
  biography?: string;
}

export interface FamilyData {
  members: FamilyMember[];
}

export type SearchMode = 'descendants' | 'ancestors';

export interface TreeNode {
  member: FamilyMember;
  children: TreeNode[];
  spouses: FamilyMember[];
  level: number;
  x?: number;
  y?: number;
}

export interface HighlightState {
  mode: SearchMode;
  highlightedIds: Set<string>;
  searchQuery: string;
  foundId: string | null;
}
