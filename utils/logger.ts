export const logger = {
  info(message: string): void {
    console.log(`[INFO] ${message}`);
  },
  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  },
  /** Renders rows as a formatted table (via console.table) for compact, readable comparisons. */
  table(rows: Record<string, unknown>[]): void {
    console.table(rows);
  },
};
