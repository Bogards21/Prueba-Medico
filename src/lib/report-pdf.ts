import 'server-only';

import PDFDocument from 'pdfkit';
import type { Report } from '@/domain/report';

/**
 * Dibuja el modelo de reporte en un PDF — RF-15.
 *
 * Solo maquetación: qué se incluye y cómo se resume ya se decidió en
 * `@/domain/report`, que es puro y está cubierto por tests. Aquí no hay
 * ninguna regla de negocio.
 *
 * Se usan las fuentes estándar de PDF (Helvetica), cuya codificación WinAnsi
 * cubre los acentos y la eñe del español sin incrustar ficheros de fuente.
 */

const MARGEN = 50;
const ANCHO_UTIL = 595.28 - MARGEN * 2; // A4 menos márgenes

const GRIS = '#475569';
const NEGRO = '#0f172a';
const LINEA = '#cbd5e1';

export function renderReportPdf(report: Report): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGEN,
      info: {
        Title: `Resumen de seguimiento — ${report.patientName}`,
        Author: 'Plataforma de acompañamiento en diabetes tipo 2',
      },
    });

    const trozos: Buffer[] = [];
    doc.on('data', (t: Buffer) => trozos.push(t));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    /* ── Encabezado ── */

    doc.fillColor(NEGRO).font('Helvetica-Bold').fontSize(20);
    doc.text('Resumen de seguimiento');

    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(11).fillColor(GRIS);
    doc.text(`Persona: ${report.patientName}`);
    doc.text(`Periodo: ${report.periodLabel}`);
    doc.text(`Generado el ${report.generatedAtLabel}`);

    /*
     * RF-15 — la aclaración de alcance va ARRIBA, antes de cualquier dato.
     * Al pie se leería después de las cifras, cuando el lector ya se formó
     * una idea. El §33 exige que el límite clínico esté claro, no presente.
     */
    doc.moveDown(1);
    const alturaAviso = doc.heightOfString(report.disclaimer, { width: ANCHO_UTIL - 20 });
    doc
      .rect(MARGEN, doc.y, ANCHO_UTIL, alturaAviso + 20)
      .fillAndStroke('#fefce8', '#facc15');

    doc.fillColor('#422006').font('Helvetica').fontSize(9.5);
    doc.text(report.disclaimer, MARGEN + 10, doc.y + 10, { width: ANCHO_UTIL - 20 });
    doc.moveDown(1.5);

    /* ── Secciones ── */

    for (const seccion of report.sections) {
      // Salto de página si no cabe al menos el título y un par de líneas.
      if (doc.y > 700) doc.addPage();

      doc.moveDown(0.8);
      doc.fillColor(NEGRO).font('Helvetica-Bold').fontSize(14);
      doc.text(seccion.title, MARGEN, doc.y, { width: ANCHO_UTIL });

      doc
        .moveTo(MARGEN, doc.y + 4)
        .lineTo(MARGEN + ANCHO_UTIL, doc.y + 4)
        .strokeColor(LINEA)
        .stroke();
      doc.moveDown(0.6);

      if (seccion.isEmpty) {
        // §13.5 / RB-09 — el hueco se declara, no se rellena ni se omite.
        doc.font('Helvetica-Oblique').fontSize(10.5).fillColor(GRIS);
        doc.text(seccion.emptyMessage ?? 'Sin registros.', { width: ANCHO_UTIL });
        continue;
      }

      if (seccion.summary) {
        doc.font('Helvetica').fontSize(10.5).fillColor(NEGRO);
        doc.text(seccion.summary, { width: ANCHO_UTIL });
        doc.moveDown(0.5);
      }

      for (const fila of seccion.rows) {
        if (doc.y > 760) doc.addPage();

        doc.font('Helvetica-Bold').fontSize(10).fillColor(NEGRO);
        doc.text(`${fila.valor}`, MARGEN, doc.y, { continued: true, width: ANCHO_UTIL });

        doc.font('Helvetica').fillColor(GRIS);
        const detalle = [fila.detalle, fila.fecha].filter(Boolean).join(' · ');
        doc.text(detalle ? `   ${detalle}` : '', { width: ANCHO_UTIL });

        // RB-11 — el origen del dato viaja con el dato.
        doc.font('Helvetica').fontSize(8.5).fillColor(GRIS);
        doc.text(fila.origen, { width: ANCHO_UTIL });

        if (fila.nota) {
          doc.font('Helvetica-Oblique').fontSize(9).fillColor(GRIS);
          doc.text(`Nota: ${fila.nota}`, { width: ANCHO_UTIL });
        }

        doc.moveDown(0.35);
      }
    }

    /* ── Pie ── */

    doc.moveDown(1.5);
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(GRIS);
    doc.text(
      'Documento generado por la persona usuaria desde su aplicación de seguimiento. ' +
        'Ante una urgencia, comuníquese con los servicios de emergencia.',
      MARGEN,
      doc.y,
      { width: ANCHO_UTIL },
    );

    doc.end();
  });
}
