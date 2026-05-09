"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CircleCheckIcon,
  Loader2Icon,
  MinusIcon,
  PackagePlusIcon,
  PhoneIcon,
  PlugZapIcon,
  PlusIcon,
  SearchIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { crmGet, crmPost, loadMetaLists } from "@/lib/crm-fetch";
import type {
  CartLine,
  Contragent,
  ListResult,
  Nomenclature,
  Organization,
  Paybox,
  PriceType,
  Warehouse,
} from "@/lib/crm-types";
import { cn } from "@/lib/utils";

function orgLabel(o: Organization) {
  return (
    o.short_name ||
    o.work_name ||
    o.full_name ||
    `Организация №${o.id}`
  );
}

let lineId = 0;
function nextLineKey() {
  lineId += 1;
  return `l-${lineId}`;
}

type SaleCreate = {
  organization: number;
  paybox?: number;
  warehouse?: number;
  contragent?: number;
  comment?: string;
  status?: boolean;
  goods?: Array<{
    nomenclature: number;
    quantity: number;
    price: number;
    price_type?: number;
  }>;
};

export function MobileOrderForm() {
  const skipNextClientAutoSearchRef = useRef(false);
  const [tokenInput, setTokenInput] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [payboxes, setPayboxes] = useState<Paybox[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);

  const [orgId, setOrgId] = useState<string>("");
  const [payboxId, setPayboxId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [priceTypeId, setPriceTypeId] = useState<string>("");

  const [phone, setPhone] = useState("");
  const [contragents, setContragents] = useState<Contragent[]>([]);
  const [contragentId, setContragentId] = useState<string>("");

  const [nomQuery, setNomQuery] = useState("");
  const [nomResults, setNomResults] = useState<Nomenclature[]>([]);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [comment, setComment] = useState("");

  const [loadingMeta, setLoadingMeta] = useState(false);
  const [searchingClients, setSearchingClients] = useState(false);
  const [searchingNom, setSearchingNom] = useState(false);
  const [submitting, setSubmitting] = useState<null | "draft" | "post">(null);

  const connected = Boolean(token);

  const connect = async () => {
    const t = tokenInput.trim();
    if (!t) {
      toast.error("Введите токен кассы");
      return;
    }
    setLoadingMeta(true);
    try {
      const { organizations, payboxes, warehouses, priceTypes } =
        await loadMetaLists(t);
      setToken(t);
      setOrgs(organizations.result);
      setPayboxes(payboxes.result);
      setWarehouses(warehouses.result);
      setPriceTypes(priceTypes.result);
      setOrgId("");
      setPayboxId("");
      setWarehouseId("");
      setPriceTypeId("");
      setContragentId("");
      setContragents([]);
      setCart([]);
    } catch (e) {
      setToken(null);
      toast.error("Не удалось загрузить данные", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setLoadingMeta(false);
    }
  };

  const searchClients = async (showMessages = true) => {
    if (!token) return;
    const p = phone.trim();
    setSearchingClients(true);
    try {
      const data = await crmGet<ListResult<Contragent>>(token, "contragents", p
        ? {
            phone: p,
            limit: 50,
          }
        : {
            limit: 100,
          });
      setContragents(data.result);
      if (data.result.length === 0) {
        if (showMessages) toast.message("Клиенты не найдены");
        setContragentId("");
      } else if (data.result.length === 1) {
        setContragentId(String(data.result[0].id));
      } else if (!p) {
        if (showMessages) toast.message("Показаны все клиенты");
      }
    } catch (e) {
      if (showMessages) {
        toast.error("Ошибка поиска клиентов", {
          description: e instanceof Error ? e.message : String(e),
        });
      }
    } finally {
      setSearchingClients(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (skipNextClientAutoSearchRef.current) {
      skipNextClientAutoSearchRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void searchClients(false);
    }, 350);
    return () => {
      window.clearTimeout(timer);
    };
  }, [token, phone]);

  const searchNom = async () => {
    if (!token) return;
    const q = nomQuery.trim();
    setSearchingNom(true);
    try {
      const data = await crmGet<ListResult<Nomenclature>>(token, "nomenclature", q
        ? {
            name: q,
            limit: 100,
          }
        : {
            limit: 100,
          });
      setNomResults(data.result);
      if (data.result.length === 0) {
        toast.message("Товары не найдены");
      } else if (!q) {
        toast.message("Показаны все товары");
      }
    } catch (e) {
      toast.error("Ошибка поиска товаров", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSearchingNom(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (nomQuery.trim().length > 0) return;
    if (nomResults.length > 0) return;

    let cancelled = false;

    const loadAllNomenclature = async () => {
      try {
        const data = await crmGet<ListResult<Nomenclature>>(token, "nomenclature", {
          limit: 100,
        });
        if (!cancelled) {
          setNomResults(data.result);
        }
      } catch {
        // Silent preload fail; manual search is still available.
      }
    };

    void loadAllNomenclature();

    return () => {
      cancelled = true;
    };
  }, [token, nomQuery, nomResults.length]);

  const addToCart = useCallback((n: Nomenclature) => {
    setCart((prev) => {
      const hit = prev.find((l) => l.nomenclatureId === n.id);
      if (hit) {
        return prev.map((l) =>
          l.nomenclatureId === n.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [
        ...prev,
        {
          key: nextLineKey(),
          nomenclatureId: n.id,
          name: n.name,
          unitLabel: n.unit_name,
          quantity: 1,
          price: 0,
        },
      ];
    });
  }, []);

  const updateLine = (key: string, patch: Partial<CartLine>) => {
    setCart((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  };

  const removeLine = (key: string) => {
    setCart((prev) => prev.filter((l) => l.key !== key));
  };

  const totalSum = useMemo(
    () =>
      cart.reduce((acc, l) => acc + l.quantity * (Number(l.price) || 0), 0),
    [cart],
  );
  const selectedContragent = contragents.find(
    (c) => String(c.id) === contragentId,
  );
  const selectedOrg = orgs.find((o) => String(o.id) === orgId);
  const selectedPaybox = payboxes.find((p) => String(p.id) === payboxId);
  const selectedWarehouse = warehouses.find(
    (w) => String(w.id) === warehouseId,
  );
  const selectedPriceType = priceTypes.find(
    (pt) => String(pt.id) === priceTypeId,
  );

  const buildSale = (conduct: boolean): SaleCreate => {
    const oid = Number(orgId);
    if (!oid) throw new Error("Выберите организацию");

    const pt = priceTypeId ? Number(priceTypeId) : undefined;
    const goods = cart.map((l) => ({
      nomenclature: l.nomenclatureId,
      quantity: l.quantity,
      price: Number(l.price) || 0,
      ...(pt ? { price_type: pt } : {}),
    }));

    const cid = contragentId ? Number(contragentId) : undefined;

    return {
      organization: oid,
      ...(payboxId ? { paybox: Number(payboxId) } : {}),
      ...(warehouseId ? { warehouse: Number(warehouseId) } : {}),
      ...(cid ? { contragent: cid } : {}),
      ...(comment.trim() ? { comment: comment.trim() } : {}),
      status: conduct ? true : false,
      goods,
    };
  };

  const submit = async (conduct: boolean) => {
    if (!token) {
      toast.error("Сначала подключите кассу");
      return;
    }
    if (!orgId) {
      toast.error("Выберите организацию");
      return;
    }
    if (cart.length === 0) {
      toast.error("Добавьте хотя бы один товар");
      return;
    }
    const bad = cart.some((l) => (Number(l.price) || 0) <= 0);
    if (bad) {
      toast.error("Укажите цену больше нуля для всех позиций");
      return;
    }

    setSubmitting(conduct ? "post" : "draft");
    try {
      const body = [buildSale(conduct)];
      await crmPost<SaleCreate[], unknown>(token, "docs_sales", body, {
        generate_out: true,
      });
      toast.success(
        conduct ? "Продажа создана и проведена" : "Продажа создана",
      );
      setCart([]);
      setComment("");
    } catch (e) {
      toast.error("Ошибка при создании продажи", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col">
      <main className="flex-1 space-y-4 p-3 pb-44 pt-3">
        <Card size="sm">
          <CardHeader>
            <p className="text-muted-foreground select-none text-xs font-medium uppercase tracking-[0.14em]">
              tablecrm.com
            </p>
            <h1 className="font-heading text-2xl leading-snug font-bold">
              Мобильный заказ
            </h1>
            <CardDescription>
              WebApp для создания продажи и проведения в один клик
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  "select-none",
                  "!bg-[#daf0ec] !text-gray-600",
                )}
                variant="secondary"
              >
                {connected ? "Касса подключена" : "Касса не подключена"}
              </Badge>
              {connected && (
                <>
                  <span className="text-muted-foreground/80 select-none text-xs">
                    Организаций: {orgs.length}
                  </span>
                  <span className="text-muted-foreground/80 select-none text-xs">
                    Товаров: {nomResults.length}
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlugZapIcon className="size-4" />
              1. Подключение кассы
            </CardTitle>
            <CardDescription>
              Введите токен и загрузите справочники
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label className="select-none" htmlFor="token">Token</Label>
              <Input
                id="token"
                autoComplete="off"
                placeholder="Токен кассы"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={connect}
              disabled={loadingMeta}
            >
              {loadingMeta ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Загрузка…
                </>
              ) : (
                "Подключить"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card
          size="sm"
          className={cn(!connected && "pointer-events-none opacity-50")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneIcon className="size-4" />
              2. Клиент
            </CardTitle>
            <CardDescription>Поиск клиента по телефону</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <Label className="select-none" htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  placeholder="+7…"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="flex shrink-0 items-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="size-9"
                  onClick={() => void searchClients(true)}
                  disabled={searchingClients || !connected}
                  aria-label="Найти клиента"
                >
                  {searchingClients ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SearchIcon className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="select-none">Найденный клиент</Label>
              <Select
                value={contragentId}
                onValueChange={(v) => {
                  const nextId = v ?? "";
                  setContragentId(nextId);
                  const picked = contragents.find((c) => String(c.id) === nextId);
                  if (picked?.phone) {
                    skipNextClientAutoSearchRef.current = true;
                    setPhone(picked.phone);
                  }
                }}
                disabled={!connected}
              >
                <SelectTrigger className="w-full">
                  {selectedContragent ? (
                    <span className="line-clamp-1">
                      {selectedContragent.name || `№${selectedContragent.id}`}
                    </span>
                  ) : (
                    <SelectValue placeholder="Выберите клиента" />
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-56">
                    {contragents.length > 0 ? (
                      contragents.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          <span className="line-clamp-1">
                            {c.name || `№${c.id}`}{" "}
                            <span className="text-muted-foreground">
                              {c.phone}
                            </span>
                          </span>
                        </SelectItem>
                      ))
                    ) : (
                      <p className="text-muted-foreground select-none px-3 py-2 text-sm">
                        Выполните поиск по телефону
                      </p>
                    )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card
          size="sm"
          className={cn(!connected && "pointer-events-none opacity-50")}
        >
          <CardHeader>
            <CardTitle>3. Параметры продажи</CardTitle>
            <CardDescription>
              Счёт, организация, склад и тип цены
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 pt-2">
            <div className="space-y-2">
              <Label className="select-none">Организация</Label>
              <Select
                value={orgId}
                onValueChange={(v) => setOrgId(v ?? "")}
                disabled={!connected}
              >
                <SelectTrigger className="w-full">
                  {selectedOrg ? (
                    <span className="line-clamp-1">{orgLabel(selectedOrg)}</span>
                  ) : (
                    <SelectValue placeholder="Выберите организацию" />
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-56">
                    {orgs.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {orgLabel(o)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="select-none">Счёт</Label>
              <Select
                value={payboxId}
                onValueChange={(v) => setPayboxId(v ?? "")}
                disabled={!connected}
              >
                <SelectTrigger className="w-full">
                  {selectedPaybox ? (
                    <span className="line-clamp-1">{selectedPaybox.name}</span>
                  ) : (
                    <SelectValue placeholder="Выберите счёт" />
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-56">
                    {payboxes.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="select-none">Склад</Label>
              <Select
                value={warehouseId}
                onValueChange={(v) => setWarehouseId(v ?? "")}
                disabled={!connected}
              >
                <SelectTrigger className="w-full">
                  {selectedWarehouse ? (
                    <span className="line-clamp-1">{selectedWarehouse.name}</span>
                  ) : (
                    <SelectValue placeholder="Выберите склад" />
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-56">
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="select-none">Тип цены</Label>
              <Select
                value={priceTypeId}
                onValueChange={(v) => setPriceTypeId(v ?? "")}
                disabled={!connected}
              >
                <SelectTrigger className="w-full">
                  {selectedPriceType ? (
                    <span className="line-clamp-1">{selectedPriceType.name}</span>
                  ) : (
                    <SelectValue placeholder="Выберите тип цены" />
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-56">
                    {priceTypes.map((pt) => (
                      <SelectItem key={pt.id} value={String(pt.id)}>
                        {pt.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card
          size="sm"
          className={cn(!connected && "pointer-events-none opacity-50")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlusIcon className="size-4" />
              4. Товары
            </CardTitle>
            <CardDescription>Поиск и добавление номенклатуры</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <Label className="select-none" htmlFor="nom">Поиск</Label>
                <Input
                  id="nom"
                  placeholder="Название или код"
                  value={nomQuery}
                  onChange={(e) => setNomQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void searchNom();
                    }
                  }}
                />
              </div>
              <div className="flex shrink-0 items-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="size-9"
                  onClick={searchNom}
                  disabled={searchingNom || !connected}
                  aria-label="Найти товары"
                >
                  {searchingNom ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SearchIcon className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            {nomResults.length > 0 ? (
              <ScrollArea className="h-48 rounded-lg border">
                <ul className="divide-y p-1">
                  {nomResults.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-center justify-between gap-2 px-2 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate select-none text-sm font-medium">{n.name}</p>
                        <p className="text-muted-foreground select-none text-xs">
                          {n.code ? `${n.code} · ` : ""}
                          {n.unit_name || "шт."}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => addToCart(n)}
                      >
                        <PlusIcon className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground select-none text-sm">
                Товары не найдены — введите запрос и нажмите поиск
              </p>
            )}

          </CardContent>
        </Card>

        <Card
          size="sm"
          className={cn(!connected && "pointer-events-none opacity-50")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCartIcon className="size-4" />
              Корзина
            </CardTitle>
            <CardDescription>
              Количество, цена и сумма по позициям
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {cart.length === 0 ? (
              <p className="text-muted-foreground select-none text-sm">
                Добавьте хотя бы один товар
              </p>
            ) : (
              <ul className="space-y-3">
                {cart.map((line) => (
                  <li
                    key={line.key}
                    className="bg-muted/40 space-y-2 rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="select-none text-sm font-medium leading-snug">
                          {line.name}
                        </p>
                        <p className="text-muted-foreground select-none text-xs">
                          {line.unitLabel || "шт."}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() => removeLine(line.key)}
                        aria-label="Удалить"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="select-none text-xs">Кол-во</Label>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() =>
                              updateLine(line.key, {
                                quantity: Math.max(
                                  1,
                                  line.quantity - 1,
                                ),
                              })
                            }
                          >
                            <MinusIcon className="size-3.5" />
                          </Button>
                          <Input
                            className="bg-background/80 border-border/70 h-8 text-center"
                            inputMode="decimal"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.key, {
                                quantity: Math.max(
                                  0.001,
                                  Number(e.target.value) || 0,
                                ),
                              })
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() =>
                              updateLine(line.key, {
                                quantity: line.quantity + 1,
                              })
                            }
                          >
                            <PlusIcon className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="select-none text-xs">Цена</Label>
                        <Input
                          className="bg-background/80 border-border/70 h-8"
                          inputMode="decimal"
                          value={line.price}
                          onChange={(e) =>
                            updateLine(line.key, {
                              price: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <p className="text-muted-foreground select-none text-right text-xs">
                      Сумма:{" "}
                      <span className="text-foreground select-none font-medium">
                        {(line.quantity * (Number(line.price) || 0)).toFixed(2)}{" "}
                        ₽
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-2">
              <Label className="select-none" htmlFor="comment">
                Комментарий
              </Label>
              <Textarea
                id="comment"
                placeholder="Комментарий к заказу (необязательно)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-background/95 fixed inset-x-0 bottom-0 z-10 border-t p-3 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="mx-auto flex w-full max-w-[30rem] flex-col gap-2">
          <div className="text-muted-foreground border-border bg-card/50 flex items-center justify-between rounded-md border px-3 py-2 text-base">
            <span className="select-none">Итого:</span>
            <span className="text-foreground select-none text-lg font-semibold">
              {totalSum.toFixed(2)} ₽
            </span>
          </div>
          <Button
            className="w-full"
            disabled={
              !connected || submitting !== null || cart.length === 0 || !orgId
            }
            onClick={() => void submit(false)}
          >
            {submitting === "draft" ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Создание…
              </>
            ) : (
              "Создать продажу"
            )}
          </Button>
          <Button
            className="w-full border-[#98c7bf] bg-[#a9d3cb] text-gray-700 hover:bg-[#9dcac2]"
            disabled={
              !connected || submitting !== null || cart.length === 0 || !orgId
            }
            onClick={() => void submit(true)}
          >
            {submitting === "post" ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Проведение…
              </>
            ) : (
              <>
                <CircleCheckIcon className="mr-2 size-4" />
                Создать и провести
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
