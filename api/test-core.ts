export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const tsMorph = await import('ts-morph');
      return new Response(JSON.stringify({ ok: true, hasModule: !!tsMorph.Project }));
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e.message, code: e.code }), { status: 500 });
    }
  },
};
