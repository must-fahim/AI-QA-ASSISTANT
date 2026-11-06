import type { DbClient, DbResult, QueryBuilder } from "@/repositories/db";

export function createMemoryClient(): DbClient {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    test_suites: [],
    test_cases: [],
  };
  let clock = 0;

  return {
    from(table: string) {
      return new MemoryQuery(tables, table, () => {
        clock += 1;
        return new Date(Date.UTC(2026, 0, 1, 0, 0, clock)).toISOString();
      });
    },
  };
}

class MemoryQuery implements QueryBuilder {
  private action: "select" | "insert" | "update" | "delete" = "select";
  private payload: unknown;
  private filters: Array<(row: Record<string, unknown>) => boolean> = [];
  private sortField: string | null = null;
  private sortAscending = true;
  private maxRows: number | null = null;

  constructor(
    private readonly tables: Record<string, Array<Record<string, unknown>>>,
    private readonly table: string,
    private readonly now: () => string,
  ) {}

  insert(values: unknown) {
    this.action = "insert";
    this.payload = values;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.action = "update";
    this.payload = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sortField = column;
    this.sortAscending = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.maxRows = count;
    return this;
  }

  single() {
    return this.execute("single");
  }

  maybeSingle() {
    return this.execute("maybe");
  }

  then<TResult1 = DbResult<unknown[]>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<unknown[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute("many").then(
      (value) => (onfulfilled ? onfulfilled(value as DbResult<unknown[]>) : (value as TResult1)),
      onrejected,
    );
  }

  private async execute(mode: "many" | "single" | "maybe"): Promise<DbResult<unknown>> {
    const table = this.tables[this.table] ?? [];
    this.tables[this.table] = table;

    if (this.action === "insert") {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted: Array<Record<string, unknown>> = rows.map((row) => ({
        id: crypto.randomUUID(),
        created_at: this.now(),
        updated_at: this.now(),
        ...(row as Record<string, unknown>),
      }));

      if (this.table === "test_cases") {
        const seen = new Set(table.map((existing) => `${String(existing.suite_id)}:${String(existing.test_case_id)}`));
        for (const row of inserted) {
          const key = `${String(row.suite_id)}:${String(row.test_case_id)}`;
          if (seen.has(key)) return { data: null, error: { message: "duplicate", code: "23505" } };
          seen.add(key);
        }
      }

      table.push(...inserted);
      return { data: mode === "single" ? inserted[0] : inserted, error: null };
    }

    let matched = table.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.action === "delete") {
      const ids = new Set(matched.map((row) => row.id));
      this.tables[this.table] = table.filter((row) => !ids.has(row.id));
      return { data: null, error: null };
    }

    if (this.action === "update") {
      const patch = this.payload as Record<string, unknown>;
      for (const row of matched) Object.assign(row, patch, { updated_at: this.now() });
    }

    if (this.sortField) {
      const field = this.sortField;
      matched = [...matched].sort((left, right) => {
        const result = String(left[field] ?? "").localeCompare(String(right[field] ?? ""));
        return this.sortAscending ? result : -result;
      });
    }
    if (this.maxRows != null) matched = matched.slice(0, this.maxRows);

    if (mode === "single") {
      return matched[0]
        ? { data: matched[0], error: null }
        : { data: null, error: { message: "not found", code: "PGRST116" } };
    }
    if (mode === "maybe") return { data: matched[0] ?? null, error: null };
    return { data: matched, error: null };
  }
}
