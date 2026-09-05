export type DataEntity =
  | "sales"
  | "purchases"
  | "returns"
  | "customers"
  | "suppliers"
  | "products"
  | "inventory"
  | "warehouses"
  | "machines"
  | "engineers"
  | "service-requests"
  | "contracts"
  | "settlements"
  | "expenses"
  | "notifications"
  | "companies"
  | "investors"
  | "users"
  | "trade-ins"
  | "workshop"
  | "payments";

const EVENT_NAME = "erp:data-changed";

/**
 * Broadcast that data changed for the given entities. Any open page that
 * subscribed to those entities (via useAutoRefresh) will refetch itself.
 * Events are same-tab only; cross-tab freshness is handled by the
 * tab-focus refetch in useAutoRefresh.
 */
export function notifyDataChanged(entities: DataEntity | DataEntity[]): void {
  const list = (Array.isArray(entities) ? entities : [entities]) as DataEntity[];
  if (list.length === 0) return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { entities: list } }));
}

export function subscribeDataChanged(
  handler: (entities: DataEntity[]) => void
): () => void {
  const listener = (ev: Event) => {
    const detail = (ev as CustomEvent<{ entities?: DataEntity[] }>).detail;
    if (!detail?.entities?.length) return;
    handler(detail.entities);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}