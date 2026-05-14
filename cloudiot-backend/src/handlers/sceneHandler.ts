/**
 * 场景处理器
 */
import { jsonResponse, jsonError, success, notFound, forbidden } from '../utils/response'
import { generateSceneId } from '../utils/password'

function getUserId(request: Request): string {
  return request.headers.get('x-user-id') || ''
}

function extractId(url: string): string {
  const segments = new URL(url).pathname.split('/')
  return segments[segments.length - 1]
}

// 获取场景列表
export async function getScenes(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    
    const result = await env.DB
      .prepare('SELECT * FROM scenes WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all()
    
    const scenes = result.results.map((scene: any) => ({
      ...scene,
      enabled: !!scene.enabled,
      trigger_config: JSON.parse(scene.trigger_config || '{}'),
      actions: JSON.parse(scene.actions || '[]')
    }))
    
    return jsonResponse({ scenes })
    
  } catch (err) {
    console.error('Get scenes error:', err)
    return jsonError('Failed to get scenes', 500)
  }
}

// 获取场景详情
export async function getScene(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const sceneId = extractId(request.url)
    
    const scene = await env.DB
      .prepare('SELECT * FROM scenes WHERE id = ?')
      .bind(sceneId)
      .first()
    
    if (!scene) {
      return notFound('Scene not found')
    }
    
    if (scene.user_id !== userId) {
      return forbidden('No permission to access this scene')
    }
    
    return jsonResponse({
      ...scene,
      enabled: !!scene.enabled,
      trigger_config: JSON.parse(scene.trigger_config || '{}'),
      actions: JSON.parse(scene.actions || '[]')
    })
    
  } catch (err) {
    console.error('Get scene error:', err)
    return jsonError('Failed to get scene', 500)
  }
}

// 创建场景
export async function createScene(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const body = await request.json()
    const { name, icon, trigger_config, actions, enabled } = body
    
    if (!name || !trigger_config || !actions) {
      return jsonError('Name, trigger_config, and actions are required', 400)
    }
    
    const sceneId = generateSceneId()
    
    await env.DB
      .prepare(`
        INSERT INTO scenes (id, user_id, name, icon, enabled, trigger_config, actions)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        sceneId,
        userId,
        name,
        icon || '🎬',
        enabled !== false ? 1 : 0,
        JSON.stringify(trigger_config),
        JSON.stringify(actions)
      )
      .run()
    
    return jsonResponse({
      id: sceneId,
      name,
      icon: icon || '🎬',
      enabled: enabled !== false,
      trigger_config,
      actions
    }, 201)
    
  } catch (err) {
    console.error('Create scene error:', err)
    return jsonError('Failed to create scene', 500)
  }
}

// 更新场景
export async function updateScene(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const sceneId = extractId(request.url)
    const body = await request.json()
    
    const scene = await env.DB
      .prepare('SELECT * FROM scenes WHERE id = ?')
      .bind(sceneId)
      .first()
    
    if (!scene) {
      return notFound('Scene not found')
    }
    
    if (scene.user_id !== userId) {
      return forbidden('No permission to update this scene')
    }
    
    const updates: string[] = []
    const bindings: any[] = []
    
    if (body.name !== undefined) {
      updates.push('name = ?')
      bindings.push(body.name)
    }
    if (body.icon !== undefined) {
      updates.push('icon = ?')
      bindings.push(body.icon)
    }
    if (body.enabled !== undefined) {
      updates.push('enabled = ?')
      bindings.push(body.enabled ? 1 : 0)
    }
    if (body.trigger_config !== undefined) {
      updates.push('trigger_config = ?')
      bindings.push(JSON.stringify(body.trigger_config))
    }
    if (body.actions !== undefined) {
      updates.push('actions = ?')
      bindings.push(JSON.stringify(body.actions))
    }
    
    updates.push('updated_at = ?')
    bindings.push(Date.now())
    bindings.push(sceneId)
    
    await env.DB
      .prepare(`UPDATE scenes SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...bindings)
      .run()
    
    return success({ message: 'Scene updated successfully' })
    
  } catch (err) {
    console.error('Update scene error:', err)
    return jsonError('Failed to update scene', 500)
  }
}

// 删除场景
export async function deleteScene(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const sceneId = extractId(request.url)
    
    const scene = await env.DB
      .prepare('SELECT * FROM scenes WHERE id = ?')
      .bind(sceneId)
      .first()
    
    if (!scene) {
      return notFound('Scene not found')
    }
    
    if (scene.user_id !== userId) {
      return forbidden('No permission to delete this scene')
    }
    
    await env.DB
      .prepare('DELETE FROM scenes WHERE id = ?')
      .bind(sceneId)
      .run()
    
    return success({ message: 'Scene deleted successfully' })
    
  } catch (err) {
    console.error('Delete scene error:', err)
    return jsonError('Failed to delete scene', 500)
  }
}

// 执行场景
export async function executeScene(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const sceneId = extractId(request.url)
    
    const scene = await env.DB
      .prepare('SELECT * FROM scenes WHERE id = ?')
      .bind(sceneId)
      .first()
    
    if (!scene) {
      return notFound('Scene not found')
    }
    
    if (scene.user_id !== userId) {
      return forbidden('No permission to execute this scene')
    }
    
    if (!scene.enabled) {
      return jsonError('Scene is disabled', 400)
    }
    
    const triggerConfig = JSON.parse(scene.trigger_config || '{}')
    const actions = JSON.parse(scene.actions || '[]')
    
    // 通过 Durable Object 执行场景
    const doId = env.SCENE_EXECUTOR.idFromName(sceneId)
    const doStub = env.SCENE_EXECUTOR.get(doId)
    
    const result = await doStub.execute(actions)
    
    // 记录执行日志
    await env.DB
      .prepare(`
        INSERT INTO scene_logs (scene_id, status, details)
        VALUES (?, ?, ?)
      `)
      .bind(sceneId, 'success', JSON.stringify(result))
      .run()
    
    // 更新最后执行时间
    await env.DB
      .prepare('UPDATE scenes SET last_triggered = ? WHERE id = ?')
      .bind(Date.now(), sceneId)
      .run()
    
    return jsonResponse({
      success: true,
      sceneId,
      executedAt: Date.now(),
      result
    })
    
  } catch (err) {
    console.error('Execute scene error:', err)
    return jsonError('Failed to execute scene', 500)
  }
}
