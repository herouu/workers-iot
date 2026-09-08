<template>
  <div class="min-h-screen bg-surface pb-8">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-surface-elevated/50">
      <div class="flex items-center justify-between px-5 py-4">
        <button @click="$router.back()" class="text-text-primary text-2xl">‹</button>
        <h1 class="text-text-primary font-semibold">数据统计</h1>
        <div class="flex bg-surface-card rounded-xl p-1">
          <button
            v-for="p in periods"
            :key="p.value"
            @click="changePeriod(p.value)"
            class="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            :class="period === p.value ? 'bg-brand text-surface' : 'text-text-secondary'"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
    </header>

    <main class="px-5 py-4 space-y-4">
      <!-- 概览卡片 -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-surface-card rounded-2xl p-4 text-center">
          <div class="text-2xl font-bold text-text-primary">{{ stats.devices.total }}</div>
          <div class="text-text-muted text-xs mt-1">设备总数</div>
        </div>
        <div class="bg-surface-card rounded-2xl p-4 text-center">
          <div class="text-2xl font-bold text-brand">{{ stats.devices.online }}</div>
          <div class="text-text-muted text-xs mt-1">在线</div>
        </div>
        <div class="bg-surface-card rounded-2xl p-4 text-center">
          <div class="text-2xl font-bold text-text-secondary">{{ stats.devices.offline }}</div>
          <div class="text-text-muted text-xs mt-1">离线</div>
        </div>
      </div>

      <!-- 在线率环形图 -->
      <div class="bg-surface-card rounded-2xl p-4">
        <div class="text-text-secondary text-sm mb-3">设备在线率</div>
        <div class="h-48">
          <v-chart :option="onlineRateOption" autoresize />
        </div>
      </div>

      <!-- 设备类型分布 -->
      <div class="bg-surface-card rounded-2xl p-4">
        <div class="text-text-secondary text-sm mb-3">设备类型分布</div>
        <div class="h-48">
          <v-chart :option="typeDistributionOption" autoresize />
        </div>
      </div>

      <!-- 房间分布 -->
      <div class="bg-surface-card rounded-2xl p-4">
        <div class="text-text-secondary text-sm mb-3">房间设备分布</div>
        <div class="h-48">
          <v-chart :option="roomDistributionOption" autoresize />
        </div>
      </div>

      <!-- 场景执行趋势 -->
      <div class="bg-surface-card rounded-2xl p-4">
        <div class="text-text-secondary text-sm mb-3">场景执行趋势</div>
        <div class="h-48">
          <v-chart :option="sceneTrendOption" autoresize />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import VChart from 'vue-echarts'
import type { StatisticsData } from '@/api/statistics'

const period = ref<'day' | 'week' | 'month'>('day')

const periods = [
  { value: 'day' as const, label: '今日' },
  { value: 'week' as const, label: '本周' },
  { value: 'month' as const, label: '本月' },
]

const stats = ref<StatisticsData>({
  period: 'day',
  devices: { total: 0, online: 0, offline: 0 },
  scenes: { executions: 0 },
  distribution: { byType: [], byRoom: [] }
})

// 在线率环形图配置
const onlineRateOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    backgroundColor: '#2d2d44',
    borderColor: '#3d3d5c',
    textStyle: { color: '#ffffff' }
  },
  series: [{
    type: 'pie',
    radius: ['60%', '80%'],
    center: ['50%', '50%'],
    avoidLabelOverlap: false,
    label: {
      show: true,
      position: 'center',
      formatter: () => {
        const rate = stats.value.devices.total > 0
          ? Math.round((stats.value.devices.online / stats.value.devices.total) * 100)
          : 0
        return `{rate|${rate}%}\n在线率`
      },
      rich: {
        rate: {
          fontSize: 24,
          fontWeight: 'bold',
          color: '#4ade80',
          lineHeight: 36
        }
      },
      textStyle: { color: '#a0a0b0', fontSize: 12 }
    },
    labelLine: { show: false },
    data: [
      { value: stats.value.devices.online, name: '在线', itemStyle: { color: '#4ade80' } },
      { value: stats.value.devices.offline, name: '离线', itemStyle: { color: '#6b7280' } }
    ]
  }]
}))

// 设备类型分布柱状图配置
const typeDistributionOption = computed(() => {
  const data = stats.value.distribution.byType
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#2d2d44',
      borderColor: '#3d3d5c',
      textStyle: { color: '#ffffff' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.type),
      axisLine: { lineStyle: { color: '#3d3d5c' } },
      axisLabel: { color: '#a0a0b0', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#3d3d5c' } },
      axisLabel: { color: '#a0a0b0' },
      splitLine: { lineStyle: { color: '#3d3d5c', type: 'dashed' } }
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.count),
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#4ade80' },
            { offset: 1, color: '#22c55e' }
          ]
        },
        borderRadius: [4, 4, 0, 0]
      },
      barWidth: '50%'
    }]
  }
})

// 房间分布饼图配置
const roomDistributionOption = computed(() => {
  const data = stats.value.distribution.byRoom
  const colors = ['#4ade80', '#22c55e', '#3d3d5c', '#a0a0b0', '#6b7280', '#1a1a2e']
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#2d2d44',
      borderColor: '#3d3d5c',
      textStyle: { color: '#ffffff' },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#a0a0b0' }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: '#1a1a2e',
        borderWidth: 2
      },
      label: { show: false },
      data: data.map((d, i) => ({
        value: d.count,
        name: d.room,
        itemStyle: { color: colors[i % colors.length] }
      }))
    }]
  }
})

// 场景执行趋势折线图（模拟数据）
const sceneTrendOption = computed(() => {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const data = days.map(() => Math.floor(Math.random() * 15) + 3)
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#2d2d44',
      borderColor: '#3d3d5c',
      textStyle: { color: '#ffffff' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: days,
      axisLine: { lineStyle: { color: '#3d3d5c' } },
      axisLabel: { color: '#a0a0b0' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#3d3d5c' } },
      axisLabel: { color: '#a0a0b0' },
      splitLine: { lineStyle: { color: '#3d3d5c', type: 'dashed' } }
    },
    series: [{
      name: '执行次数',
      type: 'line',
      smooth: true,
      data,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(74, 222, 128, 0.3)' },
            { offset: 1, color: 'rgba(74, 222, 128, 0.02)' }
          ]
        }
      },
      lineStyle: { color: '#4ade80', width: 2 },
      itemStyle: { color: '#4ade80' },
      symbolSize: 6
    }]
  }
})

async function fetchStats() {
  try {
    const { getStatistics } = await import('@/api/statistics')
    const data = await getStatistics(period.value)
    stats.value = data
  } catch {
    // 使用模拟数据
    stats.value = {
      period: period.value,
      devices: { total: 8, online: 6, offline: 2 },
      scenes: { executions: 23 },
      distribution: {
        byType: [
          { type: 'light', count: 3 },
          { type: 'ac', count: 2 },
          { type: 'outlet', count: 2 },
          { type: 'lock', count: 1 }
        ],
        byRoom: [
          { room: '客厅', count: 3 },
          { room: '卧室', count: 2 },
          { room: '厨房', count: 2 },
          { room: '书房', count: 1 }
        ]
      }
    }
  }
}

function changePeriod(p: 'day' | 'week' | 'month') {
  period.value = p
  fetchStats()
}

onMounted(() => {
  fetchStats()
})
</script>
