export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const mod = await import('../../src/core/index.ts');
      return new Response(JSON.stringify({ ok: true, keys: Object.keys(mod) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e.message, stack: e.stack }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
