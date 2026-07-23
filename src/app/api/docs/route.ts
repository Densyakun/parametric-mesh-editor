import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'Parametric Mesh Editor API',
    version: '0.1.0',
    endpoints: {
      health: { method: 'GET', auth: false },
      docs: { method: 'GET', auth: false },
      features: { method: 'GET', auth: true },
      evaluate: { method: 'POST', auth: true, body: '{ dsl: string }' },
      validate: { method: 'POST', auth: true, body: '{ dsl: string }' },
    },
    authentication: 'Bearer token via Authorization header',
  });
}
