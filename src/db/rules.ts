import 'server-only';

import { and, eq, isNotNull } from 'drizzle-orm';
import { getDb } from './client';
import { clinicalRules } from './schema';
import type { ClinicalRule } from '@/domain/rules/types';

/**
 * Carga las reglas que el motor puede evaluar.
 *
 * El filtro `status = 'active' AND approved_by IS NOT NULL` duplica a
 * propósito la comprobación que ya hace `evaluateRules`. Es defensa en
 * profundidad sobre RB-02: una regla sin aprobación clínica no debe salir
 * de la base de datos, y tampoco debe evaluarse si sale.
 */
export async function getActiveApprovedRules(): Promise<ClinicalRule[]> {
  const db = await getDb();

  const rows = await db
    .select()
    .from(clinicalRules)
    .where(
      and(
        eq(clinicalRules.status, 'active'),
        isNotNull(clinicalRules.approvedBy),
        isNotNull(clinicalRules.approvedAt),
      ),
    );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    variable: r.variable,
    operator: r.operator,
    threshold: Number(r.threshold),
    unit: r.unit,
    severity: r.severity,
    messageEs: r.messageEs,
    version: r.version,
    status: r.status,
    approvedBy: r.approvedBy,
    approvedAt: r.approvedAt,
  }));
}
