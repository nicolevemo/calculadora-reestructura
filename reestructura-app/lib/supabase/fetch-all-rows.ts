/**
 * Trae TODAS las filas de una query paginando con `.range()`.
 *
 * Supabase/PostgREST devuelve como máximo 1000 filas por request (límite
 * `max-rows`). Para listas grandes (p. ej. el dashboard de clientes) hay que
 * pedir bloques sucesivos hasta agotar los resultados.
 *
 * `buildQuery(from, to)` debe construir una query NUEVA en cada iteración
 * (los query builders de Supabase se consumen al ejecutarse) y aplicarle
 * `.range(from, to)`.
 */
const PAGE_SIZE = 1000;

type RangeResult<T> = PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>;

export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => RangeResult<T>,
): Promise<{ data: T[]; error: string | null }> {
  const all: T[] = [];
  let from = 0;

  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);

    if (error) {
      return { data: all, error: error.message };
    }

    const batch = data ?? [];
    all.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { data: all, error: null };
}
