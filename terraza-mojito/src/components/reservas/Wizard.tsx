'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Minus, Plus, TriangleAlert } from 'lucide-react';
import { reglasReserva } from '@/data/negocio';
import { formatoAmPm } from '@/lib/horarios';
import { OCASIONES } from '@/lib/tipos';
import { solicitarReserva, obtenerFranjas } from '@/app/reservar/acciones';
import { Calendario } from './Calendario';
import { Pasos, PASOS } from './Pasos';
import { Confirmacion } from './Confirmacion';

interface Borrador {
  reservation_date: string | null;
  reservation_time: string | null;
  party_size: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  occasion: string;
  special_requests: string;
  privacy_accepted: boolean;
  marketing_consent: boolean;
}

const BORRADOR_INICIAL: Borrador = {
  reservation_date: null,
  reservation_time: null,
  party_size: 2,
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  occasion: '',
  special_requests: '',
  privacy_accepted: false,
  marketing_consent: false,
};

function fechaLegible(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function Wizard() {
  const [paso, setPaso] = useState(0);
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_INICIAL);
  const [franjas, setFranjas] = useState<string[]>([]);
  const [cargandoFranjas, setCargandoFranjas] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [reservaId, setReservaId] = useState<string | null>(null);
  const [enDemo, setEnDemo] = useState(false);
  const [enviando, iniciarEnvio] = useTransition();

  const encabezado = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) => {
    setBorrador((b) => ({ ...b, [campo]: valor }));
    setErrores((e) => {
      if (!e[campo]) return e;
      const { [campo]: _, ...resto } = e;
      return resto;
    });
  };

  // Al cambiar de paso, mover el foco al encabezado para lectores de pantalla.
  useEffect(() => {
    encabezado.current?.focus();
  }, [paso]);

  // Las franjas se piden al servidor: es la única fuente fiable de qué está libre.
  useEffect(() => {
    if (!borrador.reservation_date) return;
    let cancelado = false;
    setCargandoFranjas(true);
    obtenerFranjas(borrador.reservation_date)
      .then((lista) => {
        if (cancelado) return;
        setFranjas(lista);
        // Si la hora elegida ya no existe en la nueva fecha, se limpia.
        setBorrador((b) =>
          b.reservation_time && !lista.includes(b.reservation_time)
            ? { ...b, reservation_time: null }
            : b,
        );
      })
      .finally(() => !cancelado && setCargandoFranjas(false));
    return () => {
      cancelado = true;
    };
  }, [borrador.reservation_date]);

  const grupoGrande = borrador.party_size > reglasReserva.personasMaximoDirecto;

  const puedeAvanzar = useMemo(() => {
    switch (paso) {
      case 0:
        return Boolean(borrador.reservation_date);
      case 1:
        return Boolean(borrador.reservation_time);
      case 2:
        return borrador.party_size >= 1;
      case 3:
        return (
          borrador.first_name.trim().length >= 2 &&
          borrador.last_name.trim().length >= 2 &&
          borrador.phone.replace(/\D/g, '').length === 10 &&
          /\S+@\S+\.\S+/.test(borrador.email) &&
          borrador.privacy_accepted
        );
      default:
        return true;
    }
  }, [paso, borrador]);

  function enviar() {
    setErrorGeneral(null);
    iniciarEnvio(async () => {
      const resultado = await solicitarReserva({
        ...borrador,
        occasion: borrador.occasion || null,
        special_requests: borrador.special_requests || null,
      });

      if (resultado.ok && resultado.reservaId) {
        setReservaId(resultado.reservaId);
        setEnDemo(Boolean(resultado.modoDemo));
        return;
      }

      if (resultado.errores) {
        setErrores(resultado.errores);
        // Devolver al paso donde está el problema en vez de dejarlo atorado.
        const campo = Object.keys(resultado.errores)[0];
        if (campo === 'reservation_date') setPaso(0);
        else if (campo === 'reservation_time') setPaso(1);
        else if (campo === 'party_size') setPaso(2);
        else setPaso(3);
      }
      setErrorGeneral(resultado.mensaje ?? null);
    });
  }

  if (reservaId) {
    return <Confirmacion reservaId={reservaId} borrador={borrador} modoDemo={enDemo} />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div ref={encabezado} tabIndex={-1} className="outline-none">
        <Pasos actual={paso} />
      </div>

      {errorGeneral && (
        <div
          role="alert"
          className="mb-6 flex gap-3 rounded-md border-2 border-red-300 bg-red-50 p-4 text-red-900"
        >
          <TriangleAlert aria-hidden size={20} className="mt-0.5 shrink-0" />
          <p>{errorGeneral}</p>
        </div>
      )}

      {/* ---------- Paso 1: fecha ---------- */}
      {paso === 0 && (
        <section aria-labelledby="t-fecha">
          <h2 id="t-fecha" className="display mb-2 text-3xl">
            ¿Qué día nos visitas?
          </h2>
          <p className="mb-6 text-carbon/75">
            Puedes reservar hasta con {reglasReserva.diasMaximosAnticipacion} días de
            anticipación.
          </p>
          {errores.reservation_date && (
            <p role="alert" className="mb-4 text-red-700">
              {errores.reservation_date}
            </p>
          )}
          <Calendario
            seleccionada={borrador.reservation_date}
            onSeleccionar={(iso) => set('reservation_date', iso)}
          />
        </section>
      )}

      {/* ---------- Paso 2: hora ---------- */}
      {paso === 1 && (
        <section aria-labelledby="t-hora">
          <h2 id="t-hora" className="display mb-2 text-3xl">
            ¿A qué hora?
          </h2>
          <p className="mb-6 text-carbon/75 first-letter:uppercase">
            {borrador.reservation_date && fechaLegible(borrador.reservation_date)}
          </p>
          {errores.reservation_time && (
            <p role="alert" className="mb-4 text-red-700">
              {errores.reservation_time}
            </p>
          )}

          {cargandoFranjas ? (
            <p className="text-carbon/60">Cargando horarios…</p>
          ) : franjas.length === 0 ? (
            <div className="tarjeta p-6">
              <p className="text-carbon/80">
                Ya no quedan horarios para este día. Regresa y elige otra fecha.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {franjas.map((franja) => {
                const activa = borrador.reservation_time === franja;
                return (
                  <button
                    key={franja}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => set('reservation_time', franja)}
                    className={`dato min-h-[52px] rounded-sm border-2 text-[15px] transition-colors ${
                      activa
                        ? 'border-hoja bg-hoja text-espuma'
                        : 'border-borde bg-espuma text-noche hover:border-mojito hover:bg-lima-pale'
                    }`}
                  >
                    {formatoAmPm(franja)}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ---------- Paso 3: personas ---------- */}
      {paso === 2 && (
        <section aria-labelledby="t-personas">
          <h2 id="t-personas" className="display mb-2 text-3xl">
            ¿Cuántos vienen?
          </h2>
          <p className="mb-8 text-carbon/75">Contando a todos, incluido tú.</p>

          <div className="tarjeta flex items-center justify-between p-6">
            <button
              type="button"
              onClick={() => set('party_size', Math.max(1, borrador.party_size - 1))}
              disabled={borrador.party_size <= 1}
              className="btn-secundario h-14 w-14 !px-0"
            >
              <Minus aria-hidden size={22} />
              <span className="sr-only">Quitar una persona</span>
            </button>

            <p className="text-center">
              <span
                aria-live="polite"
                className="display block text-6xl leading-none text-noche"
              >
                {borrador.party_size}
              </span>
              <span className="mt-2 block text-carbon/70">
                {borrador.party_size === 1 ? 'persona' : 'personas'}
              </span>
            </p>

            <button
              type="button"
              onClick={() =>
                set(
                  'party_size',
                  Math.min(reglasReserva.personasMaximoAbsoluto, borrador.party_size + 1),
                )
              }
              disabled={borrador.party_size >= reglasReserva.personasMaximoAbsoluto}
              className="btn-secundario h-14 w-14 !px-0"
            >
              <Plus aria-hidden size={22} />
              <span className="sr-only">Agregar una persona</span>
            </button>
          </div>

          {errores.party_size && (
            <p role="alert" className="mt-4 text-red-700">
              {errores.party_size}
            </p>
          )}

          {grupoGrande && (
            <div className="mt-5 rounded-md border-2 border-mojito bg-lima-pale/60 p-5">
              <p className="font-bold text-noche">Grupo grande</p>
              <p className="mt-1 text-carbon/85">
                Para más de {reglasReserva.personasMaximoDirecto} personas revisamos el
                acomodo antes de confirmar. Manda la solicitud y te contactamos para
                afinar los detalles.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ---------- Paso 4: datos ---------- */}
      {paso === 3 && (
        <section aria-labelledby="t-datos">
          <h2 id="t-datos" className="display mb-2 text-3xl">
            ¿A nombre de quién?
          </h2>
          <p className="mb-8 text-carbon/75">
            Los usamos para confirmarte la mesa. Nada más.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo
              id="first_name"
              etiqueta="Nombre"
              valor={borrador.first_name}
              error={errores.first_name}
              onChange={(v) => set('first_name', v)}
              autoComplete="given-name"
            />
            <Campo
              id="last_name"
              etiqueta="Apellidos"
              valor={borrador.last_name}
              error={errores.last_name}
              onChange={(v) => set('last_name', v)}
              autoComplete="family-name"
            />
            <Campo
              id="phone"
              etiqueta="Teléfono"
              tipo="tel"
              inputMode="numeric"
              ayuda="10 dígitos"
              valor={borrador.phone}
              error={errores.phone}
              onChange={(v) => set('phone', v)}
              autoComplete="tel-national"
            />
            <Campo
              id="email"
              etiqueta="Correo"
              tipo="email"
              valor={borrador.email}
              error={errores.email}
              onChange={(v) => set('email', v)}
              autoComplete="email"
            />
          </div>

          <div className="mt-5">
            <label htmlFor="occasion" className="etiqueta">
              Ocasión <span className="font-normal normal-case tracking-normal text-carbon/55">(opcional)</span>
            </label>
            <select
              id="occasion"
              value={borrador.occasion}
              onChange={(e) => set('occasion', e.target.value)}
              className="campo"
            >
              <option value="">Sin especificar</option>
              {OCASIONES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <label htmlFor="special_requests" className="etiqueta">
              Peticiones especiales{' '}
              <span className="font-normal normal-case tracking-normal text-carbon/55">(opcional)</span>
            </label>
            <textarea
              id="special_requests"
              rows={3}
              maxLength={300}
              value={borrador.special_requests}
              onChange={(e) => set('special_requests', e.target.value)}
              placeholder="Mesa en la terraza, silla para bebé, celebración sorpresa…"
              className="campo resize-y"
            />
            <p className="mt-1 text-right text-sm text-carbon/55">
              {borrador.special_requests.length}/300
            </p>
          </div>

          {/* PRD §47: consentimientos separados, ninguno premarcado. */}
          <div className="mt-7 space-y-4 border-t border-borde pt-6">
            <Casilla
              id="privacy_accepted"
              marcada={borrador.privacy_accepted}
              onChange={(v) => set('privacy_accepted', v)}
              error={errores.privacy_accepted}
            >
              Acepto el{' '}
              <Link
                href="/privacidad"
                target="_blank"
                className="underline decoration-mojito underline-offset-4"
              >
                aviso de privacidad
              </Link>
              . <span className="text-red-700">*</span>
            </Casilla>

            <Casilla
              id="marketing_consent"
              marcada={borrador.marketing_consent}
              onChange={(v) => set('marketing_consent', v)}
            >
              Quiero recibir promociones y novedades de Terraza Mojito.
            </Casilla>
          </div>
        </section>
      )}

      {/* ---------- Paso 5: resumen ---------- */}
      {paso === 4 && (
        <section aria-labelledby="t-resumen">
          <h2 id="t-resumen" className="display mb-2 text-3xl">
            Revisa antes de enviar
          </h2>
          <p className="mb-8 text-carbon/75">
            Esto es una solicitud. Te confirmamos la mesa por WhatsApp o correo.
          </p>

          <dl className="tarjeta divide-y divide-borde">
            <Fila termino="Fecha" valor={fechaLegible(borrador.reservation_date!)} alPaso={0} ir={setPaso} />
            <Fila termino="Hora" valor={formatoAmPm(borrador.reservation_time!)} alPaso={1} ir={setPaso} />
            <Fila
              termino="Personas"
              valor={`${borrador.party_size} ${borrador.party_size === 1 ? 'persona' : 'personas'}`}
              alPaso={2}
              ir={setPaso}
            />
            <Fila
              termino="Nombre"
              valor={`${borrador.first_name} ${borrador.last_name}`}
              alPaso={3}
              ir={setPaso}
            />
            <Fila termino="Teléfono" valor={borrador.phone} alPaso={3} ir={setPaso} />
            <Fila termino="Correo" valor={borrador.email} alPaso={3} ir={setPaso} />
            {borrador.occasion && (
              <Fila termino="Ocasión" valor={borrador.occasion} alPaso={3} ir={setPaso} />
            )}
            {borrador.special_requests && (
              <Fila
                termino="Peticiones"
                valor={borrador.special_requests}
                alPaso={3}
                ir={setPaso}
              />
            )}
          </dl>
        </section>
      )}

      {/* ---------- Navegación ---------- */}
      <div className="mt-10 flex items-center justify-between gap-3">
        {paso > 0 ? (
          <button type="button" onClick={() => setPaso((p) => p - 1)} className="btn-secundario">
            <ArrowLeft aria-hidden size={18} />
            Atrás
          </button>
        ) : (
          <Link href="/" className="btn-secundario">
            <ArrowLeft aria-hidden size={18} />
            Salir
          </Link>
        )}

        {paso < PASOS.length - 1 ? (
          <button
            type="button"
            onClick={() => setPaso((p) => p + 1)}
            disabled={!puedeAvanzar}
            className="btn-primario"
          >
            Continuar
            <ArrowRight aria-hidden size={18} />
          </button>
        ) : (
          <button type="button" onClick={enviar} disabled={enviando} className="btn-primario">
            {enviando ? 'Enviando…' : 'Enviar solicitud'}
            {!enviando && <Check aria-hidden size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Campo({
  id,
  etiqueta,
  valor,
  onChange,
  error,
  tipo = 'text',
  ayuda,
  inputMode,
  autoComplete,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  error?: string;
  tipo?: string;
  ayuda?: string;
  inputMode?: 'numeric' | 'text' | 'tel' | 'email';
  autoComplete?: string;
}) {
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const descrito = [idAyuda, idError].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="etiqueta">
        {etiqueta}
      </label>
      <input
        id={id}
        type={tipo}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={descrito}
        className="campo"
      />
      {ayuda && !error && (
        <p id={idAyuda} className="mt-1 text-sm text-carbon/55">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function Casilla({
  id,
  marcada,
  onChange,
  error,
  children,
}: {
  id: string;
  marcada: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex gap-3">
        <input
          id={id}
          type="checkbox"
          checked={marcada}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-1 h-5 w-5 shrink-0 accent-hoja"
        />
        <label htmlFor={id} className="text-[15px] leading-relaxed text-carbon/90">
          {children}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="ml-8 mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function Fila({
  termino,
  valor,
  alPaso,
  ir,
}: {
  termino: string;
  valor: string;
  alPaso: number;
  ir: (p: number) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4">
      <dt className="dato shrink-0 text-sm uppercase text-carbon/60">{termino}</dt>
      <dd className="flex min-w-0 items-start gap-3 text-right">
        <span className="min-w-0 break-words font-semibold text-noche first-letter:uppercase">{valor}</span>
        <button
          type="button"
          onClick={() => ir(alPaso)}
          className="shrink-0 text-sm underline decoration-mojito underline-offset-4 hover:text-hoja"
        >
          Cambiar
          <span className="sr-only"> {termino.toLowerCase()}</span>
        </button>
      </dd>
    </div>
  );
}
