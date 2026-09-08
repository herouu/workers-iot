// 规则引擎
import { ruleModel, RuleCondition, RuleAction } from '../models/rule';
import { commandDispatcher } from './command-dispatcher';
import { db } from '../db/index';

interface TelemetryData {
  device_id: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// 评估条件
function evaluateCondition(cond: RuleCondition, data: Record<string, unknown>): boolean {
  const value = data[cond.sensor];
  if (value === undefined) return false;

  const numValue = Number(value);
  const condValue = Number(cond.value);

  switch (cond.operator) {
    case '>': return numValue > condValue;
    case '<': return numValue < condValue;
    case '>=': return numValue >= condValue;
    case '<=': return numValue <= condValue;
    case '==': return String(value) === String(cond.value);
    default: return false;
  }
}

// 执行动作
function executeAction(action: RuleAction, source: TelemetryData): void {
  switch (action.type) {
    case 'command': {
      if (action.targetDevice && action.command) {
        commandDispatcher.insert({
          device_id: action.targetDevice,
          command: action.command,
          params: action.params,
          source: 'rule',
        });
      }
      break;
    }
    case 'http': {
      if (action.url) {
        // 异步 HTTP 回调，不阻塞
        fetch(action.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source,
            payload: action.payload,
          }),
        }).catch(() => {});
      }
      break;
    }
    case 'log': {
      console.log(`[rule] triggered: device=${source.device_id}, data=${JSON.stringify(source.data)}`);
      break;
    }
  }
}

export const ruleEngine = {
  // 评估所有规则
  evaluate(source: TelemetryData): void {
    const rules = ruleModel.findEnabled();
    for (const rule of rules) {
      try {
        const cond: RuleCondition = JSON.parse(rule.condition);
        const action: RuleAction = JSON.parse(rule.action);

        if (evaluateCondition(cond, source.data)) {
          executeAction(action, source);
        }
      } catch (err) {
        console.error(`[rule] error parsing rule ${rule.id}:`, err);
      }
    }
  },
};
