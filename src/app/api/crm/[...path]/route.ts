import { NextRequest, NextResponse } from "next/server";

const UPSTREAM = "https://app.tablecrm.com/api/v1";

function normalizeApiPath(segments: string[]): string {
  if (segments.length === 0) return "";
  if (segments.length === 1) {
    const s = segments[0];
    return s.endsWith("/") ? s : `${s}/`;
  }
  return segments.join("/");
}

async function proxy(
  request: NextRequest,
  segments: string[],
  method: string,
) {
  const token = request.headers.get("x-tablecrm-token")?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "Не передан токен (заголовок x-tablecrm-token)" },
      { status: 401 },
    );
  }

  const rel = normalizeApiPath(segments);
  if (!rel) {
    return NextResponse.json({ error: "Пустой путь" }, { status: 400 });
  }

  const upstreamQs = new URLSearchParams(request.nextUrl.searchParams);
  upstreamQs.set("token", token);
  const url = `${UPSTREAM}/${rel}?${upstreamQs.toString()}`;

  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.text() : undefined;

  const upstream = await fetch(url, {
    method,
    headers: {
      ...(hasBody
        ? {
            "Content-Type":
              request.headers.get("content-type") || "application/json",
          }
        : {}),
    },
    body: body && body.length > 0 ? body : undefined,
    cache: "no-store",
  });

  const ct =
    upstream.headers.get("content-type") || "application/json; charset=utf-8";
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": ct },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(request, path, "GET");
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(request, path, "POST");
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(request, path, "PATCH");
}
