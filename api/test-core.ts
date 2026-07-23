export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const { DSLEvaluator } = await import('../src/core/index.ts');
      return new Response(JSON.stringify({ ok: true, hasDSLEvaluator: !!DSLEvaluator }));
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e.message, stack: e.stack }), { status: 500 });
    }
  },
};
