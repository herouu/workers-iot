/**
 * 响应工具函数
 */

export function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}

export function jsonError(message: string, status: number = 400): Response {
  return jsonResponse({ error: message }, status)
}

export function notFound(message: string = 'Not found'): Response {
  return jsonError(message, 404)
}

export function success(data: any = { success: true }): Response {
  return jsonResponse(data)
}

export function created(data: any): Response {
  return jsonResponse(data, 201)
}

export function unauthorized(message: string = 'Unauthorized'): Response {
  return jsonError(message, 401)
}

export function forbidden(message: string = 'Forbidden'): Response {
  return jsonError(message, 403)
}
