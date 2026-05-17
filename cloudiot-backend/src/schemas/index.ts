/**
 * API Schemas for OpenAPI/Swagger Documentation
 */
import { z } from 'zod'
import { createRoute } from '@hono/zod-openapi'

// ============= Auth Schemas =============

export const RegisterSchema = createRoute({
  method: 'post',
  path: '/api/v1/auth/register',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email().openapi({ example: 'user@example.com' }),
            password: z.string().min(6).openapi({ example: 'password123' }),
            name: z.string().optional().openapi({ example: 'John Doe' }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'User registered successfully',
      content: {
        'application/json': {
          schema: z.object({
            user: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string().nullable(),
            }),
            accessToken: z.string(),
            refreshToken: z.string(),
          }),
        },
      },
    },
  },
})

export const LoginSchema = createRoute({
  method: 'post',
  path: '/api/v1/auth/login',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email().openapi({ example: 'user@example.com' }),
            password: z.string().openapi({ example: 'password123' }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: z.object({
            user: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string().nullable(),
              avatar: z.string().nullable(),
            }),
            accessToken: z.string(),
            refreshToken: z.string(),
          }),
        },
      },
    },
  },
})

export const RefreshSchema = createRoute({
  method: 'post',
  path: '/api/v1/auth/refresh',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            refreshToken: z.string().openapi({ example: 'eyJ...' }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Token refreshed',
      content: {
        'application/json': {
          schema: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
          }),
        },
      },
    },
  },
})

// ============= Device Schemas =============

export const DeviceSchema = z.object({
  id: z.string().openapi({ example: 'dev_abc123' }),
  name: z.string().openapi({ example: 'Living Room Light' }),
  type: z.string().openapi({ example: 'light' }),
  model: z.string().nullable().optional(),
  room: z.string().nullable().optional(),
  icon: z.string().optional(),
  mac_address: z.string().nullable().optional(),
  online: z.boolean().openapi({ example: true }),
  state: z.record(z.any()).optional(),
  config: z.record(z.any()).optional(),
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
})

export const CreateDeviceSchema = createRoute({
  method: 'post',
  path: '/api/v1/devices',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).openapi({ example: 'New Device' }),
            type: z.string().min(1).openapi({ example: 'light' }),
            model: z.string().optional(),
            room: z.string().optional(),
            icon: z.string().optional(),
            mac_address: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Device created',
      content: {
        'application/json': {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            online: z.boolean(),
          }),
        },
      },
    },
  },
})

export const GetDevicesSchema = createRoute({
  method: 'get',
  path: '/api/v1/devices',
  request: {
    query: z.object({
      room: z.string().optional(),
      type: z.string().optional(),
      online: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'List of devices',
      content: {
        'application/json': {
          schema: z.object({
            devices: z.array(DeviceSchema),
          }),
        },
      },
    },
  },
})

export const GetDeviceSchema = createRoute({
  method: 'get',
  path: '/api/v1/devices/{id}',
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: 'id', in: 'path' }, example: 'dev_abc123' }),
    }),
  },
  responses: {
    200: {
      description: 'Device details',
      content: {
        'application/json': {
          schema: DeviceSchema,
        },
      },
    },
  },
})

export const UpdateDeviceSchema = createRoute({
  method: 'put',
  path: '/api/v1/devices/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().optional(),
            room: z.string().optional(),
            icon: z.string().optional(),
            config: z.record(z.any()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Device updated',
    },
  },
})

export const DeleteDeviceSchema = createRoute({
  method: 'delete',
  path: '/api/v1/devices/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Device deleted',
    },
  },
})

export const ControlDeviceSchema = createRoute({
  method: 'post',
  path: '/api/v1/devices/{id}/control',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            command: z.string().openapi({ example: 'power' }),
            params: z.record(z.any()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Command sent',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            deviceId: z.string(),
            command: z.string(),
            newState: z.record(z.any()),
          }),
        },
      },
    },
  },
})

// ============= Scene Schemas =============

export const SceneSchema = z.object({
  id: z.string().openapi({ example: 'scene_abc123' }),
  name: z.string().openapi({ example: 'Morning Routine' }),
  icon: z.string().optional(),
  enabled: z.boolean().openapi({ example: true }),
  trigger_config: z.record(z.any()).optional(),
  actions: z.array(z.any()).optional(),
  last_triggered: z.number().nullable().optional(),
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
})

export const CreateSceneSchema = createRoute({
  method: 'post',
  path: '/api/v1/scenes',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).openapi({ example: 'My Scene' }),
            icon: z.string().optional(),
            trigger_config: z.record(z.any()).optional(),
            actions: z.array(z.any()).min(1).openapi({ example: [{ type: 'device', deviceId: 'dev_1', action: 'on' }] }),
            enabled: z.boolean().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Scene created',
      content: {
        'application/json': {
          schema: SceneSchema,
        },
      },
    },
  },
})

export const GetScenesSchema = createRoute({
  method: 'get',
  path: '/api/v1/scenes',
  responses: {
    200: {
      description: 'List of scenes',
      content: {
        'application/json': {
          schema: z.object({
            scenes: z.array(SceneSchema),
          }),
        },
      },
    },
  },
})

export const GetSceneSchema = createRoute({
  method: 'get',
  path: '/api/v1/scenes/{id}',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Scene details',
      content: {
        'application/json': {
          schema: SceneSchema,
        },
      },
    },
  },
})

export const TriggerSceneSchema = createRoute({
  method: 'post',
  path: '/api/v1/scenes/{id}/trigger',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Scene executed',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            sceneId: z.string(),
            executedAt: z.number(),
          }),
        },
      },
    },
  },
})

// ============= Realtime Schemas =============

export const TelemetrySchema = createRoute({
  method: 'post',
  path: '/realtime/telemetry',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            device_id: z.string().openapi({ example: 'dev_abc123' }),
            data: z.record(z.any()).openapi({ example: { temperature: 25, humidity: 60 } }),
            timestamp: z.number().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Telemetry received',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            timestamp: z.number(),
          }),
        },
      },
    },
  },
})

export const SendCommandSchema = createRoute({
  method: 'post',
  path: '/realtime/commands/{deviceId}',
  request: {
    params: z.object({
      deviceId: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            command: z.string().openapi({ example: 'power' }),
            params: z.record(z.any()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Command sent',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            commandId: z.string(),
            timestamp: z.number(),
          }),
        },
      },
    },
  },
})

export const GetCommandsSchema = createRoute({
  method: 'get',
  path: '/realtime/commands/{deviceId}',
  request: {
    params: z.object({
      deviceId: z.string(),
    }),
    query: z.object({
      since: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Pending commands',
      content: {
        'application/json': {
          schema: z.object({
            commands: z.array(z.any()),
            serverTime: z.number(),
          }),
        },
      },
    },
  },
})
