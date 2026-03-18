export function isLeaderDashboardEligible(designation?: string | null): boolean {
  const d = String(designation || "").toLowerCase();
  return d.includes("руководитель клуба") || d.includes("руководитель клиники");
}

export function getDashboardPositionCategory(designation?: string | null): string {
  const d = String(designation || '').toLowerCase().replace(/ё/g, 'е');
  if (d.includes('руководитель')) return 'leader';
  if (d.includes('старш') && d.includes('менеджер')) return 'senior_manager';
  if (d.includes('оптометрист')) return 'optometrist';
  if (d.includes('5/2')) return 'manager_5_2';
  if (d.includes('2/2')) return 'manager_2_2';
  if (d.includes('универсал')) return 'universal_manager';
  if (d.includes('менеджер')) return 'manager';
  return 'leader';
}

export function isCareManager(designation?: string | null): boolean {
  const d = String(designation || "").toLowerCase();
  return d.includes("менеджер заботы");
}

