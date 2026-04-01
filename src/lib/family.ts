import { FamilyMember, FamilyData, TreeNode, Marriage, MarriageStatus } from '@/types';

export function buildMemberMap(data: FamilyData): Map<string, FamilyMember> {
  const map = new Map<string, FamilyMember>();
  for (const member of data.members) {
    map.set(member.id, member);
  }
  return map;
}

export function getSpouseIds(member: FamilyMember): string[] {
  if (member.marriages && member.marriages.length > 0) {
    return member.marriages.map(m => m.spouseId);
  }
  return member.spouseIds;
}

export function getMarriage(member: FamilyMember, spouseId: string): Marriage | null {
  if (member.marriages) {
    return member.marriages.find(m => m.spouseId === spouseId) ?? null;
  }
  if (member.spouseIds.includes(spouseId)) {
    return { spouseId, status: 'married' };
  }
  return null;
}

export function isActiveMarriage(marriage: Marriage | null): boolean {
  if (!marriage) return false;
  return marriage.status === 'married' || marriage.status === 'separated';
}

export function getMarriageStatusLabel(status: MarriageStatus): string {
  const labels: Record<MarriageStatus, string> = {
    married: 'Menikah',
    widowed: 'Duda/Janda (Wafat)',
    divorced: 'Bercerai',
    separated: 'Pisah',
    annulled: 'Dibatalkan',
  };
  return labels[status];
}

export function getMarriageStatusColor(status: MarriageStatus): string {
  const colors: Record<MarriageStatus, string> = {
    married: 'text-green-400 bg-green-500/10 border-green-500/30',
    widowed: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
    divorced: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    separated: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    annulled: 'text-red-400 bg-red-500/10 border-red-500/30',
  };
  return colors[status];
}

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
        const child = memberMap.get(childId);
        if (child) {
          for (const spouseId of getSpouseIds(child)) result.add(spouseId);
        }
      }
    }
  }
  return result;
}

export function getAncestors(memberId: string, memberMap: Map<string, FamilyMember>): Set<string> {
  const result = new Set<string>();
  function traverse(id: string) {
    const member = memberMap.get(id);
    if (!member) return;
    if (member.fatherId && !result.has(member.fatherId)) {
      result.add(member.fatherId);
      const father = memberMap.get(member.fatherId);
      if (father) {
        for (const spouseId of getSpouseIds(father)) result.add(spouseId);
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

export function buildTree(members: FamilyMember[], memberMap: Map<string, FamilyMember>): TreeNode[] {
  const visited = new Set<string>();

  // Kumpulkan ID yang merupakan pasangan dari anggota yang MEMILIKI orang tua.
  // Mereka sudah tampil inline di samping pasangannya → tidak perlu jadi root tersendiri.
  const isSpouseOfParentedMember = new Set<string>();
  for (const m of members) {
    if (m.fatherId || m.motherId) {
      for (const sid of getSpouseIds(m)) {
        isSpouseOfParentedMember.add(sid);
      }
    }
  }

  // Root = tidak punya orang tua
  const potentialRoots = members.filter(m => !m.fatherId && !m.motherId);

  // Deduplicate: jika A dan B saling pasangan dan keduanya potentialRoot,
  // hanya yang pertama masuk rootSet. Yang lain tampil inline sebagai spouse.
  const rootSet = new Set<string>();
  for (const root of potentialRoots) {
    if (rootSet.has(root.id)) continue;
    const spouseAlreadyRoot = getSpouseIds(root).some(sid => rootSet.has(sid));
    if (spouseAlreadyRoot) continue;
    // Sudah ditampilkan inline di samping pasangan yang punya orang tua → skip
    if (isSpouseOfParentedMember.has(root.id)) continue;
    rootSet.add(root.id);
  }

  const rootMembers = members.filter(m => rootSet.has(m.id));

  function buildNode(member: FamilyMember, level: number): TreeNode {
    visited.add(member.id);
    const spouseIds = getSpouseIds(member);

    // Only claim external spouses (no parents of their own) as visited.
    // Spouses who have parents belong to their own family subtree and should
    // remain visitable there — so we leave them unmarked here.
    for (const sid of spouseIds) {
      const sp = memberMap.get(sid);
      if (!sp?.fatherId && !sp?.motherId) visited.add(sid);
    }

    const spouses = spouseIds.map(sid => memberMap.get(sid)).filter(Boolean) as FamilyMember[];
    const spouseMarriages = spouseIds.map(sid => getMarriage(member, sid) ?? { spouseId: sid, status: 'married' as MarriageStatus });

    // Gabungkan childrenIds dari semua pasangan
    const childIds = new Set<string>([...member.childrenIds]);
    for (const spouse of spouses) {
      for (const cid of spouse.childrenIds) childIds.add(cid);
    }

    const children: TreeNode[] = [];
    for (const childId of childIds) {
      if (!visited.has(childId)) {
        const child = memberMap.get(childId);
        if (child) children.push(buildNode(child, level + 1));
      }
    }

    return { member, children, spouses, spouseMarriages, level };
  }

  return rootMembers.map(r => buildNode(r, 0));
}

export function findRelationPath(
  fromId: string,
  toId: string,
  memberMap: Map<string, FamilyMember>
): string[] | null {
  if (fromId === toId) return [fromId];
  const queue: string[][] = [[fromId]];
  const visited = new Set<string>([fromId]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const currentId = path[path.length - 1];
    const member = memberMap.get(currentId);
    if (!member) continue;
    const neighbors = [
      ...member.childrenIds,
      ...(member.fatherId ? [member.fatherId] : []),
      ...(member.motherId ? [member.motherId] : []),
      ...getSpouseIds(member),
    ];
    for (const nid of neighbors) {
      if (nid === toId) return [...path, nid];
      if (!visited.has(nid)) {
        visited.add(nid);
        queue.push([...path, nid]);
      }
    }
  }
  return null;
}

export function computeGenerationMap(
  members: FamilyMember[],
  memberMap: Map<string, FamilyMember>
): Map<string, number> {
  const genMap = new Map<string, number>();
  const roots = members.filter(m => !m.fatherId && !m.motherId);
  const queue: [string, number][] = roots.map(r => [r.id, 0]);
  while (queue.length > 0) {
    const [id, gen] = queue.shift()!;
    if (genMap.has(id)) continue;
    genMap.set(id, gen);
    const member = memberMap.get(id);
    if (!member) continue;
    for (const childId of member.childrenIds) {
      if (!genMap.has(childId)) queue.push([childId, gen + 1]);
    }
    for (const spouseId of getSpouseIds(member)) {
      if (!genMap.has(spouseId)) genMap.set(spouseId, gen);
    }
  }
  return genMap;
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function getAge(birthDate?: string, deathDate?: string | null): string {
  if (!birthDate) return '';
  const birth = new Date(birthDate);
  if (deathDate) return `${birth.getFullYear()} — ${new Date(deathDate).getFullYear()}`;
  return `${birth.getFullYear()} — sekarang`;
}

export function getAvatarUrl(member: FamilyMember): string {
  if (member.photo) return member.photo;
  const style = member.gender === 'male' ? 'adventurer' : 'avataaars';
  const seed = encodeURIComponent(member.name);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}
