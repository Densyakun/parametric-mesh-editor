import { computeBoundingBox } from '../src/core/mesh';

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const positions = new Float32Array([0,0,0, 1,1,1]);
      const bb = computeBoundingBox(positions);
      return new Response(JSON.stringify({ ok: true, bb }));
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e.message, code: e.code, stack: e.stack?.substring(0, 1000) }), { status: 500 });
    }
  },
};
