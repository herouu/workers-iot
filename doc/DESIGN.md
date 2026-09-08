# 智能家居应用设计规范

基于 Figma 原型 (Smart Home Community) 分析

---

## 1. 颜色方案

### 主色调
| 用途 | 色值 | 说明 |
|------|------|------|
| 主背景色 | `#1a1a2e` | 深紫灰色 |
| 卡片背景色 | `#2d2d44` | 中等深灰色 |
| 次级背景色 | `#3d3d5c` | 稍浅灰色（选项卡选中背景） |

### 强调色
| 用途 | 色值 | 说明 |
|------|------|------|
| 主强调色 | `#4ade80` | 亮绿色 - 选中状态、开关开启、图标激活 |
| 次强调色 | `#22c55e` | 深绿色 |

### 文字颜色
| 用途 | 色值 | 说明 |
|------|------|------|
| 主文字色 | `#ffffff` | 白色 - 标题、重要信息 |
| 次级文字色 | `#a0a0b0` | 浅灰色 - 副标题、描述文字 |
| 辅助文字色 | `#6b7280` | 灰色 - 标签、辅助说明 |

### 图标颜色
| 状态 | 色值 | 说明 |
|------|------|------|
| 默认 | `#ffffff` | 白色 |
| 次级 | `#9ca3af` | 浅灰色 |
| 激活/开启 | `#4ade80` | 亮绿色 |
| 关闭 | `#9ca3af` | 浅灰色 |

### 其他颜色
| 元素 | 色值 | 说明 |
|------|------|------|
| 用户头像边框 | `#4ade80` | 2px 亮绿色边框 |
| 选项卡下划线 | `#4ade80` | 3px 亮绿色 |
| 开关关闭背景 | `#4b5563` | 灰色 |

---

## 2. 字体层级

### 字体家族
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### 字体大小
| 层级 | 字号 | 粗细 | 行高 | 用途 |
|------|------|------|------|------|
| H1 | 24px | Bold (700) | 1.2 | 页面标题，如 "Beach House" |
| H2 | 18px | SemiBold (600) | 1.3 | 卡片标题，如 "Light", "Air Conditioner" |
| H3 | 16px | Medium (500) | 1.3 | 选项卡标题、设备名称、状态数值 |
| Body | 14px | Regular (400) | 1.5 | 正文内容 |
| Caption | 12px | Regular (400) | 1.4 | 辅助文字、品牌/型号、状态标签 |
| Label | 12px | Medium (500) | 1.4 | 标签文字 |

---

## 3. 间距系统

### 基础间距单位
基于 4px 网格系统：4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px

### 常用间距值
| 用途 | 间距值 |
|------|--------|
| 页面边距 | 20-24px |
| 卡片内边距 | 16px |
| 卡片间距 | 12px |
| 元素内部间距 | 8-12px |
| 图标与文字间距 | 8px |
| 按钮内边距 | 12px 24px |
| 选项卡间距 | 24-32px |
| 选项卡与内容区间距 | 16-20px |
| 状态卡片内图标与数值 | 8px |
| 状态卡片内数值与标签 | 4px |
| 设备卡片内名称与品牌 | 4px |
| 底部导航图标间距 | 32-40px |

### 具体布局尺寸
| 元素 | 尺寸 |
|------|------|
| 顶部导航栏高度 | 60-70px |
| 选项卡高度 | 40-50px |
| 卡片最小高度 | 120px |
| 底部导航栏高度 | 64px |
| 用户头像 | 40×40px |
| 设备图标容器 | 48×48px |
| 状态卡片图标 | 32×32px |
| 底部导航图标 | 24×24px |

---

## 4. 组件样式

### 卡片组件
```css
.card {
  background-color: #2d2d44;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
```

### 状态卡片组件
```css
.status-card {
  background-color: #2d2d44;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.status-card-icon {
  width: 32px;
  height: 32px;
  color: #ffffff;
}

.status-card-value {
  font-size: 16px;
  font-weight: 500;
  color: #ffffff;
}

.status-card-label {
  font-size: 12px;
  font-weight: 400;
  color: #a0a0b0;
}
```

### 设备卡片组件
```css
.device-card {
  background-color: #2d2d44;
  border-radius: 16px;
  padding: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.device-card-icon {
  width: 48px;
  height: 48px;
  color: #9ca3af; /* 关闭状态 */
}

.device-card-icon.active {
  color: #4ade80; /* 开启状态 */
}

.device-card-name {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.device-card-brand {
  font-size: 12px;
  font-weight: 400;
  color: #a0a0b0;
}
```

### 开关按钮 (Toggle)
```css
.toggle {
  width: 52px;
  height: 28px;
  border-radius: 14px;
  background-color: #4b5563; /* 关闭状态 */
  transition: background-color 0.2s;
}

.toggle.active {
  background-color: #4ade80; /* 开启状态 */
}

.toggle-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
```

### 选项卡
```css
.tab {
  padding: 8px 16px;
  border-radius: 8px;
  background-color: transparent;
  color: #a0a0b0;
  font-weight: 500;
  font-size: 16px;
}

.tab.active {
  background-color: #3d3d5c;
  color: #ffffff;
  border-bottom: 3px solid #4ade80;
}
```

### 用户头像
```css
.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #4ade80;
  object-fit: cover;
}
```

### 底部导航栏
```css
.bottom-nav {
  height: 64px;
  background-color: #1a1a2e;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.bottom-nav-icon {
  width: 24px;
  height: 24px;
  color: #9ca3af; /* 未选中 */
}

.bottom-nav-icon.active {
  color: #4ade80; /* 选中 */
}
```

### 图标容器
```css
.icon-container {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## 5. 图标风格

### 图标类型
- **风格**: 线性图标 (Line icons)
- **描边宽度**: 1.5-2px
- **圆角**: 2px

### 图标尺寸
| 用途 | 尺寸 |
|------|------|
| 导航图标 | 24px |
| 卡片图标 | 32px |
| 状态图标 | 20px |
| 功能图标 | 28px |
| 设备图标 | 48px |

---

## 6. 布局网格

### 移动端布局 (375px 宽度)
```css
.container {
  max-width: 375px;
  margin: 0 auto;
  padding: 0 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
```

### 网格参数
| 参数 | 值 |
|------|-----|
| 列数 | 2列 (卡片网格) |
| 列间距 | 12px |
| 行间距 | 12-16px |
| 页面边距 | 20px (左右) |
| 最大宽度 | 375px (移动端) |

### 响应式断点
```css
/* 移动端 (< 768px) */
.grid {
  grid-template-columns: repeat(2, 1fr);
}

/* 平板端 (≥ 768px) */
.grid {
  grid-template-columns: repeat(3, 1fr);
}

/* 桌面端 (≥ 1024px) */
.grid {
  grid-template-columns: repeat(4, 1fr);
}
```

---

## 7. 动画与过渡

### 过渡时间
| 交互 | 时间 |
|------|------|
| 按钮悬停 | 0.2s ease |
| 开关切换 | 0.3s ease |
| 页面切换 | 0.4s ease |
| 选项卡切换 | 0.2s ease |

### 缓动函数
| 类型 | 函数 |
|------|------|
| 标准 | `cubic-bezier(0.4, 0, 0.2, 1)` |
| 进入 | `cubic-bezier(0, 0, 0.2, 1)` |
| 退出 | `cubic-bezier(0.4, 0, 1, 1)` |

---

## 8. 设计模式

### 状态概览模式
- 使用 2x2 网格展示关键环境数据
- 每个状态卡片包含：图标、数值、标签
- 便于用户快速了解当前房间状态

### 设备控制模式
- 使用 2x2 网格展示设备列表
- 每个设备卡片包含：设备图标、名称、品牌、开关按钮
- 开关按钮位于右上角，便于操作

### 房间切换模式
- 顶部选项卡切换不同房间
- 选中房间显示对应的环境数据和设备列表
- 支持 "All" 视图显示所有设备

### 导航模式
- 底部导航栏固定，包含三个主要功能入口
- 中间为主页，左侧为设置/滑块，右侧为统计
- 选中状态通过颜色区分

---

## 9. 组件状态

### 交互状态
| 状态 | 表现 |
|------|------|
| 默认 | 正常显示 |
| 悬停 | 轻微亮度提升 |
| 按下 | 颜色加深 10% |
| 禁用 | 透明度 50% |

### 开关状态
| 状态 | 表现 |
|------|------|
| 关闭 | 灰色背景 (`#4b5563`) |
| 开启 | 绿色背景 (`#4ade80`) |
| 禁用 | 透明度 40% |

---

## 10. 可访问性

### 对比度要求
| 组合 | 最小对比度 |
|------|------------|
| 主文字与背景 | ≥ 7:1 |
| 次级文字与背景 | ≥ 4.5:1 |
| 强调色与背景 | ≥ 3:1 |

### 最小点击区域
| 元素 | 尺寸 |
|------|------|
| 按钮 | 44px × 44px |
| 开关 | 48px × 28px |
| 图标 | 44px × 44px |

---

## 11. 页面结构

### 智能家居控制中心主页面
1. **顶部导航栏** (60-70px)
   - 左侧：网格图标（菜单/更多选项）
   - 中间：页面标题 "Beach House"
   - 右侧：用户头像（圆形，带绿色边框）

2. **选项卡导航** (40-50px)
   - 四个选项卡：All, Living Room, Kitchen, Bathroom
   - 水平排列，可滚动
   - 选中状态：白色文字 + 绿色下划线（3px）

3. **状态卡片区域**
   - 2x2 网格布局
   - 显示：温度、湿度、能耗、光照强度

4. **设备卡片区域**
   - 2x2 网格布局
   - 每个设备卡片：图标、名称、品牌/型号、开关按钮

5. **底部导航栏** (64px)
   - 三个图标：设置/滑块、主页、统计
   - 中间主页图标为绿色（当前选中）

---

*此规范基于 Figma 原型截图分析，具体实现时可根据实际需求微调。*
