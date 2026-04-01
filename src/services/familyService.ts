/**
 * Family data service.
 *
 * Currently reads from a local JSON file. To switch to a backend API:
 *   1. Set USE_LOCAL = false
 *   2. Set NEXT_PUBLIC_API_URL in your .env (e.g. http://localhost:3001)
 *   3. Make sure the API returns the same FamilyData shape:
 *      GET /api/family  → { members: FamilyMember[] }
 *
 * All consumers call getFamilyData() — no other change needed.
 */

import { FamilyData } from '@/types';

const USE_LOCAL = true;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function getFamilyData(): Promise<FamilyData> {
  if (USE_LOCAL) {
    // Dynamic import keeps this tree-shakeable when USE_LOCAL is false
    const local = await import('../../data/family.json');
    return local.default as FamilyData;
  }

  const res = await fetch(`${API_URL}/api/family`, {
    next: { revalidate: 60 }, // Next.js ISR — refetch at most every 60 s
  });
  if (!res.ok) throw new Error(`Failed to fetch family data: ${res.status}`);
  return res.json() as Promise<FamilyData>;
}
