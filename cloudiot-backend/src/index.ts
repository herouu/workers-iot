/**
 * WorkersIoT - Cloudflare Workers 入口文件
 * 使用 Hono 框架 + Swagger 文档
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { swaggerUI } from '@hono/swagger-ui'

// 导入路由
import { authRoutes } from './routes/auth'
import { devicesRoutes } from './routes/devices'
import { scenesRoutes } from './routes/scenes'
import { dataRoutes } from './routes/data'
import { realtimeRoutes } from './routes/realtime'

// 导入 Durable Objects
import { DeviceSession } from './durableObjects/DeviceSession'
import { SceneExecutor } from './durableObjects/SceneExecutor'
import { NotificationHub } from './durableObjects/NotificationHub'
import { RealtimeHub } from './durableObjects/RealtimeHub'

// 导出 Durable Objects
export { DeviceSession, SceneExecutor, NotificationHub, RealtimeHub }

// 创建 Hono 应用
const app = new Hono()

// 中间件
app.use('*', cors())

// 健康检查
app.get('/health', (c) => c.json({
  status: 'ok',
  service: 'WorkersIoT',
  timestamp: Date.now()
}))

// API 版本信息
app.get('/api/v1', (c) => c.json({
  version: '1.0.0',
  name: 'WorkersIoT API',
  endpoints: {
    auth: '/api/v1/auth',
    devices: '/api/v1/devices',
    scenes: '/api/v1/scenes',
    data: '/api/v1/data',
    realtime: '/realtime'
  },
  docs: '/docs'
}))

// Swagger UI
app.get('/docs', swaggerUI({ url: '/openapi.json' }))

// 注册路由
app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/devices', devicesRoutes)
app.route('/api/v1/scenes', scenesRoutes)
app.route('/api/v1/data', dataRoutes)
app.route('/realtime', realtimeRoutes)

// OpenAPI Schema
const openApiSchema = {
  openapi: '3.0.0',
  info: {
    title: 'WorkersIoT API',
    version: '1.0.0',
    description: 'Cloudflare Workers IoT 后端 API'
  },
  servers: [
    { url: '/', description: 'Current server' }
  ],
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Devices', description: 'Device management' },
    { name: 'Scenes', description: 'Scene automation' },
    { name: 'Data', description: 'Data and statistics' },
    { name: 'Realtime', description: 'Real-time communication' }
  ],
  paths: {
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', minLength: 6, example: 'password123' },
                  name: { type: 'string', example: 'John Doe' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'User registered successfully' },
          '400': { description: 'Invalid request' },
          '409': { description: 'User already exists' }
        }
      }
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'User login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Token refreshed' }
        }
      }
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'User logout',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Logged out' }
        }
      }
    },
    '/api/v1/devices': {
      get: {
        tags: ['Devices'],
        summary: 'List all devices',
        parameters: [
          { name: 'room', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'online', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Device list' }
        }
      },
      post: {
        tags: ['Devices'],
        summary: 'Create a new device',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type'],
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  model: { type: 'string' },
                  room: { type: 'string' },
                  icon: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Device created' }
        }
      }
    },
    '/api/v1/devices/{id}': {
      get: {
        tags: ['Devices'],
        summary: 'Get device details',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Device details' },
          '404': { description: 'Device not found' }
        }
      },
      put: {
        tags: ['Devices'],
        summary: 'Update device',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  room: { type: 'string' },
                  icon: { type: 'string' },
                  config: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Device updated' }
        }
      },
      delete: {
        tags: ['Devices'],
        summary: 'Delete device',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Device deleted' }
        }
      }
    },
    '/api/v1/devices/{id}/control': {
      post: {
        tags: ['Devices'],
        summary: 'Control device',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['command'],
                properties: {
                  command: { type: 'string', example: 'power' },
                  params: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Command sent' }
        }
      }
    },
    '/api/v1/devices/{id}/data': {
      get: {
        tags: ['Devices'],
        summary: 'Get device data history',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Device data history' }
        }
      }
    },
    '/api/v1/devices/provision': {
      post: {
        tags: ['Devices'],
        summary: 'Provision a new device',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mac_address'],
                properties: {
                  mac_address: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Device provisioned' }
        }
      }
    },
    '/api/v1/scenes': {
      get: {
        tags: ['Scenes'],
        summary: 'List all scenes',
        responses: {
          '200': { description: 'Scene list' }
        }
      },
      post: {
        tags: ['Scenes'],
        summary: 'Create a new scene',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'actions'],
                properties: {
                  name: { type: 'string' },
                  icon: { type: 'string' },
                  trigger_config: { type: 'object' },
                  actions: { type: 'array', items: { type: 'object' } },
                  enabled: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Scene created' }
        }
      }
    },
    '/api/v1/scenes/{id}': {
      get: {
        tags: ['Scenes'],
        summary: 'Get scene details',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Scene details' }
        }
      },
      put: {
        tags: ['Scenes'],
        summary: 'Update scene',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  icon: { type: 'string' },
                  enabled: { type: 'boolean' },
                  trigger_config: { type: 'object' },
                  actions: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Scene updated' }
        }
      },
      delete: {
        tags: ['Scenes'],
        summary: 'Delete scene',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Scene deleted' }
        }
      }
    },
    '/api/v1/scenes/{id}/trigger': {
      post: {
        tags: ['Scenes'],
        summary: 'Trigger/execute scene',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Scene executed' }
        }
      }
    },
    '/api/v1/data/devices/{id}': {
      get: {
        tags: ['Data'],
        summary: 'Get device history',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'start', in: 'query', schema: { type: 'string' } },
          { name: 'end', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Device history' }
        }
      }
    },
    '/api/v1/data/stats': {
      get: {
        tags: ['Data'],
        summary: 'Get statistics',
        parameters: [
          { name: 'period', in: 'query', schema: { type: 'string' }, description: 'day, week, or month' }
        ],
        responses: {
          '200': { description: 'Statistics data' }
        }
      }
    },
    '/realtime/telemetry': {
      post: {
        tags: ['Realtime'],
        summary: 'Device telemetry data upload',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['device_id', 'data'],
                properties: {
                  device_id: { type: 'string' },
                  data: { type: 'object' },
                  timestamp: { type: 'number' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Telemetry received' }
        }
      }
    },
    '/realtime/commands/{deviceId}': {
      get: {
        tags: ['Realtime'],
        summary: 'Get pending commands for device',
        parameters: [
          { name: 'deviceId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'since', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Pending commands' }
        }
      },
      post: {
        tags: ['Realtime'],
        summary: 'Send command to device',
        parameters: [
          { name: 'deviceId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['command'],
                properties: {
                  command: { type: 'string' },
                  params: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Command sent' }
        }
      }
    }
  }
}

app.get('/openapi.json', (c) => c.json(openApiSchema))

// 导出
export default app
