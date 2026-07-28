import { getReportForDownload } from '@/app/actions/reports';
import { renderReportPdf } from '@/lib/report-pdf';

export const dynamic = 'force-dynamic';

/**
 * Descarga del reporte en PDF — RF-15.
 *
 * El PDF se produce en cada descarga a partir del periodo y las secciones
 * guardados, y lleva impresa la fecha en que se generó. No se almacena el
 * archivo: el §21.4 del PRD pide almacenamiento cifrado con política de
 * retención y enlaces temporales, que es una pieza de infraestructura que
 * todavía no existe. Regenerar evita guardar datos de salud en un bucket sin
 * esas garantías, a costa de que dos descargas del mismo reporte reflejen los
 * datos vigentes en cada momento — por eso la fecha de generación es la de la
 * descarga y no miente.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resultado = await getReportForDownload(id);

  if (!resultado.ok) {
    return new Response(resultado.error, { status: 404 });
  }

  const pdf = await renderReportPdf(resultado.report);
  const nombre = `resumen-seguimiento-${id.slice(0, 8)}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombre}"`,
      // Datos de salud: nunca en cachés intermedias.
      'Cache-Control': 'no-store, private',
    },
  });
}
