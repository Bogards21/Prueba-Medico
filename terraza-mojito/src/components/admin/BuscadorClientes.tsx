'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

export function BuscadorClientes({ valorInicial }: { valorInicial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(valorInicial);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q ? `/admin/clientes?q=${encodeURIComponent(q)}` : '/admin/clientes');
      }}
      className="tarjeta flex gap-2 p-4"
    >
      <label htmlFor="buscar-cliente" className="sr-only">
        Buscar cliente por nombre, teléfono o correo
      </label>
      <input
        id="buscar-cliente"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nombre, teléfono o correo"
        className="campo"
      />
      <button type="submit" className="btn-primario shrink-0 !px-4">
        <Search aria-hidden size={18} />
        <span className="sr-only">Buscar</span>
      </button>
    </form>
  );
}
