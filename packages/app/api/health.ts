import { jsonResponse, corsResponse } from './lib/utils';

export default {
  fetch(request: Request): Response {
    if (request.method === 'OPTIONS') {
      return corsResponse();
    }

    return jsonResponse(200, {
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  },
};
