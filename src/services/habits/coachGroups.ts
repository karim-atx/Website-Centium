// Release 3 (CU28): pure grouping for Mind › Today, tested in coachGroups.test.ts.
/**
 * The Today card's coach groups (CU28): one per professional, in the order
 * their first habit appears, each with its habits in list order. Habits not
 * in the map are the client's own.
 */
export function groupCoachHabits<T extends { id: string }>(
  habits: T[],
  coachOf: Record<string, string>
): { groups: { professionalId: string; habits: T[] }[]; own: T[] } {
  const groups: { professionalId: string; habits: T[] }[] = [];
  const own: T[] = [];
  for (const h of habits) {
    const pro = coachOf[h.id];
    if (!pro) {
      own.push(h);
      continue;
    }
    let g = groups.find((x) => x.professionalId === pro);
    if (!g) groups.push((g = { professionalId: pro, habits: [] }));
    g.habits.push(h);
  }
  return { groups, own };
}
