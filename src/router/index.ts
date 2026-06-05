import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/editor'
  },
  {
    path: '/editor',
    name: 'Editor',
    component: () => import('../components/LeaferDesigner.vue')
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
  },
  {
    path: '/polygon-test',
    name: 'PolygonTest',
    component: () => import('../components/PolygonTest.vue')
  },
  {
    path: '/path-select-test',
    name: 'PathSelectTest',
    component: () => import('../components/PathSelectTest.vue')
  },
  {
    path: '/editor-v2',
    name: 'SeatMapEditor',
    component: () => import('../components/SeatMapEditor.vue'),
    props: { dataUrl: '/static/分区座位 全_path.json' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
