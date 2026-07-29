import { notFound } from 'next/navigation';
import { ContenidoForm } from '../contenido-form';
import { getContentById } from '@/app/actions/content';
import { requireRole } from '@/lib/roles';

export const metadata = { title: 'Editar contenido' };
export const dynamic = 'force-dynamic';

export default async function EditarContenidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole('admin', 'editor', 'clinical_reviewer');

  const { id } = await params;
  const articulo = await getContentById(id);
  if (!articulo) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Editar contenido</h1>
      <ContenidoForm
        inicial={{
          id: articulo.id,
          title: articulo.title,
          summary: articulo.summary,
          body: articulo.body,
          type: articulo.type,
          category: articulo.category,
          author: articulo.author,
          status: articulo.status,
        }}
      />
    </div>
  );
}
