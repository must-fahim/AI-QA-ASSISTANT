export interface DbError {
  message: string;
  code?: string;
}

export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

export interface QueryBuilder extends PromiseLike<DbResult<unknown[]>> {
  insert(values: unknown): QueryBuilder;
  update(values: Record<string, unknown>): QueryBuilder;
  delete(): QueryBuilder;
  select(columns?: string): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder;
  limit(count: number): QueryBuilder;
  single(): Promise<DbResult<unknown>>;
  maybeSingle(): Promise<DbResult<unknown>>;
}

export interface DbClient {
  from(table: string): QueryBuilder;
}
