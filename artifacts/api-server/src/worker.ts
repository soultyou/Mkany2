import serverless from "serverless-http";
import app from "./app.js";

const handler = serverless(app, {
  binary: true,
});

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    if (env) {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string" && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }

    const url = new URL(request.url);

    // Route /api/* requests through Express / serverless-http
    if (url.pathname.startsWith("/api")) {
      return handler(request, ctx) as unknown as Promise<Response>;
    }

    // Serve static assets or SPA fallback via Cloudflare ASSETS binding
    if (env && env.ASSETS) {
      try {
        const response = await env.ASSETS.fetch(request);
        if (response.status === 404) {
          const indexRequest = new Request(new URL("/", request.url), request);
          return await env.ASSETS.fetch(indexRequest);
        }
        return response;
      } catch (e) {
        const indexRequest = new Request(new URL("/", request.url), request);
        return await env.ASSETS.fetch(indexRequest);
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
