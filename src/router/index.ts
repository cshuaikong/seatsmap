import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../components/IndexPage.vue')
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
    path: '/path-editor',
    name: 'PathEditor',
    component: () => import('../components/PathEditor.vue')
  },
  {
    path: '/seatmap-designer',
    name: 'SeatMapDesigner',
    component: () => import('../components/SeatMapDesigner.vue'),
    props: { dataUrl: '/分区座位 全_path.json' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
