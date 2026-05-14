import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/pages/RegisterPage.vue')
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/pages/HomePage.vue')
  },
  {
    path: '/devices',
    name: 'Devices',
    component: () => import('@/pages/DevicesPage.vue')
  },
  {
    path: '/devices/:id',
    name: 'DeviceDetail',
    component: () => import('@/pages/DeviceDetailPage.vue')
  },
  {
    path: '/scenes',
    name: 'Scenes',
    component: () => import('@/pages/ScenesPage.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/SettingsPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('accessToken')
  
  if (!isAuthenticated && !['/login', '/register'].includes(to.path)) {
    next('/login')
  } else if (isAuthenticated && ['/login', '/register'].includes(to.path)) {
    next('/home')
  } else {
    next()
  }
})

export default router
