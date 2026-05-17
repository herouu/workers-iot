const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  params?: Record<string, string>
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

const getAccessToken = () => {
  return localStorage.getItem('accessToken')
}

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    })

    if (!response.ok) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      return null
    }

    const data = await response.json()
    localStorage.setItem('accessToken', data.accessToken)
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken)
    }
    return data.accessToken
  } catch {
    return null
  }
}

export const request = async <T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<T> => {
  const {
    method = 'GET',
    headers = {},
    body,
    params
  } = options

  // 构建 URL
  let fullUrl = `${API_BASE_URL}${url}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    fullUrl += `?${searchParams.toString()}`
  }

  // 设置 headers
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  }

  // 添加 token
  const token = getAccessToken()
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  // 发送请求
  const makeRequest = async (token?: string | null) => {
    const requestHeaders = token
      ? { ...defaultHeaders, 'Authorization': `Bearer ${token}` }
      : defaultHeaders

    const response = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined
    })

    // 处理 401 未授权
    if (response.status === 401 && !options.headers?.['Authorization']) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        return makeRequest(newToken)
      }
    }

    // 解析响应
    const contentType = response.headers.get('content-type')
    let data: any
    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    // 处理错误
    if (!response.ok) {
      const message = data?.message || data?.error || `请求失败 (${response.status})`
      throw new HttpError(response.status, message, data)
    }

    return data as T
  }

  return makeRequest()
}

export { HttpError }
