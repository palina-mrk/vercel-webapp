import type {
  ListResult,
  Organization,
  Paybox,
  PriceType,
  Warehouse,
} from "./crm-types";

const JSON_HDR = { "Content-Type": "application/json" };

export async function crmGet<T>(
  token: string,
  resourcePath: string,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const qs = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
  }
  const q = qs.toString();
  const url = `/api/crm/${resourcePath}${q ? `?${q}` : ""}`;
  const res = await fetch(url, {
    headers: { "x-tablecrm-token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function crmPost<TBody, TRes>(
  token: string,
  resourcePath: string,
  body: TBody,
  query?: Record<string, string | boolean | undefined>,
): Promise<TRes> {
  const qs = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
  }
  const q = qs.toString();
  const url = `/api/crm/${resourcePath}${q ? `?${q}` : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...JSON_HDR, "x-tablecrm-token": token },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || res.statusText);
  }
  return (text ? JSON.parse(text) : null) as TRes;
}

export async function crmPatch<TBody, TRes>(
  token: string,
  resourcePath: string,
  body: TBody,
  query?: Record<string, string | undefined>,
): Promise<TRes> {
  const qs = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
  }
  const q = qs.toString();
  const url = `/api/crm/${resourcePath}${q ? `?${q}` : ""}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...JSON_HDR, "x-tablecrm-token": token },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || res.statusText);
  }
  return (text ? JSON.parse(text) : null) as TRes;
}

export async function loadMetaLists(token: string, limit = 500) {
  const [organizations, payboxes, warehouses, priceTypes] = await Promise.all([
    crmGet<ListResult<Organization>>(token, "organizations", { limit }),
    crmGet<ListResult<Paybox>>(token, "payboxes", { limit }),
    crmGet<ListResult<Warehouse>>(token, "warehouses", { limit }),
    crmGet<ListResult<PriceType>>(token, "price_types", { limit }),
  ]);
  return { organizations, payboxes, warehouses, priceTypes };
}
