export type ListResult<T> = { result: T[]; count: number };

export type Organization = {
  id: number;
  short_name?: string | null;
  full_name?: string | null;
  work_name?: string | null;
};

export type Paybox = {
  id: number;
  name: string;
  organization_id?: number | null;
};

export type Warehouse = {
  id: number;
  name: string;
  description?: string | null;
};

export type PriceType = {
  id: number;
  name: string;
};

export type Contragent = {
  id: number;
  name?: string | null;
  phone?: string | null;
  contragent_type?: string | null;
};

export type Nomenclature = {
  id: number;
  name: string;
  unit_name?: string | null;
  code?: string | null;
};

export type CartLine = {
  key: string;
  nomenclatureId: number;
  name: string;
  unitLabel?: string | null;
  quantity: number;
  price: number;
};
