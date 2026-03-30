import { FamilyMember, FamilyData, TreeNode } from '@/types';

export function buildMemberMap(data: FamilyData): Map<string, FamilyMember> {
  const map = new Map<string, FamilyMember>();
  for (const member of data.members) {
    map.set(member.id, member);
  }
  return map;
}

// BFS: get all descendants
export function getDescendants(memberId: string, memberMap: Map<string, FamilyMember>): Set<string> {
  const result = new Set<string>();
  const queue: string[] = [memberId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const member = memberMap.get(id);
    if (!member) continue;
    for (const childId of member.childrenIds) {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
        // Also include spouses of descendants
        const child = memberMap.get(childId);
        if (child) {
          for (const spouseId of child.spouseIds) {
            result.add(spouseId);
          }
        }
      }
    }
  }
  return result;
}

// Recursive: get all ancestors
export function getAncestors(memberId: string, memberMap: Map<string, FamilyMember>): Set<string> {
  const result = new Set<string>();
  function traverse(id: string) {
    const member = memberMap.get(id);
    if (!member) return;
    if (member.fatherId && !result.has(member.fatherId)) {
      result.add(member.fatherId);
      // Include spouse of ancestor
      const father = memberMap.get(member.fatherId);
      if (father) {
        for (const spouseId of father.spouseIds) {
          result.add(spouseId);
        }
      }
      traverse(member.fatherId);
    }
    if (member.motherId && !result.has(member.motherId)) {
      result.add(member.motherId);
      traverse(member.motherId);
    }
  }
  traverse(memberId);
  return result;
}

// Find root members (no parents)
export function findRoots(members: FamilyMember[]): FamilyMember[] {
  return members.filter(m => !m.fatherId && !m.motherId);
}

// Build tree structure from roots
export function buildTree(members: FamilyMember[], memberMap: Map<string, FamilyMember>): TreeNode[] {
  const visited = new Set<string>();
  
  // Find true roots: members with no parents
  const roots = findRoots(members).filter(m => m.childrenIds.length > 0 || m.spouseIds.length > 0);
  
  // Deduplicate: if a root is spouse of another root, pick the one with parents or male first
  const rootSet = new Set<string>();
  for (const root of roots) {
    // Skip if already added as a couple unit
    if (rootSet.has(root.id)) continue;
    // Check if this root is a spouse of another root that's already included
    const isSpouseOfExisting = root.spouseIds.some(sid => rootSet.has(sid));
    if (!isSpouseOfExisting) {
      rootSet.add(root.id);
    }
  }
  
  const rootMembers = members.filter(m => rootSet.has(m.id));
  
  function buildNode(member: FamilyMember, level: number): TreeNode {
    visited.add(member.id);
    const spouses = member.spouseIds
      .map(sid => memberMap.get(sid))
      .filter(Boolean) as FamilyMember[];

    // Collect all children (from member + spouses combined)
    const childIds = new Set<string>([...member.childrenIds]);
    for (const spouse of spouses) {
      for (const cid of spouse.childrenIds) childIds.add(cid);
    }

    const children: TreeNode[] = [];
    for (const childId of childIds) {
      if (!visited.has(childId)) {
        const child = memberMap.get(childId);
        if (child) {
          children.push(buildNode(child, level + 1));
        }
      }
    }

    return { member, children, spouses, level };
  }

  return rootMembers.map(r => buildNode(r, 0));
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function getAge(birthDate?: string, deathDate?: string | null): string {
  if (!birthDate) return '';
  const birth = new Date(birthDate);
  const end = deathDate ? new Date(deathDate) : new Date();
  const age = end.getFullYear() - birth.getFullYear();
  if (deathDate) return `${birth.getFullYear()} — ${new Date(deathDate).getFullYear()}`;
  return `${birth.getFullYear()} — sekarang`;
}

export function getAvatarUrl(member: FamilyMember): string {
  if (member.photo) return member.photo;
  const style = member.gender === 'male' ? 'adventurer' : 'avataaars';
  const seed = encodeURIComponent(member.name);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}
