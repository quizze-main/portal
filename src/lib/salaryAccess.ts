import { BRANCHES, getAvailablePositions, type BranchId } from '@/data/branchData';
import type { LoovisStoreOption } from '@/lib/internalApiClient';

type StoreLike = { name?: string | null } | string | null | undefined;

function normalize(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    // strip "- LR" suffix
    .replace(/\s*-\s*lr\s*$/i, '')
    // collapse whitespace
    .replace(/\s+/g, ' ');
}

export function mapStoreNameToBranchId(store: StoreLike): BranchId | null {
  const name = typeof store === 'string' ? store : (store?.name ?? '');
  const n = normalize(name);
  if (!n) return null;

  // Prefer exact (normalized) matches first.
  for (const b of BRANCHES) {
    if (normalize(b.name) === n) return b.id;
  }
  // Fallback to substring match (handles extra prefixes/suffixes).
  for (const b of BRANCHES) {
    const bn = normalize(b.name);
    if (!bn) continue;
    if (n.includes(bn) || bn.includes(n)) return b.id;
  }

  return null;
}

export function getAllowedBranchIds(params: {
  hasAllBranchesAccess: boolean;
  storeOptions?: Array<{ name?: string | null }> | null;
  employeeDepartment?: string | null;
}): BranchId[] {
  if (params.hasAllBranchesAccess) return BRANCHES.map((b) => b.id);

  const out: BranchId[] = [];
  const seen = new Set<string>();

  const add = (id: BranchId | null) => {
    if (!id) return;
    if (seen.has(id)) return;
    seen.add(id);
    out.push(id);
  };

  const opts = params.storeOptions ?? [];
  for (const s of opts) add(mapStoreNameToBranchId(s));

  // Standard access often has no storeOptions; fallback to employee.department (Department doctype name).
  if (out.length === 0 && params.employeeDepartment) {
    add(mapStoreNameToBranchId(params.employeeDepartment));
  }

  return out;
}

export function derivePositionIdFromDesignation(params: {
  designation?: string | null;
  branchId: BranchId;
  shiftFormat?: string | null;
}): string {
  const d = normalize(params.designation || '');
  const shift = normalize(params.shiftFormat || '');
  const available = getAvailablePositions(params.branchId);
  const ids = new Set(available.map((p) => p.id));

  const pickFirstAvailable = () => (available[0]?.id ? String(available[0].id) : 'manager');
  const pickPreferredManagerVariant = () => {
    // Prefer non-senior manager variants when we can't infer schedule.
    if (ids.has('manager')) return 'manager';
    if (ids.has('manager_5_2')) return 'manager_5_2';
    if (ids.has('manager_2_2')) return 'manager_2_2';
    if (ids.has('universal_manager')) return 'universal_manager';
    return null;
  };

  // Heuristics (keep conservative; fallback to first available)
  if (/(оптометрист)/i.test(d) && ids.has('optometrist')) return 'optometrist';
  if (/(старш)/i.test(d) && ids.has('senior_manager')) return 'senior_manager';
  if (/(универсал)/i.test(d) && ids.has('universal_manager')) return 'universal_manager';

  // Kaliningrad: for managers prefer explicit shift format (2/2 vs 5/2) over guesswork.
  // Field in Frappe: `custom_employee_shift_format` ("График 5/2" | "График 2/2").
  // Only apply to manager roles (not senior managers etc).
  const isKaliningradBranch = String(params.branchId).startsWith('kaliningrad');
  const isManagerRole = /(менеджер)/i.test(d);
  if (isKaliningradBranch && isManagerRole) {
    // At this point `shiftFormat` is expected to be either:
    // - derived kind: "2/2" | "5/2"
    // - OR (fallback) raw id / label containing "2/2" / "5/2"
    if ((shift === '5/2' || /(5\s*\/\s*2)/i.test(shift)) && ids.has('manager_5_2')) {
      // eslint-disable-next-line no-console
      console.info('[salary] kaliningrad manager shift: 5/2 -> manager_5_2');
      return 'manager_5_2';
    }
    if ((shift === '2/2' || /(2\s*\/\s*2)/i.test(shift)) && ids.has('manager_2_2')) {
      // eslint-disable-next-line no-console
      console.info('[salary] kaliningrad manager shift: 2/2 -> manager_2_2');
      return 'manager_2_2';
    }
  }

  if (/(5\/2)/i.test(d) && ids.has('manager_5_2')) return 'manager_5_2';
  if (/(2\/2)/i.test(d) && ids.has('manager_2_2')) return 'manager_2_2';

  // Manager role (generic). If branch doesn't have plain `manager`, pick a manager variant first
  // to avoid incorrectly defaulting to `senior_manager` (e.g. Kaliningrad club config).
  if (/(менеджер)/i.test(d)) {
    const preferred = pickPreferredManagerVariant();
    if (preferred) return preferred;
  }

  // Default manager role (if available)
  if (ids.has('manager')) return 'manager';

  // If branch has manager variants, prefer them over senior_manager as a safer default.
  const preferred = pickPreferredManagerVariant();
  if (preferred) return preferred;

  return pickFirstAvailable();
}

export function mapBranchIdToStoreOption(
  branchId: BranchId,
  storeOptions: LoovisStoreOption[]
): LoovisStoreOption | null {
  for (const opt of storeOptions) {
    if (mapStoreNameToBranchId(opt) === branchId) return opt;
  }
  return null;
}

