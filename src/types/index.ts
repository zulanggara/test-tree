export type MarriageStatus = 'married' | 'widowed' | 'divorced' | 'separated' | 'annulled';

export interface Marriage {
  spouseId: string;
  status: MarriageStatus;
  marriedDate?: string | null;
  endDate?: string | null;
}

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
  marriages?: Marriage[];
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
  spouseMarriages: Marriage[];
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
