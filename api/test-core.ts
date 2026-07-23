export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const core = await import('tsx-safe-eval');
      const { DSLEvaluator } = await import('../src/core/index.ts');
      const evaluator = new DSLEvaluator();
      const result = await evaluator.evaluate('<Model><Box width={1} height={1} depth={1} /></Model>');
      return new Response(JSON.stringify({ ok: true, featureCount: result.features.length, hasMesh: !!result.mesh }));
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e.message, code: e.code, stack: e.stack?.substring(0, 500) }), { status: 500 });
    }
  },
};
