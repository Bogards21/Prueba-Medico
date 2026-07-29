'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { contents, auditLogs } from '@/db/schema';
import {
  canCreate,
  canTransition,
  canPublish,
  statusAfterEdit,
  isVisibleToPatient,
  CONTENT_CATEGORIES,
} from '@/domain/content';
import type { ContentStatus } from '@/domain/content';
import { getActor } from '@/lib/roles';
import { requireUserId } from '@/lib/current-user';

export type ContentResult = { ok: true; id?: string } | { ok: false; error: string };

const CATEGORIAS = new Set<string>(CONTENT_CATEGORIES.map((c) => c.key));

const TIPOS = new Set(['article', 'infographic', 'video', 'faq', 'guide', 'microlesson']);

function slugificar(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export interface ContentInput {
  title: string;
  summary?: string;
  body: string;
  type: string;
  category: string;
  /** RF-12 — "todo contenido debe tener autor o fuente". */
  author: string;
}

function validar(input: ContentInput): string | null {
  if (!input.title.trim()) return 'Escribe un título.';
  if (!input.body.trim()) return 'El contenido no puede estar vacío.';
  if (!input.author.trim()) return 'Indica el autor o la fuente del contenido.';
  if (!CATEGORIAS.has(input.category)) return 'Elige una categoría válida.';
  if (!TIPOS.has(input.type)) return 'Elige un formato válido.';
  return null;
}

/* ─────────────────────────────── Redacción ─────────────────────────────── */

export async function createContent(input: ContentInput): Promise<ContentResult> {
  const actor = await getActor();
  if (!actor || !canCreate(actor.role)) {
    return { ok: false, error: 'No tienes permiso para crear contenido.' };
  }

  const problema = validar(input);
  if (problema) return { ok: false, error: problema };

  const db = await getDb();
  const slug = `${slugificar(input.title)}-${Date.now().toString(36)}`;

  const [fila] = await db
    .insert(contents)
    .values({
      title: input.title.trim(),
      slug,
      summary: input.summary?.trim() || null,
      body: input.body.trim(),
      type: input.type as 'article',
      category: input.category,
      author: input.author.trim(),
      status: 'draft', // Nace en borrador. Nunca publicado.
    })
    .returning();

  await db.insert(auditLogs).values({
    actorId: actor.userId,
    action: 'content_created',
    entityType: 'contents',
    entityId: fila.id,
    metadata: { title: fila.title, category: fila.category },
  });

  revalidatePath('/admin/contenido');
  return { ok: true, id: fila.id };
}

export async function updateContent(id: string, input: ContentInput): Promise<ContentResult> {
  const actor = await getActor();
  if (!actor || !canCreate(actor.role)) {
    return { ok: false, error: 'No tienes permiso para editar contenido.' };
  }

  const problema = validar(input);
  if (problema) return { ok: false, error: problema };

  const db = await getDb();
  const [actual] = await db.select().from(contents).where(eq(contents.id, id)).limit(1);
  if (!actual) return { ok: false, error: 'No encontramos ese contenido.' };

  /**
   * CA-09 — al editar, el contenido vuelve a revisión y se invalida la
   * aprobación anterior. El texto ya no es el que revisó el profesional, así
   * que su firma no puede seguir cubriéndolo.
   */
  const nuevoEstado = statusAfterEdit(actual.status);
  const pierdeAprobacion = nuevoEstado !== actual.status;

  await db
    .update(contents)
    .set({
      title: input.title.trim(),
      summary: input.summary?.trim() || null,
      body: input.body.trim(),
      type: input.type as 'article',
      category: input.category,
      author: input.author.trim(),
      status: nuevoEstado,
      version: actual.version + 1, // RF-12 — "debe tener versión".
      ...(pierdeAprobacion
        ? { reviewerId: null, clinicalReviewDate: null, publishedAt: null }
        : {}),
    })
    .where(eq(contents.id, id));

  await db.insert(auditLogs).values({
    actorId: actor.userId,
    action: 'content_updated',
    entityType: 'contents',
    entityId: id,
    metadata: {
      fromStatus: actual.status,
      toStatus: nuevoEstado,
      version: actual.version + 1,
      approvalRevoked: pierdeAprobacion,
    },
  });

  revalidatePath('/admin/contenido');
  revalidatePath('/aprender');
  return { ok: true };
}

/* ───────────────────────── Flujo editorial (RF-12) ─────────────────────── */

export async function changeContentStatus(
  id: string,
  destino: ContentStatus,
): Promise<ContentResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: 'Tu sesión expiró.' };

  const db = await getDb();
  const [actual] = await db.select().from(contents).where(eq(contents.id, id)).limit(1);
  if (!actual) return { ok: false, error: 'No encontramos ese contenido.' };

  if (!canTransition(actor.role, actual.status, destino)) {
    return {
      ok: false,
      error:
        destino === 'approved'
          ? 'Solo el responsable clínico puede aprobar contenido.'
          : 'No puedes hacer ese cambio sobre este contenido.',
    };
  }

  const cambios: Record<string, unknown> = { status: destino };

  if (destino === 'approved') {
    // RF-12 — queda registrado quién aprobó y cuándo.
    cambios.reviewerId = actor.userId;
    cambios.clinicalReviewDate = new Date();
  }

  if (destino === 'published') {
    // RB-07 — segunda comprobación: sin rastro de aprobación no se publica,
    // aunque el estado diga "approved".
    if (!canPublish(actual)) {
      return {
        ok: false,
        error: 'Este contenido no tiene aprobación clínica registrada. No puede publicarse.',
      };
    }
    cambios.publishedAt = new Date();
  }

  await db.update(contents).set(cambios).where(eq(contents.id, id));

  await db.insert(auditLogs).values({
    actorId: actor.userId,
    action: `content_${destino}`,
    entityType: 'contents',
    entityId: id,
    metadata: { fromStatus: actual.status, toStatus: destino, role: actor.role },
  });

  revalidatePath('/admin/contenido');
  revalidatePath('/aprender');
  return { ok: true };
}

/* ─────────────────────────────── Lectura ───────────────────────────────── */

export async function listContentForAdmin() {
  const db = await getDb();
  return db.select().from(contents).orderBy(desc(contents.createdAt));
}

export async function getContentById(id: string) {
  const db = await getDb();
  const [fila] = await db.select().from(contents).where(eq(contents.id, id)).limit(1);
  return fila ?? null;
}

/** Catálogo visible para el paciente. */
export async function listPublishedContent(categoria?: string) {
  await requireUserId();
  const db = await getDb();

  const filas = await db
    .select()
    .from(contents)
    .where(
      categoria
        ? and(eq(contents.status, 'published'), eq(contents.category, categoria))
        : eq(contents.status, 'published'),
    )
    .orderBy(desc(contents.publishedAt));

  // RF-12 — el contenido con revisión vencida se oculta al paciente.
  const ahora = new Date();
  return filas.filter((f) =>
    isVisibleToPatient(
      {
        status: f.status,
        reviewerId: f.reviewerId,
        clinicalReviewDate: f.clinicalReviewDate,
        publishedAt: f.publishedAt,
        version: f.version,
      },
      ahora,
    ),
  );
}

export async function getPublishedContentBySlug(slug: string) {
  await requireUserId();
  const db = await getDb();

  const [fila] = await db.select().from(contents).where(eq(contents.slug, slug)).limit(1);
  if (!fila) return null;

  const visible = isVisibleToPatient(
    {
      status: fila.status,
      reviewerId: fila.reviewerId,
      clinicalReviewDate: fila.clinicalReviewDate,
      publishedAt: fila.publishedAt,
      version: fila.version,
    },
    new Date(),
  );

  return visible ? fila : null;
}
