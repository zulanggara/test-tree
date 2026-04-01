'use client';

import { useState, useEffect, useMemo } from 'react';
import { FamilyData, FamilyMember } from '@/types';
import { buildMemberMap, buildTree } from '@/lib/family';
import { getFamilyData } from '@/services/familyService';

interface UseFamilyDataResult {
  members: FamilyMember[];
  memberMap: Map<string, FamilyMember>;
  allRoots: ReturnType<typeof buildTree>;
  loading: boolean;
  error: string | null;
}

export function useFamilyData(): UseFamilyDataResult {
  const [data, setData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFamilyData()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const members = useMemo(() => data?.members ?? [], [data]);
  const memberMap = useMemo(() => buildMemberMap({ members }), [members]);
  const allRoots = useMemo(() => buildTree(members, memberMap), [members, memberMap]);

  return { members, memberMap, allRoots, loading, error };
}
