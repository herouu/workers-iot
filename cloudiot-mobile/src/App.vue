<template>
  <div class="min-h-screen bg-surface">
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  background-color: #1a1a2e;
  color: #ffffff;
}

#app {
  min-height: 100vh;
}
</style>
