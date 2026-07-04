type OrderConfig = {
  field: string;
  ascending: boolean;
};

type SeedTables = Record<string, Array<Record<string, unknown>>>;

class FakeQueryBuilder {
  private readonly tableName: string;
  private readonly tables: SeedTables;
  private action: 'select' | 'insert' = 'select';
  private insertPayload: Array<Record<string, unknown>> = [];
  private filters: Array<{ field: string; value: unknown }> = [];
  private orderConfig: OrderConfig | null = null;
  private rowLimit: number | null = null;

  constructor(tableName: string, tables: SeedTables) {
    this.tableName = tableName;
    this.tables = tables;
  }

  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.action = 'insert';
    this.insertPayload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  select(_fields?: string) {
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ field, value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderConfig = {
      field,
      ascending: options?.ascending ?? true,
    };
    return this;
  }

  limit(value: number) {
    this.rowLimit = value;
    return this;
  }

  async single<T>() {
    const rows = this.execute();
    return {
      data: (rows[0] ?? null) as T,
      error: null,
    };
  }

  async maybeSingle<T>() {
    const rows = this.execute();
    return {
      data: (rows[0] ?? null) as T | null,
      error: null,
    };
  }

  async returns<T>() {
    const rows = this.execute();
    return {
      data: rows as T,
      error: null,
    };
  }

  private execute() {
    const table = this.tables[this.tableName] ?? (this.tables[this.tableName] = []);

    if (this.action === 'insert') {
      const rows = this.insertPayload.map((row) => ({
        created_at:
          typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
        ...row,
      }));
      table.push(...rows);
      return rows;
    }

    let rows = [...table];

    for (const filter of this.filters) {
      rows = rows.filter((row) => row[filter.field] === filter.value);
    }

    if (this.orderConfig) {
      const { field, ascending } = this.orderConfig;
      rows.sort((left, right) => {
        const leftValue = left[field];
        const rightValue = right[field];

        if (leftValue === rightValue) {
          return 0;
        }

        if (leftValue == null) {
          return ascending ? -1 : 1;
        }

        if (rightValue == null) {
          return ascending ? 1 : -1;
        }

        return (leftValue > rightValue ? 1 : -1) * (ascending ? 1 : -1);
      });
    }

    if (typeof this.rowLimit === 'number') {
      rows = rows.slice(0, this.rowLimit);
    }

    return rows;
  }
}

class FakeStorageBucket {
  private readonly bucketName: string;
  readonly uploads: Array<{
    bucket: string;
    path: string;
    contentType: string;
    size: number;
  }>;

  constructor(
    bucketName: string,
    uploads: Array<{
      bucket: string;
      path: string;
      contentType: string;
      size: number;
    }>,
  ) {
    this.bucketName = bucketName;
    this.uploads = uploads;
  }

  async upload(path: string, buffer: Buffer, options: { contentType: string }) {
    this.uploads.push({
      bucket: this.bucketName,
      path,
      contentType: options.contentType,
      size: buffer.length,
    });

    return { error: null };
  }

  async createSignedUrl(path: string, _expiresIn: number) {
    return {
      data: {
        signedUrl: `https://signed.example/${this.bucketName}/${encodeURIComponent(path)}`,
      },
      error: null,
    };
  }
}

export class FakeSupabaseClient {
  readonly tables: SeedTables;
  readonly uploads: Array<{
    bucket: string;
    path: string;
    contentType: string;
    size: number;
  }> = [];

  constructor(seedTables: SeedTables = {}) {
    this.tables = Object.fromEntries(
      Object.entries(seedTables).map(([table, rows]) => [table, [...rows]]),
    );
  }

  from(tableName: string) {
    return new FakeQueryBuilder(tableName, this.tables);
  }

  storage = {
    from: (bucketName: string) => new FakeStorageBucket(bucketName, this.uploads),
  };
}

export function createFakeSupabase(seedTables: SeedTables = {}) {
  return new FakeSupabaseClient(seedTables);
}
