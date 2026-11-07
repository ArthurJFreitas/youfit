/** Never write reservation counters from a stale admin form. PostgreSQL owns them. */
export function editableFields(row: Record<string, unknown>): Record<string, unknown> {
  const {id,created_at,updated_at,reserved_quantity,...fields}=row;
  return fields;
}
