import 'server-only';

import { getDb } from './client';
import { alertEvents } from './schema';
import type { RuleEvaluation } from '@/domain/rules/types';

/**
 * Registro de alertas mostradas — CA-05 y §22.6.
 *
 * CA-05 termina con "y registra el evento", y §22.6 pide que "los eventos
 * críticos queden registrados". Se guarda una copia LITERAL del mensaje que
 * se mostró y la VERSIÓN de la regla que lo produjo, no una referencia a la
 * regla: si más adelante alguien edita esa regla, el histórico tiene que
 * seguir diciendo qué leyó esta persona ese día, no lo que la regla dice hoy.
 */
export async function recordAlertEvents(
  userId: string,
  relatedRecordId: string,
  evaluaciones: RuleEvaluation[],
): Promise<void> {
  if (evaluaciones.length === 0) return;

  const db = await getDb();

  await db.insert(alertEvents).values(
    evaluaciones.map((e) => ({
      userId,
      ruleId: e.ruleId,
      ruleVersion: e.ruleVersion,
      relatedRecordId,
      severity: e.severity,
      messageShown: e.messageEs,
    })),
  );
}
