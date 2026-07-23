import { DSLEvaluator } from '../dist/core/index.js';

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const evaluator = new DSLEvaluator();
      const result = await evaluator.evaluate('<Model><Box width={1} height={1} depth={1} /></Model>');
      return new Response(JSON.stringify({ ok: true, featureCount: result.features.length, hasMesh: !!result.mesh }));
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e.message, code: e.code, stack: e.stack?.substring(0, 1000) }), { status: 500 });
    }
  },
};
