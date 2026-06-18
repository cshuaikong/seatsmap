/**
 * 将 工人体育馆.json 转为符合当前 schema 的 SQL INSERT 文件
 * 用法: node scripts/json2sql.js
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const STATUS_MAP = { available: 0, sold: 1, reserved: 2 }

const raw = fs.readFileSync(
  path.resolve(__dirname, '../static/工人体育馆.json'),
  'utf-8'
)
const data = JSON.parse(raw)

// ====== venue 表 ======
// sections JSON 要去掉 rows 里的 seats 数组
const sectionsForVenue = data.sections.map(section => {
  const clean = { ...section }
  if (clean.rows && clean.rows.length > 0) {
    clean.rows = clean.rows.map(row => {
      const { seats, ...rowWithoutSeats } = row
      return rowWithoutSeats
    })
  }
  return clean
})

const venueSQL = `INSERT INTO venue (venue_id, name, type, scale, categories, sections) VALUES (
  ${esc(data.id)},
  ${esc(data.name)},
  ${esc(data.venueType || 'SIMPLE')},
  ${data.baseScale ?? 1.0},
  ${esc(JSON.stringify(data.categories))},
  ${esc(JSON.stringify(sectionsForVenue))}
);\n`

// ====== seats 表 ======
const seatRows = []
for (const section of data.sections) {
  if (!section.rows) continue
  for (const row of section.rows) {
    if (!row.seats) continue
    for (const seat of row.seats) {
      seatRows.push(
        `(${esc(seat.id)},${esc(section.id)},${esc(row.id)},${seat.categoryKey ?? 0},${esc(seat.label)},${seat.x},${seat.y},${STATUS_MAP[seat.status] ?? 0})`
      )
    }
  }
}

// 分批 INSERT，每批 500 条
const BATCH = 500
let seatsSQL = ''
for (let i = 0; i < seatRows.length; i += BATCH) {
  seatsSQL += `INSERT INTO seats (id, sec_id, row_id, cat_id, label, x, y, status) VALUES\n  ${seatRows.slice(i, i + BATCH).join(',\n  ')};\n`
}

// ====== 输出 ======
const outPath = path.resolve(__dirname, '../docs/工人体育馆_data.sql')
fs.writeFileSync(outPath, `-- 工人体育馆 初始化数据\n-- 生成时间: ${new Date().toISOString()}\n\n${venueSQL}\n${seatsSQL}`, 'utf-8')

const totalSeats = seatRows.length
console.log(`Done. venue=1, seats=${totalSeats}, file=${outPath}`)

function esc(v) {
  if (v == null) return 'NULL'
  const s = String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return `'${s}'`
}
