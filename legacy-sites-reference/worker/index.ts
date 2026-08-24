/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  TENNIS_GROWTH_GOOGLE_CLIENT_ID?: string;
  TENNIS_GROWTH_GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_GMAIL_CLIENT_ID?: string;
  GOOGLE_GMAIL_CLIENT_SECRET?: string;
  GMAIL_TOKEN_KEY?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    globalThis.__SUPREME_TENNIS_DB = env.DB;
    globalThis.__SUPREME_TENNIS_ENV = {
      TENNIS_GROWTH_GOOGLE_CLIENT_ID: env.TENNIS_GROWTH_GOOGLE_CLIENT_ID,
      TENNIS_GROWTH_GOOGLE_CLIENT_SECRET: env.TENNIS_GROWTH_GOOGLE_CLIENT_SECRET,
      GOOGLE_GMAIL_CLIENT_ID: env.GOOGLE_GMAIL_CLIENT_ID,
      GOOGLE_GMAIL_CLIENT_SECRET: env.GOOGLE_GMAIL_CLIENT_SECRET,
      GMAIL_TOKEN_KEY: env.GMAIL_TOKEN_KEY,
    };
    const url = new URL(request.url);

    const isPublicAsset = url.pathname.startsWith("/_vinext/") || url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith("/_next/") || ["/favicon.svg","/tennis-growth-social.png","/signin-with-chatgpt","/signout-with-chatgpt","/callback"].includes(url.pathname);
    if (!isPublicAsset) {
      const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
      if (!email) {
        const returnTo = `${url.pathname}${url.search}`;
        return Response.redirect(new URL(`/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`, url.origin), 302);
      }
      try {
        const member = await env.DB.prepare("SELECT id FROM tenant_memberships WHERE lower(user_email) = ? AND status = 'Active' LIMIT 1").bind(email).first();
        if (!member) return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Access not authorised</title><style>body{margin:0;background:#f5f7fb;color:#111827;font:16px/1.6 system-ui,sans-serif}.card{max-width:620px;margin:10vh auto;padding:36px;border:1px solid #dbe3ea;border-radius:20px;background:#fff;box-shadow:0 18px 55px rgba(15,23,42,.12)}.mark{display:grid;place-items:center;width:52px;height:52px;border-radius:15px;background:#e7f04d;color:#0f172a;font-weight:900}h1{font-size:30px;margin:22px 0 10px}p{color:#475569}a{display:inline-flex;margin-top:14px;padding:12px 18px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;font-weight:800}</style></head><body><main class="card"><span class="mark">TG</span><h1>This account is not authorised</h1><p>You signed in as <strong>${email.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}</strong>. Ask Rob to add this exact email address, or sign out and use an authorised account.</p><a href="/signout-with-chatgpt?return_to=/">Use a different account</a></main></body></html>`,{status:403,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
      } catch {
        return new Response("Secure access could not be checked. Please try again.",{status:503,headers:{"cache-control":"no-store"}});
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
