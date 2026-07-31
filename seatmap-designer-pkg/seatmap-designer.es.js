import { Fragment as e, Teleport as t, computed as n, createApp as r, createBlock as i, createCommentVNode as a, createElementBlock as o, createElementVNode as s, createStaticVNode as c, createTextVNode as l, createVNode as u, markRaw as d, mergeProps as f, nextTick as p, normalizeClass as m, normalizeStyle as h, onBeforeUnmount as g, onMounted as _, onUnmounted as v, openBlock as y, reactive as b, ref as x, renderList as S, toDisplayString as C, unref as w, vModelSelect as T, vModelText as ee, watch as E, withDirectives as te, withKeys as ne, withModifiers as re } from "vue";
//#region ../packages/core/constants.js
var ie = {
	rowSeats: 500,
	dropTotal: 5e3,
	sectionSeats: 5e3,
	venueSeats: 8e4
}, ae = [
	"#3b82f6",
	"#22c55e",
	"#eab308",
	"#ef4444",
	"#a855f7",
	"#06b6d4",
	"#f97316",
	"#ec4899",
	"#14b8a6",
	"#8b5cf6",
	"#84cc16",
	"#f43f5e"
], oe = "#9ca3af", se = [
	{
		key: "available",
		label: "可售"
	},
	{
		key: "reserved",
		label: "预留"
	},
	{
		key: "sold",
		label: "已售"
	},
	{
		key: "disabled",
		label: "禁用"
	}
], ce = [
	{
		key: 1,
		label: "普通座位"
	},
	{
		key: 2,
		label: "椅子"
	},
	{
		key: 3,
		label: "凳子"
	},
	{
		key: 4,
		label: "长凳"
	}
], le = "#38bdf8", ue = .1, de = "#ffffff";
//#endregion
//#region ../packages/core/path.js
function fe(e) {
	let t = /([MLHVAZmlhvaz])|(-?\d+(?:\.\d+)?(?:e-?\d+)?)/gi, n = [], r;
	for (; r = t.exec(e);) n.push(r[1] ?? +r[2]);
	return n;
}
function pe(e, t, n, r, i, a, o, s, c) {
	let l = Math.cos(i), u = Math.sin(i), d = (e - s) / 2, f = (t - c) / 2, p = l * d + u * f, m = -u * d + l * f, h = n * n, g = r * r, _ = p * p / h + m * m / g;
	if (_ > 1) {
		let e = Math.sqrt(_);
		n *= e, r *= e, h = n * n, g = r * r;
	}
	let v = h * g - h * m * m - g * p * p, y = h * m * m + g * p * p, b = Math.sqrt(Math.max(0, v / y));
	a === o && (b = -b);
	let x = b * n * m / r, S = -b * r * p / n, C = l * x - u * S + (e + s) / 2, w = u * x + l * S + (t + c) / 2, T = (e, t, n, r) => {
		let i = Math.hypot(e, t) * Math.hypot(n, r), a = Math.min(1, Math.max(-1, (e * n + t * r) / i)), o = Math.acos(a);
		return e * r - t * n < 0 ? -o : o;
	}, ee = T(1, 0, (p - x) / n, (m - S) / r), E = T((p - x) / n, (m - S) / r, (-p - x) / n, (-m - S) / r);
	return !o && E > 0 && (E -= 2 * Math.PI), o && E < 0 && (E += 2 * Math.PI), {
		cx: C,
		cy: w,
		rx: n,
		ry: r,
		phi: i,
		th1: ee,
		dth: E
	};
}
function me(e, t) {
	let n = Math.cos(e.phi), r = Math.sin(e.phi);
	return {
		x: e.cx + e.rx * Math.cos(t) * n - e.ry * Math.sin(t) * r,
		y: e.cy + e.rx * Math.cos(t) * r + e.ry * Math.sin(t) * n
	};
}
function he(e, t = Math.PI / 36) {
	if (!e) return [];
	let n = fe(e), r = [], i = 0, a = 0, o = 0, s = 0, c = 0;
	for (; i < n.length;) {
		let e = n[i++];
		if (typeof e == "number") break;
		let l = e === e.toLowerCase(), u = e.toUpperCase();
		if (u === "M" || u === "L") {
			let e = n[i++] + (l ? a : 0), t = n[i++] + (l ? o : 0);
			a = e, o = t, r.push({
				x: e,
				y: t
			}), u === "M" && (s = e, c = t);
		} else if (u === "H") a = n[i++] + (l ? a : 0), r.push({
			x: a,
			y: o
		});
		else if (u === "V") o = n[i++] + (l ? o : 0), r.push({
			x: a,
			y: o
		});
		else if (u === "A") {
			let e = n[i++], s = n[i++], c = n[i++], u = n[i++], d = n[i++], f = n[i++] + (l ? a : 0), p = n[i++] + (l ? o : 0), m = pe(a, o, e, s, c * Math.PI / 180, u, d, f, p), h = Math.max(2, Math.ceil(Math.abs(m.dth) / t));
			for (let e = 1; e <= h; e++) r.push(me(m, m.th1 + m.dth * e / h));
			a = f, o = p;
		} else u === "Z" && (a = s, o = c);
	}
	return r;
}
function ge(e, t, n) {
	return ve(e, t, n, 1);
}
function _e(e, t) {
	return ve(e, 0, 0, t);
}
function ve(e, t, n, r = 1) {
	if (!e || !t && !n && r === 1) return e || "";
	let i = fe(e), a = [], o = 0, s = 0, c = 0, l = 0, u = 0, d = (e) => +e.toFixed(2);
	for (; o < i.length;) {
		let e = i[o++], f = e === e.toLowerCase(), p = e.toUpperCase();
		if (p === "M" || p === "L") {
			let e = i[o++] + (f ? s : 0), m = i[o++] + (f ? c : 0);
			s = e, c = m, a.push(`${p}${d(e * r + t)} ${d(m * r + n)}`), p === "M" && (l = e, u = m);
		} else if (p === "H") s = i[o++] + (f ? s : 0), a.push(`L${d(s * r + t)} ${d(c * r + n)}`);
		else if (p === "V") c = i[o++] + (f ? c : 0), a.push(`L${d(s * r + t)} ${d(c * r + n)}`);
		else if (p === "A") {
			let e = i[o++], l = i[o++], u = i[o++], p = i[o++], m = i[o++], h = i[o++] + (f ? s : 0), g = i[o++] + (f ? c : 0);
			a.push(`A${d(e * r)} ${d(l * r)} ${d(u)} ${p} ${m} ${d(h * r + t)} ${d(g * r + n)}`), s = h, c = g;
		} else p === "Z" && (a.push("Z"), s = l, c = u);
	}
	return a.join("");
}
//#endregion
//#region ../packages/core/geoBase.js
function ye(e, t, n, r, i) {
	let a = i * Math.PI / 180, o = Math.cos(a), s = Math.sin(a), c = e - n, l = t - r;
	return {
		x: n + c * o - l * s,
		y: r + c * s + l * o
	};
}
function be(e, t) {
	return {
		minX: Math.min(e.x, t.x),
		minY: Math.min(e.y, t.y),
		maxX: Math.max(e.x, t.x),
		maxY: Math.max(e.y, t.y)
	};
}
function xe(e, t, n) {
	return Math.atan2(n.y - t, n.x - e) * 180 / Math.PI;
}
//#endregion
//#region ../packages/core/geometry.js
function Se(e, t, n) {
	let r = !1;
	for (let i = 0, a = n.length - 1; i < n.length; a = i++) {
		let o = n[i], s = n[a];
		o.y > t != s.y > t && e < (s.x - o.x) * (t - o.y) / (s.y - o.y) + o.x && (r = !r);
	}
	return r;
}
function Ce(e) {
	let t = Infinity, n = Infinity, r = -Infinity, i = -Infinity;
	for (let a of e) a.x < t && (t = a.x), a.y < n && (n = a.y), a.x > r && (r = a.x), a.y > i && (i = a.y);
	return {
		minX: t,
		minY: n,
		maxX: r,
		maxY: i
	};
}
function we(e, t, n, r, i, a) {
	let o = i - n, s = a - r, c = o * o + s * s, l = c ? ((e - n) * o + (t - r) * s) / c : 0;
	return l = Math.max(0, Math.min(1, l)), Math.hypot(e - (n + l * o), t - (r + l * s));
}
function Te(e, t, n, r) {
	let i = (e, t, n) => (t.x - e.x) * (n.y - e.y) - (t.y - e.y) * (n.x - e.x), a = i(n, r, e), o = i(n, r, t), s = i(e, t, n), c = i(e, t, r);
	return (a > 0 && o < 0 || a < 0 && o > 0) && (s > 0 && c < 0 || s < 0 && c > 0);
}
function Ee(e, t) {
	let n = e;
	for (; n - t > 180;) n -= 360;
	for (; n - t < -180;) n += 360;
	return n;
}
function De(e) {
	let t = e.seats;
	if (t.length < 2) return {
		x: 1,
		y: 0
	};
	let n = t[0], r = t[t.length - 1], i = Math.hypot(r.x - n.x, r.y - n.y);
	return i < 1e-6 ? {
		x: 1,
		y: 0
	} : {
		x: (r.x - n.x) / i,
		y: (r.y - n.y) / i
	};
}
function Oe(e) {
	let t = De(e);
	return [...e.seats].sort((e, n) => e.x * t.x + e.y * t.y - (n.x * t.x + n.y * t.y));
}
function ke(e, t, n = 16) {
	let r = e.seats;
	if (r.length >= 2) {
		let e = t === "end" ? r[r.length - 2] : r[1], n = t === "end" ? r[r.length - 1] : r[0], i = {
			x: n.x - e.x,
			y: n.y - e.y
		};
		if (Math.hypot(i.x, i.y) > 1e-6) return i;
	}
	let i = De(e), a = e.seatSpacing || n, o = t === "end" ? 1 : -1;
	return {
		x: i.x * a * o,
		y: i.y * a * o
	};
}
function Ae(e) {
	if (!e.seats.length) return null;
	let t = 0, n = 0;
	for (let r of e.seats) t += r.x, n += r.y;
	return {
		x: t / e.seats.length,
		y: n / e.seats.length
	};
}
function je(e) {
	let t = 0, n = 0, r = null;
	for (let i of e) {
		let e = De(i);
		r ||= e;
		let a = e.x * r.x + e.y * r.y < 0 ? -1 : 1;
		t += e.x * a, n += e.y * a;
	}
	let i = Math.hypot(t, n);
	return i < 1e-6 ? {
		x: 1,
		y: 0
	} : {
		x: t / i,
		y: n / i
	};
}
function Me(e) {
	let t = De(e), n = Math.atan2(t.y, t.x) * 180 / Math.PI;
	for (; n > 90;) n -= 180;
	for (; n <= -90;) n += 180;
	return n;
}
function Ne(e, t, n, r) {
	let i = [], a = t.x - e.x, o = t.y - e.y, s = Math.hypot(a, o), c = Math.atan2(o, a) * 180 / Math.PI, l = (r || 0) * Math.PI / 180;
	if (s < 1e-6 || Math.abs(l) < 1e-9 || n < 2) {
		for (let t = 0; t < n; t++) {
			let r = n > 1 ? t / (n - 1) : 0;
			i.push({
				x: e.x + a * r,
				y: e.y + o * r,
				r: c
			});
		}
		return i;
	}
	let u = Math.abs(l) / 2, d = s / (2 * Math.sin(u)), f = s / (2 * Math.tan(u)), p = a / s, m = o / s, h = (e.x + t.x) / 2, g = (e.y + t.y) / 2, _ = Math.sign(l), v = h + _ * f * m, y = g - _ * f * p, b = Math.atan2(e.y - y, e.x - v);
	for (let e = 0; e < n; e++) {
		let t = b - l * e / (n - 1), r = v + d * Math.cos(t), a = y + d * Math.sin(t), o = t * 180 / Math.PI + (l > 0 ? -90 : 90);
		i.push({
			x: r,
			y: a,
			r: o
		});
	}
	return i;
}
//#endregion
//#region ../packages/core/model.js
var Pe = 0;
function Fe(e = "id") {
	return `${e}_${Date.now().toString(36)}_${(Pe++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
function Ie(e, t, n, r = "available", i = 0, a = null, o = 1) {
	return {
		id: Fe("s"),
		x: Math.round(e * 100) / 100,
		y: Math.round(t * 100) / 100,
		n,
		status: r,
		r: i,
		cat: a,
		type: o
	};
}
function Le(e, t = [], n = null, r = null, i = null, a = 0) {
	return {
		id: Fe("r"),
		label: e,
		seats: t,
		seatSpacing: n,
		rowSpacing: r,
		labelPos: i,
		curve: a
	};
}
function Re(e) {
	return [
		"start",
		"end",
		"both",
		"none"
	].includes(e?.labelPos) ? e.labelPos : "both";
}
function ze(e, t, n = [], r = null, i = "") {
	return {
		id: Fe("sec"),
		name: e,
		color: t,
		visible: !0,
		rows: n,
		gen: r,
		path: i,
		label: We(),
		cat_id: null
	};
}
function Be() {
	let e = ze("", oe, [], null, "");
	return e.loose = !0, e;
}
function Ve(e, t = []) {
	let n;
	for (let t of e.rows) for (let e of t.seats) {
		let t = e.cat ?? null;
		if (n === void 0) n = t;
		else if (n !== t) return null;
	}
	return n == null ? null : t.find((e) => e.key === n)?.color || null;
}
function He(e) {
	let t = e.path ? he(e.path) : [];
	if (t.length >= 3) {
		let e = Ce(t);
		return {
			cx: (e.minX + e.maxX) / 2,
			cy: (e.minY + e.maxY) / 2,
			w: e.maxX - e.minX,
			h: e.maxY - e.minY
		};
	}
	let n = Infinity, r = Infinity, i = -Infinity, a = -Infinity;
	for (let t of e.rows) for (let e of t.seats) e.x < n && (n = e.x), e.x > i && (i = e.x), e.y < r && (r = e.y), e.y > a && (a = e.y);
	return n === Infinity ? null : {
		cx: (n + i) / 2,
		cy: (r + a) / 2,
		w: i - n,
		h: a - r
	};
}
function Ue(e) {
	return e?.loose ? "未分区座位" : e?.name || "未命名分区";
}
function We() {
	return {
		text: "",
		visible: !0,
		fontSize: 14,
		rotation: 0,
		dx: 0,
		dy: 0
	};
}
function Ge(e) {
	return {
		...We(),
		...e.label || {}
	};
}
function Ke() {
	return {
		text: "",
		visible: !0,
		opacity: .18,
		fontSize: 60,
		rotation: -30,
		color: "#334155",
		logo: null,
		rowGap: 1
	};
}
function qe(e) {
	return {
		...Ke(),
		...e.watermark || {}
	};
}
function Je({ src: e, x: t = 0, y: n = 0, w: r = 100, h: i = 100, baseW: a = 0, baseH: o = 0, opacity: s = 1, locked: c = !1, visible: l = !0, name: u = "", rotation: d = 0 }) {
	return {
		id: Fe("img"),
		name: u,
		src: e,
		x: t,
		y: n,
		w: r,
		h: i,
		baseW: a || r,
		baseH: o || i,
		opacity: s,
		locked: c,
		visible: l,
		rotation: d
	};
}
function Ye(e = "未命名场馆", t = [], n = null) {
	return {
		name: e,
		sections: t,
		stage: n,
		images: [],
		categories: [],
		backendId: null,
		baseScale: 1
	};
}
function Xe(e) {
	let t = 0;
	for (let n of e.rows) t += n.seats.length;
	return t;
}
//#endregion
//#region src/seatmap/generators.js
function Ze(e) {
	let t = "";
	for (e += 1; e > 0;) t = String.fromCharCode(65 + (e - 1) % 26) + t, e = Math.floor((e - 1) / 26);
	return t;
}
function Qe({ x: e, y: t, rows: n, cols: r, seatPitch: i = 16, rowPitch: a = 24 }) {
	let o = [];
	for (let s = 0; s < n; s++) {
		let n = [];
		for (let o = 0; o < r; o++) n.push(Ie(e + o * i, t + s * a, o + 1));
		o.push(Le(Ze(s), n));
	}
	return o;
}
function $e({ cx: e, cy: t, innerR: n, rowCount: r, startDeg: i, endDeg: a, seatPitch: o = 16, rowPitch: s = 24 }) {
	let c = [], l = (a - i) * Math.PI / 180, u = i * Math.PI / 180;
	for (let i = 0; i < r; i++) {
		let r = n + i * s, a = Math.max(2, Math.floor(r * l / o)), d = l / a, f = [];
		for (let n = 0; n < a; n++) {
			let i = u + d * (n + .5);
			f.push(Ie(e + r * Math.cos(i), t + r * Math.sin(i), n + 1));
		}
		c.push(Le(Ze(i), f));
	}
	return c;
}
function et(e, t, n, r, i = 16) {
	let a = n - e, o = r - t, s = Math.hypot(a, o), c = Math.max(1, Math.floor(s / i) + 1), l = s > 1e-9 ? a / s : 1, u = s > 1e-9 ? o / s : 0, d = [];
	for (let n = 0; n < c; n++) d.push(Ie(e + l * i * n, t + u * i * n, ""));
	return d;
}
function tt(e) {
	return e.type === "arc" ? $e(e) : Qe(e);
}
var nt = 16 / 2, rt = 24 / 2;
function it(e) {
	let t = e.seatPitch ?? 16, n = e.rowPitch ?? 24, r = t / 2, i = n / 2;
	if (e.type === "arc") {
		let t = e.innerR + (e.rowCount - 1) * n + i, r = Math.max(20, e.innerR - i), a = e.endDeg - e.startDeg, o = Math.max(3, a / 24), s = [];
		for (let n = 0; n <= a + .001; n += o) s.push(at(e.cx, e.cy, t, e.startDeg + n));
		for (let t = a; t >= -.001; t -= o) s.push(at(e.cx, e.cy, r, e.startDeg + t));
		return s;
	}
	let a = e.x - r, o = e.y - i, s = e.x + (e.cols - 1) * t + r, c = e.y + (e.rows - 1) * n + i;
	return [
		{
			x: a,
			y: o
		},
		{
			x: s,
			y: o
		},
		{
			x: s,
			y: c
		},
		{
			x: a,
			y: c
		}
	];
}
function at(e, t, n, r) {
	let i = r * Math.PI / 180;
	return {
		x: e + n * Math.cos(i),
		y: t + n * Math.sin(i)
	};
}
function ot(e) {
	let t = Infinity, n = Infinity, r = -Infinity, i = -Infinity;
	for (let a of e) for (let e of a.seats) e.x < t && (t = e.x), e.y < n && (n = e.y), e.x > r && (r = e.x), e.y > i && (i = e.y);
	return t === Infinity ? [] : [
		{
			x: t - nt,
			y: n - rt
		},
		{
			x: r + nt,
			y: n - rt
		},
		{
			x: r + nt,
			y: i + rt
		},
		{
			x: t - nt,
			y: i + rt
		}
	];
}
function st(e) {
	return e?.length ? e.map((e, t) => `${t ? "L" : "M"}${e.x.toFixed(2)} ${e.y.toFixed(2)}`).join("") + "Z" : "";
}
function ct(e) {
	return he(e);
}
function lt(e) {
	return st(it(e));
}
function ut(e) {
	return st(ot(e));
}
function dt(e) {
	if (e.type === "arc") {
		let t = e.rowPitch ?? 24, n = t / 2, r = e.innerR + (e.rowCount - 1) * t + n, i = Math.max(20, e.innerR - n), a = (e.startDeg + e.endDeg) / 2;
		return [
			{
				role: "outer-start",
				...at(e.cx, e.cy, r, e.startDeg)
			},
			{
				role: "outer-mid",
				...at(e.cx, e.cy, r, a)
			},
			{
				role: "outer-end",
				...at(e.cx, e.cy, r, e.endDeg)
			},
			{
				role: "inner-start",
				...at(e.cx, e.cy, i, e.startDeg)
			},
			{
				role: "inner-mid",
				...at(e.cx, e.cy, i, a)
			},
			{
				role: "inner-end",
				...at(e.cx, e.cy, i, e.endDeg)
			}
		];
	}
	let t = it(e);
	return [
		{
			role: "nw",
			...t[0]
		},
		{
			role: "ne",
			...t[1]
		},
		{
			role: "se",
			...t[2]
		},
		{
			role: "sw",
			...t[3]
		}
	];
}
//#endregion
//#region src/seatmap/config.js
var D = b({
	defaultCategories: null,
	seatDefaults: {
		size: 12,
		seatPitch: 16,
		rowPitch: 24
	},
	limits: { ...ie },
	zoom: {
		step: ue,
		min: .02,
		max: 25,
		wheelZoom: !0,
		stickSpeed: 1
	},
	ui: {
		topBar: !0,
		toolBar: !0,
		sidePanel: !0,
		statusBar: !0,
		zoomPad: !0
	},
	tools: null
}), ft = [
	"defaultCategories",
	"seatDefaults",
	"limits",
	"zoom",
	"ui",
	"tools"
];
function pt(e = {}) {
	for (let [t, n] of Object.entries(e || {})) {
		if (!ft.includes(t)) {
			console.warn(`[seatmap] 未知 option：${t}（已忽略）`);
			continue;
		}
		if (n !== void 0) {
			if (t === "defaultCategories" || t === "tools") {
				if (n !== null && !Array.isArray(n)) {
					console.warn(`[seatmap] option ${t} 需为数组或 null（已忽略）`);
					continue;
				}
				D[t] = n ? [...n] : null;
				continue;
			}
			if (typeof n != "object" || !n || Array.isArray(n)) {
				console.warn(`[seatmap] option ${t} 需为对象（已忽略）`);
				continue;
			}
			for (let [e, r] of Object.entries(n)) {
				if (!(e in D[t])) {
					console.warn(`[seatmap] 未知 option：${t}.${e}（已忽略）`);
					continue;
				}
				r !== void 0 && (D[t][e] = r);
			}
		}
	}
}
function mt(e) {
	return D.tools === null || D.tools.includes(e);
}
//#endregion
//#region ../packages/core/datasource.js
var ht = {
	1: "available",
	2: "sold",
	3: "reserved",
	0: "disabled"
}, gt = {
	available: 1,
	sold: 2,
	reserved: 3,
	disabled: 0
};
function _t(e, t = []) {
	let n = /* @__PURE__ */ new Map();
	for (let e of t) {
		let t = String(e.row_id);
		n.has(t) || n.set(t, []), n.get(t).push(e);
	}
	for (let e of n.values()) e.sort((e, t) => e.x - t.x);
	let r = 0;
	for (let t of e.sections) for (let e of t.rows) {
		let r = e._origin || {
			x: 0,
			y: 0,
			rot: 0
		}, i = r.rot * Math.PI / 180, a = Math.cos(i), o = Math.sin(i), s = (n.get(String(e.id)) || []).filter((e) => !e.sec_id || String(e.sec_id) === String(t.id));
		n.delete(String(e.id)), e.seats = s.map((e) => {
			let t = Ie(r.x + (e.x * a - e.y * o), r.y + (e.x * o + e.y * a), e.label ?? "", ht[e.status] ?? "available", r.rot, e.cat_id ?? null, +e.type || 1);
			return t.id = String(e.id), t;
		});
	}
	for (let e of n.values()) r += e.length;
	return r > 0 && console.warn(`[seatmap] ${r} 个座位的排已不存在，导入时跳过`), e;
}
function vt(e, t = []) {
	let n = Ye(String(e.name || "未命名场馆"));
	n.backendId = e.id ?? null, n._raw = e, n.baseScale = parseFloat(e.baseScale) || 1, n.categories = (e.categories || []).map((e) => ({
		key: e.key,
		color: e.color || "#94a3b8",
		label: String(e.label || `类别 ${e.key}`),
		accessible: !!e.accessible
	}));
	let r = (() => {
		let t = e.image;
		if (typeof t == "string") try {
			t = JSON.parse(t);
		} catch {
			t = null;
		}
		return t && typeof t == "object" && typeof t.src == "string" && t.src ? t : null;
	})();
	return n.images = r ? [{
		...Je({ src: "" }),
		...r
	}] : [], n.sections = (e.sections || []).map((e) => {
		let t = ze(e.loose ? "" : String(e.name || "未命名分区"), e.fill || "#9ca3af");
		return e.loose && (t.loose = !0), t.id = String(e.id), t._raw = e, e.cat_id != null && (t.cat_id = e.cat_id), e.watermark && (t.watermark = e.watermark), e.label && (t.label = {
			...t.label,
			...e.label
		}), t.path = e.path ? ve(e.path, +e.x || 0, +e.y || 0, 1) : "", t.rows = (e.rows || []).map((e) => {
			let t = +e.rotation || 0, n = Le(String(e.label ?? ""), [], e.seatSpacing == null ? null : +e.seatSpacing, e.rowSpacing == null ? null : +e.rowSpacing, e.labelPos ?? null);
			return n.id = String(e.id), n.curve = +e.curve || 0, n._origin = {
				x: +e.x || 0,
				y: +e.y || 0,
				rot: t
			}, n;
		}), t;
	}), _t(n, t), n;
}
function yt(e) {
	let t = e.seats;
	if (!t.length) return e._origin || {
		x: 0,
		y: 0,
		rot: 0
	};
	let n = t[0], r = t[t.length - 1], i = e._origin?.rot ?? 0;
	return t.length > 1 && Math.hypot(r.x - n.x, r.y - n.y) > .01 && (i = Math.atan2(r.y - n.y, r.x - n.x) * 180 / Math.PI), {
		x: n.x,
		y: n.y,
		rot: i
	};
}
function bt(e, t, n, r) {
	let i = yt(e), a = i.rot * Math.PI / 180, o = Math.cos(a), s = Math.sin(a), c = e.seats.map((a) => {
		let c = a.x - i.x, l = a.y - i.y;
		return {
			id: a.id,
			ven_id: n.backendId,
			sec_id: t.id,
			row_id: e.id,
			cat_id: a.cat ?? 0,
			label: String(a.n ?? ""),
			x: r(c * o + l * s),
			y: r(-c * s + l * o),
			status: gt[a.status] ?? 1,
			type: a.type ?? 1
		};
	}), l = {
		x: r(i.x),
		y: r(i.y),
		id: e.id,
		curve: +(e.curve ?? 0),
		label: String(e.label ?? ""),
		labelPos: Re(e),
		rotation: +i.rot.toFixed(4)
	};
	return e.seatSpacing != null && (l.seatSpacing = r(e.seatSpacing)), e.rowSpacing != null && (l.rowSpacing = r(e.rowSpacing)), {
		row: l,
		seats: c
	};
}
function xt(e) {
	let t = (e) => +e.toFixed(2), n = [];
	for (let r of e.sections) for (let i of r.rows) n.push(...bt(i, r, e, t).seats);
	return n;
}
function St(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of xt(e)) t.set(n.id, JSON.stringify(n));
	return t;
}
function Ct(e, t) {
	let n = [], r = [];
	for (let [r, i] of e) (!t.has(r) || t.get(r) !== i) && n.push(JSON.parse(i));
	for (let n of t.keys()) e.has(n) || r.push(n);
	return {
		upsert: n,
		del: r
	};
}
function wt(e) {
	let t = (e) => +e.toFixed(2), n = [], r = e.sections.map((r) => {
		let { pathPoints: i, ...a } = r._raw || {}, o = r.rows.map((i) => {
			let { row: a, seats: o } = bt(i, r, e, t);
			return n.push(...o), a;
		});
		return {
			...a,
			x: 0,
			y: 0,
			id: r.id,
			fill: r.color,
			name: r.name,
			path: r.path ? _e(r.path, 1) : "",
			...r.loose ? { loose: !0 } : {},
			...r.cat_id == null ? {} : { cat_id: r.cat_id },
			...r.watermark ? { watermark: r.watermark } : {},
			...r.label ? { label: r.label } : {},
			rows: o,
			type: "path"
		};
	}), { sections: i, categories: a, images: o, image: s, ...c } = e._raw || {}, l = e.images?.[0];
	return {
		venue: {
			...c,
			id: e.backendId == null ? e.backendId : String(e.backendId),
			name: e.name,
			type: c.type || "WITH_SECTION",
			baseScale: +e.baseScale || 1,
			categories: e.categories.map((e) => ({
				key: e.key,
				color: e.color,
				label: e.label,
				accessible: !!e.accessible
			})),
			image: l ? {
				...l,
				x: t(l.x),
				y: t(l.y),
				w: t(l.w),
				h: t(l.h),
				baseW: t(l.baseW),
				baseH: t(l.baseH)
			} : null,
			sections: r
		},
		seatlist: n
	};
}
var Tt = 4096, Et = null;
function Dt(e) {
	Et = typeof e == "function" ? e : null;
}
function Ot(e) {
	return new Promise((t, n) => {
		let r = new Image();
		r.onload = () => t(r), r.onerror = () => n(/* @__PURE__ */ Error("图片解析失败，请换一张试试")), r.src = e;
	});
}
async function kt(e) {
	if (!e) throw Error("未选择文件");
	if (e.size > 10 * 1024 * 1024) throw Error("图片超过 10MB，请压缩后再上传");
	if (e.type === "image/svg+xml" || /\.svg$/i.test(e.name)) {
		let t = await e.text(), n = URL.createObjectURL(new Blob([t], { type: "image/svg+xml" }));
		try {
			let r = await Ot(n).catch(() => {
				throw Error("SVG 解析失败，请检查文件");
			}), i = r.naturalWidth, a = r.naturalHeight;
			if (!i || !a) {
				let e = t.match(/viewBox=["']\s*[\d.+-]+[ ,]+[\d.+-]+[ ,]+([\d.+-]+)[ ,]+([\d.+-]+)\s*["']/);
				i = e ? +e[1] : 800, a = e ? +e[2] : 600;
			}
			return {
				bmp: r,
				w: i,
				h: a,
				name: e.name,
				svg: !0
			};
		} finally {
			URL.revokeObjectURL(n);
		}
	}
	let t = await Ot(await new Promise((t, n) => {
		let r = new FileReader();
		r.onload = () => t(r.result), r.onerror = () => n(/* @__PURE__ */ Error("图片读取失败，请重试")), r.readAsDataURL(e);
	}));
	return {
		bmp: t,
		w: t.naturalWidth,
		h: t.naturalHeight,
		name: e.name,
		svg: !1
	};
}
function At(e, t, n) {
	let r = document.createElement("canvas");
	return r.width = t, r.height = n, r.getContext("2d").drawImage(e, 0, 0, t, n), r;
}
function jt(e) {
	return new Promise((t, n) => {
		e.toBlob((e) => e ? t(e) : n(/* @__PURE__ */ Error("图片编码失败")), "image/png");
	});
}
async function Mt(e, t = Tt) {
	let n = await kt(e), r = Math.max(n.w, n.h) > t ? t / Math.max(n.w, n.h) : n.svg ? Math.min(4, t / Math.max(n.w, n.h)) : 1, i = At(n.bmp, Math.round(n.w * r), Math.round(n.h * r));
	return {
		blob: await jt(i),
		dataURL: i.toDataURL("image/png"),
		w: n.w,
		h: n.h,
		name: n.name.replace(/\.\w+$/, "") + ".png"
	};
}
async function Nt(e, { maxEdge: t = Tt } = {}) {
	if (!Et) throw Error("图片上传接口未配置，无法上传");
	let n = await Mt(e, t), r = await Et(new File([n.blob], n.name, { type: "image/png" }));
	return {
		src: String(r),
		w: n.w,
		h: n.h,
		name: n.name
	};
}
//#endregion
//#region src/seatmap/store.js
var O = b({
	venue: d(Ye()),
	tool: "select",
	mode: "sections",
	editingSectionId: null,
	activeSectionId: null,
	selection: d(/* @__PURE__ */ new Set()),
	sectionSelection: d(/* @__PURE__ */ new Set()),
	sectionsTick: 0,
	selectionTick: 0,
	sectionSelectionTick: 0,
	modeTick: 0,
	canvasTick: 0,
	imageTick: 0,
	imagePickTick: 0,
	activeImageId: null,
	imageSelected: !1,
	zoom: 1,
	catModalOpen: !1,
	labelModalOpen: !1,
	labelModalTarget: "sections",
	saving: !1,
	loadPhase: "",
	dirty: !1,
	saveFeedback: {
		tick: 0,
		type: ""
	},
	notice: "",
	canUndo: !1,
	canRedo: !1,
	pastePending: !1
});
E(() => O.canvasTick + O.sectionsTick + O.imageTick, () => {
	O.dirty = !0;
}, { flush: "sync" });
var Pt = /* @__PURE__ */ new Set(), Ft = !1, It = !1, Lt = /* @__PURE__ */ new Map(), Rt = /* @__PURE__ */ new Map(), zt = null, Bt = null, Vt = null, Ht = null, Ut = null, Wt = 0, Gt = /* @__PURE__ */ new Map();
function Kt(e, ...t) {
	for (let n of Gt.get(e) || []) try {
		n(...t);
	} catch (t) {
		console.error(`[seatmap] ${e} 事件回调异常`, t);
	}
}
var qt = [], k = [], Jt = 30;
function A(e) {
	let t = O.venue.baseScale;
	e.redo();
	let n = O.venue.baseScale;
	qt.push({
		...e,
		redo() {
			e.redo(), O.venue.baseScale = n;
		},
		undo() {
			e.undo(), O.venue.baseScale = t;
		}
	}), qt.length > Jt && qt.shift(), k.length = 0, Yt();
}
function Yt() {
	O.canUndo = qt.length > 0, O.canRedo = k.length > 0;
}
function j(e) {
	e.forEach((e) => Pt.add(e)), O.canvasTick++;
}
var Xt = 0;
function Zt() {
	Lt = /* @__PURE__ */ new Map(), Rt = /* @__PURE__ */ new Map();
	let e = 0;
	for (let t of O.venue.sections) for (let n of t.rows) {
		Rt.set(n.id, {
			row: n,
			section: t
		});
		for (let e of n.seats) Lt.set(e.id, {
			seat: e,
			row: n,
			section: t
		});
		e += n.seats.length;
	}
	Xt = e;
}
function Qt() {
	O.sectionsTick++, Ft = !0, O.canvasTick++;
}
function $t(e) {
	return O.venue.categories.find((t) => t.key === e) || null;
}
function en(e) {
	O.selection = d(e), O.selectionTick++;
}
function tn(e) {
	Zt(), vn();
	let t = [...O.selection].filter((e) => Lt.has(e));
	t.length !== O.selection.size && en(new Set(t)), O.sectionsTick++, j(e);
}
function nn(e) {
	let t = e.seats.length;
	if (t < 2) return;
	let n = Ne(e.seats[0], e.seats[t - 1], t, e.curve || 0);
	e.seats.forEach((e, t) => {
		e.x = Math.round(n[t].x * 100) / 100, e.y = Math.round(n[t].y * 100) / 100, e.r = Math.round(n[t].r * 100) / 100;
	});
}
function rn(e) {
	return O.venue.sections.find((t) => t.id === e);
}
function an() {
	return oe;
}
function on(e, t) {
	if (e = String(e || "A").trim() || "A", /^\d+$/.test(e)) return Array.from({ length: t }, (t, n) => String(+e + n));
	if (/^[A-Za-z]$/.test(e)) {
		let n = e === e.toLowerCase(), r = e.toUpperCase().charCodeAt(0) - 65;
		return Array.from({ length: t }, (e, t) => {
			let i = Ze(r + t);
			return n ? i.toLowerCase() : i;
		});
	}
	return Array.from({ length: t }, (t, n) => `${e}${n + 1}`);
}
function sn(e) {
	let t = [
		[1e3, "M"],
		[900, "CM"],
		[500, "D"],
		[400, "CD"],
		[100, "C"],
		[90, "XC"],
		[50, "L"],
		[40, "XL"],
		[10, "X"],
		[9, "IX"],
		[5, "V"],
		[4, "IV"],
		[1, "I"]
	], n = "";
	for (let [r, i] of t) for (; e >= r;) n += i, e -= r;
	return n || "I";
}
function cn(e) {
	let t = {
		I: 1,
		V: 5,
		X: 10,
		L: 50,
		C: 100,
		D: 500,
		M: 1e3
	};
	e = String(e || "I").toUpperCase();
	let n = 0;
	for (let r = 0; r < e.length; r++) {
		let i = t[e[r]] || 0;
		n += i < (t[e[r + 1]] || 0) ? -i : i;
	}
	return Math.max(1, n);
}
function ln(e, t, n) {
	if (e === "roman") {
		let e = cn(t);
		return Array.from({ length: n }, (t, n) => sn(e + n));
	}
	if (e === "odd" || e === "even") {
		let r = Math.max(0, t | 0) || (e === "even" ? 2 : 1);
		return Array.from({ length: n }, (e, t) => r + 2 * t);
	}
	if (e === "oddEven") {
		let e = Math.max(0, t | 0) || 1, r = Array.from({ length: n }, (t, n) => e + n);
		return [...r.filter((e, t) => t % 2 == 0), ...r.filter((e, t) => t % 2 == 1).reverse()];
	}
	if (e === "mirror") {
		let e = Math.max(0, t | 0) || 1, r = Array(n), i = e, a = Math.floor((n - 1) / 2);
		for (let e = a; e >= 0; e--) r[e] = i, i += 2;
		i = e + 1;
		for (let e = a + 1; e < n; e++) r[e] = i, i += 2;
		return r;
	}
	return on(t, n);
}
function un(e) {
	return Lt.get(e);
}
function M() {
	return O.venue.sections.find((e) => e.loose) || null;
}
function dn() {
	return Xt;
}
var fn = (e = O.venue) => +e?.baseScale || 1;
function pn(e) {
	return +(e / fn()).toFixed(2);
}
function mn(e) {
	for (let t of e?.rows || []) if (t.seatSpacing > 0) return t.seatSpacing;
	return e?.gen?.seatPitch > 0 ? e.gen.seatPitch : pn(16);
}
function hn(e = O.venue) {
	return +(D.seatDefaults.size / fn(e)).toFixed(2);
}
function gn(e = O.venue) {
	return +(hn(e) / .75).toFixed(2);
}
function _n() {
	dn() === 0 && (O.venue.baseScale = +O.zoom.toFixed(2));
}
function vn() {
	dn() === 0 && (O.venue.baseScale = 1);
}
function yn(e = null) {
	let t = D.limits.venueSeats - dn(), n = D.limits.sectionSeats - (e ? Xe(e) : 0);
	return Math.max(0, Math.min(D.limits.dropTotal, t, n));
}
function bn(e, t) {
	let n = [], r = t;
	for (let t of e) {
		if (r <= 0) break;
		let e = t.slice(0, Math.min(D.limits.rowSeats, r));
		e.length && (n.push(e), r -= e.length);
	}
	return n;
}
var xn = null;
function Sn(e) {
	O.notice = e, clearTimeout(xn), xn = setTimeout(() => {
		O.notice = "";
	}, 3500);
}
function Cn() {
	if (!O.selection.size) return !1;
	for (let e of O.selection) {
		let t = Lt.get(e);
		if (!t || !t.section.loose) return !1;
	}
	return !0;
}
function wn() {
	let e = M();
	if (!e || e.rows.some((e) => e.seats.length)) return null;
	let t = O.venue.sections.indexOf(e);
	return O.venue.sections = O.venue.sections.filter((t) => t !== e), {
		loose: e,
		index: t
	};
}
function Tn(e) {
	e && O.venue.sections.splice(Math.min(e.index, O.venue.sections.length), 0, e.loose);
}
function En(e, t, n = null, r = null) {
	let i = null, a = Infinity;
	for (let o of O.venue.sections) {
		if (!o.visible || r && o.id !== r) continue;
		let s = n ?? gn() / 2, c = s * s;
		for (let n of o.rows) for (let r of n.seats) {
			let n = r.x - e, o = r.y - t, s = n * n + o * o;
			s <= c && s < a && (i = r, a = s);
		}
	}
	return i;
}
function Dn(e, t, n, r, i = null) {
	let a = [];
	for (let o of O.venue.sections) if (o.visible && !(i && o.id !== i)) for (let i of o.rows) for (let o of i.seats) o.x >= e && o.x <= n && o.y >= t && o.y <= r && a.push(o.id);
	return a;
}
function On(e, t, n) {
	let r = Infinity;
	for (let i = 1; i < e.length; i++) {
		let a = we(t, n, e[i - 1].x, e[i - 1].y, e[i].x, e[i].y);
		a < r && (r = a);
	}
	return r;
}
function kn(e, t) {
	for (let n of e) if (Se(n.x, n.y, t)) return !0;
	for (let n = 1; n < e.length; n++) for (let r = 0, i = t.length - 1; r < t.length; i = r++) if (Te(e[n - 1], e[n], t[i], t[r])) return !0;
	return !1;
}
function An(e, t = null, n = null) {
	if (!e || e.length < 2) return [];
	let r = n ?? gn() * .6, i = [];
	for (let n of O.venue.sections) if (n.visible && !(t && n.id !== t)) for (let t of n.rows) t.seats.some((t) => On(e, t.x, t.y) <= r) && i.push(t.id);
	return i;
}
function jn(e, t = null, n = null) {
	if (!e || e.length < 2) return [];
	let r = n ?? gn() * .6, i = [];
	for (let n of O.venue.sections) if (n.visible && !(t && n.id !== t)) for (let t of n.rows) for (let n of t.seats) On(e, n.x, n.y) <= r && i.push(n.id);
	return i;
}
function Mn(e, t = null) {
	if (!e || e.length < 3) return [];
	let n = Ce(e), r = [];
	for (let i of O.venue.sections) if (i.visible && !(t && i.id !== t)) for (let t of i.rows) for (let i of t.seats) i.x < n.minX || i.x > n.maxX || i.y < n.minY || i.y > n.maxY || Se(i.x, i.y, e) && r.push(i.id);
	return r;
}
function Nn(e) {
	if (!e || e.length < 2) return [];
	let t = M(), n = [];
	for (let r of O.venue.sections) !r.visible || !r.path || t && r.id === t.id || kn(e, ct(r.path)) && n.push(r.id);
	return n;
}
function Pn(e, t) {
	for (let n = O.venue.sections.length - 1; n >= 0; n--) {
		let r = O.venue.sections[n];
		if (!r.visible || !r.path) continue;
		let i = ct(r.path);
		if (i.length >= 3 && Se(e, t, i)) return r;
	}
	return null;
}
function Fn(e, t, n, r) {
	let i = [];
	for (let a of O.venue.sections) {
		if (!a.visible || !a.path) continue;
		let o = Ce(ct(a.path));
		o.minX <= n && o.maxX >= e && o.minY <= r && o.maxY >= t && i.push(a.id);
	}
	return i;
}
function In(e, t) {
	let n = t.map((e) => e.section.rows), r = t.map((e) => e.section.id), i = null;
	return {
		label: e,
		redo() {
			t.forEach((e) => e.section.rows = e.next), i = wn(), tn(i ? [...r, i.loose.id] : r);
		},
		undo() {
			Tn(i), i = null, t.forEach((e, t) => e.section.rows = n[t]), tn(r);
		}
	};
}
function Ln(e, t) {
	let n = zt?.venueBounds?.();
	if (n && n.w > 0 && n.h > 0) {
		let r = Math.min(n.w * .9 / e, n.h * .9 / t), i = e * r, a = t * r;
		return {
			x: n.x + (n.w - i) / 2,
			y: n.y + (n.h - a) / 2,
			w: i,
			h: a
		};
	}
	let r = 2e3 / Math.max(e, t), i = zt?.viewCenter?.() || {
		x: 0,
		y: 0
	};
	return {
		x: i.x - e * r / 2,
		y: i.y - t * r / 2,
		w: e * r,
		h: t * r
	};
}
var N = {
	registerEditor(e) {
		zt = e;
	},
	fit: () => zt?.fit(),
	zoomIn: () => zt?.zoomIn(),
	zoomOut: () => zt?.zoomOut(),
	zoom100: () => zt?.zoom100(),
	panBy: (e, t) => zt?.panBy(e, t),
	setTool(e) {
		if (O.tool = e, e === "image") {
			let e = O.venue.images || [];
			(e.find((e) => e.id === O.activeImageId && e.visible !== !1 && !e.locked) || e.find((e) => e.visible !== !1 && !e.locked)) && this.setImageSelected(!0);
		} else e !== "select" && this.setImageSelected(!1);
	},
	setActiveSection(e) {
		O.activeSectionId = e;
	},
	setSelection: (e) => en(e),
	clearSelection() {
		O.selection.size && en(/* @__PURE__ */ new Set());
	},
	selectSectionSeats(e) {
		let t = rn(e);
		if (!t) return;
		let n = t.rows.flatMap((e) => e.seats.map((e) => e.id));
		en(new Set(n));
	},
	selectAll() {
		let e = [];
		for (let t of O.venue.sections) if (t.visible && !(O.mode === "seats" && t.id !== O.editingSectionId)) for (let n of t.rows) for (let t of n.seats) e.push(t.id);
		en(new Set(e));
	},
	addSectionFromRows(e, t, n = null) {
		let r = O.venue, i = n ? lt(n) : ut(t), a = ze(e, an(), t, n, i);
		return A({
			label: "新建分区",
			redo() {
				r.sections.push(a), O.activeSectionId = a.id, tn([a.id]);
			},
			undo() {
				r.sections = r.sections.filter((e) => e !== a), tn([a.id]);
			}
		}), a;
	},
	addGridSection(e, t, n, r) {
		_n();
		let i = {
			type: "grid",
			x: e,
			y: t,
			rows: n,
			cols: r,
			seatPitch: pn(D.seatDefaults.seatPitch),
			rowPitch: pn(D.seatDefaults.rowPitch)
		};
		return this.addSectionFromRows(`网格区 ${O.venue.sections.length + 1}`, Qe(i), i);
	},
	addSectionWithPath(e, t) {
		let n = O.venue, r = ze(e, an(), [], null, t);
		return A({
			label: "绘制分区",
			redo() {
				n.sections.push(r), O.activeSectionId = r.id, tn([r.id]);
			},
			undo() {
				n.sections = n.sections.filter((e) => e !== r), tn([r.id]);
			}
		}), r;
	},
	addRectSection(e, t, n, r) {
		let i = [
			{
				x: e,
				y: t
			},
			{
				x: e + n,
				y: t
			},
			{
				x: e + n,
				y: t + r
			},
			{
				x: e,
				y: t + r
			}
		];
		return this.addSectionWithPath(`矩形分区 ${O.venue.sections.length + 1}`, st(i));
	},
	addPolySection(e) {
		return this.addSectionWithPath(`自定义分区 ${O.venue.sections.length + 1}`, st(e));
	},
	addArcSection(e, t, n) {
		_n();
		let r = Math.atan2(n.y - e.y, n.x - e.x) * 180 / Math.PI, i = {
			type: "arc",
			cx: e.x,
			cy: e.y,
			innerR: t,
			rowCount: 8,
			startDeg: r - 50,
			endDeg: r + 50,
			seatPitch: pn(D.seatDefaults.seatPitch),
			rowPitch: pn(D.seatDefaults.rowPitch)
		};
		return this.addSectionFromRows(`弧形区 ${O.venue.sections.length + 1}`, $e(i), i);
	},
	removeSections(e) {
		let t = O.venue, n = t.sections.map((e, t) => ({
			s: e,
			i: t
		})).filter((t) => e.includes(t.s.id));
		n.length && A({
			label: "删除分区",
			redo() {
				t.sections = t.sections.filter((t) => !e.includes(t.id)), e.includes(O.activeSectionId) && (O.activeSectionId = null), tn(e);
			},
			undo() {
				n.forEach(({ s: e, i: n }) => t.sections.splice(Math.min(n, t.sections.length), 0, e)), tn(e);
			}
		});
	},
	updateSection(e, t) {
		let n = rn(e);
		if (!n) return;
		let r = {};
		for (let e in t) r[e] = n[e];
		A({
			label: "修改分区",
			redo() {
				Object.assign(n, t), O.sectionsTick++, j([e]);
			},
			undo() {
				Object.assign(n, r), O.sectionsTick++, j([e]);
			}
		});
	},
	regenSection(e, t) {
		let n = rn(e);
		if (!n?.gen) return;
		let r = {
			gen: n.gen,
			rows: n.rows,
			path: n.path
		}, i = {
			...r.gen,
			...t
		}, a = tt(i), o = a.reduce((e, t) => e + t.seats.length, 0);
		if (o > D.limits.sectionSeats || dn() - Xe(n) + o > D.limits.venueSeats) {
			Sn(`生成参数超出数量上限（单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未应用`);
			return;
		}
		let s = lt(i);
		A({
			label: "重新生成座位",
			redo() {
				n.gen = i, n.rows = a, n.path = s, tn([e]);
			},
			undo() {
				Object.assign(n, r), tn([e]);
			}
		});
	},
	addRowToActive(e) {
		this.addRowsByDrop([e]);
	},
	addRowsByDrop(e) {
		if (!e?.length || !e[0]?.length) return;
		_n();
		let t = O.venue, n = M(), r = n ? null : Be(), i = n || r, a = bn(e, yn(i));
		if (!a.length) {
			Sn(`已达数量上限（单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未添加座位`);
			return;
		}
		let o = a.map((e) => Le("", e));
		A({
			label: "绘制座位",
			redo() {
				r && !t.sections.includes(r) && t.sections.push(r), i.rows.push(...o), tn([i.id]);
			},
			undo() {
				i.rows = i.rows.filter((e) => !o.includes(e)), r && (t.sections = t.sections.filter((e) => e !== r)), tn([i.id]);
			}
		});
	},
	convertRowsToSection(e) {
		let t = O.venue, n = M();
		if (!n) return;
		let r = n.rows.filter((t) => e.includes(t.id));
		if (!r.length) return;
		let i = ze(`分区 ${t.sections.length + 1}`, an(), r, null, ut(r)), a = n.rows, o = n.rows.filter((t) => !e.includes(t.id)), s = null;
		A({
			label: "转为分区",
			redo() {
				n.rows = o, t.sections.push(i), s = wn(), tn([n.id, i.id]);
			},
			undo() {
				t.sections = t.sections.filter((e) => e !== i), Tn(s), s = null, n.rows = a, tn([n.id, i.id]);
			}
		}), O.mode === "seats" ? this.exitSection() : en(/* @__PURE__ */ new Set()), this.setSectionSelection([i.id]);
	},
	addRowsToSection(e, t) {
		_n();
		let n = rn(e);
		if (!n || !t.length) return;
		let r = bn(t, yn(n));
		if (!r.length) {
			Sn(`已达数量上限（单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未添加座位`);
			return;
		}
		n.cat_id != null && r.forEach((e) => e.forEach((e) => {
			e.cat ??= n.cat_id;
		}));
		let i = r.map((e) => Le("", e));
		A({
			label: "绘制座位",
			redo() {
				n.rows.push(...i), tn([e]);
			},
			undo() {
				n.rows = n.rows.filter((e) => !i.includes(e)), tn([e]);
			}
		});
	},
	replaceVenueImage({ src: e, w: t, h: n, name: r = "" }) {
		let i = O.venue.images, a = O.activeImageId, o = Ln(t, n), s = Je({
			src: e,
			...o,
			baseW: o.w,
			baseH: o.h,
			name: r || "参考底图"
		});
		return A({
			label: i.length ? "替换底图" : "上传底图",
			redo() {
				O.venue.images = [s], O.activeImageId = s.id, O.imageTick++;
			},
			undo() {
				O.venue.images = i, O.activeImageId = a, O.imageTick++;
			}
		}), s;
	},
	addVenueImage({ src: e, w: t, h: n, name: r = "" }) {
		let i = Ln(t, n), a = Je({
			src: e,
			...i,
			baseW: i.w,
			baseH: i.h,
			name: r || `图片 ${O.venue.images.length + 1}`
		});
		return A({
			label: "上传底图",
			redo() {
				O.venue.images.push(a), O.activeImageId = a.id, O.imageTick++;
			},
			undo() {
				O.venue.images = O.venue.images.filter((e) => e !== a), O.activeImageId === a.id && (O.activeImageId = O.venue.images.at(-1)?.id ?? null), O.imageTick++;
			}
		}), a;
	},
	imageById(e) {
		return O.venue.images.find((t) => t.id === e) || null;
	},
	setActiveImage(e) {
		O.activeImageId = e, O.imageTick++;
	},
	setImageSelected(e) {
		e = !!e, O.imageSelected !== e && (O.imageSelected = e, e && O.sectionSelection.size && this.setSectionSelection([]), O.imageTick++);
	},
	pickImages() {
		O.imagePickTick++;
	},
	moveVenueImage(e, t, n) {
		let r = this.imageById(e);
		r && A({
			label: "移动底图",
			redo() {
				r.x += t, r.y += n, O.imageTick++;
			},
			undo() {
				r.x -= t, r.y -= n, O.imageTick++;
			}
		});
	},
	rotateVenueImage(e, t) {
		let n = this.imageById(e);
		if (!n || !t) return;
		let r = n.rotation || 0, i = ((r + t) % 360 + 360) % 360;
		A({
			label: "旋转底图",
			redo() {
				n.rotation = i, O.imageTick++;
			},
			undo() {
				n.rotation = r, O.imageTick++;
			}
		});
	},
	transformVenueImage(e, t) {
		let n = this.imageById(e);
		if (!n) return;
		let r = {
			x: n.x,
			y: n.y,
			w: n.w,
			h: n.h
		};
		A({
			label: "调整底图",
			redo() {
				Object.assign(n, t), O.imageTick++;
			},
			undo() {
				Object.assign(n, r), O.imageTick++;
			}
		});
	},
	previewImageTransform(e, t) {
		let n = this.imageById(e);
		n && (Object.assign(n, t), O.imageTick++);
	},
	setImageScale(e, t) {
		let n = this.imageById(e);
		if (!n) return;
		t = Math.min(50, Math.max(.01, +t || 1));
		let r = n.baseW || n.w, i = n.baseH || n.h, a = r * t, o = i * t, s = n.x + n.w / 2, c = n.y + n.h / 2;
		this.transformVenueImage(e, {
			x: s - a / 2,
			y: c - o / 2,
			w: a,
			h: o
		});
	},
	fitVenueImage(e) {
		let t = this.imageById(e);
		if (!t) return;
		let n = Ln(t.baseW || t.w, t.baseH || t.h), r = {
			x: t.x,
			y: t.y,
			w: t.w,
			h: t.h,
			baseW: t.baseW,
			baseH: t.baseH
		}, i = {
			...n,
			baseW: n.w,
			baseH: n.h
		};
		A({
			label: "适配场馆",
			redo() {
				Object.assign(t, i), O.imageTick++;
			},
			undo() {
				Object.assign(t, r), O.imageTick++;
			}
		});
	},
	removeVenueImage(e) {
		let t = O.venue.images.findIndex((t) => t.id === e);
		if (t < 0) return;
		let n = O.venue.images[t];
		A({
			label: "删除底图",
			redo() {
				O.venue.images = O.venue.images.filter((e) => e !== n), O.activeImageId === n.id && (O.activeImageId = O.venue.images.at(-1)?.id ?? null), O.imageSelected = !1, O.imageTick++;
			},
			undo() {
				O.venue.images.splice(Math.min(t, O.venue.images.length), 0, n), O.activeImageId = n.id, O.imageTick++;
			}
		});
	},
	reorderVenueImage(e, t) {
		let n = O.venue.images.findIndex((t) => t.id === e), r = n + (t > 0 ? 1 : -1);
		n < 0 || r < 0 || r >= O.venue.images.length || A({
			label: "底图层序",
			redo() {
				let e = O.venue.images;
				[e[n], e[r]] = [e[r], e[n]], O.imageTick++;
			},
			undo() {
				let e = O.venue.images;
				[e[r], e[n]] = [e[n], e[r]], O.imageTick++;
			}
		});
	},
	openCategoryModal() {
		O.catModalOpen = !0;
	},
	closeCategoryModal() {
		O.catModalOpen = !1;
	},
	openLabelModal(e = "sections") {
		O.labelModalTarget = e, O.labelModalOpen = !0;
	},
	closeLabelModal() {
		O.labelModalOpen = !1;
	},
	on(e, t) {
		return Gt.has(e) || Gt.set(e, /* @__PURE__ */ new Set()), Gt.get(e).add(t), () => Gt.get(e)?.delete(t);
	},
	off(e, t) {
		Gt.get(e)?.delete(t);
	},
	setSaveHandler(e) {
		Bt = typeof e == "function" ? e : null;
	},
	setImageUploader(e) {
		Dt(e);
	},
	setLoadPhase(e) {
		O.loadPhase = ["venue", "seats"].includes(e) ? e : "";
	},
	setData(e, t = []) {
		this.loadVenue(vt(e, t)), Vt = St(O.venue), Ht = JSON.stringify(wt(O.venue).venue);
	},
	mergeBackendSeats(e = []) {
		_t(O.venue, e), Zt(), Ft = !0, O.canvasTick++, Vt = St(O.venue), O.dirty = !1;
	},
	renameVenue(e) {
		let t = String(e || "").trim().slice(0, 50);
		!t || t === O.venue.name || (O.venue.name = t, O.sectionsTick++);
	},
	newVenue(e) {
		let t = typeof e == "string" ? { name: e } : e || {}, n = Ye(t.name || "未命名场馆");
		t.id != null && t.id !== "" && (n.backendId = String(t.id));
		let { id: r, name: i, ...a } = t;
		Object.keys(a).length && (n._raw = { ...a }), n.categories = (D.defaultCategories ?? [{
			name: "普通区",
			color: "#4CAF50"
		}, {
			name: "VIP区",
			color: "#E91E63"
		}]).map((e, t) => ({
			key: t + 1,
			color: e.color,
			label: e.name,
			accessible: !!e.accessible
		})), this.loadVenue(n);
	},
	async saveToBackend() {
		if (O.saving) return { saved: !1 };
		O.saving = !0;
		try {
			let e = !O.venue.backendId;
			e && (O.venue.backendId = Fe("venue"));
			let { venue: t, seatlist: n } = wt(O.venue), r = JSON.stringify(t), i;
			if (!Vt) i = {
				save_type: "full",
				venue: t,
				seatlist: n
			};
			else {
				let { upsert: e, del: n } = Ct(St(O.venue), Vt);
				if (!e.length && !n.length && r === Ht) return {
					saved: !1,
					empty: !0
				};
				i = {
					save_type: "delta",
					venue: t,
					seat_upsert: e,
					seat_delete: n
				};
			}
			{
				let e = (e) => e >= 1048576 ? `${(e / 1048576).toFixed(2)} MB` : `${(e / 1024).toFixed(1)} KB`, t = JSON.stringify(i.save_type === "full" ? { seatlist: i.seatlist } : {
					seat_upsert: i.seat_upsert,
					seat_delete: i.seat_delete
				}).length, n = i.save_type === "full" ? i.seatlist.length : i.seat_upsert.length + i.seat_delete.length, a = r.length + t + 30;
				console.log(`[seatmap] 保存 ${i.save_type}：座位 ${n} 条 ${e(t)} ｜ venue 主体 ${e(r.length)} ｜ 请求共 ${e(a)}`);
			}
			if (Bt) {
				if (await Bt(i) !== !0) throw Error("宿主保存接口返回失败");
			} else throw Error("未配置保存通道：请用 setSaveHandler 注入宿主导函数");
			return Vt = St(O.venue), Ht = r, O.dirty = !1, e && Kt("venue", O.venue.backendId), Kt("save", i), { saved: !0 };
		} finally {
			O.saving = !1;
		}
	},
	async uiSave() {
		if (!O.saving) try {
			let e = await this.saveToBackend();
			e?.empty && (O.dirty = !1), O.saveFeedback = {
				tick: O.saveFeedback.tick + 1,
				type: e?.empty ? "empty" : "saved"
			};
		} catch (e) {
			alert(e.message);
		}
	},
	getSavePayload: () => ({
		save_type: "full",
		...wt(O.venue)
	}),
	setImageOpacity(e, t) {
		let n = this.imageById(e);
		n && (n.opacity = Math.min(1, Math.max(0, t)), O.imageTick++);
	},
	setImageLocked(e, t) {
		let n = this.imageById(e);
		n && (n.locked = !!t, O.imageTick++);
	},
	setImageVisible(e, t) {
		let n = this.imageById(e);
		n && (n.visible = !!t, O.imageTick++);
	},
	enterSection(e) {
		rn(e) && (O.mode = "seats", O.editingSectionId = e, O.activeSectionId = e, O.tool = "select", O.imageSelected = !1, en(/* @__PURE__ */ new Set()), O.modeTick++);
	},
	exitSection() {
		O.mode !== "sections" && (O.mode = "sections", O.editingSectionId = null, O.tool = "select", en(/* @__PURE__ */ new Set()), O.modeTick++);
	},
	setSectionSelection(e) {
		O.sectionSelection = d(new Set(e)), O.sectionSelectionTick++, e.length && O.imageSelected && (O.imageSelected = !1, O.imageTick++), O.activeSectionId = e.length ? e[e.length - 1] : null, O.sectionsTick++;
	},
	clearSectionSelection() {
		O.sectionSelection.size && this.setSectionSelection([]);
	},
	moveSections(e, t, n) {
		let r = e.map((e) => rn(e)).filter(Boolean);
		if (!r.length) return;
		let i = (t, n) => {
			for (let e of r) {
				e.path &&= ge(e.path, t, n);
				for (let r of e.rows) for (let e of r.seats) e.x += t, e.y += n;
				e.gen?.type === "grid" && (e.gen.x += t, e.gen.y += n), e.gen?.type === "arc" && (e.gen.cx += t, e.gen.cy += n);
			}
			j(e);
		};
		A({
			label: "移动分区",
			redo: () => i(t, n),
			undo: () => i(-t, -n)
		});
	},
	rotateSections(e, t, n) {
		let r = e.map((e) => rn(e)).filter(Boolean);
		if (!r.length || !t) return;
		let i = r.map((e) => ({
			s: e,
			path: e.path,
			gen: e.gen,
			seats: e.rows.flatMap((e) => e.seats.map((e) => ({
				seat: e,
				x: e.x,
				y: e.y,
				r: e.r || 0
			})))
		}));
		A({
			label: "旋转分区",
			redo() {
				for (let e of r) {
					e.path &&= st(ct(e.path).map((e) => ye(e.x, e.y, n.x, n.y, t)));
					for (let r of e.rows) for (let e of r.seats) {
						let r = ye(e.x, e.y, n.x, n.y, t);
						e.x = r.x, e.y = r.y, e.r = ((e.r || 0) + t) % 360;
					}
					e.gen = null;
				}
				j(e);
			},
			undo() {
				for (let e of i) {
					e.s.path = e.path, e.s.gen = e.gen;
					for (let { seat: t, x: n, y: r, r: i } of e.seats) t.x = n, t.y = r, t.r = i;
				}
				j(e);
			}
		});
	},
	reshapeSection(e, t) {
		let n = rn(e);
		if (!n) return;
		let r = {
			gen: n.gen,
			path: n.path,
			rows: n.rows
		}, i = {
			gen: t,
			path: lt(t),
			rows: tt(t)
		}, a = i.rows.reduce((e, t) => e + t.seats.length, 0);
		if (a > D.limits.sectionSeats || dn() - Xe(n) + a > D.limits.venueSeats) {
			Sn(`调整结果超出数量上限（单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未应用`);
			return;
		}
		A({
			label: "调整分区形状",
			redo() {
				Object.assign(n, i), tn([e]);
			},
			undo() {
				Object.assign(n, r), tn([e]);
			}
		});
	},
	updateSectionPath(e, t) {
		let n = rn(e);
		if (!n || !t || n.path === t) return;
		let r = n.path;
		A({
			label: "节点编辑",
			redo() {
				n.path = t, j([e]);
			},
			undo() {
				n.path = r, j([e]);
			}
		});
	},
	resizeRows(e, t, n) {
		let r = rn(O.editingSectionId) || M();
		if (!r || !Number.isInteger(n) || !n || t !== "start" && t !== "end") return;
		let i = r.rows.filter((t) => e.includes(t.id) && t.seats.length >= 2);
		if (!i.length) return;
		if (n > 0) {
			let e = Math.max(0, Math.min(D.limits.sectionSeats - Xe(r), D.limits.venueSeats - dn())), t = Math.min(...i.map((e) => D.limits.rowSeats - e.seats.length)), a = Math.min(n, t, Math.floor(e / i.length));
			if (a <= 0) {
				Sn(`已达数量上限（单排 ${D.limits.rowSeats} / 单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未增加座位`);
				return;
			}
			a !== n && Sn(`受数量上限限制，本次每排仅增加 ${a} 座`), n = a;
		}
		let a = i.map((e) => ({
			row: e,
			step: ke(e, t),
			before: e.seats.map((e) => ({ ...e }))
		})), o = ({ step: e, before: r }) => {
			let i = Math.max(1, r.length + n), a = r.some((e) => e.n !== "" && e.n != null), o = a ? on(r[0].n ?? 1, i) : null, s = typeof r[0].n == "number", c = (e) => s && /^\d+$/.test(o[e]) ? +o[e] : o[e], l = [];
			for (let n = 0; n < i; n++) {
				let o = t === "end" ? n < r.length ? r[n] : null : n >= i - r.length ? r[n - (i - r.length)] : null;
				if (o) {
					l.push(a ? {
						...o,
						n: c(n)
					} : { ...o });
					continue;
				}
				if (t === "end") {
					let t = r[r.length - 1], i = n - r.length + 1;
					l.push(Ie(t.x + e.x * i, t.y + e.y * i, a ? c(n) : "", t.status, t.r || 0, t.cat ?? null, t.type ?? 1));
				} else {
					let t = r[0], o = i - r.length - n;
					l.push(Ie(t.x + e.x * o, t.y + e.y * o, a ? c(n) : "", t.status, t.r || 0, t.cat ?? null, t.type ?? 1));
				}
			}
			return l;
		}, s = () => en(new Set(i.flatMap((e) => e.seats.map((e) => e.id))));
		A({
			label: "调整排长",
			redo() {
				for (let e of a) e.row.seats = o(e), e.row.curve && nn(e.row);
				tn([r.id]), s();
			},
			undo() {
				for (let e of a) e.row.seats = e.before.map((e) => ({ ...e }));
				tn([r.id]), s();
			}
		});
	},
	rotateSeats(e, t, n) {
		let r = [], i = /* @__PURE__ */ new Set();
		for (let t of e) {
			let e = Lt.get(t);
			e && (r.push({
				seat: e.seat,
				x: e.seat.x,
				y: e.seat.y,
				r: e.seat.r || 0
			}), i.add(e.section.id));
		}
		if (!r.length || !t) return;
		let a = [...i];
		A({
			label: "旋转座位",
			redo() {
				for (let e of r) {
					let r = ye(e.x, e.y, n.x, n.y, t);
					e.seat.x = r.x, e.seat.y = r.y, e.seat.r = (e.r + t) % 360;
				}
				j(a);
			},
			undo() {
				for (let e of r) e.seat.x = e.x, e.seat.y = e.y, e.seat.r = e.r;
				j(a);
			}
		});
	},
	moveSeats(e, t, n) {
		let r = [], i = /* @__PURE__ */ new Set();
		for (let t of e) {
			let e = Lt.get(t);
			e && (r.push({
				seat: e.seat,
				fx: e.seat.x,
				fy: e.seat.y
			}), i.add(e.section.id));
		}
		if (!r.length) return;
		let a = [...i];
		A({
			label: "移动座位",
			redo() {
				r.forEach((e) => {
					e.seat.x = Math.round((e.fx + t) * 100) / 100, e.seat.y = Math.round((e.fy + n) * 100) / 100;
				}), j(a);
			},
			undo() {
				r.forEach((e) => {
					e.seat.x = e.fx, e.seat.y = e.fy;
				}), j(a);
			}
		});
	},
	setSeatsStatus(e, t) {
		gt[t] || (t = "available");
		let n = [], r = /* @__PURE__ */ new Set();
		for (let i of e) {
			let e = Lt.get(i);
			e && e.seat.status !== t && (n.push({
				seat: e.seat,
				before: e.seat.status
			}), r.add(e.section.id));
		}
		if (!n.length) return;
		let i = [...r];
		A({
			label: "设置状态",
			redo() {
				n.forEach((e) => e.seat.status = t), j(i);
			},
			undo() {
				n.forEach((e) => e.seat.status = e.before), j(i);
			}
		});
	},
	setSelectedStatus(e) {
		this.setSeatsStatus([...O.selection], e);
	},
	setSeatsType(e, t) {
		t = +t || 1;
		let n = [], r = /* @__PURE__ */ new Set();
		for (let i of e) {
			let e = Lt.get(i);
			e && (e.seat.type ?? 1) !== t && (n.push({
				seat: e.seat,
				before: e.seat.type ?? 1
			}), r.add(e.section.id));
		}
		if (!n.length) return;
		let i = [...r];
		A({
			label: "设置座位类型",
			redo() {
				n.forEach((e) => e.seat.type = t), j(i);
			},
			undo() {
				n.forEach((e) => e.seat.type = e.before), j(i);
			}
		});
	},
	setSelectedType(e) {
		this.setSeatsType([...O.selection], e);
	},
	addCategory({ label: e, color: t, accessible: n = !1 } = {}) {
		let r = Math.max(0, ...O.venue.categories.map((e) => +e.key || 0)) + 1, i = {
			key: r,
			label: e || `类别 ${r}`,
			color: t || ae[(r - 1) % ae.length],
			accessible: !!n
		};
		return A({
			label: "添加类别",
			redo() {
				O.venue.categories.push(i), O.sectionsTick++;
			},
			undo() {
				O.venue.categories = O.venue.categories.filter((e) => e !== i), O.sectionsTick++;
			}
		}), i;
	},
	updateCategory(e, t) {
		let n = $t(e);
		if (!n) return;
		let r = {};
		for (let e in t) r[e] = n[e];
		A({
			label: "修改类别",
			redo() {
				Object.assign(n, t), Qt();
			},
			undo() {
				Object.assign(n, r), Qt();
			}
		});
	},
	removeCategory(e) {
		let t = $t(e);
		if (!t) return;
		let n = [];
		for (let t of O.venue.sections) for (let r of t.rows) for (let t of r.seats) t.cat === e && n.push(t);
		A({
			label: "删除类别",
			redo() {
				O.venue.categories = O.venue.categories.filter((e) => e !== t), n.forEach((e) => e.cat = null), Qt();
			},
			undo() {
				O.venue.categories.push(t), n.forEach((t) => t.cat = e), Qt();
			}
		});
	},
	setSeatsCategory(e, t) {
		let n = [], r = /* @__PURE__ */ new Set();
		for (let i of e) {
			let e = Lt.get(i);
			e && (e.seat.cat ?? null) !== t && (n.push({
				seat: e.seat,
				before: e.seat.cat ?? null
			}), r.add(e.section.id));
		}
		if (!n.length) return;
		let i = [...r];
		A({
			label: "设置类别",
			redo() {
				n.forEach((e) => e.seat.cat = t), j(i);
			},
			undo() {
				n.forEach((e) => e.seat.cat = e.before), j(i);
			}
		});
	},
	setSelectedCategory(e) {
		this.setSeatsCategory([...O.selection], e);
	},
	selectedRows() {
		let e = /* @__PURE__ */ new Map();
		for (let t of O.selection) {
			let n = Lt.get(t);
			n && e.set(n.row.id, n.row);
		}
		return [...e.values()];
	},
	updateRowLabel(e, t) {
		let n = Rt.get(e);
		if (!n || n.row.label === t) return;
		let r = n.row.label;
		A({
			label: "修改排标签",
			redo() {
				n.row.label = t, j([n.section.id]);
			},
			undo() {
				n.row.label = r, j([n.section.id]);
			}
		});
	},
	labelRows(e, t = "A", n = !1, r = null) {
		let i = e.map((e) => Rt.get(e)).filter(Boolean);
		if (i.length === 1) {
			this.updateRowLabel(e[0], t);
			return;
		}
		if (i.length < 2) return;
		let a = i.map((e) => e.row);
		n && a.reverse();
		let o = ln(r, t, a.length), s = a.map((e, t) => ({
			row: e,
			before: e.label,
			next: o[t]
		})).filter((e) => e.before !== e.next);
		if (!s.length) return;
		let c = [...new Set(i.map((e) => e.section.id))];
		A({
			label: "批量排标签",
			redo() {
				s.forEach((e) => e.row.label = e.next), j(c);
			},
			undo() {
				s.forEach((e) => e.row.label = e.before), j(c);
			}
		});
	},
	clearRowLabels(e) {
		let t = e.map((e) => Rt.get(e)).filter(Boolean), n = t.filter((e) => e.row.label !== "").map((e) => ({
			row: e.row,
			before: e.row.label
		}));
		if (!n.length) return;
		let r = [...new Set(t.map((e) => e.section.id))];
		A({
			label: "清除排标签",
			redo() {
				n.forEach((e) => e.row.label = ""), j(r);
			},
			undo() {
				n.forEach((e) => e.row.label = e.before), j(r);
			}
		});
	},
	setRowLabelPos(e, t) {
		if (![
			"start",
			"end",
			"both",
			"none"
		].includes(t)) return;
		let n = e.map((e) => Rt.get(e)).filter(Boolean), r = n.map((e) => ({
			row: e.row,
			before: e.row.labelPos ?? null
		})).filter((e) => (e.before ?? "both") !== t);
		if (!r.length) return;
		let i = [...new Set(n.map((e) => e.section.id))];
		A({
			label: "排标签位置",
			redo() {
				r.forEach((e) => e.row.labelPos = t), j(i);
			},
			undo() {
				r.forEach((e) => e.row.labelPos = e.before), j(i);
			}
		});
	},
	labelSections(e, t = "1", n = !1, r = null) {
		let i = e.map((e) => O.venue.sections.find((t) => t.id === e)).filter(Boolean);
		if (!i.length) return;
		n && i.reverse();
		let a = ln(r, t, i.length), o = i.map((e, t) => ({
			s: e,
			before: e.name,
			next: a[t]
		})).filter((e) => e.before !== e.next);
		if (!o.length) return;
		let s = o.map((e) => e.s.id);
		A({
			label: "批量分区标签",
			redo() {
				o.forEach((e) => e.s.name = e.next), O.sectionsTick++, j(s);
			},
			undo() {
				o.forEach((e) => e.s.name = e.before), O.sectionsTick++, j(s);
			}
		});
	},
	clearSectionLabels(e) {
		let t = e.map((e) => O.venue.sections.find((t) => t.id === e)).filter((e) => e && e.name !== "").map((e) => ({
			s: e,
			before: e.name
		}));
		if (!t.length) return;
		let n = t.map((e) => e.s.id);
		A({
			label: "清除分区标签",
			redo() {
				t.forEach((e) => e.s.name = ""), O.sectionsTick++, j(n);
			},
			undo() {
				t.forEach((e) => e.s.name = e.before), O.sectionsTick++, j(n);
			}
		});
	},
	updateSectionLabel(e, t) {
		let n = e.map((e) => O.venue.sections.find((t) => t.id === e)).filter(Boolean);
		if (!n.length) return;
		let r = n.map((e) => ({
			s: e,
			before: Ge(e)
		})), i = n.map((e) => e.id);
		A({
			label: "修改标签样式",
			redo() {
				r.forEach((e) => {
					e.s.label = {
						...Ge(e.s),
						...t
					};
				}), j(i);
			},
			undo() {
				r.forEach((e) => {
					e.s.label = e.before;
				}), j(i);
			}
		});
	},
	updateSectionWatermark(e, t) {
		let n = e.map((e) => O.venue.sections.find((t) => t.id === e)).filter(Boolean);
		if (!n.length) return;
		let r = n.map((e) => ({
			s: e,
			before: qe(e)
		})), i = n.map((e) => e.id);
		A({
			label: "修改水印",
			redo() {
				r.forEach((e) => {
					e.s.watermark = {
						...qe(e.s),
						...t
					};
				}), j(i);
			},
			undo() {
				r.forEach((e) => {
					e.s.watermark = e.before;
				}), j(i);
			}
		});
	},
	renumberSeats(e, t = 1, n = 1, r = null) {
		let i = e.map((e) => Rt.get(e)).filter(Boolean);
		if (!i.length) return;
		let a = [];
		for (let { row: e } of i) {
			let i = Oe(e);
			n < 0 && i.reverse();
			let o = r && r !== "num" ? ln(r, String(t || "A"), i.length) : i.map((e, n) => (Math.max(0, t | 0) || 0) + n);
			i.forEach((e, t) => {
				e.n !== o[t] && a.push({
					seat: e,
					before: e.n,
					next: o[t]
				});
			});
		}
		if (!a.length) return;
		let o = [...new Set(i.map((e) => e.section.id))];
		A({
			label: "批量座位编号",
			redo() {
				a.forEach((e) => e.seat.n = e.next), j(o);
			},
			undo() {
				a.forEach((e) => e.seat.n = e.before), j(o);
			}
		});
	},
	clearSeatNumbers(e) {
		let t = e.map((e) => Rt.get(e)).filter(Boolean), n = [];
		for (let { row: e } of t) e.seats.forEach((e) => {
			e.n !== "" && n.push({
				seat: e,
				before: e.n
			});
		});
		if (!n.length) return;
		let r = [...new Set(t.map((e) => e.section.id))];
		A({
			label: "清除座位编号",
			redo() {
				n.forEach((e) => e.seat.n = ""), j(r);
			},
			undo() {
				n.forEach((e) => e.seat.n = e.before), j(r);
			}
		});
	},
	renumberSelectedSeats(e, t = 1, n = 1, r = null) {
		let i = /* @__PURE__ */ new Map();
		for (let t of e) {
			let e = Lt.get(t);
			e && (i.has(e.row) || i.set(e.row, {
				ids: /* @__PURE__ */ new Set(),
				section: e.section
			}), i.get(e.row).ids.add(t));
		}
		if (!i.size) return;
		let a = [];
		for (let [e, { ids: o }] of i) {
			let i = Oe(e).filter((e) => o.has(e.id));
			n < 0 && i.reverse();
			let s = r && r !== "num" ? ln(r, String(t || "A"), i.length) : i.map((e, n) => (Math.max(0, t | 0) || 0) + n);
			i.forEach((e, t) => {
				e.n !== s[t] && a.push({
					seat: e,
					before: e.n,
					next: s[t]
				});
			});
		}
		if (!a.length) return;
		let o = [...new Set([...i.values()].map((e) => e.section.id))];
		A({
			label: "批量座位编号",
			redo() {
				a.forEach((e) => e.seat.n = e.next), j(o);
			},
			undo() {
				a.forEach((e) => e.seat.n = e.before), j(o);
			}
		});
	},
	clearSelectedSeatNumbers(e) {
		let t = [], n = /* @__PURE__ */ new Set();
		for (let r of e) {
			let e = Lt.get(r);
			!e || e.seat.n === "" || (t.push({
				seat: e.seat,
				before: e.seat.n
			}), n.add(e.section.id));
		}
		t.length && A({
			label: "清除座位编号",
			redo() {
				t.forEach((e) => e.seat.n = ""), j([...n]);
			},
			undo() {
				t.forEach((e) => e.seat.n = e.before), j([...n]);
			}
		});
	},
	setRowsSeatSpacing(e, t) {
		t = Math.max(4, +t || 0);
		let n = e.map((e) => Rt.get(e)).filter(Boolean), r = [];
		for (let { row: e } of n) e.seats.length < 2 || r.push({
			row: e,
			curved: !!e.curve,
			before: e.seats.map((e) => ({ ...e })),
			beforeSpacing: e.seatSpacing ?? null
		});
		if (!r.length) return;
		let i = [...new Set(n.map((e) => e.section.id))], a = (e, t) => {
			if (e.curve) {
				let n = e.seats, r = 0;
				for (let e = 1; e < n.length; e++) r += Math.hypot(n[e].x - n[e - 1].x, n[e].y - n[e - 1].y);
				let i = Math.max(2, Math.min(500, Math.round(r / t) + 1)), a = Ne({
					x: n[0].x,
					y: n[0].y
				}, {
					x: n[n.length - 1].x,
					y: n[n.length - 1].y
				}, i, e.curve), o = [];
				for (let e = 0; e < i; e++) {
					let t = e < n.length ? n[e] : null, r = t ? { ...t } : Ie(0, 0, 0);
					r.n = e + 1, r.x = Math.round(a[e].x * 100) / 100, r.y = Math.round(a[e].y * 100) / 100, r.r = Math.round(a[e].r * 100) / 100, o.push(r);
				}
				e.seats = o;
			} else {
				let n = De(e), r = Oe(e), i = r[0];
				r.forEach((e, r) => {
					e.x = Math.round((i.x + n.x * t * r) * 100) / 100, e.y = Math.round((i.y + n.y * t * r) * 100) / 100;
				});
			}
			e.seatSpacing = t;
		};
		A({
			label: "座位间距",
			redo() {
				r.forEach((e) => a(e.row, t)), r.some((e) => e.curved) ? tn(i) : j(i);
			},
			undo() {
				r.forEach((e) => {
					e.curved ? e.row.seats = e.before.map((e) => ({ ...e })) : e.before.forEach((t, n) => {
						let r = e.row.seats[n];
						r.x = t.x, r.y = t.y, r.r = t.r;
					}), e.row.seatSpacing = e.beforeSpacing;
				}), r.some((e) => e.curved) ? tn(i) : j(i);
			}
		});
	},
	setRowsRotation(e, t) {
		t = Math.max(-90, Math.min(90, +t || 0));
		let n = e.map((e) => Rt.get(e)).filter(Boolean), r = [];
		for (let { row: e } of n) {
			if (e.seats.length < 2) continue;
			let n = e.seats[0], i = e.seats[e.seats.length - 1], a = Math.atan2(i.y - n.y, i.x - n.x) * 180 / Math.PI, o = t - a;
			for (; o > 90;) o -= 180;
			for (; o < -90;) o += 180;
			if (Math.abs(o) < 1e-6) continue;
			let s = Ae(e);
			r.push({
				row: e,
				delta: o,
				c: s,
				before: e.seats.map((e) => ({
					s: e,
					x: e.x,
					y: e.y,
					r: e.r || 0
				}))
			});
		}
		if (!r.length) return;
		let i = [...new Set(n.map((e) => e.section.id))];
		A({
			label: "旋转排",
			redo() {
				for (let e of r) for (let t of e.before) {
					let n = ye(t.x, t.y, e.c.x, e.c.y, e.delta);
					t.s.x = Math.round(n.x * 100) / 100, t.s.y = Math.round(n.y * 100) / 100, t.s.r = (t.r + e.delta) % 360;
				}
				j(i);
			},
			undo() {
				for (let e of r) for (let t of e.before) t.s.x = t.x, t.s.y = t.y, t.s.r = t.r;
				j(i);
			}
		});
	},
	setRowsCurve(e, t) {
		t = Math.max(-180, Math.min(180, +t || 0));
		let n = e.map((e) => Rt.get(e)).filter(Boolean), r = [];
		for (let { row: e } of n) e.seats.length < 2 || Math.abs((e.curve || 0) - t) < 1e-6 || r.push({
			row: e,
			before: e.seats.map((e) => ({
				s: e,
				x: e.x,
				y: e.y,
				r: e.r || 0
			})),
			beforeCurve: e.curve || 0
		});
		if (!r.length) return;
		let i = [...new Set(n.map((e) => e.section.id))];
		A({
			label: "排弧度",
			redo() {
				r.forEach((e) => {
					e.row.curve = t, nn(e.row);
				}), j(i);
			},
			undo() {
				r.forEach((e) => {
					e.before.forEach((e) => {
						e.s.x = e.x, e.s.y = e.y, e.s.r = e.r;
					}), e.row.curve = e.beforeCurve;
				}), j(i);
			}
		});
	},
	alignRows(e, t) {
		if (![
			"start",
			"center",
			"end"
		].includes(t)) return;
		let n = e.map((e) => Rt.get(e)).filter(Boolean), r = n.map((e) => e.row).filter((e) => e.seats.length >= 2);
		if (r.length < 2) return;
		let i = je(r), a = (e) => e.x * i.x + e.y * i.y, o = r.map((e) => {
			let t = Oe(e), n = a(t[0]), r = a(t[t.length - 1]), i = Math.min(n, r), o = Math.max(n, r);
			return {
				row: e,
				start: i,
				end: o,
				center: (i + o) / 2
			};
		}), s = t === "start" ? Math.min(...o.map((e) => e.start)) : t === "end" ? Math.max(...o.map((e) => e.end)) : o.reduce((e, t) => e + t.center, 0) / o.length, c = o.map((e) => ({
			row: e.row,
			delta: s - e[t],
			before: e.row.seats.map((e) => ({
				s: e,
				x: e.x,
				y: e.y
			}))
		})).filter((e) => Math.abs(e.delta) > 1e-6);
		if (!c.length) return;
		let l = [...new Set(n.map((e) => e.section.id))];
		A({
			label: "排对齐",
			redo() {
				for (let e of c) for (let t of e.row.seats) t.x += i.x * e.delta, t.y += i.y * e.delta;
				j(l);
			},
			undo() {
				for (let e of c) e.before.forEach((e) => {
					e.s.x = e.x, e.s.y = e.y;
				});
				j(l);
			}
		});
	},
	setRowsRowSpacing(e, t) {
		t = Math.max(8, +t || 0);
		let n = e.map((e) => Rt.get(e)).filter(Boolean);
		if (n.length < 2) return;
		let r = n.map((e) => e.row), i = je(r), a = -i.y, o = i.x, s = r.map((e) => ({
			row: e,
			c: Ae(e)
		})).filter((e) => e.c).sort((e, t) => e.c.x * a + e.c.y * o - (t.c.x * a + t.c.y * o));
		if (s.length < 2) return;
		let c = s[0].c.x * a + s[0].c.y * o, l = s.map((e, n) => {
			let r = c + t * n - (e.c.x * a + e.c.y * o);
			return {
				row: e.row,
				dx: a * r,
				dy: o * r
			};
		}), u = l.map((e) => ({
			row: e.row,
			seats: e.row.seats.map((e) => ({
				s: e,
				x: e.x,
				y: e.y
			})),
			beforeSpacing: e.row.rowSpacing ?? null
		})), d = [...new Set(n.map((e) => e.section.id))];
		A({
			label: "排距",
			redo() {
				l.forEach((e) => {
					e.row.seats.forEach((t) => {
						t.x = Math.round((t.x + e.dx) * 100) / 100, t.y = Math.round((t.y + e.dy) * 100) / 100;
					}), e.row.rowSpacing = t;
				}), j(d);
			},
			undo() {
				u.forEach((e) => {
					e.seats.forEach((e) => {
						e.s.x = e.x, e.s.y = e.y;
					}), e.row.rowSpacing = e.beforeSpacing;
				}), j(d);
			}
		});
	},
	removeSeats(e) {
		let t = new Set(e), n = /* @__PURE__ */ new Map();
		for (let e of t) {
			let t = Lt.get(e);
			t && (n.has(t.section) || n.set(t.section, /* @__PURE__ */ new Set()), n.get(t.section).add(e));
		}
		let r = [];
		for (let [e, t] of n) {
			let n = structuredClone(e.rows).map((e) => ({
				...e,
				seats: e.seats.filter((e) => !t.has(e.id))
			})).filter((e) => e.seats.length > 0);
			r.push({
				section: e,
				next: n
			});
		}
		r.length && (A(In("删除座位", r)), en(new Set([...O.selection].filter((e) => !t.has(e)))));
	},
	removeSelectedSeats() {
		O.selection.size && this.removeSeats([...O.selection]);
	},
	copySelection() {
		if (O.mode === "sections" && O.sectionSelection.size) {
			let e = [...O.sectionSelection].map((e) => rn(e)).filter(Boolean).map((e) => structuredClone(e));
			e.length && (Ut = {
				type: "sections",
				data: e
			}, Wt = 0, O.pastePending = !0);
		} else if (O.selection.size) {
			let e = /* @__PURE__ */ new Map();
			for (let t of O.selection) {
				let n = Lt.get(t);
				if (!n) continue;
				e.has(n.section) || e.set(n.section, {
					section: n.section,
					rows: /* @__PURE__ */ new Map()
				});
				let r = e.get(n.section);
				r.rows.has(n.row) || r.rows.set(n.row, {
					row: n.row,
					seats: []
				}), r.rows.get(n.row).seats.push(n.seat);
			}
			e.size && (Ut = {
				type: "seats",
				data: [...e.values()].map(({ section: e, rows: t }) => ({
					sectionId: e.id,
					sectionLoose: !!e.loose,
					rows: [...t.values()].map(({ row: e, seats: t }) => {
						let n = structuredClone(e);
						return n.seats = structuredClone(t), n;
					})
				}))
			}, Wt = 0, O.pastePending = !0);
		}
	},
	pasteClipboard() {
		if (!Ut) return;
		Wt++;
		let e = gn() * 20, t = e * Wt, n = e * Wt;
		Ut.type === "sections" ? this._pasteSections(Ut.data, t, n) : Ut.type === "seats" && this._pasteSeats(Ut.data, t, n), O.pastePending = !1;
	},
	duplicateSelection() {
		this.copySelection(), this.pasteClipboard();
	},
	_pasteSections(e, t, n) {
		let r = e.map((e) => {
			let r = structuredClone(e), i = /* @__PURE__ */ new Map();
			i.set(e.id, r.id), r.id = Fe("sec"), i.set(e.id, r.id);
			for (let e of r.rows) {
				let r = Fe("r");
				i.set(e.id, r), e.id = r, e.label = "";
				for (let r of e.seats) {
					let e = Fe("s");
					i.set(r.id, e), r.id = e, r.x = Math.round((r.x + t) * 100) / 100, r.y = Math.round((r.y + n) * 100) / 100;
				}
			}
			return r.path &&= ge(r.path, t, n), r.gen?.type === "grid" && (r.gen.x += t, r.gen.y += n), r.gen?.type === "arc" && (r.gen.cx += t, r.gen.cy += n), r.name = (r.name || "未命名分区") + " 副本", r;
		}), i = O.venue, a = r.map((e) => e.id);
		A({
			label: "粘贴分区",
			redo() {
				i.sections.push(...r), tn(a), O.sectionSelection = d(new Set(a)), O.sectionSelectionTick++, O.activeSectionId = a[a.length - 1], O.sectionsTick++;
			},
			undo() {
				i.sections = i.sections.filter((e) => !a.includes(e.id)), tn(a);
			}
		});
	},
	_pasteSeats(e, t, n) {
		let r = O.venue, i = /* @__PURE__ */ new Map();
		for (let { sectionId: r, rows: a } of e) {
			let e;
			if (O.mode === "seats") {
				if (e = rn(O.editingSectionId), !e) continue;
			} else e = M(), e ||= Be();
			i.has(e) || i.set(e, []);
			let r = i.get(e);
			for (let e of a) {
				let i = structuredClone(e);
				i.id = Fe("r"), i.seats = i.seats.map((e) => ({
					...e,
					id: Fe("s"),
					x: Math.round((e.x + t) * 100) / 100,
					y: Math.round((e.y + n) * 100) / 100
				})), r.push(i);
			}
		}
		if (!i.size) return;
		let a = [];
		for (let [e, t] of i) a.push({
			section: e,
			before: e.rows,
			after: [...e.rows, ...t],
			looseCreated: e.loose && !r.sections.includes(e)
		});
		let o = a.map((e) => e.section.id);
		A({
			label: "粘贴座位",
			redo() {
				for (let e of a) e.looseCreated && r.sections.push(e.section), e.section.rows = e.after;
				tn(o);
			},
			undo() {
				for (let e of a) e.section.rows = e.before, e.looseCreated && (r.sections = r.sections.filter((t) => t !== e.section));
				tn(o);
			}
		});
	},
	undo() {
		let e = qt.pop();
		e && (e.undo(), k.push(e), Yt());
	},
	redo() {
		let e = k.pop();
		e && (e.redo(), qt.push(e), Yt());
	},
	loadVenue(e) {
		O.venue = d(e), Vt = null, Ht = null, qt.length = 0, k.length = 0, Yt(), O.activeSectionId = e.sections[0]?.id ?? null, O.activeImageId = e.images?.[0]?.id ?? null, O.imageSelected = !1, O.mode !== "sections" && (O.mode = "sections", O.editingSectionId = null, O.tool = "select", O.modeTick++), O.sectionSelection.size && (O.sectionSelection = d(/* @__PURE__ */ new Set()), O.sectionSelectionTick++), Ft = !0, It = !0, Zt(), en(/* @__PURE__ */ new Set()), O.sectionsTick++, O.canvasTick++, O.imageTick++, O.dirty = !1, Kt("venue", O.venue.backendId ?? null);
	},
	importVenue(e) {
		if (!e || !Array.isArray(e.sections)) throw Error("invalid venue json");
		let t = Ye(String(e.name || "导入场馆"), [], e.stage || null);
		t.backendId = e.backendId ?? null, t.baseScale = +e.baseScale || null, t.coordScale = +e.coordScale || 1, t.images = (Array.isArray(e.images) ? e.images : e.image ? [e.image] : []).filter((e) => e && typeof e.src == "string").map((e, t) => Je({
			src: e.src,
			x: +e.x || 0,
			y: +e.y || 0,
			w: +e.w || 100,
			h: +e.h || 100,
			baseW: +e.baseW || +e.w || 100,
			baseH: +e.baseH || +e.h || 100,
			opacity: e.opacity ?? 1,
			locked: !!e.locked,
			visible: e.visible !== !1,
			rotation: +e.rotation || 0,
			name: String(e.name || `图片 ${t + 1}`)
		})), Array.isArray(e.categories) && (t.categories = e.categories.filter((e) => e && e.key != null).map((e) => ({
			key: e.key,
			color: e.color || "#94a3b8",
			label: String(e.label || `类别 ${e.key}`),
			accessible: !!e.accessible
		}))), t.sections = e.sections.map((e) => {
			let t = ze(e.loose ? "" : String(e.name || "未命名分区"), e.color || an(), [], e.gen || null);
			return e.loose && (t.loose = !0), t.visible = e.visible !== !1, e.cat_id != null && (t.cat_id = e.cat_id), e.label && (t.label = {
				...t.label,
				...e.label
			}), e.watermark && (t.watermark = e.watermark), t.rows = (e.rows || []).map((e) => {
				let t = Le(String(e.label ?? ""), (e.seats || []).map((e) => Ie(+e.x, +e.y, e.n ?? 0, e.status || "available", +e.r || 0, e.cat ?? null, +e.type || 1)));
				return t.seatSpacing = e.seatSpacing ?? null, t.rowSpacing = e.rowSpacing ?? null, t.labelPos = e.labelPos ?? null, t.curve = +e.curve || 0, t;
			}), typeof e.path == "string" && e.path ? t.path = e.path : Array.isArray(e.polygon) && e.polygon.length >= 3 ? t.path = st(e.polygon.map((e) => ({
				x: +e.x,
				y: +e.y
			}))) : t.path = t.loose ? "" : t.gen ? lt(t.gen) : ut(t.rows), t;
		}), this.loadVenue(t);
	},
	exportVenue() {
		let e = O.venue, t = {
			app: "seatmap-studio",
			version: 2,
			name: e.name,
			backendId: e.backendId ?? null,
			baseScale: e.baseScale ?? null,
			coordScale: e.coordScale ?? 1,
			stage: e.stage,
			images: (e.images || []).map((e) => ({
				name: e.name,
				src: e.src,
				x: e.x,
				y: e.y,
				w: e.w,
				h: e.h,
				baseW: e.baseW ?? e.w,
				baseH: e.baseH ?? e.h,
				opacity: e.opacity,
				locked: !!e.locked,
				visible: e.visible !== !1,
				rotation: e.rotation || 0
			})),
			categories: e.categories.map((e) => ({
				key: e.key,
				color: e.color,
				label: e.label,
				accessible: !!e.accessible
			})),
			sections: e.sections.map((e) => ({
				name: e.name,
				color: e.color,
				visible: e.visible,
				loose: !!e.loose,
				cat: e.cat_id ?? null,
				gen: e.gen,
				path: e.path,
				rows: e.rows.map((e) => ({
					label: e.label,
					seatSpacing: e.seatSpacing ?? null,
					rowSpacing: e.rowSpacing ?? null,
					labelPos: e.labelPos ?? null,
					curve: e.curve ?? 0,
					seats: e.seats.map((e) => ({
						x: e.x,
						y: e.y,
						n: e.n,
						status: e.status,
						r: e.r || 0,
						cat: e.cat ?? null,
						type: e.type ?? 1
					}))
				}))
			}))
		};
		return JSON.stringify(t);
	},
	consumeRedraw() {
		let e = {
			full: Ft,
			ids: [...Pt],
			viewReset: It
		};
		return Ft = !1, It = !1, Pt.clear(), e;
	},
	seatCountOf: Xe
}, Rn;
(function(e) {
	e[e.No = 0] = "No", e[e.Yes = 1] = "Yes", e[e.NoAndSkip = 2] = "NoAndSkip", e[e.YesAndSkip = 3] = "YesAndSkip";
})(Rn ||= {});
var zn = {};
function P(e) {
	return e === void 0;
}
function Bn(e) {
	return e == null;
}
function Vn(e) {
	return typeof e == "string";
}
var { isFinite: Hn } = Number;
function Un(e) {
	return typeof e == "number";
}
var { isArray: Wn } = Array;
function Gn(e) {
	return e && typeof e == "object";
}
function Kn(e) {
	return Gn(e) && !Wn(e);
}
function qn(e) {
	return JSON.stringify(e) === "{}";
}
var F = {
	default: (e, t) => (Jn(t, e), Jn(e, t), e),
	assign(e, t, n) {
		let r;
		Object.keys(t).forEach((i) => {
			if (r = t[i], r?.constructor === Object && e[i]?.constructor === Object) return Jn(e[i], t[i], n && n[i]);
			n && i in n ? n[i]?.constructor === Object && Jn(e[i] = {}, t[i], n[i]) : e[i] = t[i];
		});
	},
	copyAttrs: (e, t, n) => (n.forEach((n) => {
		P(t[n]) || (e[n] = t[n]);
	}), e),
	clone: (e) => JSON.parse(JSON.stringify(e)),
	toMap(e) {
		let t = {};
		for (let n = 0, r = e.length; n < r; n++) t[e[n]] = !0;
		return t;
	},
	stintSet(e, t, n) {
		n ||= void 0, e[t] !== n && (e[t] = n);
	}
}, { assign: Jn } = F, Yn = class {
	get __useNaturalRatio() {
		return !0;
	}
	get __isLinePath() {
		let { path: e } = this;
		return e && e.length === 6 && e[0] === 1;
	}
	get __usePathBox() {
		return this.__pathInputed;
	}
	get __blendMode() {
		if (this.eraser && this.eraser !== "path") return "destination-out";
		let { blendMode: e } = this;
		return e === "pass-through" ? null : e;
	}
	constructor(e) {
		this.__leaf = e;
	}
	__get(e) {
		if (this.__input) {
			let t = this.__input[e];
			if (!P(t)) return t;
		}
		return this[e];
	}
	__getData() {
		let e = { tag: this.__leaf.tag }, { __input: t } = this, n;
		for (let r in this) r[0] !== "_" && (n = t ? t[r] : void 0, e[r] = P(n) ? this[r] : n);
		return e;
	}
	__setInput(e, t) {
		this.__input ||= {}, this.__input[e] = t;
	}
	__getInput(e) {
		if (this.__input) {
			let t = this.__input[e];
			if (!P(t)) return t;
		}
		if (e !== "path" || this.__pathInputed) return this["_" + e];
	}
	__removeInput(e) {
		this.__input && !P(this.__input[e]) && (this.__input[e] = void 0);
	}
	__getInputData(e, t) {
		let n = {};
		if (e) if (Wn(e)) for (let t of e) n[t] = this.__getInput(t);
		else for (let t in e) n[t] = this.__getInput(t);
		else {
			let e, t, { __input: r } = this;
			n.tag = this.__leaf.tag;
			for (let i in this) if (i[0] !== "_" && (e = this["_" + i], !P(e))) {
				if (i === "path" && !this.__pathInputed) continue;
				t = r ? r[i] : void 0, n[i] = P(t) ? e : t;
			}
		}
		if (t && t.matrix) {
			let { a: e, b: t, c: r, d: i, e: a, f: o } = this.__leaf.__localMatrix;
			n.matrix = {
				a: e,
				b: t,
				c: r,
				d: i,
				e: a,
				f: o
			};
		}
		return n;
	}
	__setMiddle(e, t) {
		this.__middle ||= {}, this.__middle[e] = t;
	}
	__getMiddle(e) {
		return this.__middle && this.__middle[e];
	}
	__checkSingle() {
		let e = this;
		if (e.blendMode === "pass-through") {
			let t = this.__leaf;
			e.opacity < 1 && (t.isBranch || e.__hasMultiPaint) || t.__hasEraser || e.eraser || e.filter ? e.__single = !0 : e.__single &&= !1;
		} else e.__single = !0;
	}
	__removeNaturalSize() {
		this.__naturalWidth = this.__naturalHeight = void 0;
	}
	destroy() {
		this.__input = this.__middle = null, this.__complexData && this.__complexData.destroy();
	}
}, Xn = {
	RUNTIME: "runtime",
	LEAF: "leaf",
	TASK: "task",
	CANVAS: "canvas",
	IMAGE: "image",
	types: {},
	create(e) {
		let { types: t } = Zn;
		return t[e] ? t[e]++ : (t[e] = 1, 0);
	}
}, Zn = Xn, Qn, $n, er, { max: tr } = Math, nr = [
	0,
	0,
	0,
	0
], rr = {
	zero: [...nr],
	tempFour: nr,
	set: (e, t, n, r, i) => (n === void 0 && (n = r = i = t), e[0] = t, e[1] = n, e[2] = r, e[3] = i, e),
	setTemp: (e, t, n, r) => ir(nr, e, t, n, r),
	toTempAB(e, t, n) {
		er = n ? Un(e) ? t : e : [], Un(e) ? (Qn = or(e), $n = t) : Un(t) ? (Qn = e, $n = or(t)) : (Qn = e, $n = t), Qn.length !== 4 && (Qn = ar(Qn)), $n.length !== 4 && ($n = ar($n));
	},
	get(e, t) {
		let n;
		if (!Un(e)) switch (e.length) {
			case 4:
				n = P(t) ? e : [...e];
				break;
			case 2:
				n = [
					e[0],
					e[1],
					e[0],
					e[1]
				];
				break;
			case 3:
				n = [
					e[0],
					e[1],
					e[2],
					e[1]
				];
				break;
			case 1:
				e = e[0];
				break;
			default: e = 0;
		}
		if (n ||= [
			e,
			e,
			e,
			e
		], !P(t)) for (let e = 0; e < 4; e++) n[e] > t && (n[e] = t);
		return n;
	},
	max: (e, t, n) => Un(e) && Un(t) ? tr(e, t) : (sr(e, t, n), ir(er, tr(Qn[0], $n[0]), tr(Qn[1], $n[1]), tr(Qn[2], $n[2]), tr(Qn[3], $n[3]))),
	add: (e, t, n) => Un(e) && Un(t) ? e + t : (sr(e, t, n), ir(er, Qn[0] + $n[0], Qn[1] + $n[1], Qn[2] + $n[2], Qn[3] + $n[3])),
	swapAndScale(e, t, n, r) {
		if (Un(e)) return t === n ? e * t : [e * n, e * t];
		let i = r ? e : [], [a, o, s, c] = e.length === 4 ? e : ar(e);
		return ir(i, s * n, c * t, a * n, o * t);
	}
}, { set: ir, get: ar, setTemp: or, toTempAB: sr } = rr, { round: cr, pow: lr, max: ur, floor: dr, PI: fr } = Math, pr = {}, mr = {
	within: (e, t, n) => (Gn(t) && (n = t.max, t = t.min), !P(t) && e < t && (e = t), !P(n) && e > n && (e = n), e),
	fourNumber: rr.get,
	formatRotation: (e, t) => (e %= 360, t ? e < 0 && (e += 360) : (e > 180 && (e -= 360), e < -180 && (e += 360)), mr.float(e)),
	getGapRotation(e, t, n = 0) {
		let r = e + n;
		if (t > 1) {
			let e = Math.abs(r % t);
			(e < 1 || e > t - 1) && (r = Math.round(r / t) * t);
		}
		return r - n;
	},
	float(e, t) {
		let n = P(t) ? 0xe8d4a51000 : lr(10, t);
		return (e = cr(e * n) / n) === -0 ? 0 : e;
	},
	sign: (e) => e < 0 ? -1 : 1,
	getScaleData(e, t, n, r) {
		if (r ||= {}, t) {
			let e = (Un(t) ? t : t.width || 0) / n.width, i = (Un(t) ? t : t.height || 0) / n.height;
			r.scaleX = e || i || 1, r.scaleY = i || e || 1;
		} else e && mr.assignScale(r, e);
		return r;
	},
	getScaleFixedData(e, t, n, r, i) {
		let { scaleX: a, scaleY: o } = e;
		if ((r || t) && (a < 0 && (a = -a), o < 0 && (o = -o)), t) if (!0 === t) a = o = n ? 1 : 1 / a;
		else {
			let e;
			Un(t) ? e = t : t === "zoom-in" && (e = 1), e && (a = o = a > e || o > e ? n ? 1 : 1 / a : n ? 1 : 1 / e);
		}
		return pr.scaleX = a, pr.scaleY = o, pr;
	},
	assignScale(e, t) {
		Un(t) ? e.scaleX = e.scaleY = t : (e.scaleX = t.x, e.scaleY = t.y);
	},
	getFloorScale: (e, t = 1) => ur(dr(e), t) / e,
	randInt: hr,
	randColor: (e) => `rgba(${hr(255)},${hr(255)},${hr(255)},${e || 1})`
};
function hr(e) {
	return Math.round(Math.random() * e);
}
var I = fr / 180, gr = 2 * fr, _r = fr / 2;
function vr() {
	return {
		x: 0,
		y: 0
	};
}
function yr() {
	return {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
}
function br() {
	return {
		a: 1,
		b: 0,
		c: 0,
		d: 1,
		e: 0,
		f: 0
	};
}
var { sin: xr, cos: Sr, acos: Cr, sqrt: wr } = Math, { float: Tr } = mr, Er = {};
function Dr() {
	return Object.assign(Object.assign(Object.assign({}, {
		a: 1,
		b: 0,
		c: 0,
		d: 1,
		e: 0,
		f: 0
	}), {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	}), {
		scaleX: 1,
		scaleY: 1,
		rotation: 0,
		skewX: 0,
		skewY: 0
	});
}
var L = {
	defaultMatrix: {
		a: 1,
		b: 0,
		c: 0,
		d: 1,
		e: 0,
		f: 0
	},
	defaultWorld: Dr(),
	tempMatrix: {},
	set(e, t = 1, n = 0, r = 0, i = 1, a = 0, o = 0) {
		e.a = t, e.b = n, e.c = r, e.d = i, e.e = a, e.f = o;
	},
	get: br,
	getWorld: Dr,
	copy(e, t) {
		e.a = t.a, e.b = t.b, e.c = t.c, e.d = t.d, e.e = t.e, e.f = t.f;
	},
	translate(e, t, n) {
		e.e += t, e.f += n;
	},
	translateInner(e, t, n, r) {
		e.e += e.a * t + e.c * n, e.f += e.b * t + e.d * n, r && (e.e -= t, e.f -= n);
	},
	scale(e, t, n = t) {
		e.a *= t, e.b *= t, e.c *= n, e.d *= n;
	},
	pixelScale(e, t, n) {
		n ||= e, n.a = e.a * t, n.b = e.b * t, n.c = e.c * t, n.d = e.d * t, n.e = e.e * t, n.f = e.f * t;
	},
	scaleOfOuter(e, t, n, r) {
		Or.toInnerPoint(e, t, Er), Or.scaleOfInner(e, Er, n, r);
	},
	scaleOfInner(e, t, n, r = n) {
		Or.translateInner(e, t.x, t.y), Or.scale(e, n, r), Or.translateInner(e, -t.x, -t.y);
	},
	rotate(e, t) {
		let { a: n, b: r, c: i, d: a } = e, o = Sr(t *= I), s = xr(t);
		e.a = n * o - r * s, e.b = n * s + r * o, e.c = i * o - a * s, e.d = i * s + a * o;
	},
	rotateOfOuter(e, t, n) {
		Or.toInnerPoint(e, t, Er), Or.rotateOfInner(e, Er, n);
	},
	rotateOfInner(e, t, n) {
		Or.translateInner(e, t.x, t.y), Or.rotate(e, n), Or.translateInner(e, -t.x, -t.y);
	},
	skew(e, t, n) {
		let { a: r, b: i, c: a, d: o } = e;
		n && (n *= I, e.a = r + a * n, e.b = i + o * n), t && (t *= I, e.c = a + r * t, e.d = o + i * t);
	},
	skewOfOuter(e, t, n, r) {
		Or.toInnerPoint(e, t, Er), Or.skewOfInner(e, Er, n, r);
	},
	skewOfInner(e, t, n, r = 0) {
		Or.translateInner(e, t.x, t.y), Or.skew(e, n, r), Or.translateInner(e, -t.x, -t.y);
	},
	multiply(e, t) {
		let { a: n, b: r, c: i, d: a, e: o, f: s } = e;
		e.a = t.a * n + t.b * i, e.b = t.a * r + t.b * a, e.c = t.c * n + t.d * i, e.d = t.c * r + t.d * a, e.e = t.e * n + t.f * i + o, e.f = t.e * r + t.f * a + s;
	},
	multiplyParent(e, t, n, r, i) {
		let { e: a, f: o } = e;
		if (n ||= e, P(r) && (r = e.a !== 1 || e.b || e.c || e.d !== 1), r) {
			let { a: r, b: a, c: o, d: s } = e;
			n.a = r * t.a + a * t.c, n.b = r * t.b + a * t.d, n.c = o * t.a + s * t.c, n.d = o * t.b + s * t.d, i && (n.scaleX = t.scaleX * i.scaleX, n.scaleY = t.scaleY * i.scaleY);
		} else n.a = t.a, n.b = t.b, n.c = t.c, n.d = t.d, i && (n.scaleX = t.scaleX, n.scaleY = t.scaleY);
		n.e = a * t.a + o * t.c + t.e, n.f = a * t.b + o * t.d + t.f;
	},
	divide(e, t) {
		Or.multiply(e, Or.tempInvert(t));
	},
	divideParent(e, t) {
		Or.multiplyParent(e, Or.tempInvert(t));
	},
	tempInvert(e) {
		let { tempMatrix: t } = Or;
		return Or.copy(t, e), Or.invert(t), t;
	},
	invert(e) {
		let { a: t, b: n, c: r, d: i, e: a, f: o } = e;
		if (n || r) {
			let s = 1 / (t * i - n * r);
			e.a = i * s, e.b = -n * s, e.c = -r * s, e.d = t * s, e.e = -(a * i - o * r) * s, e.f = -(o * t - a * n) * s;
		} else if (t === 1 && i === 1) e.e = -a, e.f = -o;
		else {
			let n = 1 / (t * i);
			e.a = i * n, e.d = t * n, e.e = -a * i * n, e.f = -o * t * n;
		}
	},
	toOuterPoint(e, t, n, r) {
		let { x: i, y: a } = t;
		n ||= t, n.x = i * e.a + a * e.c, n.y = i * e.b + a * e.d, r || (n.x += e.e, n.y += e.f);
	},
	toInnerPoint(e, t, n, r) {
		let { a: i, b: a, c: o, d: s } = e, c = 1 / (i * s - a * o), { x: l, y: u } = t;
		if (n ||= t, n.x = (l * s - u * o) * c, n.y = (u * i - l * a) * c, !r) {
			let { e: t, f: r } = e;
			n.x -= (t * s - r * o) * c, n.y -= (r * i - t * a) * c;
		}
	},
	setLayout(e, t, n, r, i) {
		let { x: a, y: o, scaleX: s, scaleY: c } = t;
		if (P(i) && (i = t.rotation || t.skewX || t.skewY), i) {
			let { rotation: n, skewX: r, skewY: i } = t, a = n * I, o = Sr(a), l = xr(a);
			if (r || i) {
				let t = r * I, n = i * I;
				e.a = (o + n * -l) * s, e.b = (l + n * o) * s, e.c = (t * o - l) * c, e.d = (o + t * l) * c;
			} else e.a = o * s, e.b = l * s, e.c = -l * c, e.d = o * c;
		} else e.a = s, e.b = 0, e.c = 0, e.d = c;
		e.e = a, e.f = o, (n ||= r) && Or.translateInner(e, -n.x, -n.y, !r);
	},
	getLayout(e, t, n, r) {
		let { a: i, b: a, c: o, d: s, e: c, f: l } = e, u, d, f, p, m, h = c, g = l;
		if (a || o) {
			let e = i * s - a * o;
			if (o && !r) {
				u = wr(i * i + a * a), d = e / u;
				let t = i / u;
				f = a > 0 ? Cr(t) : -Cr(t);
			} else {
				d = wr(o * o + s * s), u = e / d;
				let t = o / d;
				f = _r - (s > 0 ? Cr(-t) : -Cr(t));
			}
			let t = Tr(Sr(f)), n = xr(f);
			u = Tr(u), d = Tr(d), p = t ? Tr((o / d + n) / t / I, 9) : 0, m = t ? Tr((a / u - n) / t / I, 9) : 0, f = Tr(f / I);
		} else u = i, d = s, f = p = m = 0;
		return (t = n || t) && (h += t.x * i + t.y * o, g += t.x * a + t.y * s, n || (h -= t.x, g -= t.y)), {
			x: h,
			y: g,
			scaleX: u,
			scaleY: d,
			rotation: f,
			skewX: p,
			skewY: m
		};
	},
	withScale(e, t, n = t) {
		let r = e;
		if (!t || !n) {
			let { a: r, b: i, c: a, d: o } = e;
			i || a ? n = (r * o - i * a) / (t = wr(r * r + i * i)) : (t = r, n = o);
		}
		return r.scaleX = t, r.scaleY = n, r;
	},
	reset(e) {
		Or.set(e);
	}
}, Or = L, { float: kr } = mr, { toInnerPoint: Ar, toOuterPoint: jr } = L, { sin: Mr, cos: Nr, abs: Pr, sqrt: Fr, atan2: Ir, min: Lr, round: Rr } = Math, R = {
	defaultPoint: {
		x: 0,
		y: 0
	},
	tempPoint: {},
	tempRadiusPoint: {},
	set(e, t = 0, n = 0) {
		e.x = t, e.y = n;
	},
	setRadius(e, t, n) {
		e.radiusX = t, e.radiusY = P(n) ? t : n;
	},
	copy(e, t) {
		e.x = t.x, e.y = t.y;
	},
	copyFrom(e, t, n) {
		e.x = t, e.y = n;
	},
	round(e, t) {
		e.x = t ? Rr(e.x - .5) + .5 : Rr(e.x), e.y = t ? Rr(e.y - .5) + .5 : Rr(e.y);
	},
	move(e, t, n) {
		Gn(t) ? (e.x += t.x, e.y += t.y) : (e.x += t, e.y += n);
	},
	scale(e, t, n = t) {
		e.x && (e.x *= t), e.y && (e.y *= n);
	},
	scaleOf(e, t, n, r = n) {
		e.x += (e.x - t.x) * (n - 1), e.y += (e.y - t.y) * (r - 1);
	},
	rotate(e, t, n, r = 1, i = 1) {
		n ||= zr.defaultPoint;
		let a = Nr(t *= I), o = Mr(t), s = (e.x - n.x) / r, c = (e.y - n.y) / i;
		e.x = n.x + (s * a - c * o) * r, e.y = n.y + (s * o + c * a) * i;
	},
	tempToInnerOf(e, t) {
		let { tempPoint: n } = zr;
		return Vr(n, e), Ar(t, n, n), n;
	},
	tempToOuterOf(e, t) {
		let { tempPoint: n } = zr;
		return Vr(n, e), jr(t, n, n), n;
	},
	tempToInnerRadiusPointOf(e, t) {
		let { tempRadiusPoint: n } = zr;
		return Vr(n, e), zr.toInnerRadiusPointOf(e, t, n), n;
	},
	copyRadiusPoint: (e, t, n, r) => (Vr(e, t), Hr(e, n, r), e),
	toInnerRadiusPointOf(e, t, n) {
		n ||= e, Ar(t, e, n), n.radiusX = Math.abs(e.radiusX / t.scaleX), n.radiusY = Math.abs(e.radiusY / t.scaleY);
	},
	toInnerOf(e, t, n) {
		Ar(t, e, n);
	},
	toOuterOf(e, t, n) {
		jr(t, e, n);
	},
	toVertical(e, t, n, r) {
		let i = t * I;
		e.x += -Math.sin(i) * n, e.y += Math.cos(i) * n;
	},
	getCenter: (e, t) => ({
		x: e.x + (t.x - e.x) / 2,
		y: e.y + (t.y - e.y) / 2
	}),
	getCenterX: (e, t) => e + (t - e) / 2,
	getCenterY: (e, t) => e + (t - e) / 2,
	getDistance: (e, t) => Br(e.x, e.y, t.x, t.y),
	getDistanceFrom(e, t, n, r) {
		let i = Pr(n - e), a = Pr(r - t);
		return Fr(i * i + a * a);
	},
	getMinDistanceFrom: (e, t, n, r, i, a) => Lr(Br(e, t, n, r), Br(n, r, i, a)),
	getAngle: (e, t, n, r) => Ur(e, t, n, r) / I,
	getRotation: (e, t, n, r) => (r ||= t, zr.getRadianFrom(e.x, e.y, t.x, t.y, n.x, n.y, r.x, r.y) / I),
	getRadianFrom(e, t, n, r, i, a, o, s) {
		P(o) && (o = n, s = r);
		let c = e - n, l = t - r, u = i - o, d = a - s;
		return Math.atan2(c * d - l * u, c * u + l * d);
	},
	getAtan2: (e, t, n = 1, r = 1) => Ir((t.y - e.y) / r, (t.x - e.x) / n),
	getDistancePoint(e, t, n, r, i) {
		let a = Ur(e, t);
		return i && (e = t), r || (t = {}), t.x = e.x + Nr(a) * n, t.y = e.y + Mr(a) * n, t;
	},
	toNumberPoints(e) {
		let t = e;
		return Gn(e[0]) && (t = [], e.forEach((e) => t.push(e.x, e.y))), t;
	},
	isSame: (e, t, n) => n ? e.x === t.x && e.y === t.y : kr(e.x) === kr(t.x) && kr(e.y) === kr(t.y),
	reset(e) {
		e.x = e.y = 0;
	}
}, zr = R, { getDistanceFrom: Br, copy: Vr, setRadius: Hr, getAtan2: Ur } = zr, Wr = class e {
	constructor(e, t) {
		this.set(e, t);
	}
	set(e, t) {
		return Gn(e) ? R.copy(this, e) : R.set(this, e, t), this;
	}
	get() {
		let { x: e, y: t } = this;
		return {
			x: e,
			y: t
		};
	}
	clone() {
		return new e(this);
	}
	move(e, t) {
		return R.move(this, e, t), this;
	}
	scale(e, t) {
		return R.scale(this, e, t), this;
	}
	scaleOf(e, t, n) {
		return R.scaleOf(this, e, t, n), this;
	}
	rotate(e, t, n, r) {
		return R.rotate(this, e, t, n, r), this;
	}
	rotateOf(e, t, n, r) {
		return R.rotate(this, t, e, n, r), this;
	}
	getRotation(e, t, n) {
		return R.getRotation(this, e, t, n);
	}
	toInnerOf(e, t) {
		return R.toInnerOf(this, e, t), this;
	}
	toOuterOf(e, t) {
		return R.toOuterOf(this, e, t), this;
	}
	getCenter(t) {
		return new e(R.getCenter(this, t));
	}
	getDistance(e) {
		return R.getDistance(this, e);
	}
	getDistancePoint(t, n, r, i) {
		return new e(R.getDistancePoint(this, t, n, r, i));
	}
	getAngle(e, t, n) {
		return R.getAngle(this, e, t, n);
	}
	getAtan2(e, t, n) {
		return R.getAtan2(this, e, t, n);
	}
	isSame(e, t) {
		return R.isSame(this, e, t);
	}
	reset() {
		return R.reset(this), this;
	}
};
new Wr();
var Gr = class e {
	constructor(e, t, n, r, i, a) {
		this.set(e, t, n, r, i, a);
	}
	set(e, t, n, r, i, a) {
		return Gn(e) ? L.copy(this, e) : L.set(this, e, t, n, r, i, a), this;
	}
	setWith(e) {
		return L.copy(this, e), this.scaleX = e.scaleX, this.scaleY = e.scaleY, this;
	}
	get() {
		let { a: e, b: t, c: n, d: r, e: i, f: a } = this;
		return {
			a: e,
			b: t,
			c: n,
			d: r,
			e: i,
			f: a
		};
	}
	clone() {
		return new e(this);
	}
	translate(e, t) {
		return L.translate(this, e, t), this;
	}
	translateInner(e, t) {
		return L.translateInner(this, e, t), this;
	}
	scale(e, t) {
		return L.scale(this, e, t), this;
	}
	scaleWith(e, t) {
		return L.scale(this, e, t), this.scaleX *= e, this.scaleY *= t || e, this;
	}
	pixelScale(e) {
		return L.pixelScale(this, e), this;
	}
	scaleOfOuter(e, t, n) {
		return L.scaleOfOuter(this, e, t, n), this;
	}
	scaleOfInner(e, t, n) {
		return L.scaleOfInner(this, e, t, n), this;
	}
	rotate(e) {
		return L.rotate(this, e), this;
	}
	rotateOfOuter(e, t) {
		return L.rotateOfOuter(this, e, t), this;
	}
	rotateOfInner(e, t) {
		return L.rotateOfInner(this, e, t), this;
	}
	skew(e, t) {
		return L.skew(this, e, t), this;
	}
	skewOfOuter(e, t, n) {
		return L.skewOfOuter(this, e, t, n), this;
	}
	skewOfInner(e, t, n) {
		return L.skewOfInner(this, e, t, n), this;
	}
	multiply(e) {
		return L.multiply(this, e), this;
	}
	multiplyParent(e) {
		return L.multiplyParent(this, e), this;
	}
	divide(e) {
		return L.divide(this, e), this;
	}
	divideParent(e) {
		return L.divideParent(this, e), this;
	}
	invert() {
		return L.invert(this), this;
	}
	invertWith() {
		return L.invert(this), this.scaleX = 1 / this.scaleX, this.scaleY = 1 / this.scaleY, this;
	}
	toOuterPoint(e, t, n) {
		L.toOuterPoint(this, e, t, n);
	}
	toInnerPoint(e, t, n) {
		L.toInnerPoint(this, e, t, n);
	}
	setLayout(e, t, n) {
		return L.setLayout(this, e, t, n), this;
	}
	getLayout(e, t, n) {
		return L.getLayout(this, e, t, n);
	}
	withScale(e, t) {
		return L.withScale(this, e, t);
	}
	reset() {
		return L.reset(this), this;
	}
};
new Gr();
var Kr = {
	tempPointBounds: {},
	setPoint(e, t, n) {
		e.minX = e.maxX = t, e.minY = e.maxY = n;
	},
	addPoint(e, t, n) {
		e.minX = t < e.minX ? t : e.minX, e.minY = n < e.minY ? n : e.minY, e.maxX = t > e.maxX ? t : e.maxX, e.maxY = n > e.maxY ? n : e.maxY;
	},
	addBounds(e, t, n, r, i) {
		qr(e, t, n), qr(e, t + r, n + i);
	},
	copy(e, t) {
		e.minX = t.minX, e.minY = t.minY, e.maxX = t.maxX, e.maxY = t.maxY;
	},
	addPointBounds(e, t) {
		e.minX = t.minX < e.minX ? t.minX : e.minX, e.minY = t.minY < e.minY ? t.minY : e.minY, e.maxX = t.maxX > e.maxX ? t.maxX : e.maxX, e.maxY = t.maxY > e.maxY ? t.maxY : e.maxY;
	},
	toBounds(e, t) {
		t.x = e.minX, t.y = e.minY, t.width = e.maxX - e.minX, t.height = e.maxY - e.minY;
	}
}, { addPoint: qr } = Kr, Jr, Yr;
(function(e) {
	e[e.top = 0] = "top", e[e.right = 1] = "right", e[e.bottom = 2] = "bottom", e[e.left = 3] = "left";
})(Jr ||= {}), function(e) {
	e[e.topLeft = 0] = "topLeft", e[e.top = 1] = "top", e[e.topRight = 2] = "topRight", e[e.right = 3] = "right", e[e.bottomRight = 4] = "bottomRight", e[e.bottom = 5] = "bottom", e[e.bottomLeft = 6] = "bottomLeft", e[e.left = 7] = "left", e[e.center = 8] = "center", e[e["top-left"] = 0] = "top-left", e[e["top-right"] = 2] = "top-right", e[e["bottom-right"] = 4] = "bottom-right", e[e["bottom-left"] = 6] = "bottom-left";
}(Yr ||= {});
var Xr = [
	{
		x: 0,
		y: 0
	},
	{
		x: .5,
		y: 0
	},
	{
		x: 1,
		y: 0
	},
	{
		x: 1,
		y: .5
	},
	{
		x: 1,
		y: 1
	},
	{
		x: .5,
		y: 1
	},
	{
		x: 0,
		y: 1
	},
	{
		x: 0,
		y: .5
	},
	{
		x: .5,
		y: .5
	}
];
Xr.forEach((e) => e.type = "percent");
var Zr = {
	directionData: Xr,
	tempPoint: {},
	get: Qr,
	toPoint(e, t, n, r, i, a) {
		let o = Qr(e);
		n.x = o.x, n.y = o.y, o.type === "percent" && (n.x *= t.width, n.y *= t.height, i && (a || (n.x -= i.x, n.y -= i.y), o.x && (n.x -= o.x === 1 ? i.width : o.x === .5 ? o.x * i.width : 0), o.y && (n.y -= o.y === 1 ? i.height : o.y === .5 ? o.y * i.height : 0))), r || (n.x += t.x, n.y += t.y);
	},
	getPoint: (e, t, n, r = !0) => (n ||= {}, Zr.toPoint(e, t, n, r), n)
};
function Qr(e) {
	return Vn(e) ? Xr[Yr[e]] : e;
}
var { toPoint: $r } = Zr, ei = { toPoint(e, t, n, r, i, a) {
	$r(e, n, r, i, t, a);
} }, { tempPointBounds: ti, setPoint: ni, addPoint: ri, toBounds: ii } = Kr, { toOuterPoint: ai } = L, { float: oi, fourNumber: si } = mr, { floor: ci, ceil: li } = Math, ui, di, fi, pi, mi = {}, hi = {}, gi = {}, z = {
	tempBounds: gi,
	set(e, t = 0, n = 0, r = 0, i = 0) {
		e.x = t, e.y = n, e.width = r, e.height = i;
	},
	copy(e, t) {
		e.x = t.x, e.y = t.y, e.width = t.width, e.height = t.height;
	},
	copyAndSpread(e, t, n, r, i) {
		let { x: a, y: o, width: s, height: c } = t;
		if (Wn(n)) {
			let t = si(n);
			r ? B.set(e, a + t[3], o + t[0], s - t[1] - t[3], c - t[2] - t[0]) : B.set(e, a - t[3], o - t[0], s + t[1] + t[3], c + t[2] + t[0]);
		} else r && (n = -n), B.set(e, a - n, o - n, s + 2 * n, c + 2 * n);
		i && (i === "width" ? (e.y = o, e.height = c) : (e.x = a, e.width = s));
	},
	minX: (e) => e.width > 0 ? e.x : e.x + e.width,
	minY: (e) => e.height > 0 ? e.y : e.y + e.height,
	maxX: (e) => e.width > 0 ? e.x + e.width : e.x,
	maxY: (e) => e.height > 0 ? e.y + e.height : e.y,
	move(e, t, n) {
		e.x += t, e.y += n;
	},
	scroll(e, t) {
		e.x += t.scrollX, e.y += t.scrollY;
	},
	getByMove: (e, t, n) => (e = Object.assign({}, e), B.move(e, t, n), e),
	toOffsetOutBounds(e, t, n) {
		t ? vi(t, e) : t = e, n ||= e, t.offsetX = B.maxX(n), t.offsetY = B.maxY(n), B.move(t, -t.offsetX, -t.offsetY);
	},
	scale(e, t, n = t, r) {
		r || R.scale(e, t, n), e.width *= t, e.height *= n;
	},
	scaleOf(e, t, n, r = n) {
		R.scaleOf(e, t, n, r), e.width *= n, e.height *= r;
	},
	tempToOuterOf: (e, t) => (B.copy(gi, e), B.toOuterOf(gi, t), gi),
	getOuterOf: (e, t) => (e = Object.assign({}, e), B.toOuterOf(e, t), e),
	toOuterOf(e, t, n) {
		if (n ||= e, t.b === 0 && t.c === 0) {
			let { a: r, d: i, e: a, f: o } = t;
			r > 0 ? (n.width = e.width * r, n.x = a + e.x * r) : (n.width = e.width * -r, n.x = a + e.x * r - n.width), i > 0 ? (n.height = e.height * i, n.y = o + e.y * i) : (n.height = e.height * -i, n.y = o + e.y * i - n.height);
		} else mi.x = e.x, mi.y = e.y, ai(t, mi, hi), ni(ti, hi.x, hi.y), mi.x = e.x + e.width, ai(t, mi, hi), ri(ti, hi.x, hi.y), mi.y = e.y + e.height, ai(t, mi, hi), ri(ti, hi.x, hi.y), mi.x = e.x, ai(t, mi, hi), ri(ti, hi.x, hi.y), ii(ti, n);
	},
	toInnerOf(e, t, n) {
		n ||= e, B.move(n, -t.e, -t.f), B.scale(n, 1 / t.a, 1 / t.d);
	},
	getFitMatrix(e, t, n = 1) {
		let r = Math.min(n, B.getFitScale(e, t));
		return new Gr(r, 0, 0, r, -t.x * r, -t.y * r);
	},
	getFitScale(e, t, n) {
		let r = e.width / t.width, i = e.height / t.height;
		return n ? Math.max(r, i) : Math.min(r, i);
	},
	put(e, t, n = "center", r = 1, i = !0, a) {
		a ||= t, Vn(r) && (r = B.getFitScale(e, t, r === "cover")), gi.width = i ? t.width *= r : t.width * r, gi.height = i ? t.height *= r : t.height * r, ei.toPoint(n, gi, e, a, !0, !0);
	},
	getSpread(e, t, n) {
		let r = {};
		return B.copyAndSpread(r, e, t, !1, n), r;
	},
	spread(e, t, n) {
		B.copyAndSpread(e, e, t, !1, n);
	},
	shrink(e, t, n) {
		B.copyAndSpread(e, e, t, !0, n);
	},
	ceil(e) {
		let { x: t, y: n } = e;
		e.x = ci(e.x), e.y = ci(e.y), e.width = t > e.x ? li(e.width + t - e.x) : li(e.width), e.height = n > e.y ? li(e.height + n - e.y) : li(e.height);
	},
	unsign(e) {
		e.width < 0 && (e.x += e.width, e.width = -e.width), e.height < 0 && (e.y += e.height, e.height = -e.height);
	},
	float(e, t) {
		e.x = oi(e.x, t), e.y = oi(e.y, t), e.width = oi(e.width, t), e.height = oi(e.height, t);
	},
	add(e, t, n) {
		ui = e.x + e.width, di = e.y + e.height, fi = t.x, pi = t.y, n || (fi += t.width, pi += t.height), ui = ui > fi ? ui : fi, di = di > pi ? di : pi, e.x = e.x < t.x ? e.x : t.x, e.y = e.y < t.y ? e.y : t.y, e.width = ui - e.x, e.height = di - e.y;
	},
	addList(e, t) {
		B.setListWithFn(e, t, void 0, !0);
	},
	setList(e, t, n = !1) {
		B.setListWithFn(e, t, void 0, n);
	},
	addListWithFn(e, t, n) {
		B.setListWithFn(e, t, n, !0);
	},
	setListWithFn(e, t, n, r = !1) {
		let i, a = !0;
		for (let o = 0, s = t.length; o < s; o++) i = n ? n(t[o], o) : t[o], i && (i.width || i.height) && (a ? (a = !1, r || vi(e, i)) : _i(e, i));
		a && B.reset(e);
	},
	setPoints(e, t) {
		t.forEach((e, t) => t === 0 ? ni(ti, e.x, e.y) : ri(ti, e.x, e.y)), ii(ti, e);
	},
	setPoint(e, t) {
		B.set(e, t.x, t.y);
	},
	addPoint(e, t) {
		_i(e, t, !0);
	},
	getPoints(e) {
		let { x: t, y: n, width: r, height: i } = e;
		return [
			{
				x: t,
				y: n
			},
			{
				x: t + r,
				y: n
			},
			{
				x: t + r,
				y: n + i
			},
			{
				x: t,
				y: n + i
			}
		];
	},
	getPoint: (e, t, n = !1, r) => Zr.getPoint(t, e, r, n),
	hitRadiusPoint: (e, t, n) => (n && (t = R.tempToInnerRadiusPointOf(t, n)), t.x >= e.x - t.radiusX && t.x <= e.x + e.width + t.radiusX && t.y >= e.y - t.radiusY && t.y <= e.y + e.height + t.radiusY),
	hitPoint: (e, t, n) => (n && (t = R.tempToInnerOf(t, n)), t.x >= e.x && t.x <= e.x + e.width && t.y >= e.y && t.y <= e.y + e.height),
	hit: (e, t, n) => (n && (t = B.tempToOuterOf(t, n)), !(e.y + e.height < t.y || t.y + t.height < e.y || e.x + e.width < t.x || t.x + t.width < e.x)),
	includes: (e, t, n) => (n && (t = B.tempToOuterOf(t, n)), e.x <= t.x && e.y <= t.y && e.x + e.width >= t.x + t.width && e.y + e.height >= t.y + t.height),
	getIntersectData(e, t, n) {
		if (n && (t = B.tempToOuterOf(t, n)), !B.hit(e, t)) return {
			x: 0,
			y: 0,
			width: 0,
			height: 0
		};
		let { x: r, y: i, width: a, height: o } = t;
		return ui = r + a, di = i + o, fi = e.x + e.width, pi = e.y + e.height, r = r > e.x ? r : e.x, i = i > e.y ? i : e.y, ui = ui < fi ? ui : fi, di = di < pi ? di : pi, a = ui - r, o = di - i, {
			x: r,
			y: i,
			width: a,
			height: o
		};
	},
	intersect(e, t, n) {
		B.copy(e, B.getIntersectData(e, t, n));
	},
	isSame: (e, t) => e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height,
	isEmpty: (e) => e.x === 0 && e.y === 0 && e.width === 0 && e.height === 0,
	hasSize: (e) => e.width && e.height,
	reset(e) {
		B.set(e);
	}
}, B = z, { add: _i, copy: vi } = B, yi = class e {
	get minX() {
		return z.minX(this);
	}
	get minY() {
		return z.minY(this);
	}
	get maxX() {
		return z.maxX(this);
	}
	get maxY() {
		return z.maxY(this);
	}
	constructor(e, t, n, r) {
		this.set(e, t, n, r);
	}
	set(e, t, n, r) {
		return Gn(e) ? z.copy(this, e) : z.set(this, e, t, n, r), this;
	}
	get() {
		let { x: e, y: t, width: n, height: r } = this;
		return {
			x: e,
			y: t,
			width: n,
			height: r
		};
	}
	clone() {
		return new e(this);
	}
	move(e, t) {
		return z.move(this, e, t), this;
	}
	scale(e, t, n) {
		return z.scale(this, e, t, n), this;
	}
	scaleOf(e, t, n) {
		return z.scaleOf(this, e, t, n), this;
	}
	toOuterOf(e, t) {
		return z.toOuterOf(this, e, t), this;
	}
	toInnerOf(e, t) {
		return z.toInnerOf(this, e, t), this;
	}
	getFitMatrix(e, t) {
		return z.getFitMatrix(this, e, t);
	}
	put(e, t, n) {
		z.put(this, e, t, n);
	}
	spread(e, t) {
		return z.spread(this, e, t), this;
	}
	shrink(e, t) {
		return z.shrink(this, e, t), this;
	}
	ceil() {
		return z.ceil(this), this;
	}
	unsign() {
		return z.unsign(this), this;
	}
	float(e) {
		return z.float(this, e), this;
	}
	add(e) {
		return z.add(this, e), this;
	}
	addList(e) {
		return z.setList(this, e, !0), this;
	}
	setList(e) {
		return z.setList(this, e), this;
	}
	addListWithFn(e, t) {
		return z.setListWithFn(this, e, t, !0), this;
	}
	setListWithFn(e, t) {
		return z.setListWithFn(this, e, t), this;
	}
	setPoint(e) {
		return z.setPoint(this, e), this;
	}
	setPoints(e) {
		return z.setPoints(this, e), this;
	}
	addPoint(e) {
		return z.addPoint(this, e), this;
	}
	getPoints() {
		return z.getPoints(this);
	}
	getPoint(e, t, n) {
		return z.getPoint(this, e, t, n);
	}
	hitPoint(e, t) {
		return z.hitPoint(this, e, t);
	}
	hitRadiusPoint(e, t) {
		return z.hitRadiusPoint(this, e, t);
	}
	hit(e, t) {
		return z.hit(this, e, t);
	}
	includes(e, t) {
		return z.includes(this, e, t);
	}
	intersect(e, t) {
		return z.intersect(this, e, t), this;
	}
	getIntersect(t, n) {
		return new e(z.getIntersectData(this, t, n));
	}
	isSame(e) {
		return z.isSame(this, e);
	}
	isEmpty() {
		return z.isEmpty(this);
	}
	reset() {
		z.reset(this);
	}
}, bi = new yi(), xi = class {
	constructor(e, t, n, r, i, a) {
		Gn(e) ? this.copy(e) : this.set(e, t, n, r, i, a);
	}
	set(e = 0, t = 0, n = 0, r = 0, i = 0, a = 0) {
		this.top = e, this.right = t, this.bottom = n, this.left = r, this.width = i, this.height = a;
	}
	copy(e) {
		let { top: t, right: n, bottom: r, left: i, width: a, height: o } = e;
		this.set(t, n, r, i, a, o);
	}
	getBoundsFrom(e) {
		let { top: t, right: n, bottom: r, left: i, width: a, height: o } = this;
		return new yi(i, t, a || e.width - i - n, o || e.height - t - r);
	}
}, Si = { number: (e, t) => Gn(e) ? e.type === "percent" ? e.value * t : e.value : e }, Ci = {
	0: 1,
	1: 1,
	2: 1,
	3: 1,
	4: 1,
	5: 1,
	6: 1,
	7: 1,
	8: 1,
	9: 1,
	".": 1,
	e: 1,
	E: 1
}, { floor: wi, max: Ti } = Math, V = {
	toURL(e, t) {
		let n = encodeURIComponent(e);
		return t === "text" ? n = "data:text/plain;charset=utf-8," + n : t === "svg" && (n = "data:image/svg+xml," + n), n;
	},
	image: {
		hitCanvasSize: 100,
		maxCacheSize: 4096e3,
		maxPatternSize: 8847360,
		crossOrigin: "anonymous",
		isLarge: (e, t, n, r) => e.width * e.height * (t ? t * n : 1) > (r || Ei.maxCacheSize),
		isSuperLarge: (e, t, n) => Ei.isLarge(e, t, n, Ei.maxPatternSize),
		getRealURL(e) {
			let { prefix: t, suffix: n } = Ei;
			return !n || e.startsWith("data:") || e.startsWith("blob:") || (e += (e.includes("?") ? "&" : "?") + n), t && e[0] === "/" && (e = t + e), e;
		},
		resize(e, t, n, r, i, a, o, s, c, l) {
			let u = Ti(wi(t + (r || 0)), 1), d = Ti(wi(n + (i || 0)), 1), f, p, m;
			l && (m = Si.number(l.offset, l.type === "x" ? t : n)) && (l.type === "x" ? f = !0 : p = !0);
			let h = V.origin.createCanvas(p ? 2 * u : u, f ? 2 * d : d), g = h.getContext("2d");
			if (s && (g.globalAlpha = s), g.imageSmoothingEnabled = !1 !== o, Ei.canUse(e)) {
				if (a) {
					let r = t / a.width, i = n / a.height;
					g.setTransform(r, 0, 0, i, -a.x * r, -a.y * i), g.drawImage(e, 0, 0, e.width, e.height);
				} else g.drawImage(e, 0, 0, t, n);
				m && (g.drawImage(h, 0, 0, u, d, f ? m - u : u, f ? d : m - d, u, d), g.drawImage(h, 0, 0, u, d, f ? m : u, f ? d : m, u, d));
			}
			return h;
		},
		canUse: (e) => e && e.width && !e.__closed,
		setPatternTransform(e, t, n) {
			try {
				t && e.setTransform && (e.setTransform(t), t = void 0);
			} catch {}
			n && F.stintSet(n, "transform", t);
		}
	}
}, { image: Ei } = V, { randColor: Di } = mr, Oi = class e {
	constructor(e) {
		this.repeatMap = {}, this.name = e;
	}
	static get(t) {
		return new e(t);
	}
	static set filter(e) {
		this.filterList = ki(e);
	}
	static set exclude(e) {
		this.excludeList = ki(e);
	}
	static drawRepaint(e, t) {
		let n = Di();
		e.fillWorld(t, n.replace("1)", ".1)")), e.strokeWorld(t, n);
	}
	static drawBounds(t, n, r) {
		let i = e.showBounds === "hit", a = t.__nowWorld, o = Di();
		i && (n.setWorld(a), t.__drawHitPath(n), n.fillStyle = o.replace("1)", ".2)"), n.fill()), n.resetTransform(), n.setStroke(o, 2), i ? n.stroke() : n.strokeWorld(a, o);
	}
	log(...e) {
		if (Ai.enable) {
			if (Ai.filterList.length && Ai.filterList.every((e) => e !== this.name) || Ai.excludeList.length && Ai.excludeList.some((e) => e === this.name)) return;
			console.log("%c" + this.name, "color:#21ae62", ...e);
		}
	}
	tip(...e) {
		Ai.enable && this.warn(...e);
	}
	warn(...e) {
		Ai.showWarn && console.warn(this.name, ...e);
	}
	repeat(e, ...t) {
		this.repeatMap[e] || (this.warn("repeat:" + e, ...t), this.repeatMap[e] = !0);
	}
	error(...e) {
		try {
			throw Error();
		} catch (t) {
			console.error(this.name, ...e, t);
		}
	}
};
function ki(e) {
	return e ? Vn(e) && (e = [e]) : e = [], e;
}
Oi.filterList = [], Oi.excludeList = [], Oi.showWarn = !0;
var Ai = Oi, ji = Oi.get("RunTime"), Mi = {
	currentId: 0,
	currentName: "",
	idMap: {},
	nameMap: {},
	nameToIdMap: {},
	start(e, t) {
		let n = Xn.create(Xn.RUNTIME);
		return Ni.currentId = Ni.idMap[n] = t ? performance.now() : Date.now(), Ni.currentName = Ni.nameMap[n] = e, Ni.nameToIdMap[e] = n, n;
	},
	end(e, t) {
		let n = Ni.idMap[e], r = Ni.nameMap[e], i = t ? (performance.now() - n) / 1e3 : Date.now() - n;
		Ni.idMap[e] = Ni.nameMap[e] = Ni.nameToIdMap[r] = void 0, ji.log(r, i, "ms");
	},
	endOfName(e, t) {
		let n = Ni.nameToIdMap[e];
		P(n) || Ni.end(n, t);
	}
}, Ni = Mi, Pi = [], Fi = {
	list: {},
	add(e, ...t) {
		this.list[e] = !0, Pi.push(...t);
	},
	has(e, t) {
		let n = this.list[e];
		return !n && t && this.need(e), n;
	},
	need(e) {
		console.error("please install and import plugin: " + (e.includes("-x") ? "" : "@leafer-in/") + e);
	}
};
setTimeout(() => Pi.forEach((e) => Fi.has(e, !0)));
var Ii = { editor: (e) => Fi.need("editor") }, Li = Oi.get("UICreator"), Ri = {
	list: {},
	register(e) {
		let { __tag: t } = e.prototype;
		zi[t] && Li.repeat(t), zi[t] = e;
	},
	get(e, t, n, r, i, a) {
		if (!zi[e]) return void Li.warn("not register " + e);
		let o = new zi[e](t);
		return P(n) || (o.x = n, r && (o.y = r), i && (o.width = i), a && (o.height = a)), o;
	}
}, { list: zi } = Ri, Bi = Oi.get("EventCreator"), Vi = {
	nameList: {},
	register(e) {
		let t;
		Object.keys(e).forEach((n) => {
			t = e[n], Vn(t) && (Hi[t] && Bi.repeat(t), Hi[t] = e);
		});
	},
	changeName(e, t) {
		let n = Hi[e];
		if (n) {
			let r = Object.keys(n).find((t) => n[t] === e);
			r && (n[r] = t, Hi[t] = n);
		}
	},
	has(e) {
		return !!this.nameList[e];
	},
	get: (e, ...t) => new Hi[e](...t)
}, { nameList: Hi } = Vi, Ui = class {
	constructor() {
		this.list = [];
	}
	add(e) {
		e.manager = this, this.list.push(e);
	}
	get(e) {
		let t, { list: n } = this;
		for (let r = 0, i = n.length; r < i; r++) if (t = n[r], t.recycled && t.isSameSize(e)) return t.recycled = !1, t.manager ||= this, t;
		let r = Ii.canvas(e);
		return this.add(r), r;
	}
	recycle(e) {
		e.recycled = !0;
	}
	clearRecycled() {
		let e, t = [];
		for (let n = 0, r = this.list.length; n < r; n++) e = this.list[n], e.recycled ? e.destroy() : t.push(e);
		this.list = t;
	}
	clear() {
		this.list.forEach((e) => {
			e.destroy();
		}), this.list.length = 0;
	}
	destroy() {
		this.clear();
	}
};
function H(e, t, n, r) {
	var i, a = arguments.length, o = a < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") o = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (i = e[s]) && (o = (a < 3 ? i(o) : a > 3 ? i(t, n, o) : i(t, n)) || o);
	return a > 3 && o && Object.defineProperty(t, n, o), o;
}
function Wi(e, t, n, r) {
	return new (n ||= Promise)(function(i, a) {
		function o(e) {
			try {
				c(r.next(e));
			} catch (e) {
				a(e);
			}
		}
		function s(e) {
			try {
				c(r.throw(e));
			} catch (e) {
				a(e);
			}
		}
		function c(e) {
			var t;
			e.done ? i(e.value) : (t = e.value, t instanceof n ? t : new n(function(e) {
				e(t);
			})).then(o, s);
		}
		c((r = r.apply(e, t || [])).next());
	});
}
function Gi(e) {
	return (t, n) => {
		e ||= n;
		let r = {
			get() {
				return this.context[e];
			},
			set(t) {
				this.context[e] = t;
			}
		};
		n === "strokeCap" && (r.set = function(t) {
			this.context[e] = t === "none" ? "butt" : t;
		}), Object.defineProperty(t, n, r);
	};
}
var Ki = [];
function U() {
	return (e, t) => {
		Ki.push(t);
	};
}
var qi = [], W = class {
	set blendMode(e) {
		e === "normal" && (e = "source-over"), this.context.globalCompositeOperation = e;
	}
	get blendMode() {
		return this.context.globalCompositeOperation;
	}
	set dashPattern(e) {
		this.context.setLineDash(e || qi);
	}
	get dashPattern() {
		return this.context.getLineDash();
	}
	__bindContext() {
		let e;
		Ki.forEach((t) => {
			e = this.context[t], e && (this[t] = e.bind(this.context));
		}), this.textBaseline = "alphabetic";
	}
	setTransform(e, t, n, r, i, a) {}
	resetTransform() {}
	getTransform() {}
	save() {}
	restore() {}
	transform(e, t, n, r, i, a) {
		Gn(e) ? this.context.transform(e.a, e.b, e.c, e.d, e.e, e.f) : this.context.transform(e, t, n, r, i, a);
	}
	translate(e, t) {}
	scale(e, t) {}
	rotate(e) {}
	fill(e, t) {}
	stroke(e) {}
	clip(e, t) {}
	fillRect(e, t, n, r) {}
	strokeRect(e, t, n, r) {}
	clearRect(e, t, n, r) {}
	drawImage(e, t, n, r, i, a, o, s, c) {
		switch (arguments.length) {
			case 9:
				if (t < 0) {
					let e = -t / r * s;
					r += t, t = 0, a += e, s -= e;
				}
				if (n < 0) {
					let e = -n / i * c;
					i += n, n = 0, o += e, c -= e;
				}
				this.context.drawImage(e, t, n, r, i, a, o, s, c);
				break;
			case 5:
				this.context.drawImage(e, t, n, r, i);
				break;
			case 3: this.context.drawImage(e, t, n);
		}
	}
	beginPath() {}
	moveTo(e, t) {}
	lineTo(e, t) {}
	bezierCurveTo(e, t, n, r, i, a) {}
	quadraticCurveTo(e, t, n, r) {}
	closePath() {}
	arc(e, t, n, r, i, a) {}
	arcTo(e, t, n, r, i) {}
	ellipse(e, t, n, r, i, a, o, s) {}
	rect(e, t, n, r) {}
	roundRect(e, t, n, r, i) {}
	createConicGradient(e, t, n) {}
	createLinearGradient(e, t, n, r) {}
	createPattern(e, t) {}
	createRadialGradient(e, t, n, r, i, a) {}
	fillText(e, t, n, r) {}
	measureText(e) {}
	strokeText(e, t, n, r) {}
	destroy() {
		this.context = null;
	}
};
H([Gi("imageSmoothingEnabled")], W.prototype, "smooth", void 0), H([Gi("imageSmoothingQuality")], W.prototype, "smoothLevel", void 0), H([Gi("globalAlpha")], W.prototype, "opacity", void 0), H([Gi()], W.prototype, "fillStyle", void 0), H([Gi()], W.prototype, "strokeStyle", void 0), H([Gi("lineWidth")], W.prototype, "strokeWidth", void 0), H([Gi("lineCap")], W.prototype, "strokeCap", void 0), H([Gi("lineJoin")], W.prototype, "strokeJoin", void 0), H([Gi("lineDashOffset")], W.prototype, "dashOffset", void 0), H([Gi()], W.prototype, "miterLimit", void 0), H([Gi()], W.prototype, "shadowBlur", void 0), H([Gi()], W.prototype, "shadowColor", void 0), H([Gi()], W.prototype, "shadowOffsetX", void 0), H([Gi()], W.prototype, "shadowOffsetY", void 0), H([Gi()], W.prototype, "filter", void 0), H([Gi()], W.prototype, "font", void 0), H([Gi()], W.prototype, "fontKerning", void 0), H([Gi()], W.prototype, "fontStretch", void 0), H([Gi()], W.prototype, "fontVariantCaps", void 0), H([Gi()], W.prototype, "textAlign", void 0), H([Gi()], W.prototype, "textBaseline", void 0), H([Gi()], W.prototype, "textRendering", void 0), H([Gi()], W.prototype, "wordSpacing", void 0), H([Gi()], W.prototype, "letterSpacing", void 0), H([Gi()], W.prototype, "direction", void 0), H([U()], W.prototype, "setTransform", null), H([U()], W.prototype, "resetTransform", null), H([U()], W.prototype, "getTransform", null), H([U()], W.prototype, "save", null), H([U()], W.prototype, "restore", null), H([U()], W.prototype, "translate", null), H([U()], W.prototype, "scale", null), H([U()], W.prototype, "rotate", null), H([U()], W.prototype, "fill", null), H([U()], W.prototype, "stroke", null), H([U()], W.prototype, "clip", null), H([U()], W.prototype, "fillRect", null), H([U()], W.prototype, "strokeRect", null), H([U()], W.prototype, "clearRect", null), H([U()], W.prototype, "beginPath", null), H([U()], W.prototype, "moveTo", null), H([U()], W.prototype, "lineTo", null), H([U()], W.prototype, "bezierCurveTo", null), H([U()], W.prototype, "quadraticCurveTo", null), H([U()], W.prototype, "closePath", null), H([U()], W.prototype, "arc", null), H([U()], W.prototype, "arcTo", null), H([U()], W.prototype, "ellipse", null), H([U()], W.prototype, "rect", null), H([U()], W.prototype, "roundRect", null), H([U()], W.prototype, "createConicGradient", null), H([U()], W.prototype, "createLinearGradient", null), H([U()], W.prototype, "createPattern", null), H([U()], W.prototype, "createRadialGradient", null), H([U()], W.prototype, "fillText", null), H([U()], W.prototype, "measureText", null), H([U()], W.prototype, "strokeText", null);
var { copy: Ji, multiplyParent: Yi, pixelScale: Xi } = L, { round: Zi } = Math, G = new yi(), Qi = new yi(), $i = {
	width: 1,
	height: 1,
	pixelRatio: 1
}, ea = [
	"width",
	"height",
	"pixelRatio"
], ta = class extends W {
	get width() {
		return this.size.width;
	}
	get height() {
		return this.size.height;
	}
	get pixelRatio() {
		return this.size.pixelRatio;
	}
	get pixelWidth() {
		return this.width * this.pixelRatio || 0;
	}
	get pixelHeight() {
		return this.height * this.pixelRatio || 0;
	}
	get pixelSnap() {
		return this.config.pixelSnap;
	}
	set pixelSnap(e) {
		this.config.pixelSnap = e;
	}
	get allowBackgroundColor() {
		return this.view && this.parentView;
	}
	constructor(e, t) {
		super(), this.size = {}, this.worldTransform = {}, e ||= $i, this.manager = t, this.innerId = Xn.create(Xn.CANVAS);
		let { width: n, height: r, pixelRatio: i } = e;
		this.autoLayout = !n || !r, this.size.pixelRatio = i || V.devicePixelRatio, this.config = e, this.init();
	}
	init() {}
	__createContext() {
		let { view: e } = this, { contextSettings: t } = this.config;
		this.context = t ? e.getContext("2d", t) : e.getContext("2d"), this.__bindContext();
	}
	export(e, t) {}
	toBlob(e, t) {}
	toDataURL(e, t) {}
	saveAs(e, t) {}
	resize(e, t = !0) {
		if (this.isSameSize(e)) return;
		let n;
		this.context && !this.unreal && t && this.width && (n = this.getSameCanvas(), n.copyWorld(this));
		let r = this.size;
		F.copyAttrs(r, e, ea), ea.forEach((e) => r[e] || (r[e] = 1)), this.bounds = new yi(0, 0, this.width, this.height), this.updateViewSize(), this.updateClientBounds(), this.context && (this.smooth = this.config.smooth, !this.unreal && n && (this.clearWorld(n.bounds), this.copyWorld(n), n.recycle()));
	}
	updateViewSize() {}
	updateClientBounds() {}
	getClientBounds(e) {
		return e && this.updateClientBounds(), this.clientBounds || this.bounds;
	}
	startAutoLayout(e, t) {}
	stopAutoLayout() {}
	setCursor(e) {}
	setWorld(e, t) {
		let { pixelRatio: n, pixelSnap: r } = this, i = this.worldTransform;
		t && Yi(e, t, i), Xi(e, n, i), r && !e.ignorePixelSnap && (e.half && e.half * n % 2 ? (i.e = Zi(i.e - .5) + .5, i.f = Zi(i.f - .5) + .5) : (i.e = Zi(i.e), i.f = Zi(i.f))), this.setTransform(i.a, i.b, i.c, i.d, i.e, i.f);
	}
	useWorldTransform(e) {
		e && (this.worldTransform = e);
		let t = this.worldTransform;
		t && this.setTransform(t.a, t.b, t.c, t.d, t.e, t.f);
	}
	setStroke(e, t, n, r) {
		t && (this.strokeWidth = t), e && (this.strokeStyle = e), n && this.setStrokeOptions(n, r);
	}
	setStrokeOptions(e, t) {
		let { strokeCap: n, strokeJoin: r, dashPattern: i, dashOffset: a, miterLimit: o } = e;
		t && (t.strokeCap && (n = t.strokeCap), t.strokeJoin && (r = t.strokeJoin), P(t.dashPattern) || (i = t.dashPattern), P(t.dashOffset) || (a = t.dashOffset), t.miterLimit && (o = t.miterLimit)), this.strokeCap = n, this.strokeJoin = r, this.dashPattern = i, this.dashOffset = a, this.miterLimit = o;
	}
	saveBlendMode(e) {
		this.savedBlendMode = this.blendMode, this.blendMode = e;
	}
	restoreBlendMode() {
		this.blendMode = this.savedBlendMode;
	}
	hitFill(e, t) {
		return !0;
	}
	hitStroke(e, t) {
		return !0;
	}
	hitPixel(e, t, n = 1) {
		return !0;
	}
	setWorldShadow(e, t, n, r) {
		let { pixelRatio: i } = this;
		this.shadowOffsetX = e * i, this.shadowOffsetY = t * i, this.shadowBlur = n * i, this.shadowColor = r || "black";
	}
	setWorldBlur(e) {
		let { pixelRatio: t } = this;
		this.filter = `blur(${e * t}px)`;
	}
	copyWorld(e, t, n, r, i) {
		r && (this.blendMode = r), t ? (this.setTempPixelBounds(t, i), n ? (this.setTempPixelBounds2(n, i), n = Qi) : n = G, this.drawImage(e.view, G.x, G.y, G.width, G.height, n.x, n.y, n.width, n.height)) : this.drawImage(e.view, 0, 0), r && (this.blendMode = "source-over");
	}
	copyWorldToInner(e, t, n, r, i) {
		t.b || t.c ? (this.save(), this.resetTransform(), this.copyWorld(e, t, z.tempToOuterOf(n, t), r, i), this.restore()) : (r && (this.blendMode = r), this.setTempPixelBounds(t, i), this.drawImage(e.view, G.x, G.y, G.width, G.height, n.x, n.y, n.width, n.height), r && (this.blendMode = "source-over"));
	}
	copyWorldByReset(e, t, n, r, i, a) {
		this.resetTransform(), this.copyWorld(e, t, n, r, a), i || this.useWorldTransform();
	}
	useGrayscaleAlpha(e) {
		if (this.setTempPixelBounds(e, !0, !0), !G.width || !G.height) return;
		let t, n, { context: r } = this, i = r.getImageData(G.x, G.y, G.width, G.height), { data: a } = i;
		for (let e = 0, r = a.length; e < r; e += 4) n = .299 * a[e] + .587 * a[e + 1] + .114 * a[e + 2], (t = a[e + 3]) && (a[e + 3] = t === 255 ? n : n / 255 * t);
		r.putImageData(i, G.x, G.y);
	}
	useMask(e, t, n) {
		this.copyWorld(e, t, n, "destination-in");
	}
	useEraser(e, t, n) {
		this.copyWorld(e, t, n, "destination-out");
	}
	fillWorld(e, t, n, r) {
		n && (this.blendMode = n), this.fillStyle = t, this.setTempPixelBounds(e, r), this.fillRect(G.x, G.y, G.width, G.height), n && (this.blendMode = "source-over");
	}
	strokeWorld(e, t, n, r) {
		n && (this.blendMode = n), this.strokeStyle = t, this.setTempPixelBounds(e, r), this.strokeRect(G.x, G.y, G.width, G.height), n && (this.blendMode = "source-over");
	}
	clipWorld(e, t = !0) {
		this.beginPath(), this.setTempPixelBounds(e, t), this.rect(G.x, G.y, G.width, G.height), this.clip();
	}
	clipUI(e) {
		e.windingRule ? this.clip(e.windingRule) : this.clip();
	}
	clearWorld(e, t = !0) {
		this.setTempPixelBounds(e, t), this.clearRect(G.x, G.y, G.width, G.height);
	}
	clear() {
		let { pixelRatio: e } = this;
		this.clearRect(0, 0, this.width * e + 2, this.height * e + 2);
	}
	setTempPixelBounds(e, t, n) {
		this.copyToPixelBounds(G, e, t, n);
	}
	setTempPixelBounds2(e, t, n) {
		this.copyToPixelBounds(Qi, e, t, n);
	}
	copyToPixelBounds(e, t, n, r) {
		e.set(t), r && e.intersect(this.bounds), e.scale(this.pixelRatio), n && e.ceil();
	}
	isSameSize(e) {
		return this.width === e.width && this.height === e.height && (!e.pixelRatio || this.pixelRatio === e.pixelRatio);
	}
	getSameCanvas(e, t) {
		let { size: n, pixelSnap: r } = this, i = this.manager ? this.manager.get(n) : Ii.canvas(Object.assign({}, n));
		return i.save(), e && (Ji(i.worldTransform, this.worldTransform), i.useWorldTransform()), t && (i.smooth = this.smooth), i.pixelSnap !== r && (i.pixelSnap = r), i;
	}
	recycle(e) {
		this.recycled || (this.restore(), e ? this.clearWorld(e) : this.clear(), this.manager ? this.manager.recycle(this) : this.destroy());
	}
	updateRender(e) {}
	unrealCanvas() {}
	destroy() {
		this.manager = this.view = this.parentView = null;
	}
}, na = {
	creator: {},
	parse(e, t) {},
	convertToCanvasData(e, t) {}
}, ra = {
	N: 21,
	D: 22,
	X: 23,
	G: 24,
	F: 25,
	O: 26,
	P: 27,
	U: 28
}, ia = Object.assign({
	M: 1,
	m: 10,
	L: 2,
	l: 20,
	H: 3,
	h: 30,
	V: 4,
	v: 40,
	C: 5,
	c: 50,
	S: 6,
	s: 60,
	Q: 7,
	q: 70,
	T: 8,
	t: 80,
	A: 9,
	a: 90,
	Z: 11,
	z: 11,
	R: 12
}, ra), aa = {
	M: 3,
	m: 3,
	L: 3,
	l: 3,
	H: 2,
	h: 2,
	V: 2,
	v: 2,
	C: 7,
	c: 7,
	S: 5,
	s: 5,
	Q: 5,
	q: 5,
	T: 3,
	t: 3,
	A: 8,
	a: 8,
	Z: 1,
	z: 1,
	N: 5,
	D: 9,
	X: 6,
	G: 9,
	F: 5,
	O: 7,
	P: 4,
	U: 6
}, oa = {
	m: 10,
	l: 20,
	H: 3,
	h: 30,
	V: 4,
	v: 40,
	c: 50,
	S: 6,
	s: 60,
	q: 70,
	T: 8,
	t: 80,
	A: 9,
	a: 90
}, sa = Object.assign(Object.assign({}, oa), ra), ca = ia, la = {};
for (let e in ca) la[ca[e]] = e;
var ua = {};
for (let e in ca) ua[ca[e]] = aa[e];
var da = { drawRoundRect(e, t, n, r, i, a) {
	let o = mr.fourNumber(a, Math.min(r / 2, i / 2)), s = t + r, c = n + i;
	o[0] ? e.moveTo(t + o[0], n) : e.moveTo(t, n), o[1] ? e.arcTo(s, n, s, c, o[1]) : e.lineTo(s, n), o[2] ? e.arcTo(s, c, t, c, o[2]) : e.lineTo(s, c), o[3] ? e.arcTo(t, c, t, n, o[3]) : e.lineTo(t, c), o[0] ? e.arcTo(t, n, s, n, o[0]) : e.lineTo(t, n);
} }, { sin: fa, cos: pa, hypot: ma, atan2: ha, ceil: ga, abs: _a, PI: va, sqrt: ya, pow: ba } = Math, { setPoint: xa, addPoint: Sa } = Kr, { set: Ca, toNumberPoints: wa } = R, { M: Ta, L: Ea, C: Da, Q: Oa, Z: ka } = ia, Aa = {}, ja = {
	points(e, t, n, r) {
		let i = wa(t);
		if (e.push(Ta, i[0], i[1]), n && i.length > 5) {
			let t, a, o, s, c, l, u, d, f, p, m, h, g, _, v, y = i.length, b = !0 === n ? .5 : n;
			r && (i = [
				i[y - 2],
				i[y - 1],
				...i,
				i[0],
				i[1],
				i[2],
				i[3]
			], y = i.length);
			for (let n = 2; n < y - 2; n += 2) t = i[n - 2], a = i[n - 1], o = i[n], s = i[n + 1], c = i[n + 2], l = i[n + 3], m = o - t, h = s - a, g = ya(ba(m, 2) + ba(h, 2)), _ = ya(ba(c - o, 2) + ba(l - s, 2)), (g || _) && (v = g + _, g = b * g / v, _ = b * _ / v, c -= t, l -= a, u = o - g * c, d = s - g * l, n === 2 ? r || e.push(Oa, u, d, o, s) : (m || h) && e.push(Da, f, p, u, d, o, s), f = o + _ * c, p = s + _ * l);
			r || e.push(Oa, f, p, i[y - 2], i[y - 1]);
		} else for (let t = 2, n = i.length; t < n; t += 2) e.push(Ea, i[t], i[t + 1]);
		r && e.push(ka);
	},
	rect(e, t, n, r, i) {
		na.creator.path = e, na.creator.moveTo(t, n).lineTo(t + r, n).lineTo(t + r, n + i).lineTo(t, n + i).lineTo(t, n);
	},
	roundRect(e, t, n, r, i, a) {
		na.creator.path = [], da.drawRoundRect(na.creator, t, n, r, i, a), e.push(...na.convertToCanvasData(na.creator.path, !0));
	},
	arcTo(e, t, n, r, i, a, o, s, c, l, u) {
		let d = r - t, f = i - n, p = a - r, m = o - i, h = ha(f, d), g = ha(m, p), _ = ma(d, f), v = ma(p, m), y = g - h;
		if (y < 0 && (y += gr), _ < 1e-12 || v < 1e-12 || y < 1e-12 || _a(y - va) < 1e-12) return e && e.push(Ea, r, i), c && (xa(c, t, n), Sa(c, r, i)), u && Ca(u, t, n), void (l && Ca(l, r, i));
		let b = d * m - p * f < 0, x = b ? -1 : 1, S = s / pa(y / 2), C = r + S * pa(h + y / 2 + _r * x), w = i + S * fa(h + y / 2 + _r * x);
		return h -= _r * x, g -= _r * x, Pa(e, C, w, s, s, 0, h / I, g / I, b, c, l, u);
	},
	arc: (e, t, n, r, i, a, o, s, c, l) => Pa(e, t, n, r, r, 0, i, a, o, s, c, l),
	ellipse(e, t, n, r, i, a, o, s, c, l, u, d) {
		let f = a * I, p = fa(f), m = pa(f), h = o * I, g = s * I;
		h > va && (h -= gr), g < 0 && (g += gr);
		let _ = g - h;
		_ < 0 ? _ += gr : _ > gr && (_ -= gr), c && (_ -= gr);
		let v = ga(_a(_ / _r)), y = _ / v, b = fa(y / 4), x = 8 / 3 * b * b / fa(y / 2);
		g = h + y;
		let S, C, w, T, ee, E, te, ne, re = pa(h), ie = fa(h), ae = w = m * r * re - p * i * ie, oe = T = p * r * re + m * i * ie, se = t + w, ce = n + T;
		e && e.push(e.length ? Ea : Ta, se, ce), l && xa(l, se, ce), d && Ca(d, se, ce);
		for (let a = 0; a < v; a++) S = pa(g), C = fa(g), w = m * r * S - p * i * C, T = p * r * S + m * i * C, ee = t + ae - x * (m * r * ie + p * i * re), E = n + oe - x * (p * r * ie - m * i * re), te = t + w + x * (m * r * C + p * i * S), ne = n + T + x * (p * r * C - m * i * S), e && e.push(Da, ee, E, te, ne, t + w, n + T), l && Na(t + ae, n + oe, ee, E, te, ne, t + w, n + T, l, !0), ae = w, oe = T, re = S, ie = C, h = g, g += y;
		u && Ca(u, t + w, n + T);
	},
	quadraticCurveTo(e, t, n, r, i, a, o) {
		e.push(Da, (t + 2 * r) / 3, (n + 2 * i) / 3, (a + 2 * r) / 3, (o + 2 * i) / 3, a, o);
	},
	toTwoPointBoundsByQuadraticCurve(e, t, n, r, i, a, o, s) {
		Na(e, t, (e + 2 * n) / 3, (t + 2 * r) / 3, (i + 2 * n) / 3, (a + 2 * r) / 3, i, a, o, s);
	},
	toTwoPointBounds(e, t, n, r, i, a, o, s, c, l) {
		let u = [], d, f, p, m, h, g, _, v, y = e, b = n, x = i, S = o;
		for (let e = 0; e < 2; ++e) if (e == 1 && (y = t, b = r, x = a, S = s), d = -3 * y + 9 * b - 9 * x + 3 * S, f = 6 * y - 12 * b + 6 * x, p = 3 * b - 3 * y, Math.abs(d) < 1e-12) {
			if (Math.abs(f) < 1e-12) continue;
			m = -p / f, 0 < m && m < 1 && u.push(m);
		} else _ = f * f - 4 * p * d, v = Math.sqrt(_), _ < 0 || (h = (-f + v) / (2 * d), 0 < h && h < 1 && u.push(h), g = (-f - v) / (2 * d), 0 < g && g < 1 && u.push(g));
		l ? Sa(c, e, t) : xa(c, e, t), Sa(c, o, s);
		for (let l = 0, d = u.length; l < d; l++) Ma(u[l], e, t, n, r, i, a, o, s, Aa), Sa(c, Aa.x, Aa.y);
	},
	getPointAndSet(e, t, n, r, i, a, o, s, c, l) {
		let u = 1 - e, d = u * u * u, f = 3 * u * u * e, p = 3 * u * e * e, m = e * e * e;
		l.x = d * t + f * r + p * a + m * s, l.y = d * n + f * i + p * o + m * c;
	},
	getPoint(e, t, n, r, i, a, o, s, c) {
		let l = {};
		return Ma(e, t, n, r, i, a, o, s, c, l), l;
	},
	getDerivative(e, t, n, r, i) {
		let a = 1 - e;
		return 3 * a * a * (n - t) + 6 * a * e * (r - n) + 3 * e * e * (i - r);
	},
	cut(e, t, n, r, i, a, o, s, c) {
		if (e <= 0) return {
			left: null,
			right: [
				r,
				i,
				a,
				o,
				s,
				c
			]
		};
		if (e >= 1) return {
			left: [
				r,
				i,
				a,
				o,
				s,
				c
			],
			right: null
		};
		let l = 1 - e, u = t * l + r * e, d = n * l + i * e, f = r * l + a * e, p = i * l + o * e, m = a * l + s * e, h = o * l + c * e, g = u * l + f * e, _ = d * l + p * e, v = f * l + m * e, y = p * l + h * e;
		return {
			left: [
				u,
				d,
				g,
				_,
				g * l + v * e,
				_ * l + y * e
			],
			right: [
				v,
				y,
				m,
				h,
				s,
				c
			]
		};
	}
}, { getPointAndSet: Ma, toTwoPointBounds: Na, ellipse: Pa } = ja, { sin: Fa, cos: Ia, sqrt: La, atan2: Ra } = Math, { ellipse: za } = ja, Ba = { ellipticalArc(e, t, n, r, i, a, o, s, c, l, u) {
	let d = (c - t) / 2, f = (l - n) / 2, p = a * I, m = Fa(p), h = Ia(p), g = -h * d - m * f, _ = -h * f + m * d, v = r * r, y = i * i, b = _ * _, x = g * g, S = v * y - v * b - y * x, C = 0;
	if (S < 0) {
		let e = La(1 - S / (v * y));
		r *= e, i *= e;
	} else C = (o === s ? -1 : 1) * La(S / (v * b + y * x));
	let w = C * r * _ / i, T = -C * i * g / r, ee = Ra((_ - T) / i, (g - w) / r), E = Ra((-_ - T) / i, (-g - w) / r), te = E - ee;
	s === 0 && te > 0 ? te -= gr : s === 1 && te < 0 && (te += gr);
	let ne = t + d + h * w - m * T, re = n + f + m * w + h * T, ie = +(te < 0);
	u || V.ellipseToCurve ? za(e, ne, re, r, i, a, ee / I, E / I, ie) : r !== i || a ? e.push(ia.G, ne, re, r, i, a, ee / I, E / I, ie) : e.push(ia.O, ne, re, r, ee / I, E / I, ie);
} }, Va = {
	toCommand: (e) => [],
	toNode: (e) => []
}, { M: Ha, m: Ua, L: Wa, l: Ga, H: Ka, h: qa, V: Ja, v: Ya, C: Xa, c: Za, S: Qa, s: $a, Q: eo, q: to, T: no, t: ro, A: io, a: ao, Z: oo, z: so, N: co, D: lo, X: uo, G: fo, F: po, O: mo, P: ho, U: go } = ia, { rect: _o, roundRect: vo, arcTo: yo, arc: bo, ellipse: xo, quadraticCurveTo: So } = ja, { ellipticalArc: Co } = Ba, wo = Oi.get("PathConvert"), To = {}, Eo = {
	current: { dot: 0 },
	stringify(e, t) {
		let n, r, i, a = 0, o = e.length, s = "";
		for (; a < o;) {
			r = e[a], n = ua[r], s += r === i ? " " : la[r];
			for (let r = 1; r < n; r++) s += mr.float(e[a + r], t), r === n - 1 || (s += " ");
			i = r, a += n;
		}
		return s;
	},
	parse(e, t) {
		let n, r, i, a = "", o = [], s = t ? sa : oa;
		for (let t = 0, c = e.length; t < c; t++) r = e[t], Ci[r] ? (r === "." && (Do.dot && (Oo(o, a), a = ""), Do.dot++), a === "0" && r !== "." && (Oo(o, a), a = ""), a += r) : ia[r] ? (a &&= (Oo(o, a), ""), Do.name = ia[r], Do.length = aa[r], Do.index = 0, Oo(o, Do.name), r === "m" ? Do.name = ia.l : r === "M" && (Do.name = ia.L), !n && s[r] && (n = !0)) : r === "-" || r === "+" ? i === "e" || i === "E" ? a += r : (a && Oo(o, a), a = r) : a &&= (Oo(o, a), ""), i = r;
		return a && Oo(o, a), n ? Eo.toCanvasData(o, t) : o;
	},
	toCanvasData(e, t) {
		let n, r, i, a, o, s = 0, c = 0, l = 0, u = 0, d = 0, f = 0, p = 0, m = e.length, h = [];
		for (; p < m;) {
			switch (i = e[p], i) {
				case Ua: e[p + 1] += s, e[p + 2] += c;
				case Ha:
					s = d = e[p + 1], c = f = e[p + 2], h.push(Ha, s, c), p += 3;
					break;
				case qa: e[p + 1] += s;
				case Ka:
					s = e[p + 1], h.push(Wa, s, c), p += 2;
					break;
				case Ya: e[p + 1] += c;
				case Ja:
					c = e[p + 1], h.push(Wa, s, c), p += 2;
					break;
				case Ga: e[p + 1] += s, e[p + 2] += c;
				case Wa:
					s = e[p + 1], c = e[p + 2], h.push(Wa, s, c), p += 3;
					break;
				case $a: e[p + 1] += s, e[p + 2] += c, e[p + 3] += s, e[p + 4] += c, i = Qa;
				case Qa:
					o = a === Xa || a === Qa, l = o ? 2 * s - n : s, u = o ? 2 * c - r : c, n = e[p + 1], r = e[p + 2], s = e[p + 3], c = e[p + 4], h.push(Xa, l, u, n, r, s, c), p += 5;
					break;
				case Za: e[p + 1] += s, e[p + 2] += c, e[p + 3] += s, e[p + 4] += c, e[p + 5] += s, e[p + 6] += c, i = Xa;
				case Xa:
					n = e[p + 3], r = e[p + 4], s = e[p + 5], c = e[p + 6], h.push(Xa, e[p + 1], e[p + 2], n, r, s, c), p += 7;
					break;
				case ro: e[p + 1] += s, e[p + 2] += c, i = no;
				case no:
					o = a === eo || a === no, n = o ? 2 * s - n : s, r = o ? 2 * c - r : c, t ? So(h, s, c, n, r, e[p + 1], e[p + 2]) : h.push(eo, n, r, e[p + 1], e[p + 2]), s = e[p + 1], c = e[p + 2], p += 3;
					break;
				case to: e[p + 1] += s, e[p + 2] += c, e[p + 3] += s, e[p + 4] += c, i = eo;
				case eo:
					n = e[p + 1], r = e[p + 2], t ? So(h, s, c, n, r, e[p + 3], e[p + 4]) : h.push(eo, n, r, e[p + 3], e[p + 4]), s = e[p + 3], c = e[p + 4], p += 5;
					break;
				case ao: e[p + 6] += s, e[p + 7] += c;
				case io:
					Co(h, s, c, e[p + 1], e[p + 2], e[p + 3], e[p + 4], e[p + 5], e[p + 6], e[p + 7], t), s = e[p + 6], c = e[p + 7], p += 8;
					break;
				case so:
				case oo:
					h.push(oo), s = d, c = f, p++;
					break;
				case co:
					s = e[p + 1], c = e[p + 2], t ? _o(h, s, c, e[p + 3], e[p + 4]) : ko(h, e, p, 5), p += 5;
					break;
				case lo:
					s = e[p + 1], c = e[p + 2], t ? vo(h, s, c, e[p + 3], e[p + 4], [
						e[p + 5],
						e[p + 6],
						e[p + 7],
						e[p + 8]
					]) : ko(h, e, p, 9), p += 9;
					break;
				case uo:
					s = e[p + 1], c = e[p + 2], t ? vo(h, s, c, e[p + 3], e[p + 4], e[p + 5]) : ko(h, e, p, 6), p += 6;
					break;
				case fo:
					xo(t ? h : ko(h, e, p, 9), e[p + 1], e[p + 2], e[p + 3], e[p + 4], e[p + 5], e[p + 6], e[p + 7], e[p + 8], null, To), s = To.x, c = To.y, p += 9;
					break;
				case po:
					t ? xo(h, e[p + 1], e[p + 2], e[p + 3], e[p + 4], 0, 0, 360, !1) : ko(h, e, p, 5), s = e[p + 1] + e[p + 3], c = e[p + 2], p += 5;
					break;
				case mo:
					bo(t ? h : ko(h, e, p, 7), e[p + 1], e[p + 2], e[p + 3], e[p + 4], e[p + 5], e[p + 6], null, To), s = To.x, c = To.y, p += 7;
					break;
				case ho:
					t ? bo(h, e[p + 1], e[p + 2], e[p + 3], 0, 360, !1) : ko(h, e, p, 4), s = e[p + 1] + e[p + 3], c = e[p + 2], p += 4;
					break;
				case go:
					yo(t ? h : ko(h, e, p, 6), s, c, e[p + 1], e[p + 2], e[p + 3], e[p + 4], e[p + 5], null, To), s = To.x, c = To.y, p += 6;
					break;
				default: return wo.error(`command: ${i} [index:${p}]`, e), h;
			}
			a = i;
		}
		return h;
	},
	objectToCanvasData(e) {
		if (e[0].name.length > 1) return Va.toCommand(e);
		{
			let t = [];
			return e.forEach((e) => {
				switch (e.name) {
					case "M":
						t.push(Ha, e.x, e.y);
						break;
					case "L":
						t.push(Wa, e.x, e.y);
						break;
					case "C":
						t.push(Xa, e.x1, e.y1, e.x2, e.y2, e.x, e.y);
						break;
					case "Q":
						t.push(eo, e.x1, e.y1, e.x, e.y);
						break;
					case "Z": t.push(oo);
				}
			}), t;
		}
	},
	copyData(e, t, n, r) {
		for (let i = n, a = n + r; i < a; i++) e.push(t[i]);
	},
	pushData(e, t) {
		Do.index === Do.length && (Do.index = 1, e.push(Do.name)), e.push(Number(t)), Do.index++, Do.dot = 0;
	}
}, { current: Do, pushData: Oo, copyData: ko } = Eo, { M: Ao, L: jo, C: Mo, Q: No, Z: Po, N: Fo, D: Io, X: Lo, G: Ro, F: zo, O: Bo, P: Vo, U: Ho } = ia, { getMinDistanceFrom: Uo, getRadianFrom: Wo } = R, { tan: Go, min: Ko, abs: qo } = Math, Jo = {}, Yo = {
	beginPath(e) {
		e.length = 0;
	},
	moveTo(e, t, n) {
		e.push(Ao, t, n);
	},
	lineTo(e, t, n) {
		e.push(jo, t, n);
	},
	bezierCurveTo(e, t, n, r, i, a, o) {
		e.push(Mo, t, n, r, i, a, o);
	},
	quadraticCurveTo(e, t, n, r, i) {
		e.push(No, t, n, r, i);
	},
	closePath(e) {
		e.push(Po);
	},
	rect(e, t, n, r, i) {
		e.push(Fo, t, n, r, i);
	},
	roundRect(e, t, n, r, i, a) {
		if (Un(a)) e.push(Lo, t, n, r, i, a);
		else {
			let o = mr.fourNumber(a);
			o ? e.push(Io, t, n, r, i, ...o) : e.push(Fo, t, n, r, i);
		}
	},
	ellipse(e, t, n, r, i, a, o, s, c) {
		if (r === i) return Zo(e, t, n, r, o, s, c);
		Bn(a) ? e.push(zo, t, n, r, i) : (Bn(o) && (o = 0), Bn(s) && (s = 360), e.push(Ro, t, n, r, i, a, o, s, +!!c));
	},
	arc(e, t, n, r, i, a, o) {
		Bn(i) ? e.push(Vo, t, n, r) : (Bn(i) && (i = 0), Bn(a) && (a = 360), e.push(Bo, t, n, r, i, a, +!!o));
	},
	arcTo(e, t, n, r, i, a, o, s, c) {
		if (!P(o)) {
			let e = Uo(o, s, t, n, r, i) / (c ? 1 : 2);
			a = Ko(a, Ko(e, e * qo(Go(Wo(o, s, t, n, r, i) / 2))));
		}
		e.push(Ho, t, n, r, i, a);
	},
	drawEllipse(e, t, n, r, i, a, o, s, c) {
		ja.ellipse(null, t, n, r, i, Bn(a) ? 0 : a, Bn(o) ? 0 : o, Bn(s) ? 360 : s, c, null, null, Jo), e.push(Ao, Jo.x, Jo.y), Xo(e, t, n, r, i, a, o, s, c);
	},
	drawArc(e, t, n, r, i, a, o) {
		ja.arc(null, t, n, r, Bn(i) ? 0 : i, Bn(a) ? 360 : a, o, null, null, Jo), e.push(Ao, Jo.x, Jo.y), Zo(e, t, n, r, i, a, o);
	},
	drawPoints(e, t, n, r) {
		ja.points(e, t, n, r);
	}
}, { ellipse: Xo, arc: Zo } = Yo, { moveTo: Qo, lineTo: $o, quadraticCurveTo: es, bezierCurveTo: ts, closePath: ns, beginPath: rs, rect: is, roundRect: as, ellipse: os, arc: ss, arcTo: cs, drawEllipse: ls, drawArc: us, drawPoints: ds } = Yo, fs = class {
	set path(e) {
		this.__path = e;
	}
	get path() {
		return this.__path;
	}
	constructor(e) {
		this.set(e);
	}
	set(e) {
		return this.__path = e ? Vn(e) ? na.parse(e) : e : [], this;
	}
	beginPath() {
		return rs(this.__path), this.paint(), this;
	}
	moveTo(e, t) {
		return Qo(this.__path, e, t), this.paint(), this;
	}
	lineTo(e, t) {
		return $o(this.__path, e, t), this.paint(), this;
	}
	bezierCurveTo(e, t, n, r, i, a) {
		return ts(this.__path, e, t, n, r, i, a), this.paint(), this;
	}
	quadraticCurveTo(e, t, n, r) {
		return es(this.__path, e, t, n, r), this.paint(), this;
	}
	closePath() {
		return ns(this.__path), this.paint(), this;
	}
	rect(e, t, n, r) {
		return is(this.__path, e, t, n, r), this.paint(), this;
	}
	roundRect(e, t, n, r, i) {
		return as(this.__path, e, t, n, r, i), this.paint(), this;
	}
	ellipse(e, t, n, r, i, a, o, s) {
		return os(this.__path, e, t, n, r, i, a, o, s), this.paint(), this;
	}
	arc(e, t, n, r, i, a) {
		return ss(this.__path, e, t, n, r, i, a), this.paint(), this;
	}
	arcTo(e, t, n, r, i) {
		return cs(this.__path, e, t, n, r, i), this.paint(), this;
	}
	drawEllipse(e, t, n, r, i, a, o, s) {
		return ls(this.__path, e, t, n, r, i, a, o, s), this.paint(), this;
	}
	drawArc(e, t, n, r, i, a) {
		return us(this.__path, e, t, n, r, i, a), this.paint(), this;
	}
	drawPoints(e, t, n) {
		return ds(this.__path, e, t, n), this.paint(), this;
	}
	clearPath() {
		return this.beginPath();
	}
	paint() {}
}, { M: ps, L: ms, C: hs, Q: gs, Z: _s, N: vs, D: ys, X: bs, G: xs, F: Ss, O: Cs, P: ws, U: Ts } = ia, Es = Oi.get("PathDrawer"), Ds = {
	drawPathByData(e, t) {
		if (!t) return;
		let n, r = 0, i = t.length;
		for (; r < i;) switch (n = t[r], n) {
			case ps:
				e.moveTo(t[r + 1], t[r + 2]), r += 3;
				break;
			case ms:
				e.lineTo(t[r + 1], t[r + 2]), r += 3;
				break;
			case hs:
				e.bezierCurveTo(t[r + 1], t[r + 2], t[r + 3], t[r + 4], t[r + 5], t[r + 6]), r += 7;
				break;
			case gs:
				e.quadraticCurveTo(t[r + 1], t[r + 2], t[r + 3], t[r + 4]), r += 5;
				break;
			case _s:
				e.closePath(), r += 1;
				break;
			case vs:
				e.rect(t[r + 1], t[r + 2], t[r + 3], t[r + 4]), r += 5;
				break;
			case ys:
				e.roundRect(t[r + 1], t[r + 2], t[r + 3], t[r + 4], [
					t[r + 5],
					t[r + 6],
					t[r + 7],
					t[r + 8]
				]), r += 9;
				break;
			case bs:
				e.roundRect(t[r + 1], t[r + 2], t[r + 3], t[r + 4], t[r + 5]), r += 6;
				break;
			case xs:
				e.ellipse(t[r + 1], t[r + 2], t[r + 3], t[r + 4], t[r + 5] * I, t[r + 6] * I, t[r + 7] * I, t[r + 8]), r += 9;
				break;
			case Ss:
				e.ellipse(t[r + 1], t[r + 2], t[r + 3], t[r + 4], 0, 0, gr, !1), r += 5;
				break;
			case Cs:
				e.arc(t[r + 1], t[r + 2], t[r + 3], t[r + 4] * I, t[r + 5] * I, t[r + 6]), r += 7;
				break;
			case ws:
				e.arc(t[r + 1], t[r + 2], t[r + 3], 0, gr, !1), r += 4;
				break;
			case Ts:
				e.arcTo(t[r + 1], t[r + 2], t[r + 3], t[r + 4], t[r + 5]), r += 6;
				break;
			default:
				Es.error(`command: ${n} [index:${r}]`, t);
				return;
		}
	},
	drawPathByPoints(e, t, n) {}
}, { M: Os, L: ks, C: As, Q: js, Z: Ms, N: Ns, D: Ps, X: Fs, G: Is, F: Ls, O: Rs, P: zs, U: Bs } = ia, { toTwoPointBounds: Vs, toTwoPointBoundsByQuadraticCurve: Hs, arcTo: Us, arc: Ws, ellipse: Gs } = ja, { addPointBounds: Ks, copy: qs, addPoint: Js, setPoint: Ys, addBounds: Xs, toBounds: Zs } = Kr, Qs = Oi.get("PathBounds"), $s, ec, tc, nc = {}, rc = {}, ic = {}, ac = {
	toBounds(e, t) {
		ac.toTwoPointBounds(e, rc), Zs(rc, t);
	},
	toTwoPointBounds(e, t) {
		if (!e || !e.length) return Ys(t, 0, 0);
		let n, r, i, a, o, s = 0, c = 0, l = 0, u = e.length;
		for (; s < u;) switch (o = e[s], s === 0 && (o === Ms || o === As || o === js ? Ys(t, c, l) : Ys(t, e[s + 1], e[s + 2])), o) {
			case Os:
			case ks:
				c = e[s + 1], l = e[s + 2], Js(t, c, l), s += 3;
				break;
			case As:
				i = e[s + 5], a = e[s + 6], Vs(c, l, e[s + 1], e[s + 2], e[s + 3], e[s + 4], i, a, nc), Ks(t, nc), c = i, l = a, s += 7;
				break;
			case js:
				n = e[s + 1], r = e[s + 2], i = e[s + 3], a = e[s + 4], Hs(c, l, n, r, i, a, nc), Ks(t, nc), c = i, l = a, s += 5;
				break;
			case Ms:
				s += 1;
				break;
			case Ns:
				c = e[s + 1], l = e[s + 2], Xs(t, c, l, e[s + 3], e[s + 4]), s += 5;
				break;
			case Ps:
			case Fs:
				c = e[s + 1], l = e[s + 2], Xs(t, c, l, e[s + 3], e[s + 4]), s += o === Ps ? 9 : 6;
				break;
			case Is:
				Gs(null, e[s + 1], e[s + 2], e[s + 3], e[s + 4], e[s + 5], e[s + 6], e[s + 7], e[s + 8], nc, ic), s === 0 ? qs(t, nc) : Ks(t, nc), c = ic.x, l = ic.y, s += 9;
				break;
			case Ls:
				c = e[s + 1], l = e[s + 2], ec = e[s + 3], tc = e[s + 4], Xs(t, c - ec, l - tc, 2 * ec, 2 * tc), c += ec, s += 5;
				break;
			case Rs:
				Ws(null, e[s + 1], e[s + 2], e[s + 3], e[s + 4], e[s + 5], e[s + 6], nc, ic), s === 0 ? qs(t, nc) : Ks(t, nc), c = ic.x, l = ic.y, s += 7;
				break;
			case zs:
				c = e[s + 1], l = e[s + 2], $s = e[s + 3], Xs(t, c - $s, l - $s, 2 * $s, 2 * $s), c += $s, s += 4;
				break;
			case Bs:
				Us(null, c, l, e[s + 1], e[s + 2], e[s + 3], e[s + 4], e[s + 5], nc, ic), s === 0 ? qs(t, nc) : Ks(t, nc), c = ic.x, l = ic.y, s += 6;
				break;
			default:
				Qs.error(`command: ${o} [index:${s}]`, e);
				return;
		}
	}
}, { M: oc, L: sc, Z: cc } = ia, { getCenterX: lc, getCenterY: uc } = R, { arcTo: dc } = Yo, fc = { smooth(e, t, n) {
	let r, i, a, o, s, c, l = 0, u = 0, d = 0, f = 0, p = 0, m = 0, h = 0, g = 0, _ = 0;
	Wn(t) && (t = t[0] || 0);
	let v = e.length, y = v === 9, b = [];
	for (; l < v;) {
		switch (r = e[l], r) {
			case oc:
				c = b.length, c && i !== cc && (b[o] = f, b[s] = p), f = g = e[l + 1], p = _ = e[l + 2], l += 3, e[l] === sc ? (m = e[l + 1], h = e[l + 2], y ? b.push(oc, f, p) : b.push(oc, lc(f, m), uc(p, h))) : b.push(oc, f, p), o = c + 1, s = c + 2;
				break;
			case sc:
				switch (u = e[l + 1], d = e[l + 2], l += 3, e[l]) {
					case sc:
						dc(b, u, d, e[l + 1], e[l + 2], t, g, _, y);
						break;
					case cc:
						dc(b, u, d, f, p, t, g, _, y);
						break;
					default: b.push(sc, u, d);
				}
				g = u, _ = d;
				break;
			case cc:
				i !== cc && (dc(b, f, p, m, h, t, g, _, y), b.push(cc)), l += 1;
				break;
			default:
				a = ua[r];
				for (let t = 0; t < a; t++) b.push(e[l + t]);
				l += a;
		}
		i = r;
	}
	return r !== cc && (b[o] = f, b[s] = p), b;
} };
function pc(e) {
	return new fs(e);
}
var mc = pc();
na.creator = pc(), na.parse = Eo.parse, na.convertToCanvasData = Eo.toCanvasData;
var { drawRoundRect: hc } = da;
function gc(e) {
	(function(e) {
		e && !e.roundRect && (e.roundRect = function(e, t, n, r, i) {
			hc(this, e, t, n, r, i);
		});
	})(e);
}
var _c = {
	alphaPixelTypes: [
		"png",
		"webp",
		"svg"
	],
	upperCaseTypeMap: {},
	mimeType: (e, t = "image") => !e || e.startsWith(t) ? e : (e === "jpg" && (e = "jpeg"), t + "/" + e),
	fileType(e) {
		let t = e.split(".");
		return t[t.length - 1];
	},
	isOpaqueImage(e) {
		let t = vc.fileType(e);
		return ["jpg", "jpeg"].some((e) => e === t);
	},
	getExportOptions(e) {
		switch (typeof e) {
			case "object": return e;
			case "number": return { quality: e };
			case "boolean": return { blob: e };
			default: return {};
		}
	}
}, vc = _c;
vc.mineType = vc.mimeType, vc.alphaPixelTypes.forEach((e) => vc.upperCaseTypeMap[e] = e.toUpperCase());
var yc = Oi.get("TaskProcessor"), bc = class {
	constructor(e) {
		this.parallel = !0, this.time = 1, this.id = Xn.create(Xn.TASK), this.task = e;
	}
	run() {
		return Wi(this, void 0, void 0, function* () {
			try {
				if (this.isComplete || this.runing) return;
				if (this.runing = !0, this.canUse && !this.canUse()) return this.cancel();
				this.task && (yield this.task());
			} catch (e) {
				yc.error(e);
			}
		});
	}
	complete() {
		this.isComplete = !0, this.parent = this.task = this.canUse = null;
	}
	cancel() {
		this.isCancel = !0, this.complete();
	}
}, xc = class {
	get total() {
		return this.list.length + this.delayNumber;
	}
	get finishedIndex() {
		return this.isComplete ? 0 : this.index + this.parallelSuccessNumber;
	}
	get remain() {
		return this.isComplete ? this.total : this.total - this.finishedIndex;
	}
	get percent() {
		let { total: e } = this, t = 0, n = 0;
		for (let r = 0; r < e; r++) r <= this.finishedIndex ? (n += this.list[r].time, r === this.finishedIndex && (t = n)) : t += this.list[r].time;
		return this.isComplete ? 1 : n / t;
	}
	constructor(e) {
		this.config = { parallel: 6 }, this.list = [], this.running = !1, this.isComplete = !0, this.index = 0, this.delayNumber = 0, e && F.assign(this.config, e), this.empty();
	}
	add(e, t, n) {
		let r, i, a, o, s = new bc(e);
		return s.parent = this, Un(t) ? o = t : t && (i = t.parallel, r = t.start, a = t.time, o = t.delay, n ||= t.canUse), a && (s.time = a), !1 === i && (s.parallel = !1), n && (s.canUse = n), P(o) ? this.push(s, r) : (this.delayNumber++, setTimeout(() => {
			this.delayNumber && (this.delayNumber--, this.push(s, r));
		}, o)), this.isComplete = !1, s;
	}
	push(e, t) {
		this.list.push(e), !1 === t || this.timer || (this.timer = setTimeout(() => this.start()));
	}
	empty() {
		this.index = 0, this.parallelSuccessNumber = 0, this.list = [], this.parallelList = [], this.delayNumber = 0;
	}
	start() {
		this.running || (this.running = !0, this.isComplete = !1, this.run());
	}
	pause() {
		clearTimeout(this.timer), this.timer = null, this.running = !1;
	}
	resume() {
		this.start();
	}
	skip() {
		this.index++, this.resume();
	}
	stop() {
		this.isComplete = !0, this.list.forEach((e) => {
			e.isComplete || e.run();
		}), this.pause(), this.empty();
	}
	run() {
		this.running && (this.setParallelList(), this.parallelList.length > 1 ? this.runParallelTasks() : this.remain ? this.runTask() : this.onComplete());
	}
	runTask() {
		let e = this.list[this.index];
		e ? e.run().then(() => {
			this.onTask(e), this.index++, e.isCancel ? this.runTask() : this.nextTask();
		}).catch((e) => {
			this.onError(e);
		}) : this.timer = setTimeout(() => this.nextTask());
	}
	runParallelTasks() {
		this.parallelList.forEach((e) => this.runParallelTask(e));
	}
	runParallelTask(e) {
		e.run().then(() => {
			this.onTask(e), this.fillParallelTask();
		}).catch((e) => {
			this.onParallelError(e);
		});
	}
	nextTask() {
		this.total === this.finishedIndex ? this.onComplete() : this.timer = setTimeout(() => this.run());
	}
	setParallelList() {
		let e, { config: t, list: n, index: r } = this;
		this.parallelList = [], this.parallelSuccessNumber = 0;
		let i = r + t.parallel;
		if (i > n.length && (i = n.length), t.parallel > 1) for (let t = r; t < i && (e = n[t], e.parallel); t++) this.parallelList.push(e);
	}
	fillParallelTask() {
		let e, t = this.parallelList;
		this.parallelSuccessNumber++, t.pop();
		let n = t.length, r = this.finishedIndex + n;
		if (t.length) {
			if (!this.running) return;
			r < this.total && (e = this.list[r], e && e.parallel && (t.push(e), this.runParallelTask(e)));
		} else this.index += this.parallelSuccessNumber, this.parallelSuccessNumber = 0, this.nextTask();
	}
	onComplete() {
		this.stop(), this.config.onComplete && this.config.onComplete();
	}
	onTask(e) {
		e.complete(), this.config.onTask && this.config.onTask();
	}
	onParallelError(e) {
		this.parallelList.forEach((e) => {
			e.parallel = !1;
		}), this.parallelList.length = 0, this.parallelSuccessNumber = 0, this.onError(e);
	}
	onError(e) {
		this.pause(), this.config.onError && this.config.onError(e);
	}
	destroy() {
		this.stop();
	}
}, Sc = Oi.get("Resource"), Cc = {
	tasker: new xc(),
	queue: new xc({ parallel: 1 }),
	map: {},
	get isComplete() {
		return wc.tasker.isComplete;
	},
	set(e, t) {
		wc.map[e] && Sc.repeat(e), wc.map[e] = t;
	},
	get: (e) => wc.map[e],
	remove(e) {
		let t = wc.map[e];
		t && (t.destroy && t.destroy(), delete wc.map[e]);
	},
	loadImage(e, t) {
		return new Promise((n, r) => {
			let i = this.setImage(e, e, t);
			i.load(() => n(i), (e) => r(e));
		});
	},
	setImage(e, t, n) {
		let r;
		return Vn(t) ? r = { url: t } : t.url || (r = {
			url: e,
			view: t
		}), r && (n && (r.format = n), t = Ii.image(r)), wc.set(e, t), t;
	},
	loadFilm(e, t) {},
	loadVideo(e, t) {},
	destroy() {
		wc.map = {};
	}
}, wc = Cc, Tc = {
	maxRecycled: 10,
	recycledList: [],
	patternTasker: Cc.queue,
	get(e, t) {
		let n = Cc.get(e.url);
		return n || Cc.set(e.url, n = Ii[t || "image"](e)), n.use++, n;
	},
	recycle(e) {
		e.parent && (e = e.parent), e.use--, setTimeout(() => {
			e.use || (V.image.isLarge(e) ? e.url && Cc.remove(e.url) : (e.clearLevels(), Ec.recycledList.push(e)));
		});
	},
	recyclePaint(e) {
		Ec.recycle(e.image);
	},
	clearRecycled(e) {
		let t = Ec.recycledList;
		(t.length > Ec.maxRecycled || e) && (t.forEach((t) => (!t.use || e) && t.url && Cc.remove(t.url)), t.length = 0);
	},
	clearLevels() {},
	hasAlphaPixel: (e) => _c.alphaPixelTypes.some((t) => Ec.isFormat(t, e)),
	isFormat(e, t) {
		if (t.format) return t.format === e;
		let { url: n } = t;
		if (n.startsWith("data:")) {
			if (n.startsWith("data:" + _c.mimeType(e))) return !0;
		} else if (n.includes("." + e) || n.includes("." + _c.upperCaseTypeMap[e]) || e === "png" && !n.includes(".")) return !0;
		return !1;
	},
	destroy() {
		this.clearRecycled(!0);
	}
}, Ec = Tc, { IMAGE: Dc, create: Oc } = Xn, kc = class {
	get tag() {
		return "Image";
	}
	get url() {
		return this.config.url;
	}
	get crossOrigin() {
		let { crossOrigin: e } = this.config;
		return P(e) ? V.image.crossOrigin : e;
	}
	get completed() {
		return this.ready || !!this.error;
	}
	constructor(e) {
		if (this.use = 0, this.waitComplete = [], this.innerId = Oc(Dc), this.config = e ||= { url: "" }, e.view) {
			let { view: t } = e;
			this.setView(t.config ? t.view : t);
		}
		Tc.isFormat("svg", e) && (this.isSVG = !0), Tc.hasAlphaPixel(e) && (this.hasAlphaPixel = !0);
	}
	load(e, t, n) {
		return this.loading || (this.loading = !0, Cc.tasker.add(() => Wi(this, void 0, void 0, function* () {
			return yield V.origin["load" + this.tag](this.getLoadUrl(n), this.crossOrigin, this).then((e) => {
				n && this.setThumbView(e), this.setView(e);
			}).catch((e) => {
				this.error = e, this.onComplete(!1);
			});
		}))), this.waitComplete.push(e, t), this.waitComplete.length - 2;
	}
	unload(e, t) {
		let n = this.waitComplete;
		if (t) {
			let t = n[e + 1];
			t && t({ type: "stop" });
		}
		n[e] = n[e + 1] = void 0;
	}
	setView(e) {
		this.ready = !0, this.width || (this.width = e.width, this.height = e.height, this.view = e), this.onComplete(!0);
	}
	onComplete(e) {
		let t;
		this.waitComplete.forEach((n, r) => {
			t = r % 2, n && (e ? t || n(this) : t && n(this.error));
		}), this.waitComplete.length = 0, this.loading = !1;
	}
	getFull(e) {
		return this.view;
	}
	getCanvas(e, t, n, r, i, a, o, s) {
		if (e ||= this.width, t ||= this.height, this.cache) {
			let { params: e, data: t } = this.cache;
			for (let n in e) if (e[n] !== arguments[n]) {
				t = null;
				break;
			}
			if (t) return t;
		}
		let c = V.image.resize(this.view, e, t, i, a, void 0, o, n, r, s);
		return this.cache = this.use > 1 ? {
			data: c,
			params: arguments
		} : null, c;
	}
	getPattern(e, t, n, r) {
		let i = V.canvas.createPattern(e, t);
		return V.image.setPatternTransform(i, n, r), i;
	}
	render(e, t, n, r, i, a, o, s, c) {
		e.drawImage(this.view, t, n, r, i);
	}
	getLoadUrl(e) {
		return this.url;
	}
	setThumbView(e) {}
	getThumbSize(e) {}
	getMinLevel() {}
	getLevelData(e, t, n) {}
	clearLevels(e) {}
	destroyFilter() {}
	destroy() {
		this.clearLevels(), this.destroyFilter();
		let { view: e } = this;
		e && e.close && e.close(), this.config = { url: "" }, this.cache = this.view = null, this.waitComplete.length = 0;
	}
};
function Ac(e, t, n, r) {
	r || (n.configurable = n.enumerable = !0), Object.defineProperty(e, t, n);
}
function jc(e, t) {
	return Object.getOwnPropertyDescriptor(e, t);
}
function Mc(e, t) {
	let n = "_" + e;
	return {
		get() {
			return this[n] ?? t;
		},
		set(e) {
			this[n] = e;
		}
	};
}
function Nc(e, t) {
	return (n, r) => Fc(n, r, e, t && t(r));
}
function Pc(e) {
	return e;
}
function Fc(e, t, n, r) {
	Ac(e, t, Object.assign({
		get() {
			return this.__getAttr(t);
		},
		set(e) {
			this.__setAttr(t, e);
		}
	}, r || {})), ll(e, t, n);
}
function Ic(e) {
	return Nc(e);
}
function Lc(e, t) {
	return Nc(e, (e) => ({ set(n) {
		this.__setAttr(e, n, t) && (this.__layout.matrixChanged || this.__layout.matrixChange());
	} }));
}
function Rc(e, t) {
	return Nc(e, (e) => ({ set(n) {
		this.__setAttr(e, n, t) && (this.__layout.matrixChanged || this.__layout.matrixChange(), this.__scrollWorld ||= {});
	} }));
}
function zc(e) {
	return Nc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && (this.__hasAutoLayout = !!(this.origin || this.around || this.flow), this.__local || this.__layout.createLocal(), Uc(this));
	} }));
}
function Bc(e, t) {
	return Nc(e, (e) => ({ set(n) {
		this.__setAttr(e, n, t) && (this.__layout.scaleChanged || this.__layout.scaleChange());
	} }));
}
function Vc(e, t) {
	return Nc(e, (e) => ({ set(n) {
		this.__setAttr(e, n, t) && (this.__layout.rotationChanged || this.__layout.rotationChange());
	} }));
}
function K(e, t) {
	return Nc(e, (e) => ({ set(n) {
		this.__setAttr(e, n, t) && Uc(this);
	} }));
}
function Hc(e) {
	return Nc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && (Uc(this), this.__.__removeNaturalSize());
	} }));
}
function Uc(e) {
	e.__layout.boxChanged || e.__layout.boxChange(), e.__hasAutoLayout && (e.__layout.matrixChanged || e.__layout.matrixChange());
}
function Wc(e) {
	return Nc(e, (e) => ({ set(t) {
		let n = this.__;
		n.__pathInputed !== 2 && (n.__pathInputed = +!!t), t || (n.__pathForRender = void 0), this.__setAttr(e, t), Uc(this);
	} }));
}
var Gc = K;
function Kc(e, t) {
	return Nc(e, (e) => ({ set(n) {
		this.__setAttr(e, n) && (qc(this), t && (this.__.__useStroke = !0));
	} }));
}
function qc(e) {
	e.__layout.strokeChanged || e.__layout.strokeChange(), e.__.__useArrow && Uc(e);
}
var Jc = Kc;
function Yc(e) {
	return Nc(e, (e) => ({ set(t) {
		this.__setAttr(e, t), this.__layout.renderChanged || this.__layout.renderChange();
	} }));
}
function Xc(e) {
	return Nc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && Zc(this);
	} }));
}
function Zc(e) {
	e.__layout.surfaceChanged || e.__layout.surfaceChange();
}
function Qc(e) {
	return Nc(e, (e) => ({ set(t) {
		if (this.__setAttr(e, t)) {
			let e = this.__;
			F.stintSet(e, "__useDim", e.dim || e.bright || e.dimskip);
		}
	} }));
}
function $c(e) {
	return Nc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && (this.__layout.opacityChanged || this.__layout.opacityChange()), this.mask && tl(this);
	} }));
}
function el(e) {
	return Nc(e, (e) => ({ set(t) {
		let n = this.visible;
		if (!0 === n && t === 0) {
			if (this.animationOut) return this.__runAnimation("out", () => nl(this, e, t, n));
		} else n === 0 && !0 === t && this.animation && this.__runAnimation("in");
		nl(this, e, t, n), this.mask && tl(this);
	} }));
}
function tl(e) {
	let { parent: t } = e;
	if (t) {
		let { __hasMask: e } = t;
		t.__updateMask(), e !== t.__hasMask && t.forceUpdate();
	}
}
function nl(e, t, n, r) {
	e.__setAttr(t, n) && (e.__layout.opacityChanged || e.__layout.opacityChange(), r !== 0 && n !== 0 || Uc(e));
}
function rl(e) {
	return Nc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && this.waitParent(() => {
			let { parent: e } = this;
			e.__layout.childrenSortChange(), e.__.flow && e.__layout.boxChange();
		});
	} }));
}
function il(e, t) {
	return Nc(e, (e) => ({ set(n) {
		this.__setAttr(e, n) && (this.__layout.boxChanged || this.__layout.boxChange(), t ? this.__updateMask() : this.waitParent(() => {
			this.parent.__updateMask(n);
		}));
	} }));
}
function al(e) {
	return Nc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && this.waitParent(() => {
			this.parent.__updateEraser(t);
		});
	} }));
}
function ol(e) {
	return Nc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && (this.__layout.hitCanvasChanged = !0, this.leafer && this.leafer.updateCursor());
	} }));
}
function sl(e) {
	return Nc(e, (e) => ({ set(t) {
		this.__setAttr(e, t), this.leafer && this.leafer.updateCursor();
	} }));
}
function cl(e) {
	return (t, n) => {
		Ac(t, "__DataProcessor", { get: () => e });
	};
}
function ll(e, t, n) {
	let r = e.__DataProcessor.prototype, i = "_" + t, a = function(e) {
		return "set" + e.charAt(0).toUpperCase() + e.slice(1);
	}(t), o = Mc(t, n);
	if (P(n)) o.get = function() {
		return this[i];
	};
	else if (typeof n == "function") o.get = function() {
		return this[i] ?? n(this.__leaf);
	};
	else if (Gn(n)) {
		let e = qn(n);
		o.get = function() {
			return this[i] ?? (this[i] = e ? {} : F.clone(n));
		};
	}
	let s = e.isBranchLeaf;
	t === "width" ? o.get = function() {
		let e = this[i];
		if (e == null) {
			let e = this, t = e.__naturalWidth, r = e.__leaf;
			return !n || r.pathInputed ? r.boxBounds.width : t ? e._height && e.__useNaturalRatio ? e._height * t / e.__naturalHeight : t : s && r.children.length ? r.boxBounds.width : n;
		}
		return e;
	} : t === "height" && (o.get = function() {
		let e = this[i];
		if (e == null) {
			let e = this, t = e.__naturalHeight, r = e.__leaf;
			return !n || r.pathInputed ? r.boxBounds.height : t ? e._width && e.__useNaturalRatio ? e._width * t / e.__naturalWidth : t : s && r.children.length ? r.boxBounds.height : n;
		}
		return e;
	});
	let c, l = r;
	for (; !c && l;) c = jc(l, t), l = l.__proto__;
	c && c.set && (o.set = c.set), r[a] && (o.set = r[a], delete r[a]), Ac(r, t, o);
}
var ul = new Oi("rewrite"), dl = [], fl = ["destroy", "constructor"];
function pl(e) {
	return (t, n) => {
		dl.push({
			name: t.constructor.name + "." + n,
			run: () => {
				t[n] = e;
			}
		});
	};
}
function ml() {
	return (e) => {
		hl();
	};
}
function hl(e) {
	dl.length &&= (dl.forEach((t) => {
		e && ul.error(t.name, "需在Class上装饰@rewriteAble()"), t.run();
	}), 0);
}
function gl(e, t) {
	return (n) => {
		var r;
		(e.prototype ? (r = e.prototype, Object.getOwnPropertyNames(r)) : Object.keys(e)).forEach((r) => {
			fl.includes(r) || t && t.includes(r) || (e.prototype ? jc(e.prototype, r).writable && (n.prototype[r] = e.prototype[r]) : n.prototype[r] = e[r]);
		});
	};
}
function _l() {
	return (e) => {
		Ri.register(e);
	};
}
function vl() {
	return (e) => {
		Vi.register(e);
	};
}
setTimeout(() => hl(!0));
var { copy: yl, toInnerPoint: bl, toOuterPoint: xl, scaleOfOuter: Sl, rotateOfOuter: Cl, skewOfOuter: wl, multiplyParent: Tl, divideParent: El, getLayout: Dl } = L, Ol = {}, { round: kl } = Math, Al = {
	updateAllMatrix(e, t, n) {
		if (t && e.__hasAutoLayout && e.__layout.matrixChanged && (n = !0), Nl(e, t, n), e.isBranch) {
			let { children: r } = e;
			for (let e = 0, i = r.length; e < i; e++) Ml(r[e], t, n);
		}
	},
	updateMatrix(e, t, n) {
		let r = e.__layout;
		t ? n && (r.waitAutoLayout = !0, e.__hasAutoLayout && (r.matrixChanged = !1)) : r.waitAutoLayout &&= !1, r.matrixChanged && e.__updateLocalMatrix(), r.waitAutoLayout || e.__updateWorldMatrix();
	},
	updateBounds(e) {
		let t = e.__layout;
		t.boundsChanged && e.__updateLocalBounds(), t.waitAutoLayout || e.__updateWorldBounds();
	},
	updateAllWorldOpacity(e) {
		if (e.__updateWorldOpacity(), e.isBranch) {
			let { children: t } = e;
			for (let e = 0, n = t.length; e < n; e++) Pl(t[e]);
		}
	},
	updateChange(e) {
		let t = e.__layout;
		t.stateStyleChanged && e.updateState(), t.opacityChanged && Pl(e), e.__updateChange(), t.surfaceChanged &&= (e.__hasComplex && jl.updateComplex(e), !1);
	},
	updateAllChange(e) {
		if (Il(e), e.isBranch) {
			let { children: t } = e;
			for (let e = 0, n = t.length; e < n; e++) Fl(t[e]);
		}
	},
	worldHittable(e) {
		for (; e;) {
			if (!e.__.hittable) return !1;
			e = e.parent;
		}
		return !0;
	},
	draggable: (e) => (e.draggable || e.editable) && e.hitSelf && !e.locked,
	copyCanvasByWorld(e, t, n, r, i, a) {
		r ||= e.__nowWorld, e.__worldFlipped || V.fullImageShadow ? t.copyWorldByReset(n, r, e.__nowWorld, i, a) : t.copyWorldToInner(n, r, e.__layout.renderBounds, i);
	},
	renderComplex(e, t, n) {},
	updateComplex(e) {},
	checkComplex(e) {},
	moveWorld(e, t, n = 0, r, i) {
		let a = Gn(t) ? Object.assign({}, t) : {
			x: t,
			y: n
		};
		r ? xl(e.localTransform, a, a, !0) : e.parent && bl(e.parent.scrollWorldTransform, a, a, !0), jl.moveLocal(e, a.x, a.y, i);
	},
	moveLocal(e, t, n = 0, r) {
		Gn(t) && (n = t.y, t = t.x), t += e.x, n += e.y, e.leafer && e.leafer.config.pointSnap && (t = kl(t), n = kl(n)), r ? e.animate({
			x: t,
			y: n
		}, r) : (e.x = t, e.y = n);
	},
	zoomOfWorld(e, t, n, r, i, a, o) {
		jl.zoomOfLocal(e, Ll(e, t), n, r, i, a, o);
	},
	zoomOfLocal(e, t, n, r = n, i, a, o) {
		let s = e.__localMatrix;
		if (Un(r) || (r && (a = r), r = n), yl(Ol, s), Sl(Ol, t, n, r), jl.hasHighPosition(e)) jl.setTransform(e, Ol, i, a, o);
		else {
			let t = e.x + Ol.e - s.e, c = e.y + Ol.f - s.f;
			a && !i ? e.animate({
				x: t,
				y: c,
				scaleX: e.scaleX * n,
				scaleY: e.scaleY * r
			}, a) : (e.x = t, e.y = c, e.scaleResize(n, r, !0 !== i, o));
		}
	},
	rotateOfWorld(e, t, n, r) {
		jl.rotateOfLocal(e, Ll(e, t), n, r);
	},
	rotateOfLocal(e, t, n, r) {
		let i = e.__localMatrix;
		yl(Ol, i), Cl(Ol, t, n), jl.hasHighPosition(e) ? jl.setTransform(e, Ol, !1, r) : e.set({
			x: e.x + Ol.e - i.e,
			y: e.y + Ol.f - i.f,
			rotation: mr.formatRotation(e.rotation + n)
		}, r);
	},
	skewOfWorld(e, t, n, r, i, a) {
		jl.skewOfLocal(e, Ll(e, t), n, r, i, a);
	},
	skewOfLocal(e, t, n, r = 0, i, a) {
		yl(Ol, e.__localMatrix), wl(Ol, t, n, r), jl.setTransform(e, Ol, i, a);
	},
	transformWorld(e, t, n, r, i) {
		yl(Ol, e.worldTransform), Tl(Ol, t), e.parent && El(Ol, e.parent.scrollWorldTransform), jl.setTransform(e, Ol, n, r, i);
	},
	transform(e, t, n, r, i) {
		yl(Ol, e.localTransform), Tl(Ol, t), jl.setTransform(e, Ol, n, r, i);
	},
	setTransform(e, t, n, r, i) {
		let a = e.__, o = a.origin && jl.getInnerOrigin(e, a.origin), s = Dl(t, o, a.around && jl.getInnerOrigin(e, a.around));
		if (jl.hasOffset(e) && (s.x -= a.offsetX, s.y -= a.offsetY), n) {
			let t = s.scaleX / e.scaleX, n = s.scaleY / e.scaleY;
			if (delete s.scaleX, delete s.scaleY, o) {
				z.scale(e.boxBounds, Math.abs(t), Math.abs(n));
				let r = jl.getInnerOrigin(e, a.origin);
				R.move(s, o.x - r.x, o.y - r.y);
			}
			e.set(s), e.scaleResize(t, n, !1, i);
		} else e.set(s, r);
	},
	getFlipTransform(e, t) {
		let n = {
			a: 1,
			b: 0,
			c: 0,
			d: 1,
			e: 0,
			f: 0
		}, r = t === "x" ? 1 : -1;
		return Sl(n, jl.getLocalOrigin(e, "center"), -1 * r, 1 * r), n;
	},
	getLocalOrigin: (e, t) => R.tempToOuterOf(jl.getInnerOrigin(e, t), e.localTransform),
	getInnerOrigin(e, t) {
		let n = {};
		return Zr.toPoint(t, e.boxBounds, n), n;
	},
	getRelativeWorld: (e, t, n) => (yl(Ol, e.worldTransform), El(Ol, t.scrollWorldTransform), n ? Ol : Object.assign({}, Ol)),
	updateScaleFixedWorld(e) {},
	updateOuterBounds(e) {},
	cacheId(e) {},
	drop(e, t, n, r) {
		e.setTransform(jl.getRelativeWorld(e, t, !0), r), t.add(e, n);
	},
	hasHighPosition: (e) => e.origin || e.around || jl.hasOffset(e),
	hasOffset: (e) => e.offsetX || e.offsetY,
	hasParent(e, t) {
		if (!t) return !1;
		for (; e;) {
			if (t === e) return !0;
			e = e.parent;
		}
	},
	animateMove(e, t, n = .3, r) {
		if (t.x || t.y) {
			if (Math.abs(t.x) < 1 && Math.abs(t.y) < 1) e.move(t);
			else {
				let i = t.x * n, a = t.y * n;
				t.x -= i, t.y -= a, e.move(i, a), V.requestRender(() => jl.animateMove(e, t, n, r));
			}
			r && r();
		}
	}
}, jl = Al, { updateAllMatrix: Ml, updateMatrix: Nl, updateAllWorldOpacity: Pl, updateAllChange: Fl, updateChange: Il } = jl;
function Ll(e, t) {
	return e.updateLayout(), e.parent ? R.tempToInnerOf(t, e.parent.scrollWorldTransform) : t;
}
var Rl = {
	worldBounds: (e) => e.__world,
	localBoxBounds: (e) => e.__.eraser || e.__.visible === 0 ? null : e.__local || e.__layout,
	localStrokeBounds: (e) => e.__.eraser || e.__.visible === 0 ? null : e.__layout.localStrokeBounds,
	localRenderBounds(e) {
		let { __: t, __layout: n } = e;
		return t.eraser || t.visible === 0 ? null : n.localOuterBounds || n.localRenderBounds;
	},
	maskLocalBoxBounds: (e, t) => Bl(e, t) && e.__localBoxBounds,
	maskLocalStrokeBounds: (e, t) => Bl(e, t) && e.__layout.localStrokeBounds,
	maskLocalRenderBounds(e, t) {
		let { __layout: n } = e;
		return Bl(e, t) && (n.localOuterBounds || n.localRenderBounds);
	},
	excludeRenderBounds: (e, t) => !(!t.bounds || t.bounds.hit(e.__world, t.matrix)) || !(!t.hideBounds || !t.hideBounds.includes(e.__world, t.matrix))
}, zl;
function Bl(e, t) {
	return t || (zl = 0), e.__.mask && (zl = 1), zl < 0 ? null : (zl &&= -1, !0);
}
var { updateBounds: Vl } = Al, Hl = {
	sort: (e, t) => e.__.zIndex === t.__.zIndex ? e.__tempNumber - t.__tempNumber : e.__.zIndex - t.__.zIndex,
	pushAllChildBranch(e, t) {
		if (e.__tempNumber = 1, e.__.__childBranchNumber) {
			let { children: n } = e;
			for (let r = 0, i = n.length; r < i; r++) (e = n[r]).isBranch && (e.__tempNumber = 1, t.add(e), Ul(e, t));
		}
	},
	pushAllParent(e, t) {
		let { keys: n } = t;
		if (n) for (; e.parent && P(n[e.parent.innerId]);) t.add(e.parent), e = e.parent;
		else for (; e.parent;) t.add(e.parent), e = e.parent;
	},
	pushAllBranchStack(e, t) {
		let n = t.length, { children: r } = e;
		for (let e = 0, n = r.length; e < n; e++) r[e].isBranch && t.push(r[e]);
		for (let e = n, r = t.length; e < r; e++) Wl(t[e], t);
	},
	updateBounds(e, t) {
		let n = [e];
		Wl(e, n), Gl(n, t);
	},
	updateBoundsByBranchStack(e, t) {
		let n, r;
		for (let i = e.length - 1; i > -1; i--) {
			n = e[i], r = n.children;
			for (let e = 0, t = r.length; e < t; e++) Vl(r[e]);
			t && t === n || Vl(n);
		}
	},
	move(e, t, n) {
		let r, { children: i } = e;
		for (let a = 0, o = i.length; a < o; a++) r = (e = i[a]).__world, r.e += t, r.f += n, r.x += t, r.y += n, e.isBranch && Kl(e, t, n);
	},
	scale(e, t, n, r, i, a, o) {
		let s, { children: c } = e, l = r - 1, u = i - 1;
		for (let d = 0, f = c.length; d < f; d++) s = (e = c[d]).__world, s.a *= r, s.d *= i, (s.b || s.c) && (s.b *= r, s.c *= i), s.e === s.x && s.f === s.y ? (s.x = s.e += (s.e - a) * l + t, s.y = s.f += (s.f - o) * u + n) : (s.e += (s.e - a) * l + t, s.f += (s.f - o) * u + n, s.x += (s.x - a) * l + t, s.y += (s.y - o) * u + n), s.width *= r, s.height *= i, s.scaleX *= r, s.scaleY *= i, e.isBranch && ql(e, t, n, r, i, a, o);
	}
}, { pushAllChildBranch: Ul, pushAllBranchStack: Wl, updateBoundsByBranchStack: Gl, move: Kl, scale: ql } = Hl, Jl = { run(e) {
	if (e && e.length) {
		let t = e.length;
		for (let n = 0; n < t; n++) e[n]();
		e.length === t ? e.length = 0 : e.splice(0, t);
	}
} }, { getRelativeWorld: Yl, updateBounds: Xl } = Al, { toOuterOf: Zl, getPoints: Ql, copy: $l } = z, eu = "_localContentBounds", tu = "_worldContentBounds", nu = "_worldBoxBounds", ru = "_worldStrokeBounds", iu = class {
	get contentBounds() {
		return this._contentBounds || this.boxBounds;
	}
	set contentBounds(e) {
		this._contentBounds = e;
	}
	get strokeBounds() {
		return this._strokeBounds || this.boxBounds;
	}
	get renderBounds() {
		return this._renderBounds || this.boxBounds;
	}
	set renderBounds(e) {
		this._renderBounds = e;
	}
	get localContentBounds() {
		return Zl(this.contentBounds, this.leaf.__localMatrix, this[eu] || (this[eu] = {})), this[eu];
	}
	get localStrokeBounds() {
		return this._localStrokeBounds || this;
	}
	get localRenderBounds() {
		return this._localRenderBounds || this;
	}
	get worldContentBounds() {
		return Zl(this.contentBounds, this.leaf.__world, this[tu] || (this[tu] = {})), this[tu];
	}
	get worldBoxBounds() {
		return Zl(this.boxBounds, this.leaf.__world, this[nu] || (this[nu] = {})), this[nu];
	}
	get worldStrokeBounds() {
		return Zl(this.strokeBounds, this.leaf.__world, this[ru] || (this[ru] = {})), this[ru];
	}
	get a() {
		return 1;
	}
	get b() {
		return 0;
	}
	get c() {
		return 0;
	}
	get d() {
		return 1;
	}
	get e() {
		return this.leaf.__.x;
	}
	get f() {
		return this.leaf.__.y;
	}
	get x() {
		return this.e + this.boxBounds.x;
	}
	get y() {
		return this.f + this.boxBounds.y;
	}
	get width() {
		return this.boxBounds.width;
	}
	get height() {
		return this.boxBounds.height;
	}
	constructor(e) {
		this.leaf = e, this.leaf.__local && (this._localRenderBounds = this._localStrokeBounds = this.leaf.__local), e.__world && (this.boxBounds = {
			x: 0,
			y: 0,
			width: 0,
			height: 0
		}, this.boxChange(), this.matrixChange());
	}
	createLocal() {
		let e = this.leaf.__local = {
			a: 1,
			b: 0,
			c: 0,
			d: 1,
			e: 0,
			f: 0,
			x: 0,
			y: 0,
			width: 0,
			height: 0
		};
		this._localStrokeBounds ||= e, this._localRenderBounds ||= e;
	}
	update() {
		let { leaf: e } = this, { leafer: t } = e;
		if (e.isApp) return Xl(e);
		if (t) t.ready ? t.watcher.changed && t.layouter.layout() : t.start();
		else {
			let t = e;
			for (; t.parent && !t.parent.leafer;) t = t.parent;
			let n = t;
			if (n.__fullLayouting) return;
			n.__fullLayouting = !0, V.layout(n), delete n.__fullLayouting;
		}
	}
	getTransform(e = "world") {
		this.update();
		let { leaf: t } = this;
		switch (e) {
			case "world": return t.__world;
			case "local": return t.__localMatrix;
			case "inner": return L.defaultMatrix;
			case "page": e = t.zoomLayer;
			default: return Yl(t, e);
		}
	}
	getBounds(e, t = "world") {
		switch (this.update(), t) {
			case "world": return this.getWorldBounds(e);
			case "local": return this.getLocalBounds(e);
			case "inner": return this.getInnerBounds(e);
			case "page": t = this.leaf.zoomLayer;
			default: return new yi(this.getInnerBounds(e)).toOuterOf(this.getTransform(t));
		}
	}
	getInnerBounds(e = "box") {
		switch (e) {
			case "render": return this.renderBounds;
			case "content": if (this.contentBounds) return this.contentBounds;
			case "box": return this.boxBounds;
			case "stroke": return this.strokeBounds;
		}
	}
	getLocalBounds(e = "box") {
		switch (e) {
			case "render": return this.localRenderBounds;
			case "stroke": return this.localStrokeBounds;
			case "content": if (this.contentBounds) return this.localContentBounds;
			case "box": return this.leaf.__localBoxBounds;
		}
	}
	getWorldBounds(e = "box") {
		switch (e) {
			case "render": return this.leaf.__world;
			case "stroke": return this.worldStrokeBounds;
			case "content": if (this.contentBounds) return this.worldContentBounds;
			case "box": return this.worldBoxBounds;
		}
	}
	getLayoutBounds(e, t = "world", n) {
		let { leaf: r } = this, i, a, o, s = this.getInnerBounds(e);
		switch (t) {
			case "world":
				i = r.getWorldPoint(s), a = r.__world;
				break;
			case "local":
				let { scaleX: e, scaleY: n, rotation: c, skewX: l, skewY: u } = r.__;
				o = {
					scaleX: e,
					scaleY: n,
					rotation: c,
					skewX: l,
					skewY: u
				}, i = r.getLocalPointByInner(s);
				break;
			case "inner":
				i = s, a = L.defaultMatrix;
				break;
			case "page": t = r.zoomLayer;
			default: i = r.getWorldPoint(s, t), a = Yl(r, t, !0);
		}
		if (o ||= L.getLayout(a), $l(o, s), R.copy(o, i), n) {
			let { scaleX: e, scaleY: t } = o, n = Math.abs(e), r = Math.abs(t);
			n === 1 && r === 1 || (o.scaleX /= n, o.scaleY /= r, o.width *= n, o.height *= r);
		}
		return o;
	}
	getLayoutPoints(e, t = "world") {
		let { leaf: n } = this, r = Ql(this.getInnerBounds(e)), i;
		switch (t) {
			case "world":
				i = null;
				break;
			case "local":
				i = n.parent;
				break;
			case "inner": break;
			case "page": t = n.zoomLayer;
			default: i = t;
		}
		return P(i) || r.forEach((e) => n.innerToWorld(e, null, !1, i)), r;
	}
	shrinkContent() {
		let { x: e, y: t, width: n, height: r } = this.boxBounds;
		this._contentBounds = {
			x: e,
			y: t,
			width: n,
			height: r
		};
	}
	spreadStroke() {
		let { x: e, y: t, width: n, height: r } = this.strokeBounds;
		this._strokeBounds = {
			x: e,
			y: t,
			width: n,
			height: r
		}, this._localStrokeBounds = {
			x: e,
			y: t,
			width: n,
			height: r
		}, this.renderSpread || this.spreadRenderCancel();
	}
	spreadRender() {
		let { x: e, y: t, width: n, height: r } = this.renderBounds;
		this._renderBounds = {
			x: e,
			y: t,
			width: n,
			height: r
		}, this._localRenderBounds = {
			x: e,
			y: t,
			width: n,
			height: r
		};
	}
	shrinkContentCancel() {
		this._contentBounds = void 0;
	}
	spreadStrokeCancel() {
		let e = this.renderBounds === this.strokeBounds;
		this._strokeBounds = this.boxBounds, this._localStrokeBounds = this.leaf.__localBoxBounds, e && this.spreadRenderCancel();
	}
	spreadRenderCancel() {
		this._renderBounds = this._strokeBounds, this._localRenderBounds = this._localStrokeBounds;
	}
	boxChange() {
		this.boxChanged = !0, this.localBoxChanged ? this.boundsChanged ||= !0 : this.localBoxChange(), this.hitCanvasChanged = !0;
	}
	localBoxChange() {
		this.localBoxChanged = !0, this.boundsChanged = !0;
	}
	strokeChange() {
		this.strokeChanged = !0, this.strokeSpread ||= 1, this.boundsChanged = !0, this.hitCanvasChanged = !0;
	}
	renderChange() {
		this.renderChanged = !0, this.renderSpread ||= 1, this.boundsChanged = !0, this.hitCanvasChanged = !0;
	}
	scaleChange() {
		this.scaleChanged = !0, this._scaleOrRotationChange();
	}
	rotationChange() {
		this.rotationChanged = !0, this.affectRotation = !0, this._scaleOrRotationChange();
	}
	_scaleOrRotationChange() {
		this.affectScaleOrRotation = !0, this.matrixChange(), this.leaf.__local || this.createLocal();
	}
	matrixChange() {
		this.matrixChanged = !0, this.localBoxChanged ? this.boundsChanged ||= !0 : this.localBoxChange();
	}
	surfaceChange() {
		this.surfaceChanged = !0;
	}
	opacityChange() {
		this.opacityChanged = !0;
	}
	childrenSortChange() {
		this.childrenSortChanged || (this.childrenSortChanged = this.affectChildrenSort = !0, this.leaf.forceUpdate("surface"));
	}
	destroy() {}
}, au = class {
	constructor(e, t) {
		this.bubbles = !1, this.type = e, t && (this.target = t);
	}
	stopDefault() {
		this.isStopDefault = !0, this.origin && V.event.stopDefault(this.origin);
	}
	stopNow() {
		this.isStopNow = !0, this.isStop = !0, this.origin && V.event.stopNow(this.origin);
	}
	stop() {
		this.isStop = !0, this.origin && V.event.stop(this.origin);
	}
}, ou = class extends au {
	constructor(e, t, n) {
		super(e, t), this.parent = n, this.child = t;
	}
};
ou.ADD = "child.add", ou.REMOVE = "child.remove", ou.CREATED = "created", ou.MOUNTED = "mounted", ou.UNMOUNTED = "unmounted", ou.DESTROY = "destroy";
var su = "property.scroll", cu = class extends au {
	constructor(e, t, n, r, i) {
		super(e, t), this.attrName = n, this.oldValue = r, this.newValue = i;
	}
};
cu.CHANGE = "property.change", cu.LEAFER_CHANGE = "property.leafer_change", cu.SCROLL = su;
var lu = {
	scrollX: su,
	scrollY: su
}, uu = class extends au {
	constructor(e, t) {
		super(e), Object.assign(this, t);
	}
};
uu.LOAD = "image.load", uu.LOADED = "image.loaded", uu.ERROR = "image.error";
var du = class extends au {
	static checkHas(e, t, n) {
		n === "on" ? t === hu ? e.__hasWorldEvent = !0 : e.__hasLocalEvent = !0 : (e.__hasLocalEvent = e.hasEvent(fu) || e.hasEvent(pu) || e.hasEvent(mu), e.__hasWorldEvent = e.hasEvent(hu));
	}
	static emitLocal(e) {
		if (e.leaferIsReady) {
			let { resized: t } = e.__layout;
			t !== "local" && (e.emit(fu, e), t === "inner" && e.emit(pu, e)), e.emit(mu, e);
		}
	}
	static emitWorld(e) {
		e.leaferIsReady && e.emit(hu, e);
	}
};
du.RESIZE = "bounds.resize", du.INNER = "bounds.inner", du.LOCAL = "bounds.local", du.WORLD = "bounds.world";
var { RESIZE: fu, INNER: pu, LOCAL: mu, WORLD: hu } = du, gu = {};
[
	fu,
	pu,
	mu,
	hu
].forEach((e) => gu[e] = 1);
var _u = class e extends au {
	get bigger() {
		if (!this.old) return !0;
		let { width: e, height: t } = this.old;
		return this.width >= e && this.height >= t;
	}
	get smaller() {
		return !this.bigger;
	}
	get samePixelRatio() {
		return !this.old || this.pixelRatio === this.old.pixelRatio;
	}
	constructor(t, n) {
		Gn(t) ? (super(e.RESIZE), Object.assign(this, t)) : super(t), this.old = n;
	}
	static isResizing(e) {
		return this.resizingKeys && !P(this.resizingKeys[e.innerId]);
	}
};
_u.RESIZE = "resize";
var vu = class extends au {
	constructor(e, t) {
		super(e), this.data = t;
	}
};
vu.REQUEST = "watch.request", vu.DATA = "watch.data";
var yu = class extends au {
	constructor(e, t, n) {
		super(e), t && (this.data = t, this.times = n);
	}
};
yu.REQUEST = "layout.request", yu.START = "layout.start", yu.BEFORE = "layout.before", yu.LAYOUT = "layout", yu.AFTER = "layout.after", yu.AGAIN = "layout.again", yu.END = "layout.end";
var bu = class extends au {
	constructor(e, t, n, r) {
		super(e), t && (this.times = t), n && (this.renderBounds = n, this.renderOptions = r);
	}
};
bu.REQUEST = "render.request", bu.CHILD_START = "render.child_start", bu.CHILD_END = "render.child_end", bu.START = "render.start", bu.BEFORE = "render.before", bu.RENDER = "render", bu.AFTER = "render.after", bu.AGAIN = "render.again", bu.END = "render.end", bu.NEXT = "render.next";
var q = class extends au {};
q.START = "leafer.start", q.BEFORE_READY = "leafer.before_ready", q.READY = "leafer.ready", q.AFTER_READY = "leafer.after_ready", q.VIEW_READY = "leafer.view_ready", q.VIEW_COMPLETED = "leafer.view_completed", q.STOP = "leafer.stop", q.RESTART = "leafer.restart", q.END = "leafer.end", q.UPDATE_MODE = "leafer.update_mode", q.TRANSFORM = "leafer.transform", q.MOVE = "leafer.move", q.SCALE = "leafer.scale", q.ROTATE = "leafer.rotate", q.SKEW = "leafer.skew";
var { MOVE: xu, SCALE: Su, ROTATE: Cu, SKEW: wu } = q, Tu = {
	x: xu,
	y: xu,
	scaleX: Su,
	scaleY: Su,
	rotation: Cu,
	skewX: wu,
	skewY: wu
}, Eu = {}, Du = class {
	set event(e) {
		this.on(e);
	}
	on(e, t, n) {
		if (!t) {
			let t;
			if (Wn(e)) e.forEach((e) => this.on(e[0], e[1], e[2]));
			else for (let n in e) Wn(t = e[n]) ? this.on(n, t[0], t[1]) : this.on(n, t);
			return;
		}
		let r, i, a;
		n && (n === "once" ? i = !0 : typeof n == "boolean" ? r = n : (r = n.capture, i = n.once));
		let o = Ou(this, r, !0), s = Vn(e) ? e.split(" ") : e, c = i ? {
			listener: t,
			once: i
		} : { listener: t };
		s.forEach((e) => {
			e && (a = o[e], a ? a.findIndex((e) => e.listener === t) === -1 && a.push(c) : o[e] = [c], gu[e] && du.checkHas(this, e, "on"));
		});
	}
	off(e, t, n) {
		if (e) {
			let r = Vn(e) ? e.split(" ") : e;
			if (t) {
				let e, i, a;
				n && (e = typeof n == "boolean" ? n : n !== "once" && n.capture);
				let o = Ou(this, e);
				r.forEach((e) => {
					e && (i = o[e], i && (a = i.findIndex((e) => e.listener === t), a > -1 && i.splice(a, 1), i.length || delete o[e], gu[e] && du.checkHas(this, e, "off")));
				});
			} else {
				let { __bubbleMap: e, __captureMap: t } = this;
				r.forEach((n) => {
					e && delete e[n], t && delete t[n];
				});
			}
		} else this.__bubbleMap = this.__captureMap = void 0;
	}
	on_(e, t, n, r) {
		return t ? this.on(e, n ? t = t.bind(n) : t, r) : Wn(e) && e.forEach((e) => this.on(e[0], e[2] ? e[1] = e[1].bind(e[2]) : e[1], e[3])), {
			type: e,
			current: this,
			listener: t,
			options: r
		};
	}
	off_(e) {
		if (!e) return;
		let t = Wn(e) ? e : [e];
		t.forEach((e) => {
			e && (e.listener ? e.current.off(e.type, e.listener, e.options) : Wn(e.type) && e.type.forEach((t) => e.current.off(t[0], t[1], t[3])));
		}), t.length = 0;
	}
	once(e, t, n, r) {
		if (!t) return Wn(e) && e.forEach((e) => this.once(e[0], e[1], e[2], e[3]));
		Gn(n) ? t = t.bind(n) : r = n, this.on(e, t, {
			once: !0,
			capture: r
		});
	}
	emit(e, t, n) {
		!t && Vi.has(e) && (t = Vi.get(e, {
			type: e,
			target: this,
			current: this
		}));
		let r = Ou(this, n)[e];
		if (r) {
			let i;
			for (let a = 0, o = r.length; a < o && !((i = r[a]) && (i.listener(t), i.once && (this.off(e, i.listener, n), a--, o--), t && t.isStopNow)); a++);
		}
		this.syncEventer && this.syncEventer.emitEvent(t, n);
	}
	emitEvent(e, t) {
		e.current = this, this.emit(e.type, e, t);
	}
	hasEvent(e, t) {
		if (this.syncEventer && this.syncEventer.hasEvent(e, t)) return !0;
		let { __bubbleMap: n, __captureMap: r } = this, i = n && n[e], a = r && r[e];
		return !!(P(t) ? i || a : t ? a : i);
	}
	destroy() {
		this.__captureMap = this.__bubbleMap = this.syncEventer = null;
	}
};
function Ou(e, t, n) {
	if (t) {
		let { __captureMap: t } = e;
		return t || (n ? e.__captureMap = {} : Eu);
	}
	{
		let { __bubbleMap: t } = e;
		return t || (n ? e.__bubbleMap = {} : Eu);
	}
}
var { on: ku, on_: Au, off: ju, off_: Mu, once: Nu, emit: Pu, emitEvent: Fu, hasEvent: Iu, destroy: Lu } = Du.prototype, Ru = {
	on: ku,
	on_: Au,
	off: ju,
	off_: Mu,
	once: Nu,
	emit: Pu,
	emitEvent: Fu,
	hasEvent: Iu,
	destroyEventer: Lu
}, zu = Oi.get("setAttr"), Bu = {
	__setAttr(e, t, n) {
		if (this.leaferIsCreated) {
			let r = this.__.__getInput(e);
			if (!n || Hn(t) || P(t) || (zu.warn(this.innerName, e, t), t = void 0), Gn(t) || r !== t) {
				if (this.__realSetAttr(e, t), this.isLeafer) {
					this.emitEvent(new cu(cu.LEAFER_CHANGE, this, e, r, t));
					let n = Tu[e];
					n && (this.emitEvent(new q(n, this)), this.emitEvent(new q(q.TRANSFORM, this)));
				}
				this.emitPropertyEvent(cu.CHANGE, e, r, t);
				let n = lu[e];
				return n && this.emitPropertyEvent(n, e, r, t), !0;
			}
			return !1;
		}
		return this.__realSetAttr(e, t), !0;
	},
	emitPropertyEvent(e, t, n, r) {
		let i = new cu(e, this, t, n, r);
		this.isLeafer || this.hasEvent(e) && this.emitEvent(i), this.leafer.emitEvent(i);
	},
	__realSetAttr(e, t) {
		let n = this.__;
		n[e] = t, this.__proxyData && this.setProxyAttr(e, t), n.normalStyle && (this.lockNormalStyle || P(n.normalStyle[e]) || (n.normalStyle[e] = t));
	},
	__getAttr(e) {
		return this.__proxyData ? this.getProxyAttr(e) : this.__.__get(e);
	}
}, { setLayout: Vu, multiplyParent: Hu, translateInner: Uu, defaultWorld: Wu } = L, { toPoint: Gu, tempPoint: Ku } = Zr, qu = {
	__updateWorldMatrix() {
		let { parent: e, __layout: t, __world: n, __scrollWorld: r, __: i } = this;
		Hu(this.__local || t, e ? e.__scrollWorld || e.__world : Wu, n, !!t.affectScaleOrRotation, i), r && Uu(Object.assign(r, n), i.scrollX, i.scrollY), t.scaleFixed && Al.updateScaleFixedWorld(this);
	},
	__updateLocalMatrix() {
		if (this.__local) {
			let e = this.__layout, t = this.__local, n = this.__;
			e.affectScaleOrRotation && (e.scaleChanged && (e.resized ||= "scale") || e.rotationChanged) && (Vu(t, n, null, null, e.affectRotation), e.scaleChanged = e.rotationChanged = void 0), t.e = n.x + n.offsetX, t.f = n.y + n.offsetY, (n.around || n.origin) && (Gu(n.around || n.origin, e.boxBounds, Ku), Uu(t, -Ku.x, -Ku.y, !n.around));
		}
		this.__layout.matrixChanged = void 0;
	}
}, { updateMatrix: Ju, updateAllMatrix: Yu } = Al, { updateBounds: Xu } = Hl, { toOuterOf: Zu, copyAndSpread: Qu, copy: $u } = z, { toBounds: ed } = ac, td = {
	__updateWorldBounds() {
		let { __layout: e, __world: t } = this;
		Zu(e.renderBounds, t, t), this.__hasComplex && Al.checkComplex(this), e.resized &&= (e.resized === "inner" && this.__onUpdateSize(), this.__hasLocalEvent && du.emitLocal(this), void 0), this.__hasWorldEvent && du.emitWorld(this);
	},
	__updateLocalBounds() {
		let e = this.__layout, t = this.__;
		e.boxChanged && (t.__pathInputed || this.__updatePath(), this.__updateRenderPath(), this.__updateBoxBounds(), e.resized = "inner"), e.localBoxChanged && (this.__local && this.__updateLocalBoxBounds(), e.localBoxChanged = void 0, e.strokeSpread && !e.strokeChanged && (e.strokeChanged = !!e.boxChanged || 2), e.renderSpread && !e.renderChanged && (e.renderChanged = !!e.boxChanged || 2), this.parent && this.parent.__layout.boxChange()), e.boxChanged = void 0, e.strokeChanged && (e.strokeChanged === 2 ? this.__updateLocalStrokeBounds() : (e.strokeSpread = this.__updateStrokeSpread(), e.strokeSpread ? (e.strokeBounds === e.boxBounds && e.spreadStroke(), this.__updateStrokeBounds(), this.__updateLocalStrokeBounds()) : e.spreadStrokeCancel(), e.resized = "inner", (e.renderSpread || e.strokeSpread !== e.strokeBoxSpread) && (e.renderChanged = !0)), e.strokeChanged = void 0, this.parent && this.parent.__layout.strokeChange()), e.renderChanged && (e.renderChanged === 2 ? this.__updateLocalRenderBounds() : (e.renderSpread = this.__updateRenderSpread(), e.renderSpread ? (e.renderBounds !== e.boxBounds && e.renderBounds !== e.strokeBounds || e.spreadRender(), this.__updateRenderBounds(), this.__updateLocalRenderBounds()) : e.spreadRenderCancel()), e.renderChanged = void 0, this.parent && this.parent.__layout.renderChange()), e.outerScale && Al.updateOuterBounds(this), e.resized ||= "local", e.boundsChanged = void 0;
	},
	__updateLocalBoxBounds() {
		this.__hasMotionPath && this.__updateMotionPath(), this.__hasAutoLayout && this.__updateAutoLayout(), Zu(this.__layout.boxBounds, this.__local, this.__local);
	},
	__updateLocalStrokeBounds() {
		Zu(this.__layout.strokeBounds, this.__localMatrix, this.__layout.localStrokeBounds);
	},
	__updateLocalRenderBounds() {
		Zu(this.__layout.renderBounds, this.__localMatrix, this.__layout.localRenderBounds);
	},
	__updateBoxBounds(e, t) {
		let n = this.__layout.boxBounds, r = this.__;
		r.__usePathBox ? ed(r.path, n) : (n.x = 0, n.y = 0, n.width = r.width, n.height = r.height);
	},
	__updateAutoLayout() {
		this.__layout.matrixChanged = !0, this.isBranch ? (this.__extraUpdate(), this.__.flow ? (this.__layout.childrenSortChanged && this.__updateSortChildren(), this.__layout.boxChanged && this.__updateFlowLayout(), Yu(this), Xu(this, this), this.__.__autoSide && this.__updateBoxBounds(!0)) : (Yu(this), Xu(this, this))) : Ju(this);
	},
	__updateNaturalSize() {
		let { __: e, __layout: t } = this;
		e.__naturalWidth = t.boxBounds.width, e.__naturalHeight = t.boxBounds.height;
	},
	__updateStrokeBounds(e) {
		let t = this.__layout;
		Qu(t.strokeBounds, t.boxBounds, t.strokeBoxSpread);
	},
	__updateRenderBounds(e) {
		let t = this.__layout, { renderSpread: n } = t;
		Un(n) && n <= 0 ? $u(t.renderBounds, t.strokeBounds) : Qu(t.renderBounds, t.boxBounds, n);
	}
}, nd = {
	__render(e, t) {
		if (t.shape) return this.__renderShape(e, t);
		if ((!t.cellList || t.cellList.has(this)) && this.__worldOpacity) {
			let n = this.__;
			if (n.bright && !t.topRendering) return t.topList.add(this);
			if (e.setWorld(this.__nowWorld = this.__getNowWorld(t)), e.opacity = t.ignoreOpacity ? 1 : t.dimOpacity && !n.dimskip ? n.opacity * t.dimOpacity : n.opacity, this.__.__single) {
				if (n.eraser === "path") return this.__renderEraser(e, t);
				let r = e.getSameCanvas(!0, !0);
				this.__draw(r, t, e), Al.copyCanvasByWorld(this, e, r, this.__nowWorld, n.__blendMode, !0), r.recycle(this.__nowWorld);
			} else this.__draw(e, t);
			Oi.showBounds && Oi.drawBounds(this, e, t);
		}
	},
	__renderShape(e, t) {
		this.__worldOpacity && (e.setWorld(this.__nowWorld = this.__getNowWorld(t)), this.__drawShape(e, t));
	},
	__clip(e, t) {
		this.__worldOpacity && (e.setWorld(this.__nowWorld = this.__getNowWorld(t)), this.__drawRenderPath(e), e.clipUI(this));
	},
	__updateWorldOpacity() {
		this.__worldOpacity = this.__.visible ? this.parent ? this.parent.__worldOpacity * this.__.opacity : this.__.opacity : 0, this.__layout.opacityChanged && (this.__layout.opacityChanged = !1);
	}
}, { excludeRenderBounds: rd } = Rl, { hasSize: id } = z, ad = {
	__updateChange() {
		this.__layout.childrenSortChanged && this.__updateSortChildren(), this.__.__checkSingle();
	},
	__render(e, t) {
		let n = this.__nowWorld = this.__getNowWorld(t);
		if (this.__worldOpacity && id(n)) {
			let r = this.__;
			if (r.__useDim) {
				if (r.bright && !t.topRendering) return t.topList.add(this);
				r.dim ? t.dimOpacity = !0 === r.dim ? .2 : r.dim : r.dimskip && t.dimOpacity && (t.dimOpacity = 0);
			}
			if (r.__single && !this.isBranchLeaf) {
				if (r.eraser === "path") return this.__renderEraser(e, t);
				let i = e.getSameCanvas(!1, !0);
				this.__renderBranch(i, t), e.opacity = t.ignoreOpacity ? 1 : t.dimOpacity ? r.opacity * t.dimOpacity : r.opacity, e.copyWorldByReset(i, n, n, r.__blendMode, !0), i.recycle(n);
			} else this.__renderBranch(e, t);
		}
	},
	__renderBranch(e, t) {
		if (this.__hasMask) this.__renderMask(e, t);
		else {
			let n, { children: r } = this;
			for (let i = 0, a = r.length; i < a; i++) n = r[i], rd(n, t) || (n.__hasComplex ? Al.renderComplex(n, e, t) : n.__render(e, t));
			this.__hasMask === 0 && this.__rerenderMask(e, t);
		}
	},
	__clip(e, t) {
		if (this.__worldOpacity) {
			let { children: n } = this;
			for (let r = 0, i = n.length; r < i; r++) rd(n[r], t) || n[r].__clip(e, t);
		}
	}
}, { LEAF: od, create: sd } = Xn, { stintSet: cd } = F, { toInnerPoint: ld, toOuterPoint: ud, multiplyParent: dd } = L, { toOuterOf: fd } = z, { copy: pd, move: md } = R, { getScaleFixedData: hd } = mr, { moveLocal: gd, zoomOfLocal: _d, rotateOfLocal: vd, skewOfLocal: yd, moveWorld: bd, zoomOfWorld: xd, rotateOfWorld: Sd, skewOfWorld: Cd, transform: wd, transformWorld: Td, setTransform: Ed, getFlipTransform: Dd, getLocalOrigin: Od, getRelativeWorld: kd, drop: Ad } = Al, jd = class {
	get tag() {
		return this.__tag;
	}
	set tag(e) {}
	get __tag() {
		return "Leaf";
	}
	get innerName() {
		return this.__.name || this.tag + this.innerId;
	}
	get __DataProcessor() {
		return Yn;
	}
	get __LayoutProcessor() {
		return iu;
	}
	get leaferIsCreated() {
		return this.leafer && this.leafer.created;
	}
	get leaferIsReady() {
		return this.leafer && this.leafer.ready;
	}
	get isLeafer() {
		return !1;
	}
	get isFrame() {
		return !1;
	}
	get isBranch() {
		return !1;
	}
	get isBranchLeaf() {
		return !1;
	}
	get __localMatrix() {
		return this.__local || this.__layout;
	}
	get __localBoxBounds() {
		return this.__local || this.__layout;
	}
	get worldTransform() {
		return this.__layout.getTransform("world");
	}
	get localTransform() {
		return this.__layout.getTransform("local");
	}
	get scrollWorldTransform() {
		return this.updateLayout(), this.__scrollWorld || this.__world;
	}
	get boxBounds() {
		return this.getBounds("box", "inner");
	}
	get renderBounds() {
		return this.getBounds("render", "inner");
	}
	get worldBoxBounds() {
		return this.getBounds("box");
	}
	get worldStrokeBounds() {
		return this.getBounds("stroke");
	}
	get worldRenderBounds() {
		return this.getBounds("render");
	}
	get worldOpacity() {
		return this.updateLayout(), this.__worldOpacity;
	}
	get __worldFlipped() {
		return this.__world.scaleX < 0 || this.__world.scaleY < 0;
	}
	get __onlyHitMask() {
		return this.__hasMask && !this.__.hitChildren;
	}
	get __ignoreHitWorld() {
		return (this.__hasMask || this.__hasEraser) && this.__.hitChildren;
	}
	get __inLazyBounds() {
		return this.leaferIsCreated && this.leafer.lazyBounds.hit(this.__world);
	}
	get pathInputed() {
		return this.__.__pathInputed;
	}
	set event(e) {
		this.on(e);
	}
	constructor(e) {
		this.innerId = sd(od), this.reset(e), this.__bubbleMap && this.__emitLifeEvent(ou.CREATED);
	}
	reset(e) {
		this.leafer && this.leafer.forceRender(this.__world), e !== 0 && (this.__world = {
			a: 1,
			b: 0,
			c: 0,
			d: 1,
			e: 0,
			f: 0,
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			scaleX: 1,
			scaleY: 1
		}, e !== null && (this.__local = {
			a: 1,
			b: 0,
			c: 0,
			d: 1,
			e: 0,
			f: 0,
			x: 0,
			y: 0,
			width: 0,
			height: 0
		})), this.__worldOpacity = 1, this.__ = new this.__DataProcessor(this), this.__layout = new this.__LayoutProcessor(this), this.__level && this.resetCustom(), e && (e.__ && (e = e.toJSON()), e.children ? this.set(e) : Object.assign(this, e));
	}
	resetCustom() {
		this.__hasMask = this.__hasEraser = null, this.forceUpdate();
	}
	waitParent(e, t) {
		t && (e = e.bind(t)), this.parent ? e() : this.on(ou.ADD, e, "once");
	}
	waitLeafer(e, t) {
		t && (e = e.bind(t)), this.leafer ? e() : this.on(ou.MOUNTED, e, "once");
	}
	nextRender(e, t, n) {
		this.leafer ? this.leafer.nextRender(e, t, n) : this.waitLeafer(() => this.leafer.nextRender(e, t, n));
	}
	removeNextRender(e) {
		this.nextRender(e, null, "off");
	}
	__bindLeafer(e) {
		if (this.isLeafer && e !== null && (e = this), this.leafer && !e && this.leafer.leafs--, this.leafer = e, e ? (e.leafs++, this.__level = this.parent ? this.parent.__level + 1 : 1, this.animation && this.__runAnimation("in"), this.__bubbleMap && this.__emitLifeEvent(ou.MOUNTED), e.cacheId && Al.cacheId(this)) : this.__emitLifeEvent(ou.UNMOUNTED), this.isBranch) {
			let { children: t } = this;
			for (let n = 0, r = t.length; n < r; n++) t[n].__bindLeafer(e);
		}
	}
	__bindFrame(e) {
		if (this.isFrame && e !== null && (e = this), this.frame = e, this.isBranch) {
			let { children: t } = this;
			for (let n = 0, r = t.length; n < r; n++) t[n].__bindFrame(e);
		}
	}
	setAttr(e, t) {
		this[e] = t;
	}
	getAttr(e) {
		return this[e];
	}
	getComputedAttr(e) {
		return this.__[e];
	}
	toJSON(e) {
		return e && this.__layout.update(), this.__.__getInputData(null, e);
	}
	toString(e) {
		return JSON.stringify(this.toJSON(e));
	}
	scaleResize(e, t = e, n, r) {
		this.scaleX *= e, this.scaleY *= t;
	}
	updateLayout() {
		this.__layout.update();
	}
	forceUpdate(e) {
		let t;
		if (e && e !== "bounds" ? e === "surface" ? (Zc(this), t = !0) : e === "stroke" && (qc(this), t = !0) : (Uc(this), t = !0), t) {
			let { leafer: e } = this;
			return e && e.watcher && e.watcher.__onAttrChange({ target: this });
		}
		let n = this.__.__getInput(e);
		this.__[e] = P(n) ? null : void 0, this[e] = n;
	}
	forceRender(e, t) {
		this.forceUpdate("surface");
	}
	__extraUpdate() {
		this.leaferIsReady && this.leafer.layouter.addExtra(this);
	}
	__updateEraser(e) {
		this.__hasEraser = !!e || this.children.some((e) => e.__.eraser);
	}
	__renderEraser(e, t) {
		e.save(), this.__clip(e, t);
		let { renderBounds: n } = this.__layout;
		e.clearRect(n.x, n.y, n.width, n.height), e.restore();
	}
	__updateMask(e) {
		let t = this.children.some((e) => e.__.mask && e.__.visible && e.__.opacity);
		this.__hasMask = this.__.maskskip ? t && 0 : t;
	}
	__getNowWorld(e) {
		if (e.matrix) {
			this.__cameraWorld ||= {};
			let t = this.__cameraWorld, n = this.__world;
			return dd(n, e.matrix, t, void 0, n), fd(this.__layout.renderBounds, t, t), cd(t, "half", n.half), cd(t, "ignorePixelSnap", n.ignorePixelSnap), t;
		}
		return this.__world;
	}
	getClampRenderScale() {
		let { scaleX: e } = this.__nowWorld || this.__world;
		return e < 0 && (e = -e), e > 1 ? e : 1;
	}
	getRenderScaleData(e, t, n = !0) {
		return hd(Tc.patternLocked ? this.__world : this.__nowWorld || this.__world, t, n, e);
	}
	getTransform(e) {
		return this.__layout.getTransform(e || "local");
	}
	getBounds(e, t) {
		return this.__layout.getBounds(e, t);
	}
	getLayoutBounds(e, t, n) {
		return this.__layout.getLayoutBounds(e, t, n);
	}
	getLayoutPoints(e, t) {
		return this.__layout.getLayoutPoints(e, t);
	}
	getWorldBounds(e, t, n) {
		let r = t ? kd(this, t) : this.worldTransform, i = n ? e : {};
		return fd(e, r, i), i;
	}
	worldToLocal(e, t, n, r) {
		this.parent ? this.parent.worldToInner(e, t, n, r) : t && pd(t, e);
	}
	localToWorld(e, t, n, r) {
		this.parent ? this.parent.innerToWorld(e, t, n, r) : t && pd(t, e);
	}
	worldToInner(e, t, n, r) {
		r && (r.innerToWorld(e, t, n), e = t || e), ld(this.worldTransform, e, t, n);
	}
	innerToWorld(e, t, n, r) {
		ud(this.worldTransform, e, t, n), r && r.worldToInner(t || e, null, n);
	}
	getBoxPoint(e, t, n, r) {
		let i = this.getInnerPoint(e, t, n, r);
		return n ? i : this.getBoxPointByInner(i, null, null, !0);
	}
	getBoxPointByInner(e, t, n, r) {
		let i = r ? e : Object.assign({}, e), { x: a, y: o } = this.boxBounds;
		return md(i, -a, -o), i;
	}
	getInnerPoint(e, t, n, r) {
		let i = r ? e : {};
		return this.worldToInner(e, i, n, t), i;
	}
	getInnerPointByBox(e, t, n, r) {
		let i = r ? e : Object.assign({}, e), { x: a, y: o } = this.boxBounds;
		return md(i, a, o), i;
	}
	getInnerPointByLocal(e, t, n, r) {
		return this.getInnerPoint(e, this.parent, n, r);
	}
	getLocalPoint(e, t, n, r) {
		let i = r ? e : {};
		return this.worldToLocal(e, i, n, t), i;
	}
	getLocalPointByInner(e, t, n, r) {
		return this.getWorldPoint(e, this.parent, n, r);
	}
	getPagePoint(e, t, n, r) {
		return (this.leafer ? this.leafer.zoomLayer : this).getInnerPoint(e, t, n, r);
	}
	getWorldPoint(e, t, n, r) {
		let i = r ? e : {};
		return this.innerToWorld(e, i, n, t), i;
	}
	getWorldPointByBox(e, t, n, r) {
		return this.getWorldPoint(this.getInnerPointByBox(e, null, null, r), t, n, !0);
	}
	getWorldPointByLocal(e, t, n, r) {
		let i = r ? e : {};
		return this.localToWorld(e, i, n, t), i;
	}
	getWorldPointByPage(e, t, n, r) {
		return (this.leafer ? this.leafer.zoomLayer : this).getWorldPoint(e, t, n, r);
	}
	setTransform(e, t, n, r) {
		Ed(this, e, t, n, r);
	}
	transform(e, t, n, r) {
		wd(this, e, t, n, r);
	}
	move(e, t, n) {
		gd(this, e, t, n);
	}
	moveInner(e, t, n) {
		bd(this, e, t, !0, n);
	}
	scaleOf(e, t, n, r, i, a) {
		_d(this, Od(this, e), t, n, r, i, a);
	}
	rotateOf(e, t, n) {
		vd(this, Od(this, e), t, n);
	}
	skewOf(e, t, n, r, i) {
		yd(this, Od(this, e), t, n, r, i);
	}
	transformWorld(e, t, n, r) {
		Td(this, e, t, n, r);
	}
	moveWorld(e, t, n) {
		bd(this, e, t, !1, n);
	}
	scaleOfWorld(e, t, n, r, i, a) {
		xd(this, e, t, n, r, i, a);
	}
	rotateOfWorld(e, t) {
		Sd(this, e, t);
	}
	skewOfWorld(e, t, n, r, i) {
		Cd(this, e, t, n, r, i);
	}
	flip(e, t) {
		wd(this, Dd(this, e), !1, t);
	}
	remove(e, t) {
		this.parent && this.parent.remove(this, t);
	}
	dropTo(e, t, n) {
		Ad(this, e, t, n);
	}
	static changeAttr(e, t, n) {
		n ? this.addAttr(e, t, n) : ll(this.prototype, e, t);
	}
	static addAttr(e, t, n, r) {
		n ||= K, n(t, r)(this.prototype, e);
	}
	__emitLifeEvent(e) {
		this.hasEvent(e) && this.emitEvent(new ou(e, this, this.parent));
	}
	destroy() {
		this.destroyed ||= (this.parent && this.remove(), this.children && this.clear(), this.__emitLifeEvent(ou.DESTROY), this.__.destroy(), this.__layout.destroy(), this.destroyEventer(), !0);
	}
};
jd = H([
	gl(Bu),
	gl(qu),
	gl(td),
	gl(Ru),
	gl(nd)
], jd);
var { setListWithFn: Md } = z, { sort: Nd } = Hl, { localBoxBounds: Pd, localStrokeBounds: Fd, localRenderBounds: Id, maskLocalBoxBounds: Ld, maskLocalStrokeBounds: Rd, maskLocalRenderBounds: zd } = Rl, Bd = new Oi("Branch"), Vd = class extends jd {
	__updateStrokeSpread() {
		let { children: e } = this;
		for (let t = 0, n = e.length; t < n; t++) if (e[t].__layout.strokeSpread) return 1;
		return 0;
	}
	__updateRenderSpread() {
		let e, { children: t } = this;
		for (let n = 0, r = t.length; n < r; n++) if (e = t[n].__layout, e.renderSpread || e.localOuterBounds) return 1;
		return 0;
	}
	__updateBoxBounds(e, t) {
		Md(t || this.__layout.boxBounds, this.children, this.__hasMask ? Ld : Pd);
	}
	__updateStrokeBounds(e) {
		Md(e || this.__layout.strokeBounds, this.children, this.__hasMask ? Rd : Fd);
	}
	__updateRenderBounds(e) {
		Md(e || this.__layout.renderBounds, this.children, this.__hasMask ? zd : Id);
	}
	__updateSortChildren() {
		let e, { children: t } = this;
		if (t.length > 1) {
			for (let n = 0, r = t.length; n < r; n++) t[n].__tempNumber = n, t[n].__.zIndex && (e = !0);
			t.sort(Nd), this.__layout.affectChildrenSort = e;
		}
		this.__layout.childrenSortChanged = !1;
	}
	add(e, t) {
		if (e === this || e.destroyed) return Bd.warn("add self or destroyed");
		let n = P(t);
		if (!e.__) {
			if (Wn(e)) return e.forEach((e) => {
				this.add(e, t), n || t++;
			});
			if (!(e = Ri.get(e.tag, e))) return;
		}
		e.parent && e.parent.remove(e), e.parent = this, n ? this.children.push(e) : this.children.splice(t, 0, e), e.isBranch && (this.__.__childBranchNumber = (this.__.__childBranchNumber || 0) + 1);
		let r = e.__layout;
		r.boxChanged || r.boxChange(), r.matrixChanged || r.matrixChange(), e.__bubbleMap && e.__emitLifeEvent(ou.ADD), this.leafer && (e.__bindLeafer(this.leafer), this.leafer.created && this.__emitChildEvent(ou.ADD, e)), this.isFrame && e.__bindFrame(this), this.__layout.affectChildrenSort && this.__layout.childrenSortChange();
	}
	addMany(...e) {
		this.add(e);
	}
	remove(e, t) {
		e ? e.__ ? e.animationOut ? e.__runAnimation("out", () => this.__remove(e, t)) : this.__remove(e, t) : this.find(e).forEach((e) => this.remove(e, t)) : P(e) && super.remove(null, t);
	}
	removeAll(e) {
		let { children: t } = this;
		t.length && (this.children = [], this.__preRemove(), this.__.__childBranchNumber = 0, t.forEach((t) => {
			this.__realRemoveChild(t), e && t.destroy();
		}));
	}
	clear() {
		this.removeAll(!0);
	}
	__remove(e, t) {
		let n = this.children.indexOf(e);
		n > -1 && (this.children.splice(n, 1), e.isBranch && (this.__.__childBranchNumber = (this.__.__childBranchNumber || 1) - 1), this.__preRemove(), this.__realRemoveChild(e), t && e.destroy());
	}
	__preRemove() {
		this.__hasMask && this.__updateMask(), this.__hasEraser && this.__updateEraser(), this.__layout.boxChange(), this.__layout.affectChildrenSort && this.__layout.childrenSortChange();
	}
	__realRemoveChild(e) {
		e.__emitLifeEvent(ou.REMOVE), e.parent = null, this.leafer && (e.__bindLeafer(null), this.leafer.created && (this.__emitChildEvent(ou.REMOVE, e), this.leafer.hitCanvasManager && this.leafer.hitCanvasManager.clear())), this.isFrame && e.__bindFrame(null);
	}
	__emitChildEvent(e, t) {
		let n = new ou(e, t, this);
		this.hasEvent(e) && !this.isLeafer && this.emitEvent(n), this.leafer.emitEvent(n);
	}
};
Vd = H([gl(ad)], Vd);
var Hd = class e {
	get length() {
		return this.list.length;
	}
	constructor(e) {
		this.reset(), e && (Wn(e) ? this.addList(e) : this.add(e));
	}
	has(e) {
		return e && !P(this.keys[e.innerId]);
	}
	indexAt(e) {
		return this.list[e];
	}
	indexOf(e) {
		let t = this.keys[e.innerId];
		return P(t) ? -1 : t;
	}
	add(e) {
		let { list: t, keys: n } = this;
		P(n[e.innerId]) && (t.push(e), n[e.innerId] = t.length - 1);
	}
	addAt(e, t = 0) {
		let { keys: n } = this;
		if (P(n[e.innerId])) {
			let { list: r } = this;
			for (let e = t, i = r.length; e < i; e++) n[r[e].innerId]++;
			t === 0 ? r.unshift(e) : (t > r.length && (t = r.length), r.splice(t, 0, e)), n[e.innerId] = t;
		}
	}
	addList(e) {
		for (let t = 0; t < e.length; t++) this.add(e[t]);
	}
	remove(e) {
		let { list: t } = this, n;
		for (let r = 0, i = t.length; r < i; r++) P(n) ? t[r].innerId === e.innerId && (n = r, delete this.keys[e.innerId]) : this.keys[t[r].innerId] = r - 1;
		P(n) || t.splice(n, 1);
	}
	sort(e) {
		let { list: t } = this;
		e ? t.sort((e, t) => t.__level - e.__level) : t.sort((e, t) => e.__level - t.__level);
	}
	forEach(e) {
		this.list.forEach(e);
	}
	clone() {
		let t = new e();
		return t.list = [...this.list], t.keys = Object.assign({}, this.keys), t;
	}
	update() {
		this.keys = {};
		let { list: e, keys: t } = this;
		for (let n = 0, r = e.length; n < r; n++) t[e[n].innerId] = n;
	}
	reset() {
		this.list = [], this.keys = {};
	}
	destroy() {
		this.reset();
	}
}, Ud = class {
	get length() {
		return this._length;
	}
	constructor(e) {
		this._length = 0, this.reset(), e && (Wn(e) ? this.addList(e) : this.add(e));
	}
	has(e) {
		return !P(this.keys[e.innerId]);
	}
	without(e) {
		return P(this.keys[e.innerId]);
	}
	sort(e) {
		let { levels: t } = this;
		e ? t.sort((e, t) => t - e) : t.sort((e, t) => e - t);
	}
	addList(e) {
		e.forEach((e) => {
			this.add(e);
		});
	}
	add(e) {
		let { keys: t, levelMap: n } = this;
		t[e.innerId] || (t[e.innerId] = 1, n[e.__level] ? n[e.__level].push(e) : (n[e.__level] = [e], this.levels.push(e.__level)), this._length++);
	}
	forEach(e) {
		let t;
		this.levels.forEach((n) => {
			t = this.levelMap[n];
			for (let n = 0, r = t.length; n < r; n++) e(t[n]);
		});
	}
	reset() {
		this.levelMap = {}, this.keys = {}, this.levels = [], this._length = 0;
	}
	destroy() {
		this.levelMap = null;
	}
};
//#endregion
//#region node_modules/@leafer-ui/draw/lib/draw.esm.min.js
function J(e, t, n, r) {
	var i, a = arguments.length, o = a < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") o = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (i = e[s]) && (o = (a < 3 ? i(o) : a > 3 ? i(t, n, o) : i(t, n)) || o);
	return a > 3 && o && Object.defineProperty(t, n, o), o;
}
function Wd(e) {
	return Nc(e, (e) => Pc({ set(t) {
		this.__setAttr(e, t), t && (this.__.__useEffect = !0);
		let n = this.__layout;
		n.renderChanged || n.renderChange(), n.surfaceChange();
	} }));
}
function Gd(e) {
	return Nc(e, (e) => Pc({ set(t) {
		this.__setAttr(e, t), this.__layout.boxChanged || this.__layout.boxChange(), this.__updateSize();
	} }));
}
function Kd() {
	return (e, t) => {
		let n = "_" + t;
		Ac(e, t, {
			set(e) {
				this.isLeafer && (this[n] = e);
			},
			get() {
				return this.isApp ? this.tree.zoomLayer : this.isLeafer ? this[n] || this : this.leafer && this.leafer.zoomLayer;
			}
		});
	};
}
var qd = {}, Jd = { hasTransparent: function(e) {
	if (!e || e.length === 7 || e.length === 4) return !1;
	if (e === "transparent") return !0;
	let t = e[0];
	if (t === "#") switch (e.length) {
		case 5: return e[4] !== "f" && e[4] !== "F";
		case 9: return e[7] !== "f" && e[7] !== "F" || e[8] !== "f" && e[8] !== "F";
	}
	else if ((t === "r" || t === "h") && e[3] === "a") {
		let t = e.lastIndexOf(",");
		if (t > -1) return parseFloat(e.slice(t + 1)) < 1;
	}
	return !1;
} }, Yd = Si, Xd = {}, Y = {}, Zd = {}, Qd = {}, $d = {}, ef = { apply() {
	Fi.need("filter");
} }, tf = {}, nf = {
	setStyleName: () => Fi.need("state"),
	set: () => Fi.need("state")
}, rf = {
	list: {},
	register(e, t) {
		rf.list[e] = t;
	},
	get: (e) => rf.list[e]
}, { parse: af, objectToCanvasData: of } = Eo, { stintSet: sf } = F, { hasTransparent: cf } = Jd, lf = { originPaint: {} }, uf = Oi.get("UIData"), df = class extends Yn {
	get scale() {
		let { scaleX: e, scaleY: t } = this;
		return e === t ? e : {
			x: e,
			y: t
		};
	}
	get __strokeWidth() {
		return this.__getRealStrokeWidth();
	}
	get __maxStrokeWidth() {
		let e = this, t = e.__hasStrokeSides || e.strokeWidth;
		return e.__hasMultiStrokeStyle ? Math.max(e.__hasMultiStrokeStyle, t) : t;
	}
	get __hasMultiPaint() {
		let e = this;
		return e.fill && this.__useStroke || e.__isFills && e.fill.length > 1 || e.__isStrokes && e.stroke.length > 1 || e.__useEffect;
	}
	get __clipAfterFill() {
		let e = this;
		return e.cornerRadius || e.innerShadow || e.__pathInputed;
	}
	get __hasSurface() {
		return this.fill || this.stroke;
	}
	get __autoWidth() {
		return this._width == null;
	}
	get __autoHeight() {
		return this._height == null;
	}
	get __autoSide() {
		return this._width == null || this._height == null;
	}
	get __autoSize() {
		return this._width == null && this._height == null;
	}
	setVisible(e) {
		this._visible = e;
		let { leafer: t } = this.__leaf;
		t && (t.watcher.hasVisible = !0);
	}
	setWidth(e) {
		e < 0 ? (this._width = -e, this.__leaf.scaleX *= -1, uf.warn("width < 0, instead -scaleX ", this)) : this._width = e;
	}
	setHeight(e) {
		e < 0 ? (this._height = -e, this.__leaf.scaleY *= -1, uf.warn("height < 0, instead -scaleY", this)) : this._height = e;
	}
	setFill(e) {
		this.__naturalWidth && this.__removeNaturalSize(), Vn(e) || !e ? (sf(this, "__isTransparentFill", cf(e)), this.__isFills && this.__removePaint("fill", !0), this._fill = e) : Gn(e) && this.__setPaint("fill", e);
	}
	setStroke(e) {
		Vn(e) || !e ? (sf(this, "__isTransparentStroke", cf(e)), this.__isStrokes && this.__removePaint("stroke", !0), this._stroke = e) : Gn(e) && this.__setPaint("stroke", e);
	}
	setPath(e) {
		let t = Vn(e);
		t || e && Gn(e[0]) ? (this.__setInput("path", e), this._path = t ? af(e, this.__useArrow) : of(e)) : (this.__input && this.__removeInput("path"), this._path = e);
	}
	setShadow(e) {
		ff(this, "shadow", e);
	}
	setInnerShadow(e) {
		ff(this, "innerShadow", e);
	}
	setFilter(e) {
		ff(this, "filter", e);
	}
	__computePaint() {
		let { fill: e, stroke: t } = this.__input;
		e && Y.compute("fill", this.__leaf), t && Y.compute("stroke", this.__leaf), this.__needComputePaint = void 0;
	}
	__getRealStrokeWidth(e) {
		let { strokeWidth: t, strokeScaleFixed: n } = this;
		if (e && (e.strokeWidth && (t = e.strokeWidth), P(e.strokeScaleFixed) || (n = e.strokeScaleFixed)), n) {
			let { scaleX: e } = this.__leaf.getRenderScaleData(!0, n, !1);
			if (e !== 1) return t * e;
		}
		return t;
	}
	__checkComplex() {
		let e = this;
		sf(e, "__complex", e.__isFills || e.__isStrokes || e.cornerRadius || e.__useEffect);
	}
	__setPaint(e, t) {
		this.__setInput(e, t);
		let n = this.__leaf.__layout;
		n.boxChanged || n.boxChange(), Wn(t) && !t.length ? this.__removePaint(e) : e === "fill" ? (this.__isFills = !0, this._fill ||= lf) : (this.__isStrokes = !0, this._stroke ||= lf);
	}
	__removePaint(e, t) {
		t && this.__removeInput(e), Zd.recycleImage(e, this), e === "fill" ? (sf(this, "__isAlphaPixelFill", void 0), this._fill = this.__isFills = void 0) : (sf(this, "__isAlphaPixelStroke", void 0), sf(this, "__hasMultiStrokeStyle", void 0), this._stroke = this.__isStrokes = void 0);
	}
};
function ff(e, t, n) {
	e.__setInput(t, n), Wn(n) ? (n.some((e) => !1 === e.visible) && (n = n.filter((e) => !1 !== e.visible)), n.length || (n = void 0)) : n = n && !1 !== n.visible ? [n] : void 0, e["_" + t] = n;
}
var pf = class extends df {}, mf = class extends pf {
	get __boxStroke() {
		return !this.__pathInputed;
	}
	get __drawAfterFill() {
		return this.__single || this.__clipAfterFill;
	}
	get __clipAfterFill() {
		let e = this;
		return e.overflow !== "show" && e.__leaf.children.length && (e.__leaf.isOverflow || super.__clipAfterFill);
	}
}, hf = class extends pf {
	__getInputData(e, t) {
		let n = super.__getInputData(e, t);
		return ea.forEach((e) => delete n[e]), n;
	}
}, gf = class extends mf {}, _f = class extends df {
	get __usePathBox() {
		return this.points || this.__pathInputed;
	}
}, vf = class extends df {
	get __boxStroke() {
		return !this.__pathInputed;
	}
}, yf = class extends df {
	get __boxStroke() {
		return !this.__pathInputed;
	}
}, bf = class extends df {
	get __usePathBox() {
		return this.points || this.__pathInputed;
	}
}, xf = class extends df {}, Sf = class extends df {
	get __pathInputed() {
		return 2;
	}
}, Cf = class extends pf {}, wf = {
	thin: 100,
	"extra-light": 200,
	light: 300,
	normal: 400,
	medium: 500,
	"semi-bold": 600,
	bold: 700,
	"extra-bold": 800,
	black: 900
}, Tf = class extends df {
	get __useNaturalRatio() {
		return !1;
	}
	setFontWeight(e) {
		Vn(e) ? (this.__setInput("fontWeight", e), e = wf[e] || 400) : this.__input && this.__removeInput("fontWeight"), this._fontWeight = e;
	}
	setBoxStyle(e) {
		let t = this.__leaf, n = t.__box;
		if (e) {
			let { boxStyle: r } = this;
			if (n) for (let e in r) n[e] = void 0;
			else n = t.__box = Ri.get("Rect", 0);
			let i = t.__layout, a = n.__layout;
			r || (n.parent = t, n.__world = t.__world, a.boxBounds = i.boxBounds), n.set(e), a.strokeChanged && i.strokeChange();
		} else n && (t.__box = n.parent = null, n.destroy());
		this._boxStyle = e;
	}
	__getInputData(e, t) {
		let n = super.__getInputData(e, t);
		return n.textEditing && delete n.textEditing, n;
	}
}, Ef = class extends vf {
	get __urlType() {
		return "image";
	}
	setUrl(e) {
		this.__setImageFill(e), this._url = e;
	}
	__setImageFill(e) {
		this.fill = e ? {
			type: this.__urlType,
			mode: "stretch",
			url: e
		} : void 0;
	}
	__getData() {
		let e = super.__getData();
		return e.url && delete e.fill, e;
	}
	__getInputData(e, t) {
		let n = super.__getInputData(e, t);
		return n.url && delete n.fill, n;
	}
}, Df = class extends vf {
	get __isCanvas() {
		return !0;
	}
	get __drawAfterFill() {
		return !0;
	}
	__getInputData(e, t) {
		let n = super.__getInputData(e, t);
		return n.url = this.__leaf.canvas.toDataURL("image/png"), n;
	}
}, { max: Of, add: kf } = rr, Af = {
	__updateStrokeSpread() {
		let e = 0, t = 0, n = this.__, { strokeAlign: r, __maxStrokeWidth: i } = n, a = this.__box;
		if ((n.stroke || n.hitStroke === "all") && i && r !== "inside" && (t = e = r === "center" ? i / 2 : i, !n.__boxStroke || n.__useArrow)) {
			let t = n.__isLinePath ? 0 : (n.strokeJoin === "miter" ? 10 : 1) * e, r = n.strokeCap === "none" ? 0 : i;
			e += Math.max(t, r);
		}
		return n.__useArrow && (e += 5 * i), a && (e = Of(e, a.__layout.strokeSpread = a.__updateStrokeSpread()), t = Math.max(t, a.__layout.strokeBoxSpread)), this.__layout.strokeBoxSpread = t, e;
	},
	__updateRenderSpread() {
		let e = 0, { shadow: t, innerShadow: n, blur: r, backgroundBlur: i, filter: a, renderSpread: o } = this.__, { strokeSpread: s } = this.__layout, c = this.__box;
		t && (e = $d.getShadowRenderSpread(this, t)), r && (e = Of(e, r)), a && (e = kf(e, ef.getSpread(a))), o && (e = kf(e, o)), s && (e = kf(e, s));
		let l = e;
		return n && (l = Of(l, $d.getInnerShadowSpread(this, n))), i && (l = Of(l, i)), this.__layout.renderShapeSpread = l, c ? Of(c.__updateRenderSpread(), e) : e;
	}
}, { stintSet: jf } = F, Mf = {
	__updateChange() {
		let e = this.__;
		if (e.__useStroke) {
			let t = e.__useStroke = !(!e.stroke || !e.strokeWidth);
			jf(this.__world, "half", t && e.strokeAlign === "center" && e.strokeWidth % 2), jf(e, "__fillAfterStroke", t && e.strokeAlign === "outside" && e.fill && !e.__isTransparentFill);
		}
		if (e.__useEffect) {
			let { shadow: t, fill: n, stroke: r } = e, i = e.innerShadow || e.blur || e.backgroundBlur || e.filter;
			jf(e, "__isFastShadow", t && !i && t.length < 2 && !t[0].spread && !$d.isTransformShadow(t[0]) && n && !e.__isTransparentFill && !(Wn(n) && n.length > 1) && (this.useFastShadow || !r || r && e.strokeAlign === "inside")), e.__useEffect = !(!t && !i);
		}
		e.__checkSingle(), e.__checkComplex();
	},
	__drawFast(e, t) {
		Nf(this, e, t);
	},
	__draw(e, t, n) {
		let r = this.__;
		if (r.__complex) {
			r.__needComputePaint && r.__computePaint();
			let { fill: i, stroke: a, __drawAfterFill: o, __fillAfterStroke: s, __isFastShadow: c } = r;
			if (this.__drawRenderPath(e), r.__useEffect && !c) {
				let c = Y.shape(this, e, t);
				this.__nowWorld = this.__getNowWorld(t);
				let { shadow: l, innerShadow: u, filter: d } = r;
				l && $d.shadow(this, e, c), s && (r.__isStrokes ? Y.strokes(a, this, e, t) : Y.stroke(a, this, e, t)), i && (r.__isFills ? Y.fills(i, this, e, t) : Y.fill(i, this, e, t)), o && this.__drawAfterFill(e, t), u && $d.innerShadow(this, e, c), a && !s && (r.__isStrokes ? Y.strokes(a, this, e, t) : Y.stroke(a, this, e, t)), d && ef.apply(d, this, this.__nowWorld, e, n, c), c.worldCanvas && c.worldCanvas.recycle(), c.canvas.recycle();
			} else {
				if (s && (r.__isStrokes ? Y.strokes(a, this, e, t) : Y.stroke(a, this, e, t)), c) {
					let t = r.shadow[0], { scaleX: n, scaleY: i } = this.getRenderScaleData(!0, t.scaleFixed);
					e.save(), e.setWorldShadow(t.x * n, t.y * i, t.blur * n, Jd.string(t.color));
				}
				i && (r.__isFills ? Y.fills(i, this, e, t) : Y.fill(i, this, e, t)), c && e.restore(), o && this.__drawAfterFill(e, t), a && !s && (r.__isStrokes ? Y.strokes(a, this, e, t) : Y.stroke(a, this, e, t));
			}
		} else r.__pathForRender ? Nf(this, e, t) : this.__drawFast(e, t);
	},
	__drawShape(e, t) {
		this.__drawRenderPath(e);
		let n = this.__, { fill: r, stroke: i } = n;
		r && !t.ignoreFill && (n.__isAlphaPixelFill ? Y.fills(r, this, e, t) : Y.fill("#000000", this, e, t)), n.__isCanvas && this.__drawAfterFill(e, t), i && !t.ignoreStroke && (n.__isAlphaPixelStroke ? Y.strokes(i, this, e, t) : Y.stroke("#000000", this, e, t));
	},
	__drawAfterFill(e, t) {
		this.__.__clipAfterFill ? (e.save(), e.clipUI(this), this.__drawContent(e, t), e.restore()) : this.__drawContent(e, t);
	}
};
function Nf(e, t, n) {
	let { fill: r, stroke: i, __drawAfterFill: a, __fillAfterStroke: o } = e.__;
	e.__drawRenderPath(t), o && Y.stroke(i, e, t, n), r && Y.fill(r, e, t, n), a && e.__drawAfterFill(t, n), i && !o && Y.stroke(i, e, t, n);
}
var Pf = { __drawFast(e, t) {
	let { x: n, y: r, width: i, height: a } = this.__layout.boxBounds, { fill: o, stroke: s, __drawAfterFill: c } = this.__;
	if (o && (e.fillStyle = o, e.fillRect(n, r, i, a)), c && this.__drawAfterFill(e, t), s) {
		let { strokeAlign: o, __strokeWidth: c } = this.__;
		if (!c) return;
		e.setStroke(s, c, this.__);
		let l = c / 2;
		switch (o) {
			case "center":
				e.strokeRect(0, 0, i, a);
				break;
			case "inside":
				i -= c, a -= c, i < 0 || a < 0 ? (e.save(), this.__clip(e, t), e.strokeRect(n + l, r + l, i, a), e.restore()) : e.strokeRect(n + l, r + l, i, a);
				break;
			case "outside": e.strokeRect(n - l, r - l, i + c, a + c);
		}
	}
} }, Ff, X = Ff = class extends jd {
	get app() {
		return this.leafer && this.leafer.app;
	}
	set strokeWidthFixed(e) {
		this.strokeScaleFixed = e;
	}
	get strokeWidthFixed() {
		return this.strokeScaleFixed;
	}
	set scale(e) {
		mr.assignScale(this, e);
	}
	get scale() {
		return this.__.scale;
	}
	get isAutoWidth() {
		let e = this.__;
		return e.__autoWidth || e.autoWidth;
	}
	get isAutoHeight() {
		let e = this.__;
		return e.__autoHeight || e.autoHeight;
	}
	get pen() {
		let { path: e } = this.__;
		return mc.set(this.path = e || []), e || this.__drawPathByBox(mc), mc;
	}
	set(e, t) {
		e && Object.assign(this, e);
	}
	get(e) {
		return Vn(e) ? this.__.__getInput(e) : this.__.__getInputData(e);
	}
	find(e, t) {
		return Fi.need("find");
	}
	findTag(e) {
		return this.find({ tag: e });
	}
	findOne(e, t) {
		return Fi.need("find");
	}
	findId(e) {
		return this.findOne({ id: e });
	}
	getPath(e, t) {
		this.__layout.update();
		let n = t ? this.__.__pathForRender : this.__.path;
		return n || (mc.set(n = []), this.__drawPathByBox(mc, !t)), e ? Eo.toCanvasData(n, !0) : n;
	}
	getPathString(e, t, n) {
		return Eo.stringify(this.getPath(e, t), n);
	}
	asPath(e, t) {
		this.path = this.getPath(e, t);
	}
	load() {
		this.__.__computePaint();
	}
	__onUpdateSize() {
		if (this.__.__input) {
			let e = this.__;
			!e.lazy || this.__inLazyBounds || tf.running ? e.__computePaint() : e.__needComputePaint = !0;
		}
	}
	__updatePath() {}
	__updateRenderPath(e) {
		let t = this.__;
		t.path ? (t.__pathForRender = t.cornerRadius || t.path.radius ? fc.smooth(t.path, t.cornerRadius, t.cornerSmoothing) : t.path, t.__useArrow && Xd.addArrows(this, e)) : t.__pathForRender &&= void 0;
	}
	__drawRenderPath(e) {
		let t = this.__;
		e.beginPath(), t.__useArrow && Xd.updateArrow(this), this.__drawPathByData(e, t.__pathForRender);
	}
	__drawPath(e) {
		let t = this.__;
		e.beginPath(), t.__usePointsMode ? Ds.drawPathByPoints(e, t.points, t.closed) : this.__drawPathByData(e, t.path, !0);
	}
	__drawPathByData(e, t, n) {
		t ? Ds.drawPathByData(e, t) : this.__drawPathByBox(e, n);
	}
	__drawPathByBox(e, t) {
		let { x: n, y: r, width: i, height: a } = this.__layout.boxBounds;
		if (this.__.cornerRadius && !t) {
			let { cornerRadius: t } = this.__;
			e.roundRect(n, r, i, a, Un(t) ? [t] : t);
		} else e.rect(n, r, i, a);
		e.closePath();
	}
	drawImagePlaceholder(e, t, n) {
		Y.fill(this.__.placeholderColor, this, t, n);
	}
	animate(e, t, n, r) {
		return this.set(e), Fi.need("animate");
	}
	killAnimate(e, t) {}
	export(e, t) {
		return Fi.need("export");
	}
	syncExport(e, t) {
		return Fi.need("export");
	}
	clone(e) {
		let t = F.clone(this.toJSON());
		return e && Object.assign(t, e), Ff.one(t);
	}
	static one(e, t, n, r, i) {
		return Ri.get(e.tag || this.prototype.__tag, e, t, n, r, i);
	}
	static registerUI() {
		_l()(this);
	}
	static registerData(e) {
		cl(e)(this.prototype);
	}
	static setEditConfig(e) {}
	static setEditOuter(e) {}
	static setEditInner(e) {}
	destroy() {
		this.__.__willDestroy = !0, this.fill = this.stroke = null, this.__animate && this.killAnimate(), super.destroy();
	}
};
J([cl(df)], X.prototype, "__", void 0), J([Kd()], X.prototype, "zoomLayer", void 0), J([Ic("")], X.prototype, "id", void 0), J([Ic("")], X.prototype, "name", void 0), J([Ic("")], X.prototype, "className", void 0), J([Xc("pass-through")], X.prototype, "blendMode", void 0), J([$c(1)], X.prototype, "opacity", void 0), J([el(!0)], X.prototype, "visible", void 0), J([Xc(!1)], X.prototype, "locked", void 0), J([Qc(!1)], X.prototype, "dim", void 0), J([Qc(!1)], X.prototype, "dimskip", void 0), J([rl(0)], X.prototype, "zIndex", void 0), J([il(!1)], X.prototype, "mask", void 0), J([al(!1)], X.prototype, "eraser", void 0), J([Lc(0, !0)], X.prototype, "x", void 0), J([Lc(0, !0)], X.prototype, "y", void 0), J([K(100, !0)], X.prototype, "width", void 0), J([K(100, !0)], X.prototype, "height", void 0), J([Bc(1, !0)], X.prototype, "scaleX", void 0), J([Bc(1, !0)], X.prototype, "scaleY", void 0), J([Vc(0, !0)], X.prototype, "rotation", void 0), J([Vc(0, !0)], X.prototype, "skewX", void 0), J([Vc(0, !0)], X.prototype, "skewY", void 0), J([Lc(0, !0)], X.prototype, "offsetX", void 0), J([Lc(0, !0)], X.prototype, "offsetY", void 0), J([Rc(0, !0)], X.prototype, "scrollX", void 0), J([Rc(0, !0)], X.prototype, "scrollY", void 0), J([zc()], X.prototype, "origin", void 0), J([zc()], X.prototype, "around", void 0), J([Ic(!1)], X.prototype, "lazy", void 0), J([Hc(1)], X.prototype, "pixelRatio", void 0), J([Yc(0)], X.prototype, "renderSpread", void 0), J([Wc()], X.prototype, "path", void 0), J([Gc()], X.prototype, "windingRule", void 0), J([Gc(!0)], X.prototype, "closed", void 0), J([K(0)], X.prototype, "padding", void 0), J([K(!1)], X.prototype, "lockRatio", void 0), J([K()], X.prototype, "widthRange", void 0), J([K()], X.prototype, "heightRange", void 0), J([Ic(!1)], X.prototype, "draggable", void 0), J([Ic()], X.prototype, "dragBounds", void 0), J([Ic("auto")], X.prototype, "dragBoundsType", void 0), J([Ic(!1)], X.prototype, "editable", void 0), J([ol(!0)], X.prototype, "hittable", void 0), J([ol()], X.prototype, "hitThrough", void 0), J([ol("path")], X.prototype, "hitFill", void 0), J([Jc("path")], X.prototype, "hitStroke", void 0), J([ol(!1)], X.prototype, "hitBox", void 0), J([ol(!0)], X.prototype, "hitChildren", void 0), J([ol(!0)], X.prototype, "hitSelf", void 0), J([ol()], X.prototype, "hitRadius", void 0), J([sl("")], X.prototype, "cursor", void 0), J([Xc()], X.prototype, "fill", void 0), J([Jc(void 0, !0)], X.prototype, "stroke", void 0), J([Jc("inside")], X.prototype, "strokeAlign", void 0), J([Jc(1, !0)], X.prototype, "strokeWidth", void 0), J([Jc(!1)], X.prototype, "strokeScaleFixed", void 0), J([Jc("none")], X.prototype, "strokeCap", void 0), J([Jc("miter")], X.prototype, "strokeJoin", void 0), J([Jc()], X.prototype, "dashPattern", void 0), J([Jc(0)], X.prototype, "dashOffset", void 0), J([Jc(10)], X.prototype, "miterLimit", void 0), J([Gc(0)], X.prototype, "cornerRadius", void 0), J([Gc()], X.prototype, "cornerSmoothing", void 0), J([Wd()], X.prototype, "shadow", void 0), J([Wd()], X.prototype, "innerShadow", void 0), J([Wd()], X.prototype, "blur", void 0), J([Wd()], X.prototype, "backgroundBlur", void 0), J([Wd()], X.prototype, "grayscale", void 0), J([Wd()], X.prototype, "filter", void 0), J([Xc()], X.prototype, "placeholderColor", void 0), J([Ic(100)], X.prototype, "placeholderDelay", void 0), J([Ic({})], X.prototype, "data", void 0), X = Ff = J([
	gl(Af),
	gl(Mf),
	ml()
], X);
var If = class extends X {
	get __tag() {
		return "Group";
	}
	get isBranch() {
		return !0;
	}
	reset(e) {
		this.__setBranch(), super.reset(e);
	}
	__setBranch() {
		this.children ||= [];
	}
	set(e, t) {
		if (e) if (e.children) {
			let { children: n } = e;
			delete e.children, this.children ? this.clear() : this.__setBranch(), super.set(e, t), n.forEach((e) => this.add(e)), e.children = n;
		} else super.set(e, t);
	}
	toJSON(e) {
		let t = super.toJSON(e);
		if (!this.childlessJSON) {
			let n = t.children = [];
			this.children.forEach((t) => t.skipJSON || n.push(t.toJSON(e)));
		}
		return t;
	}
	addAt(e, t) {
		this.add(e, t);
	}
	addAfter(e, t) {
		this.add(e, this.children.indexOf(t) + 1);
	}
	addBefore(e, t) {
		this.add(e, this.children.indexOf(t));
	}
}, Lf;
J([cl(pf)], If.prototype, "__", void 0), J([K(0)], If.prototype, "width", void 0), J([K(0)], If.prototype, "height", void 0), If = J([gl(Vd), _l()], If);
var Rf = Oi.get("Leafer"), zf = Lf = class extends If {
	get __tag() {
		return "Leafer";
	}
	get isApp() {
		return !1;
	}
	get app() {
		return this.parent || this;
	}
	get isLeafer() {
		return !0;
	}
	get imageReady() {
		return this.viewReady && Cc.isComplete;
	}
	get layoutLocked() {
		return !this.layouter.running;
	}
	get view() {
		return this.canvas && this.canvas.view;
	}
	get FPS() {
		return this.renderer ? this.renderer.FPS : 60;
	}
	get cursorPoint() {
		return this.interaction && this.interaction.hoverData || {
			x: this.width / 2,
			y: this.height / 2
		};
	}
	get clientBounds() {
		return this.canvas && this.canvas.getClientBounds(!0) || yr();
	}
	constructor(e, t) {
		super(t), this.config = {
			start: !0,
			hittable: !0,
			smooth: !0,
			lazySpeard: 100
		}, this.leafs = 0, this.__eventIds = [], this.__controllers = [], this.__readyWait = [], this.__viewReadyWait = [], this.__viewCompletedWait = [], this.__nextRenderWait = [], this.userConfig = e, e && (e.view || e.width) && this.init(e), Lf.list.add(this);
	}
	init(e, t) {
		if (this.canvas) return;
		let n, { config: r } = this;
		this.__setLeafer(this), t && (this.parentApp = t, this.__bindApp(t), n = t.running), e && (this.parent = t, this.initType(e.type), this.parent = void 0, F.assign(r, e));
		let i = this.canvas = Ii.canvas(r);
		this.__controllers.push(this.renderer = Ii.renderer(this, i, r), this.watcher = Ii.watcher(this, r), this.layouter = Ii.layouter(this, r)), this.isApp && this.__setApp(), this.__checkAutoLayout(), t || (this.selector = Ii.selector(this), this.interaction = Ii.interaction(this, i, this.selector, r), this.interaction && (this.__controllers.unshift(this.interaction), this.hitCanvasManager = Ii.hitCanvasManager()), this.canvasManager = new Ui(), n = r.start), this.hittable = r.hittable, this.fill = r.fill, this.canvasManager.add(i), this.__listenEvents(), n && (this.__startTimer = setTimeout(this.start.bind(this))), Jl.run(this.__initWait), this.onInit();
	}
	onInit() {}
	initType(e) {}
	set(e, t) {
		this.waitInit(() => {
			super.set(e, t);
		});
	}
	start() {
		clearTimeout(this.__startTimer), !this.running && this.canvas && (this.running = !0, this.ready ? this.emitLeafer(q.RESTART) : this.emitLeafer(q.START), this.__controllers.forEach((e) => e.start()), this.isApp || this.renderer.render());
	}
	stop() {
		clearTimeout(this.__startTimer), this.running && this.canvas && (this.__controllers.forEach((e) => e.stop()), this.running = !1, this.emitLeafer(q.STOP));
	}
	unlockLayout(e = !0) {
		this.layouter.start(), e && this.updateLayout();
	}
	lockLayout(e = !0) {
		e && this.updateLayout(), this.layouter.stop();
	}
	resize(e) {
		let t = F.copyAttrs({}, e, ea);
		Object.keys(t).forEach((e) => this[e] = t[e]);
	}
	forceRender(e, t) {
		let { renderer: n } = this;
		n && (n.addBlock(e ? new yi(e) : this.canvas.bounds), this.viewReady && (t ? n.render() : n.update()));
	}
	requestRender(e = !1) {
		this.renderer && this.renderer.update(e);
	}
	updateCursor(e) {
		let t = this.interaction;
		t && (e ? t.setCursor(e) : t.updateCursor());
	}
	updateLazyBounds() {
		this.lazyBounds = this.canvas.bounds.clone().spread(this.config.lazySpeard);
	}
	__doResize(e) {
		let { canvas: t } = this;
		if (!t || t.isSameSize(e)) return;
		let n = F.copyAttrs({}, this.canvas, ea);
		t.resize(e), this.updateLazyBounds(), this.__onResize(new _u(e, n));
	}
	__onResize(e) {
		this.emitEvent(e), F.copyAttrs(this.__, e, ea), setTimeout(() => {
			this.canvasManager && this.canvasManager.clearRecycled();
		}, 0);
	}
	__setApp() {}
	__bindApp(e) {
		this.selector = e.selector, this.interaction = e.interaction, this.canvasManager = e.canvasManager, this.hitCanvasManager = e.hitCanvasManager;
	}
	__setLeafer(e) {
		this.leafer = e, this.__level = 1;
	}
	__checkAutoLayout() {
		let { config: e, parentApp: t } = this;
		t || (e.width && e.height || (this.autoLayout = new xi(e)), this.canvas.startAutoLayout(this.autoLayout, this.__onResize.bind(this)));
	}
	__setAttr(e, t) {
		return this.canvas && (ea.includes(e) ? this.__changeCanvasSize(e, t) : e === "fill" ? this.__changeFill(t) : e === "hittable" ? this.parent || (this.canvas.hittable = t) : e === "zIndex" ? (this.canvas.zIndex = t, setTimeout(() => this.parent && this.parent.__updateSortChildren())) : e === "mode" && this.emit(q.UPDATE_MODE, { mode: t })), super.__setAttr(e, t);
	}
	__getAttr(e) {
		return this.canvas && ea.includes(e) ? this.canvas[e] : super.__getAttr(e);
	}
	__changeCanvasSize(e, t) {
		let { config: n, canvas: r } = this, i = F.copyAttrs({}, r, ea);
		i[e] = n[e] = t, n.width && n.height ? r.stopAutoLayout() : this.__checkAutoLayout(), this.__doResize(i);
	}
	__changeFill(e) {
		this.config.fill = e, this.canvas.allowBackgroundColor ? this.canvas.backgroundColor = e : this.forceRender();
	}
	__onCreated() {
		this.created = !0;
	}
	__onReady() {
		this.ready = !0, this.emitLeafer(q.BEFORE_READY), this.emitLeafer(q.READY), this.emitLeafer(q.AFTER_READY), Jl.run(this.__readyWait);
	}
	__onViewReady() {
		this.viewReady || (this.viewReady = !0, this.emitLeafer(q.VIEW_READY), Jl.run(this.__viewReadyWait));
	}
	__onLayoutEnd() {
		let { grow: e, width: t, height: n } = this.config;
		if (e) {
			let { width: r, height: i, pixelRatio: a } = this, o = e === "box" ? this.worldBoxBounds : this.__world;
			t || (r = Math.max(1, o.x + o.width)), n || (i = Math.max(1, o.y + o.height)), this.__doResize({
				width: r,
				height: i,
				pixelRatio: a
			});
		}
		this.ready || this.__onReady();
	}
	__onNextRender() {
		if (this.viewReady) {
			Jl.run(this.__nextRenderWait);
			let { imageReady: e } = this;
			e && !this.viewCompleted && this.__checkViewCompleted(), e || (this.viewCompleted = !1, this.requestRender());
		} else this.requestRender();
	}
	__checkViewCompleted(e = !0) {
		this.nextRender(() => {
			this.imageReady && (e && this.emitLeafer(q.VIEW_COMPLETED), Jl.run(this.__viewCompletedWait), this.viewCompleted = !0);
		});
	}
	__onWatchData() {
		this.watcher.childrenChanged && this.interaction && this.nextRender(() => this.interaction.updateCursor());
	}
	waitInit(e, t) {
		t && (e = e.bind(t)), this.__initWait ||= [], this.canvas ? e() : this.__initWait.push(e);
	}
	waitReady(e, t) {
		t && (e = e.bind(t)), this.ready ? e() : this.__readyWait.push(e);
	}
	waitViewReady(e, t) {
		t && (e = e.bind(t)), this.viewReady ? e() : this.__viewReadyWait.push(e);
	}
	waitViewCompleted(e, t) {
		t && (e = e.bind(t)), this.__viewCompletedWait.push(e), this.viewCompleted ? this.__checkViewCompleted(!1) : this.running || this.start();
	}
	nextRender(e, t, n) {
		t && (e = e.bind(t));
		let r = this.__nextRenderWait;
		if (n) {
			for (let t = 0; t < r.length; t++) if (r[t] === e) {
				r.splice(t, 1);
				break;
			}
		} else r.push(e);
		this.requestRender();
	}
	zoom(e, t, n, r) {
		return Fi.need("view");
	}
	getValidMove(e, t, n) {
		return {
			x: e,
			y: t
		};
	}
	getValidScale(e) {
		return e;
	}
	getWorldPointByClient(e, t) {
		return this.interaction && this.interaction.getLocal(e, t);
	}
	getPagePointByClient(e, t) {
		return this.getPagePoint(this.getWorldPointByClient(e, t));
	}
	getClientPointByWorld(e) {
		let { x: t, y: n } = this.clientBounds;
		return {
			x: t + e.x,
			y: n + e.y
		};
	}
	updateClientBounds() {
		this.canvas && this.canvas.updateClientBounds();
	}
	receiveEvent(e) {}
	emitLeafer(e) {
		this.emitEvent(new q(e, this));
	}
	__listenEvents() {
		let e = Mi.start("FirstCreate " + this.innerName);
		this.once([
			[q.START, () => Mi.end(e)],
			[
				yu.START,
				this.updateLazyBounds,
				this
			],
			[
				bu.START,
				this.__onCreated,
				this
			],
			[
				bu.END,
				this.__onViewReady,
				this
			]
		]), this.__eventIds.push(this.on_([
			[
				vu.DATA,
				this.__onWatchData,
				this
			],
			[
				yu.END,
				this.__onLayoutEnd,
				this
			],
			[
				bu.NEXT,
				this.__onNextRender,
				this
			]
		]));
	}
	__removeListenEvents() {
		this.off_(this.__eventIds);
	}
	destroy(e) {
		let t = () => {
			if (!this.destroyed) {
				Lf.list.remove(this);
				try {
					this.stop(), this.emitLeafer(q.END), this.__removeListenEvents(), this.__controllers.forEach((e) => !(this.parent && e === this.interaction) && e.destroy()), this.__controllers.length = 0, this.parent || (this.selector && this.selector.destroy(), this.hitCanvasManager && this.hitCanvasManager.destroy(), this.canvasManager && this.canvasManager.destroy()), this.canvas && this.canvas.destroy(), this.config.view = this.parentApp = null, this.userConfig && (this.userConfig.view = null), super.destroy(), setTimeout(() => {
						Tc.clearRecycled();
					}, 100);
				} catch (e) {
					Rf.error(e);
				}
			}
		};
		e ? t() : setTimeout(t);
	}
};
zf.list = new Hd(), J([cl(hf)], zf.prototype, "__", void 0), J([K()], zf.prototype, "pixelRatio", void 0), J([Ic("normal")], zf.prototype, "mode", void 0), zf = Lf = J([_l()], zf);
var Bf = class extends X {
	get __tag() {
		return "Rect";
	}
};
J([cl(vf)], Bf.prototype, "__", void 0), Bf = J([
	gl(Pf),
	ml(),
	_l()
], Bf);
var { add: Vf, includes: Hf, scroll: Uf } = z, Wf = Bf.prototype, Gf = If.prototype, Kf = class extends If {
	get __tag() {
		return "Box";
	}
	get isBranchLeaf() {
		return !0;
	}
	get __useSelfBox() {
		return this.pathInputed;
	}
	constructor(e) {
		super(e), this.__layout.renderChanged || this.__layout.renderChange();
	}
	__updateStrokeSpread() {
		return 0;
	}
	__updateRectRenderSpread() {
		return 0;
	}
	__updateRenderSpread() {
		return this.__updateRectRenderSpread() || -1;
	}
	__updateRectBoxBounds() {}
	__updateBoxBounds(e) {
		if (this.children.length && !this.__useSelfBox) {
			let e = this.__;
			if (e.__autoSide) {
				e.__hasSurface && this.__extraUpdate(), super.__updateBoxBounds();
				let { boxBounds: t } = this.__layout;
				e.__autoSize || (e.__autoWidth ? (t.width += t.x, t.x = 0, t.height = e.height, t.y = 0) : (t.height += t.y, t.y = 0, t.width = e.width, t.x = 0)), this.__updateNaturalSize();
			} else this.__updateRectBoxBounds();
		} else this.__updateRectBoxBounds();
	}
	__updateStrokeBounds() {}
	__updateRenderBounds() {
		let e, t;
		if (this.children.length) {
			let n = this.__, r = this.__layout, { renderBounds: i, boxBounds: a } = r, { overflow: o } = n, s = r.childrenRenderBounds ||= yr();
			super.__updateRenderBounds(s), (t = o && o.includes("scroll")) && (Vf(s, a), Uf(s, n)), this.__updateRectRenderBounds(), e = !Hf(a, s), e && o === "show" && Vf(i, s);
		} else this.__updateRectRenderBounds();
		F.stintSet(this, "isOverflow", e), this.__checkScroll(t);
	}
	__updateRectRenderBounds() {}
	__checkScroll(e) {}
	__updateRectChange() {}
	__updateChange() {
		super.__updateChange(), this.__updateRectChange();
	}
	__renderRect(e, t) {}
	__renderGroup(e, t) {}
	__render(e, t) {
		this.__.__drawAfterFill ? this.__renderRect(e, t) : (this.__renderRect(e, t), this.children.length && this.__renderGroup(e, t)), this.hasScroller && this.scroller.__render(e, t);
	}
	__drawContent(e, t) {
		this.__renderGroup(e, t), (this.__.__useStroke || this.__.__useEffect) && (e.setWorld(this.__nowWorld), this.__drawRenderPath(e));
	}
};
J([cl(mf)], Kf.prototype, "__", void 0), J([K(100)], Kf.prototype, "width", void 0), J([K(100)], Kf.prototype, "height", void 0), J([Ic(!1)], Kf.prototype, "resizeChildren", void 0), J([Yc("show")], Kf.prototype, "overflow", void 0), J([pl(Wf.__updateStrokeSpread)], Kf.prototype, "__updateStrokeSpread", null), J([pl(Wf.__updateRenderSpread)], Kf.prototype, "__updateRectRenderSpread", null), J([pl(Wf.__updateBoxBounds)], Kf.prototype, "__updateRectBoxBounds", null), J([pl(Wf.__updateStrokeBounds)], Kf.prototype, "__updateStrokeBounds", null), J([pl(Wf.__updateRenderBounds)], Kf.prototype, "__updateRectRenderBounds", null), J([pl(Wf.__updateChange)], Kf.prototype, "__updateRectChange", null), J([pl(Wf.__render)], Kf.prototype, "__renderRect", null), J([pl(Gf.__render)], Kf.prototype, "__renderGroup", null), Kf = J([ml(), _l()], Kf);
var qf = class extends Kf {
	get __tag() {
		return "Frame";
	}
	get isFrame() {
		return !0;
	}
};
J([cl(gf)], qf.prototype, "__", void 0), J([Xc("#FFFFFF")], qf.prototype, "fill", void 0), J([Yc("hide")], qf.prototype, "overflow", void 0), qf = J([_l()], qf);
var { moveTo: Jf, closePath: Yf, ellipse: Xf } = Yo, { tempPoint: Zf, set: Qf, rotate: $f } = R, { abs: ep } = Math, tp = {}, np = class extends X {
	get __tag() {
		return "Ellipse";
	}
	__updatePath() {
		let e = this.__, { width: t, height: n, innerRadius: r, startAngle: i, endAngle: a, closed: o } = e, s = t / 2, c = n / 2, l = e.path = [], u, d, f;
		if ((i || a) && (d = !0), d && (f = ep(a - i) === 360), r) {
			let e = r < 1 || o, n, p = i, m = a;
			d ? e ? (Xf(l, s, c, s * r, c * r, 0, i, a), f && (Qf(Zf, t, c), Qf(tp, s, c), $f(Zf, a, tp, s, c), Jf(l, Zf.x, Zf.y)), p = a, m = i, n = !0) : f || (u = !0) : e ? (Xf(l, s, c, s * r, c * r), Yf(l), Jf(l, t, c), p = 360, n = !0) : m = 360, Xf(l, s, c, s, c, 0, p, m, n);
		} else d ? (f || (o || (u = !0), u || Jf(l, s, c)), Xf(l, s, c, s, c, 0, i, a)) : Xf(l, s, c, s, c);
		u || Yf(l), (V.ellipseToCurve || e.__useArrow || e.cornerRadius) && (e.path = this.getPath(!0));
	}
};
J([cl(yf)], np.prototype, "__", void 0), J([Gc(0)], np.prototype, "innerRadius", void 0), J([Gc(0)], np.prototype, "startAngle", void 0), J([Gc(0)], np.prototype, "endAngle", void 0), np = J([_l()], np);
var { sin: rp, cos: ip, PI: ap } = Math, { moveTo: op, lineTo: sp, closePath: cp, drawPoints: lp } = Yo, up = class extends X {
	get __tag() {
		return "Polygon";
	}
	get isPointsMode() {
		return this.points && !this.pathInputed;
	}
	__updatePath() {
		let e = this.__, t = e.path = [];
		if (e.points) lp(t, e.points, e.curve, e.closed);
		else {
			let { width: n, height: r, sides: i, startAngle: a } = e, o = n / 2, s = r / 2, c, l = 0;
			a ? (l = a * I, op(t, o + o * rp(l), s - s * ip(l))) : op(t, o, 0);
			for (let e = 1; e < i; e++) c = 2 * e * ap / i + l, sp(t, o + o * rp(c), s - s * ip(c));
			cp(t);
		}
	}
};
J([cl(bf)], up.prototype, "__", void 0), J([Gc(3)], up.prototype, "sides", void 0), J([Gc(0)], up.prototype, "startAngle", void 0), J([Gc()], up.prototype, "points", void 0), J([Gc(0)], up.prototype, "curve", void 0), up = J([ml(), _l()], up);
var { sin: dp, cos: fp, PI: pp } = Math, { moveTo: mp, lineTo: hp, closePath: gp } = Yo, _p = class extends X {
	get __tag() {
		return "Star";
	}
	__updatePath() {
		let { width: e, height: t, corners: n, innerRadius: r, startAngle: i } = this.__, a = e / 2, o = t / 2, s = this.__.path = [], c, l = 0;
		i ? (l = i * I, mp(s, a + a * dp(l), o - o * fp(l))) : mp(s, a, 0);
		for (let e = 1; e < 2 * n; e++) c = e * pp / n + l, hp(s, a + (e % 2 == 0 ? a : a * r) * dp(c), o - (e % 2 == 0 ? o : o * r) * fp(c));
		gp(s);
	}
};
J([cl(xf)], _p.prototype, "__", void 0), J([Gc(5)], _p.prototype, "corners", void 0), J([Gc(.382)], _p.prototype, "innerRadius", void 0), J([Gc(0)], _p.prototype, "startAngle", void 0), _p = J([_l()], _p);
var { moveTo: vp, lineTo: yp, drawPoints: bp } = Yo, { rotate: xp, getAngle: Sp, getDistance: Cp, defaultPoint: wp } = R, Tp = class extends X {
	get __tag() {
		return "Line";
	}
	get isPointsMode() {
		return this.points && !this.pathInputed;
	}
	get toPoint() {
		let { width: e, rotation: t } = this.__, n = vr();
		return e && (n.x = e), t && xp(n, t), n;
	}
	set toPoint(e) {
		this.width = Cp(wp, e), this.rotation = Sp(wp, e), this.height &&= 0;
	}
	__updatePath() {
		let e = this.__, t = e.path = [];
		e.points ? bp(t, e.points, e.curve, e.closed) : (vp(t, 0, 0), yp(t, this.width, 0));
	}
};
J([cl(_f)], Tp.prototype, "__", void 0), J([Kc("center")], Tp.prototype, "strokeAlign", void 0), J([K(0)], Tp.prototype, "height", void 0), J([Gc()], Tp.prototype, "points", void 0), J([Gc(0)], Tp.prototype, "curve", void 0), J([Gc(!1)], Tp.prototype, "closed", void 0), Tp = J([_l()], Tp);
var Ep = class extends Bf {
	get __tag() {
		return "Image";
	}
	get ready() {
		let { image: e } = this;
		return e && e.ready;
	}
	get image() {
		let { fill: e } = this.__;
		return Wn(e) && e[0].image;
	}
};
J([cl(Ef)], Ep.prototype, "__", void 0), J([K("")], Ep.prototype, "url", void 0), Ep = J([_l()], Ep);
var Dp = class extends Bf {
	get __tag() {
		return "Canvas";
	}
	get context() {
		return this.canvas.context;
	}
	get ready() {
		return !this.url;
	}
	constructor(e) {
		super(e), this.canvas = Ii.canvas(this.__), e && e.url && this.drawImage(e.url);
	}
	drawImage(e) {
		new kc({ url: e }).load((e) => {
			this.context.drawImage(e.view, 0, 0), this.url = void 0, this.paint(), this.emitEvent(new uu(uu.LOADED, { image: e }));
		});
	}
	draw(e, t, n, r) {
		let i = new Gr(e.worldTransform).invert(), a = new Gr();
		t && a.translate(t.x, t.y), n && (Un(n) ? a.scale(n) : a.scale(n.x, n.y)), r && a.rotate(r), i.multiplyParent(a), e.__render(this.canvas, { matrix: i.withScale() }), this.paint();
	}
	paint() {
		this.forceRender();
	}
	__drawContent(e, t) {
		let { width: n, height: r } = this.__, { view: i } = this.canvas;
		e.drawImage(i, 0, 0, i.width, i.height, 0, 0, n, r);
	}
	__updateSize() {
		let { canvas: e } = this;
		if (e) {
			let { smooth: t, safeResize: n } = this.__;
			e.resize(this.__, n), e.smooth !== t && (e.smooth = t);
		}
	}
	destroy() {
		this.canvas &&= (this.canvas.destroy(), null), super.destroy();
	}
};
J([cl(Df)], Dp.prototype, "__", void 0), J([Gd(100)], Dp.prototype, "width", void 0), J([Gd(100)], Dp.prototype, "height", void 0), J([Gd(1)], Dp.prototype, "pixelRatio", void 0), J([Gd(!0)], Dp.prototype, "smooth", void 0), J([Ic(!1)], Dp.prototype, "safeResize", void 0), J([Gd()], Dp.prototype, "contextSettings", void 0), Dp = J([_l()], Dp);
var { copyAndSpread: Op, includes: kp, setList: Ap } = z, { stintSet: jp } = F, Z = class extends X {
	get __tag() {
		return "Text";
	}
	get textDrawData() {
		return this.updateLayout(), this.__.__textDrawData;
	}
	__updateTextDrawData() {
		let e = this.__, { lineHeight: t, letterSpacing: n, fontFamily: r, fontSize: i, fontWeight: a, italic: o, textCase: s, textOverflow: c, padding: l, width: u, height: d } = e;
		e.__lineHeight = Yd.number(t, i), e.__letterSpacing = Yd.number(n, i), e.__baseLine = e.__lineHeight - (e.__lineHeight - .7 * i) / 2, e.__font = `${o ? "italic " : ""}${s === "small-caps" ? "small-caps " : ""}${a === "normal" ? "" : a + " "}${i || 12}px ${r || "caption"}`, jp(e, "__padding", l && mr.fourNumber(l)), jp(e, "__clipText", c !== "show" && !e.__autoSize), jp(e, "__isCharMode", u || d || e.__letterSpacing || e.motionText || s !== "none"), e.__textDrawData = qd.getDrawData((e.__isPlacehold = e.placeholder && e.text === "") ? e.placeholder : e.text, this.__);
	}
	__updateBoxBounds() {
		let e = this.__, t = this.__layout, { fontSize: n, italic: r, padding: i, __autoWidth: a, __autoHeight: o } = e;
		this.__updateTextDrawData();
		let { bounds: s } = e.__textDrawData, c = t.boxBounds;
		if (t.contentBounds = s, e.__lineHeight < n && (t.renderChanged = !0), a || o) {
			if (c.x = a ? s.x : 0, c.y = o ? s.y : 0, c.width = a ? s.width : e.width, c.height = o ? s.height : e.height, i) {
				let [t, n, r, i] = e.__padding;
				a && (c.x -= i, c.width += n + i), o && (c.y -= t, c.height += r + t);
			}
			this.__updateNaturalSize();
		} else super.__updateBoxBounds();
		r && (c.width += .16 * n), F.stintSet(this, "isOverflow", !kp(c, s) && !e.motionText), this.isOverflow ? (Ap(e.__textBoxBounds = {}, [c, s]), t.renderChanged = !0) : e.__textBoxBounds = c;
	}
	__updateRenderSpread() {
		let e = super.__updateRenderSpread();
		e ||= +!!this.isOverflow;
		let { __lineHeight: t, fontSize: n } = this.__;
		return t < n && (e = rr.max(e, (n - t) / 2)), e;
	}
	__updateRenderBounds() {
		let { renderBounds: e, renderSpread: t } = this.__layout;
		Op(e, this.__.__textBoxBounds, t), this.__box && (this.__box.__layout.renderBounds = e);
	}
	__updateChange() {
		super.__updateChange();
		let e = this.__box;
		e && (e.__onUpdateSize(), e.__updateChange());
	}
	__drawRenderPath(e) {
		e.font = this.__.__font;
	}
	__draw(e, t, n) {
		let r = this.__box;
		r && (r.__nowWorld = this.__nowWorld, r.__draw(e, t, n)), this.textEditing && !t.exporting || super.__draw(e, t, n);
	}
	__drawShape(e, t) {
		t.shape && this.__box && this.__box.__drawShape(e, t), super.__drawShape(e, t);
	}
	destroy() {
		this.boxStyle &&= null, super.destroy();
	}
};
J([cl(Tf)], Z.prototype, "__", void 0), J([K(0)], Z.prototype, "width", void 0), J([K(0)], Z.prototype, "height", void 0), J([Xc()], Z.prototype, "boxStyle", void 0), J([Ic(!1)], Z.prototype, "resizeFontSize", void 0), J([Xc("#000000")], Z.prototype, "fill", void 0), J([Kc("outside")], Z.prototype, "strokeAlign", void 0), J([ol("all")], Z.prototype, "hitFill", void 0), J([K("")], Z.prototype, "text", void 0), J([K("")], Z.prototype, "placeholder", void 0), J([K("caption")], Z.prototype, "fontFamily", void 0), J([K(12)], Z.prototype, "fontSize", void 0), J([K("normal")], Z.prototype, "fontWeight", void 0), J([K(!1)], Z.prototype, "italic", void 0), J([K("none")], Z.prototype, "textCase", void 0), J([K("none")], Z.prototype, "textDecoration", void 0), J([K(0)], Z.prototype, "letterSpacing", void 0), J([K({
	type: "percent",
	value: 1.5
})], Z.prototype, "lineHeight", void 0), J([K(0)], Z.prototype, "paraIndent", void 0), J([K(0)], Z.prototype, "paraSpacing", void 0), J([K("x")], Z.prototype, "writingMode", void 0), J([K("left")], Z.prototype, "textAlign", void 0), J([K("top")], Z.prototype, "verticalAlign", void 0), J([K(!0)], Z.prototype, "autoSizeAlign", void 0), J([K("normal")], Z.prototype, "textWrap", void 0), J([K("show")], Z.prototype, "textOverflow", void 0), J([Xc(!1)], Z.prototype, "textEditing", void 0), Z = J([_l()], Z);
var Mp = class extends X {
	get __tag() {
		return "Path";
	}
};
J([cl(Sf)], Mp.prototype, "__", void 0), J([Kc("center")], Mp.prototype, "strokeAlign", void 0), Mp = J([_l()], Mp);
var Np = class extends If {
	get __tag() {
		return "Pen";
	}
	setStyle(e) {
		let t = this.pathElement = new Mp(e);
		return this.pathStyle = e, this.__path = t.path ||= [], this.add(t), this;
	}
	paint() {
		let { pathElement: e } = this;
		e.__layout.boxChanged || e.forceUpdate("path");
	}
};
J([cl(Cf)], Np.prototype, "__", void 0), J([(e, t) => {
	Ac(e, t, { get() {
		return this.__path;
	} });
}], Np.prototype, "path", void 0), Np = J([gl(fs, [
	"set",
	"path",
	"paint"
]), _l()], Np);
//#endregion
//#region node_modules/@leafer-ui/core/lib/core.esm.min.js
function Pp(e, t, n, r) {
	var i, a = arguments.length, o = a < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") o = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (i = e[s]) && (o = (a < 3 ? i(o) : a > 3 ? i(t, n, o) : i(t, n)) || o);
	return a > 3 && o && Object.defineProperty(t, n, o), o;
}
var Fp = class extends zf {
	get __tag() {
		return "App";
	}
	get isApp() {
		return !0;
	}
	constructor(e, t) {
		super(e, t);
	}
	init(e, t) {
		if (super.init(e, t), e) {
			let { ground: t, tree: n, sky: r, editor: i } = e;
			t && (this.ground = this.addLeafer(t)), (n || i) && (this.tree = this.addLeafer(n || { type: e.type || "design" })), (r || i) && (this.sky = this.addLeafer(r)), i && Ii.editor(i, this);
		}
	}
	__setApp() {
		let { canvas: e } = this, { realCanvas: t, view: n } = this.config;
		t || n === this.canvas.view || !e.parentView ? this.realCanvas = !0 : e.unrealCanvas(), this.leafer = this, this.watcher.disable(), this.layouter.disable();
	}
	__updateLocalBounds() {
		this.forEach((e) => e.updateLayout()), super.__updateLocalBounds();
	}
	start() {
		super.start(), this.forEach((e) => e.start());
	}
	stop() {
		this.forEach((e) => e.stop()), super.stop();
	}
	unlockLayout() {
		super.unlockLayout(), this.forEach((e) => e.unlockLayout());
	}
	lockLayout() {
		super.lockLayout(), this.forEach((e) => e.lockLayout());
	}
	forceRender(e, t) {
		this.forEach((n) => n.forceRender(e, t));
	}
	addLeafer(e) {
		let t = new zf(e);
		return this.add(t), t;
	}
	add(e, t) {
		if (!e.view) {
			if (this.realCanvas && !this.canvas.bounds) return void setTimeout(() => this.add(e, t), 10);
			e.init(this.__getChildConfig(e.userConfig), this);
		}
		super.add(e, t), P(t) || (e.canvas.childIndex = t), this.__listenChildEvents(e);
	}
	forEach(e) {
		this.children.forEach(e);
	}
	__onCreated() {
		this.created = this.children.every((e) => e.created);
	}
	__onReady() {
		this.children.every((e) => e.ready) && super.__onReady();
	}
	__onViewReady() {
		this.children.every((e) => e.viewReady) && super.__onViewReady();
	}
	__onChildRenderEnd(e) {
		this.renderer.addBlock(e.renderBounds), this.viewReady && this.renderer.update();
	}
	__render(e, t) {
		e.context && this.forEach((n) => t.matrix ? n.__render(e, t) : e.copyWorld(n.canvas, t.bounds, void 0, void 0, !0));
	}
	__onResize(e) {
		this.forEach((t) => t.resize(e)), super.__onResize(e);
	}
	updateLayout() {
		this.forEach((e) => e.updateLayout());
	}
	__getChildConfig(e) {
		let t = Object.assign({}, this.config);
		return t.hittable = t.realCanvas = void 0, e && F.assign(t, e), this.autoLayout && F.copyAttrs(t, this, ea), t.view = this.realCanvas ? void 0 : this.view, t.fill = void 0, t;
	}
	__listenChildEvents(e) {
		e.once([
			[
				yu.END,
				this.__onReady,
				this
			],
			[
				bu.START,
				this.__onCreated,
				this
			],
			[
				bu.END,
				this.__onViewReady,
				this
			]
		]), this.realCanvas && this.__eventIds.push(e.on_(bu.END, this.__onChildRenderEnd, this));
	}
};
Fp = Pp([_l()], Fp);
var Ip = {}, Lp = {
	isHoldSpaceKey: () => Lp.isHold("Space"),
	isHold: (e) => Ip[e],
	isHoldKeys: (e, t) => t ? e(t) : void 0,
	setDownCode(e) {
		Ip[e] || (Ip[e] = !0);
	},
	setUpCode(e) {
		Ip[e] = !1;
	}
}, Rp = {
	LEFT: 1,
	RIGHT: 2,
	MIDDLE: 4,
	defaultLeft(e) {
		e.buttons ||= 1;
	},
	left: (e) => e.buttons === 1,
	right: (e) => e.buttons === 2,
	middle: (e) => e.buttons === 4
}, zp = class extends au {
	get spaceKey() {
		return Lp.isHoldSpaceKey();
	}
	get left() {
		return Rp.left(this);
	}
	get right() {
		return Rp.right(this);
	}
	get middle() {
		return Rp.middle(this);
	}
	constructor(e) {
		super(e.type), this.bubbles = !0, Object.assign(this, e);
	}
	isHoldKeys(e) {
		return Lp.isHoldKeys(e, this);
	}
	getBoxPoint(e) {
		return (e || this.current).getBoxPoint(this);
	}
	getInnerPoint(e) {
		return (e || this.current).getInnerPoint(this);
	}
	getLocalPoint(e) {
		return (e || this.current).getLocalPoint(this);
	}
	getPagePoint() {
		return this.current.getPagePoint(this);
	}
	getInner(e) {
		return this.getInnerPoint(e);
	}
	getLocal(e) {
		return this.getLocalPoint(e);
	}
	getPage() {
		return this.getPagePoint();
	}
	static changeName(e, t) {
		Vi.changeName(e, t);
	}
}, { min: Bp, max: Vp, abs: Hp } = Math, { float: Up, sign: Wp } = mr, { minX: Gp, maxX: Kp, minY: qp, maxY: Jp } = z, Yp = new yi(), Xp = new yi(), Zp = {
	limitMove(e, t) {
		let { dragBounds: n, dragBoundsType: r } = e;
		n && Qp.getValidMove(e.__localBoxBounds, Qp.getDragBounds(e), r, t, !0), Qp.axisMove(e, t);
	},
	limitScaleOf(e, t, n, r) {
		let { dragBounds: i, dragBoundsType: a } = e;
		i && Qp.getValidScaleOf(e.__localBoxBounds, Qp.getDragBounds(e), a, e.getLocalPointByInner(e.getInnerPointByBox(t)), n, r, !0);
	},
	axisMove(e, t) {
		let { draggable: n } = e;
		n === "x" && (t.y = 0), n === "y" && (t.x = 0);
	},
	getDragBounds(e) {
		let { dragBounds: t } = e;
		return t === "parent" ? e.parent.boxBounds : t;
	},
	isInnerMode: (e, t, n, r) => n === "inner" || n === "auto" && Up(e[r]) > Up(t[r]),
	getValidMove(e, t, n, r, i) {
		let a = e.x + r.x, o = e.y + r.y, s = a + e.width, c = o + e.height, l = t.x + t.width, u = t.y + t.height;
		return i || (r = Object.assign({}, r)), Qp.isInnerMode(e, t, n, "width") ? a > t.x ? r.x += t.x - a : s < l && (r.x += l - s) : a < t.x ? r.x += t.x - a : s > l && (r.x += l - s), Qp.isInnerMode(e, t, n, "height") ? o > t.y ? r.y += t.y - o : c < u && (r.y += u - c) : o < t.y ? r.y += t.y - o : c > u && (r.y += u - c), r.x = Up(r.x), r.y = Up(r.y), r;
	},
	getValidScaleOf(e, t, n, r, i, a, o) {
		o || (i = Object.assign({}, i)), Xp.set(t), Yp.set(e).scaleOf(r, i.x, i.y);
		let s = Up((r.x - e.x) / e.width), c = Up(1 - s), l = Up((r.y - e.y) / e.height), u = Up(1 - l), d, f, p, m, h = 1, g = 1;
		return Qp.isInnerMode(e, t, n, "width") ? (i.x < 0 && Yp.scaleOf(r, h = 1 / i.x, 1), p = Up(Yp.minX - Xp.minX), m = Up(Xp.maxX - Yp.maxX), d = s && p > 0 ? 1 + p / (s * Yp.width) : 1, f = c && m > 0 ? 1 + m / (c * Yp.width) : 1, h *= Vp(d, f)) : (i.x < 0 && ((Up(Gp(e) - Gp(t), 2) <= 0 || Up(Kp(t) - Kp(e), 2) <= 0) && (Yp.scaleOf(r, h = 1 / i.x, 1), Yp.width > 1 && (h *= 1 / Yp.width, Yp.width = 1)), Yp.unsign()), p = Up(Xp.minX - Yp.minX), m = Up(Yp.maxX - Xp.maxX), d = s && p > 0 ? 1 - p / (s * Yp.width) : 1, f = c && m > 0 ? 1 - m / (c * Yp.width) : 1, h *= Bp(d, f)), Qp.isInnerMode(e, t, n, "height") ? (i.y < 0 && Yp.scaleOf(r, 1, g = 1 / i.y), p = Up(Yp.minY - Xp.minY), m = Up(Xp.maxY - Yp.maxY), d = l && p > 0 ? 1 + p / (l * Yp.height) : 1, f = u && m > 0 ? 1 + m / (u * Yp.height) : 1, g *= Vp(d, f), a && (d = Vp(Hp(h), Hp(g)), h = Wp(h) * d, g = Wp(g) * d)) : (i.y < 0 && ((Up(qp(e) - qp(t), 2) <= 0 || Up(Jp(t) - Jp(e), 2) <= 0) && (Yp.scaleOf(r, 1, g = 1 / i.y), Yp.height > 1 && (g *= 1 / Yp.height, Yp.height = 1)), Yp.unsign()), p = Up(Xp.minY - Yp.minY), m = Up(Yp.maxY - Xp.maxY), d = l && p > 0 ? 1 - p / (l * Yp.height) : 1, f = u && m > 0 ? 1 - m / (u * Yp.height) : 1, g *= Bp(d, f)), i.x *= Hn(h) ? h : 1, i.y *= Hn(g) ? g : 1, i;
	}
}, Qp = Zp, Q = class extends zp {};
Q.POINTER = "pointer", Q.BEFORE_DOWN = "pointer.before_down", Q.BEFORE_MOVE = "pointer.before_move", Q.BEFORE_UP = "pointer.before_up", Q.DOWN = "pointer.down", Q.MOVE = "pointer.move", Q.UP = "pointer.up", Q.OVER = "pointer.over", Q.OUT = "pointer.out", Q.ENTER = "pointer.enter", Q.LEAVE = "pointer.leave", Q.TAP = "tap", Q.DOUBLE_TAP = "double_tap", Q.CLICK = "click", Q.DOUBLE_CLICK = "double_click", Q.LONG_PRESS = "long_press", Q.LONG_TAP = "long_tap", Q.MENU = "pointer.menu", Q.MENU_TAP = "pointer.menu_tap", Q = Pp([vl()], Q);
var $p = {}, $ = class extends Q {
	static setList(e) {
		this.list = e instanceof Hd ? e : new Hd(e);
	}
	static setData(e) {
		this.data = e;
	}
	static getValidMove(e, t, n, r = !0) {
		let i = e.getLocalPoint(n, null, !0);
		return R.move(i, t.x - e.x, t.y - e.y), r && this.limitMove(e, i), Zp.axisMove(e, i), i;
	}
	static limitMove(e, t) {
		Zp.limitMove(e, t);
	}
	getPageMove(e) {
		return this.assignMove(e), this.current.getPagePoint($p, null, !0);
	}
	getInnerMove(e, t) {
		return e ||= this.current, this.assignMove(t), e.getInnerPoint($p, null, !0);
	}
	getLocalMove(e, t) {
		return e ||= this.current, this.assignMove(t), e.getLocalPoint($p, null, !0);
	}
	getPageTotal() {
		return this.getPageMove(!0);
	}
	getInnerTotal(e) {
		return this.getInnerMove(e, !0);
	}
	getLocalTotal(e) {
		return this.getLocalMove(e, !0);
	}
	getPageBounds() {
		let e = this.getPageTotal(), t = this.getPagePoint(), n = {};
		return z.set(n, t.x - e.x, t.y - e.y, e.x, e.y), z.unsign(n), n;
	}
	assignMove(e) {
		$p.x = e ? this.totalX : this.moveX, $p.y = e ? this.totalY : this.moveY;
	}
};
$.BEFORE_DRAG = "drag.before_drag", $.START = "drag.start", $.DRAG = "drag", $.END = "drag.end", $.OVER = "drag.over", $.OUT = "drag.out", $.ENTER = "drag.enter", $.LEAVE = "drag.leave", $.ANIMATE = "drag.animate", $ = Pp([vl()], $);
var em = class extends Q {
	static setList(e) {
		$.setList(e);
	}
	static setData(e) {
		$.setData(e);
	}
};
em.DROP = "drop", em = Pp([vl()], em);
var tm = class extends $ {};
tm.BEFORE_MOVE = "move.before_move", tm.START = "move.start", tm.MOVE = "move", tm.DRAG_ANIMATE = "move.drag_animate", tm.END = "move.end", tm.PULL_DOWN = "move.pull_down", tm.REACH_BOTTOM = "move.reach_bottom", tm = Pp([vl()], tm);
var nm = class extends zp {};
nm = Pp([vl()], nm);
var rm = class extends Q {};
rm.BEFORE_ROTATE = "rotate.before_rotate", rm.START = "rotate.start", rm.ROTATE = "rotate", rm.END = "rotate.end", rm = Pp([vl()], rm);
var im = class extends $ {};
im.SWIPE = "swipe", im.LEFT = "swipe.left", im.RIGHT = "swipe.right", im.UP = "swipe.up", im.DOWN = "swipe.down", im = Pp([vl()], im);
var am = class extends Q {};
am.BEFORE_ZOOM = "zoom.before_zoom", am.START = "zoom.start", am.ZOOM = "zoom", am.END = "zoom.end", am = Pp([vl()], am);
var om = class extends zp {};
om.BEFORE_DOWN = "key.before_down", om.BEFORE_UP = "key.before_up", om.DOWN = "key.down", om.HOLD = "key.hold", om.UP = "key.up", om = Pp([vl()], om);
var sm = {
	getDragEventData: (e, t, n) => Object.assign(Object.assign({}, n), {
		x: n.x,
		y: n.y,
		moveX: n.x - t.x,
		moveY: n.y - t.y,
		totalX: n.x - e.x,
		totalY: n.y - e.y
	}),
	getDropEventData: (e, t, n) => Object.assign(Object.assign({}, e), {
		list: t,
		data: n
	}),
	getSwipeDirection: (e) => e < -45 && e > -135 ? im.UP : e > 45 && e < 135 ? im.DOWN : e <= 45 && e >= -45 ? im.RIGHT : im.LEFT,
	getSwipeEventData: (e, t, n) => Object.assign(Object.assign({}, n), {
		moveX: t.moveX,
		moveY: t.moveY,
		totalX: n.x - e.x,
		totalY: n.y - e.y,
		type: cm.getSwipeDirection(R.getAngle(e, n))
	}),
	getBase(e) {
		let t = e.button === 1 ? 4 : e.button;
		return {
			altKey: e.altKey,
			ctrlKey: e.ctrlKey,
			shiftKey: e.shiftKey,
			metaKey: e.metaKey,
			time: Date.now(),
			buttons: P(e.buttons) ? 1 : e.buttons === 0 ? t : e.buttons,
			origin: e
		};
	},
	pathHasEventType(e, t) {
		let { list: n } = e;
		for (let e = 0, r = n.length; e < r; e++) if (n[e].hasEvent(t)) return !0;
		return !1;
	},
	filterPathByEventType(e, t) {
		let n = new Hd(), { list: r } = e;
		for (let e = 0, i = r.length; e < i; e++) r[e].hasEvent(t) && n.add(r[e]);
		return n;
	},
	pathCanDrag: (e) => e && e.list.some((e) => Al.draggable(e) || !e.isLeafer && e.hasEvent($.DRAG)),
	pathHasOutside: (e) => e && e.list.some((e) => e.isOutside)
}, cm = sm, lm = new Hd(), { getDragEventData: um, getDropEventData: dm, getSwipeEventData: fm } = sm, pm = class {
	constructor(e) {
		this.dragDataList = [], this.interaction = e;
	}
	setDragData(e) {
		this.animateWait && this.dragEndReal(), this.downData = this.interaction.downData, this.dragData = um(e, e, e), this.canAnimate = this.canDragOut = !0;
	}
	getList(e, t) {
		let { proxy: n } = this.interaction.selector, r = n && n.list.length, i = $.list || this.draggableList || lm;
		return this.dragging && (r ? e ? lm : new Hd(t ? [...n.list, ...n.dragHoverExclude] : n.list) : i);
	}
	checkDrag(e, t) {
		let { interaction: n } = this;
		if (this.moving && e.buttons < 1) return this.canAnimate = !1, void n.pointerCancel();
		!this.moving && t && (this.moving = n.canMove(this.downData) || n.isHoldRightKey || n.isMobileDragEmpty) && (this.dragData.moveType = "drag", n.emit(tm.START, this.dragData)), this.moving || this.dragStart(e, t), this.drag(e);
	}
	dragStart(e, t) {
		this.dragging || (this.dragging = t && Rp.left(e), this.dragging && (this.interaction.emit($.START, this.dragData), this.getDraggableList(this.dragData.path), this.setDragStartPoints(this.realDraggableList = this.getList(!0))));
	}
	setDragStartPoints(e) {
		this.dragStartPoints = {}, e.forEach((e) => this.dragStartPoints[e.innerId] = {
			x: e.x,
			y: e.y
		});
	}
	getDraggableList(e) {
		let t;
		for (let n = 0, r = e.length; n < r; n++) if (t = e.list[n], Al.draggable(t)) {
			this.draggableList = new Hd(t);
			break;
		}
	}
	drag(e) {
		let { interaction: t, dragData: n, downData: r } = this, { path: i, throughPath: a } = r;
		this.dragData = um(r, n, e), a && (this.dragData.throughPath = a), this.dragData.path = i, this.dragDataList.push(this.dragData), this.moving ? (e.moving = !0, this.dragData.moveType = "drag", t.emit(tm.BEFORE_MOVE, this.dragData), t.emit(tm.MOVE, this.dragData)) : this.dragging && (e.dragging = !0, this.dragReal(), t.emit($.BEFORE_DRAG, this.dragData), t.emit($.DRAG, this.dragData));
	}
	dragReal(e) {
		let { interaction: t } = this, { running: n } = t, r = this.realDraggableList;
		if (r.length && n) {
			let { totalX: n, totalY: i } = this.dragData, { dragLimitAnimate: a } = t.p, o = !a || !!e;
			r.forEach((t) => {
				if (t.draggable) {
					let r = Vn(t.draggable), s = $.getValidMove(t, this.dragStartPoints[t.innerId], {
						x: n,
						y: i
					}, o || r);
					a && !r && e ? Al.animateMove(t, s, Un(a) ? a : .3, () => t.emit($.ANIMATE)) : t.move(s);
				}
			});
		}
	}
	dragOverOrOut(e) {
		let { interaction: t } = this, { dragOverPath: n } = this, { path: r } = e;
		this.dragOverPath = r, n ? r.indexAt(0) !== n.indexAt(0) && (t.emit($.OUT, e, n), t.emit($.OVER, e, r)) : t.emit($.OVER, e, r);
	}
	dragEnterOrLeave(e) {
		let { interaction: t } = this, { dragEnterPath: n } = this, { path: r } = e;
		t.emit($.LEAVE, e, n, r), t.emit($.ENTER, e, r, n), this.dragEnterPath = r;
	}
	dragEnd(e) {
		(this.dragging || this.moving) && (setTimeout(() => this.interaction.pointerMove(e)), this.checkDragEndAnimate(e) || this.dragEndReal(e));
	}
	dragEndReal(e) {
		let { interaction: t, downData: n, dragData: r } = this;
		e ||= r;
		let { path: i, throughPath: a } = n, o = um(n, e, e);
		if (a && (o.throughPath = a), o.path = i, this.moving && (this.moving = !1, o.moveType = "drag", t.emit(tm.END, o)), this.dragging) {
			let i = this.getList();
			this.dragging = !1, t.p.dragLimitAnimate && this.dragReal(!0), t.emit($.END, o), this.swipe(e, n, r, o), this.drop(e, i, this.dragEnterPath);
		}
		this.autoMoveCancel(), this.dragReset(), this.animate(null, "off");
	}
	swipe(e, t, n, r) {
		let { interaction: i } = this;
		if (R.getDistance(t, e) > i.config.pointer.swipeDistance) {
			let e = fm(t, n, r);
			this.interaction.emit(e.type, e);
		}
	}
	drop(e, t, n) {
		let r = dm(e, t, $.data);
		r.path = n, this.interaction.emit(em.DROP, r), this.interaction.emit($.LEAVE, e, n);
	}
	dragReset() {
		$.list = $.data = this.draggableList = this.dragData = this.downData = this.dragOverPath = this.dragEnterPath = null, this.dragDataList = [];
	}
	checkDragEndAnimate(e, t) {
		return !1;
	}
	animate(e, t) {}
	stopAnimate() {}
	checkDragOut(e) {}
	autoMoveOnDragOut(e) {}
	autoMoveCancel() {}
	destroy() {
		this.dragReset();
	}
}, mm = Oi.get("emit"), hm = [
	"move",
	"zoom",
	"rotate",
	"key"
];
function gm(e, t, n, r, i) {
	if (hm.some((e) => t.startsWith(e)) && e.__.hitChildren && !vm(e, i)) {
		let a;
		for (let o = 0, s = e.children.length; o < s; o++) a = e.children[o], !n.path.has(a) && a.__.hittable && _m(a, t, n, r, i);
	}
}
function _m(e, t, n, r, i) {
	if (e.destroyed) return !1;
	if (e.__.hitSelf && !vm(e, i) && (nf.updateEventStyle && !r && nf.updateEventStyle(e, t), e.hasEvent(t, r))) {
		n.phase = r ? 1 : e === n.target ? 2 : 3;
		let i = Vi.get(t, n);
		if (e.emitEvent(i, r), i.isStop) return !0;
	}
	return !1;
}
function vm(e, t) {
	return t && t.has(e);
}
var ym = {
	wheel: {
		zoomSpeed: .5,
		moveSpeed: .5,
		rotateSpeed: .5,
		delta: {
			x: 20,
			y: 8
		}
	},
	pointer: {
		type: "pointer",
		snap: !0,
		hitRadius: 5,
		tapTime: 120,
		longPressTime: 800,
		transformTime: 500,
		hover: !0,
		dragHover: !0,
		dragDistance: 2,
		swipeDistance: 20
	},
	touch: { preventDefault: "auto" },
	multiTouch: {},
	move: { autoDistance: 2 },
	zoom: {},
	cursor: !0,
	keyEvent: !0
}, { pathHasEventType: bm, pathCanDrag: xm, pathHasOutside: Sm } = sm, Cm = class {
	get dragging() {
		return this.dragger.dragging;
	}
	get transforming() {
		return this.transformer.transforming;
	}
	get moveMode() {
		return !0 === this.m.drag || this.isHoldSpaceKey || this.isHoldMiddleKey || this.isHoldRightKey && this.dragger.moving || this.isDragEmpty;
	}
	get canHover() {
		return this.p.hover && !this.config.mobile;
	}
	get isDragEmpty() {
		return this.m.dragEmpty && this.isRootPath(this.hoverData) && (!this.downData || this.isRootPath(this.downData));
	}
	get isMobileDragEmpty() {
		return this.m.dragEmpty && !this.canHover && this.downData && this.isTreePath(this.downData);
	}
	get isHoldMiddleKey() {
		return this.m.holdMiddleKey && this.downData && Rp.middle(this.downData);
	}
	get isHoldRightKey() {
		return this.m.holdRightKey && this.downData && Rp.right(this.downData);
	}
	get isHoldSpaceKey() {
		return this.m.holdSpaceKey && Lp.isHoldSpaceKey();
	}
	get m() {
		return this.config.move;
	}
	get p() {
		return this.config.pointer;
	}
	get hitRadius() {
		return this.p.hitRadius;
	}
	constructor(e, t, n, r) {
		this.config = F.clone(ym), this.tapCount = 0, this.downKeyMap = {}, this.target = e, this.canvas = t, this.selector = n, this.defaultPath = new Hd(e), this.createTransformer(), this.dragger = new pm(this), r && (this.config = F.default(r, this.config)), this.__listenEvents();
	}
	start() {
		this.running = !0;
	}
	stop() {
		this.running = !1;
	}
	receive(e) {}
	pointerDown(e, t) {
		e ||= this.hoverData, e && (Rp.defaultLeft(e), this.updateDownData(e), this.checkPath(e, t), this.downTime = Date.now(), this.emit(Q.BEFORE_DOWN, e), e.path.needUpdate && this.updateDownData(e), this.emit(Q.DOWN, e), Rp.left(e) && (this.tapWait(), this.longPressWait(e)), this.waitRightTap = Rp.right(e), this.dragger.setDragData(e), this.isHoldRightKey || this.updateCursor(e));
	}
	pointerMove(e) {
		if (e ||= this.hoverData, !e) return;
		let { downData: t } = this;
		t && Rp.defaultLeft(e), (this.canvas.bounds.hitPoint(e) || t) && (this.pointerMoveReal(e), t && this.dragger.checkDragOut(e));
	}
	pointerMoveReal(e) {
		if (this.emit(Q.BEFORE_MOVE, e, this.defaultPath), this.downData) {
			let t = R.getDistance(this.downData, e) > this.p.dragDistance;
			t && (this.pointerWaitCancel(), this.waitRightTap = !1), this.dragger.checkDrag(e, t);
		}
		this.dragger.moving || (this.updateHoverData(e), this.checkPath(e), this.emit(Q.MOVE, e), this.pointerHover(e), this.dragging && (this.dragger.dragOverOrOut(e), this.dragger.dragEnterOrLeave(e))), this.updateCursor(this.downData || e);
	}
	pointerUp(e) {
		let { downData: t } = this;
		if (e ||= t, !t) return;
		Rp.defaultLeft(e), e.multiTouch = t.multiTouch, this.findPath(e);
		let n = Object.assign(Object.assign({}, e), { path: e.path.clone() });
		e.path.addList(t.path.list), this.checkPath(e), this.downData = null, this.emit(Q.BEFORE_UP, e), this.emit(Q.UP, e), this.touchLeave(e), e.isCancel || (this.tap(e), this.menuTap(e)), this.dragger.dragEnd(e), this.updateCursor(n);
	}
	pointerCancel() {
		let e = Object.assign({}, this.dragger.dragData);
		e.isCancel = !0, this.pointerUp(e);
	}
	menu(e) {
		this.findPath(e), this.emit(Q.MENU, e), this.waitMenuTap = !0, !this.downData && this.waitRightTap && this.menuTap(e);
	}
	menuTap(e) {
		this.waitRightTap && this.waitMenuTap && (this.emit(Q.MENU_TAP, e), this.waitRightTap = this.waitMenuTap = !1);
	}
	createTransformer() {}
	move(e) {}
	zoom(e) {}
	rotate(e) {}
	transformEnd() {}
	wheel(e) {}
	multiTouch(e, t) {}
	keyDown(e) {
		if (!this.config.keyEvent) return;
		this.emit(om.BEFORE_DOWN, e, this.defaultPath);
		let { code: t } = e;
		this.downKeyMap[t] || (this.downKeyMap[t] = !0, Lp.setDownCode(t), this.emit(om.HOLD, e, this.defaultPath), this.moveMode && (this.cancelHover(), this.updateCursor())), this.emit(om.DOWN, e, this.defaultPath);
	}
	keyUp(e) {
		if (!this.config.keyEvent) return;
		this.emit(om.BEFORE_UP, e, this.defaultPath);
		let { code: t } = e;
		this.downKeyMap[t] = !1, Lp.setUpCode(t), this.emit(om.UP, e, this.defaultPath), this.cursor === "grab" && this.updateCursor();
	}
	pointerHover(e) {
		!this.canHover || this.dragging && !this.p.dragHover || (e.path ||= new Hd(), this.pointerOverOrOut(e), this.pointerEnterOrLeave(e));
	}
	pointerOverOrOut(e) {
		let { path: t } = e, { overPath: n } = this;
		this.overPath = t, n ? t.indexAt(0) !== n.indexAt(0) && (this.emit(Q.OUT, e, n), this.emit(Q.OVER, e, t)) : this.emit(Q.OVER, e, t);
	}
	pointerEnterOrLeave(e) {
		let { path: t } = e;
		this.downData && !this.moveMode && (t = t.clone(), this.downData.path.forEach((e) => t.add(e)));
		let { enterPath: n } = this;
		this.enterPath = t, this.emit(Q.LEAVE, e, n, t), this.emit(Q.ENTER, e, t, n);
	}
	touchLeave(e) {
		e.pointerType === "touch" && this.enterPath && (this.emit(Q.LEAVE, e), this.dragger.dragging && this.emit(em.LEAVE, e));
	}
	tap(e) {
		let { pointer: t } = this.config, n = this.longTap(e);
		if (!t.tapMore && n || !this.waitTap) return;
		t.tapMore && this.emitTap(e);
		let r = Date.now() - this.downTime, i = [Q.DOUBLE_TAP, Q.DOUBLE_CLICK].some((t) => bm(e.path, t));
		r < t.tapTime + 50 && i ? (this.tapCount++, this.tapCount === 2 ? (this.tapWaitCancel(), this.emitDoubleTap(e)) : (clearTimeout(this.tapTimer), this.tapTimer = setTimeout(() => {
			t.tapMore || (this.tapWaitCancel(), this.emitTap(e));
		}, t.tapTime))) : t.tapMore || (this.tapWaitCancel(), this.emitTap(e));
	}
	findPath(e, t) {
		let { hitRadius: n, through: r } = this.p, { bottomList: i, target: a } = this;
		V.backgrounder || e.origin || a && a.updateLayout();
		let o = this.selector.getByPoint(e, n, Object.assign({
			bottomList: i,
			name: e.type
		}, t || { through: r }));
		return o.throughPath && (e.throughPath = o.throughPath), e.path = o.path, o.path;
	}
	isRootPath(e) {
		return e && e.path.list[0].isLeafer;
	}
	isTreePath(e) {
		let t = this.target.app;
		return !(!t || !t.isApp) && t.editor && !e.path.has(t.editor) && e.path.has(t.tree) && !e.target.syncEventer;
	}
	checkPath(e, t) {
		(t || this.moveMode && !Sm(e.path)) && (e.path = this.defaultPath);
	}
	canMove(e) {
		return e && (this.moveMode || this.m.drag === "auto" && !xm(e.path)) && !Sm(e.path);
	}
	isDrag(e) {
		return this.dragger.getList().has(e);
	}
	isPress(e) {
		return this.downData && this.downData.path.has(e);
	}
	isHover(e) {
		return this.enterPath && this.enterPath.has(e);
	}
	isFocus(e) {
		return this.focusData === e;
	}
	cancelHover() {
		let { hoverData: e } = this;
		e && (e.path = this.defaultPath, this.pointerHover(e));
	}
	stopDragAnimate() {
		this.dragger.stopAnimate();
	}
	replaceDownTarget(e) {
		let { downData: t } = this;
		if (t && e) {
			let { path: n } = t;
			n.remove(n.list[0]), n.addAt(e, 0);
		}
	}
	updateDownData(e, t, n) {
		let { downData: r } = this;
		!e && r && (e = r), e && (this.findPath(e, t), n && r && e.path.addList(r.path.list), this.downData = e);
	}
	updateHoverData(e) {
		e ||= this.hoverData, e && (this.findPath(e, {
			exclude: this.dragger.getList(!1, !0),
			name: Q.MOVE
		}), this.hoverData = e);
	}
	updateCursor(e) {
		if (!this.config.cursor || !this.canHover) return;
		if (e ||= (this.updateHoverData(), this.downData || this.hoverData), this.dragger.moving) return this.setCursor("grabbing");
		if (this.canMove(e)) return this.setCursor(this.downData ? "grabbing" : "grab");
		if (!e) return;
		let t, n, { path: r } = e;
		for (let e = 0, i = r.length; e < i && (t = r.list[e], n = t.syncEventer && t.syncEventer.cursor || t.cursor, !n); e++);
		this.setCursor(n);
	}
	setCursor(e) {
		this.cursor = e;
	}
	getLocal(e, t) {
		let n = this.canvas.getClientBounds(t), r = {
			x: e.clientX - n.x,
			y: e.clientY - n.y
		}, { bounds: i } = this.canvas;
		return r.x *= i.width / n.width, r.y *= i.height / n.height, this.p.snap && R.round(r), r;
	}
	emitTap(e) {
		this.emit(Q.TAP, e), this.emit(Q.CLICK, e);
	}
	emitDoubleTap(e) {
		this.emit(Q.DOUBLE_TAP, e), this.emit(Q.DOUBLE_CLICK, e);
	}
	pointerWaitCancel() {
		this.tapWaitCancel(), this.longPressWaitCancel();
	}
	tapWait() {
		clearTimeout(this.tapTimer), this.waitTap = !0;
	}
	tapWaitCancel() {
		this.waitTap && (clearTimeout(this.tapTimer), this.waitTap = !1, this.tapCount = 0);
	}
	longPressWait(e) {
		clearTimeout(this.longPressTimer), this.longPressTimer = setTimeout(() => {
			this.longPressed = !0, this.emit(Q.LONG_PRESS, e);
		}, this.p.longPressTime);
	}
	longTap(e) {
		let t;
		return this.longPressed && (this.emit(Q.LONG_TAP, e), (bm(e.path, Q.LONG_TAP) || bm(e.path, Q.LONG_PRESS)) && (t = !0)), this.longPressWaitCancel(), t;
	}
	longPressWaitCancel() {
		this.longPressTimer && (clearTimeout(this.longPressTimer), this.longPressed = !1);
	}
	__onResize() {
		let { dragOut: e } = this.m;
		this.shrinkCanvasBounds = new yi(this.canvas.bounds), this.shrinkCanvasBounds.spread(-(Un(e) ? e : 2));
	}
	__listenEvents() {
		let { target: e } = this;
		this.__eventIds = [e.on_(_u.RESIZE, this.__onResize, this)], e.once(q.READY, () => this.__onResize());
	}
	__removeListenEvents() {
		this.target.off_(this.__eventIds), this.__eventIds.length = 0;
	}
	emit(e, t, n, r) {
		this.running && function(e, t, n, r) {
			if (!n && !t.path) return;
			let i;
			t.type = e, n ? t = Object.assign(Object.assign({}, t), { path: n }) : n = t.path, t.target = n.indexAt(0);
			try {
				for (let a = n.length - 1; a > -1; a--) {
					if (i = n.list[a], _m(i, e, t, !0, r)) return;
					i.isApp && gm(i, e, t, !0, r);
				}
				for (let a = 0, o = n.length; a < o; a++) if (i = n.list[a], i.isApp && gm(i, e, t, !1, r), _m(i, e, t, !1, r)) return;
			} catch (e) {
				mm.error(e);
			}
		}(e, t, n, r);
	}
	destroy() {
		this.__eventIds.length && (this.stop(), this.__removeListenEvents(), this.dragger.destroy(), this.transformer && this.transformer.destroy(), this.downData = this.overPath = this.enterPath = null);
	}
}, wm = class {
	static set(e, t) {
		this.custom[e] = t;
	}
	static get(e) {
		return this.custom[e];
	}
};
wm.custom = {};
var Tm = class extends Ui {
	constructor() {
		super(...arguments), this.maxTotal = 1e3, this.pathList = new Hd(), this.pixelList = new Hd();
	}
	getPixelType(e, t) {
		return this.__autoClear(), this.pixelList.add(e), Ii.hitCanvas(t);
	}
	getPathType(e) {
		return this.__autoClear(), this.pathList.add(e), Ii.hitCanvas();
	}
	clearImageType() {
		this.__clearLeafList(this.pixelList);
	}
	clearPathType() {
		this.__clearLeafList(this.pathList);
	}
	__clearLeafList(e) {
		e.length && (e.forEach((e) => {
			e.__hitCanvas &&= (e.__hitCanvas.destroy(), null);
		}), e.reset());
	}
	__autoClear() {
		this.pathList.length + this.pixelList.length > this.maxTotal && this.clear();
	}
	clear() {
		this.clearPathType(), this.clearImageType();
	}
};
V.getSelector = function(e) {
	return e.leafer ? e.leafer.selector : V.selector ||= Ii.selector();
};
var { toInnerRadiusPointOf: Em, copyRadiusPoint: Dm } = R, { hitRadiusPoint: Om, hitPoint: km } = z, Am = {}, jm = {}, Mm = jd.prototype;
Mm.hit = function(e, t = 0) {
	this.updateLayout(), Dm(jm, e, t);
	let n = this.__world;
	return !!(t ? Om(n, jm) : km(n, jm)) && (this.isBranch ? V.getSelector(this).hitPoint(Object.assign({}, jm), t, { target: this }) : this.__hitWorld(jm));
}, Mm.__hitWorld = function(e, t) {
	let n = this.__;
	if (!n.hitSelf) return !1;
	let r = this.__world, i = this.__layout, a = r.width < 10 && r.height < 10;
	if (n.hitRadius && (Dm(Am, e, n.hitRadius), e = Am), Em(e, r, Am), n.hitBox || a) {
		if (z.hitRadiusPoint(i.boxBounds, Am)) return !0;
		if (a) return !1;
	}
	return !i.hitCanvasChanged && this.__hitCanvas || (this.__updateHitCanvas(), i.boundsChanged || (i.hitCanvasChanged = !1)), this.__hit(Am, t);
}, Mm.__hitFill = function(e) {
	let t = this.__hitCanvas;
	return t && t.hitFill(e, this.__.windingRule);
}, Mm.__hitStroke = function(e, t) {
	let n = this.__hitCanvas;
	return n && n.hitStroke(e, t);
}, Mm.__hitPixel = function(e) {
	let t = this.__hitCanvas;
	return t && t.hitPixel(e, this.__layout.renderBounds, t.hitScale);
}, Mm.__drawHitPath = function(e) {
	e && this.__drawRenderPath(e);
};
var Nm = new Gr(), Pm = X.prototype;
Pm.__updateHitCanvas = function() {
	this.__box && this.__box.__updateHitCanvas();
	let { hitCanvasManager: e } = this.leafer || this.parent && this.parent.leafer || {};
	if (!e) return;
	let t = this.__, n = (t.__isAlphaPixelFill || t.__isCanvas) && t.hitFill === "pixel", r = t.__isAlphaPixelStroke && t.hitStroke === "pixel", i = n || r;
	this.__hitCanvas ||= i ? e.getPixelType(this, { contextSettings: { willReadFrequently: !0 } }) : e.getPathType(this);
	let a = this.__hitCanvas;
	if (i) {
		let { renderBounds: e } = this.__layout, i = V.image.hitCanvasSize, o = a.hitScale = bi.set(0, 0, i, i).getFitMatrix(e).a, { x: s, y: c, width: l, height: u } = bi.set(e).scale(o);
		a.resize({
			width: l,
			height: u,
			pixelRatio: 1
		}), a.clear(), Tc.patternLocked = !0, this.__renderShape(a, {
			matrix: Nm.setWith(this.__world).scaleWith(1 / o).invertWith().translate(-s, -c),
			snapshot: !0,
			ignoreFill: !n,
			ignoreStroke: !r
		}), Tc.patternLocked = !1, a.resetTransform(), t.__isHitPixel = !0;
	} else t.__isHitPixel &&= !1;
	this.__drawHitPath(a), a.setStrokeOptions(t);
}, Pm.__hit = function(e, t) {
	if (this.__box && this.__box.__hit(e)) return !0;
	let n = this.__;
	if (n.__isHitPixel && this.__hitPixel(e)) return !0;
	let { hitFill: r } = n, i = (n.fill || n.__isCanvas) && (r === "path" || r === "pixel" && !(n.__isAlphaPixelFill || n.__isCanvas)) || r === "all" || t;
	if (i && this.__hitFill(e)) return !0;
	let { hitStroke: a, __maxStrokeWidth: o } = n, s = n.stroke && (a === "path" || a === "pixel" && !n.__isAlphaPixelStroke) || a === "all";
	if (!i && !s) return !1;
	let c = 2 * e.radiusX, l = c, { strokeAlign: u } = n;
	if (n.motionText && (l += n.fontSize / 2, u = "center"), s) switch (u) {
		case "inside":
			if (l += 2 * o, !i && this.__hitFill(e) && this.__hitStroke(e, l)) return !0;
			l = c;
			break;
		case "center":
			l += o;
			break;
		case "outside": if (l += 2 * o, !i) {
			if (!this.__hitFill(e) && this.__hitStroke(e, l)) return !0;
			l = c;
		}
	}
	return !!l && this.__hitStroke(e, l);
};
var Fm = X.prototype, Im = Bf.prototype, Lm = Kf.prototype;
Im.__updateHitCanvas = Lm.__updateHitCanvas = function() {
	this.stroke || this.cornerRadius || (this.fill || this.__.__isCanvas) && this.hitFill === "pixel" || this.hitStroke === "all" ? Fm.__updateHitCanvas.call(this) : this.__hitCanvas &&= null;
}, Im.__hitFill = Lm.__hitFill = function(e) {
	return this.__hitCanvas ? Fm.__hitFill.call(this, e) : z.hitRadiusPoint(this.__layout.boxBounds, e);
}, Z.prototype.__drawHitPath = function(e) {
	let t = this.__, { __lineHeight: n, fontSize: r, __baseLine: i, __letterSpacing: a, __textDrawData: o } = t;
	e.beginPath(), t.motionText ? this.__drawPathByData(e, t.__pathForMotionText) : a < 0 ? this.__drawPathByBox(e) : o.rows.forEach((t) => e.rect(t.x, t.y - i, t.width, n < r ? r : n));
}, If.prototype.pick = function(e, t) {
	return t ||= zn, this.updateLayout(), V.getSelector(this).getByPoint(e, t.hitRadius || 0, Object.assign(Object.assign({}, t), { target: this }));
};
var Rm = ta.prototype;
Rm.hitFill = function(e, t) {
	return t ? this.context.isPointInPath(e.x, e.y, t) : this.context.isPointInPath(e.x, e.y);
}, Rm.hitStroke = function(e, t) {
	return this.strokeWidth = t, this.context.isPointInStroke(e.x, e.y);
}, Rm.hitPixel = function(e, t, n = 1) {
	let { x: r, y: i, radiusX: a, radiusY: o } = e;
	t && (r -= t.x, i -= t.y), bi.set(r - a, i - o, 2 * a, 2 * o).scale(n).ceil();
	let { data: s } = this.context.getImageData(bi.x, bi.y, bi.width || 1, bi.height || 1);
	for (let e = 0, t = s.length; e < t; e += 4) if (s[e + 3] > 0) return !0;
	return s[3] > 0;
};
//#endregion
//#region node_modules/leafer-ui/dist/web.esm.min.js
var zm;
function Bm(e, t, n, r) {
	return new (n ||= Promise)(function(i, a) {
		function o(e) {
			try {
				c(r.next(e));
			} catch (e) {
				a(e);
			}
		}
		function s(e) {
			try {
				c(r.throw(e));
			} catch (e) {
				a(e);
			}
		}
		function c(e) {
			var t;
			e.done ? i(e.value) : (t = e.value, t instanceof n ? t : new n(function(e) {
				e(t);
			})).then(o, s);
		}
		c((r = r.apply(e, t || [])).next());
	});
}
(function(e) {
	e[e.none = 1] = "none", e[e.free = 2] = "free", e[e.mirrorAngle = 3] = "mirrorAngle", e[e.mirror = 4] = "mirror";
})(zm ||= {});
var Vm = Oi.get("LeaferCanvas"), Hm = class extends ta {
	set zIndex(e) {
		let { style: t } = this.view;
		t.zIndex = e, this.setAbsolute(this.view);
	}
	set childIndex(e) {
		let { view: t, parentView: n } = this;
		if (t && n) {
			let r = n.children[e];
			r ? (this.setAbsolute(r), n.insertBefore(t, r)) : n.appendChild(r);
		}
	}
	init() {
		let { config: e } = this, t = e.view || e.canvas;
		t ? this.__createViewFrom(t) : this.__createView();
		let { style: n } = this.view;
		if (n.display ||= "block", this.parentView = this.view.parentElement, this.parentView) {
			let e = this.parentView.style;
			e.webkitUserSelect = e.userSelect = "none", this.view.classList.add("leafer-canvas-view");
		}
		V.syncDomFont && !this.parentView && (n.display = "none", document.body && document.body.appendChild(this.view)), this.__createContext(), this.autoLayout || this.resize(e);
	}
	set backgroundColor(e) {
		this.view.style.backgroundColor = e;
	}
	get backgroundColor() {
		return this.view.style.backgroundColor;
	}
	set hittable(e) {
		this.view.style.pointerEvents = e ? "auto" : "none";
	}
	get hittable() {
		return this.view.style.pointerEvents !== "none";
	}
	__createView() {
		this.view = document.createElement("canvas");
	}
	__createViewFrom(e) {
		let t = Vn(e) ? document.getElementById(e) : e;
		if (t) if (t instanceof HTMLCanvasElement) this.view = t;
		else {
			let e = t;
			if (t === window || t === document) {
				let t = document.createElement("div"), { style: n } = t;
				n.position = "absolute", n.top = n.bottom = n.left = n.right = "0px", document.body.appendChild(t), e = t;
			}
			this.__createView();
			let n = this.view;
			e.hasChildNodes() && (this.setAbsolute(n), e.style.position || (e.style.position = "relative")), e.appendChild(n);
		}
		else Vm.error(`no id: ${e}`), this.__createView();
	}
	setAbsolute(e) {
		let { style: t } = e;
		t.position = "absolute", t.top = t.left = "0px";
	}
	updateViewSize() {
		let { width: e, height: t, pixelRatio: n } = this, { style: r } = this.view;
		r.width = e + "px", r.height = t + "px", this.unreal || (this.view.width = Math.ceil(e * n), this.view.height = Math.ceil(t * n));
	}
	updateClientBounds() {
		this.view.parentElement && (this.clientBounds = this.view.getBoundingClientRect());
	}
	startAutoLayout(e, t) {
		if (this.resizeListener = t, e) {
			if (this.autoBounds = e, this.resizeObserver) return;
			try {
				this.resizeObserver = new ResizeObserver((e) => {
					this.updateClientBounds();
					for (let t of e) this.checkAutoBounds(t.contentRect);
				});
				let e = this.parentView;
				e ? (this.resizeObserver.observe(e), this.checkAutoBounds(e.getBoundingClientRect())) : (this.checkAutoBounds(this.view), Vm.warn("no parent"));
			} catch {
				this.imitateResizeObserver();
			}
			this.stopListenPixelRatio();
		} else this.listenPixelRatio(), this.unreal && this.updateViewSize();
	}
	imitateResizeObserver() {
		this.autoLayout && (this.parentView && this.checkAutoBounds(this.parentView.getBoundingClientRect()), V.requestRender(this.imitateResizeObserver.bind(this)));
	}
	listenPixelRatio() {
		this.windowListener || window.addEventListener("resize", this.windowListener = () => {
			let e = V.devicePixelRatio;
			if (!this.config.pixelRatio && this.pixelRatio !== e) {
				let { width: t, height: n } = this;
				this.emitResize({
					width: t,
					height: n,
					pixelRatio: e
				});
			}
		});
	}
	stopListenPixelRatio() {
		this.windowListener &&= (window.removeEventListener("resize", this.windowListener), null);
	}
	checkAutoBounds(e) {
		let t = this.view, { x: n, y: r, width: i, height: a } = this.autoBounds.getBoundsFrom(e), o = {
			width: i,
			height: a,
			pixelRatio: this.config.pixelRatio ? this.pixelRatio : V.devicePixelRatio
		};
		if (!this.isSameSize(o)) {
			let { style: e } = t;
			e.marginLeft = n + "px", e.marginTop = r + "px", this.emitResize(o);
		}
	}
	stopAutoLayout() {
		this.autoLayout = !1, this.resizeObserver && this.resizeObserver.disconnect(), this.resizeListener = this.resizeObserver = null;
	}
	emitResize(e) {
		let t = {};
		F.copyAttrs(t, this, ea), this.resize(e), this.resizeListener && !P(this.width) && this.resizeListener(new _u(e, t));
	}
	unrealCanvas() {
		if (!this.unreal && this.parentView) {
			let e = this.view;
			e && e.remove(), e = this.view = document.createElement("div"), this.parentView.appendChild(this.view), e.classList.add("leafer-app-view"), this.unreal = !0;
		}
	}
	destroy() {
		let { view: e } = this;
		e && (this.stopAutoLayout(), this.stopListenPixelRatio(), e.parentElement && e.remove(), super.destroy());
	}
};
function Um(e, t) {
	V.origin = {
		createCanvas(e, t) {
			let n = document.createElement("canvas");
			return n.width = e, n.height = t, n;
		},
		canvasToDataURL: (e, t, n) => {
			let r = _c.mimeType(t), i = e.toDataURL(r, n);
			return r === "image/bmp" ? i.replace("image/png;", "image/bmp;") : i;
		},
		canvasToBolb: (e, t, n) => new Promise((r) => e.toBlob(r, _c.mimeType(t), n)),
		canvasSaveAs: (e, t, n) => {
			let r = e.toDataURL(_c.mimeType(_c.fileType(t)), n);
			return V.origin.download(r, t);
		},
		download(e, t) {
			return Bm(this, void 0, void 0, function* () {
				let n = document.createElement("a");
				n.href = e, n.download = t, document.body.appendChild(n), n.click(), document.body.removeChild(n);
			});
		},
		loadImage: (e, t, n) => new Promise((n, r) => {
			let i = new V.origin.Image();
			t && (i.setAttribute("crossOrigin", t), i.crossOrigin = t), i.onload = () => {
				n(i);
			}, i.onerror = (e) => {
				r(e);
			}, i.src = V.image.getRealURL(e);
		}),
		loadContent(e) {
			return Bm(this, arguments, void 0, function* (e, t = "text") {
				let n = yield fetch(e);
				if (!n.ok) throw Error(`${n.status}`);
				return yield n[t]();
			});
		},
		Image,
		PointerEvent,
		DragEvent
	}, V.event = {
		stopDefault(e) {
			e.preventDefault();
		},
		stopNow(e) {
			e.stopImmediatePropagation();
		},
		stop(e) {
			e.stopPropagation();
		}
	}, V.canvas = Ii.canvas(), V.conicGradientSupport = !!V.canvas.context.createConicGradient;
}
gc(CanvasRenderingContext2D.prototype), gc(Path2D.prototype), Object.assign(Ii, {
	canvas: (e, t) => new Hm(e, t),
	image: (e) => new kc(e)
}), V.name = "web", V.isMobile = "ontouchstart" in window, V.requestRender = function(e) {
	window.requestAnimationFrame(e);
}, Ac(V, "devicePixelRatio", { get: () => devicePixelRatio });
var { userAgent: Wm } = navigator;
Wm.indexOf("Firefox") > -1 ? (V.intWheelDeltaY = !0, V.syncDomFont = !0) : (/iPhone|iPad|iPod/.test(navigator.userAgent) || /Macintosh/.test(navigator.userAgent) && /Version\/[\d.]+.*Safari/.test(navigator.userAgent)) && (V.fullImageShadow = !0), Wm.indexOf("Windows") > -1 ? (V.os = "Windows", V.intWheelDeltaY = !0) : Wm.indexOf("Mac") > -1 ? V.os = "Mac" : Wm.indexOf("Linux") > -1 && (V.os = "Linux");
var Gm = class {
	get childrenChanged() {
		return this.hasAdd || this.hasRemove || this.hasVisible;
	}
	get updatedList() {
		if (this.hasRemove && this.config.usePartLayout) {
			let e = new Hd();
			return this.__updatedList.list.forEach((t) => {
				t.leafer && e.add(t);
			}), e;
		}
		return this.__updatedList;
	}
	constructor(e, t) {
		this.totalTimes = 0, this.config = {}, this.__updatedList = new Hd(), this.target = e, t && (this.config = F.default(t, this.config)), this.__listenEvents();
	}
	start() {
		this.disabled || (this.running = !0);
	}
	stop() {
		this.running = !1;
	}
	disable() {
		this.stop(), this.__removeListenEvents(), this.disabled = !0;
	}
	update() {
		this.changed = !0, this.running && this.target.emit(bu.REQUEST);
	}
	__onAttrChange(e) {
		this.add(e.target);
	}
	add(e) {
		this.config.usePartLayout && this.__updatedList.add(e), this.update();
	}
	__onChildEvent(e) {
		this.config.usePartLayout && (e.type === ou.ADD ? (this.hasAdd = !0, this.__pushChild(e.child)) : (this.hasRemove = !0, this.__updatedList.add(e.parent))), this.update();
	}
	__pushChild(e) {
		this.__updatedList.add(e), e.isBranch && this.__loopChildren(e);
	}
	__loopChildren(e) {
		let { children: t } = e;
		for (let e = 0, n = t.length; e < n; e++) this.__pushChild(t[e]);
	}
	__onRquestData() {
		this.target.emitEvent(new vu(vu.DATA, { updatedList: this.updatedList })), this.__updatedList = new Hd(), this.totalTimes++, this.changed = this.hasVisible = this.hasRemove = this.hasAdd = !1;
	}
	__listenEvents() {
		this.__eventIds = [this.target.on_([
			[
				cu.CHANGE,
				this.__onAttrChange,
				this
			],
			[
				[ou.ADD, ou.REMOVE],
				this.__onChildEvent,
				this
			],
			[
				vu.REQUEST,
				this.__onRquestData,
				this
			]
		])];
	}
	__removeListenEvents() {
		this.target.off_(this.__eventIds);
	}
	destroy() {
		this.target &&= (this.stop(), this.__removeListenEvents(), this.__updatedList = null);
	}
}, { updateAllMatrix: Km, updateBounds: qm, updateChange: Jm } = Al, { pushAllChildBranch: Ym, pushAllParent: Xm } = Hl, { worldBounds: Zm } = Rl, Qm = class {
	constructor(e) {
		this.updatedBounds = new yi(), this.beforeBounds = new yi(), this.afterBounds = new yi(), Wn(e) && (e = new Hd(e)), this.updatedList = e;
	}
	setBefore() {
		this.beforeBounds.setListWithFn(this.updatedList.list, Zm);
	}
	setAfter() {
		this.afterBounds.setListWithFn(this.updatedList.list, Zm), this.updatedBounds.setList([this.beforeBounds, this.afterBounds]);
	}
	merge(e) {
		this.updatedList.addList(e.updatedList.list), this.beforeBounds.add(e.beforeBounds), this.afterBounds.add(e.afterBounds), this.updatedBounds.add(e.updatedBounds);
	}
	destroy() {
		this.updatedList = null;
	}
}, { updateAllMatrix: $m, updateAllChange: eh } = Al, th = Oi.get("Layouter"), nh = class e {
	constructor(e, t) {
		this.totalTimes = 0, this.config = { usePartLayout: !0 }, this.__levelList = new Ud(), this.target = e, t && (this.config = F.default(t, this.config)), this.__listenEvents();
	}
	start() {
		this.disabled || (this.running = !0);
	}
	stop() {
		this.running = !1;
	}
	disable() {
		this.stop(), this.__removeListenEvents(), this.disabled = !0;
	}
	layout() {
		if (this.layouting || !this.running) return;
		let { target: e } = this;
		this.times = 0;
		try {
			e.emit(yu.START), this.layoutOnce(), e.emitEvent(new yu(yu.END, this.layoutedBlocks, this.times));
		} catch (e) {
			th.error(e);
		}
		this.layoutedBlocks = null;
	}
	layoutAgain() {
		this.layouting ? this.waitAgain = !0 : this.layoutOnce();
	}
	layoutOnce() {
		return this.layouting ? th.warn("layouting") : this.times > 3 ? th.warn("layout max times") : (this.times++, this.totalTimes++, this.layouting = !0, this.target.emit(vu.REQUEST), this.totalTimes > 1 && this.config.usePartLayout ? this.partLayout() : this.fullLayout(), this.layouting = !1, void (this.waitAgain && (this.waitAgain = !1, this.layoutOnce())));
	}
	partLayout() {
		if (!this.__updatedList?.length) return;
		let e = Mi.start("PartLayout"), { target: t, __updatedList: n } = this, { BEFORE: r, LAYOUT: i, AFTER: a } = yu, o = this.getBlocks(n);
		o.forEach((e) => e.setBefore()), t.emitEvent(new yu(r, o, this.times)), this.extraBlock = null, n.sort(), function(e, t) {
			let n;
			e.list.forEach((e) => {
				n = e.__layout, t.without(e) && !n.proxyZoom && (n.matrixChanged ? (Km(e, !0), t.add(e), e.isBranch && Ym(e, t), Xm(e, t)) : n.boundsChanged && (t.add(e), e.isBranch && (e.__tempNumber = 0), Xm(e, t)));
			});
		}(n, this.__levelList), function(e) {
			let t, n, r;
			e.sort(!0), e.levels.forEach((i) => {
				t = e.levelMap[i];
				for (let e = 0, i = t.length; e < i; e++) {
					if (n = t[e], n.isBranch && n.__tempNumber) {
						r = n.children;
						for (let e = 0, t = r.length; e < t; e++) r[e].isBranch || qm(r[e]);
					}
					qm(n);
				}
			});
		}(this.__levelList), function(e) {
			e.list.forEach(Jm);
		}(n), this.extraBlock && o.push(this.extraBlock), o.forEach((e) => e.setAfter()), t.emitEvent(new yu(i, o, this.times)), t.emitEvent(new yu(a, o, this.times)), this.addBlocks(o), this.__levelList.reset(), this.__updatedList = null, Mi.end(e);
	}
	fullLayout() {
		let t = Mi.start("FullLayout"), { target: n } = this, { BEFORE: r, LAYOUT: i, AFTER: a } = yu, o = this.getBlocks(new Hd(n));
		n.emitEvent(new yu(r, o, this.times)), e.fullLayout(n), o.forEach((e) => {
			e.setAfter();
		}), n.emitEvent(new yu(i, o, this.times)), n.emitEvent(new yu(a, o, this.times)), this.addBlocks(o), Mi.end(t);
	}
	static fullLayout(e) {
		$m(e, !0), e.isBranch ? Hl.updateBounds(e) : Al.updateBounds(e), eh(e);
	}
	addExtra(e) {
		if (!this.__updatedList.has(e)) {
			let { updatedList: t, beforeBounds: n } = this.extraBlock ||= new Qm([]);
			t.length ? n.add(e.__world) : n.set(e.__world), t.add(e);
		}
	}
	createBlock(e) {
		return new Qm(e);
	}
	getBlocks(e) {
		return [this.createBlock(e)];
	}
	addBlocks(e) {
		this.layoutedBlocks ? this.layoutedBlocks.push(...e) : this.layoutedBlocks = e;
	}
	__onReceiveWatchData(e) {
		this.__updatedList = e.data.updatedList;
	}
	__listenEvents() {
		this.__eventIds = [this.target.on_([
			[
				yu.REQUEST,
				this.layout,
				this
			],
			[
				yu.AGAIN,
				this.layoutAgain,
				this
			],
			[
				vu.DATA,
				this.__onReceiveWatchData,
				this
			]
		])];
	}
	__removeListenEvents() {
		this.target.off_(this.__eventIds);
	}
	destroy() {
		this.target &&= (this.stop(), this.__removeListenEvents(), this.config = null);
	}
}, rh = Oi.get("Renderer"), ih = class e {
	get needFill() {
		return !(this.canvas.allowBackgroundColor || !this.config.fill);
	}
	constructor(e, t, n) {
		this.FPS = 60, this.totalTimes = 0, this.times = 0, this.config = {
			usePartRender: !0,
			ceilPartPixel: !0,
			maxFPS: 120
		}, this.frames = [], this.target = e, this.canvas = t, n && (this.config = F.default(n, this.config)), this.__listenEvents();
	}
	start() {
		this.running = !0, this.update(!1);
	}
	stop() {
		this.running = !1;
	}
	update(e = !0) {
		this.changed ||= e, this.requestTime || this.__requestRender();
	}
	requestLayout() {
		this.target.emit(yu.REQUEST);
	}
	checkRender() {
		if (this.running) {
			let { target: e } = this;
			e.isApp && (e.emit(bu.CHILD_START, e), e.children.forEach((e) => {
				e.renderer.FPS = this.FPS, e.renderer.checkRender();
			}), e.emit(bu.CHILD_END, e)), this.changed && this.canvas.view && this.render(), this.target.emit(bu.NEXT);
		}
	}
	render(e) {
		if (!this.running || !this.canvas.view) return this.update();
		let { target: t } = this;
		this.times = 0, this.totalBounds = new yi(), rh.log(t.innerName, "--->");
		try {
			this.emitRender(bu.START), this.renderOnce(e), this.emitRender(bu.END, this.totalBounds), Tc.clearRecycled();
		} catch (e) {
			this.rendering = !1, rh.error(e);
		}
		rh.log("-------------|");
	}
	renderAgain() {
		this.rendering ? this.waitAgain = !0 : this.renderOnce();
	}
	renderOnce(e) {
		if (this.rendering) return rh.warn("rendering");
		if (this.times > 3) return rh.warn("render max times");
		if (this.times++, this.totalTimes++, this.rendering = !0, this.changed = !1, this.renderBounds = new yi(), this.renderOptions = {}, e) this.emitRender(bu.BEFORE), e();
		else {
			if (this.requestLayout(), this.ignore) return void (this.ignore = this.rendering = !1);
			this.emitRender(bu.BEFORE), this.config.usePartRender && this.totalTimes > 1 ? this.partRender() : this.fullRender();
		}
		this.emitRender(bu.RENDER, this.renderBounds, this.renderOptions), this.emitRender(bu.AFTER, this.renderBounds, this.renderOptions), this.updateBlocks = null, this.rendering = !1, this.waitAgain && (this.waitAgain = !1, this.renderOnce());
	}
	partRender() {
		let { canvas: e, updateBlocks: t } = this;
		t && (this.mergeBlocks(), t.forEach((t) => {
			e.bounds.hit(t) && !t.isEmpty() && this.clipRender(t);
		}));
	}
	clipRender(t) {
		let n = Mi.start("PartRender"), { canvas: r } = this, i = t.getIntersect(r.bounds), a = new yi(i);
		r.save(), i.spread(e.clipSpread).ceil();
		let { ceilPartPixel: o } = this.config;
		r.clipWorld(i, o), r.clearWorld(i, o), this.__render(i, a), r.restore(), Mi.end(n);
	}
	fullRender() {
		let e = Mi.start("FullRender"), { canvas: t } = this;
		t.save(), t.clear(), this.__render(t.bounds), t.restore(), Mi.end(e);
	}
	__render(e, t) {
		let { canvas: n, target: r } = this, i = e.includes(r.__world), a = i ? { includes: i } : {
			bounds: e,
			includes: i
		};
		this.needFill && n.fillWorld(e, this.config.fill), Oi.showRepaint && Oi.drawRepaint(n, e), this.config.useCellRender && (a.cellList = this.getCellList()), V.render(r, n, a), this.renderBounds = t ||= e, this.renderOptions = a, this.totalBounds.isEmpty() ? this.totalBounds = t : this.totalBounds.add(t), n.updateRender(t);
	}
	getCellList() {}
	addBlock(e, t) {
		this.updateBlocks ||= [], this.updateBlocks.push(e);
	}
	mergeBlocks() {
		let { updateBlocks: e } = this;
		if (e) {
			let t = new yi();
			t.setList(e), e.length = 0, e.push(t);
		}
	}
	__requestRender() {
		let e = this.target;
		if (this.requestTime || !e) return;
		if (e.parentApp) return e.parentApp.requestRender(!1);
		this.requestTime = this.frameTime || Date.now();
		let t = () => {
			let e = 1e3 / ((this.frameTime = Date.now()) - this.requestTime), { maxFPS: n } = this.config;
			if (n && e > n) return V.requestRender(t);
			let { frames: r } = this;
			r.length > 30 && r.shift(), r.push(e), this.FPS = Math.round(r.reduce((e, t) => e + t, 0) / r.length), this.requestTime = 0, this.checkRender();
		};
		V.requestRender(t);
	}
	__onResize(e) {
		if (!this.canvas.unreal) {
			if (e.bigger || !e.samePixelRatio) {
				let { width: t, height: n } = e.old;
				if (!new yi(0, 0, t, n).includes(this.target.__world) || this.needFill || !e.samePixelRatio) return this.addBlock(this.canvas.bounds), void this.target.forceUpdate("surface");
			}
			this.addBlock(new yi(0, 0, 1, 1)), this.update();
		}
	}
	__onLayoutEnd(e) {
		e.data && e.data.map((e) => {
			let t, { updatedList: n } = e;
			n && n.list.some((e) => (t = !e.__world.width || !e.__world.height, t &&= (e.isLeafer || rh.tip(e.innerName, ": empty"), !e.isBranch || e.isBranchLeaf), t)), this.addBlock(t ? this.canvas.bounds : e.updatedBounds, n);
		});
	}
	emitRender(e, t, n) {
		this.target.emitEvent(new bu(e, this.times, t, n));
	}
	__listenEvents() {
		this.__eventIds = [this.target.on_([
			[
				bu.REQUEST,
				this.update,
				this
			],
			[
				yu.END,
				this.__onLayoutEnd,
				this
			],
			[
				bu.AGAIN,
				this.renderAgain,
				this
			],
			[
				_u.RESIZE,
				this.__onResize,
				this
			]
		])];
	}
	__removeListenEvents() {
		this.target.off_(this.__eventIds);
	}
	destroy() {
		this.target &&= (this.stop(), this.__removeListenEvents(), this.config = {}, this.canvas = null);
	}
};
ih.clipSpread = 10;
var ah = {}, { copyRadiusPoint: oh } = R, { hitRadiusPoint: sh } = z, ch = class {
	constructor(e, t) {
		this.target = e, this.selector = t;
	}
	getByPoint(e, t, n) {
		t ||= 0, n ||= {};
		let r = n.through || !1, i = n.ignoreHittable || !1, a = n.target || this.target;
		this.exclude = n.exclude || null, this.point = {
			x: e.x,
			y: e.y,
			radiusX: t,
			radiusY: t
		}, this.findList = new Hd(n.findList), n.findList || this.hitBranch(a.isBranchLeaf ? { children: [a] } : a);
		let { list: o } = this.findList, s = this.getBestMatchLeaf(o, n.bottomList, i, !!n.findList), c = i ? this.getPath(s) : this.getHitablePath(s);
		return this.clear(), r ? {
			path: c,
			target: s,
			throughPath: o.length ? this.getThroughPath(o) : c
		} : {
			path: c,
			target: s
		};
	}
	hitPoint(e, t, n) {
		return !!this.getByPoint(e, t, n).target;
	}
	getBestMatchLeaf(e, t, n, r) {
		let i = this.findList = new Hd();
		if (e.length) {
			let t, { x: r, y: a } = this.point, o = {
				x: r,
				y: a,
				radiusX: 0,
				radiusY: 0
			};
			for (let r = 0, a = e.length; r < a; r++) if (t = e[r], (n || Al.worldHittable(t)) && (this.hitChild(t, t.hitThrough ? this.point : o), i.length)) {
				if (t.isBranchLeaf && e.some((e) => e !== t && Al.hasParent(e, t))) {
					i.reset();
					break;
				}
				return i.list[0];
			}
		}
		if (t) {
			for (let e = 0, n = t.length; e < n; e++) if (this.hitChild(t[e].target, this.point, void 0, t[e].proxy), i.length) return i.list[0];
		}
		return r ? null : n ? e[0] : e.find((e) => Al.worldHittable(e));
	}
	getPath(e) {
		let t = new Hd(), n = [], { target: r } = this;
		for (; e && (e.syncEventer && n.push(e.syncEventer), t.add(e), (e = e.parent) !== r););
		return n.length && n.forEach((e) => {
			for (; e && (e.__.hittable && t.add(e), (e = e.parent) !== r););
		}), r && t.add(r), t;
	}
	getHitablePath(e) {
		let t = this.getPath(e && e.hittable ? e : null), n, r = new Hd();
		for (let e = t.list.length - 1; e > -1 && (n = t.list[e], n.__.hittable) && (r.addAt(n, 0), n.__.hitChildren && (!n.isLeafer || n.mode !== "draw")); e--);
		return r;
	}
	getThroughPath(e) {
		let t = new Hd(), n = [];
		for (let t = e.length - 1; t > -1; t--) n.push(this.getPath(e[t]));
		let r, i, a;
		for (let e = 0, o = n.length; e < o; e++) {
			r = n[e], i = n[e + 1];
			for (let e = 0, n = r.length; e < n && (a = r.list[e], !i || !i.has(a)); e++) t.add(a);
		}
		return t;
	}
	hitBranch(e) {
		this.eachFind(e.children, e.__onlyHitMask);
	}
	eachFind(e, t) {
		let n, r, i, { point: a } = this;
		for (let o = e.length - 1; o > -1; o--) if (n = e[o], i = n.__, i.visible && (!t || i.mask)) if (r = sh(n.__world, i.hitRadius ? oh(ah, a, i.hitRadius) : a), n.isBranch) {
			if (r || n.__ignoreHitWorld) {
				if (n.isBranchLeaf && i.__clipAfterFill && !n.__hitWorld(a, !0)) continue;
				n.topChildren && this.eachFind(n.topChildren, !1), this.eachFind(n.children, n.__onlyHitMask), n.isBranchLeaf && this.hitChild(n, a, t);
			}
		} else r && this.hitChild(n, a, t);
	}
	hitChild(e, t, n, r) {
		if ((!this.exclude || !this.exclude.has(e)) && e.__hitWorld(t, !(!n || e.mask !== "path") || void 0)) {
			let { parent: n, mask: i } = e;
			if (n && n.__hasMask && i && i !== "clipping" && i !== "clipping-path" && !n.children.some((e) => !e.mask && e.__hitWorld(t))) return;
			let a = r || e, { hitThrough: o } = e, { findList: s } = this;
			if (o) {
				let t = s.list.findIndex((t) => t[o] === e[o]);
				if (t > 0) return s.addAt(a, t);
			}
			s.add(a);
		}
	}
	clear() {
		this.point = null, this.findList = null, this.exclude = null;
	}
	destroy() {
		this.clear();
	}
}, lh = class {
	constructor(e, t) {
		this.config = {}, t && (this.config = F.default(t, this.config)), this.picker = new ch(this.target = e, this), this.finder = Ii.finder && Ii.finder(e, this.config);
	}
	getByPoint(e, t, n) {
		let { target: r, picker: i } = this;
		return V.backgrounder && r && r.updateLayout(), i.getByPoint(e, t, n);
	}
	hitPoint(e, t, n) {
		return this.picker.hitPoint(e, t, n);
	}
	getBy(e, t, n, r) {
		return this.finder ? this.finder.getBy(e, t, n, r) : Fi.need("find");
	}
	destroy() {
		this.picker.destroy(), this.finder && this.finder.destroy();
	}
};
Object.assign(Ii, {
	watcher: (e, t) => new Gm(e, t),
	layouter: (e, t) => new nh(e, t),
	renderer: (e, t, n) => new ih(e, t, n),
	selector: (e, t) => new lh(e, t)
}), V.layout = nh.fullLayout, V.render = function(e, t, n) {
	let r = Object.assign(Object.assign({}, n), { topRendering: !0 });
	n.topList = new Hd(), e.__render(t, n), n.topList.length && n.topList.forEach((e) => e.__render(t, r));
};
var uh = {
	convert(e, t) {
		let n = sm.getBase(e), { x: r, y: i } = t, a = Object.assign(Object.assign({}, n), {
			x: r,
			y: i,
			width: e.width,
			height: e.height,
			pointerType: e.pointerType,
			pressure: e.pressure
		});
		return a.pointerType === "pen" && (a.tangentialPressure = e.tangentialPressure, a.tiltX = e.tiltX, a.tiltY = e.tiltY, a.twist = e.twist), a;
	},
	convertMouse(e, t) {
		let n = sm.getBase(e), { x: r, y: i } = t;
		return Object.assign(Object.assign({}, n), {
			x: r,
			y: i,
			width: 1,
			height: 1,
			pointerType: "mouse",
			pressure: .5
		});
	},
	convertTouch(e, t) {
		let n = uh.getTouch(e), r = sm.getBase(e), { x: i, y: a } = t;
		return Object.assign(Object.assign({}, r), {
			x: i,
			y: a,
			width: 1,
			height: 1,
			pointerType: "touch",
			multiTouch: e.touches.length > 1,
			pressure: n.force
		});
	},
	getTouch: (e) => e.targetTouches[0] || e.changedTouches[0]
}, dh = { convert(e) {
	let t = sm.getBase(e);
	return Object.assign(Object.assign({}, t), {
		code: e.code,
		key: e.key
	});
} }, { pathCanDrag: fh } = sm, ph = class extends Cm {
	get windowTarget() {
		let { view: e } = this;
		return e && e.ownerDocument || window;
	}
	get notPointer() {
		let { p: e } = this;
		return e.type !== "pointer" || e.touch || this.useMultiTouch;
	}
	get notTouch() {
		let { p: e } = this;
		return e.type === "mouse" || this.usePointer;
	}
	get notMouse() {
		return this.usePointer || this.useTouch;
	}
	__listenEvents() {
		super.__listenEvents();
		let e = this.view = this.canvas.view;
		this.viewEvents = {
			pointerdown: this.onPointerDown,
			mousedown: this.onMouseDown,
			touchstart: this.onTouchStart,
			pointerleave: this.onPointerLeave,
			contextmenu: this.onContextMenu,
			wheel: this.onWheel,
			gesturestart: this.onGesturestart,
			gesturechange: this.onGesturechange,
			gestureend: this.onGestureend
		}, this.windowEvents = {
			pointermove: this.onPointerMove,
			pointerup: this.onPointerUp,
			pointercancel: this.onPointerCancel,
			mousemove: this.onMouseMove,
			mouseup: this.onMouseUp,
			touchmove: this.onTouchMove,
			touchend: this.onTouchEnd,
			touchcancel: this.onTouchCancel,
			keydown: this.onKeyDown,
			keyup: this.onKeyUp,
			scroll: this.onScroll
		};
		let { viewEvents: t, windowEvents: n } = this;
		for (let n in t) t[n] = t[n].bind(this), e.addEventListener(n, t[n]);
		for (let e in n) n[e] = n[e].bind(this), this.windowTarget.addEventListener(e, n[e]);
	}
	__removeListenEvents() {
		super.__removeListenEvents();
		let { viewEvents: e, windowEvents: t } = this;
		for (let t in e) this.view.removeEventListener(t, e[t]), this.viewEvents = {};
		for (let e in t) this.windowTarget.removeEventListener(e, t[e]), this.windowEvents = {};
	}
	getTouches(e) {
		let t = [];
		for (let n = 0, r = e.length; n < r; n++) t.push(e[n]);
		return t;
	}
	preventDefaultPointer(e) {
		let { pointer: t } = this.config;
		t.preventDefault && e.preventDefault();
	}
	preventDefaultWheel(e) {
		let { wheel: t } = this.config;
		t.preventDefault && e.preventDefault();
	}
	preventWindowPointer(e) {
		return !this.downData && e.target !== this.view && (!this.config.shadowDOM || !e.composedPath || !e.composedPath().includes(this.view));
	}
	onKeyDown(e) {
		this.keyDown(dh.convert(e));
	}
	onKeyUp(e) {
		this.keyUp(dh.convert(e));
	}
	onContextMenu(e) {
		this.config.pointer.preventDefaultMenu && e.preventDefault(), this.menu(uh.convert(e, this.getLocal(e)));
	}
	onScroll() {
		this.canvas.updateClientBounds();
	}
	onPointerDown(e) {
		this.preventDefaultPointer(e), this.notPointer || (this.usePointer ||= !0, this.pointerDown(uh.convert(e, this.getLocal(e))));
	}
	onPointerMove(e, t) {
		if (this.notPointer || this.preventWindowPointer(e)) return;
		this.usePointer ||= !0;
		let n = uh.convert(e, this.getLocal(e, !0));
		t ? this.pointerHover(n) : this.pointerMove(n);
	}
	onPointerLeave(e) {
		this.onPointerMove(e, !0);
	}
	onPointerUp(e) {
		this.downData && this.preventDefaultPointer(e), this.notPointer || this.preventWindowPointer(e) || this.pointerUp(uh.convert(e, this.getLocal(e)));
	}
	onPointerCancel() {
		this.useMultiTouch || this.pointerCancel();
	}
	onMouseDown(e) {
		this.preventDefaultPointer(e), this.notMouse || this.pointerDown(uh.convertMouse(e, this.getLocal(e)));
	}
	onMouseMove(e) {
		this.notMouse || this.preventWindowPointer(e) || this.pointerMove(uh.convertMouse(e, this.getLocal(e, !0)));
	}
	onMouseUp(e) {
		this.downData && this.preventDefaultPointer(e), this.notMouse || this.preventWindowPointer(e) || this.pointerUp(uh.convertMouse(e, this.getLocal(e)));
	}
	onMouseCancel() {
		this.notMouse || this.pointerCancel();
	}
	onTouchStart(e) {
		let t = uh.getTouch(e), n = this.getLocal(t, !0), { preventDefault: r } = this.config.touch;
		(!0 === r || r === "auto" && fh(this.findPath(n))) && e.preventDefault(), this.multiTouchStart(e), this.notTouch || (this.touchTimer &&= (window.clearTimeout(this.touchTimer), 0), this.useTouch = !0, this.pointerDown(uh.convertTouch(e, n)));
	}
	onTouchMove(e) {
		if (this.multiTouchMove(e), this.notTouch || this.preventWindowPointer(e)) return;
		let t = uh.getTouch(e);
		this.pointerMove(uh.convertTouch(e, this.getLocal(t)));
	}
	onTouchEnd(e) {
		if (this.multiTouchEnd(), this.notTouch || this.preventWindowPointer(e)) return;
		this.touchTimer && clearTimeout(this.touchTimer), this.touchTimer = setTimeout(() => {
			this.useTouch = !1;
		}, 500);
		let t = uh.getTouch(e);
		this.pointerUp(uh.convertTouch(e, this.getLocal(t)));
	}
	onTouchCancel() {
		this.notTouch || this.pointerCancel();
	}
	multiTouchStart(e) {
		this.useMultiTouch = e.touches.length > 1, this.touches = this.useMultiTouch ? this.getTouches(e.touches) : void 0, this.useMultiTouch && this.pointerCancel();
	}
	multiTouchMove(e) {
		if (this.useMultiTouch && e.touches.length > 1) {
			let t = this.getTouches(e.touches), n = this.getKeepTouchList(this.touches, t);
			n.length > 1 && (this.multiTouch(sm.getBase(e), n), this.touches = t);
		}
	}
	multiTouchEnd() {
		this.touches = null, this.useMultiTouch = !1, this.transformEnd();
	}
	getKeepTouchList(e, t) {
		let n, r = [];
		return e.forEach((e) => {
			n = t.find((t) => t.identifier === e.identifier), n && r.push({
				from: this.getLocal(e),
				to: this.getLocal(n)
			});
		}), r;
	}
	getLocalTouchs(e) {
		return e.map((e) => this.getLocal(e));
	}
	onWheel(e) {
		this.preventDefaultWheel(e), this.wheel(Object.assign(Object.assign(Object.assign({}, sm.getBase(e)), this.getLocal(e)), {
			deltaX: e.deltaX,
			deltaY: e.deltaY
		}));
	}
	onGesturestart(e) {
		this.useMultiTouch || (this.preventDefaultWheel(e), this.lastGestureScale = 1, this.lastGestureRotation = 0);
	}
	onGesturechange(e) {
		if (this.useMultiTouch) return;
		this.preventDefaultWheel(e);
		let t = sm.getBase(e);
		Object.assign(t, this.getLocal(e));
		let n = e.scale / this.lastGestureScale, r = (e.rotation - this.lastGestureRotation) / Math.PI * 180 * (mr.within(this.config.wheel.rotateSpeed, 0, 1) / 4 + .1);
		this.zoom(Object.assign(Object.assign({}, t), { scale: n * n })), this.rotate(Object.assign(Object.assign({}, t), { rotation: r })), this.lastGestureScale = e.scale, this.lastGestureRotation = e.rotation;
	}
	onGestureend(e) {
		this.useMultiTouch || (this.preventDefaultWheel(e), this.transformEnd());
	}
	setCursor(e) {
		super.setCursor(e);
		let t = [];
		this.eachCursor(e, t), Gn(t[t.length - 1]) && t.push("default"), this.canvas.view.style.cursor = t.map((e) => Gn(e) ? `url(${e.url}) ${e.x || 0} ${e.y || 0}` : e).join(",");
	}
	eachCursor(e, t, n = 0) {
		if (n++, Wn(e)) e.forEach((e) => this.eachCursor(e, t, n));
		else {
			let r = Vn(e) && wm.get(e);
			r && n < 2 ? this.eachCursor(r, t, n) : t.push(e);
		}
	}
	destroy() {
		this.view &&= (super.destroy(), this.touches = null);
	}
};
function mh(e, t, n) {
	e.__.__font ? Y.fillText(e, t, n) : e.__.windingRule ? t.fill(e.__.windingRule) : t.fill();
}
var hh = {};
function gh(e, t, n, r, i) {
	let a = n.__;
	Gn(e) ? Y.drawStrokesStyle(e, t, !1, n, r, i) : (r.setStroke(e, a.__strokeWidth * t, a), r.stroke()), a.__useArrow && Y.strokeArrow(e, n, r, i);
}
function _h(e, t, n, r, i) {
	let a = n.__;
	Gn(e) ? Y.drawStrokesStyle(e, t, !0, n, r, i) : (r.setStroke(e, a.__strokeWidth * t, a), Y.drawTextStroke(n, r, i));
}
function vh(e, t, n, r, i) {
	let a = r.getSameCanvas(!0, !0);
	a.font = n.__.__font, _h(e, 2, n, a, i), a.blendMode = t === "outside" ? "destination-out" : "destination-in", Y.fillText(n, a, i), a.blendMode = "normal", Al.copyCanvasByWorld(n, r, a), a.recycle(n.__nowWorld);
}
var { getSpread: yh, copyAndSpread: bh, toOuterOf: xh, getOuterOf: Sh, getByMove: Ch, move: wh, getIntersectData: Th } = z, Eh = {}, Dh, { stintSet: Oh } = F, { hasTransparent: kh } = Jd;
function Ah(e, t, n) {
	if (!Gn(t) || !1 === t.visible || t.opacity === 0) return;
	let r, { boxBounds: i } = n.__layout, { type: a } = t;
	switch (a) {
		case "image":
		case "film":
		case "video":
			if (!t.url) return;
			r = Zd.image(n, e, t, i, !Dh || !Dh[t.url]), a !== "image" && Zd[a](r);
			break;
		case "linear":
			r = Qd.linearGradient(t, i);
			break;
		case "radial":
			r = Qd.radialGradient(t, i);
			break;
		case "angular":
			r = Qd.conicGradient(t, i);
			break;
		case "solid":
			let { color: o, opacity: s } = t;
			r = {
				type: a,
				style: Jd.string(o, s)
			};
			break;
		default: P(t.r) || (r = {
			type: "solid",
			style: Jd.string(t)
		});
	}
	if (r && (r.originPaint = t, Vn(r.style) && kh(r.style) && (r.isTransparent = !0), t.style)) {
		if (t.style.strokeWidth === 0) return;
		r.strokeStyle = t.style;
	}
	return r;
}
var jh = {
	compute: function(e, t) {
		let n = t.__, r = [], i, a, o, s = n.__input[e];
		Wn(s) || (s = [s]), Dh = Zd.recycleImage(e, n);
		for (let n, i = 0, a = s.length; i < a; i++) (n = Ah(e, s[i], t)) && (r.push(n), n.strokeStyle && (o ||= 1, n.strokeStyle.strokeWidth && (o = Math.max(o, n.strokeStyle.strokeWidth))));
		r.length ? (n["_" + e] = r, r.every((e) => e.isTransparent) && (r.some((e) => e.image) && (i = !0), a = !0), e === "fill" ? (Oh(n, "__isAlphaPixelFill", i), Oh(n, "__isTransparentFill", a)) : (Oh(n, "__isAlphaPixelStroke", i), Oh(n, "__isTransparentStroke", a), Oh(n, "__hasMultiStrokeStyle", o))) : (n.__removePaint(e, !1), n["_" + e] = "");
	},
	fill: function(e, t, n, r) {
		n.fillStyle = e, mh(t, n, r);
	},
	fills: function(e, t, n, r) {
		let i, a, o;
		for (let s = 0, c = e.length; s < c; s++) {
			if (i = e[s], a = i.originPaint, i.image) {
				if (o ? o++ : o = 1, Zd.checkImage(i, !t.__.__font, t, n, r)) continue;
				if (!i.style) {
					o === 1 && i.image.isPlacehold && t.drawImagePlaceholder(i, n, r);
					continue;
				}
			}
			if (n.fillStyle = i.style, i.transform || a.scaleFixed) {
				if (n.save(), i.transform && n.transform(i.transform), a.scaleFixed) {
					let { scaleX: e, scaleY: r } = t.getRenderScaleData(!0, a.scaleFixed, !1);
					e !== 1 && n.scale(e, r);
				}
				a.blendMode && (n.blendMode = a.blendMode), mh(t, n, r), n.restore();
			} else a.blendMode ? (n.saveBlendMode(a.blendMode), mh(t, n, r), n.restoreBlendMode()) : mh(t, n, r);
		}
	},
	fillPathOrText: mh,
	fillText: function(e, t, n) {
		if (e.motionText) return hh.fillMotionText(e, t, n);
		let r = e.__, { rows: i, decorationY: a } = r.__textDrawData, o;
		r.__isPlacehold && r.placeholderColor && (t.fillStyle = r.placeholderColor);
		for (let e = 0, n = i.length; e < n; e++) o = i[e], o.text ? t.fillText(o.text, o.x, o.y) : o.data && o.data.forEach((e) => {
			t.fillText(e.char, e.x, o.y);
		});
		if (a) {
			let { decorationColor: e, decorationHeight: n } = r.__textDrawData;
			e && (t.fillStyle = e), i.forEach((e) => a.forEach((r) => t.fillRect(e.x, e.y + r, e.width, n)));
		}
	},
	stroke: function(e, t, n, r) {
		let i = t.__;
		if (i.__strokeWidth) if (i.__font) Y.strokeText(e, t, n, r);
		else if (i.__pathForStroke) Y.fillStroke(e, t, n, r);
		else switch (i.strokeAlign) {
			case "center":
				gh(e, 1, t, n, r);
				break;
			case "inside":
				(function(e, t, n, r) {
					n.save(), n.clipUI(t), gh(e, 2, t, n, r), n.restore();
				})(e, t, n, r);
				break;
			case "outside": (function(e, t, n, r) {
				let i = t.__;
				if (i.__fillAfterStroke) gh(e, 2, t, n, r);
				else {
					let { renderBounds: a } = t.__layout, o = n.getSameCanvas(!0, !0);
					t.__drawRenderPath(o), gh(e, 2, t, o, r), o.clipUI(i), o.clearWorld(a), Al.copyCanvasByWorld(t, n, o), o.recycle(t.__nowWorld);
				}
			})(e, t, n, r);
		}
	},
	strokes: function(e, t, n, r) {
		Y.stroke(e, t, n, r);
	},
	strokeText: function(e, t, n, r) {
		switch (t.__.strokeAlign) {
			case "center":
				_h(e, 1, t, n, r);
				break;
			case "inside":
				vh(e, "inside", t, n, r);
				break;
			case "outside": t.__.__fillAfterStroke ? _h(e, 2, t, n, r) : vh(e, "outside", t, n, r);
		}
	},
	drawTextStroke: function(e, t, n) {
		let r, i = e.__.__textDrawData, { rows: a, decorationY: o } = i;
		for (let e = 0, n = a.length; e < n; e++) r = a[e], r.text ? t.strokeText(r.text, r.x, r.y) : r.data && r.data.forEach((e) => {
			t.strokeText(e.char, e.x, r.y);
		});
		if (o) {
			let { decorationHeight: e } = i;
			a.forEach((n) => o.forEach((r) => t.strokeRect(n.x, n.y + r, n.width, e)));
		}
	},
	drawStrokesStyle: function(e, t, n, r, i, a) {
		let o, s = r.__, { __hasMultiStrokeStyle: c } = s;
		c || i.setStroke(void 0, s.__strokeWidth * t, s);
		for (let l = 0, u = e.length; l < u; l++) if (o = e[l], (!o.image || !Zd.checkImage(o, !1, r, i, a)) && o.style) {
			if (c) {
				let { strokeStyle: e } = o;
				e ? i.setStroke(o.style, s.__getRealStrokeWidth(e) * t, s, e) : i.setStroke(o.style, s.__strokeWidth * t, s);
			} else i.strokeStyle = o.style;
			o.originPaint.blendMode ? (i.saveBlendMode(o.originPaint.blendMode), n ? Y.drawTextStroke(r, i, a) : i.stroke(), i.restoreBlendMode()) : n ? Y.drawTextStroke(r, i, a) : i.stroke();
		}
	},
	shape: function(e, t, n) {
		let r = t.getSameCanvas(), i = t.bounds, a = e.__nowWorld, o = e.__layout, s = e.__nowWorldShapeBounds ||= {}, c, l, u, d, f, p;
		xh(o.strokeSpread ? (bh(Eh, o.boxBounds, o.strokeSpread), Eh) : o.boxBounds, a, s);
		let { scaleX: m, scaleY: h } = e.getRenderScaleData(!0);
		if (i.includes(s)) p = r, c = f = s, l = a;
		else {
			let r;
			r = V.fullImageShadow ? s : Th(o.renderShapeSpread ? yh(i, rr.swapAndScale(o.renderShapeSpread, m, h)) : i, s), d = i.getFitMatrix(r);
			let { a: g, d: _ } = d;
			d.a < 1 && (p = t.getSameCanvas(), e.__renderShape(p, n), m *= g, h *= _), f = Sh(s, d), c = Ch(f, -d.e, -d.f), l = Sh(a, d), wh(l, -d.e, -d.f);
			let v = n.matrix;
			v ? (u = new Gr(d), u.multiply(v), g *= v.scaleX, _ *= v.scaleY) : u = d, u.withScale(g, _), n = Object.assign(Object.assign({}, n), { matrix: u });
		}
		return e.__renderShape(r, n), {
			canvas: r,
			matrix: u,
			fitMatrix: d,
			bounds: c,
			renderBounds: l,
			worldCanvas: p,
			shapeBounds: f,
			scaleX: m,
			scaleY: h
		};
	}
}, Mh, Nh = new yi(), { isSame: Ph } = z;
function Fh(e, t, n, r, i, a) {
	let o = !0, s = e.__;
	if (t !== "fill" || s.__naturalWidth || (s.__naturalWidth = r.width / s.pixelRatio, s.__naturalHeight = r.height / s.pixelRatio, s.__autoSide && (e.forceUpdate(), Al.updateBounds(e), e.__layout.boundsChanged = !0, e.__proxyData && (e.setProxyAttr("width", s.width), e.setProxyAttr("height", s.height)), o = !1)), n.mode === "brush" && Zd.brush(e, t, i), !i.data) {
		Zd.createData(i, r, n, a);
		let { transform: e } = i.data, { opacity: t } = n, o = (e && !e.onlyScale || s.path || s.cornerRadius) && !i.brush;
		(o || t && t < 1 || n.blendMode) && (i.complex = !o || 2);
	}
	return n.filter && Zd.applyFilter(i, r, n.filter, e), o;
}
function Ih(e, t) {
	zh(e, uu.LOAD, t);
}
function Lh(e, t) {
	zh(e, uu.LOADED, t);
}
function Rh(e, t, n) {
	t.error = n, e.forceUpdate("surface"), zh(e, uu.ERROR, t);
}
function zh(e, t, n) {
	e.hasEvent(t) && e.emitEvent(new uu(t, n));
}
function Bh(e, t) {
	let { leafer: n } = e;
	n && n.viewReady && (n.renderer.ignore = t);
}
var { get: Vh, translate: Hh } = L, Uh = new yi(), Wh = {}, Gh = {};
function Kh(e, t, n, r) {
	let i = Vn(e) || r ? (r ? n - r * t : n % t) / ((r || Math.floor(n / t)) - 1) : e;
	return e === "auto" && i < 0 ? 0 : i;
}
var qh = {}, Jh = br(), { get: Yh, set: Xh, rotateOfOuter: Zh, translate: Qh, scaleOfOuter: $h, multiplyParent: eg, scale: tg, rotate: ng, skew: rg } = L;
function ig(e, t, n, r, i, a, o, s) {
	o && ng(e, o), s && rg(e, s.x, s.y), i && tg(e, i, a), Qh(e, t.x + n, t.y + r);
}
var { get: ag, scale: og, copy: sg } = L, { getFloorScale: cg } = mr, { abs: lg } = Math, ug = {
	image: function(e, t, n, r, i) {
		let a, o, s = Tc.get(n, n.type);
		return Mh && n === Mh.paint && Ph(r, Mh.boxBounds) ? a = Mh.leafPaint : (a = {
			type: n.type,
			image: s
		}, s.hasAlphaPixel && (a.isTransparent = !0), Mh = s.use > 1 ? {
			leafPaint: a,
			paint: n,
			boxBounds: Nh.set(r)
		} : null), (i || s.loading) && (o = {
			image: s,
			attrName: t,
			attrValue: n
		}), s.ready ? (Fh(e, t, n, s, a, r), i && (Ih(e, o), Lh(e, o))) : s.error ? i && Rh(e, o, s.error) : (i && (Bh(e, !0), Ih(e, o)), a.loadId = s.load(() => {
			Bh(e, !1), e.destroyed || (Fh(e, t, n, s, a, r) && (s.hasAlphaPixel && (e.__layout.hitCanvasChanged = !0), e.forceUpdate("surface")), Lh(e, o)), a.loadId = void 0;
		}, (t) => {
			Bh(e, !1), Rh(e, o, t), a.loadId = void 0;
		}, n.lod && s.getThumbSize(n.lod)), e.placeholderColor && (e.placeholderDelay ? setTimeout(() => {
			s.ready || (s.isPlacehold = !0, e.forceUpdate("surface"));
		}, e.placeholderDelay) : s.isPlacehold = !0)), a;
	},
	checkImage: function(e, t, n, r, i) {
		let { scaleX: a, scaleY: o } = Zd.getImageRenderScaleData(e, n, r, i), s = e.film ? e.nowIndex : a + "-" + o, { image: c, brush: l, data: u, originPaint: d } = e, { exporting: f, snapshot: p } = i;
		if (!u || e.patternId === s && !f || p) {
			if (!l || !e.style) return !1;
		} else if (t && (u.repeat ? t = !1 : d.changeful || e.film || V.name === "miniapp" || f || (t = V.image.isLarge(c, a, o) || c.width * a > 8096 || c.height * o > 8096)), t) n.__.__isFastShadow && (r.fillStyle = e.style || "#000", r.fill());
		else if (!e.style || d.sync || f ? Zd.createPattern(e, n, r, i) : Zd.createPatternTask(e, n, r, i), !l || !e.style) return !1;
		return Zd.drawImage(e, a, o, n, r, i), !0;
	},
	drawImage: function(e, t, n, r, i, a) {
		let { data: o, image: s, brush: c, complex: l } = e, { width: u, height: d } = s, f = c || s;
		if (l) {
			let { blendMode: a, opacity: s } = e.originPaint, { transform: c } = o;
			i.save(), l === 2 && i.clipUI(r), a && (i.blendMode = a), s && (i.opacity *= s), c && i.transform(c), f.render(i, 0, 0, u, d, r, e, t, n), i.restore();
		} else o.scaleX && (u *= o.scaleX, d *= o.scaleY), f.render(i, 0, 0, u, d, r, e, t, n);
	},
	getImageRenderScaleData: function(e, t, n, r) {
		let i = t.getRenderScaleData(!0, e.originPaint.scaleFixed), { data: a } = e;
		if (e.brush && Zd.addBrushScale(i, e, t), n) {
			let { pixelRatio: e } = n;
			i.scaleX *= e, i.scaleY *= e;
		}
		return a && a.scaleX && (i.scaleX *= Math.abs(a.scaleX), i.scaleY *= Math.abs(a.scaleY)), i;
	},
	recycleImage: function(e, t) {
		let n = t["_" + e];
		if (Wn(n)) {
			let r, i, a, o, s, c = t.__leaf;
			for (let l = 0, u = n.length; l < u; l++) r = n[l], i = r.image, s = i && i.url, s && (a ||= {}, a[s] = !0, Tc.recyclePaint(r), r.brush && Zd.recycleBrush(r, c), t.__willDestroy && i.parent && Zd.recycleFilter(i, c), i.loading && (o || (o = t.__input && t.__input[e] || [], Wn(o) || (o = [o])), i.unload(n[l].loadId, !o.some((e) => e.url === s))));
			return a;
		}
		return null;
	},
	createPatternTask: function(e, t, n, r) {
		e.patternTask ||= Tc.patternTasker.add(() => Bm(this, void 0, void 0, function* () {
			Zd.createPattern(e, t, n, r), t.forceUpdate("surface");
		}), 0, () => (e.patternTask = null, n.bounds.hit(t.__nowWorld)));
	},
	createPattern: function(e, t, n, r) {
		let { scaleX: i, scaleY: a } = Zd.getImageRenderScaleData(e, t, n, r), o = e.film ? e.nowIndex : i + "-" + a;
		if (e.patternId !== o && !t.destroyed && (!V.image.isLarge(e.image, i, a) || e.data.repeat)) {
			let { image: s, brush: c, data: l } = e, { transform: u, gap: d } = l, f = Zd.getPatternFixScale(e, i, a), p, m, h, { width: g, height: _ } = s, { opacity: v } = e.originPaint;
			(c || v === 1) && (v = void 0), f && (i *= f, a *= f), g *= i, _ *= a, d && !c && (m = d.x * i / lg(l.scaleX || 1), h = d.y * a / lg(l.scaleY || 1)), (u || i !== 1 || a !== 1) && (i *= cg(g + (m || 0)), a *= cg(_ + (h || 0)), p = ag(), u && sg(p, u), og(p, 1 / i, 1 / a));
			let y = s.getCanvas(g, _, v, void 0, m, h, t.leafer && t.leafer.config.smooth, l.interlace);
			c ? (e.style = y, Zd.cacheBrush(e, t, n, r)) : e.style = s.getPattern(y, l.repeat || V.origin.noRepeat || "no-repeat", p, e), e.patternId = o;
		}
	},
	getPatternFixScale: function(e, t, n) {
		let { image: r } = e, i, a = V.image.maxPatternSize, o = r.width * r.height;
		return r.isSVG ? t > 1 && (i = Math.ceil(t) / t) : a > o && (a = o), (o *= t * n) > a && (i = Math.sqrt(a / o)), i;
	},
	createData: function(e, t, n, r) {
		e.data = Zd.getPatternData(n, r, t);
	},
	getPatternData: function(e, t, n) {
		e.padding && (t = Uh.set(t).shrink(e.padding)), e.mode === "strench" && (e.mode = "stretch");
		let { width: r, height: i } = n, { mode: a, align: o, offset: s, scale: c, size: l, rotation: u, skew: d, clipSize: f, repeat: p, gap: m, interlace: h } = e, g = t.width === r && t.height === i, _ = { mode: a }, v = o !== "center" && (u || 0) % 180 == 90, y, b;
		switch (z.set(Gh, 0, 0, v ? i : r, v ? r : i), a && a !== "cover" && a !== "fit" ? ((c || l) && (mr.getScaleData(c, l, n, Wh), y = Wh.scaleX, b = Wh.scaleY), (o || m || p) && (y && z.scale(Gh, y, b, !0), o && ei.toPoint(o, Gh, t, Gh, !0, !0))) : g && !u || (y = b = z.getFitScale(t, Gh, a !== "fit"), z.put(t, n, o, y, !1, Gh), z.scale(Gh, y, b, !0)), s && R.move(Gh, s), a) {
			case "stretch":
				g ? y &&= b = void 0 : (y = t.width / r, b = t.height / i, Zd.stretchMode(_, t, y, b));
				break;
			case "normal":
			case "clip":
				if (Gh.x || Gh.y || y || f || u || d) {
					let e, n;
					f && (e = t.width / f.width, n = t.height / f.height), Zd.clipMode(_, t, Gh.x, Gh.y, y, b, u, d, e, n), e && (y = y ? y * e : e, b = b ? b * n : n);
				}
				break;
			case "repeat": (!g || y || u || d) && Zd.repeatMode(_, t, r, i, Gh.x, Gh.y, y, b, u, d, o, e.freeTransform);
			case "brush":
				p || (_.repeat = "repeat");
				let n = Gn(p);
				(m || n) && (_.gap = function(e, t, n, r, i) {
					let a, o;
					return Gn(e) ? (a = e.x, o = e.y) : a = o = e, {
						x: Kh(a, n, i.width, t && t.x),
						y: Kh(o, r, i.height, t && t.y)
					};
				}(m, n && p, Gh.width, Gh.height, t));
				break;
			default: y && Zd.fillOrFitMode(_, t, Gh.x, Gh.y, y, b, u);
		}
		return _.transform || a === "brush" || (t.x || t.y) && Hh(_.transform = Vh(), t.x, t.y), y && (_.scaleX = y, _.scaleY = b), p && (_.repeat = Vn(p) ? p === "x" ? "repeat-x" : "repeat-y" : "repeat"), h && (_.interlace = Un(h) || h.type === "percent" ? {
			type: "x",
			offset: h
		} : h), _;
	},
	stretchMode: function(e, t, n, r) {
		let i = Yh(), { x: a, y: o } = t;
		a || o ? Qh(i, a, o) : n > 0 && r > 0 && (i.onlyScale = !0), tg(i, n, r), e.transform = i;
	},
	fillOrFitMode: function(e, t, n, r, i, a, o) {
		let s = Yh();
		Qh(s, t.x + n, t.y + r), tg(s, i, a), o && Zh(s, {
			x: t.x + t.width / 2,
			y: t.y + t.height / 2
		}, o), e.transform = s;
	},
	clipMode: function(e, t, n, r, i, a, o, s, c, l) {
		let u = Yh();
		ig(u, t, n, r, i, a, o, s), c && (o || s ? (Xh(Jh), $h(Jh, t, c, l), eg(u, Jh)) : $h(u, t, c, l)), e.transform = u;
	},
	repeatMode: function(e, t, n, r, i, a, o, s, c, l, u, d) {
		let f = Yh();
		if (d) ig(f, t, i, a, o, s, c, l);
		else {
			if (c) if (u === "center") Zh(f, {
				x: n / 2,
				y: r / 2
			}, c);
			else switch (ng(f, c), c) {
				case 90:
					Qh(f, r, 0);
					break;
				case 180:
					Qh(f, n, r);
					break;
				case 270: Qh(f, 0, n);
			}
			qh.x = t.x + i, qh.y = t.y + a, Qh(f, qh.x, qh.y), o && $h(f, qh, o, s);
		}
		e.transform = f;
	}
}, { toPoint: dg } = Zr, { hasTransparent: fg } = Jd, pg = {}, mg = {};
function hg(e, t, n, r) {
	if (n) {
		let i, a, o, s;
		for (let e = 0, c = n.length; e < c; e++) i = n[e], Vn(i) ? (o = e / (c - 1), a = Jd.string(i, r)) : (o = i.offset, a = Jd.string(i.color, r)), t.addColorStop(o, a), !s && fg(a) && (s = !0);
		s && (e.isTransparent = !0);
	}
}
var { getAngle: gg, getDistance: _g } = R, { get: vg, rotateOfOuter: yg, scaleOfOuter: bg } = L, { toPoint: xg } = Zr, Sg = {}, Cg = {};
function wg(e, t, n, r, i) {
	let a, { width: o, height: s } = e;
	if (o !== s || r) {
		let e = gg(t, n);
		a = vg(), i ? (bg(a, t, o / s * (r || 1), 1), yg(a, t, e + 90)) : (bg(a, t, 1, o / s * (r || 1)), yg(a, t, e));
	}
	return a;
}
var { getDistance: Tg } = R, { toPoint: Eg } = Zr, Dg = {}, Og = {}, kg = {
	linearGradient: function(e, t) {
		let { from: n, to: r, type: i, opacity: a } = e;
		dg(n || "top", t, pg), dg(r || "bottom", t, mg);
		let o = V.canvas.createLinearGradient(pg.x, pg.y, mg.x, mg.y), s = {
			type: i,
			style: o
		};
		return hg(s, o, e.stops, a), s;
	},
	radialGradient: function(e, t) {
		let { from: n, to: r, type: i, opacity: a, stretch: o } = e;
		xg(n || "center", t, Sg), xg(r || "bottom", t, Cg);
		let s = V.canvas.createRadialGradient(Sg.x, Sg.y, 0, Sg.x, Sg.y, _g(Sg, Cg)), c = {
			type: i,
			style: s
		};
		hg(c, s, e.stops, a);
		let l = wg(t, Sg, Cg, o, !0);
		return l && (c.transform = l), c;
	},
	conicGradient: function(e, t) {
		let { from: n, to: r, type: i, opacity: a, rotation: o, stretch: s } = e;
		Eg(n || "center", t, Dg), Eg(r || "bottom", t, Og);
		let c = V.conicGradientSupport ? V.canvas.createConicGradient(o ? o * I : 0, Dg.x, Dg.y) : V.canvas.createRadialGradient(Dg.x, Dg.y, 0, Dg.x, Dg.y, Tg(Dg, Og)), l = {
			type: i,
			style: c
		};
		hg(l, c, e.stops, a);
		let u = wg(t, Dg, Og, s || 1, V.conicGradientRotate90);
		return u && (l.transform = u), l;
	},
	getTransform: wg
}, { copy: Ag, move: jg, toOffsetOutBounds: Mg } = z, { max: Ng, abs: Pg } = Math, Fg = {}, Ig = new Gr(), Lg = {};
function Rg(e, t) {
	let n, r, i, a, o = 0, s = 0, c = 0, l = 0;
	return t.forEach((e) => {
		n = e.x || 0, r = e.y || 0, a = 1.5 * (e.blur || 0), i = Pg(e.spread || 0), o = Ng(o, i + a - r), s = Ng(s, i + a + n), c = Ng(c, i + a + r), l = Ng(l, i + a - n);
	}), o === s && s === c && c === l ? o : [
		o,
		s,
		c,
		l
	];
}
function zg(e, t, n) {
	let { shapeBounds: r } = n, i, a;
	V.fullImageShadow ? (Ag(Fg, e.bounds), jg(Fg, t.x - r.x, t.y - r.y), i = e.bounds, a = Fg) : (i = r, a = t), e.copyWorld(n.canvas, i, a);
}
var { toOffsetOutBounds: Bg } = z, Vg = {}, Hg = {
	shadow: function(e, t, n) {
		let r, i, { __nowWorld: a } = e, { shadow: o } = e.__, { worldCanvas: s, bounds: c, renderBounds: l, shapeBounds: u, scaleX: d, scaleY: f } = n, p = t.getSameCanvas(), m = o.length - 1;
		Mg(c, Lg, l), o.forEach((o, h) => {
			let g = 1;
			if (o.scaleFixed) {
				let e = Math.abs(a.scaleX);
				e > 1 && (g = 1 / e);
			}
			p.setWorldShadow(Lg.offsetX + (o.x || 0) * d * g, Lg.offsetY + (o.y || 0) * f * g, (o.blur || 0) * d * g, Jd.string(o.color)), i = $d.getShadowTransform(e, p, n, o, Lg, g), i && p.setTransform(i), zg(p, Lg, n), i && p.resetTransform(), r = l, o.box && (p.restore(), p.save(), s && (p.copyWorld(p, l, a, "copy"), r = a), s ? p.copyWorld(s, a, a, "destination-out") : p.copyWorld(n.canvas, u, c, "destination-out")), Al.copyCanvasByWorld(e, t, p, r, o.blendMode), m && h < m && p.clearWorld(r);
		}), p.recycle(r);
	},
	innerShadow: function(e, t, n) {
		let r, i, { __nowWorld: a } = e, { innerShadow: o } = e.__, { worldCanvas: s, bounds: c, renderBounds: l, shapeBounds: u, scaleX: d, scaleY: f } = n, p = t.getSameCanvas(), m = o.length - 1;
		Bg(c, Vg, l), o.forEach((o, h) => {
			let g = 1;
			if (o.scaleFixed) {
				let e = Math.abs(a.scaleX);
				e > 1 && (g = 1 / e);
			}
			p.save(), p.setWorldShadow(Vg.offsetX + (o.x || 0) * d * g, Vg.offsetY + (o.y || 0) * f * g, (o.blur || 0) * d * g), i = $d.getShadowTransform(e, p, n, o, Vg, g, !0), i && p.setTransform(i), zg(p, Vg, n), p.restore(), s ? (p.copyWorld(p, l, a, "copy"), p.copyWorld(s, a, a, "source-out"), r = a) : (p.copyWorld(n.canvas, u, c, "source-out"), r = l), p.fillWorld(r, Jd.string(o.color), "source-in"), Al.copyCanvasByWorld(e, t, p, r, o.blendMode), m && h < m && p.clearWorld(r);
		}), p.recycle(r);
	},
	blur: function(e, t, n) {
		let { blur: r } = e.__;
		n.setWorldBlur(r * e.__nowWorld.a), n.copyWorldToInner(t, e.__nowWorld, e.__layout.renderBounds), n.filter = "none";
	},
	backgroundBlur: function(e, t, n) {},
	getShadowRenderSpread: Rg,
	getShadowTransform: function(e, t, n, r, i, a, o) {
		if (r.spread) {
			let n = 2 * r.spread * a * (o ? -1 : 1), { width: s, height: c } = e.__layout.strokeBounds;
			return Ig.set().scaleOfOuter({
				x: (i.x + i.width / 2) * t.pixelRatio,
				y: (i.y + i.height / 2) * t.pixelRatio
			}, 1 + n / s, 1 + n / c), Ig;
		}
	},
	isTransformShadow(e) {},
	getInnerShadowSpread: Rg
}, { excludeRenderBounds: Ug } = Rl, Wg;
function Gg(e, t, n, r, i, a, o, s) {
	switch (t) {
		case "grayscale": Wg || (Wg = !0, i.useGrayscaleAlpha(e.__nowWorld));
		case "alpha":
			(function(e, t, n, r, i, a) {
				let o = e.__nowWorld;
				n.resetTransform(), n.opacity = 1, n.useMask(r, o), a && r.recycle(o), qg(e, t, n, 1, i, a);
			})(e, n, r, i, o, s);
			break;
		case "opacity-path":
			qg(e, n, r, a, o, s);
			break;
		case "path": s && n.restore();
	}
}
function Kg(e) {
	return e.getSameCanvas(!1, !0);
}
function qg(e, t, n, r, i, a) {
	let o = e.__nowWorld;
	t.resetTransform(), t.opacity = r, t.copyWorld(n, o, void 0, i), a ? n.recycle(o) : n.clearWorld(o);
}
If.prototype.__renderMask = function(e, t) {
	let n, r, i, a, o, s, { children: c } = this;
	for (let l = 0, u = c.length; l < u; l++) {
		if (n = c[l], s = n.__.mask, s) {
			o && (Gg(this, o, e, i, r, a, void 0, !0), r = i = null), s !== "clipping" && s !== "clipping-path" || Ug(n, t) || n.__render(e, t), a = n.__.opacity, Wg = !1, s === "path" || s === "clipping-path" ? (a < 1 ? (o = "opacity-path", i ||= Kg(e)) : (o = "path", e.save()), n.__clip(i || e, t)) : (o = s === "grayscale" ? "grayscale" : "alpha", r ||= Kg(e), i ||= Kg(e), n.__render(r, t));
			continue;
		}
		let u = a === 1 && n.__.__blendMode;
		u && Gg(this, o, e, i, r, a, void 0, !1), Ug(n, t) || n.__render(i || e, t), u && Gg(this, o, e, i, r, a, u, !1);
	}
	Gg(this, o, e, i, r, a, void 0, !0);
};
var Jg = ">)]}%!?,.:;'\"》）」〉』〗】〕｝┐＞’”！？，、。：；‰", Yg = ">)]}%!?,.:;'\"》）」〉』〗】〕｝┐＞’”！？，、。：；‰_#~&*+\\=|≮≯≈≠＝…", Xg = new RegExp([
	[19968, 40959],
	[13312, 19903],
	[131072, 173791],
	[173824, 177983],
	[177984, 178207],
	[178208, 183983],
	[183984, 191471],
	[196608, 201551],
	[201552, 205743],
	[11904, 12031],
	[12032, 12255],
	[12272, 12287],
	[12288, 12351],
	[12736, 12783],
	[12800, 13055],
	[13056, 13311],
	[63744, 64255],
	[65072, 65103],
	[127488, 127743],
	[194560, 195103]
].map(([e, t]) => `[\\u${e.toString(16)}-\\u${t.toString(16)}]`).join("|"));
function Zg(e) {
	let t = {};
	return e.split("").forEach((e) => t[e] = !0), t;
}
var Qg = Zg("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz"), $g = Zg("{[(<'\"《（「〈『〖【〔｛┌＜‘“＝¥￥＄€£￡¢￠"), e_ = Zg(Jg), t_ = Zg(Yg), n_ = Zg("- —／～｜┆·"), r_;
(function(e) {
	e[e.Letter = 0] = "Letter", e[e.Single = 1] = "Single", e[e.Before = 2] = "Before", e[e.After = 3] = "After", e[e.Symbol = 4] = "Symbol", e[e.Break = 5] = "Break";
})(r_ ||= {});
var { Letter: i_, Single: a_, Before: o_, After: s_, Symbol: c_, Break: l_ } = r_;
function u_(e) {
	return Qg[e] ? i_ : n_[e] ? l_ : $g[e] ? o_ : e_[e] ? s_ : t_[e] ? c_ : Xg.test(e) ? a_ : i_;
}
var d_ = { trimRight(e) {
	let { words: t } = e, n, r = 0, i = t.length;
	for (let a = i - 1; a > -1 && (n = t[a].data[0], n.char === " "); a--) r++, e.width -= n.width;
	r && t.splice(i - r, r);
} };
function f_(e, t, n) {
	switch (t) {
		case "title": return n ? e.toUpperCase() : e;
		case "upper": return e.toUpperCase();
		case "lower": return e.toLowerCase();
		default: return e;
	}
}
var { trimRight: p_ } = d_, { Letter: m_, Single: h_, Before: g_, After: __, Symbol: v_, Break: y_ } = r_, b_, x_, S_, C_, w_, T_, E_, D_, O_, k_, A_, j_, M_, N_, P_, F_, I_, L_ = [];
function R_(e, t) {
	O_ && !D_ && (D_ = O_), b_.data.push({
		char: e,
		width: t
	}), S_ += t;
}
function z_() {
	C_ += S_, b_.width = S_, x_.words.push(b_), b_ = { data: [] }, S_ = 0;
}
function B_() {
	N_ &&= (P_.paraNumber++, x_.paraStart = !0, !1), O_ && (x_.startCharSize = D_, x_.endCharSize = O_, D_ = 0), x_.width = C_, F_.width ? p_(x_) : I_ && V_(), L_.push(x_), x_ = { words: [] }, C_ = 0;
}
function V_() {
	C_ > (P_.maxWidth || 0) && (P_.maxWidth = C_);
}
var { top: H_, right: U_, bottom: W_, left: G_ } = Jr;
function K_(e, t, n) {
	let { bounds: r, rows: i } = e;
	r[t] += n;
	for (let e = 0; e < i.length; e++) i[e][t] += n;
}
Object.assign(qd, { getDrawData: function(e, t) {
	Vn(e) || (e = String(e));
	let n = 0, r = 0, i = t.__getInput("width") || 0, a = t.__getInput("height") || 0, { __padding: o } = t;
	t.motionText && (i = a = 0), o && (i ? (n = o[G_], i -= o[U_] + o[G_], !i && (i = .01)) : t.autoSizeAlign || (n = o[G_]), a ? (r = o[H_], a -= o[H_] + o[W_], !a && (a = .01)) : t.autoSizeAlign || (r = o[H_]));
	let s = {
		bounds: {
			x: n,
			y: r,
			width: i,
			height: a
		},
		rows: [],
		paraNumber: 0,
		font: V.canvas.font = t.__font
	};
	return function(e, t, n) {
		P_ = e, L_ = e.rows, F_ = e.bounds, I_ = !F_.width && !n.autoSizeAlign;
		let { __letterSpacing: r, paraIndent: i, textCase: a } = n, { canvas: o } = V, { width: s } = F_;
		if (n.__isCharMode) {
			let e = n.textWrap !== "none", c = n.textWrap === "break";
			N_ = !0, A_ = null, D_ = E_ = O_ = S_ = C_ = 0, b_ = { data: [] }, x_ = { words: [] };
			for (let n = 0, l = (t = [...t]).length; n < l; n++) T_ = t[n], T_ === "\n" ? (S_ && z_(), x_.paraEnd = !0, B_(), N_ = !0) : (k_ = u_(T_), k_ === m_ && a !== "none" && (T_ = f_(T_, a, !S_)), E_ = o.measureText(T_).width, r && (r < 0 && (O_ = E_), E_ += r), j_ = k_ === h_ && (A_ === h_ || A_ === m_) || A_ === h_ && k_ !== __, M_ = !(k_ !== g_ && k_ !== h_ || A_ !== v_ && A_ !== __), w_ = N_ && i ? s - i : s, e && s && C_ + S_ + E_ > w_ && (c ? (S_ && z_(), C_ && B_()) : (M_ ||= k_ === m_ && A_ == __, (j_ || M_ || k_ === y_ || k_ === g_ || k_ === h_ || S_ + E_ > w_) && S_ && z_(), C_ && B_())), T_ === " " && !0 !== N_ && C_ + S_ === 0 || (k_ === y_ ? (T_ === " " && S_ && z_(), R_(T_, E_), z_()) : ((j_ || M_) && S_ && z_(), R_(T_, E_))), A_ = k_);
			S_ && z_(), C_ && B_(), L_.length > 0 && (L_[L_.length - 1].paraEnd = !0);
		} else t.split("\n").forEach((e) => {
			P_.paraNumber++, C_ = o.measureText(e).width, L_.push({
				x: i || 0,
				text: e,
				width: C_,
				paraStart: !0
			}), I_ && V_();
		});
	}(s, e, t), o && function(e, t, n, r, i) {
		if (!r && n.autoSizeAlign) switch (n.textAlign) {
			case "left":
				K_(t, "x", e[G_]);
				break;
			case "right": K_(t, "x", -e[U_]);
		}
		if (!i && n.autoSizeAlign) switch (n.verticalAlign) {
			case "top":
				K_(t, "y", e[H_]);
				break;
			case "bottom": K_(t, "y", -e[W_]);
		}
	}(o, s, t, i, a), function(e, t) {
		let { rows: n, bounds: r } = e, i = n.length, { __lineHeight: a, __baseLine: o, __letterSpacing: s, __clipText: c, textAlign: l, verticalAlign: u, paraSpacing: d, autoSizeAlign: f } = t, { x: p, y: m, width: h, height: g } = r, _ = a * i + (d ? d * (e.paraNumber - 1) : 0), v = o;
		if (c && _ > g) _ = Math.max(t.__autoHeight ? _ : g, a), i > 1 && (e.overflow = i);
		else if (g || f) switch (u) {
			case "middle":
				m += (g - _) / 2;
				break;
			case "bottom": m += g - _;
		}
		v += m;
		let y, b, x, S = h || f ? h : e.maxWidth;
		for (let o = 0, u = i; o < u; o++) {
			if (y = n[o], y.x = p, y.width < h || y.width > h && !c) switch (l) {
				case "center":
					y.x += (S - y.width) / 2;
					break;
				case "right": y.x += S - y.width;
			}
			y.paraStart && d && o > 0 && (v += d), y.y = v, v += a, e.overflow > o && v > _ && (y.isOverflow = !0, e.overflow = o + 1), b = y.x, x = y.width, s < 0 && (y.width < 0 ? (x = -y.width + t.fontSize + s, b -= x, x += t.fontSize) : x -= s), b < r.x && (r.x = b), x > r.width && (r.width = x), c && h && h < x && (y.isOverflow = !0, e.overflow ||= n.length);
		}
		r.y = m, r.height = _;
	}(s, t), t.__isCharMode && function(e, t, n) {
		let { rows: r } = e, { textAlign: i, paraIndent: a } = t, o = t.__letterSpacing || t.motionText, s = n && i.includes("both"), c = s || n && i.includes("justify"), l = c && i.includes("letter"), u, d, f, p, m, h, g, _, v, y;
		r.forEach((e) => {
			e.words &&= (m = a && e.paraStart ? a : 0, _ = e.words.length, c && (y = !e.paraEnd || s, d = n - e.width - m, l ? p = d / (e.words.reduce((e, t) => e + t.data.length, 0) - 1) : f = _ > 1 ? d / (_ - 1) : 0), h = o || e.isOverflow || l ? 0 : f ? 1 : 2, e.isOverflow && !o && (e.textMode = !0), h === 2 ? (e.x += m, function(e) {
				e.text = "", e.words.forEach((t) => {
					t.data.forEach((t) => {
						e.text += t.char;
					});
				});
			}(e)) : (e.x += m, u = e.x, e.data = [], e.words.forEach((t, n) => {
				h === 1 ? (g = {
					char: "",
					x: u
				}, u = function(e, t, n) {
					return e.forEach((e) => {
						n.char += e.char, t += e.width;
					}), t;
				}(t.data, u, g), (e.isOverflow || g.char !== " ") && e.data.push(g)) : u = function(e, t, n, r, i) {
					return e.forEach((e) => {
						(r || e.char !== " ") && (e.x = t, n.push(e)), t += e.width, i && (t += i);
					}), t;
				}(t.data, u, e.data, e.isOverflow, y && p), y && (v = n === _ - 1, f ? v || (u += f, e.width += f) : p && (e.width += p * (t.data.length - +!!v)));
			})), null);
		});
	}(s, t, i), s.overflow && function(e, t, n, r) {
		let { rows: i, overflow: a } = e, { textOverflow: o } = t;
		if (a && i.splice(a), r && o && o !== "show") {
			let e, s;
			o === "hide" ? o = "" : o === "ellipsis" && (o = "...");
			let c = o ? V.canvas.measureText(o).width : 0, l = n + r - c;
			(t.textWrap === "none" ? i : [i[a - 1]]).forEach((t) => {
				if (t.isOverflow && t.data) {
					let n = t.data.length - 1;
					for (let r = n; r > -1 && (e = t.data[r], s = e.x + e.width, !(r === n && s < l)); r--) {
						if (s < l && e.char !== " " || !r) {
							t.data.splice(r + 1), t.width -= e.width;
							break;
						}
						t.width -= e.width;
					}
					t.width += c, t.data.push({
						char: o,
						x: s
					}), t.textMode && function(e) {
						e.text = "", e.data.forEach((t) => {
							e.text += t.char;
						}), e.data = null;
					}(t);
				}
			});
		}
	}(s, t, n, i), t.textDecoration !== "none" && function(e, t) {
		let n, r = 0, { fontSize: i, textDecoration: a } = t;
		switch (e.decorationHeight = i / 11, Gn(a) ? (n = a.type, a.color && (e.decorationColor = Jd.string(a.color)), a.offset && (r = Math.min(.3 * i, Math.max(a.offset, .15 * -i)))) : n = a, n) {
			case "under":
				e.decorationY = [.15 * i + r];
				break;
			case "delete":
				e.decorationY = [.35 * -i];
				break;
			case "under-delete": e.decorationY = [.15 * i + r, .35 * -i];
		}
	}(s, t), s;
} }), Object.assign(Jd, { string: function(e, t) {
	if (!e) return "#000";
	let n = Un(t) && t < 1;
	if (Vn(e)) {
		if (!n || !Jd.object) return e;
		e = Jd.object(e);
	}
	let r = P(e.a) ? 1 : e.a;
	n && (r *= t);
	let i = e.r + "," + e.g + "," + e.b;
	return r === 1 ? "rgb(" + i + ")" : "rgba(" + i + "," + r + ")";
} }), Object.assign(Y, jh), Object.assign(Zd, ug), Object.assign(Qd, kg), Object.assign($d, Hg), Object.assign(Ii, {
	interaction: (e, t, n, r) => new ph(e, t, n, r),
	hitCanvas: (e, t) => new Hm(e, t),
	hitCanvasManager: () => new Tm()
}), Um();
//#endregion
//#region node_modules/@leafer-in/viewport/dist/viewport.esm.min.js
function q_(e) {
	let { scroll: t, disabled: n } = e.app.config.move;
	return !t || n ? "" : !0 === t ? "free" : t;
}
function J_(e, t, n) {
	Y_(e.parentApp ? e.parentApp : e, t), e.isApp || n || e.__eventIds.push(e.on_(tm.BEFORE_MOVE, (t) => {
		let n = q_(e).includes("limit"), r = e.app.config.move.scrollLimit === "stop", i = e.getValidMove(t.moveX, t.moveY, n && r);
		if (n && !r) {
			let n = e.getValidMove(0, 0);
			if (n.x || n.y) {
				let e = t.moveType === "drag" ? .3 : .05;
				Math.abs(n.x) > 100 ? i.x = 0 : i.x *= e, Math.abs(n.y) > 200 ? i.y = 0 : i.y *= e;
			}
		}
		e.zoomLayer.move(i);
	}), e.on_(tm.DRAG_ANIMATE, () => {
		let t = e.getValidMove(0, 0);
		(t.x || t.y) && e.interaction.stopDragAnimate();
	}), e.on_(tm.END, (t) => {
		Al.animateMove(e.zoomLayer, e.getValidMove(t.moveX, t.moveY));
	}), e.on_(am.BEFORE_ZOOM, (t) => {
		let { zoomLayer: n, layouter: r } = e, i = e.getValidScale(t.scale);
		i !== 1 && (r.stop(), Al.updateMatrix(e), n.scaleOfWorld(t, i), r.start());
	}));
}
function Y_(e, t) {
	let n = {
		wheel: { preventDefault: !0 },
		touch: { preventDefault: !0 },
		pointer: { preventDefaultMenu: !0 }
	};
	t && F.assign(n, t), F.assign(e.config, n, e.userConfig);
}
var X_ = Oi.get("LeaferTypeCreator"), Z_ = {
	list: {},
	register(e, t) {
		Q_[e] && X_.repeat(e), Q_[e] = t;
	},
	run(e, t) {
		let n = Q_[e];
		n && n(t);
	}
}, { list: Q_, register: $_ } = Z_;
$_("viewport", J_), $_("custom", function(e) {
	J_(e, null, !0);
}), $_("design", function(e) {
	J_(e, {
		zoom: {
			min: .01,
			max: 256
		},
		move: {
			holdSpaceKey: !0,
			holdMiddleKey: !0
		}
	});
}), $_("document", function(e) {
	J_(e, {
		zoom: { min: 1 },
		move: { scroll: "limit" }
	});
});
var ev = {
	state: {
		type: "none",
		typeCount: 0,
		startTime: 0,
		totalData: null,
		center: {}
	},
	getData(e) {
		let t = e[0], n = e[1], r = R.getCenter(t.from, n.from), i = R.getCenter(t.to, n.to), a = {
			x: i.x - r.x,
			y: i.y - r.y
		}, o = R.getDistance(t.from, n.from);
		return {
			move: a,
			scale: R.getDistance(t.to, n.to) / o,
			rotation: R.getRotation(t.from, n.from, t.to, n.to),
			center: i
		};
	},
	getType(e, t) {
		let n = Math.hypot(e.move.x, e.move.y) / (t.move || 5), r = Math.abs(e.scale - 1) / (t.scale || .03), i = Math.abs(e.rotation) / (t.rotation || 2);
		return n < 1 && r < 1 && i < 1 ? "none" : n >= r && n >= i ? "move" : r >= i ? "zoom" : "rotate";
	},
	detect(e, t) {
		let { state: n } = tv, r = tv.getType(e, t);
		if (n.totalData || (n.startTime = Date.now(), n.center = e.center), tv.add(e, n.totalData), n.totalData = e, r === n.type) {
			if (n.typeCount++, n.typeCount >= (t.count || 3) && r !== "none") return r;
		} else n.type = r, n.typeCount = 1;
		return Date.now() - n.startTime >= (t.time || 160) ? tv.getType(n.totalData, t) : "none";
	},
	add(e, t) {
		t && (R.move(e.move, t.move), e.scale *= t.scale, e.rotation += t.rotation, e.center = t.center);
	},
	reset() {
		let { state: e } = tv;
		e.type = "none", e.typeCount = 0, e.startTime = 0, e.totalData = null;
	}
}, tv = ev, { abs: nv, max: rv } = Math, { sign: iv, within: av } = mr, ov = {
	getMove(e, t) {
		let { moveSpeed: n } = t, { deltaX: r, deltaY: i } = e;
		e.shiftKey && !r && (r = i, i = 0);
		let a = nv(r), o = nv(i);
		return a > 50 && (r = rv(50, a / 3) * iv(r)), o > 50 && (i = rv(50, o / 3) * iv(i)), {
			x: -r * n * 2,
			y: -i * n * 2
		};
	},
	getScale(e, t) {
		let n, r = 1, { zoomMode: i, zoomSpeed: a } = t, o = e.deltaY || e.deltaX;
		if (i ? (n = i === "mouse" || !e.deltaX && (V.intWheelDeltaY ? Math.abs(o) > 17 : Math.ceil(o) !== o), (e.shiftKey || e.metaKey || e.ctrlKey) && (n = !0)) : n = !e.shiftKey && (e.metaKey || e.ctrlKey), n) {
			a = av(a, 0, 1);
			let n = e.deltaY ? t.delta.y : t.delta.x, i = av(1 - nv(o) / (4 * n) * a, .5, 2);
			r = o > 0 ? i : 1 / i;
		}
		return r;
	}
}, sv, cv, lv, uv, dv = class {
	get transforming() {
		return this.moving || this.zooming || this.rotating;
	}
	get moving() {
		return !!this.moveData;
	}
	get zooming() {
		return !!this.zoomData;
	}
	get rotating() {
		return !!this.rotateData;
	}
	constructor(e) {
		this.interaction = e;
	}
	move(e) {
		let { interaction: t } = this;
		e.moveType ||= "move", this.moveData || (this.setPath(e), sv = 0, cv = 0, this.moveData = Object.assign(Object.assign({}, e), {
			moveX: 0,
			moveY: 0,
			totalX: sv,
			totalY: cv
		}), t.emit(tm.START, this.moveData)), e.path = this.moveData.path, e.totalX = sv += e.moveX, e.totalY = cv += e.moveY, t.emit(tm.BEFORE_MOVE, e), t.emit(tm.MOVE, e), this.transformEndWait();
	}
	zoom(e) {
		let { interaction: t } = this;
		this.zoomData || (this.setPath(e), lv = 1, this.zoomData = Object.assign(Object.assign({}, e), {
			scale: 1,
			totalScale: lv
		}), t.emit(am.START, this.zoomData)), e.path = this.zoomData.path, e.totalScale = lv *= e.scale, t.emit(am.BEFORE_ZOOM, e), t.emit(am.ZOOM, e), this.transformEndWait();
	}
	rotate(e) {
		let { interaction: t } = this;
		this.rotateData || (this.setPath(e), uv = 0, this.rotateData = Object.assign(Object.assign({}, e), {
			rotation: 0,
			totalRotation: uv
		}), t.emit(rm.START, this.rotateData)), e.path = this.rotateData.path, e.totalRotation = uv += e.rotation, t.emit(rm.BEFORE_ROTATE, e), t.emit(rm.ROTATE, e), this.transformEndWait();
	}
	setPath(e) {
		let { interaction: t } = this, { path: n } = t.selector.getByPoint(e, t.hitRadius);
		e.path = n, t.cancelHover();
	}
	transformEndWait() {
		clearTimeout(this.transformTimer), this.transformTimer = setTimeout(() => {
			this.transformEnd();
		}, this.interaction.p.transformTime);
	}
	transformEnd() {
		let { interaction: e, moveData: t, zoomData: n, rotateData: r } = this;
		t && e.emit(tm.END, Object.assign(Object.assign({}, t), {
			totalX: sv,
			totalY: cv
		})), n && e.emit(am.END, Object.assign(Object.assign({}, n), { totalScale: lv })), r && e.emit(rm.END, Object.assign(Object.assign({}, r), { totalRotation: uv })), this.reset();
	}
	reset() {
		this.zoomData = this.moveData = this.rotateData = null;
	}
	destroy() {
		this.reset();
	}
}, fv = zf.prototype, pv = new yi(), mv = new Wr();
function hv(e, t) {
	return Object.assign(Object.assign({}, t), {
		moveX: e.x,
		moveY: e.y
	});
}
function gv(e, t) {
	return Object.assign(Object.assign({}, t), { scale: e });
}
fv.initType = function(e) {
	Z_.run(e, this);
}, fv.getValidMove = function(e, t, n = !0) {
	let { disabled: r, scrollSpread: i } = this.app.config.move;
	mv.set(e, t);
	let a = q_(this);
	return a && (a.includes("x") ? mv.y = 0 : a.includes("y") ? mv.x = 0 : Math.abs(mv.x) > Math.abs(mv.y) ? mv.y = 0 : mv.x = 0, n && a.includes("limit") && (pv.set(this.__world).addPoint(this.zoomLayer), i && pv.spread(i), Zp.getValidMove(pv, this.canvas.bounds, "auto", mv, !0), a.includes("x") ? mv.y = 0 : a.includes("y") && (mv.x = 0))), {
		x: r ? 0 : mv.x,
		y: r ? 0 : mv.y
	};
}, fv.getValidScale = function(e) {
	let { scaleX: t } = this.zoomLayer.__, { min: n, max: r, disabled: i } = this.app.config.zoom, a = Math.abs(t * e);
	return n && a < n ? e = n / t : r && a > r && (e = r / t), i ? 1 : e;
};
var _v = Cm.prototype;
_v.createTransformer = function() {
	this.transformer = new dv(this);
}, _v.move = function(e) {
	this.transformer.move(e);
}, _v.zoom = function(e) {
	this.transformer.zoom(e);
}, _v.rotate = function(e) {
	this.transformer.rotate(e);
}, _v.transformEnd = function() {
	this.transformer.transformEnd();
}, _v.wheel = function(e) {
	let { wheel: t, pointer: n } = this.config, { posDeltaSpeed: r, negDeltaSpeed: i } = t;
	if (t.disabled) return;
	e.deltaX > 0 ? r && (e.deltaX *= r) : i && (e.deltaX *= i), e.deltaY > 0 ? r && (e.deltaY *= r) : i && (e.deltaY *= i);
	let a = t.getScale ? t.getScale(e, t) : ov.getScale(e, t);
	if (a !== 1) this.zoom(gv(a, e));
	else {
		let r = t.getMove ? t.getMove(e, t) : ov.getMove(e, t);
		n.snap && R.round(r), this.move(hv(r, e));
	}
}, _v.multiTouch = function(e, t) {
	let { disabled: n, singleGesture: r } = this.config.multiTouch;
	if (n) return;
	this.pointerWaitCancel();
	let i = ev.getData(t), { moving: a, zooming: o, rotating: s } = this.transformer;
	if (r) {
		if (!this.transformer.transforming) {
			switch (ev.detect(i, Gn(r) ? r : {})) {
				case "move":
					a = !0;
					break;
				case "zoom":
					o = !0;
					break;
				case "rotate":
					s = !0;
					break;
				default: return;
			}
			ev.reset();
		}
		a || (i.center = ev.state.center);
	} else a = o = s = !0;
	var c, l;
	Object.assign(e, i.center), e.multiTouch = !0, s && this.rotate((c = i.rotation, l = e, Object.assign(Object.assign({}, l), { rotation: c }))), o && this.zoom(gv(i.scale, e)), a && this.move(hv(i.move, e));
};
var vv = pm.prototype, { abs: yv, min: bv, max: xv, hypot: Sv } = Math;
vv.checkDragEndAnimate = function(e) {
	let { interaction: t } = this, n = this.canAnimate && this.moving && t.m.dragAnimate;
	if (n) {
		let r = Un(n) ? n : .95, i = .15, a, o, s, c = 0, l = 0, u = 0, d = 0, f = 3, { dragDataList: p } = this, m = p.length;
		for (let e = m - 1; e >= xv(m - 3, 0) && (s = p[e], !(s.time && Date.now() - s.time > 100)); e--) a = f--, c += s.moveX * a, l += s.moveY * a, d += a, o = Sv(s.moveX, s.moveY), o > u && (u = o);
		if (d && (c /= d, l /= d), u > 8) {
			let e = 1.15 + bv((u - 8) / 17, 1) * .4500000000000002;
			c *= e, l *= e;
		}
		let h = xv(yv(c), yv(l));
		h > 150 && (o = 150 / h, c *= o, l *= o);
		let g = () => {
			if (c *= r, l *= r, e = Object.assign({}, e), yv(c) < i && yv(l) < i) return this.dragEndReal(e);
			R.move(e, c, l), this.drag(e), this.animate(g), t.emit(tm.DRAG_ANIMATE, e);
		};
		this.animate(g);
	}
	return n;
}, vv.animate = function(e, t) {
	let n = e || this.animateWait;
	n && this.interaction.target.nextRender(n, null, t), this.animateWait = e;
}, vv.stopAnimate = function() {
	this.animate(null, "off"), this.interaction.target.nextRender(() => {
		this.dragData && this.dragEndReal(this.dragData);
	});
}, vv.checkDragOut = function(e) {
	let { interaction: t } = this;
	this.autoMoveCancel(), this.dragging && !t.shrinkCanvasBounds.hitPoint(e) && this.autoMoveOnDragOut(e);
}, vv.autoMoveOnDragOut = function(e) {
	let { interaction: t, downData: n, canDragOut: r } = this, { autoDistance: i, dragOut: a } = t.m;
	if (!a || !r || !i) return;
	let o = t.shrinkCanvasBounds, { x: s, y: c } = o, l = z.maxX(o), u = z.maxY(o), d = e.x < s ? i : l < e.x ? -i : 0, f = e.y < c ? i : u < e.y ? -i : 0, p = 0, m = 0;
	this.autoMoveTimer = setInterval(() => {
		p += d, m += f, R.move(n, d, f), R.move(this.dragData, d, f), t.move(Object.assign(Object.assign({}, e), {
			moveX: d,
			moveY: f,
			totalX: p,
			totalY: m,
			moveType: "drag"
		})), t.pointerMoveReal(e);
	}, 10);
}, vv.autoMoveCancel = function() {
	this.autoMoveTimer &&= (clearInterval(this.autoMoveTimer), 0);
}, Fi.add("viewport");
//#endregion
//#region node_modules/@leafer-in/view/dist/view.esm.min.js
function Cv(e, t) {
	let n = 1, r = t === "out", i = Math.abs(e);
	if (i > 1) {
		for (; r ? n < i : n <= i;) n *= 2;
		r && (n /= 2);
	} else {
		for (; r ? n >= i : n > i;) n /= 2;
		r || (n *= 2);
	}
	return n / e;
}
Fi.add("view"), zf.prototype.zoom = function(e, t, n, r) {
	let i;
	Kn(t) ? (i = t.padding, n = t.scroll, r = t.transition) : i = t;
	let { zoomLayer: a } = this, o = this.canvas.bounds.clone().shrink(Bn(i) ? 30 : i), s = new yi(), c = {
		x: o.x + o.width / 2,
		y: o.y + o.height / 2
	}, l;
	a.killAnimate();
	let { x: u, y: d, scaleX: f, scaleY: p } = a.__, { boxBounds: m } = a;
	if (Vn(e)) switch (e) {
		case "in":
			l = Cv(f, "in");
			break;
		case "out":
			l = Cv(f, "out");
			break;
		case "fit":
			e = m;
			break;
		case "fit-width":
			(e = new yi(m)).height = 0;
			break;
		case "fit-height": (e = new yi(m)).width = 0;
	}
	else Un(e) && (l = e / f);
	if (l) l = this.getValidScale(l), a.scaleOfWorld(c, l, l, !1, r);
	else if (Gn(e)) {
		let t = {
			x: u,
			y: d,
			scaleX: f,
			scaleY: p
		}, i = Wn(e);
		if (i || e.tag) {
			let t = i ? e : [e];
			s.setListWithFn(t, Rl.worldBounds);
		} else {
			let t = function(e, t) {
				let n, { x: r, y: i, width: a, height: o } = e;
				return o || (o = a * (t.height / t.width), n = !0), a || (a = o * (t.width / t.height), n = !0), n ? {
					x: r,
					y: i,
					width: a,
					height: o
				} : e;
			}(e, o);
			s.set(a.getWorldBounds(t));
		}
		let { width: c, height: m } = s, h = o.x - s.x, g = o.y - s.y;
		return n ? (h += Math.max((o.width - c) / 2, 0), g += Math.max((o.height - m) / 2, 0)) : (l = this.getValidScale(Math.min(o.width / c, o.height / m)), h += (o.width - c * l) / 2, g += (o.height - m * l) / 2, R.scaleOf(t, s, l), s.scaleOf(s, l), t.scaleX *= l, t.scaleY *= l), n === "x" ? g = 0 : n === "y" && (h = 0), R.move(t, h, g), s.move(h, g), a.set(t, r), s;
	}
	return a.worldBoxBounds;
};
//#endregion
//#region ../packages/core/color.js
function wv(e, t) {
	if (!e || e === "none") return `rgba(128,128,128,${t})`;
	let n = String(e).replace("#", "");
	if (n.length === 3 && (n = n[0] + n[0] + n[1] + n[1] + n[2] + n[2]), n.length !== 6) return `rgba(128,128,128,${t})`;
	let r = parseInt(n, 16);
	return `rgba(${r >> 16 & 255},${r >> 8 & 255},${r & 255},${t})`;
}
function Tv(e, t) {
	let n = String(e || "").trim(), r = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(n);
	if (r) {
		let e = r[1];
		e.length === 3 && (e = e.split("").map((e) => e + e).join(""));
		let n = parseInt(e, 16);
		return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${t})`;
	}
	let i = /^rgba?\(([^)]+)\)$/i.exec(n);
	return i ? `rgba(${i[1].split(",").slice(0, 3).map((e) => e.trim()).join(",")},${t})` : `rgba(51,65,85,${t})`;
}
function Ev(e) {
	let t = parseInt(String(e).slice(1), 16);
	return .299 * (t >> 16 & 255) + .587 * (t >> 8 & 255) + .114 * (t & 255);
}
function Dv(e) {
	let t = Math.round(Ev(e) * .55 + 70);
	return `rgb(${t},${t},${t})`;
}
//#endregion
//#region ../packages/core/text.js
function Ov(e, t) {
	let n = 0;
	for (let t of String(e)) n += t.charCodeAt(0) > 255 ? 1 : .6;
	return n * t;
}
//#endregion
//#region \0plugin-vue:export-helper
var kv = (e, t) => {
	let n = e.__vccOpts || e;
	for (let [e, r] of t) n[e] = r;
	return n;
}, Av = { class: "preview-box" }, jv = /*#__PURE__*/ kv({
	__name: "PreviewModal",
	props: { open: Boolean },
	emits: ["close"],
	setup(e, { emit: n }) {
		let r = e, c = n, l = x(null), u = null, d = x(!1), f = 1;
		function m(e) {
			return +(12 / (e?.baseScale || 1)).toFixed(2);
		}
		function h(e, t) {
			return t?.categories?.find((t) => t.key === e)?.color || "#9ca3af";
		}
		function g(e, t) {
			return e.status === "available" ? h(e.cat, t) : "rgb(180,185,195)";
		}
		let _ = (e) => +e.toFixed(2);
		function b(e, t, n) {
			return `M${_(e - n)} ${_(t)}A${n} ${n} 0 1 0 ${_(e + n)} ${_(t)}A${n} ${n} 0 1 0 ${_(e - n)} ${_(t)}Z`;
		}
		function S(e, t, n) {
			let r = qe(e), i = !!r.text, a = r.logo?.src ? r.logo : null;
			if (!r.visible || !i && !a || !e.path || e.loose) return;
			let o = He(e);
			if (!o) return;
			let s = he(e.path);
			if (s.length < 3) return;
			let c = r.fontSize, l = i ? Ov(r.text, c) : 0, u = a ? a.width > 0 ? a.width : 20 : 0, d = a ? u * (a.ratio > 0 ? a.ratio : .6) : 0, f = Math.min(1, Math.max(0, r.opacity ?? .18)), p = new If({ hittable: !1 }), m = new If({
				x: o.cx,
				y: o.cy,
				rotation: r.rotation || 0,
				origin: "center",
				hittable: !1
			}), h = Math.max(i ? l + c * 1.6 : 0, a ? u * 2 : 0), g = Math.max(i ? c * 2.6 : 0, a ? d * 2.2 : 0) * (r.rowGap > 0 ? r.rowGap : 1), _ = Math.hypot(o.w, o.h) / 2 + h, v = Math.ceil(_ * 2 / h) * Math.ceil(_ * 2 / g);
			if (v > 400) {
				let e = Math.sqrt(v / 400);
				h *= e, g *= e;
			}
			let y = (r.rotation || 0) * Math.PI / 180, b = Math.cos(y), x = Math.sin(y), S = o.cx, C = o.cy, w = (e, t) => Se(S + e * b - t * x, C + e * x + t * b, s), T = Tv(r.color, f), ee = 0;
			for (let e = -_; e <= _ + .01; e += g, ee++) {
				let t = ee % 2 ? h / 2 : 0, n = !!a && (!i || ee % 2 == 1);
				for (let i = -_; i <= _ + .01; i += h) w(i + t, e) && (n ? m.add(new Ep({
					url: a.src,
					x: i + t - u / 2,
					y: e - d / 2,
					width: u,
					height: d,
					opacity: f,
					hittable: !1
				})) : m.add(new Z({
					text: r.text,
					x: i + t - l / 2,
					y: e - c / 2,
					width: l,
					height: c,
					fontSize: c,
					textAlign: "center",
					verticalAlign: "middle",
					fill: T,
					hittable: !1
				})));
			}
			p.add(m), t.add(p);
		}
		function C(e) {
			if (!u) return;
			u.tree.clear();
			let t = new If(), n = e.stage;
			if (n) {
				let e = new If();
				e.add(new Bf({
					x: n.x,
					y: n.y,
					width: n.w,
					height: n.h,
					fill: "#e2e6ec",
					cornerRadius: 12,
					stroke: "#c3c9d3",
					strokeWidth: 2
				}));
				let r = Math.min(n.h / 3, 80);
				e.add(new Z({
					text: n.label,
					fontSize: r,
					fontWeight: "bold",
					fill: "rgba(30,41,59,0.5)",
					x: n.x + n.w / 2 - Ov(n.label, r) / 2,
					y: n.y + n.h / 2 - r / 2
				})), t.add(e);
			}
			let r = m(e);
			for (let n of e.sections || []) {
				if (!n.visible) continue;
				let i = new If(), a = Ve(n, e.categories) || n.color || "#9ca3af";
				n.path && !n.loose && i.add(new Mp({
					path: n.path,
					fill: wv(a, .15),
					stroke: wv(a, .5),
					strokeWidth: 1
				})), S(n, i, e);
				let o = /* @__PURE__ */ new Map(), s = r / 2;
				for (let t of n.rows) for (let n of t.seats) {
					let t = g(n, e);
					o.set(t, (o.get(t) || "") + b(n.x, n.y, s));
				}
				for (let [e, t] of o) i.add(new Mp({
					path: t,
					fill: e
				}));
				let c = Ge(n), l = c.text || n.name;
				if (c.visible && l && !n.loose) {
					let e = He(n);
					if (e) {
						let t = Math.min(c.fontSize > 0 ? c.fontSize : 14, e.h * .6), n = Math.max(e.w, Ov(l, t));
						i.add(new Z({
							text: l,
							fontSize: t,
							fontWeight: "bold",
							fill: "rgba(30,41,59,0.4)",
							width: n,
							height: t,
							textAlign: "center",
							verticalAlign: "middle",
							rotation: c.rotation || 0,
							x: e.cx + (c.dx || 0) - n / 2,
							y: e.cy + (c.dy || 0) - t / 2,
							hittable: !1
						}));
					}
				}
				t.add(i);
			}
			u.tree.add(t), u.tree.zoom("fit"), f = u.tree.scaleX || 1, d.value = !1;
		}
		function w() {
			u && (u.tree.zoom("fit"), f = u.tree.scaleX || 1, d.value = !1);
		}
		function T() {
			l.value && (u = new Fp({
				view: l.value,
				fill: "#f0f2f5",
				tree: { type: "design" },
				wheel: { preventDefault: !0 },
				zoom: {
					min: .02,
					max: 64
				}
			}), u.tree.on(am.ZOOM, () => {
				d.value = (u.tree.scaleX || 1) > f * 1.05;
			}), C(O.venue));
		}
		E(() => r.open, (e) => {
			e && p(() => {
				u ? C(O.venue) : T();
			});
		}), v(() => {
			u?.destroy(), u = null;
		});
		function ee() {
			c("close");
		}
		return (n, r) => (y(), i(t, { to: "body" }, [e.open ? (y(), o("div", {
			key: 0,
			class: "preview-overlay",
			onClick: re(ee, ["self"])
		}, [s("div", Av, [
			s("button", {
				class: "preview-close",
				onClick: ee
			}, "✕"),
			s("div", {
				ref_key: "canvasEl",
				ref: l,
				class: "preview-canvas"
			}, null, 512),
			r[0] ||= s("div", { class: "preview-hint" }, "Ctrl + 滚轮缩放", -1),
			d.value ? (y(), o("button", {
				key: 0,
				class: "preview-reset",
				onClick: w
			}, "−")) : a("", !0)
		])])) : a("", !0)]));
	}
}, [["__scopeId", "data-v-742b3199"]]), Mv = { class: "topbar" }, Nv = { class: "brand" }, Pv = { class: "venue-name" }, Fv = { class: "icon-toolbar" }, Iv = ["disabled", "title"], Lv = {
	key: 0,
	class: "dirty-dot"
}, Rv = {
	__name: "TopBar",
	setup(e) {
		let t = x(0), r = x(0), i = x(!1);
		E(() => O.saveFeedback, (e) => {
			e.type === "saved" ? (t.value++, setTimeout(() => t.value--, 2e3)) : e.type === "empty" && (r.value++, setTimeout(() => r.value--, 2e3));
		});
		let d = () => N.uiSave(), f = n(() => (O.sectionsTick, O.venue.name));
		return (e, n) => (y(), o("div", null, [s("header", Mv, [s("div", Nv, [
			n[4] ||= s("span", { class: "logo" }, "◆", -1),
			n[5] ||= l(" SeatMap Studio ", -1),
			s("span", Pv, C(f.value), 1)
		]), s("div", Fv, [
			s("button", {
				class: m(["icon-btn", { dirty: w(O).dirty && !w(O).saving }]),
				"data-key": "save-backend",
				disabled: w(O).saving,
				title: w(O).saving ? "保存中…" : w(O).dirty ? "有未保存的改动（Ctrl+S 保存）" : t.value ? "✓ 已保存" : r.value ? "✓ 无改动" : "保存 (Ctrl+S)",
				onClick: d
			}, [n[6] ||= s("svg", {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "1.7",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			}, [
				s("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
				s("polyline", { points: "17 21 17 13 7 13 7 21" }),
				s("polyline", { points: "7 3 7 8 15 8" })
			], -1), w(O).dirty && !w(O).saving ? (y(), o("i", Lv)) : a("", !0)], 10, Iv),
			n[10] ||= s("span", { class: "toolbar-sep" }, null, -1),
			s("button", {
				class: "icon-btn",
				title: "预览",
				onClick: n[0] ||= (e) => i.value = !0
			}, [...n[7] ||= [s("svg", {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "1.7",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			}, [s("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), s("circle", {
				cx: "12",
				cy: "12",
				r: "3"
			})], -1)]]),
			n[11] ||= c("<button class=\"icon-btn\" title=\"主题切换\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"5\"></circle><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"3\"></line><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"></line><line x1=\"4.22\" y1=\"4.22\" x2=\"5.64\" y2=\"5.64\"></line><line x1=\"18.36\" y1=\"18.36\" x2=\"19.78\" y2=\"19.78\"></line><line x1=\"1\" y1=\"12\" x2=\"3\" y2=\"12\"></line><line x1=\"21\" y1=\"12\" x2=\"23\" y2=\"12\"></line><line x1=\"4.22\" y1=\"19.78\" x2=\"5.64\" y2=\"18.36\"></line><line x1=\"18.36\" y1=\"5.64\" x2=\"19.78\" y2=\"4.22\"></line></svg></button><span class=\"toolbar-sep\"></span><button class=\"icon-btn muted\" title=\"撤销 (Ctrl+Z)\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"1 4 1 10 7 10\"></polyline><path d=\"M3.51 15a9 9 0 1 0 2.13-9.36L1 10\"></path></svg></button><button class=\"icon-btn muted\" title=\"重做 (Ctrl+Y)\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"23 4 23 10 17 10\"></polyline><path d=\"M20.49 15a9 9 0 1 1-2.13-9.36L23 10\"></path></svg></button><span class=\"toolbar-sep\"></span><button class=\"icon-btn active\" title=\"选择\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"8\" y=\"8\" width=\"8\" height=\"8\" rx=\"1\"></rect><line x1=\"12\" y1=\"2\" x2=\"12\" y2=\"6\"></line><line x1=\"12\" y1=\"18\" x2=\"12\" y2=\"22\"></line><line x1=\"2\" y1=\"12\" x2=\"6\" y2=\"12\"></line><line x1=\"18\" y1=\"12\" x2=\"22\" y2=\"12\"></line><line x1=\"4.93\" y1=\"4.93\" x2=\"7.76\" y2=\"7.76\"></line><line x1=\"16.24\" y1=\"16.24\" x2=\"19.07\" y2=\"19.07\"></line><line x1=\"4.93\" y1=\"19.07\" x2=\"7.76\" y2=\"16.24\"></line><line x1=\"16.24\" y1=\"7.76\" x2=\"19.07\" y2=\"4.93\"></line></svg></button><button class=\"icon-btn\" title=\"标签\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z\"></path><line x1=\"7\" y1=\"7\" x2=\"7.01\" y2=\"7\"></line></svg></button><button class=\"icon-btn\" title=\"对齐与分布\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"4\" y1=\"6\" x2=\"20\" y2=\"6\"></line><line x1=\"4\" y1=\"12\" x2=\"20\" y2=\"12\"></line><line x1=\"4\" y1=\"18\" x2=\"20\" y2=\"18\"></line><circle cx=\"8\" cy=\"6\" r=\"1.5\" fill=\"currentColor\"></circle><circle cx=\"16\" cy=\"12\" r=\"1.5\" fill=\"currentColor\"></circle><circle cx=\"10\" cy=\"18\" r=\"1.5\" fill=\"currentColor\"></circle></svg><svg class=\"chevron\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg></button><span class=\"toolbar-sep\"></span><button class=\"icon-btn\" title=\"三角形\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"12 3 22 21 2 21\" stroke-dasharray=\"3 2\"></polygon></svg></button><button class=\"icon-btn\" title=\"直角三角形\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"4 20 20 20 4 4\" stroke-dasharray=\"3 2\"></polygon></svg></button>", 11),
			s("button", {
				class: m(["icon-btn", { muted: !(w(O).sectionSelection.size || w(O).selection.size) }]),
				title: "生成副本 (Ctrl+D)",
				onClick: n[1] ||= (e) => w(N).duplicateSelection()
			}, [...n[8] ||= [c("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"12\" height=\"12\" rx=\"1.5\"></rect><rect x=\"9\" y=\"9\" width=\"12\" height=\"12\" rx=\"1.5\"></rect><line x1=\"15\" y1=\"12\" x2=\"15\" y2=\"18\"></line><line x1=\"12\" y1=\"15\" x2=\"18\" y2=\"15\"></line></svg>", 1)]], 2),
			s("button", {
				class: m(["icon-btn", {
					active: w(O).pastePending,
					muted: !w(O).pastePending && !(w(O).sectionSelection.size || w(O).selection.size)
				}]),
				title: "复制 (Ctrl+C)",
				onClick: n[2] ||= (e) => w(N).copySelection()
			}, [...n[9] ||= [s("svg", {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "1.7",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			}, [s("rect", {
				x: "3",
				y: "3",
				width: "12",
				height: "12",
				rx: "1.5"
			}), s("rect", {
				x: "9",
				y: "9",
				width: "12",
				height: "12",
				rx: "1.5"
			})], -1)]], 2),
			n[12] ||= c("<span class=\"toolbar-sep\"></span><button class=\"icon-btn\" title=\"图层顺序\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"2\" width=\"14\" height=\"10\" rx=\"1.5\"></rect><rect x=\"5\" y=\"7\" width=\"14\" height=\"10\" rx=\"1.5\"></rect><rect x=\"8\" y=\"12\" width=\"14\" height=\"10\" rx=\"1.5\"></rect></svg></button><button class=\"icon-btn\" title=\"删除\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"></polyline><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"></path><line x1=\"10\" y1=\"11\" x2=\"10\" y2=\"17\"></line><line x1=\"14\" y1=\"11\" x2=\"14\" y2=\"17\"></line></svg></button><span class=\"toolbar-sep\"></span><button class=\"icon-btn\" title=\"帮助\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"></path><line x1=\"12\" y1=\"17\" x2=\"12.01\" y2=\"17\"></line></svg><svg class=\"chevron\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg></button>", 5)
		])]), u(jv, {
			open: i.value,
			onClose: n[3] ||= (e) => i.value = !1
		}, null, 8, ["open"])]));
	}
}, zv = [
	{
		key: "select",
		name: "选择",
		kbd: "V",
		icon: "<path d=\"M5 3 19 12.5 12.8 13.4 16 20 13.5 21 10.3 14.5 5 18.5Z\"/>",
		hint: "单击选中分区，拖拽框选多选，拖动移动；双击进入分区；分区编辑模式下以排为单位选择"
	},
	{
		key: "lasso",
		name: "套索",
		kbd: "L",
		icon: "<ellipse cx=\"10.5\" cy=\"14.5\" rx=\"7\" ry=\"5\" stroke-dasharray=\"2.6 2.2\"/><path d=\"M15.8 10.4C17.6 8.2 19.2 5.6 20.4 3\"/>",
		hint: "套索：按住拖出自由笔画，路过的座位排/分区即被选中（Shift 加选），松开完成；选中后拖动移动、拖手柄旋转；单击=点选；Esc 取消"
	},
	{
		key: "seat",
		name: "座位选择",
		kbd: "Q",
		icon: "<circle cx=\"9.5\" cy=\"9.5\" r=\"5.5\"/><path d=\"M14 14l6 6M20 16.5V20h-3.5\"/>",
		hint: "座位选择：点选 / 框选座位，拖动移动，拖蓝色手柄旋转选区（Shift 吸附 15°）"
	},
	{
		key: "node",
		name: "节点编辑",
		kbd: "N",
		icon: "<path d=\"M5 17c3.5-9.5 10.5-9.5 14 0\"/><path d=\"M5.3 15.9 9.3 5.9M18.7 15.9 14.7 5.9\"/><rect x=\"3.2\" y=\"15.5\" width=\"3.6\" height=\"3.6\"/><rect x=\"17.2\" y=\"15.5\" width=\"3.6\" height=\"3.6\"/><circle cx=\"9.7\" cy=\"4.8\" r=\"1.5\"/><circle cx=\"14.3\" cy=\"4.8\" r=\"1.5\"/>",
		hint: "节点编辑：单选分区后拖动顶点手柄调整形状（网格调四角、弧形调角度与半径）"
	},
	{ divider: !0 },
	{
		key: "row",
		name: "单行座位",
		kbd: "R",
		icon: "<circle cx=\"4.5\" cy=\"12\" r=\"2\"/><circle cx=\"9.8\" cy=\"12\" r=\"2\"/><circle cx=\"15.1\" cy=\"12\" r=\"2\"/><circle cx=\"20.4\" cy=\"12\" r=\"2\"/>",
		hint: "单行座位：点击定起点，移动实时预览（中点显示座位数），再点击完成；可连续绘制，Esc 取消"
	},
	{
		key: "grid",
		name: "多行座位",
		kbd: "G",
		icon: "<circle cx=\"5\" cy=\"5\" r=\"1.7\"/><circle cx=\"12\" cy=\"5\" r=\"1.7\"/><circle cx=\"19\" cy=\"5\" r=\"1.7\"/><circle cx=\"5\" cy=\"12\" r=\"1.7\"/><circle cx=\"12\" cy=\"12\" r=\"1.7\"/><circle cx=\"19\" cy=\"12\" r=\"1.7\"/><circle cx=\"5\" cy=\"19\" r=\"1.7\"/><circle cx=\"12\" cy=\"19\" r=\"1.7\"/><circle cx=\"19\" cy=\"19\" r=\"1.7\"/>",
		hint: "多行座位：点击定起点，再点击定首排，垂直移动展开多排（显示 N×M = T座），点击定排数；Esc 取消"
	},
	{ divider: !0 },
	{
		key: "poly",
		name: "不规则分区",
		kbd: "P",
		icon: "<path d=\"M4.5 9.5 11 4l8.5 3.5-2 12L6.5 18Z\"/>",
		hint: "不规则分区：逐点单击连线，点回起点或双击闭合；点错按 Backspace/Ctrl+Z 撤销上一顶点；Esc 取消（只建轮廓不填充座位）"
	},
	{
		key: "rect",
		name: "矩形分区",
		kbd: "U",
		icon: "<rect x=\"4\" y=\"6\" width=\"16\" height=\"13\" rx=\"1\"/>",
		hint: "矩形分区：拖出矩形轮廓（只建轮廓不填充座位，座位在分区编辑模式下绘制）"
	},
	{
		key: "arc",
		name: "弧形区",
		kbd: "A",
		hidden: !0,
		icon: "<path d=\"M5 19a7 7 0 0 1 14 0h-3.6a3.4 3.4 0 0 0-6.8 0Z\"/>",
		hint: "弧形区：在圆心处按下，向外拖出半径，松开生成弧形看台分区"
	},
	{ divider: !0 },
	{
		key: "image",
		name: "图片",
		kbd: "I",
		icon: "<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"14\" rx=\"2\"/><circle cx=\"8.7\" cy=\"10\" r=\"1.7\"/><path d=\"M20.5 16 15.5 11l-8 8\"/>",
		hint: "图片：上传底图作为绘制参考；选择工具选中后可移动/旋转/删除，右侧面板调缩放/透明度/锁定"
	},
	{ divider: !0 },
	{
		key: "pan",
		name: "平移",
		kbd: "H",
		icon: "<path d=\"M12 3v18M3 12h18\"/><path d=\"M9.5 5.5 12 3l2.5 2.5M9.5 18.5 12 21l2.5-2.5M5.5 9.5 3 12l2.5 2.5M18.5 9.5 21 12l-2.5 2.5\"/>",
		hint: "平移：拖拽平移视图（任何工具下按住空格或鼠标中键拖拽也可平移）"
	}
], Bv = { class: "toolbar" }, Vv = {
	key: 0,
	class: "tool-divider"
}, Hv = [
	"data-key",
	"disabled",
	"title",
	"onClick"
], Uv = ["innerHTML"], Wv = {
	__name: "ToolBar",
	setup(t) {
		let r = n(() => O.mode === "seats"), i = [
			"select",
			"seat",
			"lasso",
			"row",
			"grid",
			"pan"
		], a = (e) => r.value && !i.includes(e), s = (e) => a(e.key) ? "座位编辑模式下不可用" : `${e.name} (${e.kbd})${e.soon ? " · 即将上线" : ""}`, c = n(() => zv.filter((e) => e.divider || !e.hidden && mt(e.key)));
		return (t, n) => (y(), o("aside", Bv, [(y(!0), o(e, null, S(c.value, (t, n) => (y(), o(e, { key: t.key || n }, [t.divider ? (y(), o("span", Vv)) : (y(), o("button", {
			key: 1,
			class: m(["tool-btn", {
				active: w(O).tool === t.key,
				soon: t.soon
			}]),
			"data-key": t.key,
			disabled: a(t.key),
			title: s(t),
			onClick: (e) => !a(t.key) && w(N).setTool(t.key)
		}, [(y(), o("svg", {
			class: "tool-svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			"stroke-width": "1.7",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			innerHTML: t.icon
		}, null, 8, Uv))], 10, Hv))], 64))), 128))]));
	}
}, Gv = { class: "stepper" }, Kv = { class: "val" }, qv = ["value", "data-key"], Jv = {
	key: 0,
	class: "unit"
}, Yv = {
	__name: "Stepper",
	props: {
		modelValue: {
			type: [Number, String],
			default: 0
		},
		min: {
			type: Number,
			default: null
		},
		max: {
			type: Number,
			default: null
		},
		step: {
			type: Number,
			default: 1
		},
		unit: {
			type: String,
			default: ""
		},
		dataKey: {
			type: String,
			default: ""
		}
	},
	emits: ["update:modelValue", "change"],
	setup(e, { emit: t }) {
		let n = e, r = t;
		function i(e) {
			return n.min !== null && (e = Math.max(n.min, e)), n.max !== null && (e = Math.min(n.max, e)), +e.toFixed(2);
		}
		function c(e) {
			let t = i((+n.modelValue || 0) + e * n.step);
			r("update:modelValue", t), r("change", t);
		}
		function l(e) {
			r("update:modelValue", e.target.value);
		}
		function u(e) {
			let t = i(+e.target.value || 0);
			r("update:modelValue", t), r("change", t);
		}
		return (t, n) => (y(), o("div", Gv, [
			s("button", {
				type: "button",
				tabindex: "-1",
				onClick: n[0] ||= (e) => c(-1)
			}, "‹"),
			s("div", Kv, [s("input", {
				value: e.modelValue,
				"data-key": e.dataKey,
				onInput: l,
				onChange: u
			}, null, 40, qv), e.unit ? (y(), o("span", Jv, C(e.unit), 1)) : a("", !0)]),
			s("button", {
				type: "button",
				tabindex: "-1",
				onClick: n[1] ||= (e) => c(1)
			}, "›")
		]));
	}
}, Xv = [
	"disabled",
	"data-key",
	"data-value"
], Zv = {
	key: 0,
	class: "dot-group"
}, Qv = {
	key: 1,
	class: "dot",
	style: { background: "#c8ccd2" }
}, $v = { class: "cat-face-text" }, ey = {
	key: 0,
	class: "cat-pop",
	role: "listbox"
}, ty = ["data-key", "onClick"], ny = { class: "cat-opt-text" }, ry = {
	key: 0,
	class: "cat-check"
}, iy = {
	__name: "CategorySelect",
	props: {
		value: {
			type: String,
			default: ""
		},
		categories: {
			type: Array,
			default: () => []
		},
		involvedCats: {
			type: Array,
			default: () => []
		},
		disabled: {
			type: Boolean,
			default: !1
		},
		dataKey: {
			type: String,
			default: ""
		}
	},
	emits: ["change"],
	setup(t, { emit: r }) {
		let i = t, c = r, l = x(!1), u = x(null), d = n(() => i.value && i.value !== "mixed" && i.categories.find((e) => String(e.key) === i.value) || null), f = n(() => i.involvedCats.map((e) => i.categories.find((t) => t.key === e)).filter(Boolean).slice(0, 3)), p = n(() => i.value === "mixed" ? i.involvedCats.map((e) => i.categories.find((t) => t.key === e)?.label).filter(Boolean).join(", ") || "多种类别" : d.value ? d.value.label : "未分配类别"), v = n(() => new Set(i.involvedCats.map(String)));
		function b(e) {
			return i.value === "mixed" ? v.value.has(e) : i.value === e;
		}
		function w() {
			i.disabled || (l.value = !l.value);
		}
		function T(e) {
			l.value = !1, e !== i.value && c("change", e);
		}
		function ee(e) {
			l.value && u.value && !u.value.contains(e.target) && (l.value = !1);
		}
		function E(e) {
			e.key === "Escape" && l.value && (l.value = !1, e.stopPropagation());
		}
		return _(() => {
			document.addEventListener("mousedown", ee, !0), document.addEventListener("keydown", E, !0);
		}), g(() => {
			document.removeEventListener("mousedown", ee, !0), document.removeEventListener("keydown", E, !0);
		}), (n, r) => (y(), o("div", {
			ref_key: "root",
			ref: u,
			class: m(["cat-select", {
				open: l.value,
				disabled: t.disabled
			}])
		}, [s("button", {
			type: "button",
			class: "cat-face pill",
			disabled: t.disabled,
			"data-key": t.dataKey,
			"data-value": t.value,
			onClick: w
		}, [
			t.value === "mixed" ? (y(), o(e, { key: 0 }, [f.value.length ? (y(), o("span", Zv, [(y(!0), o(e, null, S(f.value, (e) => (y(), o("span", {
				key: e.key,
				class: "dot",
				style: h({ background: e.color })
			}, null, 4))), 128))])) : (y(), o("span", Qv))], 64)) : (y(), o("span", {
				key: 1,
				class: "dot",
				style: h({ background: d.value ? d.value.color : "#c8ccd2" })
			}, null, 4)),
			s("span", $v, C(p.value), 1),
			r[0] ||= s("span", { class: "cat-caret" }, "▾", -1)
		], 8, Xv), l.value ? (y(), o("div", ey, [(y(!0), o(e, null, S(t.categories, (e) => (y(), o("button", {
			key: e.key,
			type: "button",
			class: m(["cat-opt", { on: b(String(e.key)) }]),
			"data-key": t.dataKey ? `${t.dataKey}-opt-${e.key}` : null,
			onClick: (t) => T(String(e.key))
		}, [
			s("span", {
				class: "dot",
				style: h({ background: e.color })
			}, null, 4),
			s("span", ny, C(e.label), 1),
			b(String(e.key)) ? (y(), o("span", ry, "✓")) : a("", !0)
		], 10, ty))), 128))])) : a("", !0)], 2));
	}
}, ay = {
	key: 0,
	class: "prop"
}, oy = [
	"value",
	"placeholder",
	"title",
	"data-key"
], sy = { class: "prop" }, cy = [
	"checked",
	".indeterminate",
	"data-key"
], ly = { class: "prop" }, uy = { class: "prop" }, dy = { class: "prop" }, fy = { class: "prop" }, py = {
	__name: "LabelStyleFields",
	props: {
		label: {
			type: Object,
			required: !0
		},
		showText: {
			type: Boolean,
			default: !1
		},
		keyPrefix: {
			type: String,
			default: "label"
		}
	},
	emits: ["update", "focus"],
	setup(t, { emit: n }) {
		let r = t, i = n, c = (e) => e === "mixed", l = (e) => c(e) ? "" : e;
		function d(e) {
			let t = e.target.value.trim();
			if (!t) {
				e.target.value = c(r.label.text) ? "" : r.label.text;
				return;
			}
			i("update", { text: t });
		}
		return (n, r) => (y(), o(e, null, [
			t.showText ? (y(), o("div", ay, [r[7] ||= s("span", null, "标签", -1), s("input", {
				class: "ctl",
				value: c(t.label.text) ? "" : t.label.text,
				placeholder: c(t.label.text) ? "多值" : "",
				title: c(t.label.text) ? "多值" : "画布标签即分区名，修改会直接改名；标签不能为空，不想显示可取消下方「可见」",
				"data-key": `${t.keyPrefix}-text`,
				onFocus: r[0] ||= (e) => i("focus"),
				onChange: r[1] ||= (e) => d(e)
			}, null, 40, oy)])) : a("", !0),
			s("div", sy, [r[8] ||= s("span", null, "可见", -1), s("input", {
				type: "checkbox",
				checked: t.label.visible === !0,
				".indeterminate": c(t.label.visible),
				"data-key": `${t.keyPrefix}-visible`,
				onChange: r[2] ||= (e) => i("update", { visible: e.target.checked })
			}, null, 40, cy)]),
			s("div", ly, [r[9] ||= s("span", null, "字号", -1), u(Yv, {
				"model-value": l(t.label.fontSize),
				min: 8,
				max: 300,
				unit: "pt",
				"data-key": `${t.keyPrefix}-font-size`,
				onChange: r[3] ||= (e) => i("update", { fontSize: e })
			}, null, 8, ["model-value", "data-key"])]),
			s("div", uy, [r[10] ||= s("span", null, "旋转", -1), u(Yv, {
				"model-value": l(t.label.rotation),
				min: -180,
				max: 180,
				unit: "°",
				"data-key": `${t.keyPrefix}-rotation`,
				onChange: r[4] ||= (e) => i("update", { rotation: e })
			}, null, 8, ["model-value", "data-key"])]),
			s("div", dy, [r[11] ||= s("span", null, "位置 X", -1), u(Yv, {
				"model-value": l(t.label.dx),
				min: -500,
				max: 500,
				step: 5,
				"data-key": `${t.keyPrefix}-dx`,
				onChange: r[5] ||= (e) => i("update", { dx: e })
			}, null, 8, ["model-value", "data-key"])]),
			s("div", fy, [r[12] ||= s("span", null, "位置 Y", -1), u(Yv, {
				"model-value": l(t.label.dy),
				min: -500,
				max: 500,
				step: 5,
				"data-key": `${t.keyPrefix}-dy`,
				onChange: r[6] ||= (e) => i("update", { dy: e })
			}, null, 8, ["model-value", "data-key"])])
		], 64));
	}
}, my = [
	"min",
	"max",
	"step",
	"value"
], hy = {
	key: 0,
	class: "jog-notch",
	"aria-hidden": "true"
}, gy = /*#__PURE__*/ kv(/* @__PURE__ */ Object.assign({ inheritAttrs: !1 }, {
	__name: "SliderInput",
	props: {
		modelValue: {
			type: Number,
			default: 50
		},
		min: {
			type: Number,
			default: 0
		},
		max: {
			type: Number,
			default: 100
		},
		step: {
			type: Number,
			default: 1
		},
		jog: {
			type: Boolean,
			default: !1
		}
	},
	emits: [
		"update:modelValue",
		"slide",
		"commit"
	],
	setup(e, { emit: t }) {
		let n = e, r = t, i = (n.min + n.max) / 2, c = x(n.jog ? i : n.modelValue);
		E(() => n.modelValue, (e) => {
			n.jog || (c.value = e);
		});
		function l(e) {
			let t = +e.target.value;
			c.value = t, r("update:modelValue", t), r("slide", t);
		}
		function u(e) {
			let t = +e.target.value;
			r("commit", t), n.jog && (c.value = i, r("update:modelValue", i));
		}
		return (t, n) => (y(), o("div", { class: m(["slider-wrap", { jog: e.jog }]) }, [s("input", f({
			type: "range",
			min: e.min,
			max: e.max,
			step: e.step,
			value: c.value
		}, t.$attrs, {
			onInput: l,
			onChange: u
		}), null, 16, my), e.jog ? (y(), o("span", hy)) : a("", !0)], 2));
	}
}), [["__scopeId", "data-v-1feddea0"]]), _y = { class: "sidepanel" }, vy = {
	key: 0,
	class: "panel-context"
}, yy = { class: "card-head" }, by = ["title"], xy = { class: "prop" }, Sy = {
	class: "check-line",
	title: "锁定时画布上点选/框选不到底图；取消勾选恢复可选与调整"
}, Cy = { class: "prop slider-prop" }, wy = { class: "prop slider-prop" }, Ty = { class: "prop" }, Ey = ["checked"], Dy = { class: "prop" }, Oy = {
	class: "check-line",
	title: "锁定后画布上点选/框选不到底图（描图时防误选）；点图片工具打开此卡可解锁"
}, ky = {
	key: 1,
	class: "muted",
	style: { margin: "2px 0" }
}, Ay = {
	key: 0,
	class: "card"
}, jy = { class: "card" }, My = { class: "card-head" }, Ny = { class: "card" }, Py = { class: "prop" }, Fy = ["value", "title"], Iy = { class: "prop" }, Ly = { class: "prop" }, Ry = {
	key: 0,
	class: "prop"
}, zy = { class: "prop" }, By = {
	key: 1,
	class: "prop"
}, Vy = { class: "seg" }, Hy = { class: "card" }, Uy = { class: "card-head" }, Wy = {
	key: 0,
	class: "prop"
}, Gy = {
	key: 1,
	class: "prop"
}, Ky = ["value", "title"], qy = { class: "prop" }, Jy = { class: "pos-picker" }, Yy = { class: "card" }, Xy = { class: "card-head" }, Zy = { class: "val-static" }, Qy = {
	key: 0,
	class: "muted",
	style: { "padding-top": "4px" }
}, $y = {
	key: 2,
	class: "card"
}, eb = { class: "card-head" }, tb = { class: "prop" }, nb = ["title"], rb = { class: "card" }, ib = ["value"], ab = {
	key: 0,
	value: "",
	disabled: ""
}, ob = ["value"], sb = { class: "card" }, cb = ["value"], lb = {
	key: 0,
	value: "",
	disabled: ""
}, ub = ["value"], db = { class: "card" }, fb = { class: "card-head" }, pb = { class: "sec-heading" }, mb = { class: "prop" }, hb = { class: "val-static" }, gb = { class: "card" }, _b = { class: "card-head" }, vb = { class: "card" }, yb = { class: "card" }, bb = { class: "prop" }, xb = ["value"], Sb = { class: "prop" }, Cb = ["value"], wb = { class: "prop" }, Tb = { class: "wm-logo" }, Eb = ["src"], Db = {
	key: 0,
	class: "prop"
}, Ob = { class: "prop" }, kb = ["checked"], Ab = { class: "prop" }, jb = { class: "prop" }, Mb = { class: "prop" }, Nb = { class: "prop" }, Pb = { class: "prop" }, Fb = { class: "prop" }, Ib = { class: "card" }, Lb = { class: "card-head" }, Rb = { class: "card" }, zb = { class: "card-head" }, Bb = { class: "prop" }, Vb = ["value", "title"], Hb = { class: "card" }, Ub = { class: "venue-title" }, Wb = {
	class: "venue-name-text",
	"data-key": "venue-name"
}, Gb = { class: "card" }, Kb = { class: "sum-row" }, qb = { class: "sum-main" }, Jb = { class: "sum-actions" }, Yb = { class: "sum-row" }, Xb = { class: "sum-main" }, Zb = {
	class: "card legend-card",
	"data-key": "legend-card"
}, Qb = { class: "card-head" }, $b = 4, ex = {
	__name: "SidePanel",
	setup(t) {
		let r = n(() => (O.sectionsTick, O.venue.sections.map((e) => ({
			id: e.id,
			count: N.seatCountOf(e)
		})))), i = n(() => r.value.reduce((e, t) => e + t.count, 0)), l = n(() => (O.sectionsTick, O.venue.sections.find((e) => e.id === O.activeSectionId) || null)), d = n(() => (O.sectionSelectionTick, O.sectionSelection.size)), f = n(() => O.mode === "seats"), g = n(() => (O.selectionTick, O.selection.size)), _ = n(() => (O.selectionTick, O.sectionsTick, O.mode === "sections" && Cn())), v = n(() => (f.value || _.value) && (O.tool === "select" || O.tool === "lasso")), b = n(() => (O.selectionTick, N.selectedRows())), T = n(() => (f.value || _.value) && g.value > 0), ie = n(() => {
			if (O.selectionTick, !O.selection.size) return !1;
			for (let e of O.selection) if (!un(e)?.section.loose) return !1;
			return !0;
		});
		function ae() {
			N.convertRowsToSection(b.value.map((e) => e.id));
		}
		let oe = n(() => !T.value && !!l.value && (O.mode !== "sections" || d.value === 1)), le = n(() => !T.value && O.mode === "sections" && d.value > 1), ue = n(() => (O.tool === "image" || O.imageSelected) && O.mode === "sections"), de = n(() => T.value ? v.value ? "排" : "座位" : oe.value || le.value ? "分区" : ue.value ? "底图" : ""), fe = n(() => (O.sectionsTick, O.venue.categories.slice())), pe = x(!0), me = n(() => {
			O.canvasTick;
			let e = 0;
			for (let t of O.venue.sections) for (let n of t.rows) for (let t of n.seats) t.cat ?? e++;
			return e;
		}), he = n(() => {
			O.canvasTick;
			let e = 0, t = /* @__PURE__ */ new Set();
			for (let n of O.venue.sections) {
				n.name && (t.has(n.name) ? e++ : t.add(n.name));
				let r = /* @__PURE__ */ new Set();
				for (let t of n.rows) {
					t.label && (r.has(t.label) ? e++ : r.add(t.label));
					let n = /* @__PURE__ */ new Set();
					for (let r of t.seats) {
						if (r.n === "" || r.n == null) continue;
						let t = String(r.n);
						n.has(t) ? e++ : n.add(t);
					}
				}
			}
			return e;
		}), ge = n(() => {
			O.canvasTick;
			let e = 0;
			for (let t of O.venue.sections) for (let n of t.rows) {
				n.label || e++;
				for (let t of n.seats) (t.n === "" || t.n == null) && e++;
			}
			return e;
		}), _e = n(() => {
			if (O.selectionTick, O.canvasTick, !O.selection.size) return "";
			let e;
			for (let t of O.selection) {
				let n = un(t)?.seat.cat ?? null;
				if (e === void 0) e = n;
				else if (e !== n) return "mixed";
			}
			return e === null ? "" : String(e);
		}), ve = n(() => {
			O.selectionTick, O.canvasTick;
			let e = /* @__PURE__ */ new Set();
			for (let t of O.selection) {
				let n = un(t)?.seat.cat;
				n != null && e.add(n);
			}
			return [...e];
		});
		function ye(e) {
			N.setSelectedCategory(e === "" ? null : +e);
		}
		let be = n(() => {
			if (O.selectionTick, O.canvasTick, !O.selection.size) return "available";
			let e;
			for (let t of O.selection) {
				let n = un(t)?.seat.status || "available";
				if (e === void 0) e = n;
				else if (e !== n) return "mixed";
			}
			return e;
		}), xe = n(() => {
			if (O.selectionTick, O.canvasTick, !O.selection.size) return 1;
			let e;
			for (let t of O.selection) {
				let n = un(t)?.seat.type ?? 1;
				if (e === void 0) e = n;
				else if (e !== n) return "mixed";
			}
			return e;
		}), Se = n(() => {
			O.canvasTick;
			let e = l.value;
			if (!e) return "";
			let t;
			for (let n of e.rows) for (let e of n.seats) {
				let n = e.cat ?? null;
				if (t === void 0) t = n;
				else if (t !== n) return "mixed";
			}
			return t === void 0 ? e.cat_id == null ? "" : String(e.cat_id) : t === null ? "" : String(t);
		}), Ce = n(() => {
			O.canvasTick;
			let e = l.value, t = /* @__PURE__ */ new Set();
			if (e) {
				for (let n of e.rows) for (let e of n.seats) e.cat != null && t.add(e.cat);
				!t.size && e.cat_id != null && t.add(e.cat_id);
			}
			return [...t];
		});
		function we(e) {
			let t = l.value;
			if (!t) return;
			let n = e === "" ? null : +e, r = t.rows.flatMap((e) => e.seats.map((e) => e.id));
			r.length && N.setSeatsCategory(r, n), N.updateSection(t.id, { cat: n });
		}
		let Te = n(() => (O.sectionsTick, O.sectionSelectionTick, O.venue.sections.filter((e) => O.sectionSelection.has(e.id)))), Ee = n(() => {
			O.canvasTick;
			let e;
			for (let t of Te.value) for (let n of t.rows) for (let t of n.seats) {
				let n = t.cat ?? null;
				if (e === void 0) e = n;
				else if (e !== n) return "mixed";
			}
			return e == null ? "" : String(e);
		}), De = n(() => {
			O.canvasTick;
			let e = /* @__PURE__ */ new Set();
			for (let t of Te.value) for (let n of t.rows) for (let t of n.seats) t.cat != null && e.add(t.cat);
			return [...e];
		});
		function ke(e) {
			let t = Te.value.flatMap((e) => e.rows.flatMap((e) => e.seats.map((e) => e.id)));
			t.length && N.setSeatsCategory(t, e === "" ? null : +e);
		}
		let Ae = n(() => (O.sectionsTick, Te.value.map((e) => e.name).join(", "))), je = n(() => {
			O.canvasTick;
			let e = l.value;
			if (!e) return Ge({});
			let t = Ge(e);
			return {
				...t,
				text: e.name,
				fontSize: t.fontSize > 0 ? t.fontSize : 14
			};
		}), Ne = null;
		function Pe() {
			Ne = O.activeSectionId;
		}
		function Fe(e) {
			let t = Ne ?? O.activeSectionId, n = t ? O.venue.sections.find((e) => e.id === t) : null;
			if (n) {
				if ("text" in e) {
					let t = e.text.trim();
					t && t !== n.name && N.updateSection(n.id, { name: t });
					return;
				}
				N.updateSectionLabel([n.id], e);
			}
		}
		let Ie = n(() => {
			O.canvasTick, O.sectionSelectionTick;
			let e = Te.value.map((e) => {
				let t = Ge(e);
				return {
					...t,
					fontSize: t.fontSize > 0 ? t.fontSize : 14
				};
			}), t = [
				"text",
				"visible",
				"fontSize",
				"rotation",
				"dx",
				"dy"
			], n = {};
			for (let r of t) n[r] = e.length && e.every((t) => t[r] === e[0][r]) ? e[0][r] : "mixed";
			return n;
		});
		function Le(e) {
			let t = [...O.sectionSelection];
			t.length && N.updateSectionLabel(t, e);
		}
		let ze = n(() => (O.canvasTick, l.value ? qe(l.value) : Ke()));
		function Be(e) {
			let t = l.value;
			t && N.updateSectionWatermark([t.id], e);
		}
		function Ve(e) {
			Be({ text: e.target.value.trim() }), e.target.value = ze.value.text;
		}
		let He = x(null);
		function We(e) {
			let t = e.target.files?.[0];
			e.target.value = "", t && Nt(t, { maxEdge: 512 }).then((e) => Be({ logo: {
				src: e.src,
				width: 60,
				ratio: e.h / e.w
			} })).catch((e) => alert(e.message));
		}
		let Je = x(""), Ye = x(16), Xe = x(24), Ze = x(0), Qe = x(0);
		E([b, () => O.canvasTick], ([e]) => {
			e.length === 1 && (Je.value = e[0].label), e.length && (Ye.value = e[0].seatSpacing ?? 16, Xe.value = e[0].rowSpacing ?? 24, Ze.value = Math.round(Me(e[0]) * 10) / 10, Qe.value = e[0].curve ?? 0);
		});
		let $e = () => b.value.map((e) => e.id), et = n(() => b.value.length > 1 ? b.value.map((e) => e.seats.length).join(", ") : String(g.value)), tt = n(() => {
			O.selectionTick, O.canvasTick;
			let e = b.value.map((e) => e.label);
			return e.length ? e.every((e) => !e) ? "（无标签）" : e.map((e) => e || "·").join(", ") : "";
		}), nt = (e) => e === "" || e == null ? "·" : String(e), rt = n(() => (O.selectionTick, O.canvasTick, b.value.map((e) => {
			let t = Oe(e), n = t[0]?.n, r = t[t.length - 1]?.n;
			return {
				id: e.id,
				label: e.label || "（无标签）",
				text: t.length <= 1 ? nt(n) : `${nt(n)} – ${nt(r)}`
			};
		}))), it = n(() => {
			O.selectionTick, O.canvasTick;
			let e = [...O.selection].map((e) => un(e)?.seat.n).map((e) => e === "" || e == null ? "·" : String(e));
			if (!e.length) return "";
			let t = e.slice(0, 12).join(", ");
			return e.length > 12 ? `${t} … 共 ${e.length} 座` : t;
		});
		function at() {
			b.value.length === 1 && N.updateRowLabel(b.value[0].id, Je.value.trim());
		}
		let ot = n(() => {
			O.selectionTick, O.canvasTick;
			let e = b.value;
			if (!e.length) return "both";
			let t = Re(e[0]);
			return e.every((e) => Re(e) === t) ? t : "mixed";
		});
		function st(e) {
			let t = ot.value === "mixed" ? "both" : ot.value, n = {
				start: t === "start" || t === "both",
				end: t === "end" || t === "both"
			};
			n[e] = !n[e];
			let r = n.start && n.end ? "both" : n.start ? "start" : n.end ? "end" : "none";
			N.setRowLabelPos($e(), r);
		}
		function ct() {
			N.setRowsSeatSpacing($e(), +Ye.value || 16);
		}
		function lt() {
			N.setRowsRowSpacing($e(), +Xe.value || 24);
		}
		function ut() {
			N.setRowsRotation($e(), +Ze.value || 0);
		}
		function dt() {
			N.setRowsCurve($e(), +Qe.value || 0);
		}
		let D = n(() => {
			O.imageTick;
			let e = O.venue.images?.[0];
			return e ? { ...e } : null;
		}), ft = x(!1);
		function pt(e) {
			ft.value = !1;
			let t = e.dataTransfer?.files?.[0];
			t && Nt(t).then((e) => N.replaceVenueImage(e)).catch((e) => alert(e.message));
		}
		let mt = null, ht = (e) => $b ** ((e - 50) / 50);
		function gt(e) {
			let t = D.value;
			if (!t) return;
			mt ||= {
				x: t.x,
				y: t.y,
				w: t.w,
				h: t.h,
				cx: t.x + t.w / 2,
				cy: t.y + t.h / 2
			};
			let n = ht(e), r = mt.w * n, i = mt.h * n;
			N.previewImageTransform(t.id, {
				x: mt.cx - r / 2,
				y: mt.cy - i / 2,
				w: r,
				h: i
			});
		}
		function _t(e) {
			let t = D.value;
			if (!t || !mt) {
				mt = null;
				return;
			}
			let n = ht(e), r = mt.w * n / (t.baseW || mt.w);
			N.previewImageTransform(t.id, {
				x: mt.x,
				y: mt.y,
				w: mt.w,
				h: mt.h
			}), Math.abs(n - 1) > .01 && N.setImageScale(t.id, r), mt = null;
		}
		E(() => D.value?.id, () => {
			mt = null;
		});
		let vt = x(!1), yt = x(""), bt = x(null);
		function xt() {
			yt.value = O.venue.name || "", vt.value = !0, p(() => bt.value?.select());
		}
		function St() {
			vt.value &&= (N.renameVenue(yt.value), !1);
		}
		function Ct() {
			vt.value = !1;
		}
		return (t, n) => (y(), o("aside", _y, [
			de.value ? (y(), o("div", vy, C(de.value), 1)) : a("", !0),
			ue.value ? (y(), o("section", {
				key: 1,
				class: m(["card image-card", { "drag-over": ft.value }]),
				"data-key": "image-card",
				onDragover: n[5] ||= re((e) => ft.value = !0, ["prevent"]),
				onDragleave: n[6] ||= re((e) => ft.value = !1, ["prevent"]),
				onDrop: re(pt, ["prevent"])
			}, [
				s("div", yy, [n[41] ||= s("span", { class: "card-title" }, "底图", -1), s("button", {
					class: "manage",
					"data-key": "image-upload",
					title: D.value ? "替换当前底图（可撤销）" : "上传参考底图",
					onClick: n[0] ||= (e) => w(N).pickImages()
				}, C(D.value ? "⇪ 替换" : "＋ 上传"), 9, by)]),
				n[51] ||= s("div", {
					class: "muted",
					style: { margin: "2px 0 8px" }
				}, "支持 PNG / JPG / WebP / GIF / SVG，拖图片到此卡也可上传；单张 ≤ 10MB", -1),
				D.value ? (y(), o(e, { key: 0 }, [D.value.locked ? (y(), o(e, { key: 0 }, [s("div", xy, [n[43] ||= s("span", null, "锁定", -1), s("label", Sy, [s("input", {
					type: "checkbox",
					checked: "",
					"data-key": "image-lock",
					onChange: n[1] ||= (e) => w(N).setImageLocked(D.value.id, !1)
				}, null, 32), n[42] ||= s("span", null, "已锁定", -1)])]), n[44] ||= s("div", {
					class: "muted",
					style: { margin: "8px 0" }
				}, "底图已锁定：画布上点选/框选不到；取消勾选后可调整缩放与透明度", -1)], 64)) : (y(), o(e, { key: 1 }, [
					s("div", Cy, [n[45] ||= s("span", null, "缩放", -1), u(gy, {
						jog: "",
						"model-value": 50,
						"data-key": "image-scale",
						title: "右滑放大 / 左滑缩小，松手回中",
						onSlide: gt,
						onCommit: _t
					})]),
					s("div", wy, [n[46] ||= s("span", null, "透明度", -1), u(gy, {
						"model-value": Math.round(D.value.opacity * 100),
						"data-key": "image-opacity",
						onSlide: n[2] ||= (e) => w(N).setImageOpacity(D.value.id, e / 100)
					}, null, 8, ["model-value"])]),
					s("div", Ty, [n[47] ||= s("span", null, "可见", -1), s("input", {
						type: "checkbox",
						checked: D.value.visible !== !1,
						"data-key": "image-visible",
						title: "隐藏后画布不显示底图（数据保留，便于描图时临时对照）",
						onChange: n[3] ||= (e) => w(N).setImageVisible(D.value.id, e.target.checked)
					}, null, 40, Ey)]),
					s("div", Dy, [n[49] ||= s("span", null, "锁定", -1), s("label", Oy, [s("input", {
						type: "checkbox",
						checked: !1,
						"data-key": "image-lock",
						onChange: n[4] ||= (e) => w(N).setImageLocked(D.value.id, !0)
					}, null, 32), n[48] ||= s("span", null, "未锁定", -1)])]),
					n[50] ||= s("div", {
						class: "muted",
						style: { margin: "8px 0" }
					}, "选择工具选中后可拖动移动、拖顶部圆点旋转；缩放用滑条，传新图即替换（可撤销）", -1)
				], 64))], 64)) : (y(), o("div", ky, "还没有底图。上传后可垫图描图，传新图会替换当前底图（可撤销）。"))
			], 34)) : a("", !0),
			T.value ? (y(), o(e, { key: 2 }, [
				ie.value ? (y(), o("section", Ay, [s("button", {
					class: "ctl block",
					"data-key": "convert-section",
					onClick: ae
				}, "⇱ 转为分区"), n[52] ||= s("div", {
					class: "muted",
					style: { "margin-top": "6px" }
				}, "把选中的散座排转为带轮廓、可命名的正式分区", -1)])) : a("", !0),
				s("section", jy, [s("div", My, [n[53] ||= s("span", { class: "card-title" }, "类别", -1), s("button", {
					class: "manage",
					onClick: n[7] ||= (e) => w(N).openCategoryModal()
				}, "⚙ 管理")]), u(iy, {
					value: _e.value,
					categories: fe.value,
					"involved-cats": ve.value,
					"data-key": "sel-cat",
					onChange: ye
				}, null, 8, [
					"value",
					"categories",
					"involved-cats"
				])]),
				v.value ? (y(), o(e, { key: 1 }, [
					s("section", Ny, [
						n[59] ||= s("div", { class: "card-head" }, [s("span", { class: "card-title" }, "排")], -1),
						s("div", Py, [s("span", { class: m({ "prop-hi": b.value.length === 1 }) }, "座位数", 2), s("input", {
							class: "ctl",
							value: et.value,
							readonly: "",
							title: et.value,
							"data-key": "row-seat-count"
						}, null, 8, Fy)]),
						s("div", Iy, [n[54] ||= s("span", null, "旋转", -1), u(Yv, {
							modelValue: Ze.value,
							"onUpdate:modelValue": n[8] ||= (e) => Ze.value = e,
							min: -90,
							max: 90,
							unit: "°",
							"data-key": "row-rotation",
							onChange: ut
						}, null, 8, ["modelValue"])]),
						s("div", Ly, [n[55] ||= s("span", null, "弧度", -1), u(Yv, {
							modelValue: Qe.value,
							"onUpdate:modelValue": n[9] ||= (e) => Qe.value = e,
							min: -180,
							max: 180,
							"data-key": "row-curve",
							onChange: dt
						}, null, 8, ["modelValue"])]),
						b.value.length > 1 ? (y(), o("div", Ry, [n[56] ||= s("span", null, "排距", -1), u(Yv, {
							modelValue: Xe.value,
							"onUpdate:modelValue": n[10] ||= (e) => Xe.value = e,
							min: 8,
							max: 200,
							"data-key": "row-spacing",
							onChange: lt
						}, null, 8, ["modelValue"])])) : a("", !0),
						s("div", zy, [n[57] ||= s("span", null, "座位间距", -1), u(Yv, {
							modelValue: Ye.value,
							"onUpdate:modelValue": n[11] ||= (e) => Ye.value = e,
							min: 4,
							max: 100,
							"data-key": "seat-spacing",
							onChange: ct
						}, null, 8, ["modelValue"])]),
						b.value.length > 1 ? (y(), o("div", By, [n[58] ||= s("span", null, "对齐", -1), s("div", Vy, [
							s("button", {
								"data-key": "row-align-start",
								title: "左对齐：各排沿排方向平移，首座对齐到最靠前的排（只平移不改形）",
								onClick: n[12] ||= (e) => w(N).alignRows($e(), "start")
							}, "左"),
							s("button", {
								"data-key": "row-align-center",
								title: "中对齐：各排中心对齐到均值线——配统一弧度出同心弧排",
								onClick: n[13] ||= (e) => w(N).alignRows($e(), "center")
							}, "中"),
							s("button", {
								"data-key": "row-align-end",
								title: "右对齐：各排末座对齐到最靠后的排",
								onClick: n[14] ||= (e) => w(N).alignRows($e(), "end")
							}, "右")
						])])) : a("", !0)
					]),
					s("section", Hy, [
						s("div", Uy, [n[60] ||= s("span", { class: "card-title" }, "排标签", -1), b.value.length > 1 ? (y(), o("button", {
							key: 0,
							class: "manage",
							"data-key": "row-label-open",
							title: "批量编辑排标签（序列/起始/方向）",
							onClick: n[15] ||= (e) => w(N).openLabelModal("rows")
						}, "✎ 编辑")) : a("", !0)]),
						b.value.length === 1 ? (y(), o("div", Wy, [n[61] ||= s("span", null, "标签", -1), te(s("input", {
							class: "ctl",
							"onUpdate:modelValue": n[16] ||= (e) => Je.value = e,
							"data-key": "row-label",
							onChange: at
						}, null, 544), [[ee, Je.value]])])) : (y(), o("div", Gy, [n[62] ||= s("span", null, "标签", -1), s("input", {
							class: "ctl",
							value: tt.value,
							readonly: "",
							title: tt.value
						}, null, 8, Ky)])),
						s("div", qy, [n[68] ||= s("span", null, "位置", -1), s("div", Jy, [
							s("span", {
								class: m(["pos-end", {
									on: ["start", "both"].includes(ot.value),
									mixed: ot.value === "mixed"
								}]),
								"data-key": "row-label-pos-start",
								title: "首端显示排标签",
								onClick: n[17] ||= (e) => st("start")
							}, C(b.value[0]?.label || "1"), 3),
							n[63] ||= s("i", null, null, -1),
							n[64] ||= s("i", null, null, -1),
							n[65] ||= s("i", null, null, -1),
							n[66] ||= s("i", null, null, -1),
							n[67] ||= s("i", null, null, -1),
							s("span", {
								class: m(["pos-end", {
									on: ["end", "both"].includes(ot.value),
									mixed: ot.value === "mixed"
								}]),
								"data-key": "row-label-pos-end",
								title: "尾端显示排标签",
								onClick: n[18] ||= (e) => st("end")
							}, C(b.value[0]?.label || "1"), 3)
						])])
					]),
					s("section", Yy, [
						s("div", Xy, [n[69] ||= s("span", { class: "card-title" }, "座位编号", -1), s("button", {
							class: "manage",
							"data-key": "seatnum-open",
							title: "批量编辑座位编号（序列样式/起始/方向）",
							onClick: n[19] ||= (e) => w(N).openLabelModal("seats")
						}, "✎ 编辑")]),
						s("div", { class: m(["num-list", { scroll: rt.value.length > 6 }]) }, [(y(!0), o(e, null, S(rt.value, (e) => (y(), o("div", {
							key: e.id,
							class: "prop"
						}, [s("span", null, C(e.label), 1), s("span", Zy, C(e.text), 1)]))), 128))], 2),
						rt.value.length > 6 ? (y(), o("div", Qy, "共 " + C(rt.value.length) + " 排，滚动查看", 1)) : a("", !0)
					])
				], 64)) : (y(), o("section", $y, [s("div", eb, [n[70] ||= s("span", { class: "card-title" }, "座位编号", -1), s("button", {
					class: "manage",
					"data-key": "seatnum-open",
					title: "批量编辑座位编号（只作用于选中的座位）",
					onClick: n[20] ||= (e) => w(N).openLabelModal("seats")
				}, "✎ 编辑")]), s("div", tb, [n[71] ||= s("span", null, "编号", -1), s("span", {
					class: "val-static num-summary",
					title: it.value
				}, C(it.value), 9, nb)])])),
				s("section", rb, [n[72] ||= s("div", { class: "card-head" }, [s("span", { class: "card-title" }, "座位类型")], -1), s("select", {
					class: "ctl block",
					"data-key": "seat-type",
					value: xe.value === "mixed" ? "" : String(xe.value),
					onChange: n[21] ||= (e) => w(N).setSelectedType(+e.target.value)
				}, [xe.value === "mixed" ? (y(), o("option", ab, "多种类型")) : a("", !0), (y(!0), o(e, null, S(w(ce), (e) => (y(), o("option", {
					key: e.key,
					value: String(e.key)
				}, C(e.label), 9, ob))), 128))], 40, ib)]),
				s("section", sb, [n[73] ||= s("div", { class: "card-head" }, [s("span", { class: "card-title" }, "状态")], -1), s("select", {
					class: "ctl block",
					"data-key": "seat-status",
					value: be.value === "mixed" ? "" : be.value,
					onChange: n[22] ||= (e) => w(N).setSelectedStatus(e.target.value)
				}, [be.value === "mixed" ? (y(), o("option", lb, "多种状态")) : a("", !0), (y(!0), o(e, null, S(w(se), (e) => (y(), o("option", {
					key: e.key,
					value: e.key
				}, C(e.label), 9, ub))), 128))], 40, cb)])
			], 64)) : oe.value ? (y(), o(e, { key: 3 }, [
				s("section", db, [
					s("div", fb, [n[74] ||= s("span", { class: "card-title" }, "分区", -1), s("button", {
						class: "manage",
						title: "进入座位编辑模式",
						onClick: n[23] ||= (e) => w(N).enterSection(l.value.id)
					}, "✎ 编辑内容")]),
					s("div", pb, [s("span", {
						class: "dot lg",
						style: h({ background: l.value.color })
					}, null, 4), s("strong", null, C(w(Ue)(l.value)), 1)]),
					s("div", mb, [n[75] ||= s("span", null, "座位数", -1), s("span", hb, C(w(N).seatCountOf(l.value).toLocaleString()), 1)])
				]),
				s("section", gb, [s("div", _b, [n[76] ||= s("span", { class: "card-title" }, "类别", -1), s("button", {
					class: "manage",
					onClick: n[24] ||= (e) => w(N).openCategoryModal()
				}, "⚙ 管理")]), u(iy, {
					value: Se.value,
					categories: fe.value,
					"involved-cats": Ce.value,
					"data-key": "section-cat",
					onChange: we
				}, null, 8, [
					"value",
					"categories",
					"involved-cats"
				])]),
				s("section", vb, [n[77] ||= s("div", { class: "card-head" }, [s("span", { class: "card-title" }, "标签")], -1), u(py, {
					label: je.value,
					"show-text": "",
					"key-prefix": "label",
					onFocus: Pe,
					onUpdate: Fe
				}, null, 8, ["label"])]),
				s("section", yb, [
					n[89] ||= s("div", { class: "card-head" }, [s("span", { class: "card-title" }, "水印")], -1),
					s("div", bb, [n[78] ||= s("span", null, "文本", -1), s("input", {
						class: "ctl",
						value: ze.value.text,
						placeholder: "赞助商名称，留空无水印",
						title: "防伪票风格：文字/Logo 平铺整个分区（只铺轮廓内），渲染在座位之下",
						"data-key": "wm-text",
						onChange: Ve
					}, null, 40, xb)]),
					s("div", Sb, [n[79] ||= s("span", null, "颜色", -1), s("input", {
						type: "color",
						class: "ctl color-ctl",
						value: ze.value.color,
						title: "水印文字颜色（Logo 为图片原色，不受影响）",
						"data-key": "wm-color",
						onChange: n[25] ||= (e) => Be({ color: e.target.value })
					}, null, 40, Cb)]),
					s("div", wb, [n[80] ||= s("span", null, "Logo", -1), s("div", Tb, [
						ze.value.logo?.src ? (y(), o("img", {
							key: 0,
							src: ze.value.logo.src,
							alt: "水印logo",
							class: "wm-logo-preview"
						}, null, 8, Eb)) : a("", !0),
						s("button", {
							class: "manage",
							"data-key": "wm-logo-upload",
							title: "上传 Logo 图片（png/jpg/svg，自动压缩）",
							onClick: n[26] ||= (e) => He.value?.click()
						}, C(ze.value.logo?.src ? "替换" : "上传"), 1),
						ze.value.logo?.src ? (y(), o("button", {
							key: 1,
							class: "manage",
							"data-key": "wm-logo-remove",
							onClick: n[27] ||= (e) => Be({ logo: null })
						}, "移除")) : a("", !0)
					])]),
					ze.value.logo?.src ? (y(), o("div", Db, [n[81] ||= s("span", null, "Logo 宽度", -1), u(Yv, {
						"model-value": ze.value.logo.width,
						min: 20,
						max: 1e3,
						step: 10,
						"data-key": "wm-logo-width",
						onChange: n[28] ||= (e) => Be({ logo: {
							...ze.value.logo,
							width: e
						} })
					}, null, 8, ["model-value"])])) : a("", !0),
					s("div", Ob, [n[82] ||= s("span", null, "可见", -1), s("input", {
						type: "checkbox",
						checked: ze.value.visible === !0,
						"data-key": "wm-visible",
						onChange: n[29] ||= (e) => Be({ visible: e.target.checked })
					}, null, 40, kb)]),
					s("div", Ab, [n[83] ||= s("span", null, "透明度", -1), u(Yv, {
						"model-value": ze.value.opacity,
						min: .05,
						max: .6,
						step: .01,
						"data-key": "wm-opacity",
						onChange: n[30] ||= (e) => Be({ opacity: e })
					}, null, 8, ["model-value"])]),
					s("div", jb, [n[84] ||= s("span", null, "字号", -1), u(Yv, {
						"model-value": ze.value.fontSize,
						min: 4,
						max: 300,
						"data-key": "wm-font-size",
						onChange: n[31] ||= (e) => Be({ fontSize: e })
					}, null, 8, ["model-value"])]),
					s("div", Mb, [n[85] ||= s("span", null, "行距", -1), u(Yv, {
						"model-value": ze.value.rowGap,
						min: .5,
						max: 5,
						step: .1,
						unit: "×",
						title: "水印行距倍数（1 = 基准，调大更稀疏）",
						"data-key": "wm-row-gap",
						onChange: n[32] ||= (e) => Be({ rowGap: e })
					}, null, 8, ["model-value"])]),
					s("div", Nb, [n[86] ||= s("span", null, "旋转", -1), u(Yv, {
						"model-value": ze.value.rotation,
						min: -180,
						max: 180,
						unit: "°",
						"data-key": "wm-rotation",
						onChange: n[33] ||= (e) => Be({ rotation: e })
					}, null, 8, ["model-value"])]),
					s("div", Pb, [n[87] ||= s("span", null, "位置 X", -1), u(Yv, {
						"model-value": ze.value.dx,
						min: -2e3,
						max: 2e3,
						step: 10,
						"data-key": "wm-dx",
						onChange: n[34] ||= (e) => Be({ dx: e })
					}, null, 8, ["model-value"])]),
					s("div", Fb, [n[88] ||= s("span", null, "位置 Y", -1), u(Yv, {
						"model-value": ze.value.dy,
						min: -2e3,
						max: 2e3,
						step: 10,
						"data-key": "wm-dy",
						onChange: n[35] ||= (e) => Be({ dy: e })
					}, null, 8, ["model-value"])])
				])
			], 64)) : le.value ? (y(), o(e, { key: 4 }, [s("section", Ib, [s("div", Lb, [n[90] ||= s("span", { class: "card-title" }, "类别", -1), s("button", {
				class: "manage",
				onClick: n[36] ||= (e) => w(N).openCategoryModal()
			}, "⚙ 管理")]), u(iy, {
				value: Ee.value,
				categories: fe.value,
				"involved-cats": De.value,
				"data-key": "multi-cat",
				onChange: ke
			}, null, 8, [
				"value",
				"categories",
				"involved-cats"
			])]), s("section", Rb, [
				s("div", zb, [n[91] ||= s("span", { class: "card-title" }, "分区标签", -1), s("button", {
					class: "manage",
					"data-key": "sec-label-open",
					title: "批量编辑标签（序列/起始/方向）",
					onClick: n[37] ||= (e) => w(N).openLabelModal()
				}, "✎ 编辑")]),
				s("div", Bb, [n[92] ||= s("span", null, "标签", -1), s("input", {
					class: "ctl",
					value: Ae.value,
					readonly: "",
					title: Ae.value
				}, null, 8, Vb)]),
				u(py, {
					label: Ie.value,
					"key-prefix": "mlabel",
					onUpdate: Le
				}, null, 8, ["label"])
			])], 64)) : ue.value ? a("", !0) : (y(), o(e, { key: 5 }, [s("section", Hb, [s("div", Ub, [vt.value ? te((y(), o("input", {
				key: 1,
				ref_key: "nameInput",
				ref: bt,
				class: "ctl venue-name-input",
				"data-key": "venue-name-input",
				"onUpdate:modelValue": n[38] ||= (e) => yt.value = e,
				maxlength: "50",
				onKeydown: [ne(St, ["enter"]), ne(Ct, ["esc"])],
				onBlur: St
			}, null, 544)), [[ee, yt.value]]) : (y(), o(e, { key: 0 }, [s("span", Wb, C(w(O).venue.name || "未命名场馆"), 1), s("button", {
				class: "manage",
				"data-key": "venue-name-edit",
				title: "编辑场馆名",
				onClick: xt
			}, "✎ 编辑")], 64))])]), s("section", Gb, [
				s("div", Kb, [s("span", qb, "◉◉ " + C(fe.value.length) + " 个类别", 1), s("span", Jb, [s("button", {
					class: "manage",
					"data-key": "cat-manage",
					onClick: n[39] ||= (e) => w(N).openCategoryModal()
				}, "⚙ 管理")])]),
				s("div", Yb, [s("span", Xb, "◉ " + C(i.value.toLocaleString()) + " 座位", 1)]),
				s("div", {
					class: m(["sum-check", he.value ? "warn" : "ok"]),
					"data-key": "check-dup"
				}, C(he.value ? `${he.value.toLocaleString()} 个重复标签` : "✓ 无重复对象"), 3),
				s("div", {
					class: m(["sum-check", ge.value ? "warn" : "ok"]),
					"data-key": "check-unlabeled"
				}, C(ge.value ? `${ge.value.toLocaleString()} 个对象未标记` : "✓ 所有对象已标记"), 3),
				s("div", { class: m(["sum-check", me.value ? "warn" : "ok"]) }, C(me.value ? `${me.value.toLocaleString()} 个未分类对象` : "✓ 所有对象已分类"), 3)
			])], 64)),
			s("section", Zb, [s("div", Qb, [n[93] ||= s("span", { class: "card-title" }, "图例", -1), s("button", {
				class: "manage",
				"data-key": "legend-toggle",
				onClick: n[40] ||= (e) => pe.value = !pe.value
			}, C(pe.value ? "收起" : "展开"), 1)]), pe.value ? (y(), o(e, { key: 0 }, [
				n[94] ||= s("div", { class: "panel-sub" }, "类别", -1),
				(y(!0), o(e, null, S(fe.value, (e) => (y(), o("div", {
					class: "legend-row",
					key: e.key
				}, [s("span", {
					class: "dot",
					style: h({ background: e.color })
				}, null, 4), s("span", null, C(e.label), 1)]))), 128)),
				n[95] ||= c("<div class=\"legend-row\"><span class=\"dot\" style=\"background:#9ca3af;\"></span><span>未分类</span></div><div class=\"panel-sub\">状态（放大进入分区后显示在座位上）</div><div class=\"legend-row\"><svg class=\"legend-ico\" viewBox=\"0 0 12 12\"><circle cx=\"6\" cy=\"6\" r=\"6\" fill=\"#cbd5e1\"></circle><path d=\"M3,3 L9,9 M3,9 L9,3\" stroke=\"#1e293b\" stroke-width=\"1.2\" fill=\"none\"></path></svg><span>已售</span></div><div class=\"legend-row\"><svg class=\"legend-ico\" viewBox=\"0 0 12 12\"><circle cx=\"6\" cy=\"6\" r=\"6\" fill=\"#cbd5e1\"></circle><circle cx=\"6\" cy=\"6\" r=\"2.4\" fill=\"#1e293b\"></circle></svg><span>预留</span></div><div class=\"legend-row\"><svg class=\"legend-ico\" viewBox=\"0 0 12 12\"><circle cx=\"6\" cy=\"6\" r=\"6\" fill=\"#cbd5e1\"></circle><path d=\"M3,9 L9,3\" stroke=\"#1e293b\" stroke-width=\"1.2\" fill=\"none\"></path></svg><span>禁用</span></div><div class=\"muted\" style=\"margin-top:6px;\">全局视图下非可售座位统一显示为灰色</div>", 6)
			], 64)) : a("", !0)]),
			s("input", {
				ref_key: "wmLogoInput",
				ref: He,
				type: "file",
				accept: "image/*,.svg",
				style: { display: "none" },
				onChange: We
			}, null, 544)
		]));
	}
}, tx = { class: "statusbar" }, nx = { class: "hint" }, rx = {
	key: 0,
	class: "notice"
}, ix = {
	__name: "StatusBar",
	setup(e) {
		let t = n(() => {
			O.sectionsTick;
			let e = O.venue.sections.find((e) => e.id === O.editingSectionId);
			return e ? Ue(e) : "";
		}), r = n(() => {
			if (O.mode === "seats") return O.tool === "row" ? "单排：点击定起点，移动实时预览，再点击完成（继续点击画下一排）；Esc 取消本次绘制" : O.tool === "grid" ? "多行：点击定起点，再点击定首排，垂直移动展开多排后点击定排数；Esc 取消本次绘制" : O.tool === "lasso" ? "套索：按住拖出自由笔画，路过的座位排即被选中（Shift 加选），松开完成；选中后拖动移动、拖手柄旋转；单击=点选排；Esc 取消" : "框选座位；拖动移动选区；拖蓝色手柄旋转（Shift 吸附 15°）；双击空白或 Esc 退出分区";
			switch (O.tool) {
				case "select": return "单击选中分区或散座排，拖拽框选多选，拖动移动；双击进入分区；调整形状用节点编辑工具(N)";
				case "node": return "节点编辑：单击选中分区，拖顶点变形、拖边中点调弧度（生成参数分区拖手柄调整形状）；移动/旋转请回选择工具";
				default: return zv.find((e) => e.key === O.tool)?.hint || "";
			}
		}), i = n(() => {
			O.sectionsTick;
			let e = 0;
			for (let t of O.venue.sections) for (let n of t.rows) e += n.seats.length;
			return {
				seats: e,
				sections: O.venue.sections.length
			};
		}), c = n(() => (O.selectionTick, O.sectionSelectionTick, O.mode === "seats" ? O.selection.size : O.sectionSelection.size || O.selection.size));
		return (e, n) => (y(), o("footer", tx, [
			s("span", { class: m(["mode-badge", w(O).mode]) }, C(w(O).mode === "seats" ? `座位编辑 · ${t.value}` : "分区模式"), 3),
			s("span", nx, C(r.value), 1),
			w(O).notice ? (y(), o("span", rx, C(w(O).notice), 1)) : a("", !0),
			n[0] ||= s("span", { class: "spacer" }, null, -1),
			s("span", null, "分区 " + C(i.value.sections), 1),
			s("span", null, "座位 " + C(i.value.seats.toLocaleString()), 1),
			s("span", null, "已选 " + C(c.value.toLocaleString()), 1),
			s("span", null, "缩放 " + C(Math.round(w(O).zoom * 100)) + "%", 1)
		]));
	}
}, ax = {
	class: "modal",
	role: "dialog",
	"aria-label": "类别管理"
}, ox = { class: "modal-head" }, sx = { class: "modal-body" }, cx = ["data-key"], lx = { class: "cat-swatch-wrap" }, ux = ["data-key", "onClick"], dx = ["title", "onClick"], fx = {
	class: "palette-custom",
	title: "自定义颜色"
}, px = ["value", "onChange"], mx = [
	"data-key",
	"value",
	"onChange"
], hx = { class: "cat-count muted" }, gx = ["data-key", "onClick"], _x = ["title", "onClick"], vx = {
	key: 0,
	class: "empty"
}, yx = { class: "modal-foot" }, bx = {
	__name: "CategoryModal",
	setup(t) {
		let r = n(() => (O.sectionsTick, O.venue.categories.slice())), i = n(() => {
			O.canvasTick;
			let e = /* @__PURE__ */ new Map();
			for (let t of O.venue.sections) for (let n of t.rows) for (let t of n.seats) t.cat != null && e.set(t.cat, (e.get(t.cat) || 0) + 1);
			return e;
		}), c = x(null), u = x({
			x: 0,
			y: 0
		});
		function d(e, t) {
			if (c.value === e) {
				c.value = null;
				return;
			}
			let n = t.currentTarget.getBoundingClientRect();
			u.value = {
				x: n.left,
				y: n.bottom + 6
			}, c.value = e;
		}
		function f(e, t) {
			t !== v(e) && N.updateCategory(e, { color: t }), c.value = null;
		}
		function v(e) {
			return r.value.find((t) => t.key === e)?.color;
		}
		function b(e) {
			c.value != null && !e.target.closest(".cat-swatch-wrap") && (c.value = null);
		}
		function T() {
			c.value != null && (c.value = null);
		}
		function ee(e, t) {
			let n = t.target.value.trim();
			n && n !== e.label ? N.updateCategory(e.key, { label: n }) : t.target.value = e.label;
		}
		async function E() {
			let e = N.addCategory({});
			await p();
			let t = document.querySelector(`input[data-key="cat-label-${e.key}"]`);
			t && (t.focus(), t.select());
		}
		let te = x(null), re = null;
		function ie(e) {
			if (!i.value.get(e.key)) {
				N.removeCategory(e.key);
				return;
			}
			te.value = e.key, clearTimeout(re), re = setTimeout(() => {
				te.value = null;
			}, 3e3);
		}
		function oe(e) {
			clearTimeout(re), te.value = null, N.removeCategory(e);
		}
		function se() {
			clearTimeout(re), te.value = null;
		}
		function ce(e) {
			e.target === e.currentTarget && N.closeCategoryModal();
		}
		return _(() => {
			document.addEventListener("mousedown", b, !0), document.addEventListener("scroll", T, !0);
		}), g(() => {
			document.removeEventListener("mousedown", b, !0), document.removeEventListener("scroll", T, !0), clearTimeout(re);
		}), (t, n) => w(O).catModalOpen ? (y(), o("div", {
			key: 0,
			class: "modal-mask",
			"data-key": "cat-modal",
			onMousedown: ce
		}, [s("div", ax, [
			s("div", ox, [n[5] ||= s("span", { class: "modal-title" }, "类别管理", -1), s("button", {
				class: "modal-close",
				title: "关闭 (Esc)",
				onClick: n[0] ||= (e) => w(N).closeCategoryModal()
			}, "×")]),
			s("div", sx, [(y(!0), o(e, null, S(r.value, (t) => (y(), o("div", {
				key: t.key,
				class: "cat-item",
				"data-key": `cat-${t.key}`
			}, [
				s("div", lx, [s("button", {
					class: "cat-swatch",
					style: h({ background: t.color }),
					title: "类别颜色",
					"data-key": `cat-swatch-${t.key}`,
					onClick: (e) => d(t.key, e)
				}, [...n[6] ||= [s("span", { class: "swatch-caret" }, "▾", -1)]], 12, ux), c.value === t.key ? (y(), o("div", {
					key: 0,
					class: "palette-pop",
					style: h({
						left: u.value.x + "px",
						top: u.value.y + "px"
					})
				}, [(y(!0), o(e, null, S(w(ae), (e) => (y(), o("button", {
					key: e,
					class: m(["palette-color", { on: e === t.color }]),
					style: h({ background: e }),
					title: e,
					onClick: (n) => f(t.key, e)
				}, null, 14, dx))), 128)), s("label", fx, [s("input", {
					type: "color",
					value: t.color,
					onChange: (e) => f(t.key, e.target.value)
				}, null, 40, px), n[7] ||= l(" 自定义… ", -1)])], 4)) : a("", !0)]),
				s("input", {
					class: "cat-label",
					"data-key": `cat-label-${t.key}`,
					value: t.label,
					title: "类别名称",
					onChange: (e) => ee(t, e),
					onKeydown: n[1] ||= ne((e) => e.target.blur(), ["enter"])
				}, null, 40, mx),
				s("span", hx, C((i.value.get(t.key) || 0).toLocaleString()) + " 座", 1),
				te.value === t.key ? (y(), o(e, { key: 0 }, [s("button", {
					class: "cat-del confirm-yes",
					"data-key": `cat-del-yes-${t.key}`,
					onClick: (e) => oe(t.key)
				}, "删除", 8, gx), s("button", {
					class: "cat-del confirm-no",
					onClick: n[2] ||= (e) => se()
				}, "取消")], 64)) : (y(), o("button", {
					key: 1,
					class: "cat-del",
					title: i.value.get(t.key) ? "删除类别（座位回退为未分类）" : "删除类别",
					onClick: (e) => ie(t)
				}, "🗑", 8, _x))
			], 8, cx))), 128)), r.value.length ? a("", !0) : (y(), o("div", vx, "暂无类别，点击下方按钮创建价格区"))]),
			s("div", yx, [
				s("button", {
					class: "btn",
					"data-key": "cat-modal-add",
					onClick: n[3] ||= (e) => E()
				}, "+ 添加类别"),
				n[8] ||= s("span", { class: "spacer" }, null, -1),
				s("button", {
					class: "btn primary",
					onClick: n[4] ||= (e) => w(N).closeCategoryModal()
				}, "完成")
			])
		])], 32)) : a("", !0);
	}
}, xx = ["aria-label"], Sx = { class: "modal-head" }, Cx = { class: "modal-title" }, wx = { class: "label-head-actions" }, Tx = ["title"], Ex = { class: "modal-body" }, Dx = { class: "prop" }, Ox = ["value"], kx = { class: "prop" }, Ax = { class: "prop" }, jx = { class: "seg" }, Mx = ["title"], Nx = ["title"], Px = { class: "muted label-tip" }, Fx = { class: "modal-foot" }, Ix = ["disabled"], Lx = {
	__name: "LabelingModal",
	setup(t) {
		let r = [
			{
				key: "alpha",
				text: "A, B, C, …",
				start: "A"
			},
			{
				key: "num",
				text: "1, 2, 3, …",
				start: "1"
			},
			{
				key: "roman",
				text: "I, II, III, IV, …",
				start: "I"
			}
		], i = [
			{
				key: "num",
				text: "1, 2, 3, …",
				start: "1"
			},
			{
				key: "odd",
				text: "1, 3, 5, …",
				start: "1"
			},
			{
				key: "even",
				text: "2, 4, 6, …",
				start: "2"
			},
			{
				key: "oddEven",
				text: "1, 3, 5, …, 6, 4, 2",
				start: "1"
			},
			{
				key: "mirror",
				text: "…, 5, 3, 1, 2, 4, 6, …",
				start: "1"
			},
			{
				key: "alpha",
				text: "A, B, C, …",
				start: "A"
			},
			{
				key: "alphaLower",
				text: "a, b, c, …",
				start: "a"
			},
			{
				key: "roman",
				text: "I, II, III, IV, …",
				start: "I"
			}
		], c = x("num"), l = x("1"), u = x(!1);
		E(() => O.labelModalOpen, (e) => {
			e && (c.value = "num", l.value = "1", u.value = !1);
		});
		function d() {
			l.value = g.value.find((e) => e.key === c.value)?.start || "1";
		}
		let f = n(() => O.labelModalTarget), p = n(() => f.value === "rows"), h = n(() => f.value === "seats"), g = n(() => h.value ? i : r), _ = n(() => h.value ? "座位" : p.value ? "排" : "分区"), v = n(() => h.value && O.mode === "seats" && O.tool === "seat"), b = n(() => v.value ? (O.selectionTick, O.selection.size) : p.value || h.value ? (O.selectionTick, N.selectedRows().length) : (O.sectionSelectionTick, O.sectionSelection.size)), ne = () => p.value || h.value ? N.selectedRows().map((e) => e.id) : [...O.sectionSelection];
		function re() {
			if (!b.value) return;
			let e = l.value || "1";
			v.value ? N.renumberSelectedSeats([...O.selection], e, u.value ? -1 : 1, c.value) : h.value ? N.renumberSeats(ne(), e, u.value ? -1 : 1, c.value) : p.value ? N.labelRows(ne(), e, u.value, c.value) : N.labelSections(ne(), e, u.value, c.value), N.closeLabelModal();
		}
		function ie() {
			b.value && (v.value ? N.clearSelectedSeatNumbers([...O.selection]) : h.value ? N.clearSeatNumbers(ne()) : p.value ? N.clearRowLabels(ne()) : N.clearSectionLabels(ne()), N.closeLabelModal());
		}
		function ae(e) {
			e.target === e.currentTarget && N.closeLabelModal();
		}
		return (t, n) => w(O).labelModalOpen ? (y(), o("div", {
			key: 0,
			class: "modal-mask",
			"data-key": "label-modal",
			onMousedown: ae
		}, [s("div", {
			class: "modal labeling",
			role: "dialog",
			"aria-label": `${_.value}标签`
		}, [
			s("div", Sx, [s("span", Cx, C(h.value ? "座位编号" : `${_.value}标签`), 1), s("span", wx, [s("button", {
				class: "label-clear",
				"data-key": "label-clear",
				title: `清除选中${_.value}的${h.value ? "编号" : "标签"}（可撤销）`,
				onClick: ie
			}, "✕ 清除", 8, Tx), s("button", {
				class: "modal-close",
				title: "关闭 (Esc)",
				onClick: n[0] ||= (e) => w(N).closeLabelModal()
			}, "×")])]),
			s("div", Ex, [
				s("div", Dx, [n[6] ||= s("span", null, "序列样式", -1), te(s("select", {
					"onUpdate:modelValue": n[1] ||= (e) => c.value = e,
					class: "ctl",
					"data-key": "label-style",
					onChange: d
				}, [(y(!0), o(e, null, S(g.value, (e) => (y(), o("option", {
					key: e.key,
					value: e.key
				}, C(e.text), 9, Ox))), 128))], 544), [[T, c.value]])]),
				s("div", kx, [n[7] ||= s("span", null, "起始", -1), te(s("input", {
					"onUpdate:modelValue": n[2] ||= (e) => l.value = e,
					class: "ctl",
					"data-key": "label-start"
				}, null, 512), [[ee, l.value]])]),
				s("div", Ax, [n[8] ||= s("span", null, "方向", -1), s("div", jx, [s("button", {
					class: m({ on: !u.value }),
					"data-key": "label-dir-fwd",
					title: h.value ? "每排沿排方向正向编号" : "按选中顺序正向编号",
					onClick: n[3] ||= (e) => u.value = !1
				}, "正向", 10, Mx), s("button", {
					class: m({ on: u.value }),
					"data-key": "label-dir-rev",
					title: h.value ? "每排沿排方向反向编号" : "按选中顺序反向编号",
					onClick: n[4] ||= (e) => u.value = !0
				}, "反向", 10, Nx)])]),
				s("div", Px, C(v.value ? `作用于选中的 ${b.value} 个座位（按排分组，每排从起始值独立编号）` : h.value ? `作用于选中座位涉及的 ${b.value} 排，每排均从起始值独立编号` : `作用于当前选中的 ${b.value} ${p.value ? "排" : "个分区"}，按点选先后排序编号`), 1)
			]),
			s("div", Fx, [
				n[9] ||= s("span", { class: "spacer" }, null, -1),
				s("button", {
					class: "btn",
					onClick: n[5] ||= (e) => w(N).closeLabelModal()
				}, "取消"),
				s("button", {
					class: "btn primary",
					"data-key": "label-apply",
					disabled: !b.value,
					onClick: re
				}, "应用", 8, Ix)
			])
		], 8, xx)], 32)) : a("", !0);
	}
}, Rx = { class: "zp-dial" }, zx = { class: "zp-zoom" }, Bx = 20, Vx = {
	__name: "ZoomPad",
	setup(e) {
		let t = {
			up: [0, -1],
			right: [1, 0],
			down: [0, 1],
			left: [-1, 0]
		}, n = 0;
		function r() {
			n && cancelAnimationFrame(n), n = 0;
		}
		function i(e) {
			r();
			let t = () => {
				e(), n = requestAnimationFrame(t);
			};
			n = requestAnimationFrame(t);
		}
		function a(e, n) {
			n.preventDefault();
			let [a, o] = t[e], s = 0;
			i(() => {
				s++;
				let e = Math.min(4 + s * .4, 16);
				N.panBy(a * e, o * e);
			}), c(r);
		}
		function c(e) {
			let t = () => {
				e(), window.removeEventListener("pointerup", t), window.removeEventListener("pointercancel", t), window.removeEventListener("pointermove", p);
			};
			return window.addEventListener("pointerup", t), window.addEventListener("pointercancel", t), t;
		}
		let l = x({
			x: 0,
			y: 0
		}), u = x(!1), d = null;
		function f(e) {
			e.preventDefault(), u.value = !0, d = e.currentTarget.closest(".zp-dial"), i(() => {
				let { x: e, y: t } = l.value;
				if (e || t) {
					let n = .55 * (D.zoom.stickSpeed || 1);
					N.panBy(e * n, t * n);
				}
			}), window.addEventListener("pointermove", p), c(() => {
				r(), u.value = !1, l.value = {
					x: 0,
					y: 0
				};
			});
		}
		function p(e) {
			if (!u.value || !d) return;
			let t = d.getBoundingClientRect(), n = e.clientX - (t.left + t.width / 2), r = e.clientY - (t.top + t.height / 2), i = Math.hypot(n, r);
			i > Bx && (n = n / i * Bx, r = r / i * Bx), l.value = {
				x: Math.round(n),
				y: Math.round(r)
			};
		}
		return g(r), (e, t) => (y(), o("div", {
			class: "zoom-pad",
			"data-key": "zoom-pad",
			onContextmenu: t[7] ||= re(() => {}, ["prevent"])
		}, [s("div", Rx, [
			s("button", {
				class: "zp-arrow zp-up",
				"data-key": "zp-pan-up",
				title: "向上平移（按住连续）",
				onPointerdown: t[0] ||= (e) => a("up", e)
			}, [...t[8] ||= [s("svg", { viewBox: "0 0 10 10" }, [s("path", { d: "M5 2.2 8.4 7H1.6Z" })], -1)]], 32),
			s("button", {
				class: "zp-arrow zp-right",
				"data-key": "zp-pan-right",
				title: "向右平移（按住连续）",
				onPointerdown: t[1] ||= (e) => a("right", e)
			}, [...t[9] ||= [s("svg", { viewBox: "0 0 10 10" }, [s("path", { d: "M5 2.2 8.4 7H1.6Z" })], -1)]], 32),
			s("button", {
				class: "zp-arrow zp-down",
				"data-key": "zp-pan-down",
				title: "向下平移（按住连续）",
				onPointerdown: t[2] ||= (e) => a("down", e)
			}, [...t[10] ||= [s("svg", { viewBox: "0 0 10 10" }, [s("path", { d: "M5 2.2 8.4 7H1.6Z" })], -1)]], 32),
			s("button", {
				class: "zp-arrow zp-left",
				"data-key": "zp-pan-left",
				title: "向左平移（按住连续）",
				onPointerdown: t[3] ||= (e) => a("left", e)
			}, [...t[11] ||= [s("svg", { viewBox: "0 0 10 10" }, [s("path", { d: "M5 2.2 8.4 7H1.6Z" })], -1)]], 32),
			t[12] ||= s("span", { class: "zp-ring" }, null, -1),
			s("button", {
				class: m(["zp-knob", { dragging: u.value }]),
				"data-key": "zp-fit",
				title: "拖动平移画布（双击适应窗口）",
				style: h({ transform: `translate(-50%, -50%) translate(${l.value.x}px, ${l.value.y}px)` }),
				onPointerdown: f,
				onDblclick: t[4] ||= (e) => w(N).fit()
			}, null, 38)
		]), s("div", zx, [s("button", {
			class: "zp-zoom-btn",
			"data-key": "zp-zoom-out",
			title: "缩小",
			onClick: t[5] ||= (e) => w(N).zoomOut()
		}, "−"), s("button", {
			class: "zp-zoom-btn",
			"data-key": "zp-zoom-in",
			title: "放大",
			onClick: t[6] ||= (e) => w(N).zoomIn()
		}, "＋")])], 32));
	}
}, Hx = Math.PI * 2, Ux = 1e-9, Wx = 2, Gx = (e) => +e.toFixed(2);
function Kx(e) {
	return {
		closed: !!e?.closed,
		anchors: (e?.anchors ?? []).map((e) => ({
			x: e.x,
			y: e.y
		})),
		segs: (e?.segs ?? []).map((e) => ({ ...e }))
	};
}
var qx = (e) => (e % Hx + Hx) % Hx;
function Jx(e) {
	let t = [], n = [], r = !1;
	if (!e) return {
		closed: r,
		anchors: t,
		segs: n
	};
	let i = fe(e), a = 0, o = 0, s = 0, c = (e, n) => {
		t.push({
			x: e,
			y: n
		}), o = e, s = n;
	};
	for (; a < i.length;) {
		let e = i[a++];
		if (typeof e == "number") break;
		let l = e === e.toLowerCase(), u = e.toUpperCase();
		if (u === "M") c(i[a++] + (l ? o : 0), i[a++] + (l ? s : 0));
		else if (u === "L") n.push({ type: "L" }), c(i[a++] + (l ? o : 0), i[a++] + (l ? s : 0));
		else if (u === "H") n.push({ type: "L" }), c(i[a++] + (l ? o : 0), s);
		else if (u === "V") n.push({ type: "L" }), c(o, i[a++] + (l ? s : 0));
		else if (u === "A") {
			let e = i[a++];
			i[a++], i[a++];
			let t = i[a++], r = i[a++];
			n.push({
				type: "A",
				r: e,
				laf: t,
				sf: r
			}), c(i[a++] + (l ? o : 0), i[a++] + (l ? s : 0));
		} else if (u === "Z") {
			r = !0;
			let e = t[0], i = t[t.length - 1];
			t.length > 1 && Math.hypot(i.x - e.x, i.y - e.y) < 1e-6 ? t.pop() : t.length > 1 && n.push({ type: "L" });
		}
	}
	return {
		closed: r,
		anchors: t,
		segs: n
	};
}
function Yx(e) {
	let { closed: t, anchors: n = [], segs: r = [] } = e ?? {};
	if (!n.length) return "";
	let i = n.length, a = [`M${Gx(n[0].x)} ${Gx(n[0].y)}`];
	for (let e = 0; e < r.length; e++) {
		let o = r[e], s = n[(e + 1) % i];
		if (t && e === r.length - 1 && o.type !== "A") break;
		o.type === "A" ? a.push(`A${Gx(o.r)} ${Gx(o.r)} 0 ${+!!o.laf} ${+!!o.sf} ${Gx(s.x)} ${Gx(s.y)}`) : a.push(`L${Gx(s.x)} ${Gx(s.y)}`);
	}
	return t && a.push("Z"), a.join("");
}
function Xx(e, t) {
	let n = e?.anchors?.length ?? 0, r = e?.segs?.[t], i = e?.anchors?.[t], a = n ? e.anchors[(t + 1) % n] : void 0;
	if (!r || !i || !a) return {
		x: 0,
		y: 0
	};
	let o = () => ({
		x: (i.x + a.x) / 2,
		y: (i.y + a.y) / 2
	});
	if (r.type !== "A" || !Number.isFinite(r.r) || r.r <= 0 || Math.hypot(a.x - i.x, a.y - i.y) < Ux) return o();
	let s = pe(i.x, i.y, r.r, r.r, 0, +!!r.laf, +!!r.sf, a.x, a.y), c = s.th1 + s.dth / 2, l = s.cx + s.rx * Math.cos(c), u = s.cy + s.ry * Math.sin(c);
	return Number.isFinite(l) && Number.isFinite(u) ? {
		x: l,
		y: u
	} : o();
}
function Zx(e, t, n) {
	let r = Kx(e);
	return !Number.isInteger(t) || t < 0 || t >= r.anchors.length || !n || !Number.isFinite(n.x) || !Number.isFinite(n.y) || (r.anchors[t] = {
		x: n.x,
		y: n.y
	}), r;
}
function Qx(e, t, n, r = Wx) {
	let i = Kx(e), a = i.anchors.length;
	if (!Number.isInteger(t) || t < 0 || t >= i.segs.length || !a || !n || !Number.isFinite(n.x) || !Number.isFinite(n.y)) return i;
	let o = i.anchors[t], s = i.anchors[(t + 1) % a], c = s.x - o.x, l = s.y - o.y, u = Math.hypot(c, l);
	if (u < Ux) return i;
	if (Math.abs(c * (n.y - o.y) - l * (n.x - o.x)) / u < r) return i.segs[t] = { type: "L" }, i;
	let d = (o.x + n.x) / 2, f = (o.y + n.y) / 2, p = (n.x + s.x) / 2, m = (n.y + s.y) / 2, h = -(n.y - o.y), g = n.x - o.x, _ = -(s.y - n.y), v = s.x - n.x, y = h * v - g * _;
	if (!Number.isFinite(y) || Math.abs(y) < 1e-12) return i;
	let b = ((p - d) * v - (m - f) * _) / y, x = d + b * h, S = f + b * g, C = Math.hypot(o.x - x, o.y - S);
	if (!Number.isFinite(C) || C <= 0) return i;
	let w = Math.atan2(o.y - S, o.x - x), T = Math.atan2(n.y - S, n.x - x), ee = Math.atan2(s.y - S, s.x - x), E = qx(T - w), te = qx(ee - w), ne = +(E <= te), re = +((ne ? te : Hx - te) > Math.PI);
	return i.segs[t] = {
		type: "A",
		r: C,
		laf: re,
		sf: ne
	}, i;
}
//#endregion
//#region src/canvas/overlay.js
function $x(e, t, n = 0, r = 36) {
	return {
		x: (e.minX + e.maxX) / 2,
		y: e.minY - n - t(r)
	};
}
function eS(e, t, n, { pad: r = 0, color: i = "#3b82f6", handle: a = !0, rotation: o = null } = {}) {
	let s;
	if (o) {
		let { deg: e, center: a } = o;
		s = new Mp({
			path: `M${[
				ye(t.minX - r, t.minY - r, a.x, a.y, e),
				ye(t.maxX + r, t.minY - r, a.x, a.y, e),
				ye(t.maxX + r, t.maxY + r, a.x, a.y, e),
				ye(t.minX - r, t.maxY + r, a.x, a.y, e)
			].map((e) => `${e.x.toFixed(2)} ${e.y.toFixed(2)}`).join("L")}Z`,
			stroke: i,
			strokeWidth: n(1.5),
			hittable: !1
		});
	} else s = Bf.one({
		stroke: i,
		strokeWidth: n(1.5),
		hittable: !1
	}, t.minX - r, t.minY - r, t.maxX - t.minX + r * 2, t.maxY - t.minY + r * 2);
	let c = [s];
	if (a) {
		let e = {
			x: (t.minX + t.maxX) / 2,
			y: t.minY - r
		}, a = $x(t, n, r);
		if (o) {
			let { deg: t, center: n } = o, r = ye(e.x, e.y, n.x, n.y, t);
			e.x = r.x, e.y = r.y, a = ye(a.x, a.y, n.x, n.y, t);
		}
		c.push(new Mp({
			path: `M${e.x.toFixed(2)} ${e.y.toFixed(2)}L${a.x.toFixed(2)} ${a.y.toFixed(2)}`,
			stroke: i,
			strokeWidth: n(1.5),
			hittable: !1
		}), np.one({
			width: n(16),
			height: n(16),
			fill: i,
			cursor: "grab"
		}, a.x - n(8), a.y - n(8)));
	}
	for (let t of c) e.add(t);
	return c;
}
function tS(e, t, n, r = "#3b82f6") {
	e.add(Bf.one({
		fill: "rgba(59,130,246,0.12)",
		stroke: r,
		strokeWidth: n(1.5),
		dashPattern: [n(8), n(6)]
	}, t.minX, t.minY, t.maxX - t.minX, t.maxY - t.minY));
}
function nS(e, t, n, r = "#3b82f6", i = !1) {
	if (t.length < 2) return;
	let a = `M${t[0].x.toFixed(2)} ${t[0].y.toFixed(2)}`;
	for (let e = 1; e < t.length; e++) a += `L${t[e].x.toFixed(2)} ${t[e].y.toFixed(2)}`;
	i ? (a += "Z", e.add(new Mp({
		path: a,
		fill: "rgba(59,130,246,0.08)",
		stroke: "rgba(59,130,246,0.18)",
		strokeWidth: n(10),
		hittable: !1
	})), e.add(new Mp({
		path: a,
		stroke: r,
		strokeWidth: n(2),
		hittable: !1
	}))) : (e.add(new Mp({
		path: a,
		stroke: "rgba(59,130,246,0.18)",
		strokeWidth: n(10),
		hittable: !1
	})), e.add(new Mp({
		path: a,
		stroke: r,
		strokeWidth: n(2),
		hittable: !1
	})));
}
function rS(e, t, n, r = "#f43f5e") {
	for (let i of t) {
		let t = i.axis === "x" ? `M${i.pos.toFixed(2)} ${i.from.toFixed(2)}L${i.pos.toFixed(2)} ${i.to.toFixed(2)}` : `M${i.from.toFixed(2)} ${i.pos.toFixed(2)}L${i.to.toFixed(2)} ${i.pos.toFixed(2)}`;
		e.add(new Mp({
			path: t,
			stroke: r,
			strokeWidth: n(1),
			dashPattern: [n(4), n(4)]
		}));
	}
}
//#endregion
//#region src/canvas/interaction.js
function iS(e) {
	let { app: t, layerSel: n, layerTmp: r, toWorld: i, px: a } = e, o = () => typeof e.pad == "function" ? e.pad() : e.pad || 0, s = e.rotate !== !1, c = e.color || "#3b82f6", l = null, u = [], d = () => l !== null;
	function f(t, r = null) {
		for (let e of u) e.remove();
		if (u = [], t === void 0) {
			let n = e.getSelection();
			if (!n.length) return;
			t = e.boundsOf(n);
		}
		t && (u = eS(n, t, a, {
			pad: o(),
			color: c,
			handle: s,
			rotation: r
		}));
	}
	function p(t) {
		if (e.previewBounds) return e.previewBounds(l.orig, t);
		let n = e.boundsOf(e.getSelection());
		return n ? {
			minX: n.minX + t.dx,
			minY: n.minY + t.dy,
			maxX: n.maxX + t.dx,
			maxY: n.maxY + t.dy
		} : null;
	}
	function m(t) {
		if (!e.enabled() || t.spaceKey || t.middle) return;
		let n = i(t), c = e.getSelection();
		if (s && c.length) {
			let t = e.boundsOf(c);
			if (t) {
				let r = $x(t, a, o());
				if (Math.hypot(n.x - r.x, n.y - r.y) <= a(12)) {
					let r = {
						x: (t.minX + t.maxX) / 2,
						y: (t.minY + t.maxY) / 2
					};
					l = {
						type: "rotate",
						center: r,
						startBounds: t,
						startAngle: xe(r.x, r.y, n),
						orig: e.snapshot?.(c),
						delta: 0
					}, e.onDragStart?.("rotate", c);
					return;
				}
			}
		}
		let u = e.hitTest(n);
		if (e.lassoEnabled?.()) {
			let i = u != null && c.includes(u), a = !1;
			if (!i && c.length) {
				let t = e.boundsOf(c);
				a = !!(t && n.x >= t.minX - o() && n.x <= t.maxX + o() && n.y >= t.minY - o() && n.y <= t.maxY + o());
			}
			if (!i && !a) {
				let i = t.ctrlKey || t.metaKey, a = t.shiftKey && !i ? [...c] : [];
				(!t.shiftKey || i) && e.setSelection([]), l = {
					type: "lasso",
					pts: [n],
					base: a,
					moved: !1,
					ctrlKey: i
				}, e.onDragStart?.("marquee", c), r.clear();
				return;
			}
		}
		if (u != null) {
			let r = c.includes(u);
			r || e.setSelection(t.shiftKey ? [...c, u] : [u]), l = {
				type: "move",
				start: n,
				hitId: u,
				wasSelected: r,
				shift: t.shiftKey,
				moved: !1,
				orig: null
			}, e.onDragStart?.("move", e.getSelection());
		} else if (c.length) {
			let i = e.boundsOf(c);
			if (i && n.x >= i.minX - o() && n.x <= i.maxX + o() && n.y >= i.minY - o() && n.y <= i.maxY + o()) {
				l = {
					type: "move",
					start: n,
					hitId: null,
					wasSelected: !0,
					shift: !1,
					moved: !1,
					orig: null
				}, e.onDragStart?.("move", c);
				return;
			}
			l = {
				type: "marquee",
				start: n,
				base: t.shiftKey ? [...c] : []
			}, e.setSelection(l.base), e.onDragStart?.("marquee", c), r.clear();
		} else l = {
			type: "marquee",
			start: n,
			base: []
		}, e.onDragStart?.("marquee", c), r.clear();
	}
	function h(t) {
		if (!l) return;
		let n = i(t);
		if (l.type === "rotate") {
			let r = xe(l.center.x, l.center.y, n) - l.startAngle;
			t.shiftKey && (r = Math.round(r / 15) * 15), l.delta = r, e.onPreviewRotate?.(l.orig, e.getSelection(), r, l.center), f(l.startBounds, {
				deg: r,
				center: l.center
			});
			return;
		}
		if (l.type === "move") {
			let i = n.x - l.start.x, o = n.y - l.start.y;
			if (!l.moved && Math.hypot(i, o) / a(1) < 3) return;
			l.moved || (l.moved = !0, l.orig = e.snapshot?.(e.getSelection()));
			let s = null;
			if (e.snap && !t.altKey) {
				let t = e.boundsOf(e.getSelection());
				t && ({dx: i, dy: o, guides: s} = e.snap(t, i, o));
			}
			l.dx = i, l.dy = o, e.onPreviewMove?.(l.orig, e.getSelection(), i, o), r.clear(), s?.length && rS(r, s, a), f(p({
				type: "move",
				dx: i,
				dy: o
			}));
			return;
		}
		if (l.type === "marquee") {
			let t = be(l.start, n);
			r.clear(), tS(r, t, a, c), e.setSelection([...l.base, ...e.collect(t)]);
			return;
		}
		if (l.type === "lasso") {
			let t = l.pts[l.pts.length - 1];
			if (Math.hypot(n.x - t.x, n.y - t.y) / a(1) < 4) return;
			l.pts.push(n), !l.moved && Math.hypot(n.x - l.pts[0].x, n.y - l.pts[0].y) / a(1) >= 3 && (l.moved = !0);
			let i = l.pts.length >= 3 && Math.hypot(l.pts[l.pts.length - 1].x - l.pts[0].x, l.pts[l.pts.length - 1].y - l.pts[0].y) <= a(16);
			r.clear(), l.pts.length >= 2 && (nS(r, l.pts, a, c, i), e.setSelection([...l.base, ...e.collectPoly?.(l.pts, l.ctrlKey, i) || []]));
		}
	}
	function g(t) {
		if (!l) return;
		let n = i(t), a = e.getSelection();
		if (l.type === "rotate") Math.abs(l.delta) > .5 && e.onCommitRotate?.(a, l.delta, l.center);
		else if (l.type === "move") l.moved ? (r.clear(), e.onCommitMove?.(a, l.dx ?? n.x - l.start.x, l.dy ?? n.y - l.start.y)) : l.shift && l.wasSelected ? e.setSelection(a.filter((e) => e !== l.hitId)) : !l.shift && l.wasSelected && a.length > 1 && l.hitId != null && e.collapseOnClick !== !1 && e.setSelection([l.hitId]);
		else if (l.type === "marquee") r.clear();
		else if (l.type === "lasso" && (r.clear(), !l.moved || l.pts.length < 2)) {
			let r = e.hitTest(n);
			if (r != null) {
				let n = e.getSelection();
				n.includes(r) ? t.shiftKey && e.setSelection(n.filter((e) => e !== r)) : e.setSelection([...n, r]);
			} else t.shiftKey || e.setSelection(l.base);
		}
		e.onDragEnd?.(l.type), l = null, f();
	}
	let _ = [
		t.on_(Q.DOWN, m),
		t.on_(Q.MOVE, h),
		t.on_(Q.UP, g)
	];
	return {
		dragging: d,
		repaint: f,
		cancel() {
			l = null, r.clear(), f();
		},
		destroy() {
			t.off_(_);
		}
	};
}
//#endregion
//#region src/canvas/snap.js
function aS(e) {
	let t = [], n = [];
	for (let r of e) {
		let e = (r.minX + r.maxX) / 2, i = (r.minY + r.maxY) / 2;
		for (let n of [
			r.minX,
			e,
			r.maxX
		]) t.push({
			pos: n,
			min: r.minY,
			max: r.maxY
		});
		for (let e of [
			r.minY,
			i,
			r.maxY
		]) n.push({
			pos: e,
			min: r.minX,
			max: r.maxX
		});
	}
	return {
		xs: t,
		ys: n
	};
}
function oS(e, t, n, r, i) {
	let a = (e, t) => {
		let n = null;
		for (let r of e) for (let e of t) {
			let t = r.pos - e;
			Math.abs(t) < i && (!n || Math.abs(t) < Math.abs(n.d)) && (n = {
				d: t,
				c: r
			});
		}
		return n;
	}, o = (e.minX + e.maxX) / 2 + t, s = (e.minY + e.maxY) / 2 + n, c = a(r.xs, [
		e.minX + t,
		o,
		e.maxX + t
	]), l = a(r.ys, [
		e.minY + n,
		s,
		e.maxY + n
	]), u = t + (c ? c.d : 0), d = n + (l ? l.d : 0), f = [];
	return c && f.push({
		axis: "x",
		pos: c.c.pos,
		from: Math.min(e.minY + d, c.c.min),
		to: Math.max(e.maxY + d, c.c.max)
	}), l && f.push({
		axis: "y",
		pos: l.c.pos,
		from: Math.min(e.minX + u, l.c.min),
		to: Math.max(e.maxX + u, l.c.max)
	}), {
		dx: u,
		dy: d,
		guides: f
	};
}
//#endregion
//#region src/seatmap/editor.js
var sS = 12 * .9;
function cS(e) {
	let t = new Fp({
		view: e,
		fill: de,
		tree: { type: "design" },
		wheel: {
			preventDefault: !0,
			getScale(e) {
				if (D.zoom.wheelZoom === !1 || !e.ctrlKey && !e.metaKey) return 1;
				let t = e.deltaY || e.deltaX;
				if (!t) return 1;
				let n = 1 + Math.min(Math.abs(t) / 100, 1) * D.zoom.step;
				return t > 0 ? 1 / n : n;
			}
		},
		zoom: {
			min: D.zoom.min,
			max: D.zoom.max
		}
	}), n = t.tree, r = new If(), i = new If(), a = new If(), o = new If();
	r.data = { layer: "bg" }, i.data = { layer: "content" }, a.data = { layer: "sel" }, o.data = { layer: "tmp" }, n.add(r), n.add(i), n.add(a), n.add(o);
	let s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Set(), u = null, d = () => O.mode === "seats";
	function f(e) {
		return n.scaleX * hn() >= sS;
	}
	let p = (e) => e / n.scaleX, m = () => pn(D.seatDefaults.seatPitch), h = () => pn(D.seatDefaults.rowPitch), g = () => m() / 2, _ = () => {
		let e = Nt();
		return e && e.rows.some((e) => e.seats.length) ? mn(e) : m();
	}, v = () => +(_() * .75).toFixed(2), y = () => dn() === 0 ? +p(D.seatDefaults.size).toFixed(2) : v(), b = (e) => hn() / 2, x = (e) => n.getPagePoint({
		x: e.x,
		y: e.y
	}), S = /* @__PURE__ */ new Map();
	function C() {
		let e = (O.venue.images || []).filter((e) => e.visible !== !1), t = new Set(e.map((e) => e.id));
		for (let [e, n] of S) t.has(e) || (n.remove(), S.delete(e));
		for (let t of e) {
			let e = S.get(t.id);
			e && e.url !== t.src && (e.remove(), e = null), e || (e = new Ep({
				url: t.src,
				origin: "center"
			}), e.data = { imageId: t.id }, S.set(t.id, e)), e.x = t.x, e.y = t.y, e.width = t.w, e.height = t.h, e.opacity = t.opacity, e.rotation = t.rotation || 0, e.locked = !!t.locked, r.add(e);
		}
	}
	let w = E(() => O.imageTick, () => {
		C(), Me();
	});
	C();
	function T() {
		let e = O.venue.images || [];
		return e.find((e) => e.id === O.activeImageId && e.visible !== !1) || e.find((e) => e.visible !== !1) || null;
	}
	let ee = (e) => ({
		x: e.x + e.w / 2,
		y: e.y + e.h / 2
	});
	function te(e, t) {
		if (e.rotation) {
			let n = ee(e);
			t = ye(t.x, t.y, n.x, n.y, -e.rotation);
		}
		return t.x >= e.x && t.x <= e.x + e.w && t.y >= e.y && t.y <= e.y + e.h;
	}
	function ne(e) {
		if (!e.rotation) return {
			minX: e.x,
			minY: e.y,
			maxX: e.x + e.w,
			maxY: e.y + e.h
		};
		let t = ee(e), n = [
			ye(e.x, e.y, t.x, t.y, e.rotation),
			ye(e.x + e.w, e.y, t.x, t.y, e.rotation),
			ye(e.x + e.w, e.y + e.h, t.x, t.y, e.rotation),
			ye(e.x, e.y + e.h, t.x, t.y, e.rotation)
		], r = n.map((e) => e.x), i = n.map((e) => e.y);
		return {
			minX: Math.min(...r),
			maxX: Math.max(...r),
			minY: Math.min(...i),
			maxY: Math.max(...i)
		};
	}
	let re = null;
	function ie() {
		let e = Infinity, t = Infinity, n = -Infinity, r = -Infinity, i = (i, a) => {
			i < e && (e = i), i > n && (n = i), a < t && (t = a), a > r && (r = a);
		};
		for (let e of O.venue.sections) {
			for (let t of e.path ? ct(e.path) : []) i(t.x, t.y);
			for (let t of e.rows) for (let e of t.seats) i(e.x, e.y);
		}
		let a = O.venue.stage;
		return a && (i(a.x, a.y), i(a.x + a.w, a.y + a.h)), e === Infinity ? null : {
			x: e,
			y: t,
			w: n - e,
			h: r - t
		};
	}
	function ae(e) {
		return $t(e.cat)?.color || "#9ca3af";
	}
	function oe(e) {
		return f(e) ? d() ? e.id === O.editingSectionId : !!e.loose && Cn() : !1;
	}
	function se(e, t) {
		if (O.selection.has(e.id)) return le;
		let n = ae(e);
		return e.status === "available" || oe(t) ? n : Dv(n);
	}
	function ce(e, t) {
		let n = Ev(ae(e)) < 150 ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.75)", r = hn(), i = r / 4, a = Math.max(r * .1, .05), { x: o, y: s } = e;
		return e.status === "sold" ? new Mp({
			path: `M${o - i},${s - i}L${o + i},${s + i}M${o - i},${s + i}L${o + i},${s - i}`,
			stroke: n,
			strokeWidth: a
		}) : e.status === "reserved" ? np.one({
			width: i * 1.6,
			height: i * 1.6,
			fill: n
		}, o - i * .8, s - i * .8) : e.status === "disabled" ? new Mp({
			path: `M${o - i},${s + i}L${o + i},${s - i}`,
			stroke: n,
			strokeWidth: a
		}) : null;
	}
	function ue(e, t) {
		let n = Ve(e, O.venue.categories) || e.color;
		return t ? {
			fill: wv(n, .15),
			stroke: le,
			strokeWidth: p(2)
		} : {
			fill: wv(n, .15),
			stroke: wv(n, .5),
			strokeWidth: 1
		};
	}
	function fe(e) {
		let t = Ge(e);
		return t.visible && !!(t.text || e.name) && !!He(e);
	}
	function pe(e, t) {
		let n = Ge(t), r = He(t);
		if (!r) return;
		let i = n.text || t.name, a = n.fontSize > 0 ? n.fontSize : 14, o = Ov(i, a);
		e.text = i, e.fontSize = a, e.rotation = n.rotation || 0, e.x = r.cx + (n.dx || 0) - o / 2, e.y = r.cy + (n.dy || 0) - a / 2;
	}
	function me(e) {
		let t = qe(e), n = !!t.text, r = t.logo && t.logo.src ? t.logo : null;
		if (!t.visible || !n && !r || !e.path || e.loose) return null;
		let i = He(e);
		if (!i) return null;
		let a = t.fontSize, o = n ? Ov(t.text, a) : 0, s = r ? r.width > 0 ? r.width : 20 : 0, c = r ? s * (r.ratio > 0 ? r.ratio : .6) : 0, l = Math.min(1, Math.max(0, t.opacity ?? .18)), u = new If({
			data: {
				watermark: !0,
				opacity: l
			},
			hittable: !1
		}), d = new If({
			x: i.cx,
			y: i.cy,
			rotation: t.rotation || 0,
			origin: "center",
			hittable: !1
		}), f = Math.max(n ? o + a * 1.6 : 0, r ? s * 2 : 0), p = Math.max(n ? a * 2.6 : 0, r ? c * 2.2 : 0) * (t.rowGap > 0 ? t.rowGap : 1), m = Math.hypot(i.w, i.h) / 2 + f, h = Math.ceil(m * 2 / f) * Math.ceil(m * 2 / p);
		if (h > 400) {
			let e = Math.sqrt(h / 400);
			f *= e, p *= e;
		}
		let g = ct(e.path), _ = (t.rotation || 0) * Math.PI / 180, v = Math.cos(_), y = Math.sin(_), b = i.cx, x = i.cy, S = (e, t) => Se(b + e * v - t * y, x + e * y + t * v, g), C = Tv(t.color, l), w = 0;
		for (let e = -m; e <= m + .01; e += p, w++) {
			let i = w % 2 ? f / 2 : 0, u = !!r && (!n || w % 2 == 1);
			for (let n = -m; n <= m + .01; n += f) S(n + i, e) && (u ? d.add(new Ep({
				url: r.src,
				x: n + i - s / 2,
				y: e - c / 2,
				width: s,
				height: c,
				opacity: l,
				hittable: !1
			})) : d.add(new Z({
				text: t.text,
				x: n + i - o / 2,
				y: e - a / 2,
				width: o,
				height: a,
				fontSize: a,
				textAlign: "center",
				verticalAlign: "middle",
				fill: C,
				hittable: !1
			})));
		}
		return u.add(d), u;
	}
	function he(e) {
		if (!e) return;
		let t = s.get(e.id);
		if (!t) return;
		let n = t.group.children.find((e) => e.data?.watermark);
		if (!n) return;
		let r = t.group.children.indexOf(n);
		n.remove();
		let i = me(e);
		i && t.group.addAt(i, r);
	}
	function ge(e, t) {
		let n = e.seats.length;
		if (!n) return null;
		let r = t(e.seats[0]), i = t(e.seats[n - 1]), a = (e, t) => {
			let n = Math.hypot(e, t);
			return n > .001 ? {
				x: e / n,
				y: t / n
			} : null;
		}, o = null, s = null;
		if (n >= 2) {
			let c = t(e.seats[1]), l = t(e.seats[n - 2]);
			o = a(r.x - c.x, r.y - c.y), s = a(i.x - l.x, i.y - l.y);
		}
		return {
			first: r,
			last: i,
			dStart: o || {
				x: -1,
				y: 0
			},
			dEnd: s || {
				x: 1,
				y: 0
			}
		};
	}
	function _e(e) {
		let t = hn();
		return {
			fs: 11 / 12 * t,
			gap: 5 / 12 * t,
			ss: t
		};
	}
	function ve(e, t, n, r) {
		let i = ge(t, n);
		if (!i) return;
		let { fs: a, gap: o, ss: s } = _e(r), c = Ov(t.label, a), l = s / 2 + o + c / 2;
		for (let t of e) {
			let e = t.data.end, n = e === "start" ? i.first : i.last, r = e === "start" ? i.dStart : i.dEnd, o = n.x + r.x * l, s = n.y + r.y * l;
			t.width = c, t.height = a, t.fontSize = a, t.x = o - c / 2, t.y = s - a / 2;
		}
	}
	function we(e, t, n) {
		let r = Re(e);
		if (!e.label || r === "none" || !e.seats.length) return [];
		let i = r === "both" ? ["start", "end"] : [r], a = e.seats.length < 2 && i.length > 1 ? ["start"] : i, { fs: o } = _e(n), s = a.map((t) => {
			let n = Z.one({
				text: e.label,
				fontSize: o,
				fill: "rgba(30,41,59,0.5)",
				textAlign: "center",
				verticalAlign: "middle"
			}, 0, 0);
			return n.data = {
				rowLabel: !0,
				rowId: e.id,
				end: t
			}, n;
		});
		return ve(s, e, t, n), s;
	}
	let Te = (e) => ({
		x: e.x,
		y: e.y
	});
	function De(e) {
		let t = s.get(e.id);
		if (t && (t.group.remove(), s.delete(e.id)), !e.visible) return;
		let n = new If({ data: { sectionId: e.id } }), r = /* @__PURE__ */ new Map(), a = null;
		e.path && !e.loose && (a = new Mp({
			path: e.path,
			...ue(e, O.sectionSelection.has(e.id))
		}), n.add(a));
		let o = me(e);
		o && n.add(o);
		let c = hn(), l = Infinity, u = Infinity, f = -Infinity, p = -Infinity;
		for (let t of e.rows) for (let i of t.seats) {
			let t = np.one({
				width: c,
				height: c,
				fill: se(i, e)
			}, i.x - c / 2, i.y - c / 2);
			r.set(i.id, t), n.add(t), i.x < l && (l = i.x), i.x > f && (f = i.x), i.y < u && (u = i.y), i.y > p && (p = i.y);
		}
		let m = null, h = null;
		if (oe(e)) {
			m = new If({ data: { seatNums: !0 } }), h = new If({ data: { seatStatus: !0 } });
			for (let t of e.rows) for (let n of t.seats) {
				if (n.status !== "available") {
					let t = ce(n, e);
					t && (t.data = { seatIcon: n.id }, h.add(t));
					continue;
				}
				n.n === "" || n.n == null || m.add(new Z({
					text: String(n.n),
					x: n.x - c / 2,
					y: n.y - c / 2,
					width: c,
					height: c,
					fontSize: c * .55,
					textAlign: "center",
					verticalAlign: "middle",
					fill: "#ffffff",
					stroke: "rgba(15,23,42,0.45)",
					strokeWidth: Math.max(c * .045, .02),
					data: { seatNum: n.id }
				}));
			}
			n.add(m), n.add(h);
		}
		let g = null;
		!e.loose && fe(e) && (g = Z.one({
			text: "",
			fontSize: 14,
			fontWeight: "bold",
			fill: "rgba(30,41,59,0.4)"
		}, 0, 0), pe(g, e), n.add(g));
		let _ = /* @__PURE__ */ new Map();
		for (let t of e.rows) {
			let r = we(t, Te, e);
			if (r.length) {
				_.set(t.id, r);
				for (let e of r) n.add(e);
			}
		}
		n.opacity = d() && e.id !== O.editingSectionId ? .15 : 1, i.add(n), s.set(e.id, {
			group: n,
			dots: r,
			outline: a,
			label: g,
			rowLabels: _,
			nums: m,
			statusIcons: h
		});
	}
	function Oe() {
		let e = O.venue.stage;
		if (!e) return;
		let t = new If();
		t.add(Bf.one({
			width: e.w,
			height: e.h,
			fill: "#e2e6ec",
			cornerRadius: 12,
			stroke: "#c3c9d3",
			strokeWidth: 2
		}, e.x, e.y));
		let n = Math.min(e.h / 3, 80);
		t.add(Z.one({
			text: e.label,
			fontSize: n,
			fontWeight: "bold",
			fill: "rgba(30,41,59,0.5)"
		}, e.x + e.w / 2 - Ov(e.label, n) / 2, e.y + e.h / 2 - n / 2)), i.add(t);
	}
	function Ae() {
		i.clear(), s.clear(), Oe(), O.venue.sections.forEach(De);
	}
	let je = E(() => O.canvasTick, () => {
		let { full: e, ids: t, viewReset: n } = N.consumeRedraw();
		if (n && Jt(), e) Ae();
		else for (let e of t) {
			let t = O.venue.sections.find((t) => t.id === e);
			if (t) De(t);
			else {
				let t = s.get(e);
				t && (t.group.remove(), s.delete(e));
			}
		}
		Me(), n && j.fit();
	});
	function Me() {
		if (a.clear(), d()) _t.repaint(), Fe();
		else if (ut.dragging() || Ke(), O.tool === "node" ? ut.repaint(null) : ((O.sectionSelection.size || O.tool === "select" || O.tool === "lasso") && ut.repaint(), O.tool === "seat" && Cn() && _t.repaint(), Fe()), O.imageSelected) {
			let e = T();
			if (e) {
				let t = re || e, n = t.rotation || 0;
				eS(a, {
					minX: t.x,
					minY: t.y,
					maxX: t.x + t.w,
					maxY: t.y + t.h
				}, p, {
					pad: 0,
					color: le,
					handle: !0,
					rotation: n ? {
						deg: n,
						center: {
							x: t.x + t.w / 2,
							y: t.y + t.h / 2
						}
					} : null
				});
			}
		}
	}
	function Ne(e, t, n, r) {
		let i = r / 2, a = new If({
			x: e,
			y: t,
			rotation: n
		});
		return a.add(new Bf({
			x: -i,
			y: -i,
			width: r,
			height: r,
			fill: "#fff",
			stroke: le,
			strokeWidth: 1,
			cornerRadius: 1.5,
			cursor: "pointer"
		})), a;
	}
	function Pe(e, t, n) {
		let { anchor: r, hat: i } = zt(e, t);
		return {
			cx: r.x + i.x * b(n),
			cy: r.y + i.y * b(n),
			angle: Math.atan2(t === "end" ? i.y : -i.y, t === "end" ? i.x : -i.x) * 180 / Math.PI
		};
	}
	function Fe() {
		if (!O.selection.size) return;
		let e = d() ? pt() ? Ye(O.editingSectionId) : null : O.tool === "select" && Cn() ? M() : null;
		if (!e) return;
		let t = hn() / 2;
		for (let n of mt([...O.selection])) {
			let r = e.rows.find((e) => e.id === n);
			if (!(!r || r.seats.length < 2)) for (let i of ["start", "end"]) {
				let { cx: o, cy: s, angle: c } = Pe(r, i, e), l = Ne(o, s, c, t);
				l.data = {
					rowHandle: i,
					rowId: n
				}, l.on(Q.BEFORE_DOWN, (e) => e.stop()), l.on(Q.DOWN, (e) => {
					e.stop(), !(e.spaceKey || e.middle) && (wt(), k = {
						type: "row-resize",
						rowId: n,
						end: i,
						start: x(e),
						delta: 0
					});
				}), a.add(l);
			}
		}
	}
	let Ie = E(() => O.selectionTick, () => {
		for (let e of c) O.selection.has(e) || Le(e);
		for (let e of O.selection) c.has(e) || Le(e);
		c = new Set(O.selection);
		let e = M();
		e && !d() && (Cn() && f(e)) !== !!s.get(e.id)?.nums && De(e), Me();
	});
	function Le(e) {
		let t = un(e);
		if (t) for (let { dots: n } of s.values()) {
			let r = n.get(e);
			if (r) {
				r.fill = se(t.seat, t.section);
				return;
			}
		}
	}
	let ze = null, Be = E(() => O.modeTick, () => {
		let e = d() ? O.editingSectionId : null;
		for (let t of new Set([
			ze,
			e,
			M()?.id
		].filter(Boolean))) {
			let e = O.venue.sections.find((e) => e.id === t);
			e && De(e);
		}
		for (let [t, { group: n }] of s) n.opacity = d() && t !== e ? .15 : 1;
		ze = e, o.clear(), Me();
	}), Ue = E(() => O.sectionSelectionTick, () => {
		for (let e of l) O.sectionSelection.has(e) || We(e);
		for (let e of O.sectionSelection) l.has(e) || We(e);
		l = new Set(O.sectionSelection), Me();
	});
	function We(e) {
		let t = s.get(e), n = Ye(e);
		!t?.outline || !n || Object.assign(t.outline, ue(n, O.sectionSelection.has(e)));
	}
	function Ke() {
		if (O.tool !== "node") return;
		let e = [...O.sectionSelection];
		if (e.length !== 1) return;
		let t = O.venue.sections.find((t) => t.id === e[0]);
		if (!t) return;
		if (t.gen) {
			for (let e of dt(t.gen)) {
				let n = np.one({
					width: p(12),
					height: p(12),
					fill: "#fff",
					stroke: le,
					strokeWidth: p(2),
					cursor: "pointer"
				}, e.x - p(6), e.y - p(6));
				n.on(Q.BEFORE_DOWN, (e) => e.stop()), n.on(Q.DOWN, (n) => {
					n.stop(), !(n.spaceKey || n.middle) && (k = {
						type: "handle",
						section: t,
						role: e.role,
						gen: null
					});
				}), a.add(n);
			}
			return;
		}
		if (!t.path) return;
		let n = null;
		try {
			n = Jx(t.path);
		} catch {
			return;
		}
		if (n.anchors.length < 2) return;
		let r = (e, t, n, r, i, o, s) => {
			let c = np.one({
				width: n,
				height: n,
				fill: r,
				stroke: le,
				strokeWidth: p(2),
				cursor: "pointer"
			}, e - n / 2, t - n / 2);
			c.data = {
				nodeHandle: i,
				index: o,
				size: n
			}, c.on(Q.BEFORE_DOWN, (e) => e.stop()), c.on(Q.DOWN, (e) => {
				e.stop(), !(e.spaceKey || e.middle) && s(e);
			}), a.add(c);
		};
		n.anchors.forEach((e, i) => {
			r(e.x, e.y, p(12), "#fff", "vertex", i, (e) => {
				k = {
					type: "node-vertex",
					section: t,
					index: i,
					origPath: t.path,
					model: n,
					start: x(e)
				};
			});
		}), n.segs.forEach((e, i) => {
			let a = Xx(n, i);
			Number.isFinite(a.x + a.y) && r(a.x, a.y, p(8), wv(le, .45), "edge", i, (e) => {
				k = {
					type: "node-edge",
					section: t,
					index: i,
					origPath: t.path,
					model: n,
					start: x(e)
				};
			});
		});
	}
	function Je(e) {
		for (let t of a.children) {
			let n = t.data;
			if (!n?.nodeHandle) continue;
			let r = n.nodeHandle === "vertex" ? e.anchors[n.index] : Xx(e, n.index);
			!r || !Number.isFinite(r.x + r.y) || (t.x = r.x - n.size / 2, t.y = r.y - n.size / 2);
		}
	}
	function Ye(e) {
		return O.venue.sections.find((t) => t.id === e);
	}
	function Xe(e) {
		let t = O.venue.sections.find((t) => t.id === e);
		return t ? ct(t.path) : [];
	}
	function Ze(e) {
		let t = Infinity, n = Infinity, r = -Infinity, i = -Infinity, a = !1;
		for (let o of e) {
			let e = Xe(o);
			if (!e.length) continue;
			a = !0;
			let s = Ce(e);
			s.minX < t && (t = s.minX), s.minY < n && (n = s.minY), s.maxX > r && (r = s.maxX), s.maxY > i && (i = s.maxY);
		}
		return a ? {
			minX: t,
			minY: n,
			maxX: r,
			maxY: i
		} : null;
	}
	function Qe(e) {
		let t = new Set(e), n = [];
		for (let e of O.venue.sections) !e.visible || t.has(e.id) || !e.path || n.push(Ce(ct(e.path)));
		let r = O.venue.stage;
		return r && n.push({
			minX: r.x,
			minY: r.y,
			maxX: r.x + r.w,
			maxY: r.y + r.h
		}), aS(n);
	}
	function $e(e, t) {
		let n = M();
		return n ? En(e, t, void 0, n.id) : null;
	}
	function tt(e) {
		let t = M();
		return !!t && t.rows.some((t) => t.id === e);
	}
	function nt(e) {
		for (let { dots: t } of s.values()) {
			let n = t.get(e);
			if (n) return n;
		}
		return null;
	}
	function rt() {
		let e = Infinity, t = Infinity, n = -Infinity, r = -Infinity, i = !1;
		for (let a of O.selection) {
			let o = un(a);
			if (!o) continue;
			i = !0;
			let { x: s, y: c } = o.seat;
			s < e && (e = s), s > n && (n = s), c < t && (t = c), c > r && (r = c);
		}
		return i ? {
			minX: e,
			minY: t,
			maxX: n,
			maxY: r
		} : null;
	}
	function it() {
		let e = /* @__PURE__ */ new Map();
		for (let t of O.selection) {
			let n = un(t);
			n && e.set(t, {
				x: n.seat.x,
				y: n.seat.y,
				r: n.seat.r || 0
			});
		}
		return e;
	}
	function at(e, t) {
		let n = Infinity, r = Infinity, i = -Infinity, a = -Infinity;
		for (let [, o] of e) {
			let e = t(o);
			e.x < n && (n = e.x), e.x > i && (i = e.x), e.y < r && (r = e.y), e.y > a && (a = e.y);
		}
		return {
			minX: n,
			minY: r,
			maxX: i,
			maxY: a
		};
	}
	let ot = null, st, ut = iS({
		app: t,
		layerSel: a,
		layerTmp: o,
		toWorld: x,
		px: p,
		color: le,
		pad: 0,
		collapseOnClick: !1,
		enabled: () => !d() && (O.tool === "select" || O.tool === "lasso"),
		lassoEnabled: () => O.tool === "lasso",
		collectPoly: (e) => {
			let t = Nn(e);
			if (t.length) return t;
			let n = M();
			return n ? An(e, n.id) : [];
		},
		hitTest: (e) => {
			let t = Pn(e.x, e.y);
			if (t) return t.id;
			let n = $e(e.x, e.y);
			return n ? un(n.id)?.row?.id ?? null : null;
		},
		collect: (e) => {
			ot = e;
			let t = Fn(e.minX, e.minY, e.maxX, e.maxY);
			if (t.length) return t;
			let n = M();
			if (!n) return [];
			let r = gn() / 2, i = Dn(e.minX - r, e.minY - r, e.maxX + r, e.maxY + r, n.id);
			return mt(i);
		},
		boundsOf: (e) => {
			if (!(e.length && tt(e[0]))) return st === void 0 ? Ze(e) : (st ||= Ze(e), st);
			let t = rt(), n = M() ? gn() / 2 : g();
			return t && {
				minX: t.minX - n,
				minY: t.minY - n,
				maxX: t.maxX + n,
				maxY: t.maxY + n
			};
		},
		getSelection: () => (O.tool === "select" || O.tool === "lasso") && Cn() ? mt([...O.selection]) : [...O.sectionSelection],
		setSelection: (e) => {
			let t = e.filter((e) => !tt(e)), n = e.filter(tt);
			if (!e.length || !t.length && !n.length) {
				O.selection.size && N.setSelection(/* @__PURE__ */ new Set()), N.clearSectionSelection();
				return;
			}
			if (!t.length) {
				let e = M(), t = new Set(n);
				N.setSelection(new Set(e.rows.filter((e) => t.has(e.id)).flatMap((e) => e.seats.map((e) => e.id)))), N.clearSectionSelection(), O.imageSelected && N.setImageSelected(!1);
				return;
			}
			O.selection.size && N.setSelection(/* @__PURE__ */ new Set()), N.setSectionSelection(t);
		},
		snapshot: (e) => e.length && tt(e[0]) ? it() : void 0,
		onDragStart: (e, t) => {
			e === "move" && (u = Qe(t), st = null, gt(!1));
		},
		onDragEnd: (e) => {
			if (st = void 0, e === "move" && gt(!0), e === "marquee") {
				let e = ot;
				if (ot = null, e && !O.sectionSelection.size && !O.selection.size) {
					let t = T();
					if (t && !t.locked) {
						let n = ne(t);
						n.minX <= e.maxX && n.maxX >= e.minX && n.minY <= e.maxY && n.maxY >= e.minY && N.setImageSelected(!0);
					}
				}
			}
		},
		onPreviewMove: (e, t, n, r) => {
			if (e) {
				let t = hn() / 2;
				for (let [i, a] of e) {
					let e = nt(i);
					e && (e.x = a.x + n - t, e.y = a.y + r - t);
				}
				Vt({
					dx: n,
					dy: r
				}), Ht(e, M()?.id);
				return;
			}
			for (let e of t) {
				let t = s.get(e)?.group;
				t && (t.x = n, t.y = r);
			}
		},
		onCommitMove: (e, t, n) => {
			if (e.length && tt(e[0])) {
				N.moveSeats([...O.selection], t, n);
				return;
			}
			if (Math.abs(t) < .01 && Math.abs(n) < .01) {
				for (let t of e) {
					let e = s.get(t)?.group;
					e && (e.x = 0, e.y = 0);
				}
				return;
			}
			N.moveSections(e, t, n);
			for (let r of e) {
				let e = s.get(r);
				if (e) {
					for (let r of e.dots.values()) r.x += t, r.y += n;
					e.outline && (e.outline.path = Ye(r)?.path || ""), e.label && (e.label.x += t, e.label.y += n);
					for (let r of e.rowLabels.values()) for (let e of r) e.x += t, e.y += n;
					he(Ye(r)), e.group.x = 0, e.group.y = 0;
				}
			}
			N.consumeRedraw(), Me();
		},
		onPreviewRotate: (e, t, r, i) => {
			if (e) {
				let t = hn() / 2;
				for (let [n, a] of e) {
					let e = nt(n);
					if (!e) continue;
					let o = ye(a.x, a.y, i.x, i.y, r);
					e.x = o.x - t, e.y = o.y - t;
				}
				Vt({
					deg: r,
					center: i
				}), Ht(e, M()?.id);
				return;
			}
			let a = n.getWorldPointByPage(i);
			for (let e of t) {
				let t = s.get(e)?.group;
				t && (t.rotation = 0, t.x = 0, t.y = 0, t.rotateOfWorld(a, r));
			}
		},
		onCommitRotate: (e, t, n) => {
			if (e.length && tt(e[0])) {
				N.rotateSeats([...O.selection], t, n), Me();
				return;
			}
			vt(e, t, n);
		},
		snap: (e, t, n) => u ? oS(e, t, n, u, p(6)) : {
			dx: t,
			dy: n,
			guides: []
		}
	}), ft = !1, pt = () => d() && (O.tool === "select" || O.tool === "lasso" && !ft), mt = (e) => [...new Set(e.map((e) => un(e)?.row?.id).filter(Boolean))], ht = (e) => {
		let t = Ye(O.editingSectionId) || M();
		if (!t) return [];
		let n = new Set(e);
		return t.rows.filter((e) => n.has(e.id)).flatMap((e) => e.seats.map((e) => e.id));
	}, gt = (e) => {
		for (let t of new Set([O.editingSectionId, M()?.id].filter(Boolean))) {
			let n = s.get(t);
			n?.nums && (n.nums.visible = e), n?.statusIcons && (n.statusIcons.visible = e);
		}
	}, _t = iS({
		app: t,
		layerSel: a,
		layerTmp: o,
		toWorld: x,
		px: p,
		color: le,
		pad: () => Ye(O.editingSectionId) || M() ? gn() / 2 : g(),
		enabled: () => d() && (O.tool === "seat" || O.tool === "select" || O.tool === "lasso") || !d() && O.tool === "seat",
		lassoEnabled: () => O.tool === "lasso",
		collectPoly: (e, t, n) => {
			if (ft = t || !1, !d()) return [];
			if (t) {
				let t = jn(e, O.editingSectionId);
				if (n && e.length >= 3) {
					let n = Mn(e, O.editingSectionId);
					return [.../* @__PURE__ */ new Set([...t, ...n])];
				}
				return t;
			}
			return An(e, O.editingSectionId);
		},
		onDragStart: (e) => {
			e !== "marquee" && gt(!1);
		},
		onDragEnd: (e) => {
			e !== "marquee" && gt(!0);
		},
		hitTest: (e) => {
			let t = d() ? En(e.x, e.y, void 0, O.editingSectionId) : $e(e.x, e.y);
			return t ? pt() ? un(t.id)?.row?.id ?? null : t.id : null;
		},
		collect: (e) => {
			let t = d() ? O.editingSectionId : M()?.id;
			if (!t) return [];
			let n = Ye(t) ? gn() / 2 : g(), r = Dn(e.minX - n, e.minY - n, e.maxX + n, e.maxY + n, t);
			return pt() ? mt(r) : r;
		},
		boundsOf: () => rt(),
		getSelection: () => pt() ? mt([...O.selection]) : [...O.selection],
		setSelection: (e) => {
			N.setSelection(new Set(pt() ? ht(e) : e)), !d() && e.length && (N.clearSectionSelection(), O.imageSelected && N.setImageSelected(!1));
		},
		snapshot: () => it(),
		onPreviewMove: (e, t, n, r) => {
			let i = (Ye(O.editingSectionId) || M() ? hn() : seatSize()) / 2;
			for (let [t, a] of e) {
				let e = nt(t);
				e && (e.x = a.x + n - i, e.y = a.y + r - i);
			}
			Vt({
				dx: n,
				dy: r
			}), Ht(e);
		},
		onPreviewRotate: (e, t, n, r) => {
			let i = (Ye(O.editingSectionId) || M() ? hn() : seatSize()) / 2;
			for (let [t, a] of e) {
				let e = nt(t);
				if (!e) continue;
				let o = ye(a.x, a.y, r.x, r.y, n);
				e.x = o.x - i, e.y = o.y - i;
			}
			Vt({
				deg: n,
				center: r
			}), Ht(e);
		},
		onCommitMove: (e, t, n) => N.moveSeats([...O.selection], t, n),
		onCommitRotate: (e, t, n) => {
			N.rotateSeats([...O.selection], t, n), Me();
		},
		previewBounds: (e, t) => at(e, t.type === "move" ? (e) => ({
			x: e.x + t.dx,
			y: e.y + t.dy
		}) : (e) => ye(e.x, e.y, t.center.x, t.center.y, t.deg))
	});
	function vt(e, t, n) {
		N.rotateSections(e, t, n);
		for (let t of e) {
			let e = s.get(t), n = Ye(t);
			if (!(!e || !n)) {
				for (let t of n.rows) for (let n of t.seats) {
					let t = e.dots.get(n.id);
					t && (t.x = n.x - hn() / 2, t.y = n.y - hn() / 2);
				}
				e.outline && (e.outline.path = n.path), e.label && pe(e.label, n);
				for (let t of n.rows) {
					let r = e.rowLabels.get(t.id);
					r && ve(r, t, Te, n);
				}
				he(n), e.group.rotation = 0, e.group.x = 0, e.group.y = 0;
			}
		}
		N.consumeRedraw(), Me();
	}
	function yt(e, t, n) {
		let r = e.seatPitch ?? 16, i = e.rowPitch ?? 24, a = r / 2, o = i / 2;
		if (e.type === "grid") {
			let s = e.x - a, c = e.x + (e.cols - 1) * r + a, l = e.y - o, u = e.y + (e.rows - 1) * i + o;
			if (t.includes("w") && (s = n.x), t.includes("e") && (c = n.x), t.includes("n") && (l = n.y), t.includes("s") && (u = n.y), c - s < r * 2 || u - l < i) return null;
			let d = Math.max(1, Math.round((c - s - r) / r) + 1), f = Math.max(1, Math.round((u - l - i) / i) + 1);
			return {
				...e,
				x: s + a,
				y: l + o,
				rows: f,
				cols: d
			};
		}
		let s = { ...e }, c = xe(e.cx, e.cy, n), l = Math.hypot(n.x - e.cx, n.y - e.cy);
		t.startsWith("outer") ? s.rowCount = Math.min(100, Math.max(1, Math.round((l - o - e.innerR) / i) + 1)) : s.innerR = Math.max(60, l + o), t.endsWith("start") && (s.startDeg = Ee(c, e.startDeg)), t.endsWith("end") && (s.endDeg = Ee(c, e.endDeg));
		let u = s.endDeg - s.startDeg;
		return u < 10 ? t.endsWith("start") ? s.startDeg = s.endDeg - 10 : s.endDeg = s.startDeg + 10 : u > 359 && (t.endsWith("start") ? s.startDeg = s.endDeg - 359 : s.endDeg = s.startDeg + 359), s;
	}
	function bt(e) {
		o.clear(), o.add(new Mp({
			path: lt(e),
			fill: "rgba(56,189,248,0.08)",
			stroke: le,
			strokeWidth: p(2),
			dashPattern: [p(10), p(6)]
		}));
	}
	let xt = [], St = null, Ct = [];
	function wt() {
		o.clear(), xt = [], St = null, Ot = null;
		for (let e of Ct) e.visible = !0;
		Ct = [];
	}
	function Tt(e) {
		for (; xt.length < e.length;) {
			let e = np.one({
				width: v(),
				height: v(),
				fill: "rgba(56,189,248,0.6)"
			}, 0, 0);
			xt.push(e), o.add(e);
		}
		for (; xt.length > e.length;) xt.pop().remove();
		for (let t = 0; t < e.length; t++) {
			let n = xt[t], r = e[t].x - v() / 2, i = e[t].y - v() / 2;
			(n.x !== r || n.y !== i) && (n.x = r, n.y = i);
		}
	}
	function Et(e, t) {
		if (!e) {
			St &&= (St.remove(), null);
			return;
		}
		St || (St = new Z({
			fill: le,
			fontSize: p(13),
			fontWeight: "bold"
		}), o.add(St)), St.text !== e && (St.text = e), St.x = t.x + p(14), St.y = t.y + p(16);
	}
	let Dt = null, Ot = null, kt = {
		x: 0,
		y: 0
	};
	document.addEventListener("mousemove", (t) => {
		let n = e.getBoundingClientRect();
		kt.x = t.clientX - n.left, kt.y = t.clientY - n.top;
	});
	function At() {
		return O.tool === "row" || O.tool === "grid";
	}
	function jt(e) {
		let t = y();
		Ot || (Ot = np.one({
			width: t,
			height: t,
			fill: "rgba(56,189,248,0.35)",
			stroke: le
		}, 0, 0), o.add(Ot)), Ot.width = t, Ot.height = t, Ot.x = e.x - t / 2, Ot.y = e.y - t / 2, Ot.strokeWidth = p(1.5);
	}
	function Mt() {
		Ot &&= (Ot.remove(), null);
	}
	function Nt() {
		return d() ? O.venue.sections.find((e) => e.id === O.editingSectionId) || null : M();
	}
	function Pt(e, t, n, r) {
		let i = et(e, t, n, r, _()), a = Math.min(D.limits.rowSeats, yn(Nt()));
		return {
			seats: i.slice(0, a),
			capped: i.length > a
		};
	}
	function Ft(e, t) {
		let { seats: n, capped: r } = Pt(e.x, e.y, t.x, t.y);
		Tt(n);
		let i = n[n.length - 1] || e;
		Et(`${n.length} 座${r ? " · 已达上限" : ""}`, {
			x: (e.x + i.x) / 2,
			y: (e.y + i.y) / 2
		});
	}
	function It(e, t, n) {
		let r = h(), i = [], a = yn(Nt());
		for (let o = 0; o < t && !(a <= 0); o++) {
			let t = -e.first.dir.y * n * o * r, s = e.first.dir.x * n * o * r, { seats: c } = Pt(e.start.x + t, e.start.y + s, e.start.x + t + e.first.dir.x * e.first.len, e.start.y + s + e.first.dir.y * e.first.len), l = c.slice(0, a);
			if (!l.length) break;
			i.push(l), a -= l.length;
		}
		return i;
	}
	function Lt(e, t) {
		if (!e.first) {
			Ft(e.start, t);
			return;
		}
		let n = t.x - e.start.x, r = t.y - e.start.y, i = n * -e.first.dir.y + r * e.first.dir.x, a = Math.min(200, 1 + Math.floor(Math.abs(i) / h())), o = It(e, a, i < 0 ? -1 : 1), s = [];
		for (let e of o) for (let t of e) s.push(t);
		Tt(s);
		let c = o[0]?.length || 0, l = et(e.start.x, e.start.y, e.start.x + e.first.dir.x * e.first.len, e.start.y + e.first.dir.y * e.first.len, _()).length, u = o.length < a || c < l;
		Et((o.length > 1 ? `${o.length}×${c} = ${s.length}座` : `${c} 座`) + (u ? " · 已达上限" : ""), t);
	}
	function Rt(e) {
		if (!At()) return !1;
		if (_n(), !Dt) return wt(), Dt = {
			type: O.tool === "grid" ? "rows" : "row",
			start: e,
			first: null
		}, jt(e, null), !0;
		if (Dt.type === "row") {
			let t = Dt.start, { seats: n } = Pt(t.x, t.y, e.x, e.y);
			return wt(), Dt = null, Math.hypot(e.x - t.x, e.y - t.y) > 4 && (n.length ? d() ? N.addRowsToSection(O.editingSectionId, [n]) : N.addRowToActive(n) : Sn(`已达数量上限（单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未添加座位`)), !0;
		}
		if (!Dt.first) {
			let t = e.x - Dt.start.x, n = e.y - Dt.start.y, r = Math.hypot(t, n);
			return r <= 4 ? (wt(), Dt = null, !0) : (Dt.first = {
				dir: {
					x: t / r,
					y: n / r
				},
				len: r
			}, jt(e, null), !0);
		}
		let t = e.x - Dt.start.x, n = e.y - Dt.start.y, r = t * -Dt.first.dir.y + n * Dt.first.dir.x, i = Math.min(200, 1 + Math.floor(Math.abs(r) / h())), a = It(Dt, i, r < 0 ? -1 : 1);
		return wt(), Dt = null, a.length ? d() ? N.addRowsToSection(O.editingSectionId, a) : N.addRowsByDrop(a) : Sn(`已达数量上限（单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未添加座位`), !0;
	}
	function zt(e, t) {
		let n = t === "end" ? e.seats[e.seats.length - 1] : e.seats[0], r = ke(e, t), i = Math.hypot(r.x, r.y) || 1;
		return {
			anchor: n,
			step: r,
			hat: {
				x: r.x / i,
				y: r.y / i
			}
		};
	}
	function Bt(e, t, n, r) {
		if (wt(), n > 0) {
			let r = [];
			for (let i of e) {
				let { anchor: e, step: a } = zt(i, t);
				for (let t = 1; t <= n && r.length < 400; t++) r.push({
					x: e.x + a.x * t,
					y: e.y + a.y * t
				});
			}
			Tt(r);
		} else if (n < 0) {
			let r = s.get(O.editingSectionId || M()?.id), i = /* @__PURE__ */ new Set();
			for (let a of e) {
				let e = t === "end" ? a.seats.slice(n) : a.seats.slice(0, -n);
				for (let t of e) {
					i.add(t.id);
					let e = r?.dots.get(t.id);
					e && (e.visible = !1, Ct.push(e));
				}
			}
			for (let e of [r?.nums, r?.statusIcons]) if (e) for (let t of e.children) {
				let e = t.data?.seatNum ?? t.data?.seatIcon;
				e && i.has(e) && (t.visible = !1, Ct.push(t));
			}
		}
		Ut(e, t, n), e.length && Et(`${Math.max(1, e[0].seats.length + n)} 座`, r);
	}
	function Vt(e) {
		let t = Ye(O.editingSectionId) || M();
		if (!t) return;
		let n = new Map(t.rows.map((e) => [e.id, e]));
		for (let r of a.children) {
			let i = r.data?.rowHandle;
			if (!i) continue;
			let a = n.get(r.data.rowId);
			if (!a || a.seats.length < 2) continue;
			let { cx: o, cy: s, angle: c } = Pe(a, i, t);
			e.dx == null ? ({x: o, y: s} = ye(o, s, e.center.x, e.center.y, e.deg), c += e.deg) : (o += e.dx, s += e.dy), r.x = o, r.y = s, r.rotation = c;
		}
	}
	function Ht(e, t = O.editingSectionId) {
		let n = s.get(t), r = Ye(t);
		if (!n || !r || !n.rowLabels.size) return;
		let i = new Map(r.rows.map((e) => [e.id, e])), a = (e) => {
			let t = n.dots.get(e.id);
			return t ? {
				x: t.x + hn() / 2,
				y: t.y + hn() / 2
			} : Te(e);
		};
		for (let t of mt([...e.keys()])) {
			let e = n.rowLabels.get(t), o = i.get(t);
			e && o && ve(e, o, a, r);
		}
	}
	function Ut(e, t, n) {
		if (!e.length) return;
		let r = Ye(O.editingSectionId) || M(), i = new Map(e.map((e) => [e.id, e]));
		for (let e of a.children) {
			let a = e.data?.rowHandle;
			if (!a || a !== t) continue;
			let o = i.get(e.data.rowId);
			if (!o || o.seats.length < 2) continue;
			let { anchor: s, step: c, hat: l } = zt(o, t);
			e.x = s.x + c.x * n + l.x * b(r), e.y = s.y + c.y * n + l.y * b(r);
		}
	}
	function Wt(e, t) {
		o.clear();
		let n = Math.hypot(t.x - e.x, t.y - e.y);
		o.add(np.one({
			width: n * 2,
			height: n * 2,
			stroke: "#3b82f6",
			strokeWidth: p(1.5),
			dashPattern: [p(10), p(8)]
		}, e.x - n, e.y - n)), o.add(np.one({
			width: p(8),
			height: p(8),
			fill: "#3b82f6"
		}, e.x - p(4), e.y - p(4)));
	}
	function Gt(e, t) {
		let n = null, r = t;
		for (let t of O.venue.sections) {
			let i = Jx(t.path);
			for (let t of i.anchors) {
				let i = Math.hypot(e.x - t.x, e.y - t.y);
				i < r && (r = i, n = t);
			}
		}
		return n || e;
	}
	function Kt(e, t, n) {
		if (o.clear(), !e.length) return;
		let r = (e, t) => `${e.x.toFixed(2)} ${e.y.toFixed(2)}L${t.x.toFixed(2)} ${t.y.toFixed(2)}`, i = `M${e.map((e) => `${e.x.toFixed(2)} ${e.y.toFixed(2)}`).join("L")}`;
		if (t && (i += `L${t.x.toFixed(2)} ${t.y.toFixed(2)}`), o.add(new Mp({
			path: i,
			stroke: "#3b82f6",
			strokeWidth: p(2)
		})), e.length >= 3 && t && o.add(new Mp({
			path: `M${r(t, e[0])}`,
			stroke: "#3b82f6",
			strokeWidth: p(1),
			dashPattern: [p(6), p(4)]
		})), e.forEach((t, n) => {
			let r = n === 0 && e.length >= 3 ? p(6) : p(4);
			o.add(np.one({
				width: r * 2,
				height: r * 2,
				fill: "#3b82f6"
			}, t.x - r, t.y - r));
		}), n && t) {
			let e = p(8);
			o.add(np.one({
				width: e * 2,
				height: e * 2,
				fill: "rgba(251,146,60,0.2)",
				stroke: "#f97316",
				strokeWidth: p(2)
			}, n.x - e, n.y - e));
		}
	}
	function qt() {
		let e = k.pts;
		o.clear(), k = null, e.length >= 3 && N.addPolySection(e);
	}
	let k = null;
	function Jt() {
		if (Dt = null, k && (k.type === "node-vertex" || k.type === "node-edge")) {
			let e = s.get(k.section.id);
			e?.outline && (e.outline.path = k.origPath);
		}
		k && (k.type === "image-move" || k.type === "image-rotate") && (re = null, C()), k = null;
	}
	t.on(Q.DOWN, (e) => {
		if (e.spaceKey || e.middle) return;
		let t = x(e), n = O.tool;
		if (n === "pan") {
			k = {
				type: "pan",
				lx: e.x,
				ly: e.y
			};
			return;
		}
		if (n !== "image" && !Rt(t) && !d()) {
			if (n === "select" && O.imageSelected) {
				let e = T();
				if (e && !e.locked) {
					let n = ee(e), r = e.rotation || 0, i = {
						x: n.x,
						y: e.y - p(36)
					};
					if (r && (i = ye(i.x, i.y, n.x, n.y, r)), Math.hypot(t.x - i.x, t.y - i.y) <= p(12)) {
						ut.cancel(), k = {
							type: "image-rotate",
							id: e.id,
							center: n,
							startAngle: xe(n.x, n.y, t),
							orig: r,
							delta: 0
						};
						return;
					}
					if (!Pn(t.x, t.y) && te(e, t)) {
						ut.cancel(), k = {
							type: "image-move",
							id: e.id,
							start: t,
							orig: {
								x: e.x,
								y: e.y
							}
						};
						return;
					}
				}
			}
			if (n === "node") {
				let e = Pn(t.x, t.y);
				e && O.selection.size && N.clearSelection(), N.setSectionSelection(e ? [e.id] : []);
				return;
			}
			if (n === "rect") {
				k = {
					type: "rect",
					start: t
				}, o.clear();
				return;
			}
			if (n === "arc") {
				k = {
					type: "arc",
					start: t
				}, o.clear();
				return;
			}
			if (n === "poly") {
				(!k || k.type !== "poly") && (k = {
					type: "poly",
					pts: []
				});
				let e = k.pts[0];
				if (k.pts.length >= 3 && Math.hypot(t.x - e.x, t.y - e.y) <= p(10)) {
					qt();
					return;
				}
				let n = k.pts[k.pts.length - 1];
				(!n || Math.hypot(t.x - n.x, t.y - n.y) > p(4)) && k.pts.push(Gt(t, p(6)));
				let r = Gt(t, p(6));
				Kt(k.pts, r, r !== t && r);
				return;
			}
		}
	}), t.on(Q.MOVE, (e) => {
		let t = x(e);
		if (At() && !k ? (jt(t), Dt && (Dt.type === "row" ? Ft(Dt.start, t) : Lt(Dt, t))) : Mt(), k) {
			if (k.type === "pan") {
				(n.zoomLayer || n).move(e.x - k.lx, e.y - k.ly), k.lx = e.x, k.ly = e.y;
				return;
			}
			if (k.type === "image-move") {
				let e = N.imageById(k.id), n = S.get(k.id);
				e && n && (n.x = k.orig.x + (t.x - k.start.x), n.y = k.orig.y + (t.y - k.start.y), re = {
					x: n.x,
					y: n.y,
					w: e.w,
					h: e.h,
					rotation: e.rotation || 0
				}, Me());
				return;
			}
			if (k.type === "image-rotate") {
				let n = N.imageById(k.id), r = S.get(k.id);
				if (n && r) {
					let i = xe(k.center.x, k.center.y, t) - k.startAngle;
					e.shiftKey && (i = Math.round(i / 15) * 15), k.delta = i, r.rotation = k.orig + i, re = {
						x: n.x,
						y: n.y,
						w: n.w,
						h: n.h,
						rotation: r.rotation
					}, Me();
				}
				return;
			}
			if (k.type === "handle") {
				let e = yt(k.section.gen, k.role, t);
				e && (k.gen = e, bt(e));
				return;
			}
			if (k.type === "node-vertex" || k.type === "node-edge") {
				let e = k.type === "node-vertex" ? Zx(k.model, k.index, t) : Qx(k.model, k.index, t, p(3)), n = Yx(e);
				if (n !== k.previewPath) {
					k.previewPath = n;
					let e = s.get(k.section.id);
					e?.outline && (e.outline.path = n);
				}
				Je(e);
				return;
			}
			if (k.type === "row-resize") {
				let e = Ye(O.editingSectionId) || M(), n = e?.rows.find((e) => e.id === k.rowId);
				if (!n || n.seats.length < 2) return;
				let r = mt([...O.selection]).map((t) => e.rows.find((e) => e.id === t)).filter((e) => e && e.seats.length >= 2), { step: i, hat: a } = zt(n, k.end), o = Math.hypot(i.x, i.y), s = (t.x - k.start.x) * a.x + (t.y - k.start.y) * a.y, c = Math.round(s / o), l = Math.min(...r.map((e) => e.seats.length));
				c = Math.max(1 - l, c), c !== k.delta && (k.delta = c, Bt(r, k.end, c, t));
				return;
			}
			if (k.type === "poly") {
				let e = Gt(t, p(6));
				Kt(k.pts, e, e !== t && e);
				return;
			}
			if (k.type === "rect") {
				o.clear();
				let e = be(k.start, t);
				o.add(Bf.one({
					fill: "rgba(59,130,246,0.12)",
					stroke: "#3b82f6",
					strokeWidth: p(1.5),
					dashPattern: [p(8), p(6)]
				}, e.minX, e.minY, e.maxX - e.minX, e.maxY - e.minY));
			} else k.type === "arc" && Wt(k.start, t);
		}
	}), t.on(Q.UP, (e) => {
		if (!k || k.type === "poly") return;
		let t = x(e);
		if (k.type === "image-move") {
			let e = t.x - k.start.x, n = t.y - k.start.y;
			re = null, Math.hypot(e, n) > .5 ? N.moveVenueImage(k.id, e, n) : (C(), Me()), k = null;
			return;
		}
		if (k.type === "image-rotate") {
			re = null, Math.abs(k.delta || 0) > .5 ? N.rotateVenueImage(k.id, k.delta) : (C(), Me()), k = null;
			return;
		}
		if (k.type === "handle") o.clear(), k.gen && N.reshapeSection(k.section.id, k.gen), Me();
		else if (k.type === "node-vertex" || k.type === "node-edge") {
			let e = Math.hypot(t.x - k.start.x, t.y - k.start.y);
			if (k.previewPath && k.previewPath !== k.origPath && e > .5) N.updateSectionPath(k.section.id, k.previewPath);
			else {
				let e = s.get(k.section.id);
				e?.outline && (e.outline.path = k.origPath), Me();
			}
		} else if (k.type === "row-resize") wt(), k.delta && N.resizeRows(mt([...O.selection]), k.end, k.delta), Me();
		else if (k.type === "rect") {
			o.clear();
			let e = be(k.start, t);
			e.maxX - e.minX >= 20 && e.maxY - e.minY >= 20 && N.addRectSection(e.minX, e.minY, e.maxX - e.minX, e.maxY - e.minY);
		} else if (k.type === "arc") {
			o.clear();
			let e = Math.hypot(t.x - k.start.x, t.y - k.start.y);
			e >= 80 && N.addArcSection(k.start, e, t);
		}
		k = null;
	}), t.on(Q.DOUBLE_TAP, (e) => {
		if (e.spaceKey) return;
		if (k?.type === "poly") {
			qt();
			return;
		}
		let t = x(e);
		if (d()) {
			if (At()) return;
			En(t.x, t.y, void 0, O.editingSectionId) || (N.exitSection(), j.fit());
		} else {
			if (At()) return;
			let e = Pn(t.x, t.y);
			if (e && O.sectionSelection.size <= 1) {
				N.enterSection(e.id), j.fitSection(e.id);
				return;
			}
			let n = M();
			n && $e(t.x, t.y) && (N.enterSection(n.id), j.fitSection(n.id));
		}
	}), t.on(Q.TAP, (e) => {
		if (d() || O.tool !== "select" || e.spaceKey || e.middle) return;
		let t = x(e);
		if (Pn(t.x, t.y) || $e(t.x, t.y)) {
			O.imageSelected && N.setImageSelected(!1);
			return;
		}
		let n = T();
		n && !n.locked && te(n, t) ? N.setImageSelected(!0) : O.imageSelected && N.setImageSelected(!1);
	});
	let A = () => {
		if (O.zoom = Math.round(n.scaleX * 100) / 100, Ot) {
			let e = y();
			Ot.width = e, Ot.height = e, Ot.strokeWidth = p(1.5);
			let t = n.getPagePoint({
				x: kt.x,
				y: kt.y
			});
			Ot.x = t.x - e / 2, Ot.y = t.y - e / 2;
		}
		for (let e of l) We(e);
		for (let e of new Set([O.editingSectionId, M()?.id].filter(Boolean))) {
			let t = Ye(e);
			t && !!s.get(e)?.nums !== oe(t) && De(t);
		}
		Me();
	};
	n.on(am.ZOOM, A), n.on(tm.MOVE, A);
	let Yt = E(() => [O.tool, O.mode], () => {
		e.style.cursor = O.tool === "pan" ? "grab" : [
			"select",
			"seat",
			"node",
			"image"
		].includes(O.tool) ? "default" : "crosshair", pt() && O.selection.size && N.setSelection(new Set(ht(mt([...O.selection])))), Jt(), Me();
	}, { immediate: !0 }), j = {
		center() {
			let t = n.zoomLayer.boxBounds;
			if (!t.width || !t.height) return;
			let r = n.scaleX;
			n.x = e.clientWidth / 2 - (t.x + t.width / 2) * r, n.y = e.clientHeight / 2 - (t.y + t.height / 2) * r, A();
		},
		fit() {
			let e = n.zoomLayer.boxBounds;
			!e.width && !e.height ? n.zoom(1) : n.zoom("fit", 80), A();
		},
		fitSection(e) {
			let t = s.get(e);
			t && n.zoom(t.group, 80), A();
		},
		zoomIn() {
			n.zoom(n.scaleX * (1 + D.zoom.step)), A();
		},
		zoomOut() {
			n.zoom(n.scaleX / (1 + D.zoom.step)), A();
		},
		zoom100() {
			n.zoom(1), A();
		},
		panBy(e, t) {
			n.x += e, n.y += t, A();
		},
		syncZoomConfig() {
			t.config.zoom && (t.config.zoom.min = D.zoom.min, t.config.zoom.max = D.zoom.max);
		},
		viewCenter: () => n.getPagePoint({
			x: e.clientWidth / 2,
			y: e.clientHeight / 2
		}),
		viewSize: () => ({
			w: e.clientWidth / n.scaleX,
			h: e.clientHeight / n.scaleX
		}),
		venueBounds: ie,
		toClient: (e) => n.getWorldPointByPage(e),
		cancelDrag() {
			let e = !!Dt;
			return Jt(), ut.cancel(), _t.cancel(), wt(), Me(), e;
		},
		undoPolyPoint() {
			return k?.type !== "poly" || !k.pts.length ? !1 : (k.pts.pop(), k.pts.length ? Kt(k.pts, null) : (k = null, o.clear()), !0);
		},
		controllers: {
			sectionsCtl: ut,
			seatsCtl: _t
		},
		labelTextOf: (e) => s.get(e)?.label?.text ?? null,
		watermarkOf: (e) => {
			let t = s.get(e)?.group.children.find((e) => e.data?.watermark);
			if (!t) return null;
			let n = t.children[0]?.children ?? [];
			return {
				tiles: n.length,
				logoTiles: n.filter((e) => e.tag === "Image").length,
				opacity: t.data.opacity,
				fill: n.find((e) => e.tag === "Text")?.fill ?? null,
				x: t.children[0]?.x ?? null,
				y: t.children[0]?.y ?? null
			};
		},
		labelPropsOf: (e) => {
			let t = s.get(e)?.label;
			return t ? {
				text: t.text,
				fontSize: t.fontSize,
				rotation: t.rotation,
				x: t.x,
				y: t.y
			} : null;
		},
		rowLabelsOf: (e) => {
			let t = s.get(e);
			return t ? [...t.rowLabels.entries()].map(([e, t]) => ({
				rowId: e,
				texts: t.map((e) => ({
					text: e.text,
					end: e.data.end,
					x: e.x,
					y: e.y
				}))
			})) : [];
		},
		app: t,
		destroy() {
			je(), Ie(), Be(), Ue(), Yt(), w(), ut.destroy(), _t.destroy(), t.destroy();
		}
	};
	return N.registerEditor(j), Ae(), A(), j;
}
//#endregion
//#region src/designer/SeatMapDesigner.vue
var lS = { class: "seatmap-designer" }, uS = {
	key: 0,
	class: "saving-mask",
	"data-key": "saving-mask"
}, dS = {
	key: 1,
	class: "saving-mask",
	"data-key": "loading-mask"
}, fS = {
	key: 2,
	class: "seats-loading-badge",
	"data-key": "seats-loading"
}, pS = {
	key: 3,
	class: "init-error",
	"data-key": "init-error"
}, mS = {
	key: 4,
	class: "breadcrumb"
}, hS = {
	__name: "SeatMapDesigner",
	props: {
		saveHandler: {
			type: Function,
			default: null
		},
		uploadHandler: {
			type: Function,
			default: null
		},
		options: {
			type: Object,
			default: null
		}
	},
	emits: [
		"ready",
		"change",
		"save",
		"error",
		"venue",
		"dirty"
	],
	setup(e, { expose: t, emit: r }) {
		let c = e, d = r;
		c.saveHandler && N.setSaveHandler(c.saveHandler), c.uploadHandler && N.setImageUploader(c.uploadHandler), c.options && pt(c.options);
		function f() {
			mt(O.tool) || N.setTool(mt("select") ? "select" : D.tools?.[0] ?? "select");
		}
		f();
		let p = x(null), m = x(null), v = null, b = null, S = null, T = n(() => {
			O.sectionsTick;
			let e = O.venue.sections.find((e) => e.id === O.editingSectionId);
			return e ? Ue(e) : "";
		}), ee = n(() => ({
			gridTemplateRows: `${D.ui.topBar ? "46px" : "0"} 1fr ${D.ui.statusBar ? "28px" : "0"}`,
			gridTemplateColumns: `${D.ui.toolBar ? "52px" : "0"} 1fr ${D.ui.sidePanel ? "300px" : "0"}`
		}));
		E(() => O.imagePickTick, () => m.value?.click());
		function te(e) {
			let t = e.target.files?.[0];
			e.target.value = "", t && Nt(t).then((e) => N.replaceVenueImage(e)).catch((e) => alert(e.message));
		}
		E(() => O.canvasTick + O.sectionsTick + O.imageTick, () => d("change")), E(() => O.dirty, (e) => d("dirty", e));
		let ne = x("");
		_(async () => {
			try {
				v = cS(p.value);
			} catch (e) {
				console.error("[seatmap] 画布初始化失败", e), ne.value = String(e?.message || e), d("error", e);
			}
			b = N.on("save", (e) => d("save", e)), S = N.on("venue", (e) => d("venue", e)), setTimeout(() => {
				v?.fit(), d("ready");
			}, 100), window.addEventListener("keydown", re), window.__seatmap = {
				store: O,
				actions: N,
				editor: v,
				pointsFromPath: ct,
				findSectionAt: Pn,
				config: D,
				applyOptions: pt
			};
		}), g(() => {
			window.removeEventListener("keydown", re), b?.(), S?.(), v?.destroy();
		});
		function re(e) {
			if (e.target.matches("input, textarea, select")) return;
			let t = e.key.toLowerCase(), n = e.ctrlKey || e.metaKey;
			if (n && t === "s") {
				e.preventDefault(), N.uiSave();
				return;
			}
			if (!(O.saving || O.loadPhase)) {
				if (n && t === "z" && !e.shiftKey) e.preventDefault(), v?.undoPolyPoint() || N.undo();
				else if (n && (t === "y" || t === "z" && e.shiftKey)) e.preventDefault(), N.redo();
				else if (n && t === "a") e.preventDefault(), N.selectAll();
				else if (n && t === "c") e.preventDefault(), N.copySelection();
				else if (n && t === "v") e.preventDefault(), N.pasteClipboard();
				else if (n && t === "d") e.preventDefault(), N.duplicateSelection();
				else if (t === "delete" || t === "backspace") {
					if (e.preventDefault(), v?.undoPolyPoint()) return;
					if (O.mode === "seats") N.removeSelectedSeats();
					else if (O.selection.size && Cn()) N.removeSelectedSeats();
					else if (O.sectionSelection.size && confirm(`删除选中的 ${O.sectionSelection.size} 个分区？（可撤销）`)) N.removeSections([...O.sectionSelection]);
					else if (O.imageSelected && !O.sectionSelection.size) {
						let e = O.venue.images?.[0];
						e && confirm("删除选中的底图？（可撤销）") && N.removeVenueImage(e.id);
					}
				} else if (t === "escape") {
					if (O.catModalOpen) {
						N.closeCategoryModal();
						return;
					}
					if (O.labelModalOpen) {
						N.closeLabelModal();
						return;
					}
					if (v?.cancelDrag()) return;
					O.mode === "seats" ? (N.exitSection(), v?.fit()) : (N.clearSelection(), N.clearSectionSelection(), N.setImageSelected(!1), N.setTool("select"));
				} else if (!n && !e.altKey) {
					let e = zv.find((e) => e.kbd && !e.hidden && mt(e.key) && e.kbd.toLowerCase() === t);
					if (!e || O.mode === "seats" && ![
						"select",
						"seat",
						"lasso",
						"row",
						"grid",
						"pan"
					].includes(e.key)) return;
					N.setTool(e.key);
				}
			}
		}
		return t({
			setData: (e, t = []) => N.setData(e, t),
			mergeSeats: (e = []) => N.mergeBackendSeats(e),
			save: () => N.saveToBackend(),
			setImageUploader: (e) => N.setImageUploader(e),
			setSaveHandler: (e) => N.setSaveHandler(e),
			setOptions: (e) => {
				pt(e), f(), v?.syncZoomConfig?.();
			},
			getSavePayload: () => N.getSavePayload(),
			exportJSON: () => N.exportVenue(),
			importJSON: (e) => N.importVenue(typeof e == "string" ? JSON.parse(e) : e),
			fit: () => N.fit(),
			newVenue: (e) => N.newVenue(e),
			setLoadPhase: (e) => N.setLoadPhase(e),
			getState: () => ({
				venueId: O.venue.backendId,
				name: O.venue.name,
				sections: O.venue.sections.length,
				seats: O.venue.sections.reduce((e, t) => e + N.seatCountOf(t), 0),
				saving: O.saving,
				dirty: O.dirty
			})
		}), (e, t) => (y(), o("div", lS, [s("div", {
			class: "app-shell",
			style: h(ee.value)
		}, [
			w(D).ui.topBar ? (y(), i(Rv, { key: 0 })) : a("", !0),
			w(D).ui.toolBar ? (y(), i(Wv, { key: 1 })) : a("", !0),
			s("main", {
				ref_key: "canvasEl",
				ref: p,
				class: "canvas-host"
			}, [
				s("input", {
					ref_key: "imageInput",
					ref: m,
					type: "file",
					accept: "image/*,.svg",
					style: { display: "none" },
					onChange: te
				}, null, 544),
				w(O).saving ? (y(), o("div", uS, [...t[1] ||= [s("span", { class: "saving-spinner" }, null, -1), l("保存中…", -1)]])) : w(O).loadPhase === "venue" ? (y(), o("div", dS, [...t[2] ||= [s("span", { class: "saving-spinner" }, null, -1), l("场馆加载中…", -1)]])) : a("", !0),
				w(O).loadPhase === "seats" ? (y(), o("div", fS, [...t[3] ||= [s("span", { class: "saving-spinner" }, null, -1), l("座位加载中…", -1)]])) : a("", !0),
				ne.value ? (y(), o("div", pS, [
					l(" 画布初始化失败：" + C(ne.value), 1),
					t[4] ||= s("br", null, null, -1),
					t[5] ||= l("请刷新页面（Ctrl+F5）；反复出现请把本提示截图反馈 ", -1)
				])) : a("", !0),
				w(O).mode === "seats" ? (y(), o("div", mS, [
					t[6] ||= l(" ✏ 正在编辑分区：", -1),
					s("b", null, C(T.value), 1),
					t[7] ||= s("span", { class: "muted" }, "框选座位可移动/旋转，双击空白退出", -1),
					s("button", {
						class: "btn",
						onClick: t[0] ||= (e) => {
							w(N).exitSection(), w(v)?.fit();
						}
					}, "退出分区")
				])) : a("", !0),
				w(D).ui.zoomPad ? (y(), i(Vx, { key: 5 })) : a("", !0)
			], 512),
			w(D).ui.sidePanel ? (y(), i(ex, { key: 2 })) : a("", !0),
			w(D).ui.statusBar ? (y(), i(ix, { key: 3 })) : a("", !0),
			u(bx),
			u(Lx)
		], 4)]));
	}
}, gS = [
	"defaultCategories",
	"seatDefaults",
	"limits",
	"zoom",
	"ui",
	"tools"
], _S = class {
	constructor(e, t = {}) {
		if (!e) throw Error("SeatMapDesigner: 缺少挂载容器 el");
		this._handlers = /* @__PURE__ */ new Map();
		let n = (e) => (...t) => this._emit(e, ...t), i = {};
		for (let e of gS) e in t && (i[e] = t[e]);
		this._app = r(hS, {
			saveHandler: t.saveHandler || null,
			uploadHandler: t.uploadHandler || null,
			options: Object.keys(i).length ? i : null,
			onReady: n("ready"),
			onChange: n("change"),
			onSave: n("save"),
			onError: n("error"),
			onVenue: n("venue"),
			onDirty: n("dirty")
		}), this._vm = this._app.mount(e);
	}
	on(e, t) {
		return this._handlers.has(e) || this._handlers.set(e, /* @__PURE__ */ new Set()), this._handlers.get(e).add(t), () => this.off(e, t);
	}
	off(e, t) {
		this._handlers.get(e)?.delete(t);
	}
	_emit(e, ...t) {
		for (let n of this._handlers.get(e) || []) try {
			n(...t);
		} catch (t) {
			console.error(`[seatmap] ${e} 事件回调异常`, t);
		}
	}
	setData(e, t = []) {
		return this._vm.setData(e, t);
	}
	mergeSeats(e = []) {
		return this._vm.mergeSeats(e);
	}
	save() {
		return this._vm.save();
	}
	setSaveHandler(e) {
		return this._vm.setSaveHandler(e);
	}
	setOptions(e) {
		return this._vm.setOptions(e);
	}
	setImageUploader(e) {
		return this._vm.setImageUploader(e);
	}
	getSavePayload() {
		return this._vm.getSavePayload();
	}
	exportJSON() {
		return this._vm.exportJSON();
	}
	importJSON(e) {
		return this._vm.importJSON(e);
	}
	fit() {
		return this._vm.fit();
	}
	newVenue(e) {
		return this._vm.newVenue(e);
	}
	setLoadPhase(e) {
		return this._vm.setLoadPhase(e);
	}
	getState() {
		return this._vm.getState();
	}
	destroy() {
		this._app.unmount(), this._handlers.clear();
	}
};
//#endregion
export { hS as SeatMapDesignerVue, _S as default };
