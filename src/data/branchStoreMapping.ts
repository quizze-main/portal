import { BRANCHES } from './branchData';

/**
 * Mapping between BRANCHES slugs (moscow_club, spb_clinic, etc.)
 * and Frappe store IDs (1000000008, 1000000052, etc.)
 *
 * BRANCHES slugs are used in the vendored loovis-sandbox UI components.
 * Frappe store IDs are the real IDs from the Loovis/Frappe API used for data filtering.
 */
export const BRANCH_TO_STORE_ID: Record<string, string> = {
  moscow_club: '1000000052',
  spb_clinic: '1000000008',
  kaliningrad_club: '1000000009',
  kaliningrad_clinic: '1000000007',
  yakutsk_club: '1000000043',
  yakutsk_clinic: '1000000042',
  kazan_club: '1000000006',
};

// Reverse mapping: Frappe store ID → BRANCHES slug
export const STORE_ID_TO_BRANCH: Record<string, string> = Object.fromEntries(
  Object.entries(BRANCH_TO_STORE_ID).map(([slug, storeId]) => [storeId, slug])
);

export function getStoreIdBySlug(slug: string): string | undefined {
  return BRANCH_TO_STORE_ID[slug];
}

export function getSlugByStoreId(storeId: string): string | undefined {
  return STORE_ID_TO_BRANCH[storeId];
}

/** Normalized branch ID: always returns Frappe store ID regardless of input format */
export function normalizeBranchId(id: string): string {
  return BRANCH_TO_STORE_ID[id] || id;
}

export interface BranchWithStoreId {
  slug: string;
  storeId: string;
  name: string;
}

/** Returns all branches with both slug and Frappe store ID */
export function getAllBranchesWithStoreIds(): BranchWithStoreId[] {
  return BRANCHES.map(b => ({
    slug: b.id,
    storeId: BRANCH_TO_STORE_ID[b.id] || b.id,
    name: b.name,
  }));
}
