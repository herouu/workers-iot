/**
 * 全局共享常量
 */

// 命令回执超时窗口：设备领取命令后（status='sent'）超过该时长仍未 ACK，
// 视为执行失败/回执丢失，允许重新投递（至少一次 at-least-once 语义）。
// 该常量同时被 /realtime/commands/:deviceId（设备直连领取）与
// /api/commands/pending（本地网关领取）使用。
export const ACK_TIMEOUT_MS = 10 * 60 * 1000