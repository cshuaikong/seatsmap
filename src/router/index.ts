import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/designer'
  },
  {
    path: '/designer',
    name: 'Designer',
    component: () => import('../components/KonvaDesigner.vue')
  },
  {
    path: '/demo',
    name: 'Demo',
    component: () => import('../components/DemoPage.vue')
  },
  {
    path: '/test',
    name: 'RotationTest',
    component: () => import('../components/RotationTest.vue')
  },
  {
    path: '/transformer-test',
    name: 'TransformerTest',
    component: () => import('../components/TransformerTest.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
