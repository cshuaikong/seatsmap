import { Fragment as e, Teleport as t, computed as n, createApp as r, createBlock as i, createCommentVNode as a, createElementBlock as o, createElementVNode as s, createStaticVNode as c, createTextVNode as l, createVNode as u, markRaw as d, mergeProps as f, nextTick as p, normalizeClass as m, normalizeStyle as h, onBeforeUnmount as g, onMounted as _, onUnmounted as v, openBlock as y, reactive as b, ref as x, renderList as S, toDisplayString as C, unref as w, vModelSelect as ee, vModelText as T, watch as E, withDirectives as te, withKeys as ne, withModifiers as re } from "vue";
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
	let x = b * n * m / r, S = -b * r * p / n, C = l * x - u * S + (e + s) / 2, w = u * x + l * S + (t + c) / 2, ee = (e, t, n, r) => {
		let i = Math.hypot(e, t) * Math.hypot(n, r), a = Math.min(1, Math.max(-1, (e * n + t * r) / i)), o = Math.acos(a);
		return e * r - t * n < 0 ? -o : o;
	}, T = ee(1, 0, (p - x) / n, (m - S) / r), E = ee((p - x) / n, (m - S) / r, (-p - x) / n, (-m - S) / r);
	return !o && E > 0 && (E -= 2 * Math.PI), o && E < 0 && (E += 2 * Math.PI), {
		cx: C,
		cy: w,
		rx: n,
		ry: r,
		phi: i,
		th1: T,
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
	return ye(e, t, n, 1);
}
function _e(e, t) {
	return ye(e, 0, 0, t);
}
function ve(e, t, n) {
	if (!e) return "";
	let r = fe(e), i = [], a = 0, o = 0, s = 0, c = 0, l = 0, u = (e) => +e.toFixed(2), d = (e) => 2 * n - e, f = (e) => 2 * n - e;
	for (; a < r.length;) {
		let e = r[a++], n = e === e.toLowerCase(), p = e.toUpperCase();
		if (p === "M" || p === "L") {
			let e = r[a++] + (n ? o : 0), m = r[a++] + (n ? s : 0);
			t === "h" ? e = d(e) : m = f(m), o = n ? o : 0, s = n ? s : 0, i.push(`${p}${u(e)} ${u(m)}`), p === "M" && (c = e, l = m);
		} else if (p === "H") o = r[a++] + (n ? o : 0), t === "h" && (o = d(o)), i.push(`L${u(o)} ${u(s)}`);
		else if (p === "V") s = r[a++] + (n ? s : 0), t === "v" && (s = f(s)), i.push(`L${u(o)} ${u(s)}`);
		else if (p === "A") {
			let e = r[a++], c = r[a++], l = r[a++], p = r[a++], m = r[a++], h = r[a++] + (n ? o : 0), g = r[a++] + (n ? s : 0);
			t === "h" ? (h = d(h), m = 1 - m) : (g = f(g), m = 1 - m), i.push(`A${u(e)} ${u(c)} ${u(l)} ${p} ${m} ${u(h)} ${u(g)}`), o = h, s = g;
		} else p === "Z" && (i.push("Z"), o = c, s = l);
	}
	return i.join("");
}
function ye(e, t, n, r = 1) {
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
function be(e, t, n, r, i) {
	let a = i * Math.PI / 180, o = Math.cos(a), s = Math.sin(a), c = e - n, l = t - r;
	return {
		x: n + c * o - l * s,
		y: r + c * s + l * o
	};
}
function xe(e, t) {
	return {
		minX: Math.min(e.x, t.x),
		minY: Math.min(e.y, t.y),
		maxX: Math.max(e.x, t.x),
		maxY: Math.max(e.y, t.y)
	};
}
function Se(e, t, n) {
	return Math.atan2(n.y - t, n.x - e) * 180 / Math.PI;
}
//#endregion
//#region ../packages/core/geometry.js
function Ce(e, t, n) {
	let r = !1;
	for (let i = 0, a = n.length - 1; i < n.length; a = i++) {
		let o = n[i], s = n[a];
		o.y > t != s.y > t && e < (s.x - o.x) * (t - o.y) / (s.y - o.y) + o.x && (r = !r);
	}
	return r;
}
function we(e) {
	let t = Infinity, n = Infinity, r = -Infinity, i = -Infinity;
	for (let a of e) a.x < t && (t = a.x), a.y < n && (n = a.y), a.x > r && (r = a.x), a.y > i && (i = a.y);
	return {
		minX: t,
		minY: n,
		maxX: r,
		maxY: i
	};
}
function Te(e, t, n, r, i, a) {
	let o = i - n, s = a - r, c = o * o + s * s, l = c ? ((e - n) * o + (t - r) * s) / c : 0;
	return l = Math.max(0, Math.min(1, l)), Math.hypot(e - (n + l * o), t - (r + l * s));
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
		let e = we(t);
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
		fontSize: 10,
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
		baseScale: 1,
		theme: "light",
		showSeatBars: !0
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
	n.backendId = e.id ?? null, n._raw = e, n.baseScale = parseFloat(e.baseScale) || 1, n.theme = e.theme === "dark" || e.theme === "light" ? e.theme : "light", n.readonly = +e.readonly == 1, n.showSeatBars = e.showSeatBars !== !1, n.categories = (e.categories || []).map((e) => ({
		key: e.key,
		color: e.color || "#94a3b8",
		label: String(e.label || `类别 ${e.key}`),
		accessible: !!e.accessible,
		price: e.price == null ? null : +e.price
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
		}), t.path = e.path ? ye(e.path, +e.x || 0, +e.y || 0, 1) : "", t.rows = (e.rows || []).map((e) => {
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
			theme: e.theme || "light",
			showSeatBars: e.showSeatBars !== !1,
			categories: e.categories.map((e) => ({
				key: e.key,
				color: e.color,
				label: e.label,
				accessible: !!e.accessible,
				price: e.price == null ? null : +e.price
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
	if (e.size > 10485760) throw Error("图片超过 10MB，请压缩后再上传");
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
async function O(e, { maxEdge: t = Tt } = {}) {
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
var k = b({
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
	pastePending: !1,
	snapEnabled: !0,
	showSeatBars: !0,
	readonly: !1,
	theme: "light"
});
E(() => k.canvasTick + k.sectionsTick + k.imageTick, () => {
	k.dirty = !0;
}, { flush: "sync" });
var Nt = /* @__PURE__ */ new Set(), Pt = !1, Ft = !1, It = /* @__PURE__ */ new Map(), Lt = /* @__PURE__ */ new Map(), Rt = null, zt = null, Bt = null, Vt = null, Ht = null, Ut = 0, Wt = null, Gt = /* @__PURE__ */ new Map();
function Kt(e, ...t) {
	for (let n of Gt.get(e) || []) try {
		n(...t);
	} catch (t) {
		console.error(`[seatmap] ${e} 事件回调异常`, t);
	}
}
var qt = [], Jt = [], Yt = 30;
function A(e) {
	let t = k.venue.baseScale;
	e.redo();
	let n = k.venue.baseScale;
	qt.push({
		...e,
		redo() {
			e.redo(), k.venue.baseScale = n;
		},
		undo() {
			e.undo(), k.venue.baseScale = t;
		}
	}), qt.length > Yt && qt.shift(), Jt.length = 0, Xt();
}
function Xt() {
	k.canUndo = qt.length > 0, k.canRedo = Jt.length > 0;
}
function j(e) {
	e.forEach((e) => Nt.add(e)), k.canvasTick++;
}
var Zt = 0;
function Qt() {
	It = /* @__PURE__ */ new Map(), Lt = /* @__PURE__ */ new Map();
	let e = 0;
	for (let t of k.venue.sections) for (let n of t.rows) {
		Lt.set(n.id, {
			row: n,
			section: t
		});
		for (let e of n.seats) It.set(e.id, {
			seat: e,
			row: n,
			section: t
		});
		e += n.seats.length;
	}
	Zt = e;
}
function $t() {
	k.sectionsTick++, Pt = !0, k.canvasTick++;
}
function en(e) {
	return k.venue.categories.find((t) => t.key === e) || null;
}
function tn(e) {
	k.selection = d(e), k.selectionTick++;
}
function nn(e) {
	Qt(), yn();
	let t = [...k.selection].filter((e) => It.has(e));
	t.length !== k.selection.size && tn(new Set(t)), k.sectionsTick++, j(e);
}
function rn(e) {
	let t = e.seats.length;
	if (t < 2) return;
	let n = Ne(e.seats[0], e.seats[t - 1], t, e.curve || 0);
	e.seats.forEach((e, t) => {
		e.x = Math.round(n[t].x * 100) / 100, e.y = Math.round(n[t].y * 100) / 100, e.r = Math.round(n[t].r * 100) / 100;
	});
}
function an(e) {
	return k.venue.sections.find((t) => t.id === e);
}
function on() {
	return oe;
}
function sn(e, t) {
	if (e = String(e || "A").trim() || "A", /^\d+$/.test(e)) return Array.from({ length: t }, (t, n) => String(+e + n));
	if (/^[A-Za-z]$/.test(e)) {
		let n = e === e.toLowerCase(), r = e.toUpperCase().charCodeAt(0) - 65;
		return Array.from({ length: t }, (e, t) => {
			let i = Ze(r + t);
			return n ? i.toLowerCase() : i;
		});
	}
	let n = /^(.*)(\d+|[A-Za-z])([^\dA-Za-z]*)$/.exec(e);
	if (n) {
		let e = n[1], r = n[2], i = n[3];
		if (/^\d+$/.test(r)) return Array.from({ length: t }, (t, n) => `${e}${+r + n}${i}`);
		let a = r === r.toLowerCase(), o = r.toUpperCase().charCodeAt(0) - 65;
		return Array.from({ length: t }, (t, n) => {
			let r = Ze(o + n);
			return `${e}${a ? r.toLowerCase() : r}${i}`;
		});
	}
	return Array.from({ length: t }, (t, n) => `${e}${n + 1}`);
}
function cn(e) {
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
function M(e) {
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
		let e = M(t);
		return Array.from({ length: n }, (t, n) => cn(e + n));
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
	return sn(t, n);
}
function un(e) {
	return It.get(e);
}
function dn() {
	return k.venue.sections.find((e) => e.loose) || null;
}
function fn() {
	return Zt;
}
var pn = (e = k.venue) => +e?.baseScale || 1;
function mn(e) {
	return +(e / pn()).toFixed(2);
}
function hn(e) {
	for (let t of e?.rows || []) if (t.seatSpacing > 0) return t.seatSpacing;
	return e?.gen?.seatPitch > 0 ? e.gen.seatPitch : mn(16);
}
function gn(e = k.venue) {
	return +(D.seatDefaults.size / pn(e)).toFixed(2);
}
function _n(e = k.venue) {
	return +(gn(e) / .75).toFixed(2);
}
function vn() {
	fn() === 0 && (k.venue.baseScale = +k.zoom.toFixed(2));
}
function yn() {
	fn() === 0 && (k.venue.baseScale = 1);
}
function bn(e = null) {
	let t = D.limits.venueSeats - fn(), n = D.limits.sectionSeats - (e ? Xe(e) : 0);
	return Math.max(0, Math.min(D.limits.dropTotal, t, n));
}
function xn(e, t) {
	let n = [], r = t;
	for (let t of e) {
		if (r <= 0) break;
		let e = t.slice(0, Math.min(D.limits.rowSeats, r));
		e.length && (n.push(e), r -= e.length);
	}
	return n;
}
var Sn = null;
function Cn(e) {
	k.notice = e, clearTimeout(Sn), Sn = setTimeout(() => {
		k.notice = "";
	}, 3500);
}
function wn() {
	if (!k.selection.size) return !1;
	for (let e of k.selection) {
		let t = It.get(e);
		if (!t || !t.section.loose) return !1;
	}
	return !0;
}
function Tn() {
	let e = dn();
	if (!e || e.rows.some((e) => e.seats.length)) return null;
	let t = k.venue.sections.indexOf(e);
	return k.venue.sections = k.venue.sections.filter((t) => t !== e), {
		loose: e,
		index: t
	};
}
function En(e) {
	e && k.venue.sections.splice(Math.min(e.index, k.venue.sections.length), 0, e.loose);
}
function Dn(e, t, n = null, r = null) {
	let i = null, a = Infinity;
	for (let o of k.venue.sections) {
		if (!o.visible || r && o.id !== r) continue;
		let s = n ?? _n() / 2, c = s * s;
		for (let n of o.rows) for (let r of n.seats) {
			let n = r.x - e, o = r.y - t, s = n * n + o * o;
			s <= c && s < a && (i = r, a = s);
		}
	}
	return i;
}
function On(e, t, n, r, i = null) {
	let a = [];
	for (let o of k.venue.sections) if (o.visible && !(i && o.id !== i)) for (let i of o.rows) for (let o of i.seats) o.x >= e && o.x <= n && o.y >= t && o.y <= r && a.push(o.id);
	return a;
}
function kn(e, t, n) {
	let r = Infinity;
	for (let i = 1; i < e.length; i++) {
		let a = Te(t, n, e[i - 1].x, e[i - 1].y, e[i].x, e[i].y);
		a < r && (r = a);
	}
	return r;
}
function An(e, t, n, r) {
	let i = (e, t, n) => (t.x - e.x) * (n.y - e.y) - (t.y - e.y) * (n.x - e.x), a = i(n, r, e), o = i(n, r, t), s = i(e, t, n), c = i(e, t, r);
	if (!((a > 0 && o < 0 || a < 0 && o > 0) && (s > 0 && c < 0 || s < 0 && c > 0))) return null;
	let l = ((e.x - n.x) * (n.y - r.y) - (e.y - n.y) * (n.x - r.x)) / ((e.x - t.x) * (n.y - r.y) - (e.y - t.y) * (n.x - r.x));
	return {
		x: e.x + l * (t.x - e.x),
		y: e.y + l * (t.y - e.y)
	};
}
function jn(e, t) {
	let n = 0;
	if (Ce(e[0].x, e[0].y, t)) return 0;
	for (let r = 1; r < e.length; r++) {
		let i = Math.hypot(e[r].x - e[r - 1].x, e[r].y - e[r - 1].y);
		if (Ce(e[r].x, e[r].y, t)) return n + i;
		let a = Infinity;
		for (let n = 0, i = t.length - 1; n < t.length; i = n++) {
			let o = An(e[r - 1], e[r], t[i], t[n]);
			if (o) {
				let t = Math.hypot(o.x - e[r - 1].x, o.y - e[r - 1].y);
				t < a && (a = t);
			}
		}
		if (a < Infinity) return n + a;
		n += i;
	}
	return Infinity;
}
function Mn(e, t = null, n = null) {
	if (!e || e.length < 2) return [];
	let r = n ?? _n() * .6, i = [];
	for (let n of k.venue.sections) if (n.visible && !(t && n.id !== t)) for (let t of n.rows) t.seats.some((t) => kn(e, t.x, t.y) <= r) && i.push(t.id);
	return i;
}
function Nn(e, t = null, n = null) {
	if (!e || e.length < 2) return [];
	let r = n ?? _n() * .6, i = [];
	for (let n of k.venue.sections) if (n.visible && !(t && n.id !== t)) for (let t of n.rows) for (let n of t.seats) kn(e, n.x, n.y) <= r && i.push(n.id);
	return i;
}
function Pn(e, t = null) {
	if (!e || e.length < 3) return [];
	let n = we(e), r = [];
	for (let i of k.venue.sections) if (i.visible && !(t && i.id !== t)) for (let t of i.rows) for (let i of t.seats) i.x < n.minX || i.x > n.maxX || i.y < n.minY || i.y > n.maxY || Ce(i.x, i.y, e) && r.push(i.id);
	return r;
}
function Fn(e) {
	if (!e || e.length < 2) return [];
	let t = dn(), n = [];
	for (let r of k.venue.sections) {
		if (!r.visible || !r.path || t && r.id === t.id) continue;
		let i = jn(e, ct(r.path));
		i < Infinity && n.push({
			id: r.id,
			dist: i
		});
	}
	return n.sort((e, t) => e.dist - t.dist), n.map((e) => e.id);
}
function In(e, t) {
	for (let n = k.venue.sections.length - 1; n >= 0; n--) {
		let r = k.venue.sections[n];
		if (!r.visible || !r.path) continue;
		let i = ct(r.path);
		if (i.length >= 3 && Ce(e, t, i)) return r;
	}
	return null;
}
function Ln(e, t, n, r) {
	let i = [];
	for (let a of k.venue.sections) {
		if (!a.visible || !a.path) continue;
		let o = we(ct(a.path));
		o.minX <= n && o.maxX >= e && o.minY <= r && o.maxY >= t && i.push({
			id: a.id,
			cy: (o.minY + o.maxY) / 2,
			cx: (o.minX + o.maxX) / 2
		});
	}
	return i.sort((e, t) => e.cy - t.cy || e.cx - t.cx), i.map((e) => e.id);
}
function Rn(e, t) {
	let n = t.map((e) => e.section.rows), r = t.map((e) => e.section.id), i = null;
	return {
		label: e,
		redo() {
			t.forEach((e) => e.section.rows = e.next), i = Tn(), nn(i ? [...r, i.loose.id] : r);
		},
		undo() {
			En(i), i = null, t.forEach((e, t) => e.section.rows = n[t]), nn(r);
		}
	};
}
function zn(e, t) {
	let n = Rt?.venueBounds?.();
	if (n && n.w > 0 && n.h > 0) {
		let r = Math.min(n.w * .9 / e, n.h * .9 / t), i = e * r, a = t * r;
		return {
			x: n.x + (n.w - i) / 2,
			y: n.y + (n.h - a) / 2,
			w: i,
			h: a
		};
	}
	let r = 2e3 / Math.max(e, t), i = Rt?.viewCenter?.() || {
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
		Rt = e;
	},
	fit: () => Rt?.fit(),
	zoomIn: () => Rt?.zoomIn(),
	zoomOut: () => Rt?.zoomOut(),
	zoom100: () => Rt?.zoom100(),
	panBy: (e, t) => Rt?.panBy(e, t),
	toggleSnap() {
		k.snapEnabled = !k.snapEnabled;
	},
	updatePointerPos(e) {
		Wt = e ? {
			x: e.x,
			y: e.y
		} : null;
	},
	toggleSeatBars() {
		k.showSeatBars = !k.showSeatBars, k.venue.showSeatBars = k.showSeatBars, Pt = !0, k.canvasTick++, k.sectionsTick++;
	},
	toggleTheme() {
		let e = k.theme === "dark" ? "light" : "dark";
		k.theme = e, k.venue.theme = e, k.sectionsTick++;
	},
	setTheme(e) {
		!["light", "dark"].includes(e) || k.theme === e || (k.theme = e, k.venue.theme = e, k.sectionsTick++);
	},
	setTool(e) {
		if (k.tool = e, e === "image") {
			let e = k.venue.images || [];
			(e.find((e) => e.id === k.activeImageId && e.visible !== !1 && !e.locked) || e.find((e) => e.visible !== !1 && !e.locked)) && this.setImageSelected(!0);
		} else e !== "select" && this.setImageSelected(!1);
	},
	setActiveSection(e) {
		k.activeSectionId = e;
	},
	setSelection: (e) => tn(e),
	clearSelection() {
		k.selection.size && tn(/* @__PURE__ */ new Set());
	},
	selectSectionSeats(e) {
		let t = an(e);
		if (!t) return;
		let n = t.rows.flatMap((e) => e.seats.map((e) => e.id));
		tn(new Set(n));
	},
	selectAll() {
		let e = [];
		for (let t of k.venue.sections) if (t.visible && (k.mode !== "seats" || t.id === k.editingSectionId)) for (let n of t.rows) for (let t of n.seats) e.push(t.id);
		tn(new Set(e));
	},
	addSectionFromRows(e, t, n = null) {
		let r = k.venue, i = n ? lt(n) : ut(t), a = ze(e, on(), t, n, i);
		return A({
			label: "新建分区",
			redo() {
				r.sections.push(a), k.activeSectionId = a.id, nn([a.id]);
			},
			undo() {
				r.sections = r.sections.filter((e) => e !== a), nn([a.id]);
			}
		}), a;
	},
	addGridSection(e, t, n, r) {
		vn();
		let i = {
			type: "grid",
			x: e,
			y: t,
			rows: n,
			cols: r,
			seatPitch: mn(D.seatDefaults.seatPitch),
			rowPitch: mn(D.seatDefaults.rowPitch)
		};
		return this.addSectionFromRows(`网格区 ${k.venue.sections.length + 1}`, Qe(i), i);
	},
	addSectionWithPath(e, t) {
		let n = k.venue, r = ze(e, on(), [], null, t);
		return A({
			label: "绘制分区",
			redo() {
				n.sections.push(r), k.activeSectionId = r.id, nn([r.id]);
			},
			undo() {
				n.sections = n.sections.filter((e) => e !== r), nn([r.id]);
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
		return this.addSectionWithPath(`矩形分区 ${k.venue.sections.length + 1}`, st(i));
	},
	addPolySection(e) {
		return this.addSectionWithPath(`自定义分区 ${k.venue.sections.length + 1}`, st(e));
	},
	addArcSection(e, t, n) {
		vn();
		let r = Math.atan2(n.y - e.y, n.x - e.x) * 180 / Math.PI, i = {
			type: "arc",
			cx: e.x,
			cy: e.y,
			innerR: t,
			rowCount: 8,
			startDeg: r - 50,
			endDeg: r + 50,
			seatPitch: mn(D.seatDefaults.seatPitch),
			rowPitch: mn(D.seatDefaults.rowPitch)
		};
		return this.addSectionFromRows(`弧形区 ${k.venue.sections.length + 1}`, $e(i), i);
	},
	removeSections(e) {
		let t = k.venue, n = t.sections.map((e, t) => ({
			s: e,
			i: t
		})).filter((t) => e.includes(t.s.id));
		n.length && A({
			label: "删除分区",
			redo() {
				t.sections = t.sections.filter((t) => !e.includes(t.id)), e.includes(k.activeSectionId) && (k.activeSectionId = null), nn(e);
			},
			undo() {
				n.forEach(({ s: e, i: n }) => t.sections.splice(Math.min(n, t.sections.length), 0, e)), nn(e);
			}
		});
	},
	updateSection(e, t) {
		let n = an(e);
		if (!n) return;
		let r = {};
		for (let e in t) r[e] = n[e];
		A({
			label: "修改分区",
			redo() {
				Object.assign(n, t), k.sectionsTick++, j([e]);
			},
			undo() {
				Object.assign(n, r), k.sectionsTick++, j([e]);
			}
		});
	},
	regenSection(e, t) {
		let n = an(e);
		if (!n?.gen) return;
		let r = {
			gen: n.gen,
			rows: n.rows,
			path: n.path
		}, i = {
			...r.gen,
			...t
		}, a = tt(i), o = a.reduce((e, t) => e + t.seats.length, 0);
		if (o > D.limits.sectionSeats || fn() - Xe(n) + o > D.limits.venueSeats) {
			Cn(`生成参数超出数量上限（单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未应用`);
			return;
		}
		let s = lt(i);
		A({
			label: "重新生成座位",
			redo() {
				n.gen = i, n.rows = a, n.path = s, nn([e]);
			},
			undo() {
				Object.assign(n, r), nn([e]);
			}
		});
	},
	addRowToActive(e) {
		this.addRowsByDrop([e]);
	},
	addRowsByDrop(e) {
		if (!e?.length || !e[0]?.length) return;
		vn();
		let t = k.venue, n = dn(), r = n ? null : Be(), i = n || r, a = xn(e, bn(i));
		if (!a.length) {
			Cn(`已达数量上限（单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未添加座位`);
			return;
		}
		let o = a.map((e) => Le("", e));
		A({
			label: "绘制座位",
			redo() {
				r && !t.sections.includes(r) && t.sections.push(r), i.rows.push(...o), nn([i.id]);
			},
			undo() {
				i.rows = i.rows.filter((e) => !o.includes(e)), r && (t.sections = t.sections.filter((e) => e !== r)), nn([i.id]);
			}
		});
	},
	convertRowsToSection(e) {
		let t = k.venue, n = dn();
		if (!n) return;
		let r = n.rows.filter((t) => e.includes(t.id));
		if (!r.length) return;
		let i = ze(`分区 ${t.sections.length + 1}`, on(), r, null, ut(r)), a = n.rows, o = n.rows.filter((t) => !e.includes(t.id)), s = null;
		A({
			label: "转为分区",
			redo() {
				n.rows = o, t.sections.push(i), s = Tn(), nn([n.id, i.id]);
			},
			undo() {
				t.sections = t.sections.filter((e) => e !== i), En(s), s = null, n.rows = a, nn([n.id, i.id]);
			}
		}), k.mode === "seats" ? this.exitSection() : tn(/* @__PURE__ */ new Set()), this.setSectionSelection([i.id]);
	},
	addRowsToSection(e, t) {
		vn();
		let n = an(e);
		if (!n || !t.length) return;
		let r = xn(t, bn(n));
		if (!r.length) {
			Cn(`已达数量上限（单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未添加座位`);
			return;
		}
		n.cat_id != null && r.forEach((e) => e.forEach((e) => {
			e.cat ??= n.cat_id;
		}));
		let i = r.map((e) => Le("", e));
		A({
			label: "绘制座位",
			redo() {
				n.rows.push(...i), nn([e]);
			},
			undo() {
				n.rows = n.rows.filter((e) => !i.includes(e)), nn([e]);
			}
		});
	},
	replaceVenueImage({ src: e, w: t, h: n, name: r = "" }) {
		let i = k.venue.images, a = k.activeImageId, o = zn(t, n), s = Je({
			src: e,
			...o,
			baseW: o.w,
			baseH: o.h,
			name: r || "参考底图"
		});
		return A({
			label: i.length ? "替换底图" : "上传底图",
			redo() {
				k.venue.images = [s], k.activeImageId = s.id, k.imageTick++;
			},
			undo() {
				k.venue.images = i, k.activeImageId = a, k.imageTick++;
			}
		}), s;
	},
	addVenueImage({ src: e, w: t, h: n, name: r = "" }) {
		let i = zn(t, n), a = Je({
			src: e,
			...i,
			baseW: i.w,
			baseH: i.h,
			name: r || `图片 ${k.venue.images.length + 1}`
		});
		return A({
			label: "上传底图",
			redo() {
				k.venue.images.push(a), k.activeImageId = a.id, k.imageTick++;
			},
			undo() {
				k.venue.images = k.venue.images.filter((e) => e !== a), k.activeImageId === a.id && (k.activeImageId = k.venue.images.at(-1)?.id ?? null), k.imageTick++;
			}
		}), a;
	},
	imageById(e) {
		return k.venue.images.find((t) => t.id === e) || null;
	},
	setActiveImage(e) {
		k.activeImageId = e, k.imageTick++;
	},
	setImageSelected(e) {
		e = !!e, k.imageSelected !== e && (k.imageSelected = e, e && k.sectionSelection.size && this.setSectionSelection([]), k.imageTick++);
	},
	pickImages() {
		k.imagePickTick++;
	},
	moveVenueImage(e, t, n) {
		let r = this.imageById(e);
		r && A({
			label: "移动底图",
			redo() {
				r.x += t, r.y += n, k.imageTick++;
			},
			undo() {
				r.x -= t, r.y -= n, k.imageTick++;
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
				n.rotation = i, k.imageTick++;
			},
			undo() {
				n.rotation = r, k.imageTick++;
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
				Object.assign(n, t), k.imageTick++;
			},
			undo() {
				Object.assign(n, r), k.imageTick++;
			}
		});
	},
	previewImageTransform(e, t) {
		let n = this.imageById(e);
		n && (Object.assign(n, t), k.imageTick++);
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
		let n = zn(t.baseW || t.w, t.baseH || t.h), r = {
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
				Object.assign(t, i), k.imageTick++;
			},
			undo() {
				Object.assign(t, r), k.imageTick++;
			}
		});
	},
	removeVenueImage(e) {
		let t = k.venue.images.findIndex((t) => t.id === e);
		if (t < 0) return;
		let n = k.venue.images[t];
		A({
			label: "删除底图",
			redo() {
				k.venue.images = k.venue.images.filter((e) => e !== n), k.activeImageId === n.id && (k.activeImageId = k.venue.images.at(-1)?.id ?? null), k.imageSelected = !1, k.imageTick++;
			},
			undo() {
				k.venue.images.splice(Math.min(t, k.venue.images.length), 0, n), k.activeImageId = n.id, k.imageTick++;
			}
		});
	},
	reorderVenueImage(e, t) {
		let n = k.venue.images.findIndex((t) => t.id === e), r = n + (t > 0 ? 1 : -1);
		n < 0 || r < 0 || r >= k.venue.images.length || A({
			label: "底图层序",
			redo() {
				let e = k.venue.images;
				[e[n], e[r]] = [e[r], e[n]], k.imageTick++;
			},
			undo() {
				let e = k.venue.images;
				[e[r], e[n]] = [e[n], e[r]], k.imageTick++;
			}
		});
	},
	openCategoryModal() {
		k.catModalOpen = !0;
	},
	closeCategoryModal() {
		k.catModalOpen = !1;
	},
	openLabelModal(e = "sections") {
		k.labelModalTarget = e, k.labelModalOpen = !0;
	},
	closeLabelModal() {
		k.labelModalOpen = !1;
	},
	on(e, t) {
		return Gt.has(e) || Gt.set(e, /* @__PURE__ */ new Set()), Gt.get(e).add(t), () => Gt.get(e)?.delete(t);
	},
	off(e, t) {
		Gt.get(e)?.delete(t);
	},
	setSaveHandler(e) {
		zt = typeof e == "function" ? e : null;
	},
	setImageUploader(e) {
		Dt(e);
	},
	setLoadPhase(e) {
		k.loadPhase = ["venue", "seats"].includes(e) ? e : "";
	},
	setData(e, t = []) {
		this.loadVenue(vt(e, t)), Bt = St(k.venue), Vt = JSON.stringify(wt(k.venue).venue);
	},
	mergeBackendSeats(e = []) {
		_t(k.venue, e), Qt(), Pt = !0, k.canvasTick++, Bt = St(k.venue), k.dirty = !1;
	},
	renameVenue(e) {
		let t = String(e || "").trim().slice(0, 50);
		!t || t === k.venue.name || (k.venue.name = t, k.sectionsTick++);
	},
	newVenue(e) {
		let t = typeof e == "string" ? { name: e } : e || {}, n = Ye(t.name || "未命名场馆");
		t.theme && ["light", "dark"].includes(t.theme) && (n.theme = t.theme), t.id != null && t.id !== "" && (n.backendId = String(t.id));
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
		if (k.readonly || k.saving) return { saved: !1 };
		k.saving = !0;
		try {
			let e = !k.venue.backendId;
			e && (k.venue.backendId = Fe("venue"));
			let { venue: t, seatlist: n } = wt(k.venue), r = JSON.stringify(t), i;
			if (!Bt) i = {
				save_type: "full",
				venue: t,
				seatlist: n
			};
			else {
				let { upsert: e, del: n } = Ct(St(k.venue), Bt);
				if (!e.length && !n.length && r === Vt) return {
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
			if (zt) {
				if (await zt(i) !== !0) throw Error("宿主保存接口返回失败");
			} else throw Error("未配置保存通道：请用 setSaveHandler 注入宿主导函数");
			return Bt = St(k.venue), Vt = r, k.dirty = !1, e && Kt("venue", k.venue.backendId), Kt("save", i), { saved: !0 };
		} finally {
			k.saving = !1;
		}
	},
	async uiSave() {
		if (!k.saving) try {
			let e = await this.saveToBackend();
			e?.empty && (k.dirty = !1), k.saveFeedback = {
				tick: k.saveFeedback.tick + 1,
				type: e?.empty ? "empty" : "saved"
			};
		} catch (e) {
			alert(e.message);
		}
	},
	getSavePayload: () => ({
		save_type: "full",
		...wt(k.venue)
	}),
	setImageOpacity(e, t) {
		let n = this.imageById(e);
		n && (n.opacity = Math.min(1, Math.max(0, t)), k.imageTick++);
	},
	setImageLocked(e, t) {
		let n = this.imageById(e);
		n && (n.locked = !!t, k.imageTick++);
	},
	setImageVisible(e, t) {
		let n = this.imageById(e);
		n && (n.visible = !!t, k.imageTick++);
	},
	enterSection(e) {
		an(e) && (k.mode = "seats", k.editingSectionId = e, k.activeSectionId = e, k.tool = "select", k.imageSelected = !1, tn(/* @__PURE__ */ new Set()), k.modeTick++);
	},
	exitSection() {
		k.mode !== "sections" && (k.mode = "sections", k.editingSectionId = null, k.tool = "select", tn(/* @__PURE__ */ new Set()), k.modeTick++);
	},
	setSectionSelection(e) {
		k.sectionSelection = d(new Set(e)), k.sectionSelectionTick++, e.length && k.imageSelected && (k.imageSelected = !1, k.imageTick++), k.activeSectionId = e.length ? e[e.length - 1] : null, k.sectionsTick++;
	},
	clearSectionSelection() {
		k.sectionSelection.size && this.setSectionSelection([]);
	},
	moveSections(e, t, n) {
		let r = e.map((e) => an(e)).filter(Boolean);
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
		let r = e.map((e) => an(e)).filter(Boolean);
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
					e.path &&= st(ct(e.path).map((e) => be(e.x, e.y, n.x, n.y, t)));
					for (let r of e.rows) for (let e of r.seats) {
						let r = be(e.x, e.y, n.x, n.y, t);
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
		let n = an(e);
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
		if (a > D.limits.sectionSeats || fn() - Xe(n) + a > D.limits.venueSeats) {
			Cn(`调整结果超出数量上限（单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未应用`);
			return;
		}
		A({
			label: "调整分区形状",
			redo() {
				Object.assign(n, i), nn([e]);
			},
			undo() {
				Object.assign(n, r), nn([e]);
			}
		});
	},
	updateSectionPath(e, t) {
		let n = an(e);
		if (!n || !t || n.path === t) return;
		let r = n.path;
		A({
			label: "节点编辑",
			redo() {
				n.path = t, j([e]), k.sectionsTick++;
			},
			undo() {
				n.path = r, j([e]), k.sectionsTick++;
			}
		});
	},
	resizeRows(e, t, n) {
		let r = an(k.editingSectionId) || dn();
		if (!r || !Number.isInteger(n) || !n || t !== "start" && t !== "end") return;
		let i = r.rows.filter((t) => e.includes(t.id) && t.seats.length >= 2);
		if (!i.length) return;
		if (n > 0) {
			let e = Math.max(0, Math.min(D.limits.sectionSeats - Xe(r), D.limits.venueSeats - fn())), t = Math.min(...i.map((e) => D.limits.rowSeats - e.seats.length)), a = Math.min(n, t, Math.floor(e / i.length));
			if (a <= 0) {
				Cn(`已达数量上限（单排 ${D.limits.rowSeats} / 单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未增加座位`);
				return;
			}
			a !== n && Cn(`受数量上限限制，本次每排仅增加 ${a} 座`), n = a;
		}
		let a = i.map((e) => ({
			row: e,
			step: ke(e, t),
			before: e.seats.map((e) => ({ ...e }))
		})), o = ({ step: e, before: r }) => {
			let i = Math.max(1, r.length + n), a = r.some((e) => e.n !== "" && e.n != null), o = a ? sn(r[0].n ?? 1, i) : null, s = typeof r[0].n == "number", c = (e) => s && /^\d+$/.test(o[e]) ? +o[e] : o[e], l = [];
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
		}, s = () => tn(new Set(i.flatMap((e) => e.seats.map((e) => e.id))));
		A({
			label: "调整排长",
			redo() {
				for (let e of a) e.row.seats = o(e), e.row.curve && rn(e.row);
				nn([r.id]), s();
			},
			undo() {
				for (let e of a) e.row.seats = e.before.map((e) => ({ ...e }));
				nn([r.id]), s();
			}
		});
	},
	rotateSeats(e, t, n) {
		let r = [], i = /* @__PURE__ */ new Set();
		for (let t of e) {
			let e = It.get(t);
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
					let r = be(e.x, e.y, n.x, n.y, t);
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
			let e = It.get(t);
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
			let e = It.get(i);
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
		this.setSeatsStatus([...k.selection], e);
	},
	setSeatsType(e, t) {
		t = +t || 1;
		let n = [], r = /* @__PURE__ */ new Set();
		for (let i of e) {
			let e = It.get(i);
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
		this.setSeatsType([...k.selection], e);
	},
	addCategory({ label: e, color: t, accessible: n = !1, price: r = null } = {}) {
		let i = Math.max(0, ...k.venue.categories.map((e) => +e.key || 0)) + 1, a = {
			key: i,
			label: e || `类别 ${i}`,
			color: t || ae[(i - 1) % ae.length],
			accessible: !!n,
			price: r == null ? null : +r
		};
		return A({
			label: "添加类别",
			redo() {
				k.venue.categories.push(a), k.sectionsTick++;
			},
			undo() {
				k.venue.categories = k.venue.categories.filter((e) => e !== a), k.sectionsTick++;
			}
		}), a;
	},
	updateCategory(e, t) {
		let n = en(e);
		if (!n) return;
		let r = {};
		for (let e in t) r[e] = n[e];
		A({
			label: "修改类别",
			redo() {
				Object.assign(n, t), $t();
			},
			undo() {
				Object.assign(n, r), $t();
			}
		});
	},
	removeCategory(e) {
		let t = en(e);
		if (!t) return;
		let n = [];
		for (let t of k.venue.sections) for (let r of t.rows) for (let t of r.seats) t.cat === e && n.push(t);
		A({
			label: "删除类别",
			redo() {
				k.venue.categories = k.venue.categories.filter((e) => e !== t), n.forEach((e) => e.cat = null), $t();
			},
			undo() {
				k.venue.categories.push(t), n.forEach((t) => t.cat = e), $t();
			}
		});
	},
	setSeatsCategory(e, t) {
		let n = [], r = /* @__PURE__ */ new Set();
		for (let i of e) {
			let e = It.get(i);
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
		this.setSeatsCategory([...k.selection], e);
	},
	selectedRows() {
		let e = /* @__PURE__ */ new Map();
		for (let t of k.selection) {
			let n = It.get(t);
			n && e.set(n.row.id, n.row);
		}
		return [...e.values()];
	},
	updateRowLabel(e, t) {
		let n = Lt.get(e);
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
		let i = e.map((e) => Lt.get(e)).filter(Boolean);
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
		let t = e.map((e) => Lt.get(e)).filter(Boolean), n = t.filter((e) => e.row.label !== "").map((e) => ({
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
		let n = e.map((e) => Lt.get(e)).filter(Boolean), r = n.map((e) => ({
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
		let i = e.map((e) => k.venue.sections.find((t) => t.id === e)).filter(Boolean);
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
				o.forEach((e) => e.s.name = e.next), k.sectionsTick++, j(s);
			},
			undo() {
				o.forEach((e) => e.s.name = e.before), k.sectionsTick++, j(s);
			}
		});
	},
	clearSectionLabels(e) {
		let t = e.map((e) => k.venue.sections.find((t) => t.id === e)).filter((e) => e && e.name !== "").map((e) => ({
			s: e,
			before: e.name
		}));
		if (!t.length) return;
		let n = t.map((e) => e.s.id);
		A({
			label: "清除分区标签",
			redo() {
				t.forEach((e) => e.s.name = ""), k.sectionsTick++, j(n);
			},
			undo() {
				t.forEach((e) => e.s.name = e.before), k.sectionsTick++, j(n);
			}
		});
	},
	updateSectionLabel(e, t) {
		let n = e.map((e) => k.venue.sections.find((t) => t.id === e)).filter(Boolean);
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
		let n = e.map((e) => k.venue.sections.find((t) => t.id === e)).filter(Boolean);
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
		let i = e.map((e) => Lt.get(e)).filter(Boolean);
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
		let t = e.map((e) => Lt.get(e)).filter(Boolean), n = [];
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
			let e = It.get(t);
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
			let e = It.get(r);
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
		let n = e.map((e) => Lt.get(e)).filter(Boolean), r = [];
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
				r.forEach((e) => a(e.row, t)), r.some((e) => e.curved) ? nn(i) : j(i);
			},
			undo() {
				r.forEach((e) => {
					e.curved ? e.row.seats = e.before.map((e) => ({ ...e })) : e.before.forEach((t, n) => {
						let r = e.row.seats[n];
						r.x = t.x, r.y = t.y, r.r = t.r;
					}), e.row.seatSpacing = e.beforeSpacing;
				}), r.some((e) => e.curved) ? nn(i) : j(i);
			}
		});
	},
	setRowsRotation(e, t) {
		t = Math.max(-90, Math.min(90, +t || 0));
		let n = e.map((e) => Lt.get(e)).filter(Boolean), r = [];
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
					let n = be(t.x, t.y, e.c.x, e.c.y, e.delta);
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
		let n = e.map((e) => Lt.get(e)).filter(Boolean), r = [];
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
					e.row.curve = t, rn(e.row);
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
		let n = e.map((e) => Lt.get(e)).filter(Boolean), r = n.map((e) => e.row).filter((e) => e.seats.length >= 2);
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
	straightenRows(e) {
		let t = e.map((e) => Lt.get(e)).filter(Boolean), n = t.map((e) => e.row).filter((e) => e.seats.length >= 2);
		if (n.length < 2) return;
		let r = je(n), i = n.map((e) => {
			let t = De(e), n = t.x * r.x + t.y * r.y, i = t.x * r.y - t.y * r.x, a = Math.atan2(i, n);
			Math.abs(a) > Math.PI / 2 && (a -= Math.sign(a) * Math.PI);
			let o = Math.abs(a) >= 5e-4, s = Math.abs(e.curve || 0) > 1e-6;
			if (!o && !s) return null;
			let c = Ae(e);
			return c ? {
				row: e,
				centro: c,
				angle: a,
				needUnbend: s,
				before: e.seats.map((e) => ({
					s: e,
					x: e.x,
					y: e.y,
					r: e.r || 0
				})),
				beforeCurve: e.curve || 0
			} : null;
		}).filter(Boolean);
		if (!i.length) return;
		let a = [...new Set(t.map((e) => e.section.id))];
		A({
			label: "排校正",
			redo() {
				for (let e of i) {
					let t = Math.cos(e.angle), n = Math.sin(e.angle);
					for (let r of e.row.seats) {
						let i = r.x - e.centro.x, a = r.y - e.centro.y;
						r.x = e.centro.x + i * t - a * n, r.y = e.centro.y + i * n + a * t;
					}
					e.needUnbend && (e.row.curve = 0, rn(e.row));
				}
				j(a);
			},
			undo() {
				for (let e of i) e.before.forEach((e) => {
					e.s.x = e.x, e.s.y = e.y, e.s.r = e.r;
				}), e.row.curve = e.beforeCurve;
				j(a);
			}
		});
	},
	distributeRows(e) {
		let t = e.map((e) => Lt.get(e)).filter(Boolean), n = t.map((e) => e.row);
		if (n.length < 3) return;
		let r = je(n), i = -r.y, a = r.x, o = (e) => e.x * i + e.y * a, s = n.map((e) => {
			let t = Ae(e);
			return {
				row: e,
				pos: o(t)
			};
		}).sort((e, t) => e.pos - t.pos), c = s[0].pos, l = s[s.length - 1].pos;
		if (Math.abs(l - c) < 1e-6) return;
		let u = (l - c) / (s.length - 1), d = s.map((e, t) => c + u * t), f = s.map((e, t) => ({
			row: e.row,
			delta: d[t] - e.pos,
			before: e.row.seats.map((e) => ({
				s: e,
				x: e.x,
				y: e.y
			}))
		})).filter((e) => Math.abs(e.delta) > .5);
		if (!f.length) return;
		let p = [...new Set(t.map((e) => e.section.id))];
		A({
			label: "排均匀分布",
			redo() {
				for (let e of f) for (let t of e.row.seats) t.x += i * e.delta, t.y += a * e.delta;
				j(p);
			},
			undo() {
				for (let e of f) e.before.forEach((e) => {
					e.s.x = e.x, e.s.y = e.y;
				});
				j(p);
			}
		});
	},
	flipRowsH(e) {
		this._flipRows(e, "h");
	},
	flipRowsV(e) {
		this._flipRows(e, "v");
	},
	_flipRows(e, t) {
		let n = e.map((e) => Lt.get(e)).filter(Boolean);
		if (!n.length) return;
		let r = n.map((e) => e.row), i = 0, a = 0, o = 0;
		for (let e of r) for (let t of e.seats) i += t.x, a += t.y, o++;
		if (!o) return;
		i /= o, a /= o;
		let s = r.map((e) => ({
			row: e,
			before: e.seats.map((e) => ({
				s: e,
				x: e.x,
				y: e.y
			}))
		})), c = [...new Set(n.map((e) => e.section.id))];
		A({
			label: t === "h" ? "水平翻转" : "垂直翻转",
			redo() {
				for (let e of s) for (let n of e.row.seats) t === "h" ? n.x = i * 2 - n.x : n.y = a * 2 - n.y;
				j(c);
			},
			undo() {
				for (let e of s) e.before.forEach((e) => {
					e.s.x = e.x, e.s.y = e.y;
				});
				j(c);
			}
		});
	},
	flipSectionsH(e) {
		this._flipSections(e, "h");
	},
	flipSectionsV(e) {
		this._flipSections(e, "v");
	},
	_flipSections(e, t) {
		let n = e.map((e) => an(e)).filter(Boolean);
		if (!n.length) return;
		let r = 0, i = 0, a = 0;
		for (let e of n) for (let t of e.rows) for (let e of t.seats) r += e.x, i += e.y, a++;
		if (!a) for (let e of n) {
			if (!e.path) continue;
			let t = ct(e.path);
			if (!t.length) continue;
			let n = we(t);
			r += (n.minX + n.maxX) / 2, i += (n.minY + n.maxY) / 2, a++;
		}
		if (!a) return;
		r /= a, i /= a;
		let o = n.map((e) => ({
			section: e,
			beforePath: e.path,
			beforeSeats: e.rows.map((e) => e.seats.map((e) => ({
				x: e.x,
				y: e.y
			}))).flat(),
			beforeGen: e.gen ? { ...e.gen } : null
		}));
		A({
			label: t === "h" ? "水平翻转分区" : "垂直翻转分区",
			redo() {
				for (let e of o) {
					let n = e.section;
					n.path &&= ve(n.path, t, t === "h" ? r : i);
					for (let e of n.rows) for (let n of e.seats) t === "h" ? n.x = r * 2 - n.x : n.y = i * 2 - n.y;
					n.gen?.type === "grid" && (t === "h" ? n.gen.x = r * 2 - n.gen.x : n.gen.y = i * 2 - n.gen.y), n.gen?.type === "arc" && (t === "h" ? n.gen.cx = r * 2 - n.gen.cx : n.gen.cy = i * 2 - n.gen.cy);
				}
				j(e);
			},
			undo() {
				for (let e of o) {
					let t = e.section;
					t.path = e.beforePath, t.rows.flatMap((e) => e.seats).forEach((t, n) => {
						n < e.beforeSeats.length && (t.x = e.beforeSeats[n].x, t.y = e.beforeSeats[n].y);
					}), e.beforeGen && (t.gen = e.beforeGen);
				}
				j(e);
			}
		});
	},
	alignSections(e, t, n) {
		if (!["x", "y"].includes(t) || ![
			"start",
			"center",
			"end"
		].includes(n)) return;
		let r = e.map((e) => an(e)).filter(Boolean);
		if (r.length < 2) return;
		let i = r.map((e) => {
			let t = Infinity, n = Infinity, r = -Infinity, i = -Infinity;
			for (let a of e.rows) for (let e of a.seats) e.x < t && (t = e.x), e.y < n && (n = e.y), e.x > r && (r = e.x), e.y > i && (i = e.y);
			if (t === Infinity && e.path) {
				let a = we(e.path);
				a && (t = a.minX, n = a.minY, r = a.maxX, i = a.maxY);
			}
			return t === Infinity ? null : {
				section: e,
				minX: t,
				minY: n,
				maxX: r,
				maxY: i,
				cx: (t + r) / 2,
				cy: (n + i) / 2
			};
		}).filter(Boolean);
		if (i.length < 2) return;
		let a = t === "x" ? n === "start" ? "minX" : n === "end" ? "maxX" : "cx" : n === "start" ? "minY" : n === "end" ? "maxY" : "cy", o = n === "center" ? i.reduce((e, t) => e + t[a], 0) / i.length : n === "start" ? Math.min(...i.map((e) => e[a])) : Math.max(...i.map((e) => e[a])), s = t === "x" ? i.map((e) => o - e[a]) : i.map(() => 0), c = t === "y" ? i.map((e) => o - e[a]) : i.map(() => 0), l = i.map((e, t) => ({
			section: e.section,
			dx: s[t],
			dy: c[t],
			beforePath: e.section.path,
			beforeSeats: e.section.rows.map((e) => e.seats.map((e) => ({
				s: e,
				x: e.x,
				y: e.y
			}))),
			beforeGen: e.section.gen ? { ...e.section.gen } : null
		})).filter((e) => Math.abs(e.dx) > .05 || Math.abs(e.dy) > .05);
		l.length && A({
			label: "分区对齐",
			redo() {
				for (let e of l) {
					let t = e.section;
					t.path &&= ge(t.path, e.dx, e.dy);
					for (let n of t.rows) for (let t of n.seats) t.x += e.dx, t.y += e.dy;
					t.gen?.type === "grid" && (t.gen.x += e.dx, t.gen.y += e.dy), t.gen?.type === "arc" && (t.gen.cx += e.dx, t.gen.cy += e.dy);
				}
				j(e);
			},
			undo() {
				for (let e of l) {
					let t = e.section;
					t.path = e.beforePath;
					for (let n of t.rows) n.seats.forEach((t, n) => {
						e.beforeSeats.find((e) => e.length > n);
					});
					let n = e.beforeSeats.flat();
					e.section.rows.flatMap((e) => e.seats).forEach((e, t) => {
						t < n.length && (e.x = n[t].x, e.y = n[t].y);
					}), e.beforeGen && (e.section.gen = e.beforeGen);
				}
				j(e);
			}
		});
	},
	distributeSections(e, t) {
		if (!["x", "y"].includes(t)) return;
		let n = e.map((e) => an(e)).filter(Boolean);
		if (n.length < 3) return;
		let r = n.map((e) => {
			let t = Infinity, n = Infinity, r = -Infinity, i = -Infinity;
			for (let a of e.rows) for (let e of a.seats) e.x < t && (t = e.x), e.y < n && (n = e.y), e.x > r && (r = e.x), e.y > i && (i = e.y);
			if (t === Infinity && e.path) {
				let a = we(e.path);
				a && (t = a.minX, n = a.minY, r = a.maxX, i = a.maxY);
			}
			return t === Infinity ? null : {
				section: e,
				cx: (t + r) / 2,
				cy: (n + i) / 2
			};
		}).filter(Boolean);
		if (r.length < 3) return;
		let i = t === "x" ? "cx" : "cy";
		r.sort((e, t) => e[i] - t[i]);
		let a = r[0][i], o = r[r.length - 1][i];
		if (Math.abs(o - a) < 1e-6) return;
		let s = (o - a) / (r.length - 1), c = r.map((e, n) => {
			let r = a + s * n, i = t === "x" ? r - e.cx : 0, o = t === "y" ? r - e.cy : 0, c = e.section;
			return {
				section: c,
				dx: i,
				dy: o,
				beforePath: c.path,
				beforeSeats: c.rows.map((e) => e.seats.map((e) => ({
					x: e.x,
					y: e.y
				}))).flat(),
				beforeGen: c.gen ? { ...c.gen } : null
			};
		}).filter((e) => Math.abs(e.dx) > .05 || Math.abs(e.dy) > .05);
		c.length && A({
			label: "分区均匀分布",
			redo() {
				for (let e of c) {
					let t = e.section;
					t.path &&= ge(t.path, e.dx, e.dy);
					for (let n of t.rows) for (let t of n.seats) t.x += e.dx, t.y += e.dy;
					t.gen?.type === "grid" && (t.gen.x += e.dx, t.gen.y += e.dy), t.gen?.type === "arc" && (t.gen.cx += e.dx, t.gen.cy += e.dy);
				}
				j(e);
			},
			undo() {
				for (let e of c) {
					let t = e.section;
					t.path = e.beforePath, t.rows.flatMap((e) => e.seats).forEach((t, n) => {
						n < e.beforeSeats.length && (t.x = e.beforeSeats[n].x, t.y = e.beforeSeats[n].y);
					}), e.beforeGen && (t.gen = e.beforeGen);
				}
				j(e);
			}
		});
	},
	setRowsRowSpacing(e, t) {
		t = Math.max(8, +t || 0);
		let n = e.map((e) => Lt.get(e)).filter(Boolean);
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
			let t = It.get(e);
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
		r.length && (A(Rn("删除座位", r)), tn(new Set([...k.selection].filter((e) => !t.has(e)))));
	},
	removeSelectedSeats() {
		k.selection.size && this.removeSeats([...k.selection]);
	},
	copySelection() {
		if (k.mode === "sections" && k.sectionSelection.size) {
			let e = [...k.sectionSelection].map((e) => an(e)).filter(Boolean).map((e) => structuredClone(e));
			e.length && (Ht = {
				type: "sections",
				data: e
			}, Ut = 0, k.pastePending = !0);
		} else if (k.selection.size) {
			let e = /* @__PURE__ */ new Map();
			for (let t of k.selection) {
				let n = It.get(t);
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
			e.size && (Ht = {
				type: "seats",
				data: [...e.values()].map(({ section: e, rows: t }) => ({
					sectionId: e.id,
					sectionLoose: !!e.loose,
					rows: [...t.values()].map(({ row: e, seats: t }) => {
						let n = structuredClone(e);
						return n.seats = structuredClone(t), n;
					})
				}))
			}, Ut = 0, k.pastePending = !0);
		}
	},
	pasteClipboard() {
		if (!Ht) return;
		if (Wt) {
			this._pasteAt(Wt.x, Wt.y);
			return;
		}
		Ut++;
		let e = _n() * 20;
		this._pasteAtOffset(e * Ut, e * Ut);
	},
	pasteClipboardAt(e, t) {
		if (Ht) {
			if (e == null && Wt && (e = Wt.x, t = Wt.y), e == null) {
				this.pasteClipboard();
				return;
			}
			this._pasteAt(e, t);
		}
	},
	_pasteAt(e, t) {
		let n = 0, r = 0, i = 0;
		if (Ht.type === "sections") for (let e of Ht.data) for (let t of e.rows) for (let e of t.seats) n += e.x, r += e.y, i++;
		else if (Ht.type === "seats") for (let e of Ht.data) for (let t of e.rows) for (let e of t.seats) n += e.x, r += e.y, i++;
		let a = i ? e - n / i : 0, o = i ? t - r / i : 0;
		this._pasteAtOffset(a, o);
	},
	_pasteAtOffset(e, t) {
		Ht.type === "sections" ? this._pasteSections(Ht.data, e, t) : Ht.type === "seats" && this._pasteSeats(Ht.data, e, t);
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
		}), i = k.venue, a = r.map((e) => e.id);
		A({
			label: "粘贴分区",
			redo() {
				i.sections.push(...r), nn(a), k.sectionSelection = d(new Set(a)), k.sectionSelectionTick++, k.activeSectionId = a[a.length - 1], k.sectionsTick++;
			},
			undo() {
				i.sections = i.sections.filter((e) => !a.includes(e.id)), nn(a);
			}
		});
	},
	_pasteSeats(e, t, n) {
		let r = k.venue, i = /* @__PURE__ */ new Map();
		for (let { sectionId: r, rows: a } of e) {
			let e;
			if (k.mode === "seats") {
				if (e = an(k.editingSectionId), !e) continue;
			} else e = dn(), e ||= Be();
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
				let e = [];
				for (let t of a) {
					let n = t.before.reduce((e, t) => e + t.seats.length, 0);
					for (let r = n; r < t.after.length; r++) for (let n of t.after[r].seats) e.push(n.id);
				}
				e.length && (k.selection = d(new Set(e)), k.selectionTick++), nn(o);
			},
			undo() {
				for (let e of a) e.section.rows = e.before, e.looseCreated && (r.sections = r.sections.filter((t) => t !== e.section));
				nn(o);
			}
		});
	},
	undo() {
		let e = qt.pop();
		e && (e.undo(), Jt.push(e), Xt());
	},
	redo() {
		let e = Jt.pop();
		e && (e.redo(), qt.push(e), Xt());
	},
	loadVenue(e) {
		k.venue = d(e), Bt = null, Vt = null, qt.length = 0, Jt.length = 0, Xt(), k.activeSectionId = e.sections[0]?.id ?? null, k.activeImageId = e.images?.[0]?.id ?? null, k.theme = e.theme || "light", k.readonly = e.readonly === !0, k.showSeatBars = e.showSeatBars !== !1, k.imageSelected = !1, k.mode !== "sections" && (k.mode = "sections", k.editingSectionId = null, k.tool = "select", k.modeTick++), k.sectionSelection.size && (k.sectionSelection = d(/* @__PURE__ */ new Set()), k.sectionSelectionTick++), Pt = !0, Ft = !0, Qt(), tn(/* @__PURE__ */ new Set()), k.sectionsTick++, k.canvasTick++, k.imageTick++, k.dirty = !1, Kt("venue", k.venue.backendId ?? null);
	},
	importVenue(e) {
		if (!e || !Array.isArray(e.sections)) throw Error("invalid venue json");
		let t = Ye(String(e.name || "导入场馆"), [], e.stage || null);
		t.backendId = e.backendId ?? null, t.theme = e.theme === "dark" || e.theme === "light" ? e.theme : "light", t.showSeatBars = e.showSeatBars !== !1, t.baseScale = +e.baseScale || null, t.coordScale = +e.coordScale || 1, t.images = (Array.isArray(e.images) ? e.images : e.image ? [e.image] : []).filter((e) => e && typeof e.src == "string").map((e, t) => Je({
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
			let t = ze(e.loose ? "" : String(e.name || "未命名分区"), e.color || on(), [], e.gen || null);
			return e.loose && (t.loose = !0), t.visible = e.visible !== !1, e.cat_id != null && (t.cat_id = e.cat_id), e.label && (t.label = {
				...t.label,
				...e.label
			}), e.watermark && (t.watermark = e.watermark), t.rows = (e.rows || []).map((e) => {
				let t = Le(String(e.label ?? ""), (e.seats || []).map((e) => Ie(+e.x, +e.y, e.n ?? 0, e.status || "available", +e.r || 0, e.cat ?? null, +e.type || 1)));
				return t.seatSpacing = e.seatSpacing ?? null, t.rowSpacing = e.rowSpacing ?? null, t.labelPos = e.labelPos ?? null, t.curve = +e.curve || 0, t;
			}), t.path = typeof e.path == "string" && e.path ? e.path : Array.isArray(e.polygon) && e.polygon.length >= 3 ? st(e.polygon.map((e) => ({
				x: +e.x,
				y: +e.y
			}))) : t.loose ? "" : t.gen ? lt(t.gen) : ut(t.rows), t;
		}), this.loadVenue(t);
	},
	exportVenue() {
		let e = k.venue, t = {
			app: "seatmap-studio",
			version: 2,
			name: e.name,
			backendId: e.backendId ?? null,
			theme: e.theme || "light",
			showSeatBars: e.showSeatBars !== !1,
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
			full: Pt,
			ids: [...Nt],
			viewReset: Ft
		};
		return Pt = !1, Ft = !1, Nt.clear(), e;
	},
	seatCountOf: Xe
}, Bn;
(function(e) {
	e[e.No = 0] = "No", e[e.Yes = 1] = "Yes", e[e.NoAndSkip = 2] = "NoAndSkip", e[e.YesAndSkip = 3] = "YesAndSkip";
})(Bn ||= {});
var Vn = {};
function P(e) {
	return e === void 0;
}
function Hn(e) {
	return e == null;
}
function Un(e) {
	return typeof e == "string";
}
var { isFinite: Wn } = Number;
function F(e) {
	return typeof e == "number";
}
var { isArray: Gn } = Array;
function I(e) {
	return e && typeof e == "object";
}
function Kn(e) {
	return I(e) && !Gn(e);
}
function qn(e) {
	return JSON.stringify(e) === "{}";
}
var Jn = {
	default: (e, t) => (Yn(t, e), Yn(e, t), e),
	assign(e, t, n) {
		let r;
		Object.keys(t).forEach((i) => {
			if (r = t[i], r?.constructor === Object && e[i]?.constructor === Object) return Yn(e[i], t[i], n && n[i]);
			n && i in n ? n[i]?.constructor === Object && Yn(e[i] = {}, t[i], n[i]) : e[i] = t[i];
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
}, { assign: Yn } = Jn, Xn = class {
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
		if (e) if (Gn(e)) for (let t of e) n[t] = this.__getInput(t);
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
}, Zn = {
	RUNTIME: "runtime",
	LEAF: "leaf",
	TASK: "task",
	CANVAS: "canvas",
	IMAGE: "image",
	types: {},
	create(e) {
		let { types: t } = Qn;
		return t[e] ? t[e]++ : (t[e] = 1, 0);
	}
}, Qn = Zn, $n, er, tr, { max: nr } = Math, rr = [
	0,
	0,
	0,
	0
], ir = {
	zero: [...rr],
	tempFour: rr,
	set: (e, t, n, r, i) => (n === void 0 && (n = r = i = t), e[0] = t, e[1] = n, e[2] = r, e[3] = i, e),
	setTemp: (e, t, n, r) => ar(rr, e, t, n, r),
	toTempAB(e, t, n) {
		tr = n ? F(e) ? t : e : [], F(e) ? ($n = sr(e), er = t) : F(t) ? ($n = e, er = sr(t)) : ($n = e, er = t), $n.length !== 4 && ($n = or($n)), er.length !== 4 && (er = or(er));
	},
	get(e, t) {
		let n;
		if (!F(e)) switch (e.length) {
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
	max: (e, t, n) => F(e) && F(t) ? nr(e, t) : (cr(e, t, n), ar(tr, nr($n[0], er[0]), nr($n[1], er[1]), nr($n[2], er[2]), nr($n[3], er[3]))),
	add: (e, t, n) => F(e) && F(t) ? e + t : (cr(e, t, n), ar(tr, $n[0] + er[0], $n[1] + er[1], $n[2] + er[2], $n[3] + er[3])),
	swapAndScale(e, t, n, r) {
		if (F(e)) return t === n ? e * t : [e * n, e * t];
		let i = r ? e : [], [a, o, s, c] = e.length === 4 ? e : or(e);
		return ar(i, s * n, c * t, a * n, o * t);
	}
}, { set: ar, get: or, setTemp: sr, toTempAB: cr } = ir, { round: lr, pow: ur, max: dr, floor: fr, PI: pr } = Math, mr = {}, hr = {
	within: (e, t, n) => (I(t) && (n = t.max, t = t.min), !P(t) && e < t && (e = t), !P(n) && e > n && (e = n), e),
	fourNumber: ir.get,
	formatRotation: (e, t) => (e %= 360, t ? e < 0 && (e += 360) : (e > 180 && (e -= 360), e < -180 && (e += 360)), hr.float(e)),
	getGapRotation(e, t, n = 0) {
		let r = e + n;
		if (t > 1) {
			let e = Math.abs(r % t);
			(e < 1 || e > t - 1) && (r = Math.round(r / t) * t);
		}
		return r - n;
	},
	float(e, t) {
		let n = P(t) ? 0xe8d4a51000 : ur(10, t);
		return (e = lr(e * n) / n) === -0 ? 0 : e;
	},
	sign: (e) => e < 0 ? -1 : 1,
	getScaleData(e, t, n, r) {
		if (r ||= {}, t) {
			let e = (F(t) ? t : t.width || 0) / n.width, i = (F(t) ? t : t.height || 0) / n.height;
			r.scaleX = e || i || 1, r.scaleY = i || e || 1;
		} else e && hr.assignScale(r, e);
		return r;
	},
	getScaleFixedData(e, t, n, r, i) {
		let { scaleX: a, scaleY: o } = e;
		if ((r || t) && (a < 0 && (a = -a), o < 0 && (o = -o)), t) if (!0 === t) a = o = n ? 1 : 1 / a;
		else {
			let e;
			F(t) ? e = t : t === "zoom-in" && (e = 1), e && (a = o = a > e || o > e ? n ? 1 : 1 / a : n ? 1 : 1 / e);
		}
		return mr.scaleX = a, mr.scaleY = o, mr;
	},
	assignScale(e, t) {
		F(t) ? e.scaleX = e.scaleY = t : (e.scaleX = t.x, e.scaleY = t.y);
	},
	getFloorScale: (e, t = 1) => dr(fr(e), t) / e,
	randInt: gr,
	randColor: (e) => `rgba(${gr(255)},${gr(255)},${gr(255)},${e || 1})`
};
function gr(e) {
	return Math.round(Math.random() * e);
}
var L = pr / 180, _r = 2 * pr, vr = pr / 2;
function yr() {
	return {
		x: 0,
		y: 0
	};
}
function br() {
	return {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
}
function xr() {
	return {
		a: 1,
		b: 0,
		c: 0,
		d: 1,
		e: 0,
		f: 0
	};
}
var { sin: Sr, cos: Cr, acos: wr, sqrt: Tr } = Math, { float: Er } = hr, Dr = {};
function Or() {
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
var R = {
	defaultMatrix: {
		a: 1,
		b: 0,
		c: 0,
		d: 1,
		e: 0,
		f: 0
	},
	defaultWorld: Or(),
	tempMatrix: {},
	set(e, t = 1, n = 0, r = 0, i = 1, a = 0, o = 0) {
		e.a = t, e.b = n, e.c = r, e.d = i, e.e = a, e.f = o;
	},
	get: xr,
	getWorld: Or,
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
		kr.toInnerPoint(e, t, Dr), kr.scaleOfInner(e, Dr, n, r);
	},
	scaleOfInner(e, t, n, r = n) {
		kr.translateInner(e, t.x, t.y), kr.scale(e, n, r), kr.translateInner(e, -t.x, -t.y);
	},
	rotate(e, t) {
		let { a: n, b: r, c: i, d: a } = e, o = Cr(t *= L), s = Sr(t);
		e.a = n * o - r * s, e.b = n * s + r * o, e.c = i * o - a * s, e.d = i * s + a * o;
	},
	rotateOfOuter(e, t, n) {
		kr.toInnerPoint(e, t, Dr), kr.rotateOfInner(e, Dr, n);
	},
	rotateOfInner(e, t, n) {
		kr.translateInner(e, t.x, t.y), kr.rotate(e, n), kr.translateInner(e, -t.x, -t.y);
	},
	skew(e, t, n) {
		let { a: r, b: i, c: a, d: o } = e;
		n && (n *= L, e.a = r + a * n, e.b = i + o * n), t && (t *= L, e.c = a + r * t, e.d = o + i * t);
	},
	skewOfOuter(e, t, n, r) {
		kr.toInnerPoint(e, t, Dr), kr.skewOfInner(e, Dr, n, r);
	},
	skewOfInner(e, t, n, r = 0) {
		kr.translateInner(e, t.x, t.y), kr.skew(e, n, r), kr.translateInner(e, -t.x, -t.y);
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
		kr.multiply(e, kr.tempInvert(t));
	},
	divideParent(e, t) {
		kr.multiplyParent(e, kr.tempInvert(t));
	},
	tempInvert(e) {
		let { tempMatrix: t } = kr;
		return kr.copy(t, e), kr.invert(t), t;
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
			let { rotation: n, skewX: r, skewY: i } = t, a = n * L, o = Cr(a), l = Sr(a);
			if (r || i) {
				let t = r * L, n = i * L;
				e.a = (o + n * -l) * s, e.b = (l + n * o) * s, e.c = (t * o - l) * c, e.d = (o + t * l) * c;
			} else e.a = o * s, e.b = l * s, e.c = -l * c, e.d = o * c;
		} else e.a = s, e.b = 0, e.c = 0, e.d = c;
		e.e = a, e.f = o, (n ||= r) && kr.translateInner(e, -n.x, -n.y, !r);
	},
	getLayout(e, t, n, r) {
		let { a: i, b: a, c: o, d: s, e: c, f: l } = e, u, d, f, p, m, h = c, g = l;
		if (a || o) {
			let e = i * s - a * o;
			if (o && !r) {
				u = Tr(i * i + a * a), d = e / u;
				let t = i / u;
				f = a > 0 ? wr(t) : -wr(t);
			} else {
				d = Tr(o * o + s * s), u = e / d;
				let t = o / d;
				f = vr - (s > 0 ? wr(-t) : -wr(t));
			}
			let t = Er(Cr(f)), n = Sr(f);
			u = Er(u), d = Er(d), p = t ? Er((o / d + n) / t / L, 9) : 0, m = t ? Er((a / u - n) / t / L, 9) : 0, f = Er(f / L);
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
			i || a ? n = (r * o - i * a) / (t = Tr(r * r + i * i)) : (t = r, n = o);
		}
		return r.scaleX = t, r.scaleY = n, r;
	},
	reset(e) {
		kr.set(e);
	}
}, kr = R, { float: Ar } = hr, { toInnerPoint: jr, toOuterPoint: Mr } = R, { sin: Nr, cos: Pr, abs: Fr, sqrt: Ir, atan2: Lr, min: Rr, round: zr } = Math, z = {
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
		e.x = t ? zr(e.x - .5) + .5 : zr(e.x), e.y = t ? zr(e.y - .5) + .5 : zr(e.y);
	},
	move(e, t, n) {
		I(t) ? (e.x += t.x, e.y += t.y) : (e.x += t, e.y += n);
	},
	scale(e, t, n = t) {
		e.x && (e.x *= t), e.y && (e.y *= n);
	},
	scaleOf(e, t, n, r = n) {
		e.x += (e.x - t.x) * (n - 1), e.y += (e.y - t.y) * (r - 1);
	},
	rotate(e, t, n, r = 1, i = 1) {
		n ||= Br.defaultPoint;
		let a = Pr(t *= L), o = Nr(t), s = (e.x - n.x) / r, c = (e.y - n.y) / i;
		e.x = n.x + (s * a - c * o) * r, e.y = n.y + (s * o + c * a) * i;
	},
	tempToInnerOf(e, t) {
		let { tempPoint: n } = Br;
		return Hr(n, e), jr(t, n, n), n;
	},
	tempToOuterOf(e, t) {
		let { tempPoint: n } = Br;
		return Hr(n, e), Mr(t, n, n), n;
	},
	tempToInnerRadiusPointOf(e, t) {
		let { tempRadiusPoint: n } = Br;
		return Hr(n, e), Br.toInnerRadiusPointOf(e, t, n), n;
	},
	copyRadiusPoint: (e, t, n, r) => (Hr(e, t), Ur(e, n, r), e),
	toInnerRadiusPointOf(e, t, n) {
		n ||= e, jr(t, e, n), n.radiusX = Math.abs(e.radiusX / t.scaleX), n.radiusY = Math.abs(e.radiusY / t.scaleY);
	},
	toInnerOf(e, t, n) {
		jr(t, e, n);
	},
	toOuterOf(e, t, n) {
		Mr(t, e, n);
	},
	toVertical(e, t, n, r) {
		let i = t * L;
		e.x += -Math.sin(i) * n, e.y += Math.cos(i) * n;
	},
	getCenter: (e, t) => ({
		x: e.x + (t.x - e.x) / 2,
		y: e.y + (t.y - e.y) / 2
	}),
	getCenterX: (e, t) => e + (t - e) / 2,
	getCenterY: (e, t) => e + (t - e) / 2,
	getDistance: (e, t) => Vr(e.x, e.y, t.x, t.y),
	getDistanceFrom(e, t, n, r) {
		let i = Fr(n - e), a = Fr(r - t);
		return Ir(i * i + a * a);
	},
	getMinDistanceFrom: (e, t, n, r, i, a) => Rr(Vr(e, t, n, r), Vr(n, r, i, a)),
	getAngle: (e, t, n, r) => Wr(e, t, n, r) / L,
	getRotation: (e, t, n, r) => (r ||= t, Br.getRadianFrom(e.x, e.y, t.x, t.y, n.x, n.y, r.x, r.y) / L),
	getRadianFrom(e, t, n, r, i, a, o, s) {
		P(o) && (o = n, s = r);
		let c = e - n, l = t - r, u = i - o, d = a - s;
		return Math.atan2(c * d - l * u, c * u + l * d);
	},
	getAtan2: (e, t, n = 1, r = 1) => Lr((t.y - e.y) / r, (t.x - e.x) / n),
	getDistancePoint(e, t, n, r, i) {
		let a = Wr(e, t);
		return i && (e = t), r || (t = {}), t.x = e.x + Pr(a) * n, t.y = e.y + Nr(a) * n, t;
	},
	toNumberPoints(e) {
		let t = e;
		return I(e[0]) && (t = [], e.forEach((e) => t.push(e.x, e.y))), t;
	},
	isSame: (e, t, n) => n ? e.x === t.x && e.y === t.y : Ar(e.x) === Ar(t.x) && Ar(e.y) === Ar(t.y),
	reset(e) {
		e.x = e.y = 0;
	}
}, Br = z, { getDistanceFrom: Vr, copy: Hr, setRadius: Ur, getAtan2: Wr } = Br, Gr = class e {
	constructor(e, t) {
		this.set(e, t);
	}
	set(e, t) {
		return I(e) ? z.copy(this, e) : z.set(this, e, t), this;
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
		return z.move(this, e, t), this;
	}
	scale(e, t) {
		return z.scale(this, e, t), this;
	}
	scaleOf(e, t, n) {
		return z.scaleOf(this, e, t, n), this;
	}
	rotate(e, t, n, r) {
		return z.rotate(this, e, t, n, r), this;
	}
	rotateOf(e, t, n, r) {
		return z.rotate(this, t, e, n, r), this;
	}
	getRotation(e, t, n) {
		return z.getRotation(this, e, t, n);
	}
	toInnerOf(e, t) {
		return z.toInnerOf(this, e, t), this;
	}
	toOuterOf(e, t) {
		return z.toOuterOf(this, e, t), this;
	}
	getCenter(t) {
		return new e(z.getCenter(this, t));
	}
	getDistance(e) {
		return z.getDistance(this, e);
	}
	getDistancePoint(t, n, r, i) {
		return new e(z.getDistancePoint(this, t, n, r, i));
	}
	getAngle(e, t, n) {
		return z.getAngle(this, e, t, n);
	}
	getAtan2(e, t, n) {
		return z.getAtan2(this, e, t, n);
	}
	isSame(e, t) {
		return z.isSame(this, e, t);
	}
	reset() {
		return z.reset(this), this;
	}
};
new Gr();
var Kr = class e {
	constructor(e, t, n, r, i, a) {
		this.set(e, t, n, r, i, a);
	}
	set(e, t, n, r, i, a) {
		return I(e) ? R.copy(this, e) : R.set(this, e, t, n, r, i, a), this;
	}
	setWith(e) {
		return R.copy(this, e), this.scaleX = e.scaleX, this.scaleY = e.scaleY, this;
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
		return R.translate(this, e, t), this;
	}
	translateInner(e, t) {
		return R.translateInner(this, e, t), this;
	}
	scale(e, t) {
		return R.scale(this, e, t), this;
	}
	scaleWith(e, t) {
		return R.scale(this, e, t), this.scaleX *= e, this.scaleY *= t || e, this;
	}
	pixelScale(e) {
		return R.pixelScale(this, e), this;
	}
	scaleOfOuter(e, t, n) {
		return R.scaleOfOuter(this, e, t, n), this;
	}
	scaleOfInner(e, t, n) {
		return R.scaleOfInner(this, e, t, n), this;
	}
	rotate(e) {
		return R.rotate(this, e), this;
	}
	rotateOfOuter(e, t) {
		return R.rotateOfOuter(this, e, t), this;
	}
	rotateOfInner(e, t) {
		return R.rotateOfInner(this, e, t), this;
	}
	skew(e, t) {
		return R.skew(this, e, t), this;
	}
	skewOfOuter(e, t, n) {
		return R.skewOfOuter(this, e, t, n), this;
	}
	skewOfInner(e, t, n) {
		return R.skewOfInner(this, e, t, n), this;
	}
	multiply(e) {
		return R.multiply(this, e), this;
	}
	multiplyParent(e) {
		return R.multiplyParent(this, e), this;
	}
	divide(e) {
		return R.divide(this, e), this;
	}
	divideParent(e) {
		return R.divideParent(this, e), this;
	}
	invert() {
		return R.invert(this), this;
	}
	invertWith() {
		return R.invert(this), this.scaleX = 1 / this.scaleX, this.scaleY = 1 / this.scaleY, this;
	}
	toOuterPoint(e, t, n) {
		R.toOuterPoint(this, e, t, n);
	}
	toInnerPoint(e, t, n) {
		R.toInnerPoint(this, e, t, n);
	}
	setLayout(e, t, n) {
		return R.setLayout(this, e, t, n), this;
	}
	getLayout(e, t, n) {
		return R.getLayout(this, e, t, n);
	}
	withScale(e, t) {
		return R.withScale(this, e, t);
	}
	reset() {
		return R.reset(this), this;
	}
};
new Kr();
var qr = {
	tempPointBounds: {},
	setPoint(e, t, n) {
		e.minX = e.maxX = t, e.minY = e.maxY = n;
	},
	addPoint(e, t, n) {
		e.minX = t < e.minX ? t : e.minX, e.minY = n < e.minY ? n : e.minY, e.maxX = t > e.maxX ? t : e.maxX, e.maxY = n > e.maxY ? n : e.maxY;
	},
	addBounds(e, t, n, r, i) {
		Jr(e, t, n), Jr(e, t + r, n + i);
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
}, { addPoint: Jr } = qr, Yr, Xr;
(function(e) {
	e[e.top = 0] = "top", e[e.right = 1] = "right", e[e.bottom = 2] = "bottom", e[e.left = 3] = "left";
})(Yr ||= {}), function(e) {
	e[e.topLeft = 0] = "topLeft", e[e.top = 1] = "top", e[e.topRight = 2] = "topRight", e[e.right = 3] = "right", e[e.bottomRight = 4] = "bottomRight", e[e.bottom = 5] = "bottom", e[e.bottomLeft = 6] = "bottomLeft", e[e.left = 7] = "left", e[e.center = 8] = "center", e[e["top-left"] = 0] = "top-left", e[e["top-right"] = 2] = "top-right", e[e["bottom-right"] = 4] = "bottom-right", e[e["bottom-left"] = 6] = "bottom-left";
}(Xr ||= {});
var Zr = [
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
Zr.forEach((e) => e.type = "percent");
var Qr = {
	directionData: Zr,
	tempPoint: {},
	get: $r,
	toPoint(e, t, n, r, i, a) {
		let o = $r(e);
		n.x = o.x, n.y = o.y, o.type === "percent" && (n.x *= t.width, n.y *= t.height, i && (a || (n.x -= i.x, n.y -= i.y), o.x && (n.x -= o.x === 1 ? i.width : o.x === .5 ? o.x * i.width : 0), o.y && (n.y -= o.y === 1 ? i.height : o.y === .5 ? o.y * i.height : 0))), r || (n.x += t.x, n.y += t.y);
	},
	getPoint: (e, t, n, r = !0) => (n ||= {}, Qr.toPoint(e, t, n, r), n)
};
function $r(e) {
	return Un(e) ? Zr[Xr[e]] : e;
}
var { toPoint: ei } = Qr, ti = { toPoint(e, t, n, r, i, a) {
	ei(e, n, r, i, t, a);
} }, { tempPointBounds: ni, setPoint: ri, addPoint: ii, toBounds: ai } = qr, { toOuterPoint: oi } = R, { float: si, fourNumber: ci } = hr, { floor: li, ceil: ui } = Math, di, fi, pi, mi, hi = {}, gi = {}, _i = {}, B = {
	tempBounds: _i,
	set(e, t = 0, n = 0, r = 0, i = 0) {
		e.x = t, e.y = n, e.width = r, e.height = i;
	},
	copy(e, t) {
		e.x = t.x, e.y = t.y, e.width = t.width, e.height = t.height;
	},
	copyAndSpread(e, t, n, r, i) {
		let { x: a, y: o, width: s, height: c } = t;
		if (Gn(n)) {
			let t = ci(n);
			r ? vi.set(e, a + t[3], o + t[0], s - t[1] - t[3], c - t[2] - t[0]) : vi.set(e, a - t[3], o - t[0], s + t[1] + t[3], c + t[2] + t[0]);
		} else r && (n = -n), vi.set(e, a - n, o - n, s + 2 * n, c + 2 * n);
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
	getByMove: (e, t, n) => (e = Object.assign({}, e), vi.move(e, t, n), e),
	toOffsetOutBounds(e, t, n) {
		t ? bi(t, e) : t = e, n ||= e, t.offsetX = vi.maxX(n), t.offsetY = vi.maxY(n), vi.move(t, -t.offsetX, -t.offsetY);
	},
	scale(e, t, n = t, r) {
		r || z.scale(e, t, n), e.width *= t, e.height *= n;
	},
	scaleOf(e, t, n, r = n) {
		z.scaleOf(e, t, n, r), e.width *= n, e.height *= r;
	},
	tempToOuterOf: (e, t) => (vi.copy(_i, e), vi.toOuterOf(_i, t), _i),
	getOuterOf: (e, t) => (e = Object.assign({}, e), vi.toOuterOf(e, t), e),
	toOuterOf(e, t, n) {
		if (n ||= e, t.b === 0 && t.c === 0) {
			let { a: r, d: i, e: a, f: o } = t;
			r > 0 ? (n.width = e.width * r, n.x = a + e.x * r) : (n.width = e.width * -r, n.x = a + e.x * r - n.width), i > 0 ? (n.height = e.height * i, n.y = o + e.y * i) : (n.height = e.height * -i, n.y = o + e.y * i - n.height);
		} else hi.x = e.x, hi.y = e.y, oi(t, hi, gi), ri(ni, gi.x, gi.y), hi.x = e.x + e.width, oi(t, hi, gi), ii(ni, gi.x, gi.y), hi.y = e.y + e.height, oi(t, hi, gi), ii(ni, gi.x, gi.y), hi.x = e.x, oi(t, hi, gi), ii(ni, gi.x, gi.y), ai(ni, n);
	},
	toInnerOf(e, t, n) {
		n ||= e, vi.move(n, -t.e, -t.f), vi.scale(n, 1 / t.a, 1 / t.d);
	},
	getFitMatrix(e, t, n = 1) {
		let r = Math.min(n, vi.getFitScale(e, t));
		return new Kr(r, 0, 0, r, -t.x * r, -t.y * r);
	},
	getFitScale(e, t, n) {
		let r = e.width / t.width, i = e.height / t.height;
		return n ? Math.max(r, i) : Math.min(r, i);
	},
	put(e, t, n = "center", r = 1, i = !0, a) {
		a ||= t, Un(r) && (r = vi.getFitScale(e, t, r === "cover")), _i.width = i ? t.width *= r : t.width * r, _i.height = i ? t.height *= r : t.height * r, ti.toPoint(n, _i, e, a, !0, !0);
	},
	getSpread(e, t, n) {
		let r = {};
		return vi.copyAndSpread(r, e, t, !1, n), r;
	},
	spread(e, t, n) {
		vi.copyAndSpread(e, e, t, !1, n);
	},
	shrink(e, t, n) {
		vi.copyAndSpread(e, e, t, !0, n);
	},
	ceil(e) {
		let { x: t, y: n } = e;
		e.x = li(e.x), e.y = li(e.y), e.width = t > e.x ? ui(e.width + t - e.x) : ui(e.width), e.height = n > e.y ? ui(e.height + n - e.y) : ui(e.height);
	},
	unsign(e) {
		e.width < 0 && (e.x += e.width, e.width = -e.width), e.height < 0 && (e.y += e.height, e.height = -e.height);
	},
	float(e, t) {
		e.x = si(e.x, t), e.y = si(e.y, t), e.width = si(e.width, t), e.height = si(e.height, t);
	},
	add(e, t, n) {
		di = e.x + e.width, fi = e.y + e.height, pi = t.x, mi = t.y, n || (pi += t.width, mi += t.height), di = di > pi ? di : pi, fi = fi > mi ? fi : mi, e.x = e.x < t.x ? e.x : t.x, e.y = e.y < t.y ? e.y : t.y, e.width = di - e.x, e.height = fi - e.y;
	},
	addList(e, t) {
		vi.setListWithFn(e, t, void 0, !0);
	},
	setList(e, t, n = !1) {
		vi.setListWithFn(e, t, void 0, n);
	},
	addListWithFn(e, t, n) {
		vi.setListWithFn(e, t, n, !0);
	},
	setListWithFn(e, t, n, r = !1) {
		let i, a = !0;
		for (let o = 0, s = t.length; o < s; o++) i = n ? n(t[o], o) : t[o], i && (i.width || i.height) && (a ? (a = !1, r || bi(e, i)) : yi(e, i));
		a && vi.reset(e);
	},
	setPoints(e, t) {
		t.forEach((e, t) => t === 0 ? ri(ni, e.x, e.y) : ii(ni, e.x, e.y)), ai(ni, e);
	},
	setPoint(e, t) {
		vi.set(e, t.x, t.y);
	},
	addPoint(e, t) {
		yi(e, t, !0);
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
	getPoint: (e, t, n = !1, r) => Qr.getPoint(t, e, r, n),
	hitRadiusPoint: (e, t, n) => (n && (t = z.tempToInnerRadiusPointOf(t, n)), t.x >= e.x - t.radiusX && t.x <= e.x + e.width + t.radiusX && t.y >= e.y - t.radiusY && t.y <= e.y + e.height + t.radiusY),
	hitPoint: (e, t, n) => (n && (t = z.tempToInnerOf(t, n)), t.x >= e.x && t.x <= e.x + e.width && t.y >= e.y && t.y <= e.y + e.height),
	hit: (e, t, n) => (n && (t = vi.tempToOuterOf(t, n)), !(e.y + e.height < t.y || t.y + t.height < e.y || e.x + e.width < t.x || t.x + t.width < e.x)),
	includes: (e, t, n) => (n && (t = vi.tempToOuterOf(t, n)), e.x <= t.x && e.y <= t.y && e.x + e.width >= t.x + t.width && e.y + e.height >= t.y + t.height),
	getIntersectData(e, t, n) {
		if (n && (t = vi.tempToOuterOf(t, n)), !vi.hit(e, t)) return {
			x: 0,
			y: 0,
			width: 0,
			height: 0
		};
		let { x: r, y: i, width: a, height: o } = t;
		return di = r + a, fi = i + o, pi = e.x + e.width, mi = e.y + e.height, r = r > e.x ? r : e.x, i = i > e.y ? i : e.y, di = di < pi ? di : pi, fi = fi < mi ? fi : mi, a = di - r, o = fi - i, {
			x: r,
			y: i,
			width: a,
			height: o
		};
	},
	intersect(e, t, n) {
		vi.copy(e, vi.getIntersectData(e, t, n));
	},
	isSame: (e, t) => e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height,
	isEmpty: (e) => e.x === 0 && e.y === 0 && e.width === 0 && e.height === 0,
	hasSize: (e) => e.width && e.height,
	reset(e) {
		vi.set(e);
	}
}, vi = B, { add: yi, copy: bi } = vi, xi = class e {
	get minX() {
		return B.minX(this);
	}
	get minY() {
		return B.minY(this);
	}
	get maxX() {
		return B.maxX(this);
	}
	get maxY() {
		return B.maxY(this);
	}
	constructor(e, t, n, r) {
		this.set(e, t, n, r);
	}
	set(e, t, n, r) {
		return I(e) ? B.copy(this, e) : B.set(this, e, t, n, r), this;
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
		return B.move(this, e, t), this;
	}
	scale(e, t, n) {
		return B.scale(this, e, t, n), this;
	}
	scaleOf(e, t, n) {
		return B.scaleOf(this, e, t, n), this;
	}
	toOuterOf(e, t) {
		return B.toOuterOf(this, e, t), this;
	}
	toInnerOf(e, t) {
		return B.toInnerOf(this, e, t), this;
	}
	getFitMatrix(e, t) {
		return B.getFitMatrix(this, e, t);
	}
	put(e, t, n) {
		B.put(this, e, t, n);
	}
	spread(e, t) {
		return B.spread(this, e, t), this;
	}
	shrink(e, t) {
		return B.shrink(this, e, t), this;
	}
	ceil() {
		return B.ceil(this), this;
	}
	unsign() {
		return B.unsign(this), this;
	}
	float(e) {
		return B.float(this, e), this;
	}
	add(e) {
		return B.add(this, e), this;
	}
	addList(e) {
		return B.setList(this, e, !0), this;
	}
	setList(e) {
		return B.setList(this, e), this;
	}
	addListWithFn(e, t) {
		return B.setListWithFn(this, e, t, !0), this;
	}
	setListWithFn(e, t) {
		return B.setListWithFn(this, e, t), this;
	}
	setPoint(e) {
		return B.setPoint(this, e), this;
	}
	setPoints(e) {
		return B.setPoints(this, e), this;
	}
	addPoint(e) {
		return B.addPoint(this, e), this;
	}
	getPoints() {
		return B.getPoints(this);
	}
	getPoint(e, t, n) {
		return B.getPoint(this, e, t, n);
	}
	hitPoint(e, t) {
		return B.hitPoint(this, e, t);
	}
	hitRadiusPoint(e, t) {
		return B.hitRadiusPoint(this, e, t);
	}
	hit(e, t) {
		return B.hit(this, e, t);
	}
	includes(e, t) {
		return B.includes(this, e, t);
	}
	intersect(e, t) {
		return B.intersect(this, e, t), this;
	}
	getIntersect(t, n) {
		return new e(B.getIntersectData(this, t, n));
	}
	isSame(e) {
		return B.isSame(this, e);
	}
	isEmpty() {
		return B.isEmpty(this);
	}
	reset() {
		B.reset(this);
	}
}, Si = new xi(), Ci = class {
	constructor(e, t, n, r, i, a) {
		I(e) ? this.copy(e) : this.set(e, t, n, r, i, a);
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
		return new xi(i, t, a || e.width - i - n, o || e.height - t - r);
	}
}, wi = { number: (e, t) => I(e) ? e.type === "percent" ? e.value * t : e.value : e }, Ti = {
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
}, { floor: Ei, max: Di } = Math, V = {
	toURL(e, t) {
		let n = encodeURIComponent(e);
		return t === "text" ? n = "data:text/plain;charset=utf-8," + n : t === "svg" && (n = "data:image/svg+xml," + n), n;
	},
	image: {
		hitCanvasSize: 100,
		maxCacheSize: 4096e3,
		maxPatternSize: 8847360,
		crossOrigin: "anonymous",
		isLarge: (e, t, n, r) => e.width * e.height * (t ? t * n : 1) > (r || Oi.maxCacheSize),
		isSuperLarge: (e, t, n) => Oi.isLarge(e, t, n, Oi.maxPatternSize),
		getRealURL(e) {
			let { prefix: t, suffix: n } = Oi;
			return !n || e.startsWith("data:") || e.startsWith("blob:") || (e += (e.includes("?") ? "&" : "?") + n), t && e[0] === "/" && (e = t + e), e;
		},
		resize(e, t, n, r, i, a, o, s, c, l) {
			let u = Di(Ei(t + (r || 0)), 1), d = Di(Ei(n + (i || 0)), 1), f, p, m;
			l && (m = wi.number(l.offset, l.type === "x" ? t : n)) && (l.type === "x" ? f = !0 : p = !0);
			let h = V.origin.createCanvas(p ? 2 * u : u, f ? 2 * d : d), g = h.getContext("2d");
			if (s && (g.globalAlpha = s), g.imageSmoothingEnabled = !1 !== o, Oi.canUse(e)) {
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
			n && Jn.stintSet(n, "transform", t);
		}
	}
}, { image: Oi } = V, { randColor: ki } = hr, Ai = class e {
	constructor(e) {
		this.repeatMap = {}, this.name = e;
	}
	static get(t) {
		return new e(t);
	}
	static set filter(e) {
		this.filterList = ji(e);
	}
	static set exclude(e) {
		this.excludeList = ji(e);
	}
	static drawRepaint(e, t) {
		let n = ki();
		e.fillWorld(t, n.replace("1)", ".1)")), e.strokeWorld(t, n);
	}
	static drawBounds(t, n, r) {
		let i = e.showBounds === "hit", a = t.__nowWorld, o = ki();
		i && (n.setWorld(a), t.__drawHitPath(n), n.fillStyle = o.replace("1)", ".2)"), n.fill()), n.resetTransform(), n.setStroke(o, 2), i ? n.stroke() : n.strokeWorld(a, o);
	}
	log(...e) {
		if (Mi.enable) {
			if (Mi.filterList.length && Mi.filterList.every((e) => e !== this.name) || Mi.excludeList.length && Mi.excludeList.some((e) => e === this.name)) return;
			console.log("%c" + this.name, "color:#21ae62", ...e);
		}
	}
	tip(...e) {
		Mi.enable && this.warn(...e);
	}
	warn(...e) {
		Mi.showWarn && console.warn(this.name, ...e);
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
function ji(e) {
	return e ? Un(e) && (e = [e]) : e = [], e;
}
Ai.filterList = [], Ai.excludeList = [], Ai.showWarn = !0;
var Mi = Ai, Ni = Ai.get("RunTime"), Pi = {
	currentId: 0,
	currentName: "",
	idMap: {},
	nameMap: {},
	nameToIdMap: {},
	start(e, t) {
		let n = Zn.create(Zn.RUNTIME);
		return Fi.currentId = Fi.idMap[n] = t ? performance.now() : Date.now(), Fi.currentName = Fi.nameMap[n] = e, Fi.nameToIdMap[e] = n, n;
	},
	end(e, t) {
		let n = Fi.idMap[e], r = Fi.nameMap[e], i = t ? (performance.now() - n) / 1e3 : Date.now() - n;
		Fi.idMap[e] = Fi.nameMap[e] = Fi.nameToIdMap[r] = void 0, Ni.log(r, i, "ms");
	},
	endOfName(e, t) {
		let n = Fi.nameToIdMap[e];
		P(n) || Fi.end(n, t);
	}
}, Fi = Pi, Ii = [], Li = {
	list: {},
	add(e, ...t) {
		this.list[e] = !0, Ii.push(...t);
	},
	has(e, t) {
		let n = this.list[e];
		return !n && t && this.need(e), n;
	},
	need(e) {
		console.error("please install and import plugin: " + (e.includes("-x") ? "" : "@leafer-in/") + e);
	}
};
setTimeout(() => Ii.forEach((e) => Li.has(e, !0)));
var Ri = { editor: (e) => Li.need("editor") }, zi = Ai.get("UICreator"), Bi = {
	list: {},
	register(e) {
		let { __tag: t } = e.prototype;
		Vi[t] && zi.repeat(t), Vi[t] = e;
	},
	get(e, t, n, r, i, a) {
		if (!Vi[e]) return void zi.warn("not register " + e);
		let o = new Vi[e](t);
		return P(n) || (o.x = n, r && (o.y = r), i && (o.width = i), a && (o.height = a)), o;
	}
}, { list: Vi } = Bi, Hi = Ai.get("EventCreator"), Ui = {
	nameList: {},
	register(e) {
		let t;
		Object.keys(e).forEach((n) => {
			t = e[n], Un(t) && (Wi[t] && Hi.repeat(t), Wi[t] = e);
		});
	},
	changeName(e, t) {
		let n = Wi[e];
		if (n) {
			let r = Object.keys(n).find((t) => n[t] === e);
			r && (n[r] = t, Wi[t] = n);
		}
	},
	has(e) {
		return !!this.nameList[e];
	},
	get: (e, ...t) => new Wi[e](...t)
}, { nameList: Wi } = Ui, Gi = class {
	constructor() {
		this.list = [];
	}
	add(e) {
		e.manager = this, this.list.push(e);
	}
	get(e) {
		let t, { list: n } = this;
		for (let r = 0, i = n.length; r < i; r++) if (t = n[r], t.recycled && t.isSameSize(e)) return t.recycled = !1, t.manager || (t.manager = this), t;
		let r = Ri.canvas(e);
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
function Ki(e, t, n, r) {
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
function qi(e) {
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
var Ji = [];
function U() {
	return (e, t) => {
		Ji.push(t);
	};
}
var Yi = [], W = class {
	set blendMode(e) {
		e === "normal" && (e = "source-over"), this.context.globalCompositeOperation = e;
	}
	get blendMode() {
		return this.context.globalCompositeOperation;
	}
	set dashPattern(e) {
		this.context.setLineDash(e || Yi);
	}
	get dashPattern() {
		return this.context.getLineDash();
	}
	__bindContext() {
		let e;
		Ji.forEach((t) => {
			e = this.context[t], e && (this[t] = e.bind(this.context));
		}), this.textBaseline = "alphabetic";
	}
	setTransform(e, t, n, r, i, a) {}
	resetTransform() {}
	getTransform() {}
	save() {}
	restore() {}
	transform(e, t, n, r, i, a) {
		I(e) ? this.context.transform(e.a, e.b, e.c, e.d, e.e, e.f) : this.context.transform(e, t, n, r, i, a);
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
H([qi("imageSmoothingEnabled")], W.prototype, "smooth", void 0), H([qi("imageSmoothingQuality")], W.prototype, "smoothLevel", void 0), H([qi("globalAlpha")], W.prototype, "opacity", void 0), H([qi()], W.prototype, "fillStyle", void 0), H([qi()], W.prototype, "strokeStyle", void 0), H([qi("lineWidth")], W.prototype, "strokeWidth", void 0), H([qi("lineCap")], W.prototype, "strokeCap", void 0), H([qi("lineJoin")], W.prototype, "strokeJoin", void 0), H([qi("lineDashOffset")], W.prototype, "dashOffset", void 0), H([qi()], W.prototype, "miterLimit", void 0), H([qi()], W.prototype, "shadowBlur", void 0), H([qi()], W.prototype, "shadowColor", void 0), H([qi()], W.prototype, "shadowOffsetX", void 0), H([qi()], W.prototype, "shadowOffsetY", void 0), H([qi()], W.prototype, "filter", void 0), H([qi()], W.prototype, "font", void 0), H([qi()], W.prototype, "fontKerning", void 0), H([qi()], W.prototype, "fontStretch", void 0), H([qi()], W.prototype, "fontVariantCaps", void 0), H([qi()], W.prototype, "textAlign", void 0), H([qi()], W.prototype, "textBaseline", void 0), H([qi()], W.prototype, "textRendering", void 0), H([qi()], W.prototype, "wordSpacing", void 0), H([qi()], W.prototype, "letterSpacing", void 0), H([qi()], W.prototype, "direction", void 0), H([U()], W.prototype, "setTransform", null), H([U()], W.prototype, "resetTransform", null), H([U()], W.prototype, "getTransform", null), H([U()], W.prototype, "save", null), H([U()], W.prototype, "restore", null), H([U()], W.prototype, "translate", null), H([U()], W.prototype, "scale", null), H([U()], W.prototype, "rotate", null), H([U()], W.prototype, "fill", null), H([U()], W.prototype, "stroke", null), H([U()], W.prototype, "clip", null), H([U()], W.prototype, "fillRect", null), H([U()], W.prototype, "strokeRect", null), H([U()], W.prototype, "clearRect", null), H([U()], W.prototype, "beginPath", null), H([U()], W.prototype, "moveTo", null), H([U()], W.prototype, "lineTo", null), H([U()], W.prototype, "bezierCurveTo", null), H([U()], W.prototype, "quadraticCurveTo", null), H([U()], W.prototype, "closePath", null), H([U()], W.prototype, "arc", null), H([U()], W.prototype, "arcTo", null), H([U()], W.prototype, "ellipse", null), H([U()], W.prototype, "rect", null), H([U()], W.prototype, "roundRect", null), H([U()], W.prototype, "createConicGradient", null), H([U()], W.prototype, "createLinearGradient", null), H([U()], W.prototype, "createPattern", null), H([U()], W.prototype, "createRadialGradient", null), H([U()], W.prototype, "fillText", null), H([U()], W.prototype, "measureText", null), H([U()], W.prototype, "strokeText", null);
var { copy: Xi, multiplyParent: Zi, pixelScale: Qi } = R, { round: $i } = Math, G = new xi(), ea = new xi(), ta = {
	width: 1,
	height: 1,
	pixelRatio: 1
}, na = [
	"width",
	"height",
	"pixelRatio"
], ra = class extends W {
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
		super(), this.size = {}, this.worldTransform = {}, e ||= ta, this.manager = t, this.innerId = Zn.create(Zn.CANVAS);
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
		Jn.copyAttrs(r, e, na), na.forEach((e) => r[e] || (r[e] = 1)), this.bounds = new xi(0, 0, this.width, this.height), this.updateViewSize(), this.updateClientBounds(), this.context && (this.smooth = this.config.smooth, !this.unreal && n && (this.clearWorld(n.bounds), this.copyWorld(n), n.recycle()));
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
		t && Zi(e, t, i), Qi(e, n, i), r && !e.ignorePixelSnap && (e.half && e.half * n % 2 ? (i.e = $i(i.e - .5) + .5, i.f = $i(i.f - .5) + .5) : (i.e = $i(i.e), i.f = $i(i.f))), this.setTransform(i.a, i.b, i.c, i.d, i.e, i.f);
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
		r && (this.blendMode = r), t ? (this.setTempPixelBounds(t, i), n ? (this.setTempPixelBounds2(n, i), n = ea) : n = G, this.drawImage(e.view, G.x, G.y, G.width, G.height, n.x, n.y, n.width, n.height)) : this.drawImage(e.view, 0, 0), r && (this.blendMode = "source-over");
	}
	copyWorldToInner(e, t, n, r, i) {
		t.b || t.c ? (this.save(), this.resetTransform(), this.copyWorld(e, t, B.tempToOuterOf(n, t), r, i), this.restore()) : (r && (this.blendMode = r), this.setTempPixelBounds(t, i), this.drawImage(e.view, G.x, G.y, G.width, G.height, n.x, n.y, n.width, n.height), r && (this.blendMode = "source-over"));
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
		this.copyToPixelBounds(ea, e, t, n);
	}
	copyToPixelBounds(e, t, n, r) {
		e.set(t), r && e.intersect(this.bounds), e.scale(this.pixelRatio), n && e.ceil();
	}
	isSameSize(e) {
		return this.width === e.width && this.height === e.height && (!e.pixelRatio || this.pixelRatio === e.pixelRatio);
	}
	getSameCanvas(e, t) {
		let { size: n, pixelSnap: r } = this, i = this.manager ? this.manager.get(n) : Ri.canvas(Object.assign({}, n));
		return i.save(), e && (Xi(i.worldTransform, this.worldTransform), i.useWorldTransform()), t && (i.smooth = this.smooth), i.pixelSnap !== r && (i.pixelSnap = r), i;
	}
	recycle(e) {
		this.recycled || (this.restore(), e ? this.clearWorld(e) : this.clear(), this.manager ? this.manager.recycle(this) : this.destroy());
	}
	updateRender(e) {}
	unrealCanvas() {}
	destroy() {
		this.manager = this.view = this.parentView = null;
	}
}, ia = {
	creator: {},
	parse(e, t) {},
	convertToCanvasData(e, t) {}
}, aa = {
	N: 21,
	D: 22,
	X: 23,
	G: 24,
	F: 25,
	O: 26,
	P: 27,
	U: 28
}, oa = Object.assign({
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
}, aa), sa = {
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
}, ca = {
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
}, la = Object.assign(Object.assign({}, ca), aa), ua = oa, da = {};
for (let e in ua) da[ua[e]] = e;
var fa = {};
for (let e in ua) fa[ua[e]] = sa[e];
var pa = { drawRoundRect(e, t, n, r, i, a) {
	let o = hr.fourNumber(a, Math.min(r / 2, i / 2)), s = t + r, c = n + i;
	o[0] ? e.moveTo(t + o[0], n) : e.moveTo(t, n), o[1] ? e.arcTo(s, n, s, c, o[1]) : e.lineTo(s, n), o[2] ? e.arcTo(s, c, t, c, o[2]) : e.lineTo(s, c), o[3] ? e.arcTo(t, c, t, n, o[3]) : e.lineTo(t, c), o[0] ? e.arcTo(t, n, s, n, o[0]) : e.lineTo(t, n);
} }, { sin: ma, cos: ha, hypot: ga, atan2: _a, ceil: va, abs: ya, PI: ba, sqrt: xa, pow: Sa } = Math, { setPoint: Ca, addPoint: wa } = qr, { set: Ta, toNumberPoints: Ea } = z, { M: Da, L: Oa, C: ka, Q: Aa, Z: ja } = oa, Ma = {}, Na = {
	points(e, t, n, r) {
		let i = Ea(t);
		if (e.push(Da, i[0], i[1]), n && i.length > 5) {
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
			for (let n = 2; n < y - 2; n += 2) t = i[n - 2], a = i[n - 1], o = i[n], s = i[n + 1], c = i[n + 2], l = i[n + 3], m = o - t, h = s - a, g = xa(Sa(m, 2) + Sa(h, 2)), _ = xa(Sa(c - o, 2) + Sa(l - s, 2)), (g || _) && (v = g + _, g = b * g / v, _ = b * _ / v, c -= t, l -= a, u = o - g * c, d = s - g * l, n === 2 ? r || e.push(Aa, u, d, o, s) : (m || h) && e.push(ka, f, p, u, d, o, s), f = o + _ * c, p = s + _ * l);
			r || e.push(Aa, f, p, i[y - 2], i[y - 1]);
		} else for (let t = 2, n = i.length; t < n; t += 2) e.push(Oa, i[t], i[t + 1]);
		r && e.push(ja);
	},
	rect(e, t, n, r, i) {
		ia.creator.path = e, ia.creator.moveTo(t, n).lineTo(t + r, n).lineTo(t + r, n + i).lineTo(t, n + i).lineTo(t, n);
	},
	roundRect(e, t, n, r, i, a) {
		ia.creator.path = [], pa.drawRoundRect(ia.creator, t, n, r, i, a), e.push(...ia.convertToCanvasData(ia.creator.path, !0));
	},
	arcTo(e, t, n, r, i, a, o, s, c, l, u) {
		let d = r - t, f = i - n, p = a - r, m = o - i, h = _a(f, d), g = _a(m, p), _ = ga(d, f), v = ga(p, m), y = g - h;
		if (y < 0 && (y += _r), _ < 1e-12 || v < 1e-12 || y < 1e-12 || ya(y - ba) < 1e-12) return e && e.push(Oa, r, i), c && (Ca(c, t, n), wa(c, r, i)), u && Ta(u, t, n), void (l && Ta(l, r, i));
		let b = d * m - p * f < 0, x = b ? -1 : 1, S = s / ha(y / 2), C = r + S * ha(h + y / 2 + vr * x), w = i + S * ma(h + y / 2 + vr * x);
		return h -= vr * x, g -= vr * x, Ia(e, C, w, s, s, 0, h / L, g / L, b, c, l, u);
	},
	arc: (e, t, n, r, i, a, o, s, c, l) => Ia(e, t, n, r, r, 0, i, a, o, s, c, l),
	ellipse(e, t, n, r, i, a, o, s, c, l, u, d) {
		let f = a * L, p = ma(f), m = ha(f), h = o * L, g = s * L;
		h > ba && (h -= _r), g < 0 && (g += _r);
		let _ = g - h;
		_ < 0 ? _ += _r : _ > _r && (_ -= _r), c && (_ -= _r);
		let v = va(ya(_ / vr)), y = _ / v, b = ma(y / 4), x = 8 / 3 * b * b / ma(y / 2);
		g = h + y;
		let S, C, w, ee, T, E, te, ne, re = ha(h), ie = ma(h), ae = w = m * r * re - p * i * ie, oe = ee = p * r * re + m * i * ie, se = t + w, ce = n + ee;
		e && e.push(e.length ? Oa : Da, se, ce), l && Ca(l, se, ce), d && Ta(d, se, ce);
		for (let a = 0; a < v; a++) S = ha(g), C = ma(g), w = m * r * S - p * i * C, ee = p * r * S + m * i * C, T = t + ae - x * (m * r * ie + p * i * re), E = n + oe - x * (p * r * ie - m * i * re), te = t + w + x * (m * r * C + p * i * S), ne = n + ee + x * (p * r * C - m * i * S), e && e.push(ka, T, E, te, ne, t + w, n + ee), l && Fa(t + ae, n + oe, T, E, te, ne, t + w, n + ee, l, !0), ae = w, oe = ee, re = S, ie = C, h = g, g += y;
		u && Ta(u, t + w, n + ee);
	},
	quadraticCurveTo(e, t, n, r, i, a, o) {
		e.push(ka, (t + 2 * r) / 3, (n + 2 * i) / 3, (a + 2 * r) / 3, (o + 2 * i) / 3, a, o);
	},
	toTwoPointBoundsByQuadraticCurve(e, t, n, r, i, a, o, s) {
		Fa(e, t, (e + 2 * n) / 3, (t + 2 * r) / 3, (i + 2 * n) / 3, (a + 2 * r) / 3, i, a, o, s);
	},
	toTwoPointBounds(e, t, n, r, i, a, o, s, c, l) {
		let u = [], d, f, p, m, h, g, _, v, y = e, b = n, x = i, S = o;
		for (let e = 0; e < 2; ++e) if (e == 1 && (y = t, b = r, x = a, S = s), d = -3 * y + 9 * b - 9 * x + 3 * S, f = 6 * y - 12 * b + 6 * x, p = 3 * b - 3 * y, Math.abs(d) < 1e-12) {
			if (Math.abs(f) < 1e-12) continue;
			m = -p / f, 0 < m && m < 1 && u.push(m);
		} else _ = f * f - 4 * p * d, v = Math.sqrt(_), _ < 0 || (h = (-f + v) / (2 * d), 0 < h && h < 1 && u.push(h), g = (-f - v) / (2 * d), 0 < g && g < 1 && u.push(g));
		l ? wa(c, e, t) : Ca(c, e, t), wa(c, o, s);
		for (let l = 0, d = u.length; l < d; l++) Pa(u[l], e, t, n, r, i, a, o, s, Ma), wa(c, Ma.x, Ma.y);
	},
	getPointAndSet(e, t, n, r, i, a, o, s, c, l) {
		let u = 1 - e, d = u * u * u, f = 3 * u * u * e, p = 3 * u * e * e, m = e * e * e;
		l.x = d * t + f * r + p * a + m * s, l.y = d * n + f * i + p * o + m * c;
	},
	getPoint(e, t, n, r, i, a, o, s, c) {
		let l = {};
		return Pa(e, t, n, r, i, a, o, s, c, l), l;
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
}, { getPointAndSet: Pa, toTwoPointBounds: Fa, ellipse: Ia } = Na, { sin: La, cos: Ra, sqrt: za, atan2: Ba } = Math, { ellipse: Va } = Na, Ha = { ellipticalArc(e, t, n, r, i, a, o, s, c, l, u) {
	let d = (c - t) / 2, f = (l - n) / 2, p = a * L, m = La(p), h = Ra(p), g = -h * d - m * f, _ = -h * f + m * d, v = r * r, y = i * i, b = _ * _, x = g * g, S = v * y - v * b - y * x, C = 0;
	if (S < 0) {
		let e = za(1 - S / (v * y));
		r *= e, i *= e;
	} else C = (o === s ? -1 : 1) * za(S / (v * b + y * x));
	let w = C * r * _ / i, ee = -C * i * g / r, T = Ba((_ - ee) / i, (g - w) / r), E = Ba((-_ - ee) / i, (-g - w) / r), te = E - T;
	s === 0 && te > 0 ? te -= _r : s === 1 && te < 0 && (te += _r);
	let ne = t + d + h * w - m * ee, re = n + f + m * w + h * ee, ie = +(te < 0);
	u || V.ellipseToCurve ? Va(e, ne, re, r, i, a, T / L, E / L, ie) : r !== i || a ? e.push(oa.G, ne, re, r, i, a, T / L, E / L, ie) : e.push(oa.O, ne, re, r, T / L, E / L, ie);
} }, Ua = {
	toCommand: (e) => [],
	toNode: (e) => []
}, { M: Wa, m: Ga, L: Ka, l: qa, H: Ja, h: Ya, V: Xa, v: Za, C: Qa, c: $a, S: eo, s: to, Q: no, q: ro, T: io, t: ao, A: oo, a: so, Z: co, z: lo, N: uo, D: fo, X: po, G: mo, F: ho, O: go, P: _o, U: vo } = oa, { rect: yo, roundRect: bo, arcTo: xo, arc: So, ellipse: Co, quadraticCurveTo: wo } = Na, { ellipticalArc: To } = Ha, Eo = Ai.get("PathConvert"), Do = {}, Oo = {
	current: { dot: 0 },
	stringify(e, t) {
		let n, r, i, a = 0, o = e.length, s = "";
		for (; a < o;) {
			r = e[a], n = fa[r], s += r === i ? " " : da[r];
			for (let r = 1; r < n; r++) s += hr.float(e[a + r], t), r === n - 1 || (s += " ");
			i = r, a += n;
		}
		return s;
	},
	parse(e, t) {
		let n, r, i, a = "", o = [], s = t ? la : ca;
		for (let t = 0, c = e.length; t < c; t++) r = e[t], Ti[r] ? (r === "." && (ko.dot && (Ao(o, a), a = ""), ko.dot++), a === "0" && r !== "." && (Ao(o, a), a = ""), a += r) : oa[r] ? (a &&= (Ao(o, a), ""), ko.name = oa[r], ko.length = sa[r], ko.index = 0, Ao(o, ko.name), r === "m" ? ko.name = oa.l : r === "M" && (ko.name = oa.L), !n && s[r] && (n = !0)) : r === "-" || r === "+" ? i === "e" || i === "E" ? a += r : (a && Ao(o, a), a = r) : a &&= (Ao(o, a), ""), i = r;
		return a && Ao(o, a), n ? Oo.toCanvasData(o, t) : o;
	},
	toCanvasData(e, t) {
		let n, r, i, a, o, s = 0, c = 0, l = 0, u = 0, d = 0, f = 0, p = 0, m = e.length, h = [];
		for (; p < m;) {
			switch (i = e[p], i) {
				case Ga: e[p + 1] += s, e[p + 2] += c;
				case Wa:
					s = d = e[p + 1], c = f = e[p + 2], h.push(Wa, s, c), p += 3;
					break;
				case Ya: e[p + 1] += s;
				case Ja:
					s = e[p + 1], h.push(Ka, s, c), p += 2;
					break;
				case Za: e[p + 1] += c;
				case Xa:
					c = e[p + 1], h.push(Ka, s, c), p += 2;
					break;
				case qa: e[p + 1] += s, e[p + 2] += c;
				case Ka:
					s = e[p + 1], c = e[p + 2], h.push(Ka, s, c), p += 3;
					break;
				case to: e[p + 1] += s, e[p + 2] += c, e[p + 3] += s, e[p + 4] += c, i = eo;
				case eo:
					o = a === Qa || a === eo, l = o ? 2 * s - n : s, u = o ? 2 * c - r : c, n = e[p + 1], r = e[p + 2], s = e[p + 3], c = e[p + 4], h.push(Qa, l, u, n, r, s, c), p += 5;
					break;
				case $a: e[p + 1] += s, e[p + 2] += c, e[p + 3] += s, e[p + 4] += c, e[p + 5] += s, e[p + 6] += c, i = Qa;
				case Qa:
					n = e[p + 3], r = e[p + 4], s = e[p + 5], c = e[p + 6], h.push(Qa, e[p + 1], e[p + 2], n, r, s, c), p += 7;
					break;
				case ao: e[p + 1] += s, e[p + 2] += c, i = io;
				case io:
					o = a === no || a === io, n = o ? 2 * s - n : s, r = o ? 2 * c - r : c, t ? wo(h, s, c, n, r, e[p + 1], e[p + 2]) : h.push(no, n, r, e[p + 1], e[p + 2]), s = e[p + 1], c = e[p + 2], p += 3;
					break;
				case ro: e[p + 1] += s, e[p + 2] += c, e[p + 3] += s, e[p + 4] += c, i = no;
				case no:
					n = e[p + 1], r = e[p + 2], t ? wo(h, s, c, n, r, e[p + 3], e[p + 4]) : h.push(no, n, r, e[p + 3], e[p + 4]), s = e[p + 3], c = e[p + 4], p += 5;
					break;
				case so: e[p + 6] += s, e[p + 7] += c;
				case oo:
					To(h, s, c, e[p + 1], e[p + 2], e[p + 3], e[p + 4], e[p + 5], e[p + 6], e[p + 7], t), s = e[p + 6], c = e[p + 7], p += 8;
					break;
				case lo:
				case co:
					h.push(co), s = d, c = f, p++;
					break;
				case uo:
					s = e[p + 1], c = e[p + 2], t ? yo(h, s, c, e[p + 3], e[p + 4]) : jo(h, e, p, 5), p += 5;
					break;
				case fo:
					s = e[p + 1], c = e[p + 2], t ? bo(h, s, c, e[p + 3], e[p + 4], [
						e[p + 5],
						e[p + 6],
						e[p + 7],
						e[p + 8]
					]) : jo(h, e, p, 9), p += 9;
					break;
				case po:
					s = e[p + 1], c = e[p + 2], t ? bo(h, s, c, e[p + 3], e[p + 4], e[p + 5]) : jo(h, e, p, 6), p += 6;
					break;
				case mo:
					Co(t ? h : jo(h, e, p, 9), e[p + 1], e[p + 2], e[p + 3], e[p + 4], e[p + 5], e[p + 6], e[p + 7], e[p + 8], null, Do), s = Do.x, c = Do.y, p += 9;
					break;
				case ho:
					t ? Co(h, e[p + 1], e[p + 2], e[p + 3], e[p + 4], 0, 0, 360, !1) : jo(h, e, p, 5), s = e[p + 1] + e[p + 3], c = e[p + 2], p += 5;
					break;
				case go:
					So(t ? h : jo(h, e, p, 7), e[p + 1], e[p + 2], e[p + 3], e[p + 4], e[p + 5], e[p + 6], null, Do), s = Do.x, c = Do.y, p += 7;
					break;
				case _o:
					t ? So(h, e[p + 1], e[p + 2], e[p + 3], 0, 360, !1) : jo(h, e, p, 4), s = e[p + 1] + e[p + 3], c = e[p + 2], p += 4;
					break;
				case vo:
					xo(t ? h : jo(h, e, p, 6), s, c, e[p + 1], e[p + 2], e[p + 3], e[p + 4], e[p + 5], null, Do), s = Do.x, c = Do.y, p += 6;
					break;
				default: return Eo.error(`command: ${i} [index:${p}]`, e), h;
			}
			a = i;
		}
		return h;
	},
	objectToCanvasData(e) {
		if (e[0].name.length > 1) return Ua.toCommand(e);
		{
			let t = [];
			return e.forEach((e) => {
				switch (e.name) {
					case "M":
						t.push(Wa, e.x, e.y);
						break;
					case "L":
						t.push(Ka, e.x, e.y);
						break;
					case "C":
						t.push(Qa, e.x1, e.y1, e.x2, e.y2, e.x, e.y);
						break;
					case "Q":
						t.push(no, e.x1, e.y1, e.x, e.y);
						break;
					case "Z": t.push(co);
				}
			}), t;
		}
	},
	copyData(e, t, n, r) {
		for (let i = n, a = n + r; i < a; i++) e.push(t[i]);
	},
	pushData(e, t) {
		ko.index === ko.length && (ko.index = 1, e.push(ko.name)), e.push(Number(t)), ko.index++, ko.dot = 0;
	}
}, { current: ko, pushData: Ao, copyData: jo } = Oo, { M: Mo, L: No, C: Po, Q: Fo, Z: Io, N: Lo, D: Ro, X: zo, G: Bo, F: Vo, O: Ho, P: Uo, U: Wo } = oa, { getMinDistanceFrom: Go, getRadianFrom: Ko } = z, { tan: qo, min: Jo, abs: Yo } = Math, Xo = {}, Zo = {
	beginPath(e) {
		e.length = 0;
	},
	moveTo(e, t, n) {
		e.push(Mo, t, n);
	},
	lineTo(e, t, n) {
		e.push(No, t, n);
	},
	bezierCurveTo(e, t, n, r, i, a, o) {
		e.push(Po, t, n, r, i, a, o);
	},
	quadraticCurveTo(e, t, n, r, i) {
		e.push(Fo, t, n, r, i);
	},
	closePath(e) {
		e.push(Io);
	},
	rect(e, t, n, r, i) {
		e.push(Lo, t, n, r, i);
	},
	roundRect(e, t, n, r, i, a) {
		if (F(a)) e.push(zo, t, n, r, i, a);
		else {
			let o = hr.fourNumber(a);
			o ? e.push(Ro, t, n, r, i, ...o) : e.push(Lo, t, n, r, i);
		}
	},
	ellipse(e, t, n, r, i, a, o, s, c) {
		if (r === i) return $o(e, t, n, r, o, s, c);
		Hn(a) ? e.push(Vo, t, n, r, i) : (Hn(o) && (o = 0), Hn(s) && (s = 360), e.push(Bo, t, n, r, i, a, o, s, +!!c));
	},
	arc(e, t, n, r, i, a, o) {
		Hn(i) ? e.push(Uo, t, n, r) : (Hn(i) && (i = 0), Hn(a) && (a = 360), e.push(Ho, t, n, r, i, a, +!!o));
	},
	arcTo(e, t, n, r, i, a, o, s, c) {
		if (!P(o)) {
			let e = Go(o, s, t, n, r, i) / (c ? 1 : 2);
			a = Jo(a, Jo(e, e * Yo(qo(Ko(o, s, t, n, r, i) / 2))));
		}
		e.push(Wo, t, n, r, i, a);
	},
	drawEllipse(e, t, n, r, i, a, o, s, c) {
		Na.ellipse(null, t, n, r, i, Hn(a) ? 0 : a, Hn(o) ? 0 : o, Hn(s) ? 360 : s, c, null, null, Xo), e.push(Mo, Xo.x, Xo.y), Qo(e, t, n, r, i, a, o, s, c);
	},
	drawArc(e, t, n, r, i, a, o) {
		Na.arc(null, t, n, r, Hn(i) ? 0 : i, Hn(a) ? 360 : a, o, null, null, Xo), e.push(Mo, Xo.x, Xo.y), $o(e, t, n, r, i, a, o);
	},
	drawPoints(e, t, n, r) {
		Na.points(e, t, n, r);
	}
}, { ellipse: Qo, arc: $o } = Zo, { moveTo: es, lineTo: ts, quadraticCurveTo: ns, bezierCurveTo: rs, closePath: is, beginPath: as, rect: os, roundRect: ss, ellipse: cs, arc: ls, arcTo: us, drawEllipse: ds, drawArc: fs, drawPoints: ps } = Zo, ms = class {
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
		return this.__path = e ? Un(e) ? ia.parse(e) : e : [], this;
	}
	beginPath() {
		return as(this.__path), this.paint(), this;
	}
	moveTo(e, t) {
		return es(this.__path, e, t), this.paint(), this;
	}
	lineTo(e, t) {
		return ts(this.__path, e, t), this.paint(), this;
	}
	bezierCurveTo(e, t, n, r, i, a) {
		return rs(this.__path, e, t, n, r, i, a), this.paint(), this;
	}
	quadraticCurveTo(e, t, n, r) {
		return ns(this.__path, e, t, n, r), this.paint(), this;
	}
	closePath() {
		return is(this.__path), this.paint(), this;
	}
	rect(e, t, n, r) {
		return os(this.__path, e, t, n, r), this.paint(), this;
	}
	roundRect(e, t, n, r, i) {
		return ss(this.__path, e, t, n, r, i), this.paint(), this;
	}
	ellipse(e, t, n, r, i, a, o, s) {
		return cs(this.__path, e, t, n, r, i, a, o, s), this.paint(), this;
	}
	arc(e, t, n, r, i, a) {
		return ls(this.__path, e, t, n, r, i, a), this.paint(), this;
	}
	arcTo(e, t, n, r, i) {
		return us(this.__path, e, t, n, r, i), this.paint(), this;
	}
	drawEllipse(e, t, n, r, i, a, o, s) {
		return ds(this.__path, e, t, n, r, i, a, o, s), this.paint(), this;
	}
	drawArc(e, t, n, r, i, a) {
		return fs(this.__path, e, t, n, r, i, a), this.paint(), this;
	}
	drawPoints(e, t, n) {
		return ps(this.__path, e, t, n), this.paint(), this;
	}
	clearPath() {
		return this.beginPath();
	}
	paint() {}
}, { M: hs, L: gs, C: _s, Q: vs, Z: ys, N: bs, D: xs, X: Ss, G: Cs, F: ws, O: Ts, P: Es, U: Ds } = oa, Os = Ai.get("PathDrawer"), ks = {
	drawPathByData(e, t) {
		if (!t) return;
		let n, r = 0, i = t.length;
		for (; r < i;) switch (n = t[r], n) {
			case hs:
				e.moveTo(t[r + 1], t[r + 2]), r += 3;
				break;
			case gs:
				e.lineTo(t[r + 1], t[r + 2]), r += 3;
				break;
			case _s:
				e.bezierCurveTo(t[r + 1], t[r + 2], t[r + 3], t[r + 4], t[r + 5], t[r + 6]), r += 7;
				break;
			case vs:
				e.quadraticCurveTo(t[r + 1], t[r + 2], t[r + 3], t[r + 4]), r += 5;
				break;
			case ys:
				e.closePath(), r += 1;
				break;
			case bs:
				e.rect(t[r + 1], t[r + 2], t[r + 3], t[r + 4]), r += 5;
				break;
			case xs:
				e.roundRect(t[r + 1], t[r + 2], t[r + 3], t[r + 4], [
					t[r + 5],
					t[r + 6],
					t[r + 7],
					t[r + 8]
				]), r += 9;
				break;
			case Ss:
				e.roundRect(t[r + 1], t[r + 2], t[r + 3], t[r + 4], t[r + 5]), r += 6;
				break;
			case Cs:
				e.ellipse(t[r + 1], t[r + 2], t[r + 3], t[r + 4], t[r + 5] * L, t[r + 6] * L, t[r + 7] * L, t[r + 8]), r += 9;
				break;
			case ws:
				e.ellipse(t[r + 1], t[r + 2], t[r + 3], t[r + 4], 0, 0, _r, !1), r += 5;
				break;
			case Ts:
				e.arc(t[r + 1], t[r + 2], t[r + 3], t[r + 4] * L, t[r + 5] * L, t[r + 6]), r += 7;
				break;
			case Es:
				e.arc(t[r + 1], t[r + 2], t[r + 3], 0, _r, !1), r += 4;
				break;
			case Ds:
				e.arcTo(t[r + 1], t[r + 2], t[r + 3], t[r + 4], t[r + 5]), r += 6;
				break;
			default:
				Os.error(`command: ${n} [index:${r}]`, t);
				return;
		}
	},
	drawPathByPoints(e, t, n) {}
}, { M: As, L: js, C: Ms, Q: Ns, Z: Ps, N: Fs, D: Is, X: Ls, G: Rs, F: zs, O: Bs, P: Vs, U: Hs } = oa, { toTwoPointBounds: Us, toTwoPointBoundsByQuadraticCurve: Ws, arcTo: Gs, arc: Ks, ellipse: qs } = Na, { addPointBounds: Js, copy: Ys, addPoint: Xs, setPoint: Zs, addBounds: Qs, toBounds: $s } = qr, ec = Ai.get("PathBounds"), tc, nc, rc, ic = {}, ac = {}, oc = {}, sc = {
	toBounds(e, t) {
		sc.toTwoPointBounds(e, ac), $s(ac, t);
	},
	toTwoPointBounds(e, t) {
		if (!e || !e.length) return Zs(t, 0, 0);
		let n, r, i, a, o, s = 0, c = 0, l = 0, u = e.length;
		for (; s < u;) switch (o = e[s], s === 0 && (o === Ps || o === Ms || o === Ns ? Zs(t, c, l) : Zs(t, e[s + 1], e[s + 2])), o) {
			case As:
			case js:
				c = e[s + 1], l = e[s + 2], Xs(t, c, l), s += 3;
				break;
			case Ms:
				i = e[s + 5], a = e[s + 6], Us(c, l, e[s + 1], e[s + 2], e[s + 3], e[s + 4], i, a, ic), Js(t, ic), c = i, l = a, s += 7;
				break;
			case Ns:
				n = e[s + 1], r = e[s + 2], i = e[s + 3], a = e[s + 4], Ws(c, l, n, r, i, a, ic), Js(t, ic), c = i, l = a, s += 5;
				break;
			case Ps:
				s += 1;
				break;
			case Fs:
				c = e[s + 1], l = e[s + 2], Qs(t, c, l, e[s + 3], e[s + 4]), s += 5;
				break;
			case Is:
			case Ls:
				c = e[s + 1], l = e[s + 2], Qs(t, c, l, e[s + 3], e[s + 4]), s += o === Is ? 9 : 6;
				break;
			case Rs:
				qs(null, e[s + 1], e[s + 2], e[s + 3], e[s + 4], e[s + 5], e[s + 6], e[s + 7], e[s + 8], ic, oc), s === 0 ? Ys(t, ic) : Js(t, ic), c = oc.x, l = oc.y, s += 9;
				break;
			case zs:
				c = e[s + 1], l = e[s + 2], nc = e[s + 3], rc = e[s + 4], Qs(t, c - nc, l - rc, 2 * nc, 2 * rc), c += nc, s += 5;
				break;
			case Bs:
				Ks(null, e[s + 1], e[s + 2], e[s + 3], e[s + 4], e[s + 5], e[s + 6], ic, oc), s === 0 ? Ys(t, ic) : Js(t, ic), c = oc.x, l = oc.y, s += 7;
				break;
			case Vs:
				c = e[s + 1], l = e[s + 2], tc = e[s + 3], Qs(t, c - tc, l - tc, 2 * tc, 2 * tc), c += tc, s += 4;
				break;
			case Hs:
				Gs(null, c, l, e[s + 1], e[s + 2], e[s + 3], e[s + 4], e[s + 5], ic, oc), s === 0 ? Ys(t, ic) : Js(t, ic), c = oc.x, l = oc.y, s += 6;
				break;
			default:
				ec.error(`command: ${o} [index:${s}]`, e);
				return;
		}
	}
}, { M: cc, L: lc, Z: uc } = oa, { getCenterX: dc, getCenterY: fc } = z, { arcTo: pc } = Zo, mc = { smooth(e, t, n) {
	let r, i, a, o, s, c, l = 0, u = 0, d = 0, f = 0, p = 0, m = 0, h = 0, g = 0, _ = 0;
	Gn(t) && (t = t[0] || 0);
	let v = e.length, y = v === 9, b = [];
	for (; l < v;) {
		switch (r = e[l], r) {
			case cc:
				c = b.length, c && i !== uc && (b[o] = f, b[s] = p), f = g = e[l + 1], p = _ = e[l + 2], l += 3, e[l] === lc ? (m = e[l + 1], h = e[l + 2], y ? b.push(cc, f, p) : b.push(cc, dc(f, m), fc(p, h))) : b.push(cc, f, p), o = c + 1, s = c + 2;
				break;
			case lc:
				switch (u = e[l + 1], d = e[l + 2], l += 3, e[l]) {
					case lc:
						pc(b, u, d, e[l + 1], e[l + 2], t, g, _, y);
						break;
					case uc:
						pc(b, u, d, f, p, t, g, _, y);
						break;
					default: b.push(lc, u, d);
				}
				g = u, _ = d;
				break;
			case uc:
				i !== uc && (pc(b, f, p, m, h, t, g, _, y), b.push(uc)), l += 1;
				break;
			default:
				a = fa[r];
				for (let t = 0; t < a; t++) b.push(e[l + t]);
				l += a;
		}
		i = r;
	}
	return r !== uc && (b[o] = f, b[s] = p), b;
} };
function hc(e) {
	return new ms(e);
}
var gc = hc();
ia.creator = hc(), ia.parse = Oo.parse, ia.convertToCanvasData = Oo.toCanvasData;
var { drawRoundRect: _c } = pa;
function vc(e) {
	(function(e) {
		e && !e.roundRect && (e.roundRect = function(e, t, n, r, i) {
			_c(this, e, t, n, r, i);
		});
	})(e);
}
var yc = {
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
		let t = bc.fileType(e);
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
}, bc = yc;
bc.mineType = bc.mimeType, bc.alphaPixelTypes.forEach((e) => bc.upperCaseTypeMap[e] = e.toUpperCase());
var xc = Ai.get("TaskProcessor"), Sc = class {
	constructor(e) {
		this.parallel = !0, this.time = 1, this.id = Zn.create(Zn.TASK), this.task = e;
	}
	run() {
		return Ki(this, void 0, void 0, function* () {
			try {
				if (this.isComplete || this.runing) return;
				if (this.runing = !0, this.canUse && !this.canUse()) return this.cancel();
				this.task && (yield this.task());
			} catch (e) {
				xc.error(e);
			}
		});
	}
	complete() {
		this.isComplete = !0, this.parent = this.task = this.canUse = null;
	}
	cancel() {
		this.isCancel = !0, this.complete();
	}
}, Cc = class {
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
		this.config = { parallel: 6 }, this.list = [], this.running = !1, this.isComplete = !0, this.index = 0, this.delayNumber = 0, e && Jn.assign(this.config, e), this.empty();
	}
	add(e, t, n) {
		let r, i, a, o, s = new Sc(e);
		return s.parent = this, F(t) ? o = t : t && (i = t.parallel, r = t.start, a = t.time, o = t.delay, n ||= t.canUse), a && (s.time = a), !1 === i && (s.parallel = !1), n && (s.canUse = n), P(o) ? this.push(s, r) : (this.delayNumber++, setTimeout(() => {
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
}, wc = Ai.get("Resource"), Tc = {
	tasker: new Cc(),
	queue: new Cc({ parallel: 1 }),
	map: {},
	get isComplete() {
		return Ec.tasker.isComplete;
	},
	set(e, t) {
		Ec.map[e] && wc.repeat(e), Ec.map[e] = t;
	},
	get: (e) => Ec.map[e],
	remove(e) {
		let t = Ec.map[e];
		t && (t.destroy && t.destroy(), delete Ec.map[e]);
	},
	loadImage(e, t) {
		return new Promise((n, r) => {
			let i = this.setImage(e, e, t);
			i.load(() => n(i), (e) => r(e));
		});
	},
	setImage(e, t, n) {
		let r;
		return Un(t) ? r = { url: t } : t.url || (r = {
			url: e,
			view: t
		}), r && (n && (r.format = n), t = Ri.image(r)), Ec.set(e, t), t;
	},
	loadFilm(e, t) {},
	loadVideo(e, t) {},
	destroy() {
		Ec.map = {};
	}
}, Ec = Tc, Dc = {
	maxRecycled: 10,
	recycledList: [],
	patternTasker: Tc.queue,
	get(e, t) {
		let n = Tc.get(e.url);
		return n || Tc.set(e.url, n = Ri[t || "image"](e)), n.use++, n;
	},
	recycle(e) {
		e.parent && (e = e.parent), e.use--, setTimeout(() => {
			e.use || (V.image.isLarge(e) ? e.url && Tc.remove(e.url) : (e.clearLevels(), Oc.recycledList.push(e)));
		});
	},
	recyclePaint(e) {
		Oc.recycle(e.image);
	},
	clearRecycled(e) {
		let t = Oc.recycledList;
		(t.length > Oc.maxRecycled || e) && (t.forEach((t) => (!t.use || e) && t.url && Tc.remove(t.url)), t.length = 0);
	},
	clearLevels() {},
	hasAlphaPixel: (e) => yc.alphaPixelTypes.some((t) => Oc.isFormat(t, e)),
	isFormat(e, t) {
		if (t.format) return t.format === e;
		let { url: n } = t;
		if (n.startsWith("data:")) {
			if (n.startsWith("data:" + yc.mimeType(e))) return !0;
		} else if (n.includes("." + e) || n.includes("." + yc.upperCaseTypeMap[e]) || e === "png" && !n.includes(".")) return !0;
		return !1;
	},
	destroy() {
		this.clearRecycled(!0);
	}
}, Oc = Dc, { IMAGE: kc, create: Ac } = Zn, jc = class {
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
		if (this.use = 0, this.waitComplete = [], this.innerId = Ac(kc), this.config = e ||= { url: "" }, e.view) {
			let { view: t } = e;
			this.setView(t.config ? t.view : t);
		}
		Dc.isFormat("svg", e) && (this.isSVG = !0), Dc.hasAlphaPixel(e) && (this.hasAlphaPixel = !0);
	}
	load(e, t, n) {
		return this.loading || (this.loading = !0, Tc.tasker.add(() => Ki(this, void 0, void 0, function* () {
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
function Mc(e, t, n, r) {
	r || (n.configurable = n.enumerable = !0), Object.defineProperty(e, t, n);
}
function Nc(e, t) {
	return Object.getOwnPropertyDescriptor(e, t);
}
function Pc(e, t) {
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
function Fc(e, t) {
	return (n, r) => Lc(n, r, e, t && t(r));
}
function Ic(e) {
	return e;
}
function Lc(e, t, n, r) {
	Mc(e, t, Object.assign({
		get() {
			return this.__getAttr(t);
		},
		set(e) {
			this.__setAttr(t, e);
		}
	}, r || {})), dl(e, t, n);
}
function Rc(e) {
	return Fc(e);
}
function zc(e, t) {
	return Fc(e, (e) => ({ set(n) {
		this.__setAttr(e, n, t) && (this.__layout.matrixChanged || this.__layout.matrixChange());
	} }));
}
function Bc(e, t) {
	return Fc(e, (e) => ({ set(n) {
		this.__setAttr(e, n, t) && (this.__layout.matrixChanged || this.__layout.matrixChange(), this.__scrollWorld ||= {});
	} }));
}
function Vc(e) {
	return Fc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && (this.__hasAutoLayout = !!(this.origin || this.around || this.flow), this.__local || this.__layout.createLocal(), Gc(this));
	} }));
}
function Hc(e, t) {
	return Fc(e, (e) => ({ set(n) {
		this.__setAttr(e, n, t) && (this.__layout.scaleChanged || this.__layout.scaleChange());
	} }));
}
function Uc(e, t) {
	return Fc(e, (e) => ({ set(n) {
		this.__setAttr(e, n, t) && (this.__layout.rotationChanged || this.__layout.rotationChange());
	} }));
}
function K(e, t) {
	return Fc(e, (e) => ({ set(n) {
		this.__setAttr(e, n, t) && Gc(this);
	} }));
}
function Wc(e) {
	return Fc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && (Gc(this), this.__.__removeNaturalSize());
	} }));
}
function Gc(e) {
	e.__layout.boxChanged || e.__layout.boxChange(), e.__hasAutoLayout && (e.__layout.matrixChanged || e.__layout.matrixChange());
}
function Kc(e) {
	return Fc(e, (e) => ({ set(t) {
		let n = this.__;
		n.__pathInputed !== 2 && (n.__pathInputed = +!!t), t || (n.__pathForRender = void 0), this.__setAttr(e, t), Gc(this);
	} }));
}
var qc = K;
function Jc(e, t) {
	return Fc(e, (e) => ({ set(n) {
		this.__setAttr(e, n) && (Yc(this), t && (this.__.__useStroke = !0));
	} }));
}
function Yc(e) {
	e.__layout.strokeChanged || e.__layout.strokeChange(), e.__.__useArrow && Gc(e);
}
var Xc = Jc;
function Zc(e) {
	return Fc(e, (e) => ({ set(t) {
		this.__setAttr(e, t), this.__layout.renderChanged || this.__layout.renderChange();
	} }));
}
function Qc(e) {
	return Fc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && $c(this);
	} }));
}
function $c(e) {
	e.__layout.surfaceChanged || e.__layout.surfaceChange();
}
function el(e) {
	return Fc(e, (e) => ({ set(t) {
		if (this.__setAttr(e, t)) {
			let e = this.__;
			Jn.stintSet(e, "__useDim", e.dim || e.bright || e.dimskip);
		}
	} }));
}
function tl(e) {
	return Fc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && (this.__layout.opacityChanged || this.__layout.opacityChange()), this.mask && rl(this);
	} }));
}
function nl(e) {
	return Fc(e, (e) => ({ set(t) {
		let n = this.visible;
		if (!0 === n && t === 0) {
			if (this.animationOut) return this.__runAnimation("out", () => il(this, e, t, n));
		} else n === 0 && !0 === t && this.animation && this.__runAnimation("in");
		il(this, e, t, n), this.mask && rl(this);
	} }));
}
function rl(e) {
	let { parent: t } = e;
	if (t) {
		let { __hasMask: e } = t;
		t.__updateMask(), e !== t.__hasMask && t.forceUpdate();
	}
}
function il(e, t, n, r) {
	e.__setAttr(t, n) && (e.__layout.opacityChanged || e.__layout.opacityChange(), r !== 0 && n !== 0 || Gc(e));
}
function al(e) {
	return Fc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && this.waitParent(() => {
			let { parent: e } = this;
			e.__layout.childrenSortChange(), e.__.flow && e.__layout.boxChange();
		});
	} }));
}
function ol(e, t) {
	return Fc(e, (e) => ({ set(n) {
		this.__setAttr(e, n) && (this.__layout.boxChanged || this.__layout.boxChange(), t ? this.__updateMask() : this.waitParent(() => {
			this.parent.__updateMask(n);
		}));
	} }));
}
function sl(e) {
	return Fc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && this.waitParent(() => {
			this.parent.__updateEraser(t);
		});
	} }));
}
function cl(e) {
	return Fc(e, (e) => ({ set(t) {
		this.__setAttr(e, t) && (this.__layout.hitCanvasChanged = !0, this.leafer && this.leafer.updateCursor());
	} }));
}
function ll(e) {
	return Fc(e, (e) => ({ set(t) {
		this.__setAttr(e, t), this.leafer && this.leafer.updateCursor();
	} }));
}
function ul(e) {
	return (t, n) => {
		Mc(t, "__DataProcessor", { get: () => e });
	};
}
function dl(e, t, n) {
	let r = e.__DataProcessor.prototype, i = "_" + t, a = function(e) {
		return "set" + e.charAt(0).toUpperCase() + e.slice(1);
	}(t), o = Pc(t, n);
	if (P(n)) o.get = function() {
		return this[i];
	};
	else if (typeof n == "function") o.get = function() {
		return this[i] ?? n(this.__leaf);
	};
	else if (I(n)) {
		let e = qn(n);
		o.get = function() {
			return this[i] ?? (this[i] = e ? {} : Jn.clone(n));
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
	for (; !c && l;) c = Nc(l, t), l = l.__proto__;
	c && c.set && (o.set = c.set), r[a] && (o.set = r[a], delete r[a]), Mc(r, t, o);
}
var fl = new Ai("rewrite"), pl = [], ml = ["destroy", "constructor"];
function hl(e) {
	return (t, n) => {
		pl.push({
			name: t.constructor.name + "." + n,
			run: () => {
				t[n] = e;
			}
		});
	};
}
function gl() {
	return (e) => {
		_l();
	};
}
function _l(e) {
	pl.length &&= (pl.forEach((t) => {
		e && fl.error(t.name, "需在Class上装饰@rewriteAble()"), t.run();
	}), 0);
}
function vl(e, t) {
	return (n) => {
		var r;
		(e.prototype ? (r = e.prototype, Object.getOwnPropertyNames(r)) : Object.keys(e)).forEach((r) => {
			ml.includes(r) || t && t.includes(r) || (e.prototype ? Nc(e.prototype, r).writable && (n.prototype[r] = e.prototype[r]) : n.prototype[r] = e[r]);
		});
	};
}
function yl() {
	return (e) => {
		Bi.register(e);
	};
}
function bl() {
	return (e) => {
		Ui.register(e);
	};
}
setTimeout(() => _l(!0));
var { copy: xl, toInnerPoint: Sl, toOuterPoint: Cl, scaleOfOuter: wl, rotateOfOuter: Tl, skewOfOuter: El, multiplyParent: Dl, divideParent: Ol, getLayout: kl } = R, Al = {}, { round: jl } = Math, Ml = {
	updateAllMatrix(e, t, n) {
		if (t && e.__hasAutoLayout && e.__layout.matrixChanged && (n = !0), Fl(e, t, n), e.isBranch) {
			let { children: r } = e;
			for (let e = 0, i = r.length; e < i; e++) Pl(r[e], t, n);
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
			for (let e = 0, n = t.length; e < n; e++) Il(t[e]);
		}
	},
	updateChange(e) {
		let t = e.__layout;
		t.stateStyleChanged && e.updateState(), t.opacityChanged && Il(e), e.__updateChange(), t.surfaceChanged &&= (e.__hasComplex && Nl.updateComplex(e), !1);
	},
	updateAllChange(e) {
		if (Rl(e), e.isBranch) {
			let { children: t } = e;
			for (let e = 0, n = t.length; e < n; e++) Ll(t[e]);
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
		let a = I(t) ? Object.assign({}, t) : {
			x: t,
			y: n
		};
		r ? Cl(e.localTransform, a, a, !0) : e.parent && Sl(e.parent.scrollWorldTransform, a, a, !0), Nl.moveLocal(e, a.x, a.y, i);
	},
	moveLocal(e, t, n = 0, r) {
		I(t) && (n = t.y, t = t.x), t += e.x, n += e.y, e.leafer && e.leafer.config.pointSnap && (t = jl(t), n = jl(n)), r ? e.animate({
			x: t,
			y: n
		}, r) : (e.x = t, e.y = n);
	},
	zoomOfWorld(e, t, n, r, i, a, o) {
		Nl.zoomOfLocal(e, zl(e, t), n, r, i, a, o);
	},
	zoomOfLocal(e, t, n, r = n, i, a, o) {
		let s = e.__localMatrix;
		if (F(r) || (r && (a = r), r = n), xl(Al, s), wl(Al, t, n, r), Nl.hasHighPosition(e)) Nl.setTransform(e, Al, i, a, o);
		else {
			let t = e.x + Al.e - s.e, c = e.y + Al.f - s.f;
			a && !i ? e.animate({
				x: t,
				y: c,
				scaleX: e.scaleX * n,
				scaleY: e.scaleY * r
			}, a) : (e.x = t, e.y = c, e.scaleResize(n, r, !0 !== i, o));
		}
	},
	rotateOfWorld(e, t, n, r) {
		Nl.rotateOfLocal(e, zl(e, t), n, r);
	},
	rotateOfLocal(e, t, n, r) {
		let i = e.__localMatrix;
		xl(Al, i), Tl(Al, t, n), Nl.hasHighPosition(e) ? Nl.setTransform(e, Al, !1, r) : e.set({
			x: e.x + Al.e - i.e,
			y: e.y + Al.f - i.f,
			rotation: hr.formatRotation(e.rotation + n)
		}, r);
	},
	skewOfWorld(e, t, n, r, i, a) {
		Nl.skewOfLocal(e, zl(e, t), n, r, i, a);
	},
	skewOfLocal(e, t, n, r = 0, i, a) {
		xl(Al, e.__localMatrix), El(Al, t, n, r), Nl.setTransform(e, Al, i, a);
	},
	transformWorld(e, t, n, r, i) {
		xl(Al, e.worldTransform), Dl(Al, t), e.parent && Ol(Al, e.parent.scrollWorldTransform), Nl.setTransform(e, Al, n, r, i);
	},
	transform(e, t, n, r, i) {
		xl(Al, e.localTransform), Dl(Al, t), Nl.setTransform(e, Al, n, r, i);
	},
	setTransform(e, t, n, r, i) {
		let a = e.__, o = a.origin && Nl.getInnerOrigin(e, a.origin), s = kl(t, o, a.around && Nl.getInnerOrigin(e, a.around));
		if (Nl.hasOffset(e) && (s.x -= a.offsetX, s.y -= a.offsetY), n) {
			let t = s.scaleX / e.scaleX, n = s.scaleY / e.scaleY;
			if (delete s.scaleX, delete s.scaleY, o) {
				B.scale(e.boxBounds, Math.abs(t), Math.abs(n));
				let r = Nl.getInnerOrigin(e, a.origin);
				z.move(s, o.x - r.x, o.y - r.y);
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
		return wl(n, Nl.getLocalOrigin(e, "center"), -1 * r, 1 * r), n;
	},
	getLocalOrigin: (e, t) => z.tempToOuterOf(Nl.getInnerOrigin(e, t), e.localTransform),
	getInnerOrigin(e, t) {
		let n = {};
		return Qr.toPoint(t, e.boxBounds, n), n;
	},
	getRelativeWorld: (e, t, n) => (xl(Al, e.worldTransform), Ol(Al, t.scrollWorldTransform), n ? Al : Object.assign({}, Al)),
	updateScaleFixedWorld(e) {},
	updateOuterBounds(e) {},
	cacheId(e) {},
	drop(e, t, n, r) {
		e.setTransform(Nl.getRelativeWorld(e, t, !0), r), t.add(e, n);
	},
	hasHighPosition: (e) => e.origin || e.around || Nl.hasOffset(e),
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
				t.x -= i, t.y -= a, e.move(i, a), V.requestRender(() => Nl.animateMove(e, t, n, r));
			}
			r && r();
		}
	}
}, Nl = Ml, { updateAllMatrix: Pl, updateMatrix: Fl, updateAllWorldOpacity: Il, updateAllChange: Ll, updateChange: Rl } = Nl;
function zl(e, t) {
	return e.updateLayout(), e.parent ? z.tempToInnerOf(t, e.parent.scrollWorldTransform) : t;
}
var Bl = {
	worldBounds: (e) => e.__world,
	localBoxBounds: (e) => e.__.eraser || e.__.visible === 0 ? null : e.__local || e.__layout,
	localStrokeBounds: (e) => e.__.eraser || e.__.visible === 0 ? null : e.__layout.localStrokeBounds,
	localRenderBounds(e) {
		let { __: t, __layout: n } = e;
		return t.eraser || t.visible === 0 ? null : n.localOuterBounds || n.localRenderBounds;
	},
	maskLocalBoxBounds: (e, t) => Hl(e, t) && e.__localBoxBounds,
	maskLocalStrokeBounds: (e, t) => Hl(e, t) && e.__layout.localStrokeBounds,
	maskLocalRenderBounds(e, t) {
		let { __layout: n } = e;
		return Hl(e, t) && (n.localOuterBounds || n.localRenderBounds);
	},
	excludeRenderBounds: (e, t) => !(!t.bounds || t.bounds.hit(e.__world, t.matrix)) || !(!t.hideBounds || !t.hideBounds.includes(e.__world, t.matrix))
}, Vl;
function Hl(e, t) {
	return t || (Vl = 0), e.__.mask && (Vl = 1), Vl < 0 ? null : (Vl &&= -1, !0);
}
var { updateBounds: Ul } = Ml, Wl = {
	sort: (e, t) => e.__.zIndex === t.__.zIndex ? e.__tempNumber - t.__tempNumber : e.__.zIndex - t.__.zIndex,
	pushAllChildBranch(e, t) {
		if (e.__tempNumber = 1, e.__.__childBranchNumber) {
			let { children: n } = e;
			for (let r = 0, i = n.length; r < i; r++) (e = n[r]).isBranch && (e.__tempNumber = 1, t.add(e), Gl(e, t));
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
		for (let e = n, r = t.length; e < r; e++) Kl(t[e], t);
	},
	updateBounds(e, t) {
		let n = [e];
		Kl(e, n), ql(n, t);
	},
	updateBoundsByBranchStack(e, t) {
		let n, r;
		for (let i = e.length - 1; i > -1; i--) {
			n = e[i], r = n.children;
			for (let e = 0, t = r.length; e < t; e++) Ul(r[e]);
			t && t === n || Ul(n);
		}
	},
	move(e, t, n) {
		let r, { children: i } = e;
		for (let a = 0, o = i.length; a < o; a++) r = (e = i[a]).__world, r.e += t, r.f += n, r.x += t, r.y += n, e.isBranch && Jl(e, t, n);
	},
	scale(e, t, n, r, i, a, o) {
		let s, { children: c } = e, l = r - 1, u = i - 1;
		for (let d = 0, f = c.length; d < f; d++) s = (e = c[d]).__world, s.a *= r, s.d *= i, (s.b || s.c) && (s.b *= r, s.c *= i), s.e === s.x && s.f === s.y ? (s.x = s.e += (s.e - a) * l + t, s.y = s.f += (s.f - o) * u + n) : (s.e += (s.e - a) * l + t, s.f += (s.f - o) * u + n, s.x += (s.x - a) * l + t, s.y += (s.y - o) * u + n), s.width *= r, s.height *= i, s.scaleX *= r, s.scaleY *= i, e.isBranch && Yl(e, t, n, r, i, a, o);
	}
}, { pushAllChildBranch: Gl, pushAllBranchStack: Kl, updateBoundsByBranchStack: ql, move: Jl, scale: Yl } = Wl, Xl = { run(e) {
	if (e && e.length) {
		let t = e.length;
		for (let n = 0; n < t; n++) e[n]();
		e.length === t ? e.length = 0 : e.splice(0, t);
	}
} }, { getRelativeWorld: Zl, updateBounds: Ql } = Ml, { toOuterOf: $l, getPoints: eu, copy: tu } = B, nu = "_localContentBounds", ru = "_worldContentBounds", iu = "_worldBoxBounds", au = "_worldStrokeBounds", ou = class {
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
		return $l(this.contentBounds, this.leaf.__localMatrix, this[nu] || (this[nu] = {})), this[nu];
	}
	get localStrokeBounds() {
		return this._localStrokeBounds || this;
	}
	get localRenderBounds() {
		return this._localRenderBounds || this;
	}
	get worldContentBounds() {
		return $l(this.contentBounds, this.leaf.__world, this[ru] || (this[ru] = {})), this[ru];
	}
	get worldBoxBounds() {
		return $l(this.boxBounds, this.leaf.__world, this[iu] || (this[iu] = {})), this[iu];
	}
	get worldStrokeBounds() {
		return $l(this.strokeBounds, this.leaf.__world, this[au] || (this[au] = {})), this[au];
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
		if (e.isApp) return Ql(e);
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
			case "inner": return R.defaultMatrix;
			case "page": e = t.zoomLayer;
			default: return Zl(t, e);
		}
	}
	getBounds(e, t = "world") {
		switch (this.update(), t) {
			case "world": return this.getWorldBounds(e);
			case "local": return this.getLocalBounds(e);
			case "inner": return this.getInnerBounds(e);
			case "page": t = this.leaf.zoomLayer;
			default: return new xi(this.getInnerBounds(e)).toOuterOf(this.getTransform(t));
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
				i = s, a = R.defaultMatrix;
				break;
			case "page": t = r.zoomLayer;
			default: i = r.getWorldPoint(s, t), a = Zl(r, t, !0);
		}
		if (o ||= R.getLayout(a), tu(o, s), z.copy(o, i), n) {
			let { scaleX: e, scaleY: t } = o, n = Math.abs(e), r = Math.abs(t);
			n === 1 && r === 1 || (o.scaleX /= n, o.scaleY /= r, o.width *= n, o.height *= r);
		}
		return o;
	}
	getLayoutPoints(e, t = "world") {
		let { leaf: n } = this, r = eu(this.getInnerBounds(e)), i;
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
}, su = class {
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
}, cu = class extends su {
	constructor(e, t, n) {
		super(e, t), this.parent = n, this.child = t;
	}
};
cu.ADD = "child.add", cu.REMOVE = "child.remove", cu.CREATED = "created", cu.MOUNTED = "mounted", cu.UNMOUNTED = "unmounted", cu.DESTROY = "destroy";
var lu = "property.scroll", uu = class extends su {
	constructor(e, t, n, r, i) {
		super(e, t), this.attrName = n, this.oldValue = r, this.newValue = i;
	}
};
uu.CHANGE = "property.change", uu.LEAFER_CHANGE = "property.leafer_change", uu.SCROLL = lu;
var du = {
	scrollX: lu,
	scrollY: lu
}, fu = class extends su {
	constructor(e, t) {
		super(e), Object.assign(this, t);
	}
};
fu.LOAD = "image.load", fu.LOADED = "image.loaded", fu.ERROR = "image.error";
var pu = class extends su {
	static checkHas(e, t, n) {
		n === "on" ? t === _u ? e.__hasWorldEvent = !0 : e.__hasLocalEvent = !0 : (e.__hasLocalEvent = e.hasEvent(mu) || e.hasEvent(hu) || e.hasEvent(gu), e.__hasWorldEvent = e.hasEvent(_u));
	}
	static emitLocal(e) {
		if (e.leaferIsReady) {
			let { resized: t } = e.__layout;
			t !== "local" && (e.emit(mu, e), t === "inner" && e.emit(hu, e)), e.emit(gu, e);
		}
	}
	static emitWorld(e) {
		e.leaferIsReady && e.emit(_u, e);
	}
};
pu.RESIZE = "bounds.resize", pu.INNER = "bounds.inner", pu.LOCAL = "bounds.local", pu.WORLD = "bounds.world";
var { RESIZE: mu, INNER: hu, LOCAL: gu, WORLD: _u } = pu, vu = {};
[
	mu,
	hu,
	gu,
	_u
].forEach((e) => vu[e] = 1);
var yu = class e extends su {
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
		I(t) ? (super(e.RESIZE), Object.assign(this, t)) : super(t), this.old = n;
	}
	static isResizing(e) {
		return this.resizingKeys && !P(this.resizingKeys[e.innerId]);
	}
};
yu.RESIZE = "resize";
var bu = class extends su {
	constructor(e, t) {
		super(e), this.data = t;
	}
};
bu.REQUEST = "watch.request", bu.DATA = "watch.data";
var xu = class extends su {
	constructor(e, t, n) {
		super(e), t && (this.data = t, this.times = n);
	}
};
xu.REQUEST = "layout.request", xu.START = "layout.start", xu.BEFORE = "layout.before", xu.LAYOUT = "layout", xu.AFTER = "layout.after", xu.AGAIN = "layout.again", xu.END = "layout.end";
var Su = class extends su {
	constructor(e, t, n, r) {
		super(e), t && (this.times = t), n && (this.renderBounds = n, this.renderOptions = r);
	}
};
Su.REQUEST = "render.request", Su.CHILD_START = "render.child_start", Su.CHILD_END = "render.child_end", Su.START = "render.start", Su.BEFORE = "render.before", Su.RENDER = "render", Su.AFTER = "render.after", Su.AGAIN = "render.again", Su.END = "render.end", Su.NEXT = "render.next";
var q = class extends su {};
q.START = "leafer.start", q.BEFORE_READY = "leafer.before_ready", q.READY = "leafer.ready", q.AFTER_READY = "leafer.after_ready", q.VIEW_READY = "leafer.view_ready", q.VIEW_COMPLETED = "leafer.view_completed", q.STOP = "leafer.stop", q.RESTART = "leafer.restart", q.END = "leafer.end", q.UPDATE_MODE = "leafer.update_mode", q.TRANSFORM = "leafer.transform", q.MOVE = "leafer.move", q.SCALE = "leafer.scale", q.ROTATE = "leafer.rotate", q.SKEW = "leafer.skew";
var { MOVE: Cu, SCALE: wu, ROTATE: Tu, SKEW: Eu } = q, Du = {
	x: Cu,
	y: Cu,
	scaleX: wu,
	scaleY: wu,
	rotation: Tu,
	skewX: Eu,
	skewY: Eu
}, Ou = {}, ku = class {
	set event(e) {
		this.on(e);
	}
	on(e, t, n) {
		if (!t) {
			let t;
			if (Gn(e)) e.forEach((e) => this.on(e[0], e[1], e[2]));
			else for (let n in e) Gn(t = e[n]) ? this.on(n, t[0], t[1]) : this.on(n, t);
			return;
		}
		let r, i, a;
		n && (n === "once" ? i = !0 : typeof n == "boolean" ? r = n : (r = n.capture, i = n.once));
		let o = Au(this, r, !0), s = Un(e) ? e.split(" ") : e, c = i ? {
			listener: t,
			once: i
		} : { listener: t };
		s.forEach((e) => {
			e && (a = o[e], a ? a.findIndex((e) => e.listener === t) === -1 && a.push(c) : o[e] = [c], vu[e] && pu.checkHas(this, e, "on"));
		});
	}
	off(e, t, n) {
		if (e) {
			let r = Un(e) ? e.split(" ") : e;
			if (t) {
				let e, i, a;
				n && (e = typeof n == "boolean" ? n : n !== "once" && n.capture);
				let o = Au(this, e);
				r.forEach((e) => {
					e && (i = o[e], i && (a = i.findIndex((e) => e.listener === t), a > -1 && i.splice(a, 1), i.length || delete o[e], vu[e] && pu.checkHas(this, e, "off")));
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
		return t ? this.on(e, n ? t = t.bind(n) : t, r) : Gn(e) && e.forEach((e) => this.on(e[0], e[2] ? e[1] = e[1].bind(e[2]) : e[1], e[3])), {
			type: e,
			current: this,
			listener: t,
			options: r
		};
	}
	off_(e) {
		if (!e) return;
		let t = Gn(e) ? e : [e];
		t.forEach((e) => {
			e && (e.listener ? e.current.off(e.type, e.listener, e.options) : Gn(e.type) && e.type.forEach((t) => e.current.off(t[0], t[1], t[3])));
		}), t.length = 0;
	}
	once(e, t, n, r) {
		if (!t) return Gn(e) && e.forEach((e) => this.once(e[0], e[1], e[2], e[3]));
		I(n) ? t = t.bind(n) : r = n, this.on(e, t, {
			once: !0,
			capture: r
		});
	}
	emit(e, t, n) {
		!t && Ui.has(e) && (t = Ui.get(e, {
			type: e,
			target: this,
			current: this
		}));
		let r = Au(this, n)[e];
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
function Au(e, t, n) {
	if (t) {
		let { __captureMap: t } = e;
		return t || (n ? e.__captureMap = {} : Ou);
	}
	{
		let { __bubbleMap: t } = e;
		return t || (n ? e.__bubbleMap = {} : Ou);
	}
}
var { on: ju, on_: Mu, off: Nu, off_: Pu, once: Fu, emit: Iu, emitEvent: Lu, hasEvent: Ru, destroy: zu } = ku.prototype, Bu = {
	on: ju,
	on_: Mu,
	off: Nu,
	off_: Pu,
	once: Fu,
	emit: Iu,
	emitEvent: Lu,
	hasEvent: Ru,
	destroyEventer: zu
}, Vu = Ai.get("setAttr"), Hu = {
	__setAttr(e, t, n) {
		if (this.leaferIsCreated) {
			let r = this.__.__getInput(e);
			if (!n || Wn(t) || P(t) || (Vu.warn(this.innerName, e, t), t = void 0), I(t) || r !== t) {
				if (this.__realSetAttr(e, t), this.isLeafer) {
					this.emitEvent(new uu(uu.LEAFER_CHANGE, this, e, r, t));
					let n = Du[e];
					n && (this.emitEvent(new q(n, this)), this.emitEvent(new q(q.TRANSFORM, this)));
				}
				this.emitPropertyEvent(uu.CHANGE, e, r, t);
				let n = du[e];
				return n && this.emitPropertyEvent(n, e, r, t), !0;
			}
			return !1;
		}
		return this.__realSetAttr(e, t), !0;
	},
	emitPropertyEvent(e, t, n, r) {
		let i = new uu(e, this, t, n, r);
		this.isLeafer || this.hasEvent(e) && this.emitEvent(i), this.leafer.emitEvent(i);
	},
	__realSetAttr(e, t) {
		let n = this.__;
		n[e] = t, this.__proxyData && this.setProxyAttr(e, t), n.normalStyle && (this.lockNormalStyle || P(n.normalStyle[e]) || (n.normalStyle[e] = t));
	},
	__getAttr(e) {
		return this.__proxyData ? this.getProxyAttr(e) : this.__.__get(e);
	}
}, { setLayout: Uu, multiplyParent: Wu, translateInner: Gu, defaultWorld: Ku } = R, { toPoint: qu, tempPoint: Ju } = Qr, Yu = {
	__updateWorldMatrix() {
		let { parent: e, __layout: t, __world: n, __scrollWorld: r, __: i } = this;
		Wu(this.__local || t, e ? e.__scrollWorld || e.__world : Ku, n, !!t.affectScaleOrRotation, i), r && Gu(Object.assign(r, n), i.scrollX, i.scrollY), t.scaleFixed && Ml.updateScaleFixedWorld(this);
	},
	__updateLocalMatrix() {
		if (this.__local) {
			let e = this.__layout, t = this.__local, n = this.__;
			e.affectScaleOrRotation && (e.scaleChanged && (e.resized ||= "scale") || e.rotationChanged) && (Uu(t, n, null, null, e.affectRotation), e.scaleChanged = e.rotationChanged = void 0), t.e = n.x + n.offsetX, t.f = n.y + n.offsetY, (n.around || n.origin) && (qu(n.around || n.origin, e.boxBounds, Ju), Gu(t, -Ju.x, -Ju.y, !n.around));
		}
		this.__layout.matrixChanged = void 0;
	}
}, { updateMatrix: Xu, updateAllMatrix: Zu } = Ml, { updateBounds: Qu } = Wl, { toOuterOf: $u, copyAndSpread: ed, copy: td } = B, { toBounds: nd } = sc, rd = {
	__updateWorldBounds() {
		let { __layout: e, __world: t } = this;
		$u(e.renderBounds, t, t), this.__hasComplex && Ml.checkComplex(this), e.resized &&= (e.resized === "inner" && this.__onUpdateSize(), this.__hasLocalEvent && pu.emitLocal(this), void 0), this.__hasWorldEvent && pu.emitWorld(this);
	},
	__updateLocalBounds() {
		let e = this.__layout, t = this.__;
		e.boxChanged && (t.__pathInputed || this.__updatePath(), this.__updateRenderPath(), this.__updateBoxBounds(), e.resized = "inner"), e.localBoxChanged && (this.__local && this.__updateLocalBoxBounds(), e.localBoxChanged = void 0, e.strokeSpread && !e.strokeChanged && (e.strokeChanged = !!e.boxChanged || 2), e.renderSpread && !e.renderChanged && (e.renderChanged = !!e.boxChanged || 2), this.parent && this.parent.__layout.boxChange()), e.boxChanged = void 0, e.strokeChanged && (e.strokeChanged === 2 ? this.__updateLocalStrokeBounds() : (e.strokeSpread = this.__updateStrokeSpread(), e.strokeSpread ? (e.strokeBounds === e.boxBounds && e.spreadStroke(), this.__updateStrokeBounds(), this.__updateLocalStrokeBounds()) : e.spreadStrokeCancel(), e.resized = "inner", (e.renderSpread || e.strokeSpread !== e.strokeBoxSpread) && (e.renderChanged = !0)), e.strokeChanged = void 0, this.parent && this.parent.__layout.strokeChange()), e.renderChanged && (e.renderChanged === 2 ? this.__updateLocalRenderBounds() : (e.renderSpread = this.__updateRenderSpread(), e.renderSpread ? (e.renderBounds !== e.boxBounds && e.renderBounds !== e.strokeBounds || e.spreadRender(), this.__updateRenderBounds(), this.__updateLocalRenderBounds()) : e.spreadRenderCancel()), e.renderChanged = void 0, this.parent && this.parent.__layout.renderChange()), e.outerScale && Ml.updateOuterBounds(this), e.resized ||= "local", e.boundsChanged = void 0;
	},
	__updateLocalBoxBounds() {
		this.__hasMotionPath && this.__updateMotionPath(), this.__hasAutoLayout && this.__updateAutoLayout(), $u(this.__layout.boxBounds, this.__local, this.__local);
	},
	__updateLocalStrokeBounds() {
		$u(this.__layout.strokeBounds, this.__localMatrix, this.__layout.localStrokeBounds);
	},
	__updateLocalRenderBounds() {
		$u(this.__layout.renderBounds, this.__localMatrix, this.__layout.localRenderBounds);
	},
	__updateBoxBounds(e, t) {
		let n = this.__layout.boxBounds, r = this.__;
		r.__usePathBox ? nd(r.path, n) : (n.x = 0, n.y = 0, n.width = r.width, n.height = r.height);
	},
	__updateAutoLayout() {
		this.__layout.matrixChanged = !0, this.isBranch ? (this.__extraUpdate(), this.__.flow ? (this.__layout.childrenSortChanged && this.__updateSortChildren(), this.__layout.boxChanged && this.__updateFlowLayout(), Zu(this), Qu(this, this), this.__.__autoSide && this.__updateBoxBounds(!0)) : (Zu(this), Qu(this, this))) : Xu(this);
	},
	__updateNaturalSize() {
		let { __: e, __layout: t } = this;
		e.__naturalWidth = t.boxBounds.width, e.__naturalHeight = t.boxBounds.height;
	},
	__updateStrokeBounds(e) {
		let t = this.__layout;
		ed(t.strokeBounds, t.boxBounds, t.strokeBoxSpread);
	},
	__updateRenderBounds(e) {
		let t = this.__layout, { renderSpread: n } = t;
		F(n) && n <= 0 ? td(t.renderBounds, t.strokeBounds) : ed(t.renderBounds, t.boxBounds, n);
	}
}, id = {
	__render(e, t) {
		if (t.shape) return this.__renderShape(e, t);
		if ((!t.cellList || t.cellList.has(this)) && this.__worldOpacity) {
			let n = this.__;
			if (n.bright && !t.topRendering) return t.topList.add(this);
			if (e.setWorld(this.__nowWorld = this.__getNowWorld(t)), e.opacity = t.ignoreOpacity ? 1 : t.dimOpacity && !n.dimskip ? n.opacity * t.dimOpacity : n.opacity, this.__.__single) {
				if (n.eraser === "path") return this.__renderEraser(e, t);
				let r = e.getSameCanvas(!0, !0);
				this.__draw(r, t, e), Ml.copyCanvasByWorld(this, e, r, this.__nowWorld, n.__blendMode, !0), r.recycle(this.__nowWorld);
			} else this.__draw(e, t);
			Ai.showBounds && Ai.drawBounds(this, e, t);
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
}, { excludeRenderBounds: ad } = Bl, { hasSize: od } = B, sd = {
	__updateChange() {
		this.__layout.childrenSortChanged && this.__updateSortChildren(), this.__.__checkSingle();
	},
	__render(e, t) {
		let n = this.__nowWorld = this.__getNowWorld(t);
		if (this.__worldOpacity && od(n)) {
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
			for (let i = 0, a = r.length; i < a; i++) n = r[i], ad(n, t) || (n.__hasComplex ? Ml.renderComplex(n, e, t) : n.__render(e, t));
			this.__hasMask === 0 && this.__rerenderMask(e, t);
		}
	},
	__clip(e, t) {
		if (this.__worldOpacity) {
			let { children: n } = this;
			for (let r = 0, i = n.length; r < i; r++) ad(n[r], t) || n[r].__clip(e, t);
		}
	}
}, { LEAF: cd, create: ld } = Zn, { stintSet: ud } = Jn, { toInnerPoint: dd, toOuterPoint: fd, multiplyParent: pd } = R, { toOuterOf: md } = B, { copy: hd, move: gd } = z, { getScaleFixedData: _d } = hr, { moveLocal: vd, zoomOfLocal: yd, rotateOfLocal: bd, skewOfLocal: xd, moveWorld: Sd, zoomOfWorld: Cd, rotateOfWorld: wd, skewOfWorld: Td, transform: Ed, transformWorld: Dd, setTransform: Od, getFlipTransform: kd, getLocalOrigin: Ad, getRelativeWorld: jd, drop: Md } = Ml, Nd = class {
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
		return Xn;
	}
	get __LayoutProcessor() {
		return ou;
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
		this.innerId = ld(cd), this.reset(e), this.__bubbleMap && this.__emitLifeEvent(cu.CREATED);
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
		t && (e = e.bind(t)), this.parent ? e() : this.on(cu.ADD, e, "once");
	}
	waitLeafer(e, t) {
		t && (e = e.bind(t)), this.leafer ? e() : this.on(cu.MOUNTED, e, "once");
	}
	nextRender(e, t, n) {
		this.leafer ? this.leafer.nextRender(e, t, n) : this.waitLeafer(() => this.leafer.nextRender(e, t, n));
	}
	removeNextRender(e) {
		this.nextRender(e, null, "off");
	}
	__bindLeafer(e) {
		if (this.isLeafer && e !== null && (e = this), this.leafer && !e && this.leafer.leafs--, this.leafer = e, e ? (e.leafs++, this.__level = this.parent ? this.parent.__level + 1 : 1, this.animation && this.__runAnimation("in"), this.__bubbleMap && this.__emitLifeEvent(cu.MOUNTED), e.cacheId && Ml.cacheId(this)) : this.__emitLifeEvent(cu.UNMOUNTED), this.isBranch) {
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
		if (e && e !== "bounds" ? e === "surface" ? ($c(this), t = !0) : e === "stroke" && (Yc(this), t = !0) : (Gc(this), t = !0), t) {
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
			return pd(n, e.matrix, t, void 0, n), md(this.__layout.renderBounds, t, t), ud(t, "half", n.half), ud(t, "ignorePixelSnap", n.ignorePixelSnap), t;
		}
		return this.__world;
	}
	getClampRenderScale() {
		let { scaleX: e } = this.__nowWorld || this.__world;
		return e < 0 && (e = -e), e > 1 ? e : 1;
	}
	getRenderScaleData(e, t, n = !0) {
		return _d(Dc.patternLocked ? this.__world : this.__nowWorld || this.__world, t, n, e);
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
		let r = t ? jd(this, t) : this.worldTransform, i = n ? e : {};
		return md(e, r, i), i;
	}
	worldToLocal(e, t, n, r) {
		this.parent ? this.parent.worldToInner(e, t, n, r) : t && hd(t, e);
	}
	localToWorld(e, t, n, r) {
		this.parent ? this.parent.innerToWorld(e, t, n, r) : t && hd(t, e);
	}
	worldToInner(e, t, n, r) {
		r && (r.innerToWorld(e, t, n), e = t || e), dd(this.worldTransform, e, t, n);
	}
	innerToWorld(e, t, n, r) {
		fd(this.worldTransform, e, t, n), r && r.worldToInner(t || e, null, n);
	}
	getBoxPoint(e, t, n, r) {
		let i = this.getInnerPoint(e, t, n, r);
		return n ? i : this.getBoxPointByInner(i, null, null, !0);
	}
	getBoxPointByInner(e, t, n, r) {
		let i = r ? e : Object.assign({}, e), { x: a, y: o } = this.boxBounds;
		return gd(i, -a, -o), i;
	}
	getInnerPoint(e, t, n, r) {
		let i = r ? e : {};
		return this.worldToInner(e, i, n, t), i;
	}
	getInnerPointByBox(e, t, n, r) {
		let i = r ? e : Object.assign({}, e), { x: a, y: o } = this.boxBounds;
		return gd(i, a, o), i;
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
		Od(this, e, t, n, r);
	}
	transform(e, t, n, r) {
		Ed(this, e, t, n, r);
	}
	move(e, t, n) {
		vd(this, e, t, n);
	}
	moveInner(e, t, n) {
		Sd(this, e, t, !0, n);
	}
	scaleOf(e, t, n, r, i, a) {
		yd(this, Ad(this, e), t, n, r, i, a);
	}
	rotateOf(e, t, n) {
		bd(this, Ad(this, e), t, n);
	}
	skewOf(e, t, n, r, i) {
		xd(this, Ad(this, e), t, n, r, i);
	}
	transformWorld(e, t, n, r) {
		Dd(this, e, t, n, r);
	}
	moveWorld(e, t, n) {
		Sd(this, e, t, !1, n);
	}
	scaleOfWorld(e, t, n, r, i, a) {
		Cd(this, e, t, n, r, i, a);
	}
	rotateOfWorld(e, t) {
		wd(this, e, t);
	}
	skewOfWorld(e, t, n, r, i) {
		Td(this, e, t, n, r, i);
	}
	flip(e, t) {
		Ed(this, kd(this, e), !1, t);
	}
	remove(e, t) {
		this.parent && this.parent.remove(this, t);
	}
	dropTo(e, t, n) {
		Md(this, e, t, n);
	}
	static changeAttr(e, t, n) {
		n ? this.addAttr(e, t, n) : dl(this.prototype, e, t);
	}
	static addAttr(e, t, n, r) {
		n ||= K, n(t, r)(this.prototype, e);
	}
	__emitLifeEvent(e) {
		this.hasEvent(e) && this.emitEvent(new cu(e, this, this.parent));
	}
	destroy() {
		this.destroyed ||= (this.parent && this.remove(), this.children && this.clear(), this.__emitLifeEvent(cu.DESTROY), this.__.destroy(), this.__layout.destroy(), this.destroyEventer(), !0);
	}
};
Nd = H([
	vl(Hu),
	vl(Yu),
	vl(rd),
	vl(Bu),
	vl(id)
], Nd);
var { setListWithFn: Pd } = B, { sort: Fd } = Wl, { localBoxBounds: Id, localStrokeBounds: Ld, localRenderBounds: Rd, maskLocalBoxBounds: zd, maskLocalStrokeBounds: Bd, maskLocalRenderBounds: Vd } = Bl, Hd = new Ai("Branch"), Ud = class extends Nd {
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
		Pd(t || this.__layout.boxBounds, this.children, this.__hasMask ? zd : Id);
	}
	__updateStrokeBounds(e) {
		Pd(e || this.__layout.strokeBounds, this.children, this.__hasMask ? Bd : Ld);
	}
	__updateRenderBounds(e) {
		Pd(e || this.__layout.renderBounds, this.children, this.__hasMask ? Vd : Rd);
	}
	__updateSortChildren() {
		let e, { children: t } = this;
		if (t.length > 1) {
			for (let n = 0, r = t.length; n < r; n++) t[n].__tempNumber = n, t[n].__.zIndex && (e = !0);
			t.sort(Fd), this.__layout.affectChildrenSort = e;
		}
		this.__layout.childrenSortChanged = !1;
	}
	add(e, t) {
		if (e === this || e.destroyed) return Hd.warn("add self or destroyed");
		let n = P(t);
		if (!e.__) {
			if (Gn(e)) return e.forEach((e) => {
				this.add(e, t), n || t++;
			});
			if (!(e = Bi.get(e.tag, e))) return;
		}
		e.parent && e.parent.remove(e), e.parent = this, n ? this.children.push(e) : this.children.splice(t, 0, e), e.isBranch && (this.__.__childBranchNumber = (this.__.__childBranchNumber || 0) + 1);
		let r = e.__layout;
		r.boxChanged || r.boxChange(), r.matrixChanged || r.matrixChange(), e.__bubbleMap && e.__emitLifeEvent(cu.ADD), this.leafer && (e.__bindLeafer(this.leafer), this.leafer.created && this.__emitChildEvent(cu.ADD, e)), this.isFrame && e.__bindFrame(this), this.__layout.affectChildrenSort && this.__layout.childrenSortChange();
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
		e.__emitLifeEvent(cu.REMOVE), e.parent = null, this.leafer && (e.__bindLeafer(null), this.leafer.created && (this.__emitChildEvent(cu.REMOVE, e), this.leafer.hitCanvasManager && this.leafer.hitCanvasManager.clear())), this.isFrame && e.__bindFrame(null);
	}
	__emitChildEvent(e, t) {
		let n = new cu(e, t, this);
		this.hasEvent(e) && !this.isLeafer && this.emitEvent(n), this.leafer.emitEvent(n);
	}
};
Ud = H([vl(sd)], Ud);
var Wd = class e {
	get length() {
		return this.list.length;
	}
	constructor(e) {
		this.reset(), e && (Gn(e) ? this.addList(e) : this.add(e));
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
}, Gd = class {
	get length() {
		return this._length;
	}
	constructor(e) {
		this._length = 0, this.reset(), e && (Gn(e) ? this.addList(e) : this.add(e));
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
function Kd(e) {
	return Fc(e, (e) => Ic({ set(t) {
		this.__setAttr(e, t), t && (this.__.__useEffect = !0);
		let n = this.__layout;
		n.renderChanged || n.renderChange(), n.surfaceChange();
	} }));
}
function qd(e) {
	return Fc(e, (e) => Ic({ set(t) {
		this.__setAttr(e, t), this.__layout.boxChanged || this.__layout.boxChange(), this.__updateSize();
	} }));
}
function Jd() {
	return (e, t) => {
		let n = "_" + t;
		Mc(e, t, {
			set(e) {
				this.isLeafer && (this[n] = e);
			},
			get() {
				return this.isApp ? this.tree.zoomLayer : this.isLeafer ? this[n] || this : this.leafer && this.leafer.zoomLayer;
			}
		});
	};
}
var Yd = {}, Xd = { hasTransparent: function(e) {
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
} }, Zd = wi, Qd = {}, Y = {}, $d = {}, ef = {}, tf = {}, nf = { apply() {
	Li.need("filter");
} }, rf = {}, af = {
	setStyleName: () => Li.need("state"),
	set: () => Li.need("state")
}, of = {
	list: {},
	register(e, t) {
		of.list[e] = t;
	},
	get: (e) => of.list[e]
}, { parse: sf, objectToCanvasData: cf } = Oo, { stintSet: lf } = Jn, { hasTransparent: uf } = Xd, df = { originPaint: {} }, ff = Ai.get("UIData"), pf = class extends Xn {
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
		e < 0 ? (this._width = -e, this.__leaf.scaleX *= -1, ff.warn("width < 0, instead -scaleX ", this)) : this._width = e;
	}
	setHeight(e) {
		e < 0 ? (this._height = -e, this.__leaf.scaleY *= -1, ff.warn("height < 0, instead -scaleY", this)) : this._height = e;
	}
	setFill(e) {
		this.__naturalWidth && this.__removeNaturalSize(), Un(e) || !e ? (lf(this, "__isTransparentFill", uf(e)), this.__isFills && this.__removePaint("fill", !0), this._fill = e) : I(e) && this.__setPaint("fill", e);
	}
	setStroke(e) {
		Un(e) || !e ? (lf(this, "__isTransparentStroke", uf(e)), this.__isStrokes && this.__removePaint("stroke", !0), this._stroke = e) : I(e) && this.__setPaint("stroke", e);
	}
	setPath(e) {
		let t = Un(e);
		t || e && I(e[0]) ? (this.__setInput("path", e), this._path = t ? sf(e, this.__useArrow) : cf(e)) : (this.__input && this.__removeInput("path"), this._path = e);
	}
	setShadow(e) {
		mf(this, "shadow", e);
	}
	setInnerShadow(e) {
		mf(this, "innerShadow", e);
	}
	setFilter(e) {
		mf(this, "filter", e);
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
		lf(e, "__complex", e.__isFills || e.__isStrokes || e.cornerRadius || e.__useEffect);
	}
	__setPaint(e, t) {
		this.__setInput(e, t);
		let n = this.__leaf.__layout;
		n.boxChanged || n.boxChange(), Gn(t) && !t.length ? this.__removePaint(e) : e === "fill" ? (this.__isFills = !0, this._fill ||= df) : (this.__isStrokes = !0, this._stroke ||= df);
	}
	__removePaint(e, t) {
		t && this.__removeInput(e), $d.recycleImage(e, this), e === "fill" ? (lf(this, "__isAlphaPixelFill", void 0), this._fill = this.__isFills = void 0) : (lf(this, "__isAlphaPixelStroke", void 0), lf(this, "__hasMultiStrokeStyle", void 0), this._stroke = this.__isStrokes = void 0);
	}
};
function mf(e, t, n) {
	e.__setInput(t, n), Gn(n) ? (n.some((e) => !1 === e.visible) && (n = n.filter((e) => !1 !== e.visible)), n.length || (n = void 0)) : n = n && !1 !== n.visible ? [n] : void 0, e["_" + t] = n;
}
var hf = class extends pf {}, gf = class extends hf {
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
}, _f = class extends hf {
	__getInputData(e, t) {
		let n = super.__getInputData(e, t);
		return na.forEach((e) => delete n[e]), n;
	}
}, vf = class extends gf {}, yf = class extends pf {
	get __usePathBox() {
		return this.points || this.__pathInputed;
	}
}, bf = class extends pf {
	get __boxStroke() {
		return !this.__pathInputed;
	}
}, xf = class extends pf {
	get __boxStroke() {
		return !this.__pathInputed;
	}
}, Sf = class extends pf {
	get __usePathBox() {
		return this.points || this.__pathInputed;
	}
}, Cf = class extends pf {}, wf = class extends pf {
	get __pathInputed() {
		return 2;
	}
}, Tf = class extends hf {}, Ef = {
	thin: 100,
	"extra-light": 200,
	light: 300,
	normal: 400,
	medium: 500,
	"semi-bold": 600,
	bold: 700,
	"extra-bold": 800,
	black: 900
}, Df = class extends pf {
	get __useNaturalRatio() {
		return !1;
	}
	setFontWeight(e) {
		Un(e) ? (this.__setInput("fontWeight", e), e = Ef[e] || 400) : this.__input && this.__removeInput("fontWeight"), this._fontWeight = e;
	}
	setBoxStyle(e) {
		let t = this.__leaf, n = t.__box;
		if (e) {
			let { boxStyle: r } = this;
			if (n) for (let e in r) n[e] = void 0;
			else n = t.__box = Bi.get("Rect", 0);
			let i = t.__layout, a = n.__layout;
			r || (n.parent = t, n.__world = t.__world, a.boxBounds = i.boxBounds), n.set(e), a.strokeChanged && i.strokeChange();
		} else n && (t.__box = n.parent = null, n.destroy());
		this._boxStyle = e;
	}
	__getInputData(e, t) {
		let n = super.__getInputData(e, t);
		return n.textEditing && delete n.textEditing, n;
	}
}, Of = class extends bf {
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
}, kf = class extends bf {
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
}, { max: Af, add: jf } = ir, Mf = {
	__updateStrokeSpread() {
		let e = 0, t = 0, n = this.__, { strokeAlign: r, __maxStrokeWidth: i } = n, a = this.__box;
		if ((n.stroke || n.hitStroke === "all") && i && r !== "inside" && (t = e = r === "center" ? i / 2 : i, !n.__boxStroke || n.__useArrow)) {
			let t = n.__isLinePath ? 0 : (n.strokeJoin === "miter" ? 10 : 1) * e, r = n.strokeCap === "none" ? 0 : i;
			e += Math.max(t, r);
		}
		return n.__useArrow && (e += 5 * i), a && (e = Af(e, a.__layout.strokeSpread = a.__updateStrokeSpread()), t = Math.max(t, a.__layout.strokeBoxSpread)), this.__layout.strokeBoxSpread = t, e;
	},
	__updateRenderSpread() {
		let e = 0, { shadow: t, innerShadow: n, blur: r, backgroundBlur: i, filter: a, renderSpread: o } = this.__, { strokeSpread: s } = this.__layout, c = this.__box;
		t && (e = tf.getShadowRenderSpread(this, t)), r && (e = Af(e, r)), a && (e = jf(e, nf.getSpread(a))), o && (e = jf(e, o)), s && (e = jf(e, s));
		let l = e;
		return n && (l = Af(l, tf.getInnerShadowSpread(this, n))), i && (l = Af(l, i)), this.__layout.renderShapeSpread = l, c ? Af(c.__updateRenderSpread(), e) : e;
	}
}, { stintSet: Nf } = Jn, Pf = {
	__updateChange() {
		let e = this.__;
		if (e.__useStroke) {
			let t = e.__useStroke = !(!e.stroke || !e.strokeWidth);
			Nf(this.__world, "half", t && e.strokeAlign === "center" && e.strokeWidth % 2), Nf(e, "__fillAfterStroke", t && e.strokeAlign === "outside" && e.fill && !e.__isTransparentFill);
		}
		if (e.__useEffect) {
			let { shadow: t, fill: n, stroke: r } = e, i = e.innerShadow || e.blur || e.backgroundBlur || e.filter;
			Nf(e, "__isFastShadow", t && !i && t.length < 2 && !t[0].spread && !tf.isTransformShadow(t[0]) && n && !e.__isTransparentFill && !(Gn(n) && n.length > 1) && (this.useFastShadow || !r || r && e.strokeAlign === "inside")), e.__useEffect = !(!t && !i);
		}
		e.__checkSingle(), e.__checkComplex();
	},
	__drawFast(e, t) {
		Ff(this, e, t);
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
				l && tf.shadow(this, e, c), s && (r.__isStrokes ? Y.strokes(a, this, e, t) : Y.stroke(a, this, e, t)), i && (r.__isFills ? Y.fills(i, this, e, t) : Y.fill(i, this, e, t)), o && this.__drawAfterFill(e, t), u && tf.innerShadow(this, e, c), a && !s && (r.__isStrokes ? Y.strokes(a, this, e, t) : Y.stroke(a, this, e, t)), d && nf.apply(d, this, this.__nowWorld, e, n, c), c.worldCanvas && c.worldCanvas.recycle(), c.canvas.recycle();
			} else {
				if (s && (r.__isStrokes ? Y.strokes(a, this, e, t) : Y.stroke(a, this, e, t)), c) {
					let t = r.shadow[0], { scaleX: n, scaleY: i } = this.getRenderScaleData(!0, t.scaleFixed);
					e.save(), e.setWorldShadow(t.x * n, t.y * i, t.blur * n, Xd.string(t.color));
				}
				i && (r.__isFills ? Y.fills(i, this, e, t) : Y.fill(i, this, e, t)), c && e.restore(), o && this.__drawAfterFill(e, t), a && !s && (r.__isStrokes ? Y.strokes(a, this, e, t) : Y.stroke(a, this, e, t));
			}
		} else r.__pathForRender ? Ff(this, e, t) : this.__drawFast(e, t);
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
function Ff(e, t, n) {
	let { fill: r, stroke: i, __drawAfterFill: a, __fillAfterStroke: o } = e.__;
	e.__drawRenderPath(t), o && Y.stroke(i, e, t, n), r && Y.fill(r, e, t, n), a && e.__drawAfterFill(t, n), i && !o && Y.stroke(i, e, t, n);
}
var If = { __drawFast(e, t) {
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
} }, Lf, X = Lf = class extends Nd {
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
		hr.assignScale(this, e);
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
		return gc.set(this.path = e || []), e || this.__drawPathByBox(gc), gc;
	}
	set(e, t) {
		e && Object.assign(this, e);
	}
	get(e) {
		return Un(e) ? this.__.__getInput(e) : this.__.__getInputData(e);
	}
	find(e, t) {
		return Li.need("find");
	}
	findTag(e) {
		return this.find({ tag: e });
	}
	findOne(e, t) {
		return Li.need("find");
	}
	findId(e) {
		return this.findOne({ id: e });
	}
	getPath(e, t) {
		this.__layout.update();
		let n = t ? this.__.__pathForRender : this.__.path;
		return n || (gc.set(n = []), this.__drawPathByBox(gc, !t)), e ? Oo.toCanvasData(n, !0) : n;
	}
	getPathString(e, t, n) {
		return Oo.stringify(this.getPath(e, t), n);
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
			!e.lazy || this.__inLazyBounds || rf.running ? e.__computePaint() : e.__needComputePaint = !0;
		}
	}
	__updatePath() {}
	__updateRenderPath(e) {
		let t = this.__;
		t.path ? (t.__pathForRender = t.cornerRadius || t.path.radius ? mc.smooth(t.path, t.cornerRadius, t.cornerSmoothing) : t.path, t.__useArrow && Qd.addArrows(this, e)) : t.__pathForRender &&= void 0;
	}
	__drawRenderPath(e) {
		let t = this.__;
		e.beginPath(), t.__useArrow && Qd.updateArrow(this), this.__drawPathByData(e, t.__pathForRender);
	}
	__drawPath(e) {
		let t = this.__;
		e.beginPath(), t.__usePointsMode ? ks.drawPathByPoints(e, t.points, t.closed) : this.__drawPathByData(e, t.path, !0);
	}
	__drawPathByData(e, t, n) {
		t ? ks.drawPathByData(e, t) : this.__drawPathByBox(e, n);
	}
	__drawPathByBox(e, t) {
		let { x: n, y: r, width: i, height: a } = this.__layout.boxBounds;
		if (this.__.cornerRadius && !t) {
			let { cornerRadius: t } = this.__;
			e.roundRect(n, r, i, a, F(t) ? [t] : t);
		} else e.rect(n, r, i, a);
		e.closePath();
	}
	drawImagePlaceholder(e, t, n) {
		Y.fill(this.__.placeholderColor, this, t, n);
	}
	animate(e, t, n, r) {
		return this.set(e), Li.need("animate");
	}
	killAnimate(e, t) {}
	export(e, t) {
		return Li.need("export");
	}
	syncExport(e, t) {
		return Li.need("export");
	}
	clone(e) {
		let t = Jn.clone(this.toJSON());
		return e && Object.assign(t, e), Lf.one(t);
	}
	static one(e, t, n, r, i) {
		return Bi.get(e.tag || this.prototype.__tag, e, t, n, r, i);
	}
	static registerUI() {
		yl()(this);
	}
	static registerData(e) {
		ul(e)(this.prototype);
	}
	static setEditConfig(e) {}
	static setEditOuter(e) {}
	static setEditInner(e) {}
	destroy() {
		this.__.__willDestroy = !0, this.fill = this.stroke = null, this.__animate && this.killAnimate(), super.destroy();
	}
};
J([ul(pf)], X.prototype, "__", void 0), J([Jd()], X.prototype, "zoomLayer", void 0), J([Rc("")], X.prototype, "id", void 0), J([Rc("")], X.prototype, "name", void 0), J([Rc("")], X.prototype, "className", void 0), J([Qc("pass-through")], X.prototype, "blendMode", void 0), J([tl(1)], X.prototype, "opacity", void 0), J([nl(!0)], X.prototype, "visible", void 0), J([Qc(!1)], X.prototype, "locked", void 0), J([el(!1)], X.prototype, "dim", void 0), J([el(!1)], X.prototype, "dimskip", void 0), J([al(0)], X.prototype, "zIndex", void 0), J([ol(!1)], X.prototype, "mask", void 0), J([sl(!1)], X.prototype, "eraser", void 0), J([zc(0, !0)], X.prototype, "x", void 0), J([zc(0, !0)], X.prototype, "y", void 0), J([K(100, !0)], X.prototype, "width", void 0), J([K(100, !0)], X.prototype, "height", void 0), J([Hc(1, !0)], X.prototype, "scaleX", void 0), J([Hc(1, !0)], X.prototype, "scaleY", void 0), J([Uc(0, !0)], X.prototype, "rotation", void 0), J([Uc(0, !0)], X.prototype, "skewX", void 0), J([Uc(0, !0)], X.prototype, "skewY", void 0), J([zc(0, !0)], X.prototype, "offsetX", void 0), J([zc(0, !0)], X.prototype, "offsetY", void 0), J([Bc(0, !0)], X.prototype, "scrollX", void 0), J([Bc(0, !0)], X.prototype, "scrollY", void 0), J([Vc()], X.prototype, "origin", void 0), J([Vc()], X.prototype, "around", void 0), J([Rc(!1)], X.prototype, "lazy", void 0), J([Wc(1)], X.prototype, "pixelRatio", void 0), J([Zc(0)], X.prototype, "renderSpread", void 0), J([Kc()], X.prototype, "path", void 0), J([qc()], X.prototype, "windingRule", void 0), J([qc(!0)], X.prototype, "closed", void 0), J([K(0)], X.prototype, "padding", void 0), J([K(!1)], X.prototype, "lockRatio", void 0), J([K()], X.prototype, "widthRange", void 0), J([K()], X.prototype, "heightRange", void 0), J([Rc(!1)], X.prototype, "draggable", void 0), J([Rc()], X.prototype, "dragBounds", void 0), J([Rc("auto")], X.prototype, "dragBoundsType", void 0), J([Rc(!1)], X.prototype, "editable", void 0), J([cl(!0)], X.prototype, "hittable", void 0), J([cl()], X.prototype, "hitThrough", void 0), J([cl("path")], X.prototype, "hitFill", void 0), J([Xc("path")], X.prototype, "hitStroke", void 0), J([cl(!1)], X.prototype, "hitBox", void 0), J([cl(!0)], X.prototype, "hitChildren", void 0), J([cl(!0)], X.prototype, "hitSelf", void 0), J([cl()], X.prototype, "hitRadius", void 0), J([ll("")], X.prototype, "cursor", void 0), J([Qc()], X.prototype, "fill", void 0), J([Xc(void 0, !0)], X.prototype, "stroke", void 0), J([Xc("inside")], X.prototype, "strokeAlign", void 0), J([Xc(1, !0)], X.prototype, "strokeWidth", void 0), J([Xc(!1)], X.prototype, "strokeScaleFixed", void 0), J([Xc("none")], X.prototype, "strokeCap", void 0), J([Xc("miter")], X.prototype, "strokeJoin", void 0), J([Xc()], X.prototype, "dashPattern", void 0), J([Xc(0)], X.prototype, "dashOffset", void 0), J([Xc(10)], X.prototype, "miterLimit", void 0), J([qc(0)], X.prototype, "cornerRadius", void 0), J([qc()], X.prototype, "cornerSmoothing", void 0), J([Kd()], X.prototype, "shadow", void 0), J([Kd()], X.prototype, "innerShadow", void 0), J([Kd()], X.prototype, "blur", void 0), J([Kd()], X.prototype, "backgroundBlur", void 0), J([Kd()], X.prototype, "grayscale", void 0), J([Kd()], X.prototype, "filter", void 0), J([Qc()], X.prototype, "placeholderColor", void 0), J([Rc(100)], X.prototype, "placeholderDelay", void 0), J([Rc({})], X.prototype, "data", void 0), X = Lf = J([
	vl(Mf),
	vl(Pf),
	gl()
], X);
var Rf = class extends X {
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
}, zf;
J([ul(hf)], Rf.prototype, "__", void 0), J([K(0)], Rf.prototype, "width", void 0), J([K(0)], Rf.prototype, "height", void 0), Rf = J([vl(Ud), yl()], Rf);
var Bf = Ai.get("Leafer"), Vf = zf = class extends Rf {
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
		return this.viewReady && Tc.isComplete;
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
		return this.canvas && this.canvas.getClientBounds(!0) || br();
	}
	constructor(e, t) {
		super(t), this.config = {
			start: !0,
			hittable: !0,
			smooth: !0,
			lazySpeard: 100
		}, this.leafs = 0, this.__eventIds = [], this.__controllers = [], this.__readyWait = [], this.__viewReadyWait = [], this.__viewCompletedWait = [], this.__nextRenderWait = [], this.userConfig = e, e && (e.view || e.width) && this.init(e), zf.list.add(this);
	}
	init(e, t) {
		if (this.canvas) return;
		let n, { config: r } = this;
		this.__setLeafer(this), t && (this.parentApp = t, this.__bindApp(t), n = t.running), e && (this.parent = t, this.initType(e.type), this.parent = void 0, Jn.assign(r, e));
		let i = this.canvas = Ri.canvas(r);
		this.__controllers.push(this.renderer = Ri.renderer(this, i, r), this.watcher = Ri.watcher(this, r), this.layouter = Ri.layouter(this, r)), this.isApp && this.__setApp(), this.__checkAutoLayout(), t || (this.selector = Ri.selector(this), this.interaction = Ri.interaction(this, i, this.selector, r), this.interaction && (this.__controllers.unshift(this.interaction), this.hitCanvasManager = Ri.hitCanvasManager()), this.canvasManager = new Gi(), n = r.start), this.hittable = r.hittable, this.fill = r.fill, this.canvasManager.add(i), this.__listenEvents(), n && (this.__startTimer = setTimeout(this.start.bind(this))), Xl.run(this.__initWait), this.onInit();
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
		let t = Jn.copyAttrs({}, e, na);
		Object.keys(t).forEach((e) => this[e] = t[e]);
	}
	forceRender(e, t) {
		let { renderer: n } = this;
		n && (n.addBlock(e ? new xi(e) : this.canvas.bounds), this.viewReady && (t ? n.render() : n.update()));
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
		let n = Jn.copyAttrs({}, this.canvas, na);
		t.resize(e), this.updateLazyBounds(), this.__onResize(new yu(e, n));
	}
	__onResize(e) {
		this.emitEvent(e), Jn.copyAttrs(this.__, e, na), setTimeout(() => {
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
		t || (e.width && e.height || (this.autoLayout = new Ci(e)), this.canvas.startAutoLayout(this.autoLayout, this.__onResize.bind(this)));
	}
	__setAttr(e, t) {
		return this.canvas && (na.includes(e) ? this.__changeCanvasSize(e, t) : e === "fill" ? this.__changeFill(t) : e === "hittable" ? this.parent || (this.canvas.hittable = t) : e === "zIndex" ? (this.canvas.zIndex = t, setTimeout(() => this.parent && this.parent.__updateSortChildren())) : e === "mode" && this.emit(q.UPDATE_MODE, { mode: t })), super.__setAttr(e, t);
	}
	__getAttr(e) {
		return this.canvas && na.includes(e) ? this.canvas[e] : super.__getAttr(e);
	}
	__changeCanvasSize(e, t) {
		let { config: n, canvas: r } = this, i = Jn.copyAttrs({}, r, na);
		i[e] = n[e] = t, n.width && n.height ? r.stopAutoLayout() : this.__checkAutoLayout(), this.__doResize(i);
	}
	__changeFill(e) {
		this.config.fill = e, this.canvas.allowBackgroundColor ? this.canvas.backgroundColor = e : this.forceRender();
	}
	__onCreated() {
		this.created = !0;
	}
	__onReady() {
		this.ready = !0, this.emitLeafer(q.BEFORE_READY), this.emitLeafer(q.READY), this.emitLeafer(q.AFTER_READY), Xl.run(this.__readyWait);
	}
	__onViewReady() {
		this.viewReady || (this.viewReady = !0, this.emitLeafer(q.VIEW_READY), Xl.run(this.__viewReadyWait));
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
			Xl.run(this.__nextRenderWait);
			let { imageReady: e } = this;
			e && !this.viewCompleted && this.__checkViewCompleted(), e || (this.viewCompleted = !1, this.requestRender());
		} else this.requestRender();
	}
	__checkViewCompleted(e = !0) {
		this.nextRender(() => {
			this.imageReady && (e && this.emitLeafer(q.VIEW_COMPLETED), Xl.run(this.__viewCompletedWait), this.viewCompleted = !0);
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
		return Li.need("view");
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
		let e = Pi.start("FirstCreate " + this.innerName);
		this.once([
			[q.START, () => Pi.end(e)],
			[
				xu.START,
				this.updateLazyBounds,
				this
			],
			[
				Su.START,
				this.__onCreated,
				this
			],
			[
				Su.END,
				this.__onViewReady,
				this
			]
		]), this.__eventIds.push(this.on_([
			[
				bu.DATA,
				this.__onWatchData,
				this
			],
			[
				xu.END,
				this.__onLayoutEnd,
				this
			],
			[
				Su.NEXT,
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
				zf.list.remove(this);
				try {
					this.stop(), this.emitLeafer(q.END), this.__removeListenEvents(), this.__controllers.forEach((e) => !(this.parent && e === this.interaction) && e.destroy()), this.__controllers.length = 0, this.parent || (this.selector && this.selector.destroy(), this.hitCanvasManager && this.hitCanvasManager.destroy(), this.canvasManager && this.canvasManager.destroy()), this.canvas && this.canvas.destroy(), this.config.view = this.parentApp = null, this.userConfig && (this.userConfig.view = null), super.destroy(), setTimeout(() => {
						Dc.clearRecycled();
					}, 100);
				} catch (e) {
					Bf.error(e);
				}
			}
		};
		e ? t() : setTimeout(t);
	}
};
Vf.list = new Wd(), J([ul(_f)], Vf.prototype, "__", void 0), J([K()], Vf.prototype, "pixelRatio", void 0), J([Rc("normal")], Vf.prototype, "mode", void 0), Vf = zf = J([yl()], Vf);
var Hf = class extends X {
	get __tag() {
		return "Rect";
	}
};
J([ul(bf)], Hf.prototype, "__", void 0), Hf = J([
	vl(If),
	gl(),
	yl()
], Hf);
var { add: Uf, includes: Wf, scroll: Gf } = B, Kf = Hf.prototype, qf = Rf.prototype, Jf = class extends Rf {
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
			let n = this.__, r = this.__layout, { renderBounds: i, boxBounds: a } = r, { overflow: o } = n, s = r.childrenRenderBounds ||= br();
			super.__updateRenderBounds(s), (t = o && o.includes("scroll")) && (Uf(s, a), Gf(s, n)), this.__updateRectRenderBounds(), e = !Wf(a, s), e && o === "show" && Uf(i, s);
		} else this.__updateRectRenderBounds();
		Jn.stintSet(this, "isOverflow", e), this.__checkScroll(t);
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
J([ul(gf)], Jf.prototype, "__", void 0), J([K(100)], Jf.prototype, "width", void 0), J([K(100)], Jf.prototype, "height", void 0), J([Rc(!1)], Jf.prototype, "resizeChildren", void 0), J([Zc("show")], Jf.prototype, "overflow", void 0), J([hl(Kf.__updateStrokeSpread)], Jf.prototype, "__updateStrokeSpread", null), J([hl(Kf.__updateRenderSpread)], Jf.prototype, "__updateRectRenderSpread", null), J([hl(Kf.__updateBoxBounds)], Jf.prototype, "__updateRectBoxBounds", null), J([hl(Kf.__updateStrokeBounds)], Jf.prototype, "__updateStrokeBounds", null), J([hl(Kf.__updateRenderBounds)], Jf.prototype, "__updateRectRenderBounds", null), J([hl(Kf.__updateChange)], Jf.prototype, "__updateRectChange", null), J([hl(Kf.__render)], Jf.prototype, "__renderRect", null), J([hl(qf.__render)], Jf.prototype, "__renderGroup", null), Jf = J([gl(), yl()], Jf);
var Yf = class extends Jf {
	get __tag() {
		return "Frame";
	}
	get isFrame() {
		return !0;
	}
};
J([ul(vf)], Yf.prototype, "__", void 0), J([Qc("#FFFFFF")], Yf.prototype, "fill", void 0), J([Zc("hide")], Yf.prototype, "overflow", void 0), Yf = J([yl()], Yf);
var { moveTo: Xf, closePath: Zf, ellipse: Qf } = Zo, { tempPoint: $f, set: ep, rotate: tp } = z, { abs: np } = Math, rp = {}, ip = class extends X {
	get __tag() {
		return "Ellipse";
	}
	__updatePath() {
		let e = this.__, { width: t, height: n, innerRadius: r, startAngle: i, endAngle: a, closed: o } = e, s = t / 2, c = n / 2, l = e.path = [], u, d, f;
		if ((i || a) && (d = !0), d && (f = np(a - i) === 360), r) {
			let e = r < 1 || o, n, p = i, m = a;
			d ? e ? (Qf(l, s, c, s * r, c * r, 0, i, a), f && (ep($f, t, c), ep(rp, s, c), tp($f, a, rp, s, c), Xf(l, $f.x, $f.y)), p = a, m = i, n = !0) : f || (u = !0) : e ? (Qf(l, s, c, s * r, c * r), Zf(l), Xf(l, t, c), p = 360, n = !0) : m = 360, Qf(l, s, c, s, c, 0, p, m, n);
		} else d ? (f || (o || (u = !0), u || Xf(l, s, c)), Qf(l, s, c, s, c, 0, i, a)) : Qf(l, s, c, s, c);
		u || Zf(l), (V.ellipseToCurve || e.__useArrow || e.cornerRadius) && (e.path = this.getPath(!0));
	}
};
J([ul(xf)], ip.prototype, "__", void 0), J([qc(0)], ip.prototype, "innerRadius", void 0), J([qc(0)], ip.prototype, "startAngle", void 0), J([qc(0)], ip.prototype, "endAngle", void 0), ip = J([yl()], ip);
var { sin: ap, cos: op, PI: sp } = Math, { moveTo: cp, lineTo: lp, closePath: up, drawPoints: dp } = Zo, fp = class extends X {
	get __tag() {
		return "Polygon";
	}
	get isPointsMode() {
		return this.points && !this.pathInputed;
	}
	__updatePath() {
		let e = this.__, t = e.path = [];
		if (e.points) dp(t, e.points, e.curve, e.closed);
		else {
			let { width: n, height: r, sides: i, startAngle: a } = e, o = n / 2, s = r / 2, c, l = 0;
			a ? (l = a * L, cp(t, o + o * ap(l), s - s * op(l))) : cp(t, o, 0);
			for (let e = 1; e < i; e++) c = 2 * e * sp / i + l, lp(t, o + o * ap(c), s - s * op(c));
			up(t);
		}
	}
};
J([ul(Sf)], fp.prototype, "__", void 0), J([qc(3)], fp.prototype, "sides", void 0), J([qc(0)], fp.prototype, "startAngle", void 0), J([qc()], fp.prototype, "points", void 0), J([qc(0)], fp.prototype, "curve", void 0), fp = J([gl(), yl()], fp);
var { sin: pp, cos: mp, PI: hp } = Math, { moveTo: gp, lineTo: _p, closePath: vp } = Zo, yp = class extends X {
	get __tag() {
		return "Star";
	}
	__updatePath() {
		let { width: e, height: t, corners: n, innerRadius: r, startAngle: i } = this.__, a = e / 2, o = t / 2, s = this.__.path = [], c, l = 0;
		i ? (l = i * L, gp(s, a + a * pp(l), o - o * mp(l))) : gp(s, a, 0);
		for (let e = 1; e < 2 * n; e++) c = e * hp / n + l, _p(s, a + (e % 2 == 0 ? a : a * r) * pp(c), o - (e % 2 == 0 ? o : o * r) * mp(c));
		vp(s);
	}
};
J([ul(Cf)], yp.prototype, "__", void 0), J([qc(5)], yp.prototype, "corners", void 0), J([qc(.382)], yp.prototype, "innerRadius", void 0), J([qc(0)], yp.prototype, "startAngle", void 0), yp = J([yl()], yp);
var { moveTo: bp, lineTo: xp, drawPoints: Sp } = Zo, { rotate: Cp, getAngle: wp, getDistance: Tp, defaultPoint: Ep } = z, Dp = class extends X {
	get __tag() {
		return "Line";
	}
	get isPointsMode() {
		return this.points && !this.pathInputed;
	}
	get toPoint() {
		let { width: e, rotation: t } = this.__, n = yr();
		return e && (n.x = e), t && Cp(n, t), n;
	}
	set toPoint(e) {
		this.width = Tp(Ep, e), this.rotation = wp(Ep, e), this.height &&= 0;
	}
	__updatePath() {
		let e = this.__, t = e.path = [];
		e.points ? Sp(t, e.points, e.curve, e.closed) : (bp(t, 0, 0), xp(t, this.width, 0));
	}
};
J([ul(yf)], Dp.prototype, "__", void 0), J([Jc("center")], Dp.prototype, "strokeAlign", void 0), J([K(0)], Dp.prototype, "height", void 0), J([qc()], Dp.prototype, "points", void 0), J([qc(0)], Dp.prototype, "curve", void 0), J([qc(!1)], Dp.prototype, "closed", void 0), Dp = J([yl()], Dp);
var Op = class extends Hf {
	get __tag() {
		return "Image";
	}
	get ready() {
		let { image: e } = this;
		return e && e.ready;
	}
	get image() {
		let { fill: e } = this.__;
		return Gn(e) && e[0].image;
	}
};
J([ul(Of)], Op.prototype, "__", void 0), J([K("")], Op.prototype, "url", void 0), Op = J([yl()], Op);
var kp = class extends Hf {
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
		super(e), this.canvas = Ri.canvas(this.__), e && e.url && this.drawImage(e.url);
	}
	drawImage(e) {
		new jc({ url: e }).load((e) => {
			this.context.drawImage(e.view, 0, 0), this.url = void 0, this.paint(), this.emitEvent(new fu(fu.LOADED, { image: e }));
		});
	}
	draw(e, t, n, r) {
		let i = new Kr(e.worldTransform).invert(), a = new Kr();
		t && a.translate(t.x, t.y), n && (F(n) ? a.scale(n) : a.scale(n.x, n.y)), r && a.rotate(r), i.multiplyParent(a), e.__render(this.canvas, { matrix: i.withScale() }), this.paint();
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
J([ul(kf)], kp.prototype, "__", void 0), J([qd(100)], kp.prototype, "width", void 0), J([qd(100)], kp.prototype, "height", void 0), J([qd(1)], kp.prototype, "pixelRatio", void 0), J([qd(!0)], kp.prototype, "smooth", void 0), J([Rc(!1)], kp.prototype, "safeResize", void 0), J([qd()], kp.prototype, "contextSettings", void 0), kp = J([yl()], kp);
var { copyAndSpread: Ap, includes: jp, setList: Mp } = B, { stintSet: Np } = Jn, Z = class extends X {
	get __tag() {
		return "Text";
	}
	get textDrawData() {
		return this.updateLayout(), this.__.__textDrawData;
	}
	__updateTextDrawData() {
		let e = this.__, { lineHeight: t, letterSpacing: n, fontFamily: r, fontSize: i, fontWeight: a, italic: o, textCase: s, textOverflow: c, padding: l, width: u, height: d } = e;
		e.__lineHeight = Zd.number(t, i), e.__letterSpacing = Zd.number(n, i), e.__baseLine = e.__lineHeight - (e.__lineHeight - .7 * i) / 2, e.__font = `${o ? "italic " : ""}${s === "small-caps" ? "small-caps " : ""}${a === "normal" ? "" : a + " "}${i || 12}px ${r || "caption"}`, Np(e, "__padding", l && hr.fourNumber(l)), Np(e, "__clipText", c !== "show" && !e.__autoSize), Np(e, "__isCharMode", u || d || e.__letterSpacing || e.motionText || s !== "none"), e.__textDrawData = Yd.getDrawData((e.__isPlacehold = e.placeholder && e.text === "") ? e.placeholder : e.text, this.__);
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
		r && (c.width += .16 * n), Jn.stintSet(this, "isOverflow", !jp(c, s) && !e.motionText), this.isOverflow ? (Mp(e.__textBoxBounds = {}, [c, s]), t.renderChanged = !0) : e.__textBoxBounds = c;
	}
	__updateRenderSpread() {
		let e = super.__updateRenderSpread();
		e ||= +!!this.isOverflow;
		let { __lineHeight: t, fontSize: n } = this.__;
		return t < n && (e = ir.max(e, (n - t) / 2)), e;
	}
	__updateRenderBounds() {
		let { renderBounds: e, renderSpread: t } = this.__layout;
		Ap(e, this.__.__textBoxBounds, t), this.__box && (this.__box.__layout.renderBounds = e);
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
J([ul(Df)], Z.prototype, "__", void 0), J([K(0)], Z.prototype, "width", void 0), J([K(0)], Z.prototype, "height", void 0), J([Qc()], Z.prototype, "boxStyle", void 0), J([Rc(!1)], Z.prototype, "resizeFontSize", void 0), J([Qc("#000000")], Z.prototype, "fill", void 0), J([Jc("outside")], Z.prototype, "strokeAlign", void 0), J([cl("all")], Z.prototype, "hitFill", void 0), J([K("")], Z.prototype, "text", void 0), J([K("")], Z.prototype, "placeholder", void 0), J([K("caption")], Z.prototype, "fontFamily", void 0), J([K(12)], Z.prototype, "fontSize", void 0), J([K("normal")], Z.prototype, "fontWeight", void 0), J([K(!1)], Z.prototype, "italic", void 0), J([K("none")], Z.prototype, "textCase", void 0), J([K("none")], Z.prototype, "textDecoration", void 0), J([K(0)], Z.prototype, "letterSpacing", void 0), J([K({
	type: "percent",
	value: 1.5
})], Z.prototype, "lineHeight", void 0), J([K(0)], Z.prototype, "paraIndent", void 0), J([K(0)], Z.prototype, "paraSpacing", void 0), J([K("x")], Z.prototype, "writingMode", void 0), J([K("left")], Z.prototype, "textAlign", void 0), J([K("top")], Z.prototype, "verticalAlign", void 0), J([K(!0)], Z.prototype, "autoSizeAlign", void 0), J([K("normal")], Z.prototype, "textWrap", void 0), J([K("show")], Z.prototype, "textOverflow", void 0), J([Qc(!1)], Z.prototype, "textEditing", void 0), Z = J([yl()], Z);
var Pp = class extends X {
	get __tag() {
		return "Path";
	}
};
J([ul(wf)], Pp.prototype, "__", void 0), J([Jc("center")], Pp.prototype, "strokeAlign", void 0), Pp = J([yl()], Pp);
var Fp = class extends Rf {
	get __tag() {
		return "Pen";
	}
	setStyle(e) {
		let t = this.pathElement = new Pp(e);
		return this.pathStyle = e, this.__path = t.path ||= [], this.add(t), this;
	}
	paint() {
		let { pathElement: e } = this;
		e.__layout.boxChanged || e.forceUpdate("path");
	}
};
J([ul(Tf)], Fp.prototype, "__", void 0), J([(e, t) => {
	Mc(e, t, { get() {
		return this.__path;
	} });
}], Fp.prototype, "path", void 0), Fp = J([vl(ms, [
	"set",
	"path",
	"paint"
]), yl()], Fp);
//#endregion
//#region node_modules/@leafer-ui/core/lib/core.esm.min.js
function Ip(e, t, n, r) {
	var i, a = arguments.length, o = a < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") o = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (i = e[s]) && (o = (a < 3 ? i(o) : a > 3 ? i(t, n, o) : i(t, n)) || o);
	return a > 3 && o && Object.defineProperty(t, n, o), o;
}
var Lp = class extends Vf {
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
			t && (this.ground = this.addLeafer(t)), (n || i) && (this.tree = this.addLeafer(n || { type: e.type || "design" })), (r || i) && (this.sky = this.addLeafer(r)), i && Ri.editor(i, this);
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
		let t = new Vf(e);
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
		return t.hittable = t.realCanvas = void 0, e && Jn.assign(t, e), this.autoLayout && Jn.copyAttrs(t, this, na), t.view = this.realCanvas ? void 0 : this.view, t.fill = void 0, t;
	}
	__listenChildEvents(e) {
		e.once([
			[
				xu.END,
				this.__onReady,
				this
			],
			[
				Su.START,
				this.__onCreated,
				this
			],
			[
				Su.END,
				this.__onViewReady,
				this
			]
		]), this.realCanvas && this.__eventIds.push(e.on_(Su.END, this.__onChildRenderEnd, this));
	}
};
Lp = Ip([yl()], Lp);
var Rp = {}, zp = {
	isHoldSpaceKey: () => zp.isHold("Space"),
	isHold: (e) => Rp[e],
	isHoldKeys: (e, t) => t ? e(t) : void 0,
	setDownCode(e) {
		Rp[e] || (Rp[e] = !0);
	},
	setUpCode(e) {
		Rp[e] = !1;
	}
}, Bp = {
	LEFT: 1,
	RIGHT: 2,
	MIDDLE: 4,
	defaultLeft(e) {
		e.buttons ||= 1;
	},
	left: (e) => e.buttons === 1,
	right: (e) => e.buttons === 2,
	middle: (e) => e.buttons === 4
}, Vp = class extends su {
	get spaceKey() {
		return zp.isHoldSpaceKey();
	}
	get left() {
		return Bp.left(this);
	}
	get right() {
		return Bp.right(this);
	}
	get middle() {
		return Bp.middle(this);
	}
	constructor(e) {
		super(e.type), this.bubbles = !0, Object.assign(this, e);
	}
	isHoldKeys(e) {
		return zp.isHoldKeys(e, this);
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
		Ui.changeName(e, t);
	}
}, { min: Hp, max: Up, abs: Wp } = Math, { float: Gp, sign: Kp } = hr, { minX: qp, maxX: Jp, minY: Yp, maxY: Xp } = B, Zp = new xi(), Qp = new xi(), $p = {
	limitMove(e, t) {
		let { dragBounds: n, dragBoundsType: r } = e;
		n && em.getValidMove(e.__localBoxBounds, em.getDragBounds(e), r, t, !0), em.axisMove(e, t);
	},
	limitScaleOf(e, t, n, r) {
		let { dragBounds: i, dragBoundsType: a } = e;
		i && em.getValidScaleOf(e.__localBoxBounds, em.getDragBounds(e), a, e.getLocalPointByInner(e.getInnerPointByBox(t)), n, r, !0);
	},
	axisMove(e, t) {
		let { draggable: n } = e;
		n === "x" && (t.y = 0), n === "y" && (t.x = 0);
	},
	getDragBounds(e) {
		let { dragBounds: t } = e;
		return t === "parent" ? e.parent.boxBounds : t;
	},
	isInnerMode: (e, t, n, r) => n === "inner" || n === "auto" && Gp(e[r]) > Gp(t[r]),
	getValidMove(e, t, n, r, i) {
		let a = e.x + r.x, o = e.y + r.y, s = a + e.width, c = o + e.height, l = t.x + t.width, u = t.y + t.height;
		return i || (r = Object.assign({}, r)), em.isInnerMode(e, t, n, "width") ? a > t.x ? r.x += t.x - a : s < l && (r.x += l - s) : a < t.x ? r.x += t.x - a : s > l && (r.x += l - s), em.isInnerMode(e, t, n, "height") ? o > t.y ? r.y += t.y - o : c < u && (r.y += u - c) : o < t.y ? r.y += t.y - o : c > u && (r.y += u - c), r.x = Gp(r.x), r.y = Gp(r.y), r;
	},
	getValidScaleOf(e, t, n, r, i, a, o) {
		o || (i = Object.assign({}, i)), Qp.set(t), Zp.set(e).scaleOf(r, i.x, i.y);
		let s = Gp((r.x - e.x) / e.width), c = Gp(1 - s), l = Gp((r.y - e.y) / e.height), u = Gp(1 - l), d, f, p, m, h = 1, g = 1;
		return em.isInnerMode(e, t, n, "width") ? (i.x < 0 && Zp.scaleOf(r, h = 1 / i.x, 1), p = Gp(Zp.minX - Qp.minX), m = Gp(Qp.maxX - Zp.maxX), d = s && p > 0 ? 1 + p / (s * Zp.width) : 1, f = c && m > 0 ? 1 + m / (c * Zp.width) : 1, h *= Up(d, f)) : (i.x < 0 && ((Gp(qp(e) - qp(t), 2) <= 0 || Gp(Jp(t) - Jp(e), 2) <= 0) && (Zp.scaleOf(r, h = 1 / i.x, 1), Zp.width > 1 && (h *= 1 / Zp.width, Zp.width = 1)), Zp.unsign()), p = Gp(Qp.minX - Zp.minX), m = Gp(Zp.maxX - Qp.maxX), d = s && p > 0 ? 1 - p / (s * Zp.width) : 1, f = c && m > 0 ? 1 - m / (c * Zp.width) : 1, h *= Hp(d, f)), em.isInnerMode(e, t, n, "height") ? (i.y < 0 && Zp.scaleOf(r, 1, g = 1 / i.y), p = Gp(Zp.minY - Qp.minY), m = Gp(Qp.maxY - Zp.maxY), d = l && p > 0 ? 1 + p / (l * Zp.height) : 1, f = u && m > 0 ? 1 + m / (u * Zp.height) : 1, g *= Up(d, f), a && (d = Up(Wp(h), Wp(g)), h = Kp(h) * d, g = Kp(g) * d)) : (i.y < 0 && ((Gp(Yp(e) - Yp(t), 2) <= 0 || Gp(Xp(t) - Xp(e), 2) <= 0) && (Zp.scaleOf(r, 1, g = 1 / i.y), Zp.height > 1 && (g *= 1 / Zp.height, Zp.height = 1)), Zp.unsign()), p = Gp(Qp.minY - Zp.minY), m = Gp(Zp.maxY - Qp.maxY), d = l && p > 0 ? 1 - p / (l * Zp.height) : 1, f = u && m > 0 ? 1 - m / (u * Zp.height) : 1, g *= Hp(d, f)), i.x *= Wn(h) ? h : 1, i.y *= Wn(g) ? g : 1, i;
	}
}, em = $p, Q = class extends Vp {};
Q.POINTER = "pointer", Q.BEFORE_DOWN = "pointer.before_down", Q.BEFORE_MOVE = "pointer.before_move", Q.BEFORE_UP = "pointer.before_up", Q.DOWN = "pointer.down", Q.MOVE = "pointer.move", Q.UP = "pointer.up", Q.OVER = "pointer.over", Q.OUT = "pointer.out", Q.ENTER = "pointer.enter", Q.LEAVE = "pointer.leave", Q.TAP = "tap", Q.DOUBLE_TAP = "double_tap", Q.CLICK = "click", Q.DOUBLE_CLICK = "double_click", Q.LONG_PRESS = "long_press", Q.LONG_TAP = "long_tap", Q.MENU = "pointer.menu", Q.MENU_TAP = "pointer.menu_tap", Q = Ip([bl()], Q);
var tm = {}, $ = class extends Q {
	static setList(e) {
		this.list = e instanceof Wd ? e : new Wd(e);
	}
	static setData(e) {
		this.data = e;
	}
	static getValidMove(e, t, n, r = !0) {
		let i = e.getLocalPoint(n, null, !0);
		return z.move(i, t.x - e.x, t.y - e.y), r && this.limitMove(e, i), $p.axisMove(e, i), i;
	}
	static limitMove(e, t) {
		$p.limitMove(e, t);
	}
	getPageMove(e) {
		return this.assignMove(e), this.current.getPagePoint(tm, null, !0);
	}
	getInnerMove(e, t) {
		return e ||= this.current, this.assignMove(t), e.getInnerPoint(tm, null, !0);
	}
	getLocalMove(e, t) {
		return e ||= this.current, this.assignMove(t), e.getLocalPoint(tm, null, !0);
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
		return B.set(n, t.x - e.x, t.y - e.y, e.x, e.y), B.unsign(n), n;
	}
	assignMove(e) {
		tm.x = e ? this.totalX : this.moveX, tm.y = e ? this.totalY : this.moveY;
	}
};
$.BEFORE_DRAG = "drag.before_drag", $.START = "drag.start", $.DRAG = "drag", $.END = "drag.end", $.OVER = "drag.over", $.OUT = "drag.out", $.ENTER = "drag.enter", $.LEAVE = "drag.leave", $.ANIMATE = "drag.animate", $ = Ip([bl()], $);
var nm = class extends Q {
	static setList(e) {
		$.setList(e);
	}
	static setData(e) {
		$.setData(e);
	}
};
nm.DROP = "drop", nm = Ip([bl()], nm);
var rm = class extends $ {};
rm.BEFORE_MOVE = "move.before_move", rm.START = "move.start", rm.MOVE = "move", rm.DRAG_ANIMATE = "move.drag_animate", rm.END = "move.end", rm.PULL_DOWN = "move.pull_down", rm.REACH_BOTTOM = "move.reach_bottom", rm = Ip([bl()], rm);
var im = class extends Vp {};
im = Ip([bl()], im);
var am = class extends Q {};
am.BEFORE_ROTATE = "rotate.before_rotate", am.START = "rotate.start", am.ROTATE = "rotate", am.END = "rotate.end", am = Ip([bl()], am);
var om = class extends $ {};
om.SWIPE = "swipe", om.LEFT = "swipe.left", om.RIGHT = "swipe.right", om.UP = "swipe.up", om.DOWN = "swipe.down", om = Ip([bl()], om);
var sm = class extends Q {};
sm.BEFORE_ZOOM = "zoom.before_zoom", sm.START = "zoom.start", sm.ZOOM = "zoom", sm.END = "zoom.end", sm = Ip([bl()], sm);
var cm = class extends Vp {};
cm.BEFORE_DOWN = "key.before_down", cm.BEFORE_UP = "key.before_up", cm.DOWN = "key.down", cm.HOLD = "key.hold", cm.UP = "key.up", cm = Ip([bl()], cm);
var lm = {
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
	getSwipeDirection: (e) => e < -45 && e > -135 ? om.UP : e > 45 && e < 135 ? om.DOWN : e <= 45 && e >= -45 ? om.RIGHT : om.LEFT,
	getSwipeEventData: (e, t, n) => Object.assign(Object.assign({}, n), {
		moveX: t.moveX,
		moveY: t.moveY,
		totalX: n.x - e.x,
		totalY: n.y - e.y,
		type: um.getSwipeDirection(z.getAngle(e, n))
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
		let n = new Wd(), { list: r } = e;
		for (let e = 0, i = r.length; e < i; e++) r[e].hasEvent(t) && n.add(r[e]);
		return n;
	},
	pathCanDrag: (e) => e && e.list.some((e) => Ml.draggable(e) || !e.isLeafer && e.hasEvent($.DRAG)),
	pathHasOutside: (e) => e && e.list.some((e) => e.isOutside)
}, um = lm, dm = new Wd(), { getDragEventData: fm, getDropEventData: pm, getSwipeEventData: mm } = lm, hm = class {
	constructor(e) {
		this.dragDataList = [], this.interaction = e;
	}
	setDragData(e) {
		this.animateWait && this.dragEndReal(), this.downData = this.interaction.downData, this.dragData = fm(e, e, e), this.canAnimate = this.canDragOut = !0;
	}
	getList(e, t) {
		let { proxy: n } = this.interaction.selector, r = n && n.list.length, i = $.list || this.draggableList || dm;
		return this.dragging && (r ? e ? dm : new Wd(t ? [...n.list, ...n.dragHoverExclude] : n.list) : i);
	}
	checkDrag(e, t) {
		let { interaction: n } = this;
		if (this.moving && e.buttons < 1) return this.canAnimate = !1, void n.pointerCancel();
		!this.moving && t && (this.moving = n.canMove(this.downData) || n.isHoldRightKey || n.isMobileDragEmpty) && (this.dragData.moveType = "drag", n.emit(rm.START, this.dragData)), this.moving || this.dragStart(e, t), this.drag(e);
	}
	dragStart(e, t) {
		this.dragging || (this.dragging = t && Bp.left(e), this.dragging && (this.interaction.emit($.START, this.dragData), this.getDraggableList(this.dragData.path), this.setDragStartPoints(this.realDraggableList = this.getList(!0))));
	}
	setDragStartPoints(e) {
		this.dragStartPoints = {}, e.forEach((e) => this.dragStartPoints[e.innerId] = {
			x: e.x,
			y: e.y
		});
	}
	getDraggableList(e) {
		let t;
		for (let n = 0, r = e.length; n < r; n++) if (t = e.list[n], Ml.draggable(t)) {
			this.draggableList = new Wd(t);
			break;
		}
	}
	drag(e) {
		let { interaction: t, dragData: n, downData: r } = this, { path: i, throughPath: a } = r;
		this.dragData = fm(r, n, e), a && (this.dragData.throughPath = a), this.dragData.path = i, this.dragDataList.push(this.dragData), this.moving ? (e.moving = !0, this.dragData.moveType = "drag", t.emit(rm.BEFORE_MOVE, this.dragData), t.emit(rm.MOVE, this.dragData)) : this.dragging && (e.dragging = !0, this.dragReal(), t.emit($.BEFORE_DRAG, this.dragData), t.emit($.DRAG, this.dragData));
	}
	dragReal(e) {
		let { interaction: t } = this, { running: n } = t, r = this.realDraggableList;
		if (r.length && n) {
			let { totalX: n, totalY: i } = this.dragData, { dragLimitAnimate: a } = t.p, o = !a || !!e;
			r.forEach((t) => {
				if (t.draggable) {
					let r = Un(t.draggable), s = $.getValidMove(t, this.dragStartPoints[t.innerId], {
						x: n,
						y: i
					}, o || r);
					a && !r && e ? Ml.animateMove(t, s, F(a) ? a : .3, () => t.emit($.ANIMATE)) : t.move(s);
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
		let { path: i, throughPath: a } = n, o = fm(n, e, e);
		if (a && (o.throughPath = a), o.path = i, this.moving && (this.moving = !1, o.moveType = "drag", t.emit(rm.END, o)), this.dragging) {
			let i = this.getList();
			this.dragging = !1, t.p.dragLimitAnimate && this.dragReal(!0), t.emit($.END, o), this.swipe(e, n, r, o), this.drop(e, i, this.dragEnterPath);
		}
		this.autoMoveCancel(), this.dragReset(), this.animate(null, "off");
	}
	swipe(e, t, n, r) {
		let { interaction: i } = this;
		if (z.getDistance(t, e) > i.config.pointer.swipeDistance) {
			let e = mm(t, n, r);
			this.interaction.emit(e.type, e);
		}
	}
	drop(e, t, n) {
		let r = pm(e, t, $.data);
		r.path = n, this.interaction.emit(nm.DROP, r), this.interaction.emit($.LEAVE, e, n);
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
}, gm = Ai.get("emit"), _m = [
	"move",
	"zoom",
	"rotate",
	"key"
];
function vm(e, t, n, r, i) {
	if (_m.some((e) => t.startsWith(e)) && e.__.hitChildren && !bm(e, i)) {
		let a;
		for (let o = 0, s = e.children.length; o < s; o++) a = e.children[o], !n.path.has(a) && a.__.hittable && ym(a, t, n, r, i);
	}
}
function ym(e, t, n, r, i) {
	if (e.destroyed) return !1;
	if (e.__.hitSelf && !bm(e, i) && (af.updateEventStyle && !r && af.updateEventStyle(e, t), e.hasEvent(t, r))) {
		n.phase = r ? 1 : e === n.target ? 2 : 3;
		let i = Ui.get(t, n);
		if (e.emitEvent(i, r), i.isStop) return !0;
	}
	return !1;
}
function bm(e, t) {
	return t && t.has(e);
}
var xm = {
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
}, { pathHasEventType: Sm, pathCanDrag: Cm, pathHasOutside: wm } = lm, Tm = class {
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
		return this.m.holdMiddleKey && this.downData && Bp.middle(this.downData);
	}
	get isHoldRightKey() {
		return this.m.holdRightKey && this.downData && Bp.right(this.downData);
	}
	get isHoldSpaceKey() {
		return this.m.holdSpaceKey && zp.isHoldSpaceKey();
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
		this.config = Jn.clone(xm), this.tapCount = 0, this.downKeyMap = {}, this.target = e, this.canvas = t, this.selector = n, this.defaultPath = new Wd(e), this.createTransformer(), this.dragger = new hm(this), r && (this.config = Jn.default(r, this.config)), this.__listenEvents();
	}
	start() {
		this.running = !0;
	}
	stop() {
		this.running = !1;
	}
	receive(e) {}
	pointerDown(e, t) {
		e ||= this.hoverData, e && (Bp.defaultLeft(e), this.updateDownData(e), this.checkPath(e, t), this.downTime = Date.now(), this.emit(Q.BEFORE_DOWN, e), e.path.needUpdate && this.updateDownData(e), this.emit(Q.DOWN, e), Bp.left(e) && (this.tapWait(), this.longPressWait(e)), this.waitRightTap = Bp.right(e), this.dragger.setDragData(e), this.isHoldRightKey || this.updateCursor(e));
	}
	pointerMove(e) {
		if (e ||= this.hoverData, !e) return;
		let { downData: t } = this;
		t && Bp.defaultLeft(e), (this.canvas.bounds.hitPoint(e) || t) && (this.pointerMoveReal(e), t && this.dragger.checkDragOut(e));
	}
	pointerMoveReal(e) {
		if (this.emit(Q.BEFORE_MOVE, e, this.defaultPath), this.downData) {
			let t = z.getDistance(this.downData, e) > this.p.dragDistance;
			t && (this.pointerWaitCancel(), this.waitRightTap = !1), this.dragger.checkDrag(e, t);
		}
		this.dragger.moving || (this.updateHoverData(e), this.checkPath(e), this.emit(Q.MOVE, e), this.pointerHover(e), this.dragging && (this.dragger.dragOverOrOut(e), this.dragger.dragEnterOrLeave(e))), this.updateCursor(this.downData || e);
	}
	pointerUp(e) {
		let { downData: t } = this;
		if (e ||= t, !t) return;
		Bp.defaultLeft(e), e.multiTouch = t.multiTouch, this.findPath(e);
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
		this.emit(cm.BEFORE_DOWN, e, this.defaultPath);
		let { code: t } = e;
		this.downKeyMap[t] || (this.downKeyMap[t] = !0, zp.setDownCode(t), this.emit(cm.HOLD, e, this.defaultPath), this.moveMode && (this.cancelHover(), this.updateCursor())), this.emit(cm.DOWN, e, this.defaultPath);
	}
	keyUp(e) {
		if (!this.config.keyEvent) return;
		this.emit(cm.BEFORE_UP, e, this.defaultPath);
		let { code: t } = e;
		this.downKeyMap[t] = !1, zp.setUpCode(t), this.emit(cm.UP, e, this.defaultPath), this.cursor === "grab" && this.updateCursor();
	}
	pointerHover(e) {
		!this.canHover || this.dragging && !this.p.dragHover || (e.path ||= new Wd(), this.pointerOverOrOut(e), this.pointerEnterOrLeave(e));
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
		e.pointerType === "touch" && this.enterPath && (this.emit(Q.LEAVE, e), this.dragger.dragging && this.emit(nm.LEAVE, e));
	}
	tap(e) {
		let { pointer: t } = this.config, n = this.longTap(e);
		if (!t.tapMore && n || !this.waitTap) return;
		t.tapMore && this.emitTap(e);
		let r = Date.now() - this.downTime, i = [Q.DOUBLE_TAP, Q.DOUBLE_CLICK].some((t) => Sm(e.path, t));
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
		(t || this.moveMode && !wm(e.path)) && (e.path = this.defaultPath);
	}
	canMove(e) {
		return e && (this.moveMode || this.m.drag === "auto" && !Cm(e.path)) && !wm(e.path);
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
		return r.x *= i.width / n.width, r.y *= i.height / n.height, this.p.snap && z.round(r), r;
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
		return this.longPressed && (this.emit(Q.LONG_TAP, e), (Sm(e.path, Q.LONG_TAP) || Sm(e.path, Q.LONG_PRESS)) && (t = !0)), this.longPressWaitCancel(), t;
	}
	longPressWaitCancel() {
		this.longPressTimer && (clearTimeout(this.longPressTimer), this.longPressed = !1);
	}
	__onResize() {
		let { dragOut: e } = this.m;
		this.shrinkCanvasBounds = new xi(this.canvas.bounds), this.shrinkCanvasBounds.spread(-(F(e) ? e : 2));
	}
	__listenEvents() {
		let { target: e } = this;
		this.__eventIds = [e.on_(yu.RESIZE, this.__onResize, this)], e.once(q.READY, () => this.__onResize());
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
					if (i = n.list[a], ym(i, e, t, !0, r)) return;
					i.isApp && vm(i, e, t, !0, r);
				}
				for (let a = 0, o = n.length; a < o; a++) if (i = n.list[a], i.isApp && vm(i, e, t, !1, r), ym(i, e, t, !1, r)) return;
			} catch (e) {
				gm.error(e);
			}
		}(e, t, n, r);
	}
	destroy() {
		this.__eventIds.length && (this.stop(), this.__removeListenEvents(), this.dragger.destroy(), this.transformer && this.transformer.destroy(), this.downData = this.overPath = this.enterPath = null);
	}
}, Em = class {
	static set(e, t) {
		this.custom[e] = t;
	}
	static get(e) {
		return this.custom[e];
	}
};
Em.custom = {};
var Dm = class extends Gi {
	constructor() {
		super(...arguments), this.maxTotal = 1e3, this.pathList = new Wd(), this.pixelList = new Wd();
	}
	getPixelType(e, t) {
		return this.__autoClear(), this.pixelList.add(e), Ri.hitCanvas(t);
	}
	getPathType(e) {
		return this.__autoClear(), this.pathList.add(e), Ri.hitCanvas();
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
	return e.leafer ? e.leafer.selector : V.selector ||= Ri.selector();
};
var { toInnerRadiusPointOf: Om, copyRadiusPoint: km } = z, { hitRadiusPoint: Am, hitPoint: jm } = B, Mm = {}, Nm = {}, Pm = Nd.prototype;
Pm.hit = function(e, t = 0) {
	this.updateLayout(), km(Nm, e, t);
	let n = this.__world;
	return !!(t ? Am(n, Nm) : jm(n, Nm)) && (this.isBranch ? V.getSelector(this).hitPoint(Object.assign({}, Nm), t, { target: this }) : this.__hitWorld(Nm));
}, Pm.__hitWorld = function(e, t) {
	let n = this.__;
	if (!n.hitSelf) return !1;
	let r = this.__world, i = this.__layout, a = r.width < 10 && r.height < 10;
	if (n.hitRadius && (km(Mm, e, n.hitRadius), e = Mm), Om(e, r, Mm), n.hitBox || a) {
		if (B.hitRadiusPoint(i.boxBounds, Mm)) return !0;
		if (a) return !1;
	}
	return !i.hitCanvasChanged && this.__hitCanvas || (this.__updateHitCanvas(), i.boundsChanged || (i.hitCanvasChanged = !1)), this.__hit(Mm, t);
}, Pm.__hitFill = function(e) {
	let t = this.__hitCanvas;
	return t && t.hitFill(e, this.__.windingRule);
}, Pm.__hitStroke = function(e, t) {
	let n = this.__hitCanvas;
	return n && n.hitStroke(e, t);
}, Pm.__hitPixel = function(e) {
	let t = this.__hitCanvas;
	return t && t.hitPixel(e, this.__layout.renderBounds, t.hitScale);
}, Pm.__drawHitPath = function(e) {
	e && this.__drawRenderPath(e);
};
var Fm = new Kr(), Im = X.prototype;
Im.__updateHitCanvas = function() {
	this.__box && this.__box.__updateHitCanvas();
	let { hitCanvasManager: e } = this.leafer || this.parent && this.parent.leafer || {};
	if (!e) return;
	let t = this.__, n = (t.__isAlphaPixelFill || t.__isCanvas) && t.hitFill === "pixel", r = t.__isAlphaPixelStroke && t.hitStroke === "pixel", i = n || r;
	this.__hitCanvas ||= i ? e.getPixelType(this, { contextSettings: { willReadFrequently: !0 } }) : e.getPathType(this);
	let a = this.__hitCanvas;
	if (i) {
		let { renderBounds: e } = this.__layout, i = V.image.hitCanvasSize, o = a.hitScale = Si.set(0, 0, i, i).getFitMatrix(e).a, { x: s, y: c, width: l, height: u } = Si.set(e).scale(o);
		a.resize({
			width: l,
			height: u,
			pixelRatio: 1
		}), a.clear(), Dc.patternLocked = !0, this.__renderShape(a, {
			matrix: Fm.setWith(this.__world).scaleWith(1 / o).invertWith().translate(-s, -c),
			snapshot: !0,
			ignoreFill: !n,
			ignoreStroke: !r
		}), Dc.patternLocked = !1, a.resetTransform(), t.__isHitPixel = !0;
	} else t.__isHitPixel &&= !1;
	this.__drawHitPath(a), a.setStrokeOptions(t);
}, Im.__hit = function(e, t) {
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
var Lm = X.prototype, Rm = Hf.prototype, zm = Jf.prototype;
Rm.__updateHitCanvas = zm.__updateHitCanvas = function() {
	this.stroke || this.cornerRadius || (this.fill || this.__.__isCanvas) && this.hitFill === "pixel" || this.hitStroke === "all" ? Lm.__updateHitCanvas.call(this) : this.__hitCanvas &&= null;
}, Rm.__hitFill = zm.__hitFill = function(e) {
	return this.__hitCanvas ? Lm.__hitFill.call(this, e) : B.hitRadiusPoint(this.__layout.boxBounds, e);
}, Z.prototype.__drawHitPath = function(e) {
	let t = this.__, { __lineHeight: n, fontSize: r, __baseLine: i, __letterSpacing: a, __textDrawData: o } = t;
	e.beginPath(), t.motionText ? this.__drawPathByData(e, t.__pathForMotionText) : a < 0 ? this.__drawPathByBox(e) : o.rows.forEach((t) => e.rect(t.x, t.y - i, t.width, n < r ? r : n));
}, Rf.prototype.pick = function(e, t) {
	return t ||= Vn, this.updateLayout(), V.getSelector(this).getByPoint(e, t.hitRadius || 0, Object.assign(Object.assign({}, t), { target: this }));
};
var Bm = ra.prototype;
Bm.hitFill = function(e, t) {
	return t ? this.context.isPointInPath(e.x, e.y, t) : this.context.isPointInPath(e.x, e.y);
}, Bm.hitStroke = function(e, t) {
	return this.strokeWidth = t, this.context.isPointInStroke(e.x, e.y);
}, Bm.hitPixel = function(e, t, n = 1) {
	let { x: r, y: i, radiusX: a, radiusY: o } = e;
	t && (r -= t.x, i -= t.y), Si.set(r - a, i - o, 2 * a, 2 * o).scale(n).ceil();
	let { data: s } = this.context.getImageData(Si.x, Si.y, Si.width || 1, Si.height || 1);
	for (let e = 0, t = s.length; e < t; e += 4) if (s[e + 3] > 0) return !0;
	return s[3] > 0;
};
//#endregion
//#region node_modules/leafer-ui/dist/web.esm.min.js
var Vm;
function Hm(e, t, n, r) {
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
})(Vm ||= {});
var Um = Ai.get("LeaferCanvas"), Wm = class extends ra {
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
		let t = Un(e) ? document.getElementById(e) : e;
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
		else Um.error(`no id: ${e}`), this.__createView();
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
				e ? (this.resizeObserver.observe(e), this.checkAutoBounds(e.getBoundingClientRect())) : (this.checkAutoBounds(this.view), Um.warn("no parent"));
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
		Jn.copyAttrs(t, this, na), this.resize(e), this.resizeListener && !P(this.width) && this.resizeListener(new yu(e, t));
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
function Gm(e, t) {
	V.origin = {
		createCanvas(e, t) {
			let n = document.createElement("canvas");
			return n.width = e, n.height = t, n;
		},
		canvasToDataURL: (e, t, n) => {
			let r = yc.mimeType(t), i = e.toDataURL(r, n);
			return r === "image/bmp" ? i.replace("image/png;", "image/bmp;") : i;
		},
		canvasToBolb: (e, t, n) => new Promise((r) => e.toBlob(r, yc.mimeType(t), n)),
		canvasSaveAs: (e, t, n) => {
			let r = e.toDataURL(yc.mimeType(yc.fileType(t)), n);
			return V.origin.download(r, t);
		},
		download(e, t) {
			return Hm(this, void 0, void 0, function* () {
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
			return Hm(this, arguments, void 0, function* (e, t = "text") {
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
	}, V.canvas = Ri.canvas(), V.conicGradientSupport = !!V.canvas.context.createConicGradient;
}
vc(CanvasRenderingContext2D.prototype), vc(Path2D.prototype), Object.assign(Ri, {
	canvas: (e, t) => new Wm(e, t),
	image: (e) => new jc(e)
}), V.name = "web", V.isMobile = "ontouchstart" in window, V.requestRender = function(e) {
	window.requestAnimationFrame(e);
}, Mc(V, "devicePixelRatio", { get: () => devicePixelRatio });
var { userAgent: Km } = navigator;
Km.indexOf("Firefox") > -1 ? (V.intWheelDeltaY = !0, V.syncDomFont = !0) : (/iPhone|iPad|iPod/.test(navigator.userAgent) || /Macintosh/.test(navigator.userAgent) && /Version\/[\d.]+.*Safari/.test(navigator.userAgent)) && (V.fullImageShadow = !0), Km.indexOf("Windows") > -1 ? (V.os = "Windows", V.intWheelDeltaY = !0) : Km.indexOf("Mac") > -1 ? V.os = "Mac" : Km.indexOf("Linux") > -1 && (V.os = "Linux");
var qm = class {
	get childrenChanged() {
		return this.hasAdd || this.hasRemove || this.hasVisible;
	}
	get updatedList() {
		if (this.hasRemove && this.config.usePartLayout) {
			let e = new Wd();
			return this.__updatedList.list.forEach((t) => {
				t.leafer && e.add(t);
			}), e;
		}
		return this.__updatedList;
	}
	constructor(e, t) {
		this.totalTimes = 0, this.config = {}, this.__updatedList = new Wd(), this.target = e, t && (this.config = Jn.default(t, this.config)), this.__listenEvents();
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
		this.changed = !0, this.running && this.target.emit(Su.REQUEST);
	}
	__onAttrChange(e) {
		this.add(e.target);
	}
	add(e) {
		this.config.usePartLayout && this.__updatedList.add(e), this.update();
	}
	__onChildEvent(e) {
		this.config.usePartLayout && (e.type === cu.ADD ? (this.hasAdd = !0, this.__pushChild(e.child)) : (this.hasRemove = !0, this.__updatedList.add(e.parent))), this.update();
	}
	__pushChild(e) {
		this.__updatedList.add(e), e.isBranch && this.__loopChildren(e);
	}
	__loopChildren(e) {
		let { children: t } = e;
		for (let e = 0, n = t.length; e < n; e++) this.__pushChild(t[e]);
	}
	__onRquestData() {
		this.target.emitEvent(new bu(bu.DATA, { updatedList: this.updatedList })), this.__updatedList = new Wd(), this.totalTimes++, this.changed = this.hasVisible = this.hasRemove = this.hasAdd = !1;
	}
	__listenEvents() {
		this.__eventIds = [this.target.on_([
			[
				uu.CHANGE,
				this.__onAttrChange,
				this
			],
			[
				[cu.ADD, cu.REMOVE],
				this.__onChildEvent,
				this
			],
			[
				bu.REQUEST,
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
}, { updateAllMatrix: Jm, updateBounds: Ym, updateChange: Xm } = Ml, { pushAllChildBranch: Zm, pushAllParent: Qm } = Wl, { worldBounds: $m } = Bl, eh = class {
	constructor(e) {
		this.updatedBounds = new xi(), this.beforeBounds = new xi(), this.afterBounds = new xi(), Gn(e) && (e = new Wd(e)), this.updatedList = e;
	}
	setBefore() {
		this.beforeBounds.setListWithFn(this.updatedList.list, $m);
	}
	setAfter() {
		this.afterBounds.setListWithFn(this.updatedList.list, $m), this.updatedBounds.setList([this.beforeBounds, this.afterBounds]);
	}
	merge(e) {
		this.updatedList.addList(e.updatedList.list), this.beforeBounds.add(e.beforeBounds), this.afterBounds.add(e.afterBounds), this.updatedBounds.add(e.updatedBounds);
	}
	destroy() {
		this.updatedList = null;
	}
}, { updateAllMatrix: th, updateAllChange: nh } = Ml, rh = Ai.get("Layouter"), ih = class e {
	constructor(e, t) {
		this.totalTimes = 0, this.config = { usePartLayout: !0 }, this.__levelList = new Gd(), this.target = e, t && (this.config = Jn.default(t, this.config)), this.__listenEvents();
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
			e.emit(xu.START), this.layoutOnce(), e.emitEvent(new xu(xu.END, this.layoutedBlocks, this.times));
		} catch (e) {
			rh.error(e);
		}
		this.layoutedBlocks = null;
	}
	layoutAgain() {
		this.layouting ? this.waitAgain = !0 : this.layoutOnce();
	}
	layoutOnce() {
		return this.layouting ? rh.warn("layouting") : this.times > 3 ? rh.warn("layout max times") : (this.times++, this.totalTimes++, this.layouting = !0, this.target.emit(bu.REQUEST), this.totalTimes > 1 && this.config.usePartLayout ? this.partLayout() : this.fullLayout(), this.layouting = !1, void (this.waitAgain && (this.waitAgain = !1, this.layoutOnce())));
	}
	partLayout() {
		if (!this.__updatedList?.length) return;
		let e = Pi.start("PartLayout"), { target: t, __updatedList: n } = this, { BEFORE: r, LAYOUT: i, AFTER: a } = xu, o = this.getBlocks(n);
		o.forEach((e) => e.setBefore()), t.emitEvent(new xu(r, o, this.times)), this.extraBlock = null, n.sort(), function(e, t) {
			let n;
			e.list.forEach((e) => {
				n = e.__layout, t.without(e) && !n.proxyZoom && (n.matrixChanged ? (Jm(e, !0), t.add(e), e.isBranch && Zm(e, t), Qm(e, t)) : n.boundsChanged && (t.add(e), e.isBranch && (e.__tempNumber = 0), Qm(e, t)));
			});
		}(n, this.__levelList), function(e) {
			let t, n, r;
			e.sort(!0), e.levels.forEach((i) => {
				t = e.levelMap[i];
				for (let e = 0, i = t.length; e < i; e++) {
					if (n = t[e], n.isBranch && n.__tempNumber) {
						r = n.children;
						for (let e = 0, t = r.length; e < t; e++) r[e].isBranch || Ym(r[e]);
					}
					Ym(n);
				}
			});
		}(this.__levelList), function(e) {
			e.list.forEach(Xm);
		}(n), this.extraBlock && o.push(this.extraBlock), o.forEach((e) => e.setAfter()), t.emitEvent(new xu(i, o, this.times)), t.emitEvent(new xu(a, o, this.times)), this.addBlocks(o), this.__levelList.reset(), this.__updatedList = null, Pi.end(e);
	}
	fullLayout() {
		let t = Pi.start("FullLayout"), { target: n } = this, { BEFORE: r, LAYOUT: i, AFTER: a } = xu, o = this.getBlocks(new Wd(n));
		n.emitEvent(new xu(r, o, this.times)), e.fullLayout(n), o.forEach((e) => {
			e.setAfter();
		}), n.emitEvent(new xu(i, o, this.times)), n.emitEvent(new xu(a, o, this.times)), this.addBlocks(o), Pi.end(t);
	}
	static fullLayout(e) {
		th(e, !0), e.isBranch ? Wl.updateBounds(e) : Ml.updateBounds(e), nh(e);
	}
	addExtra(e) {
		if (!this.__updatedList.has(e)) {
			let { updatedList: t, beforeBounds: n } = this.extraBlock ||= new eh([]);
			t.length ? n.add(e.__world) : n.set(e.__world), t.add(e);
		}
	}
	createBlock(e) {
		return new eh(e);
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
				xu.REQUEST,
				this.layout,
				this
			],
			[
				xu.AGAIN,
				this.layoutAgain,
				this
			],
			[
				bu.DATA,
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
}, ah = Ai.get("Renderer"), oh = class e {
	get needFill() {
		return !(this.canvas.allowBackgroundColor || !this.config.fill);
	}
	constructor(e, t, n) {
		this.FPS = 60, this.totalTimes = 0, this.times = 0, this.config = {
			usePartRender: !0,
			ceilPartPixel: !0,
			maxFPS: 120
		}, this.frames = [], this.target = e, this.canvas = t, n && (this.config = Jn.default(n, this.config)), this.__listenEvents();
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
		this.target.emit(xu.REQUEST);
	}
	checkRender() {
		if (this.running) {
			let { target: e } = this;
			e.isApp && (e.emit(Su.CHILD_START, e), e.children.forEach((e) => {
				e.renderer.FPS = this.FPS, e.renderer.checkRender();
			}), e.emit(Su.CHILD_END, e)), this.changed && this.canvas.view && this.render(), this.target.emit(Su.NEXT);
		}
	}
	render(e) {
		if (!this.running || !this.canvas.view) return this.update();
		let { target: t } = this;
		this.times = 0, this.totalBounds = new xi(), ah.log(t.innerName, "--->");
		try {
			this.emitRender(Su.START), this.renderOnce(e), this.emitRender(Su.END, this.totalBounds), Dc.clearRecycled();
		} catch (e) {
			this.rendering = !1, ah.error(e);
		}
		ah.log("-------------|");
	}
	renderAgain() {
		this.rendering ? this.waitAgain = !0 : this.renderOnce();
	}
	renderOnce(e) {
		if (this.rendering) return ah.warn("rendering");
		if (this.times > 3) return ah.warn("render max times");
		if (this.times++, this.totalTimes++, this.rendering = !0, this.changed = !1, this.renderBounds = new xi(), this.renderOptions = {}, e) this.emitRender(Su.BEFORE), e();
		else {
			if (this.requestLayout(), this.ignore) return void (this.ignore = this.rendering = !1);
			this.emitRender(Su.BEFORE), this.config.usePartRender && this.totalTimes > 1 ? this.partRender() : this.fullRender();
		}
		this.emitRender(Su.RENDER, this.renderBounds, this.renderOptions), this.emitRender(Su.AFTER, this.renderBounds, this.renderOptions), this.updateBlocks = null, this.rendering = !1, this.waitAgain && (this.waitAgain = !1, this.renderOnce());
	}
	partRender() {
		let { canvas: e, updateBlocks: t } = this;
		t && (this.mergeBlocks(), t.forEach((t) => {
			e.bounds.hit(t) && !t.isEmpty() && this.clipRender(t);
		}));
	}
	clipRender(t) {
		let n = Pi.start("PartRender"), { canvas: r } = this, i = t.getIntersect(r.bounds), a = new xi(i);
		r.save(), i.spread(e.clipSpread).ceil();
		let { ceilPartPixel: o } = this.config;
		r.clipWorld(i, o), r.clearWorld(i, o), this.__render(i, a), r.restore(), Pi.end(n);
	}
	fullRender() {
		let e = Pi.start("FullRender"), { canvas: t } = this;
		t.save(), t.clear(), this.__render(t.bounds), t.restore(), Pi.end(e);
	}
	__render(e, t) {
		let { canvas: n, target: r } = this, i = e.includes(r.__world), a = i ? { includes: i } : {
			bounds: e,
			includes: i
		};
		this.needFill && n.fillWorld(e, this.config.fill), Ai.showRepaint && Ai.drawRepaint(n, e), this.config.useCellRender && (a.cellList = this.getCellList()), V.render(r, n, a), this.renderBounds = t ||= e, this.renderOptions = a, this.totalBounds.isEmpty() ? this.totalBounds = t : this.totalBounds.add(t), n.updateRender(t);
	}
	getCellList() {}
	addBlock(e, t) {
		this.updateBlocks ||= [], this.updateBlocks.push(e);
	}
	mergeBlocks() {
		let { updateBlocks: e } = this;
		if (e) {
			let t = new xi();
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
				if (!new xi(0, 0, t, n).includes(this.target.__world) || this.needFill || !e.samePixelRatio) return this.addBlock(this.canvas.bounds), void this.target.forceUpdate("surface");
			}
			this.addBlock(new xi(0, 0, 1, 1)), this.update();
		}
	}
	__onLayoutEnd(e) {
		e.data && e.data.map((e) => {
			let t, { updatedList: n } = e;
			n && n.list.some((e) => (t = !e.__world.width || !e.__world.height, t &&= (e.isLeafer || ah.tip(e.innerName, ": empty"), !e.isBranch || e.isBranchLeaf), t)), this.addBlock(t ? this.canvas.bounds : e.updatedBounds, n);
		});
	}
	emitRender(e, t, n) {
		this.target.emitEvent(new Su(e, this.times, t, n));
	}
	__listenEvents() {
		this.__eventIds = [this.target.on_([
			[
				Su.REQUEST,
				this.update,
				this
			],
			[
				xu.END,
				this.__onLayoutEnd,
				this
			],
			[
				Su.AGAIN,
				this.renderAgain,
				this
			],
			[
				yu.RESIZE,
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
oh.clipSpread = 10;
var sh = {}, { copyRadiusPoint: ch } = z, { hitRadiusPoint: lh } = B, uh = class {
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
		}, this.findList = new Wd(n.findList), n.findList || this.hitBranch(a.isBranchLeaf ? { children: [a] } : a);
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
		let i = this.findList = new Wd();
		if (e.length) {
			let t, { x: r, y: a } = this.point, o = {
				x: r,
				y: a,
				radiusX: 0,
				radiusY: 0
			};
			for (let r = 0, a = e.length; r < a; r++) if (t = e[r], (n || Ml.worldHittable(t)) && (this.hitChild(t, t.hitThrough ? this.point : o), i.length)) {
				if (t.isBranchLeaf && e.some((e) => e !== t && Ml.hasParent(e, t))) {
					i.reset();
					break;
				}
				return i.list[0];
			}
		}
		if (t) {
			for (let e = 0, n = t.length; e < n; e++) if (this.hitChild(t[e].target, this.point, void 0, t[e].proxy), i.length) return i.list[0];
		}
		return r ? null : n ? e[0] : e.find((e) => Ml.worldHittable(e));
	}
	getPath(e) {
		let t = new Wd(), n = [], { target: r } = this;
		for (; e && (e.syncEventer && n.push(e.syncEventer), t.add(e), (e = e.parent) !== r););
		return n.length && n.forEach((e) => {
			for (; e && (e.__.hittable && t.add(e), (e = e.parent) !== r););
		}), r && t.add(r), t;
	}
	getHitablePath(e) {
		let t = this.getPath(e && e.hittable ? e : null), n, r = new Wd();
		for (let e = t.list.length - 1; e > -1 && (n = t.list[e], n.__.hittable) && (r.addAt(n, 0), n.__.hitChildren && (!n.isLeafer || n.mode !== "draw")); e--);
		return r;
	}
	getThroughPath(e) {
		let t = new Wd(), n = [];
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
		for (let o = e.length - 1; o > -1; o--) if (n = e[o], i = n.__, i.visible && (!t || i.mask)) if (r = lh(n.__world, i.hitRadius ? ch(sh, a, i.hitRadius) : a), n.isBranch) {
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
}, dh = class {
	constructor(e, t) {
		this.config = {}, t && (this.config = Jn.default(t, this.config)), this.picker = new uh(this.target = e, this), this.finder = Ri.finder && Ri.finder(e, this.config);
	}
	getByPoint(e, t, n) {
		let { target: r, picker: i } = this;
		return V.backgrounder && r && r.updateLayout(), i.getByPoint(e, t, n);
	}
	hitPoint(e, t, n) {
		return this.picker.hitPoint(e, t, n);
	}
	getBy(e, t, n, r) {
		return this.finder ? this.finder.getBy(e, t, n, r) : Li.need("find");
	}
	destroy() {
		this.picker.destroy(), this.finder && this.finder.destroy();
	}
};
Object.assign(Ri, {
	watcher: (e, t) => new qm(e, t),
	layouter: (e, t) => new ih(e, t),
	renderer: (e, t, n) => new oh(e, t, n),
	selector: (e, t) => new dh(e, t)
}), V.layout = ih.fullLayout, V.render = function(e, t, n) {
	let r = Object.assign(Object.assign({}, n), { topRendering: !0 });
	n.topList = new Wd(), e.__render(t, n), n.topList.length && n.topList.forEach((e) => e.__render(t, r));
};
var fh = {
	convert(e, t) {
		let n = lm.getBase(e), { x: r, y: i } = t, a = Object.assign(Object.assign({}, n), {
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
		let n = lm.getBase(e), { x: r, y: i } = t;
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
		let n = fh.getTouch(e), r = lm.getBase(e), { x: i, y: a } = t;
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
}, ph = { convert(e) {
	let t = lm.getBase(e);
	return Object.assign(Object.assign({}, t), {
		code: e.code,
		key: e.key
	});
} }, { pathCanDrag: mh } = lm, hh = class extends Tm {
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
		this.keyDown(ph.convert(e));
	}
	onKeyUp(e) {
		this.keyUp(ph.convert(e));
	}
	onContextMenu(e) {
		this.config.pointer.preventDefaultMenu && e.preventDefault(), this.menu(fh.convert(e, this.getLocal(e)));
	}
	onScroll() {
		this.canvas.updateClientBounds();
	}
	onPointerDown(e) {
		this.preventDefaultPointer(e), this.notPointer || (this.usePointer ||= !0, this.pointerDown(fh.convert(e, this.getLocal(e))));
	}
	onPointerMove(e, t) {
		if (this.notPointer || this.preventWindowPointer(e)) return;
		this.usePointer ||= !0;
		let n = fh.convert(e, this.getLocal(e, !0));
		t ? this.pointerHover(n) : this.pointerMove(n);
	}
	onPointerLeave(e) {
		this.onPointerMove(e, !0);
	}
	onPointerUp(e) {
		this.downData && this.preventDefaultPointer(e), this.notPointer || this.preventWindowPointer(e) || this.pointerUp(fh.convert(e, this.getLocal(e)));
	}
	onPointerCancel() {
		this.useMultiTouch || this.pointerCancel();
	}
	onMouseDown(e) {
		this.preventDefaultPointer(e), this.notMouse || this.pointerDown(fh.convertMouse(e, this.getLocal(e)));
	}
	onMouseMove(e) {
		this.notMouse || this.preventWindowPointer(e) || this.pointerMove(fh.convertMouse(e, this.getLocal(e, !0)));
	}
	onMouseUp(e) {
		this.downData && this.preventDefaultPointer(e), this.notMouse || this.preventWindowPointer(e) || this.pointerUp(fh.convertMouse(e, this.getLocal(e)));
	}
	onMouseCancel() {
		this.notMouse || this.pointerCancel();
	}
	onTouchStart(e) {
		let t = fh.getTouch(e), n = this.getLocal(t, !0), { preventDefault: r } = this.config.touch;
		(!0 === r || r === "auto" && mh(this.findPath(n))) && e.preventDefault(), this.multiTouchStart(e), this.notTouch || (this.touchTimer &&= (window.clearTimeout(this.touchTimer), 0), this.useTouch = !0, this.pointerDown(fh.convertTouch(e, n)));
	}
	onTouchMove(e) {
		if (this.multiTouchMove(e), this.notTouch || this.preventWindowPointer(e)) return;
		let t = fh.getTouch(e);
		this.pointerMove(fh.convertTouch(e, this.getLocal(t)));
	}
	onTouchEnd(e) {
		if (this.multiTouchEnd(), this.notTouch || this.preventWindowPointer(e)) return;
		this.touchTimer && clearTimeout(this.touchTimer), this.touchTimer = setTimeout(() => {
			this.useTouch = !1;
		}, 500);
		let t = fh.getTouch(e);
		this.pointerUp(fh.convertTouch(e, this.getLocal(t)));
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
			n.length > 1 && (this.multiTouch(lm.getBase(e), n), this.touches = t);
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
		this.preventDefaultWheel(e), this.wheel(Object.assign(Object.assign(Object.assign({}, lm.getBase(e)), this.getLocal(e)), {
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
		let t = lm.getBase(e);
		Object.assign(t, this.getLocal(e));
		let n = e.scale / this.lastGestureScale, r = (e.rotation - this.lastGestureRotation) / Math.PI * 180 * (hr.within(this.config.wheel.rotateSpeed, 0, 1) / 4 + .1);
		this.zoom(Object.assign(Object.assign({}, t), { scale: n * n })), this.rotate(Object.assign(Object.assign({}, t), { rotation: r })), this.lastGestureScale = e.scale, this.lastGestureRotation = e.rotation;
	}
	onGestureend(e) {
		this.useMultiTouch || (this.preventDefaultWheel(e), this.transformEnd());
	}
	setCursor(e) {
		super.setCursor(e);
		let t = [];
		this.eachCursor(e, t), I(t[t.length - 1]) && t.push("default"), this.canvas.view.style.cursor = t.map((e) => I(e) ? `url(${e.url}) ${e.x || 0} ${e.y || 0}` : e).join(",");
	}
	eachCursor(e, t, n = 0) {
		if (n++, Gn(e)) e.forEach((e) => this.eachCursor(e, t, n));
		else {
			let r = Un(e) && Em.get(e);
			r && n < 2 ? this.eachCursor(r, t, n) : t.push(e);
		}
	}
	destroy() {
		this.view &&= (super.destroy(), this.touches = null);
	}
};
function gh(e, t, n) {
	e.__.__font ? Y.fillText(e, t, n) : e.__.windingRule ? t.fill(e.__.windingRule) : t.fill();
}
var _h = {};
function vh(e, t, n, r, i) {
	let a = n.__;
	I(e) ? Y.drawStrokesStyle(e, t, !1, n, r, i) : (r.setStroke(e, a.__strokeWidth * t, a), r.stroke()), a.__useArrow && Y.strokeArrow(e, n, r, i);
}
function yh(e, t, n, r, i) {
	let a = n.__;
	I(e) ? Y.drawStrokesStyle(e, t, !0, n, r, i) : (r.setStroke(e, a.__strokeWidth * t, a), Y.drawTextStroke(n, r, i));
}
function bh(e, t, n, r, i) {
	let a = r.getSameCanvas(!0, !0);
	a.font = n.__.__font, yh(e, 2, n, a, i), a.blendMode = t === "outside" ? "destination-out" : "destination-in", Y.fillText(n, a, i), a.blendMode = "normal", Ml.copyCanvasByWorld(n, r, a), a.recycle(n.__nowWorld);
}
var { getSpread: xh, copyAndSpread: Sh, toOuterOf: Ch, getOuterOf: wh, getByMove: Th, move: Eh, getIntersectData: Dh } = B, Oh = {}, kh, { stintSet: Ah } = Jn, { hasTransparent: jh } = Xd;
function Mh(e, t, n) {
	if (!I(t) || !1 === t.visible || t.opacity === 0) return;
	let r, { boxBounds: i } = n.__layout, { type: a } = t;
	switch (a) {
		case "image":
		case "film":
		case "video":
			if (!t.url) return;
			r = $d.image(n, e, t, i, !kh || !kh[t.url]), a !== "image" && $d[a](r);
			break;
		case "linear":
			r = ef.linearGradient(t, i);
			break;
		case "radial":
			r = ef.radialGradient(t, i);
			break;
		case "angular":
			r = ef.conicGradient(t, i);
			break;
		case "solid":
			let { color: o, opacity: s } = t;
			r = {
				type: a,
				style: Xd.string(o, s)
			};
			break;
		default: P(t.r) || (r = {
			type: "solid",
			style: Xd.string(t)
		});
	}
	if (r && (r.originPaint = t, Un(r.style) && jh(r.style) && (r.isTransparent = !0), t.style)) {
		if (t.style.strokeWidth === 0) return;
		r.strokeStyle = t.style;
	}
	return r;
}
var Nh = {
	compute: function(e, t) {
		let n = t.__, r = [], i, a, o, s = n.__input[e];
		Gn(s) || (s = [s]), kh = $d.recycleImage(e, n);
		for (let n, i = 0, a = s.length; i < a; i++) (n = Mh(e, s[i], t)) && (r.push(n), n.strokeStyle && (o ||= 1, n.strokeStyle.strokeWidth && (o = Math.max(o, n.strokeStyle.strokeWidth))));
		r.length ? (n["_" + e] = r, r.every((e) => e.isTransparent) && (r.some((e) => e.image) && (i = !0), a = !0), e === "fill" ? (Ah(n, "__isAlphaPixelFill", i), Ah(n, "__isTransparentFill", a)) : (Ah(n, "__isAlphaPixelStroke", i), Ah(n, "__isTransparentStroke", a), Ah(n, "__hasMultiStrokeStyle", o))) : (n.__removePaint(e, !1), n["_" + e] = "");
	},
	fill: function(e, t, n, r) {
		n.fillStyle = e, gh(t, n, r);
	},
	fills: function(e, t, n, r) {
		let i, a, o;
		for (let s = 0, c = e.length; s < c; s++) {
			if (i = e[s], a = i.originPaint, i.image) {
				if (o ? o++ : o = 1, $d.checkImage(i, !t.__.__font, t, n, r)) continue;
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
				a.blendMode && (n.blendMode = a.blendMode), gh(t, n, r), n.restore();
			} else a.blendMode ? (n.saveBlendMode(a.blendMode), gh(t, n, r), n.restoreBlendMode()) : gh(t, n, r);
		}
	},
	fillPathOrText: gh,
	fillText: function(e, t, n) {
		if (e.motionText) return _h.fillMotionText(e, t, n);
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
				vh(e, 1, t, n, r);
				break;
			case "inside":
				(function(e, t, n, r) {
					n.save(), n.clipUI(t), vh(e, 2, t, n, r), n.restore();
				})(e, t, n, r);
				break;
			case "outside": (function(e, t, n, r) {
				let i = t.__;
				if (i.__fillAfterStroke) vh(e, 2, t, n, r);
				else {
					let { renderBounds: a } = t.__layout, o = n.getSameCanvas(!0, !0);
					t.__drawRenderPath(o), vh(e, 2, t, o, r), o.clipUI(i), o.clearWorld(a), Ml.copyCanvasByWorld(t, n, o), o.recycle(t.__nowWorld);
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
				yh(e, 1, t, n, r);
				break;
			case "inside":
				bh(e, "inside", t, n, r);
				break;
			case "outside": t.__.__fillAfterStroke ? yh(e, 2, t, n, r) : bh(e, "outside", t, n, r);
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
		for (let l = 0, u = e.length; l < u; l++) if (o = e[l], (!o.image || !$d.checkImage(o, !1, r, i, a)) && o.style) {
			if (c) {
				let { strokeStyle: e } = o;
				e ? i.setStroke(o.style, s.__getRealStrokeWidth(e) * t, s, e) : i.setStroke(o.style, s.__strokeWidth * t, s);
			} else i.strokeStyle = o.style;
			o.originPaint.blendMode ? (i.saveBlendMode(o.originPaint.blendMode), n ? Y.drawTextStroke(r, i, a) : i.stroke(), i.restoreBlendMode()) : n ? Y.drawTextStroke(r, i, a) : i.stroke();
		}
	},
	shape: function(e, t, n) {
		let r = t.getSameCanvas(), i = t.bounds, a = e.__nowWorld, o = e.__layout, s = e.__nowWorldShapeBounds ||= {}, c, l, u, d, f, p;
		Ch(o.strokeSpread ? (Sh(Oh, o.boxBounds, o.strokeSpread), Oh) : o.boxBounds, a, s);
		let { scaleX: m, scaleY: h } = e.getRenderScaleData(!0);
		if (i.includes(s)) p = r, c = f = s, l = a;
		else {
			let r;
			r = V.fullImageShadow ? s : Dh(o.renderShapeSpread ? xh(i, ir.swapAndScale(o.renderShapeSpread, m, h)) : i, s), d = i.getFitMatrix(r);
			let { a: g, d: _ } = d;
			d.a < 1 && (p = t.getSameCanvas(), e.__renderShape(p, n), m *= g, h *= _), f = wh(s, d), c = Th(f, -d.e, -d.f), l = wh(a, d), Eh(l, -d.e, -d.f);
			let v = n.matrix;
			v ? (u = new Kr(d), u.multiply(v), g *= v.scaleX, _ *= v.scaleY) : u = d, u.withScale(g, _), n = Object.assign(Object.assign({}, n), { matrix: u });
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
}, Ph, Fh = new xi(), { isSame: Ih } = B;
function Lh(e, t, n, r, i, a) {
	let o = !0, s = e.__;
	if (t !== "fill" || s.__naturalWidth || (s.__naturalWidth = r.width / s.pixelRatio, s.__naturalHeight = r.height / s.pixelRatio, s.__autoSide && (e.forceUpdate(), Ml.updateBounds(e), e.__layout.boundsChanged = !0, e.__proxyData && (e.setProxyAttr("width", s.width), e.setProxyAttr("height", s.height)), o = !1)), n.mode === "brush" && $d.brush(e, t, i), !i.data) {
		$d.createData(i, r, n, a);
		let { transform: e } = i.data, { opacity: t } = n, o = (e && !e.onlyScale || s.path || s.cornerRadius) && !i.brush;
		(o || t && t < 1 || n.blendMode) && (i.complex = !o || 2);
	}
	return n.filter && $d.applyFilter(i, r, n.filter, e), o;
}
function Rh(e, t) {
	Vh(e, fu.LOAD, t);
}
function zh(e, t) {
	Vh(e, fu.LOADED, t);
}
function Bh(e, t, n) {
	t.error = n, e.forceUpdate("surface"), Vh(e, fu.ERROR, t);
}
function Vh(e, t, n) {
	e.hasEvent(t) && e.emitEvent(new fu(t, n));
}
function Hh(e, t) {
	let { leafer: n } = e;
	n && n.viewReady && (n.renderer.ignore = t);
}
var { get: Uh, translate: Wh } = R, Gh = new xi(), Kh = {}, qh = {};
function Jh(e, t, n, r) {
	let i = Un(e) || r ? (r ? n - r * t : n % t) / ((r || Math.floor(n / t)) - 1) : e;
	return e === "auto" && i < 0 ? 0 : i;
}
var Yh = {}, Xh = xr(), { get: Zh, set: Qh, rotateOfOuter: $h, translate: eg, scaleOfOuter: tg, multiplyParent: ng, scale: rg, rotate: ig, skew: ag } = R;
function og(e, t, n, r, i, a, o, s) {
	o && ig(e, o), s && ag(e, s.x, s.y), i && rg(e, i, a), eg(e, t.x + n, t.y + r);
}
var { get: sg, scale: cg, copy: lg } = R, { getFloorScale: ug } = hr, { abs: dg } = Math, fg = {
	image: function(e, t, n, r, i) {
		let a, o, s = Dc.get(n, n.type);
		return Ph && n === Ph.paint && Ih(r, Ph.boxBounds) ? a = Ph.leafPaint : (a = {
			type: n.type,
			image: s
		}, s.hasAlphaPixel && (a.isTransparent = !0), Ph = s.use > 1 ? {
			leafPaint: a,
			paint: n,
			boxBounds: Fh.set(r)
		} : null), (i || s.loading) && (o = {
			image: s,
			attrName: t,
			attrValue: n
		}), s.ready ? (Lh(e, t, n, s, a, r), i && (Rh(e, o), zh(e, o))) : s.error ? i && Bh(e, o, s.error) : (i && (Hh(e, !0), Rh(e, o)), a.loadId = s.load(() => {
			Hh(e, !1), e.destroyed || (Lh(e, t, n, s, a, r) && (s.hasAlphaPixel && (e.__layout.hitCanvasChanged = !0), e.forceUpdate("surface")), zh(e, o)), a.loadId = void 0;
		}, (t) => {
			Hh(e, !1), Bh(e, o, t), a.loadId = void 0;
		}, n.lod && s.getThumbSize(n.lod)), e.placeholderColor && (e.placeholderDelay ? setTimeout(() => {
			s.ready || (s.isPlacehold = !0, e.forceUpdate("surface"));
		}, e.placeholderDelay) : s.isPlacehold = !0)), a;
	},
	checkImage: function(e, t, n, r, i) {
		let { scaleX: a, scaleY: o } = $d.getImageRenderScaleData(e, n, r, i), s = e.film ? e.nowIndex : a + "-" + o, { image: c, brush: l, data: u, originPaint: d } = e, { exporting: f, snapshot: p } = i;
		if (!u || e.patternId === s && !f || p) {
			if (!l || !e.style) return !1;
		} else if (t && (u.repeat ? t = !1 : d.changeful || e.film || V.name === "miniapp" || f || (t = V.image.isLarge(c, a, o) || c.width * a > 8096 || c.height * o > 8096)), t) n.__.__isFastShadow && (r.fillStyle = e.style || "#000", r.fill());
		else if (!e.style || d.sync || f ? $d.createPattern(e, n, r, i) : $d.createPatternTask(e, n, r, i), !l || !e.style) return !1;
		return $d.drawImage(e, a, o, n, r, i), !0;
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
		if (e.brush && $d.addBrushScale(i, e, t), n) {
			let { pixelRatio: e } = n;
			i.scaleX *= e, i.scaleY *= e;
		}
		return a && a.scaleX && (i.scaleX *= Math.abs(a.scaleX), i.scaleY *= Math.abs(a.scaleY)), i;
	},
	recycleImage: function(e, t) {
		let n = t["_" + e];
		if (Gn(n)) {
			let r, i, a, o, s, c = t.__leaf;
			for (let l = 0, u = n.length; l < u; l++) r = n[l], i = r.image, s = i && i.url, s && (a ||= {}, a[s] = !0, Dc.recyclePaint(r), r.brush && $d.recycleBrush(r, c), t.__willDestroy && i.parent && $d.recycleFilter(i, c), i.loading && (o || (o = t.__input && t.__input[e] || [], Gn(o) || (o = [o])), i.unload(n[l].loadId, !o.some((e) => e.url === s))));
			return a;
		}
		return null;
	},
	createPatternTask: function(e, t, n, r) {
		e.patternTask ||= Dc.patternTasker.add(() => Hm(this, void 0, void 0, function* () {
			$d.createPattern(e, t, n, r), t.forceUpdate("surface");
		}), 0, () => (e.patternTask = null, n.bounds.hit(t.__nowWorld)));
	},
	createPattern: function(e, t, n, r) {
		let { scaleX: i, scaleY: a } = $d.getImageRenderScaleData(e, t, n, r), o = e.film ? e.nowIndex : i + "-" + a;
		if (e.patternId !== o && !t.destroyed && (!V.image.isLarge(e.image, i, a) || e.data.repeat)) {
			let { image: s, brush: c, data: l } = e, { transform: u, gap: d } = l, f = $d.getPatternFixScale(e, i, a), p, m, h, { width: g, height: _ } = s, { opacity: v } = e.originPaint;
			(c || v === 1) && (v = void 0), f && (i *= f, a *= f), g *= i, _ *= a, d && !c && (m = d.x * i / dg(l.scaleX || 1), h = d.y * a / dg(l.scaleY || 1)), (u || i !== 1 || a !== 1) && (i *= ug(g + (m || 0)), a *= ug(_ + (h || 0)), p = sg(), u && lg(p, u), cg(p, 1 / i, 1 / a));
			let y = s.getCanvas(g, _, v, void 0, m, h, t.leafer && t.leafer.config.smooth, l.interlace);
			c ? (e.style = y, $d.cacheBrush(e, t, n, r)) : e.style = s.getPattern(y, l.repeat || V.origin.noRepeat || "no-repeat", p, e), e.patternId = o;
		}
	},
	getPatternFixScale: function(e, t, n) {
		let { image: r } = e, i, a = V.image.maxPatternSize, o = r.width * r.height;
		return r.isSVG ? t > 1 && (i = Math.ceil(t) / t) : a > o && (a = o), (o *= t * n) > a && (i = Math.sqrt(a / o)), i;
	},
	createData: function(e, t, n, r) {
		e.data = $d.getPatternData(n, r, t);
	},
	getPatternData: function(e, t, n) {
		e.padding && (t = Gh.set(t).shrink(e.padding)), e.mode === "strench" && (e.mode = "stretch");
		let { width: r, height: i } = n, { mode: a, align: o, offset: s, scale: c, size: l, rotation: u, skew: d, clipSize: f, repeat: p, gap: m, interlace: h } = e, g = t.width === r && t.height === i, _ = { mode: a }, v = o !== "center" && (u || 0) % 180 == 90, y, b;
		switch (B.set(qh, 0, 0, v ? i : r, v ? r : i), a && a !== "cover" && a !== "fit" ? ((c || l) && (hr.getScaleData(c, l, n, Kh), y = Kh.scaleX, b = Kh.scaleY), (o || m || p) && (y && B.scale(qh, y, b, !0), o && ti.toPoint(o, qh, t, qh, !0, !0))) : g && !u || (y = b = B.getFitScale(t, qh, a !== "fit"), B.put(t, n, o, y, !1, qh), B.scale(qh, y, b, !0)), s && z.move(qh, s), a) {
			case "stretch":
				g ? y &&= b = void 0 : (y = t.width / r, b = t.height / i, $d.stretchMode(_, t, y, b));
				break;
			case "normal":
			case "clip":
				if (qh.x || qh.y || y || f || u || d) {
					let e, n;
					f && (e = t.width / f.width, n = t.height / f.height), $d.clipMode(_, t, qh.x, qh.y, y, b, u, d, e, n), e && (y = y ? y * e : e, b = b ? b * n : n);
				}
				break;
			case "repeat": (!g || y || u || d) && $d.repeatMode(_, t, r, i, qh.x, qh.y, y, b, u, d, o, e.freeTransform);
			case "brush":
				p || (_.repeat = "repeat");
				let n = I(p);
				(m || n) && (_.gap = function(e, t, n, r, i) {
					let a, o;
					return I(e) ? (a = e.x, o = e.y) : a = o = e, {
						x: Jh(a, n, i.width, t && t.x),
						y: Jh(o, r, i.height, t && t.y)
					};
				}(m, n && p, qh.width, qh.height, t));
				break;
			default: y && $d.fillOrFitMode(_, t, qh.x, qh.y, y, b, u);
		}
		return _.transform || a === "brush" || (t.x || t.y) && Wh(_.transform = Uh(), t.x, t.y), y && (_.scaleX = y, _.scaleY = b), p && (_.repeat = Un(p) ? p === "x" ? "repeat-x" : "repeat-y" : "repeat"), h && (_.interlace = F(h) || h.type === "percent" ? {
			type: "x",
			offset: h
		} : h), _;
	},
	stretchMode: function(e, t, n, r) {
		let i = Zh(), { x: a, y: o } = t;
		a || o ? eg(i, a, o) : n > 0 && r > 0 && (i.onlyScale = !0), rg(i, n, r), e.transform = i;
	},
	fillOrFitMode: function(e, t, n, r, i, a, o) {
		let s = Zh();
		eg(s, t.x + n, t.y + r), rg(s, i, a), o && $h(s, {
			x: t.x + t.width / 2,
			y: t.y + t.height / 2
		}, o), e.transform = s;
	},
	clipMode: function(e, t, n, r, i, a, o, s, c, l) {
		let u = Zh();
		og(u, t, n, r, i, a, o, s), c && (o || s ? (Qh(Xh), tg(Xh, t, c, l), ng(u, Xh)) : tg(u, t, c, l)), e.transform = u;
	},
	repeatMode: function(e, t, n, r, i, a, o, s, c, l, u, d) {
		let f = Zh();
		if (d) og(f, t, i, a, o, s, c, l);
		else {
			if (c) if (u === "center") $h(f, {
				x: n / 2,
				y: r / 2
			}, c);
			else switch (ig(f, c), c) {
				case 90:
					eg(f, r, 0);
					break;
				case 180:
					eg(f, n, r);
					break;
				case 270: eg(f, 0, n);
			}
			Yh.x = t.x + i, Yh.y = t.y + a, eg(f, Yh.x, Yh.y), o && tg(f, Yh, o, s);
		}
		e.transform = f;
	}
}, { toPoint: pg } = Qr, { hasTransparent: mg } = Xd, hg = {}, gg = {};
function _g(e, t, n, r) {
	if (n) {
		let i, a, o, s;
		for (let e = 0, c = n.length; e < c; e++) i = n[e], Un(i) ? (o = e / (c - 1), a = Xd.string(i, r)) : (o = i.offset, a = Xd.string(i.color, r)), t.addColorStop(o, a), !s && mg(a) && (s = !0);
		s && (e.isTransparent = !0);
	}
}
var { getAngle: vg, getDistance: yg } = z, { get: bg, rotateOfOuter: xg, scaleOfOuter: Sg } = R, { toPoint: Cg } = Qr, wg = {}, Tg = {};
function Eg(e, t, n, r, i) {
	let a, { width: o, height: s } = e;
	if (o !== s || r) {
		let e = vg(t, n);
		a = bg(), i ? (Sg(a, t, o / s * (r || 1), 1), xg(a, t, e + 90)) : (Sg(a, t, 1, o / s * (r || 1)), xg(a, t, e));
	}
	return a;
}
var { getDistance: Dg } = z, { toPoint: Og } = Qr, kg = {}, Ag = {}, jg = {
	linearGradient: function(e, t) {
		let { from: n, to: r, type: i, opacity: a } = e;
		pg(n || "top", t, hg), pg(r || "bottom", t, gg);
		let o = V.canvas.createLinearGradient(hg.x, hg.y, gg.x, gg.y), s = {
			type: i,
			style: o
		};
		return _g(s, o, e.stops, a), s;
	},
	radialGradient: function(e, t) {
		let { from: n, to: r, type: i, opacity: a, stretch: o } = e;
		Cg(n || "center", t, wg), Cg(r || "bottom", t, Tg);
		let s = V.canvas.createRadialGradient(wg.x, wg.y, 0, wg.x, wg.y, yg(wg, Tg)), c = {
			type: i,
			style: s
		};
		_g(c, s, e.stops, a);
		let l = Eg(t, wg, Tg, o, !0);
		return l && (c.transform = l), c;
	},
	conicGradient: function(e, t) {
		let { from: n, to: r, type: i, opacity: a, rotation: o, stretch: s } = e;
		Og(n || "center", t, kg), Og(r || "bottom", t, Ag);
		let c = V.conicGradientSupport ? V.canvas.createConicGradient(o ? o * L : 0, kg.x, kg.y) : V.canvas.createRadialGradient(kg.x, kg.y, 0, kg.x, kg.y, Dg(kg, Ag)), l = {
			type: i,
			style: c
		};
		_g(l, c, e.stops, a);
		let u = Eg(t, kg, Ag, s || 1, V.conicGradientRotate90);
		return u && (l.transform = u), l;
	},
	getTransform: Eg
}, { copy: Mg, move: Ng, toOffsetOutBounds: Pg } = B, { max: Fg, abs: Ig } = Math, Lg = {}, Rg = new Kr(), zg = {};
function Bg(e, t) {
	let n, r, i, a, o = 0, s = 0, c = 0, l = 0;
	return t.forEach((e) => {
		n = e.x || 0, r = e.y || 0, a = 1.5 * (e.blur || 0), i = Ig(e.spread || 0), o = Fg(o, i + a - r), s = Fg(s, i + a + n), c = Fg(c, i + a + r), l = Fg(l, i + a - n);
	}), o === s && s === c && c === l ? o : [
		o,
		s,
		c,
		l
	];
}
function Vg(e, t, n) {
	let { shapeBounds: r } = n, i, a;
	V.fullImageShadow ? (Mg(Lg, e.bounds), Ng(Lg, t.x - r.x, t.y - r.y), i = e.bounds, a = Lg) : (i = r, a = t), e.copyWorld(n.canvas, i, a);
}
var { toOffsetOutBounds: Hg } = B, Ug = {}, Wg = {
	shadow: function(e, t, n) {
		let r, i, { __nowWorld: a } = e, { shadow: o } = e.__, { worldCanvas: s, bounds: c, renderBounds: l, shapeBounds: u, scaleX: d, scaleY: f } = n, p = t.getSameCanvas(), m = o.length - 1;
		Pg(c, zg, l), o.forEach((o, h) => {
			let g = 1;
			if (o.scaleFixed) {
				let e = Math.abs(a.scaleX);
				e > 1 && (g = 1 / e);
			}
			p.setWorldShadow(zg.offsetX + (o.x || 0) * d * g, zg.offsetY + (o.y || 0) * f * g, (o.blur || 0) * d * g, Xd.string(o.color)), i = tf.getShadowTransform(e, p, n, o, zg, g), i && p.setTransform(i), Vg(p, zg, n), i && p.resetTransform(), r = l, o.box && (p.restore(), p.save(), s && (p.copyWorld(p, l, a, "copy"), r = a), s ? p.copyWorld(s, a, a, "destination-out") : p.copyWorld(n.canvas, u, c, "destination-out")), Ml.copyCanvasByWorld(e, t, p, r, o.blendMode), m && h < m && p.clearWorld(r);
		}), p.recycle(r);
	},
	innerShadow: function(e, t, n) {
		let r, i, { __nowWorld: a } = e, { innerShadow: o } = e.__, { worldCanvas: s, bounds: c, renderBounds: l, shapeBounds: u, scaleX: d, scaleY: f } = n, p = t.getSameCanvas(), m = o.length - 1;
		Hg(c, Ug, l), o.forEach((o, h) => {
			let g = 1;
			if (o.scaleFixed) {
				let e = Math.abs(a.scaleX);
				e > 1 && (g = 1 / e);
			}
			p.save(), p.setWorldShadow(Ug.offsetX + (o.x || 0) * d * g, Ug.offsetY + (o.y || 0) * f * g, (o.blur || 0) * d * g), i = tf.getShadowTransform(e, p, n, o, Ug, g, !0), i && p.setTransform(i), Vg(p, Ug, n), p.restore(), s ? (p.copyWorld(p, l, a, "copy"), p.copyWorld(s, a, a, "source-out"), r = a) : (p.copyWorld(n.canvas, u, c, "source-out"), r = l), p.fillWorld(r, Xd.string(o.color), "source-in"), Ml.copyCanvasByWorld(e, t, p, r, o.blendMode), m && h < m && p.clearWorld(r);
		}), p.recycle(r);
	},
	blur: function(e, t, n) {
		let { blur: r } = e.__;
		n.setWorldBlur(r * e.__nowWorld.a), n.copyWorldToInner(t, e.__nowWorld, e.__layout.renderBounds), n.filter = "none";
	},
	backgroundBlur: function(e, t, n) {},
	getShadowRenderSpread: Bg,
	getShadowTransform: function(e, t, n, r, i, a, o) {
		if (r.spread) {
			let n = 2 * r.spread * a * (o ? -1 : 1), { width: s, height: c } = e.__layout.strokeBounds;
			return Rg.set().scaleOfOuter({
				x: (i.x + i.width / 2) * t.pixelRatio,
				y: (i.y + i.height / 2) * t.pixelRatio
			}, 1 + n / s, 1 + n / c), Rg;
		}
	},
	isTransformShadow(e) {},
	getInnerShadowSpread: Bg
}, { excludeRenderBounds: Gg } = Bl, Kg;
function qg(e, t, n, r, i, a, o, s) {
	switch (t) {
		case "grayscale": Kg || (Kg = !0, i.useGrayscaleAlpha(e.__nowWorld));
		case "alpha":
			(function(e, t, n, r, i, a) {
				let o = e.__nowWorld;
				n.resetTransform(), n.opacity = 1, n.useMask(r, o), a && r.recycle(o), Yg(e, t, n, 1, i, a);
			})(e, n, r, i, o, s);
			break;
		case "opacity-path":
			Yg(e, n, r, a, o, s);
			break;
		case "path": s && n.restore();
	}
}
function Jg(e) {
	return e.getSameCanvas(!1, !0);
}
function Yg(e, t, n, r, i, a) {
	let o = e.__nowWorld;
	t.resetTransform(), t.opacity = r, t.copyWorld(n, o, void 0, i), a ? n.recycle(o) : n.clearWorld(o);
}
Rf.prototype.__renderMask = function(e, t) {
	let n, r, i, a, o, s, { children: c } = this;
	for (let l = 0, u = c.length; l < u; l++) {
		if (n = c[l], s = n.__.mask, s) {
			o && (qg(this, o, e, i, r, a, void 0, !0), r = i = null), s !== "clipping" && s !== "clipping-path" || Gg(n, t) || n.__render(e, t), a = n.__.opacity, Kg = !1, s === "path" || s === "clipping-path" ? (a < 1 ? (o = "opacity-path", i ||= Jg(e)) : (o = "path", e.save()), n.__clip(i || e, t)) : (o = s === "grayscale" ? "grayscale" : "alpha", r ||= Jg(e), i ||= Jg(e), n.__render(r, t));
			continue;
		}
		let u = a === 1 && n.__.__blendMode;
		u && qg(this, o, e, i, r, a, void 0, !1), Gg(n, t) || n.__render(i || e, t), u && qg(this, o, e, i, r, a, u, !1);
	}
	qg(this, o, e, i, r, a, void 0, !0);
};
var Xg = ">)]}%!?,.:;'\"》）」〉』〗】〕｝┐＞’”！？，、。：；‰", Zg = ">)]}%!?,.:;'\"》）」〉』〗】〕｝┐＞’”！？，、。：；‰_#~&*+\\=|≮≯≈≠＝…", Qg = new RegExp([
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
function $g(e) {
	let t = {};
	return e.split("").forEach((e) => t[e] = !0), t;
}
var e_ = $g("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz"), t_ = $g("{[(<'\"《（「〈『〖【〔｛┌＜‘“＝¥￥＄€£￡¢￠"), n_ = $g(Xg), r_ = $g(Zg), i_ = $g("- —／～｜┆·"), a_;
(function(e) {
	e[e.Letter = 0] = "Letter", e[e.Single = 1] = "Single", e[e.Before = 2] = "Before", e[e.After = 3] = "After", e[e.Symbol = 4] = "Symbol", e[e.Break = 5] = "Break";
})(a_ ||= {});
var { Letter: o_, Single: s_, Before: c_, After: l_, Symbol: u_, Break: d_ } = a_;
function f_(e) {
	return e_[e] ? o_ : i_[e] ? d_ : t_[e] ? c_ : n_[e] ? l_ : r_[e] ? u_ : Qg.test(e) ? s_ : o_;
}
var p_ = { trimRight(e) {
	let { words: t } = e, n, r = 0, i = t.length;
	for (let a = i - 1; a > -1 && (n = t[a].data[0], n.char === " "); a--) r++, e.width -= n.width;
	r && t.splice(i - r, r);
} };
function m_(e, t, n) {
	switch (t) {
		case "title": return n ? e.toUpperCase() : e;
		case "upper": return e.toUpperCase();
		case "lower": return e.toLowerCase();
		default: return e;
	}
}
var { trimRight: h_ } = p_, { Letter: g_, Single: __, Before: v_, After: y_, Symbol: b_, Break: x_ } = a_, S_, C_, w_, T_, E_, D_, O_, k_, A_, j_, M_, N_, P_, F_, I_, L_, R_, z_ = [];
function B_(e, t) {
	A_ && !k_ && (k_ = A_), S_.data.push({
		char: e,
		width: t
	}), w_ += t;
}
function V_() {
	T_ += w_, S_.width = w_, C_.words.push(S_), S_ = { data: [] }, w_ = 0;
}
function H_() {
	F_ &&= (I_.paraNumber++, C_.paraStart = !0, !1), A_ && (C_.startCharSize = k_, C_.endCharSize = A_, k_ = 0), C_.width = T_, L_.width ? h_(C_) : R_ && U_(), z_.push(C_), C_ = { words: [] }, T_ = 0;
}
function U_() {
	T_ > (I_.maxWidth || 0) && (I_.maxWidth = T_);
}
var { top: W_, right: G_, bottom: K_, left: q_ } = Yr;
function J_(e, t, n) {
	let { bounds: r, rows: i } = e;
	r[t] += n;
	for (let e = 0; e < i.length; e++) i[e][t] += n;
}
Object.assign(Yd, { getDrawData: function(e, t) {
	Un(e) || (e = String(e));
	let n = 0, r = 0, i = t.__getInput("width") || 0, a = t.__getInput("height") || 0, { __padding: o } = t;
	t.motionText && (i = a = 0), o && (i ? (n = o[q_], i -= o[G_] + o[q_], !i && (i = .01)) : t.autoSizeAlign || (n = o[q_]), a ? (r = o[W_], a -= o[W_] + o[K_], !a && (a = .01)) : t.autoSizeAlign || (r = o[W_]));
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
		I_ = e, z_ = e.rows, L_ = e.bounds, R_ = !L_.width && !n.autoSizeAlign;
		let { __letterSpacing: r, paraIndent: i, textCase: a } = n, { canvas: o } = V, { width: s } = L_;
		if (n.__isCharMode) {
			let e = n.textWrap !== "none", c = n.textWrap === "break";
			F_ = !0, M_ = null, k_ = O_ = A_ = w_ = T_ = 0, S_ = { data: [] }, C_ = { words: [] };
			for (let n = 0, l = (t = [...t]).length; n < l; n++) D_ = t[n], D_ === "\n" ? (w_ && V_(), C_.paraEnd = !0, H_(), F_ = !0) : (j_ = f_(D_), j_ === g_ && a !== "none" && (D_ = m_(D_, a, !w_)), O_ = o.measureText(D_).width, r && (r < 0 && (A_ = O_), O_ += r), N_ = j_ === __ && (M_ === __ || M_ === g_) || M_ === __ && j_ !== y_, P_ = !(j_ !== v_ && j_ !== __ || M_ !== b_ && M_ !== y_), E_ = F_ && i ? s - i : s, e && s && T_ + w_ + O_ > E_ && (c ? (w_ && V_(), T_ && H_()) : (P_ ||= j_ === g_ && M_ == y_, (N_ || P_ || j_ === x_ || j_ === v_ || j_ === __ || w_ + O_ > E_) && w_ && V_(), T_ && H_())), D_ === " " && !0 !== F_ && T_ + w_ === 0 || (j_ === x_ ? (D_ === " " && w_ && V_(), B_(D_, O_), V_()) : ((N_ || P_) && w_ && V_(), B_(D_, O_))), M_ = j_);
			w_ && V_(), T_ && H_(), z_.length > 0 && (z_[z_.length - 1].paraEnd = !0);
		} else t.split("\n").forEach((e) => {
			I_.paraNumber++, T_ = o.measureText(e).width, z_.push({
				x: i || 0,
				text: e,
				width: T_,
				paraStart: !0
			}), R_ && U_();
		});
	}(s, e, t), o && function(e, t, n, r, i) {
		if (!r && n.autoSizeAlign) switch (n.textAlign) {
			case "left":
				J_(t, "x", e[q_]);
				break;
			case "right": J_(t, "x", -e[G_]);
		}
		if (!i && n.autoSizeAlign) switch (n.verticalAlign) {
			case "top":
				J_(t, "y", e[W_]);
				break;
			case "bottom": J_(t, "y", -e[K_]);
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
		switch (e.decorationHeight = i / 11, I(a) ? (n = a.type, a.color && (e.decorationColor = Xd.string(a.color)), a.offset && (r = Math.min(.3 * i, Math.max(a.offset, .15 * -i)))) : n = a, n) {
			case "under":
				e.decorationY = [.15 * i + r];
				break;
			case "delete":
				e.decorationY = [.35 * -i];
				break;
			case "under-delete": e.decorationY = [.15 * i + r, .35 * -i];
		}
	}(s, t), s;
} }), Object.assign(Xd, { string: function(e, t) {
	if (!e) return "#000";
	let n = F(t) && t < 1;
	if (Un(e)) {
		if (!n || !Xd.object) return e;
		e = Xd.object(e);
	}
	let r = P(e.a) ? 1 : e.a;
	n && (r *= t);
	let i = e.r + "," + e.g + "," + e.b;
	return r === 1 ? "rgb(" + i + ")" : "rgba(" + i + "," + r + ")";
} }), Object.assign(Y, Nh), Object.assign($d, fg), Object.assign(ef, jg), Object.assign(tf, Wg), Object.assign(Ri, {
	interaction: (e, t, n, r) => new hh(e, t, n, r),
	hitCanvas: (e, t) => new Wm(e, t),
	hitCanvasManager: () => new Dm()
}), Gm();
//#endregion
//#region node_modules/@leafer-in/viewport/dist/viewport.esm.min.js
function Y_(e) {
	let { scroll: t, disabled: n } = e.app.config.move;
	return !t || n ? "" : !0 === t ? "free" : t;
}
function X_(e, t, n) {
	Z_(e.parentApp ? e.parentApp : e, t), e.isApp || n || e.__eventIds.push(e.on_(rm.BEFORE_MOVE, (t) => {
		let n = Y_(e).includes("limit"), r = e.app.config.move.scrollLimit === "stop", i = e.getValidMove(t.moveX, t.moveY, n && r);
		if (n && !r) {
			let n = e.getValidMove(0, 0);
			if (n.x || n.y) {
				let e = t.moveType === "drag" ? .3 : .05;
				Math.abs(n.x) > 100 ? i.x = 0 : i.x *= e, Math.abs(n.y) > 200 ? i.y = 0 : i.y *= e;
			}
		}
		e.zoomLayer.move(i);
	}), e.on_(rm.DRAG_ANIMATE, () => {
		let t = e.getValidMove(0, 0);
		(t.x || t.y) && e.interaction.stopDragAnimate();
	}), e.on_(rm.END, (t) => {
		Ml.animateMove(e.zoomLayer, e.getValidMove(t.moveX, t.moveY));
	}), e.on_(sm.BEFORE_ZOOM, (t) => {
		let { zoomLayer: n, layouter: r } = e, i = e.getValidScale(t.scale);
		i !== 1 && (r.stop(), Ml.updateMatrix(e), n.scaleOfWorld(t, i), r.start());
	}));
}
function Z_(e, t) {
	let n = {
		wheel: { preventDefault: !0 },
		touch: { preventDefault: !0 },
		pointer: { preventDefaultMenu: !0 }
	};
	t && Jn.assign(n, t), Jn.assign(e.config, n, e.userConfig);
}
var Q_ = Ai.get("LeaferTypeCreator"), $_ = {
	list: {},
	register(e, t) {
		ev[e] && Q_.repeat(e), ev[e] = t;
	},
	run(e, t) {
		let n = ev[e];
		n && n(t);
	}
}, { list: ev, register: tv } = $_;
tv("viewport", X_), tv("custom", function(e) {
	X_(e, null, !0);
}), tv("design", function(e) {
	X_(e, {
		zoom: {
			min: .01,
			max: 256
		},
		move: {
			holdSpaceKey: !0,
			holdMiddleKey: !0
		}
	});
}), tv("document", function(e) {
	X_(e, {
		zoom: { min: 1 },
		move: { scroll: "limit" }
	});
});
var nv = {
	state: {
		type: "none",
		typeCount: 0,
		startTime: 0,
		totalData: null,
		center: {}
	},
	getData(e) {
		let t = e[0], n = e[1], r = z.getCenter(t.from, n.from), i = z.getCenter(t.to, n.to), a = {
			x: i.x - r.x,
			y: i.y - r.y
		}, o = z.getDistance(t.from, n.from);
		return {
			move: a,
			scale: z.getDistance(t.to, n.to) / o,
			rotation: z.getRotation(t.from, n.from, t.to, n.to),
			center: i
		};
	},
	getType(e, t) {
		let n = Math.hypot(e.move.x, e.move.y) / (t.move || 5), r = Math.abs(e.scale - 1) / (t.scale || .03), i = Math.abs(e.rotation) / (t.rotation || 2);
		return n < 1 && r < 1 && i < 1 ? "none" : n >= r && n >= i ? "move" : r >= i ? "zoom" : "rotate";
	},
	detect(e, t) {
		let { state: n } = rv, r = rv.getType(e, t);
		if (n.totalData || (n.startTime = Date.now(), n.center = e.center), rv.add(e, n.totalData), n.totalData = e, r === n.type) {
			if (n.typeCount++, n.typeCount >= (t.count || 3) && r !== "none") return r;
		} else n.type = r, n.typeCount = 1;
		return Date.now() - n.startTime >= (t.time || 160) ? rv.getType(n.totalData, t) : "none";
	},
	add(e, t) {
		t && (z.move(e.move, t.move), e.scale *= t.scale, e.rotation += t.rotation, e.center = t.center);
	},
	reset() {
		let { state: e } = rv;
		e.type = "none", e.typeCount = 0, e.startTime = 0, e.totalData = null;
	}
}, rv = nv, { abs: iv, max: av } = Math, { sign: ov, within: sv } = hr, cv = {
	getMove(e, t) {
		let { moveSpeed: n } = t, { deltaX: r, deltaY: i } = e;
		e.shiftKey && !r && (r = i, i = 0);
		let a = iv(r), o = iv(i);
		return a > 50 && (r = av(50, a / 3) * ov(r)), o > 50 && (i = av(50, o / 3) * ov(i)), {
			x: -r * n * 2,
			y: -i * n * 2
		};
	},
	getScale(e, t) {
		let n, r = 1, { zoomMode: i, zoomSpeed: a } = t, o = e.deltaY || e.deltaX;
		if (i ? (n = i === "mouse" || !e.deltaX && (V.intWheelDeltaY ? Math.abs(o) > 17 : Math.ceil(o) !== o), (e.shiftKey || e.metaKey || e.ctrlKey) && (n = !0)) : n = !e.shiftKey && (e.metaKey || e.ctrlKey), n) {
			a = sv(a, 0, 1);
			let n = e.deltaY ? t.delta.y : t.delta.x, i = sv(1 - iv(o) / (4 * n) * a, .5, 2);
			r = o > 0 ? i : 1 / i;
		}
		return r;
	}
}, lv, uv, dv, fv, pv = class {
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
		e.moveType ||= "move", this.moveData || (this.setPath(e), lv = 0, uv = 0, this.moveData = Object.assign(Object.assign({}, e), {
			moveX: 0,
			moveY: 0,
			totalX: lv,
			totalY: uv
		}), t.emit(rm.START, this.moveData)), e.path = this.moveData.path, e.totalX = lv += e.moveX, e.totalY = uv += e.moveY, t.emit(rm.BEFORE_MOVE, e), t.emit(rm.MOVE, e), this.transformEndWait();
	}
	zoom(e) {
		let { interaction: t } = this;
		this.zoomData || (this.setPath(e), dv = 1, this.zoomData = Object.assign(Object.assign({}, e), {
			scale: 1,
			totalScale: dv
		}), t.emit(sm.START, this.zoomData)), e.path = this.zoomData.path, e.totalScale = dv *= e.scale, t.emit(sm.BEFORE_ZOOM, e), t.emit(sm.ZOOM, e), this.transformEndWait();
	}
	rotate(e) {
		let { interaction: t } = this;
		this.rotateData || (this.setPath(e), fv = 0, this.rotateData = Object.assign(Object.assign({}, e), {
			rotation: 0,
			totalRotation: fv
		}), t.emit(am.START, this.rotateData)), e.path = this.rotateData.path, e.totalRotation = fv += e.rotation, t.emit(am.BEFORE_ROTATE, e), t.emit(am.ROTATE, e), this.transformEndWait();
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
		t && e.emit(rm.END, Object.assign(Object.assign({}, t), {
			totalX: lv,
			totalY: uv
		})), n && e.emit(sm.END, Object.assign(Object.assign({}, n), { totalScale: dv })), r && e.emit(am.END, Object.assign(Object.assign({}, r), { totalRotation: fv })), this.reset();
	}
	reset() {
		this.zoomData = this.moveData = this.rotateData = null;
	}
	destroy() {
		this.reset();
	}
}, mv = Vf.prototype, hv = new xi(), gv = new Gr();
function _v(e, t) {
	return Object.assign(Object.assign({}, t), {
		moveX: e.x,
		moveY: e.y
	});
}
function vv(e, t) {
	return Object.assign(Object.assign({}, t), { scale: e });
}
mv.initType = function(e) {
	$_.run(e, this);
}, mv.getValidMove = function(e, t, n = !0) {
	let { disabled: r, scrollSpread: i } = this.app.config.move;
	gv.set(e, t);
	let a = Y_(this);
	return a && (a.includes("x") ? gv.y = 0 : a.includes("y") ? gv.x = 0 : Math.abs(gv.x) > Math.abs(gv.y) ? gv.y = 0 : gv.x = 0, n && a.includes("limit") && (hv.set(this.__world).addPoint(this.zoomLayer), i && hv.spread(i), $p.getValidMove(hv, this.canvas.bounds, "auto", gv, !0), a.includes("x") ? gv.y = 0 : a.includes("y") && (gv.x = 0))), {
		x: r ? 0 : gv.x,
		y: r ? 0 : gv.y
	};
}, mv.getValidScale = function(e) {
	let { scaleX: t } = this.zoomLayer.__, { min: n, max: r, disabled: i } = this.app.config.zoom, a = Math.abs(t * e);
	return n && a < n ? e = n / t : r && a > r && (e = r / t), i ? 1 : e;
};
var yv = Tm.prototype;
yv.createTransformer = function() {
	this.transformer = new pv(this);
}, yv.move = function(e) {
	this.transformer.move(e);
}, yv.zoom = function(e) {
	this.transformer.zoom(e);
}, yv.rotate = function(e) {
	this.transformer.rotate(e);
}, yv.transformEnd = function() {
	this.transformer.transformEnd();
}, yv.wheel = function(e) {
	let { wheel: t, pointer: n } = this.config, { posDeltaSpeed: r, negDeltaSpeed: i } = t;
	if (t.disabled) return;
	e.deltaX > 0 ? r && (e.deltaX *= r) : i && (e.deltaX *= i), e.deltaY > 0 ? r && (e.deltaY *= r) : i && (e.deltaY *= i);
	let a = t.getScale ? t.getScale(e, t) : cv.getScale(e, t);
	if (a !== 1) this.zoom(vv(a, e));
	else {
		let r = t.getMove ? t.getMove(e, t) : cv.getMove(e, t);
		n.snap && z.round(r), this.move(_v(r, e));
	}
}, yv.multiTouch = function(e, t) {
	let { disabled: n, singleGesture: r } = this.config.multiTouch;
	if (n) return;
	this.pointerWaitCancel();
	let i = nv.getData(t), { moving: a, zooming: o, rotating: s } = this.transformer;
	if (r) {
		if (!this.transformer.transforming) {
			switch (nv.detect(i, I(r) ? r : {})) {
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
			nv.reset();
		}
		a || (i.center = nv.state.center);
	} else a = o = s = !0;
	var c, l;
	Object.assign(e, i.center), e.multiTouch = !0, s && this.rotate((c = i.rotation, l = e, Object.assign(Object.assign({}, l), { rotation: c }))), o && this.zoom(vv(i.scale, e)), a && this.move(_v(i.move, e));
};
var bv = hm.prototype, { abs: xv, min: Sv, max: Cv, hypot: wv } = Math;
bv.checkDragEndAnimate = function(e) {
	let { interaction: t } = this, n = this.canAnimate && this.moving && t.m.dragAnimate;
	if (n) {
		let r = F(n) ? n : .95, i = .15, a, o, s, c = 0, l = 0, u = 0, d = 0, f = 3, { dragDataList: p } = this, m = p.length;
		for (let e = m - 1; e >= Cv(m - 3, 0) && (s = p[e], !(s.time && Date.now() - s.time > 100)); e--) a = f--, c += s.moveX * a, l += s.moveY * a, d += a, o = wv(s.moveX, s.moveY), o > u && (u = o);
		if (d && (c /= d, l /= d), u > 8) {
			let e = 1.15 + Sv((u - 8) / 17, 1) * (1.6 - 1.15);
			c *= e, l *= e;
		}
		let h = Cv(xv(c), xv(l));
		h > 150 && (o = 150 / h, c *= o, l *= o);
		let g = () => {
			if (c *= r, l *= r, e = Object.assign({}, e), xv(c) < i && xv(l) < i) return this.dragEndReal(e);
			z.move(e, c, l), this.drag(e), this.animate(g), t.emit(rm.DRAG_ANIMATE, e);
		};
		this.animate(g);
	}
	return n;
}, bv.animate = function(e, t) {
	let n = e || this.animateWait;
	n && this.interaction.target.nextRender(n, null, t), this.animateWait = e;
}, bv.stopAnimate = function() {
	this.animate(null, "off"), this.interaction.target.nextRender(() => {
		this.dragData && this.dragEndReal(this.dragData);
	});
}, bv.checkDragOut = function(e) {
	let { interaction: t } = this;
	this.autoMoveCancel(), this.dragging && !t.shrinkCanvasBounds.hitPoint(e) && this.autoMoveOnDragOut(e);
}, bv.autoMoveOnDragOut = function(e) {
	let { interaction: t, downData: n, canDragOut: r } = this, { autoDistance: i, dragOut: a } = t.m;
	if (!a || !r || !i) return;
	let o = t.shrinkCanvasBounds, { x: s, y: c } = o, l = B.maxX(o), u = B.maxY(o), d = e.x < s ? i : l < e.x ? -i : 0, f = e.y < c ? i : u < e.y ? -i : 0, p = 0, m = 0;
	this.autoMoveTimer = setInterval(() => {
		p += d, m += f, z.move(n, d, f), z.move(this.dragData, d, f), t.move(Object.assign(Object.assign({}, e), {
			moveX: d,
			moveY: f,
			totalX: p,
			totalY: m,
			moveType: "drag"
		})), t.pointerMoveReal(e);
	}, 10);
}, bv.autoMoveCancel = function() {
	this.autoMoveTimer &&= (clearInterval(this.autoMoveTimer), 0);
}, Li.add("viewport");
//#endregion
//#region node_modules/@leafer-in/view/dist/view.esm.min.js
function Tv(e, t) {
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
Li.add("view"), Vf.prototype.zoom = function(e, t, n, r) {
	let i;
	Kn(t) ? (i = t.padding, n = t.scroll, r = t.transition) : i = t;
	let { zoomLayer: a } = this, o = this.canvas.bounds.clone().shrink(Hn(i) ? 30 : i), s = new xi(), c = {
		x: o.x + o.width / 2,
		y: o.y + o.height / 2
	}, l;
	a.killAnimate();
	let { x: u, y: d, scaleX: f, scaleY: p } = a.__, { boxBounds: m } = a;
	if (Un(e)) switch (e) {
		case "in":
			l = Tv(f, "in");
			break;
		case "out":
			l = Tv(f, "out");
			break;
		case "fit":
			e = m;
			break;
		case "fit-width":
			(e = new xi(m)).height = 0;
			break;
		case "fit-height": (e = new xi(m)).width = 0;
	}
	else F(e) && (l = e / f);
	if (l) l = this.getValidScale(l), a.scaleOfWorld(c, l, l, !1, r);
	else if (I(e)) {
		let t = {
			x: u,
			y: d,
			scaleX: f,
			scaleY: p
		}, i = Gn(e);
		if (i || e.tag) {
			let t = i ? e : [e];
			s.setListWithFn(t, Bl.worldBounds);
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
		return n ? (h += Math.max((o.width - c) / 2, 0), g += Math.max((o.height - m) / 2, 0)) : (l = this.getValidScale(Math.min(o.width / c, o.height / m)), h += (o.width - c * l) / 2, g += (o.height - m * l) / 2, z.scaleOf(t, s, l), s.scaleOf(s, l), t.scaleX *= l, t.scaleY *= l), n === "x" ? g = 0 : n === "y" && (h = 0), z.move(t, h, g), s.move(h, g), a.set(t, r), s;
	}
	return a.worldBoxBounds;
};
//#endregion
//#region node_modules/@leafer-in/color/dist/color.esm.min.js
var Ev = {
	transparent: "FFF0",
	aliceblue: "F0F8FF",
	antiquewhite: "FAEBD7",
	aqua: "0FF",
	aquamarine: "7FFFD4",
	azure: "F0FFFF",
	beige: "F5F5DC",
	bisque: "FFE4C4",
	black: "0",
	blanchedalmond: "FFEBCD",
	blue: "00F",
	blueviolet: "8A2BE2",
	brown: "A52A2A",
	burlywood: "DEB887",
	cadetblue: "5F9EA0",
	chartreuse: "7FFF00",
	chocolate: "D2691E",
	coral: "FF7F50",
	cornflowerblue: "6495ED",
	cornsilk: "FFF8DC",
	crimson: "DC143C",
	cyan: "0FF",
	darkblue: "00008B",
	darkcyan: "008B8B",
	darkgoldenrod: "B8860B",
	darkgray: "A9",
	darkgreen: "006400",
	darkgrey: "A9",
	darkkhaki: "BDB76B",
	darkmagenta: "8B008B",
	darkolivegreen: "556B2F",
	darkorange: "FF8C00",
	darkorchid: "9932CC",
	darkred: "8B0000",
	darksalmon: "E9967A",
	darkseagreen: "8FBC8F",
	darkslateblue: "483D8B",
	darkslategray: "2F4F4F",
	darkslategrey: "2F4F4F",
	darkturquoise: "00CED1",
	darkviolet: "9400D3",
	deeppink: "FF1493",
	deepskyblue: "00BFFF",
	dimgray: "69",
	dimgrey: "69",
	dodgerblue: "1E90FF",
	firebrick: "B22222",
	floralwhite: "FFFAF0",
	forestgreen: "228B22",
	fuchsia: "F0F",
	gainsboro: "DC",
	ghostwhite: "F8F8FF",
	gold: "FFD700",
	goldenrod: "DAA520",
	gray: "80",
	green: "008000",
	greenyellow: "ADFF2F",
	grey: "80",
	honeydew: "F0FFF0",
	hotpink: "FF69B4",
	indianred: "CD5C5C",
	indigo: "4B0082",
	ivory: "FFFFF0",
	khaki: "F0E68C",
	lavender: "E6E6FA",
	lavenderblush: "FFF0F5",
	lawngreen: "7CFC00",
	lemonchiffon: "FFFACD",
	lightblue: "ADD8E6",
	lightcoral: "F08080",
	lightcyan: "E0FFFF",
	lightgoldenrodyellow: "FAFAD2",
	lightgray: "D3",
	lightgreen: "90EE90",
	lightgrey: "D3",
	lightpink: "FFB6C1",
	lightsalmon: "FFA07A",
	lightseagreen: "20B2AA",
	lightskyblue: "87CEFA",
	lightslategray: "789",
	lightslategrey: "789",
	lightsteelblue: "B0C4DE",
	lightyellow: "FFFFE0",
	lime: "00FF00",
	limegreen: "32CD32",
	linen: "FAF0E6",
	magenta: "FF00FF",
	maroon: "800000",
	mediumaquamarine: "66CDAA",
	mediumblue: "0000CD",
	mediumorchid: "BA55D3",
	mediumpurple: "9370DB",
	mediumseagreen: "3CB371",
	mediumslateblue: "7B68EE",
	mediumspringgreen: "00FA9A",
	mediumturquoise: "48D1CC",
	mediumvioletred: "C71585",
	midnightblue: "191970",
	mintcream: "F5FFFA",
	mistyrose: "FFE4E1",
	moccasin: "FFE4B5",
	navajowhite: "FFDEAD",
	navy: "000080",
	oldlace: "FDF5E6",
	olive: "808000",
	olivedrab: "6B8E23",
	orange: "FFA500",
	orangered: "FF4500",
	orchid: "DA70D6",
	palegoldenrod: "EEE8AA",
	palegreen: "98FB98",
	paleturquoise: "AFEEEE",
	palevioletred: "D87093",
	papayawhip: "FFEFD5",
	peachpuff: "FFDAB9",
	peru: "CD853F",
	pink: "FFC0CB",
	plum: "DDA0DD",
	powderblue: "B0E0E6",
	purple: "800080",
	rebeccapurple: "639",
	red: "F00",
	rosybrown: "BC8F8F",
	royalblue: "4169E1",
	saddlebrown: "8B4513",
	salmon: "FA8072",
	sandybrown: "F4A460",
	seagreen: "2E8B57",
	seashell: "FFF5EE",
	sienna: "A0522D",
	silver: "C0",
	skyblue: "87CEEB",
	slateblue: "6A5ACD",
	slategray: "708090",
	slategrey: "708090",
	snow: "FFFAFA",
	springgreen: "00FF7F",
	steelblue: "4682B4",
	tan: "D2B48C",
	teal: "008080",
	thistle: "D8BFD8",
	tomato: "FF6347",
	turquoise: "40E0D0",
	violet: "EE82EE",
	wheat: "F5DEB3",
	white: "F",
	whitesmoke: "F5",
	yellow: "FF0",
	yellowgreen: "9ACD32"
}, Dv = /^rgb\((\d+),\s*(\d+),\s*(\d+)/i, Ov = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d*\.?\d+)/i, kv = /^hsl\((\d+),\s*(\d+)%\s*,\s*(\d+)%/i, Av = /^hsla\((\d+),\s*(\d+)%\s*,\s*(\d+)%\s*,\s*(\d*\.?\d+)/i, jv = parseInt, Mv = parseFloat, { round: Nv } = Math, Pv = {}, Fv = 0;
function Iv(e) {
	let t, n, r, i = 1;
	switch (e.length) {
		case 9:
			t = jv(e.slice(1, 3), 16), n = jv(e.slice(3, 5), 16), r = jv(e.slice(5, 7), 16), i = jv(e.slice(7, 9), 16) / 255;
			break;
		case 7:
			t = jv(e.slice(1, 3), 16), n = jv(e.slice(3, 5), 16), r = jv(e.slice(5, 7), 16);
			break;
		case 5:
			t = jv(e[1] + e[1], 16), n = jv(e[2] + e[2], 16), r = jv(e[3] + e[3], 16), i = jv(e[4] + e[4], 16) / 255;
			break;
		case 4:
			t = jv(e[1] + e[1], 16), n = jv(e[2] + e[2], 16), r = jv(e[3] + e[3], 16);
			break;
		case 3:
			t = n = r = jv(e[1] + e[2], 16);
			break;
		case 2: t = n = r = jv(e[1] + e[1], 16);
	}
	return {
		r: t,
		g: n,
		b: r,
		a: i
	};
}
var Lv = 1 / 6, Rv = .5, zv = 2 / 3, Bv = 1 / 3;
function Vv(e, t, n) {
	return n < 0 ? n++ : n > 1 && n--, n < Lv ? e + 6 * (t - e) * n : n < Rv ? t : n < zv ? e + (t - e) * (zv - n) * 6 : e;
}
function Hv(e, t, n, r = 1) {
	let i, a, o;
	if (e /= 360, n /= 100, (t /= 100) == 0) i = a = o = n;
	else {
		let r = n < .5 ? n * (1 + t) : n + t - n * t, s = 2 * n - r;
		i = Vv(s, r, e + Bv), a = Vv(s, r, e), o = Vv(s, r, e - Bv);
	}
	return {
		r: Nv(255 * i),
		g: Nv(255 * a),
		b: Nv(255 * o),
		a: r
	};
}
Li.add("color"), Xd.object = function(e, t) {
	let n, r = !P(t) && t < 1;
	if (Un(e)) {
		let t = Pv[e];
		if (t) n = Object.assign({}, t);
		else {
			switch (e[0]) {
				case "#":
					n = Iv(e);
					break;
				case "R":
				case "r":
					e[4] === "(" && Ov.test(e) ? n = function(e) {
						let t = Ov.exec(e);
						return {
							r: jv(t[1]),
							g: jv(t[2]),
							b: jv(t[3]),
							a: Mv(t[4])
						};
					}(e) : e[3] === "(" && Dv.test(e) && (n = function(e) {
						let t = Dv.exec(e);
						return {
							r: jv(t[1]),
							g: jv(t[2]),
							b: jv(t[3]),
							a: 1
						};
					}(e));
					break;
				case "H":
				case "h": e[4] === "(" && Av.test(e) ? n = function(e) {
					let t = Av.exec(e);
					return Hv(Mv(t[1]), Mv(t[2]), Mv(t[3]), Mv(t[4]));
				}(e) : e[3] === "(" && kv.test(e) && (n = function(e) {
					let t = kv.exec(e);
					return Hv(Mv(t[1]), Mv(t[2]), Mv(t[3]), 1);
				}(e));
			}
			if (!n) {
				let t = Ev[e.toLowerCase()];
				t && (n = Iv("#" + t));
			}
			n && (Fv++, Fv > 1e4 && (Pv = {}, Fv = 0), Pv[e] = Object.assign({}, n));
		}
	} else I(e) && (P(e.a) && (e.a = 1), r && (e = Object.assign({}, e)), n = e);
	return n ||= {
		r: 255,
		g: 255,
		b: 255,
		a: 1
	}, r && (n.a *= t), n;
};
//#endregion
//#region node_modules/@leafer-in/animate/dist/animate.esm.min.js
function Uv(e, t, n, r) {
	var i, a = arguments.length, o = a < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") o = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (i = e[s]) && (o = (a < 3 ? i(o) : a > 3 ? i(t, n, o) : i(t, n)) || o);
	return a > 3 && o && Object.defineProperty(t, n, o), o;
}
var { cos: Wv, sin: Gv, pow: Kv, sqrt: qv, abs: Jv, ceil: Yv, floor: Xv, round: Zv, PI: Qv } = Math, $v = 5 * Qv, ey = 1.70158, ty = 2.5949095, ny = 7.5625, ry = 2.75;
function iy(e) {
	return (t) => Kv(t, e);
}
function ay(e) {
	return (t) => 1 - Kv(1 - t, e);
}
function oy(e) {
	return (t) => t < .5 ? .5 * Kv(2 * t, e) : 1 - .5 * Kv(2 - 2 * t, e);
}
function sy(e) {
	return e < 1 / ry ? ny * e * e : e < 2 / ry ? ny * (e -= 1.5 / ry) * e + .75 : e < 2.5 / ry ? ny * (e -= 2.25 / ry) * e + .9375 : ny * (e -= 2.625 / ry) * e + .984375;
}
function cy(e, t, n, r) {
	let i = {};
	return (a) => {
		let o = ~~(1e4 * a), s = i[o];
		if (s) return s;
		let c, l, u, d = a;
		for (let t = 0; t < 8 && (c = 1 - d, u = ly(d, e, n) - a, l = 3 * c * c * e + 6 * c * d * (n - e) + 3 * d * d * (1 - n), !(Jv(l) < 1e-6)); t++) d -= u / l;
		return i[o] = ly(d, t, r);
	};
}
function ly(e, t, n) {
	let r = 1 - e;
	return 3 * r * r * e * t + 3 * r * e * e * n + e * e * e;
}
var uy = {
	get(e) {
		let { list: t } = uy;
		return Un(e) ? t[e || "ease"] : I(e) ? t[e.name].apply(t, Gn(e.value) ? e.value : [e.value]) : t.ease;
	},
	register(e, t) {
		uy.list[e] = t;
	},
	list: {
		linear: (e) => e,
		ease: cy(.25, .1, .25, 1),
		"ease-in": cy(.42, 0, 1, 1),
		"ease-out": cy(0, 0, .58, 1),
		"ease-in-out": cy(.42, 0, .58, 1),
		"sine-in": (e) => 1 - Wv(e * Qv * .5),
		"sine-out": (e) => Gv(e * Qv * .5),
		"sine-in-out": (e) => .5 * (1 - Wv(e * Qv)),
		"quad-in": iy(2),
		"quad-out": ay(2),
		"quad-in-out": oy(2),
		"cubic-in": iy(3),
		"cubic-out": ay(3),
		"cubic-in-out": oy(3),
		"quart-in": iy(4),
		"quart-out": ay(4),
		"quart-in-out": oy(4),
		"quint-in": iy(5),
		"quint-out": ay(5),
		"quint-in-out": oy(5),
		"expo-in": (e) => e ? Kv(2, 10 * e - 10) : 0,
		"expo-out": (e) => e === 1 ? 1 : 1 - Kv(2, 10 * -e),
		"expo-in-out": (e) => e === 0 || e === 1 ? e : e < .5 ? .5 * Kv(2, 2 * e * 10 - 10) : .5 * (2 - Kv(2, 10 - 2 * e * 10)),
		"circ-in": (e) => 1 - qv(1 - Kv(e, 2)),
		"circ-out": (e) => qv(1 - Kv(e - 1, 2)),
		"circ-in-out": (e) => e < .5 ? .5 * (1 - qv(1 - Kv(2 * e, 2))) : .5 * (qv(1 - Kv(2 - 2 * e, 2)) + 1),
		"back-in": (e) => (2.70158 * e - ey) * e * e,
		"back-out": (e) => --e * e * (2.70158 * e + ey) + 1,
		"back-in-out": (e) => e < .5 ? (e *= 2) * e * (3.5949095 * e - ty) * .5 : .5 * ((e = 2 * e - 2) * e * (3.5949095 * e + ty) + 2),
		"elastic-in": (e) => e === 0 || e === 1 ? e : -Kv(2, 10 * (e - 1)) * Gv((e - 1.1) * $v),
		"elastic-out": (e) => e === 0 || e === 1 ? e : Kv(2, -10 * e) * Gv((e - .1) * $v) + 1,
		"elastic-in-out": (e) => e === 0 || e === 1 ? e : e < .5 ? -Kv(2, 10 * ((e *= 2) - 1)) * Gv((e - 1.1) * $v) * .5 : Kv(2, 10 * (1 - (e *= 2))) * Gv((e - 1.1) * $v) * .5 + 1,
		"bounce-in": (e) => 1 - sy(1 - e),
		"bounce-out": sy,
		"bounce-in-out": (e) => e < .5 ? .5 * (1 - sy(1 - 2 * e)) : .5 * (1 + sy(2 * e - 1)),
		"cubic-bezier": cy,
		steps: function(e, t = "floor") {
			return (n) => (t === "floor" ? Xv(n * e) : t === "ceil" ? Yv(n * e) : Zv(n * e)) / e;
		}
	}
};
function dy(e) {
	return (t, n) => {
		Object.defineProperty(t, n, {
			get() {
				let t = this.config && this.config[n];
				return t === void 0 ? e : t;
			},
			set(e) {
				this.config ||= {}, this.config[n] = e;
			}
		});
	};
}
var fy = class {};
fy.CREATED = "created", fy.PLAY = "play", fy.PAUSE = "pause", fy.STOP = "stop", fy.SEEK = "seek", fy.UPDATE = "update", fy.COMPLETED = "completed";
var py = class extends ku {
	get endingStyle() {
		return this.realEnding === "from" ? this.fromStyle : this.toStyle;
	}
	get started() {
		return !!this.requestAnimateTime;
	}
	get completed() {
		return this.time >= this.duration && !this.started;
	}
	get frame() {
		return this.frames[this.nowIndex];
	}
	get frameTotalTime() {
		return this.frame.totalTime || this.frame.duration || 0;
	}
	get nowReverse() {
		return +!!this.mainReverse + +!!this.frameReverse == 1;
	}
	get realEnding() {
		let e, { ending: t, reverse: n, swing: r, loop: i } = this;
		return t === "from" ? e = 0 : t === "to" ? e = 1 : (e = +!n, r && i && F(i) && (e += i - 1)), e % 2 ? "to" : "from";
	}
	constructor(e, t, n, r) {
		super(), this.nowIndex = 0, this.playedTotalTime = 0, t && (t.keyframes ? (n = t, t = t.keyframes) : t.style && (n = t, t = t.style)), this.init(e, t, n, r);
	}
	init(e, t, n, r) {
		switch (this.target = e, (r || this.isTemp) && (this.isTemp = r), typeof n) {
			case "number":
				this.config = { duration: n };
				break;
			case "string":
				this.config = { easing: n };
				break;
			case "object": this.config = n, n.event && (this.event = n.event);
		}
		this.keyframes = Gn(t) ? t : t ? [t] : [];
		let { easing: i, attrs: a } = this;
		this.easingFn = uy.get(i), (a || this.attrsMap) && (this.attrsMap = a ? a.reduce((e, t) => (e[t] = !0, e), {}) : void 0), this.frames = [], this.create(), this.autoplay && this.frames.length && (this.timer = setTimeout(() => {
			this.timer = 0, this.play();
		}, 0));
	}
	emitType(e) {
		this.emit(e, this), this.parent && this.parent.onChildEvent(e, this);
	}
	play() {
		this.destroyed || (this.running = !0, this.started ? this.timer || this.startRequestAnimate() : (this.clearTimer(), this.start()), this.emitType(fy.PLAY));
	}
	pause() {
		this.destroyed || (this.running = !1, this.clearTimer(), this.emitType(fy.PAUSE));
	}
	stop() {
		this.destroyed || (this.complete(), this.emitType(fy.STOP));
	}
	seek(e, t) {
		if (this.destroyed) return;
		let { delay: n } = this, r;
		I(e) && (e = Zd.number(e, this.duration + (t ? n : 0))), t && (e -= n), e && (e /= this.speed), e < 0 && (r = -e, e = 0), (!this.started || e < this.time || !e) && this.start(!0), this.time = e, r || this.animate(0, !0), this.clearTimer(() => {
			r ? this.timer = setTimeout(() => {
				this.timer = 0, this.begin();
			}, 1e3 * r) : this.startRequestAnimate();
		}), this.emitType(fy.SEEK);
	}
	kill(e = !0, t) {
		this.killStyle = t, this.destroy(e);
	}
	create() {
		let { target: e, frames: t, keyframes: n, config: r } = this, { length: i } = n, a = !(i > 1) || this.join, o, s, c, l, u, d = 0, f = 0;
		i > 1 && (this.fromStyle = {}, this.toStyle = {});
		for (let r = 0; r < i; r++) {
			if (s = n[r], l = s.style || s, o ||= a ? e : l, c = {
				style: l,
				beforeStyle: {}
			}, u = 1, s.style) {
				let { duration: e, autoDuration: t, delay: n, autoDelay: r, easing: i, swing: a, loop: o } = s;
				a && (c.swing = F(a) ? a : 2, u = 2 * c.swing - 1), o && (c.loop = u = F(o) ? o : 2), e ? (c.duration = e, d += e * u, n && (c.totalTime = e + n)) : t && (c.autoDuration = t, f += t * u), n ? (c.delay = n, d += n * u) : r && (c.autoDelay = r, f += r * u), i && (c.easingFn = uy.get(i));
			}
			if (!c.autoDuration && P(c.duration) && (i > 1 ? r > 0 || a ? f += u : c.duration = 0 : c.duration = this.duration), i > 1) this.setBefore(c, l, o);
			else {
				for (let t in l) c.beforeStyle[t] = e[t];
				this.fromStyle = c.beforeStyle, this.toStyle = c.style;
			}
			o = l, t.push(c);
		}
		f ? ((this.duration <= d || !r || !r.duration) && this.changeDuration(d + .2 * f), this.allocateTime((this.duration - d) / f)) : d && this.changeDuration(d), this.emitType(fy.CREATED);
	}
	changeDuration(e) {
		let { config: t } = this;
		this.config = t ? Object.assign(Object.assign({}, t), { duration: e }) : { duration: e };
	}
	setBefore(e, t, n) {
		let { fromStyle: r, toStyle: i, target: a } = this;
		for (let o in t) P(r[o]) && (r[o] = i[o] = t === n ? n[o] : a[o]), e.beforeStyle[o] = P(n[o]) ? i[o] : n[o], i[o] = t[o];
	}
	allocateTime(e) {
		let t, { frames: n } = this, { length: r } = n;
		for (let i = 0; i < r; i++) t = n[i], P(t.duration) && (t.duration = t.autoDuration ? e * t.autoDuration : e), t.totalTime || (t.autoDelay && (t.delay = t.autoDelay * e), t.delay && (t.totalTime = t.duration + t.delay));
	}
	startRequestAnimate() {
		this.requestAnimateTime = Date.now(), this.requestAnimatePageTime = 0, this.waitRequestRender || this.requestAnimate();
	}
	requestAnimate() {
		this.waitRequestRender = !0, V.requestRender(this.animate.bind(this));
	}
	animate(e, t) {
		if (!t) {
			if (this.waitRequestRender = !1, !this.running) return;
			let t;
			t = e && this.requestAnimatePageTime ? e - this.requestAnimatePageTime : Date.now() - this.requestAnimateTime, this.time += t / 1e3, this.requestAnimatePageTime = e, this.requestAnimateTime = Date.now();
		}
		let { duration: n } = this, r = this.time * this.speed;
		if (r < n) {
			for (; r - this.playedTotalTime > this.frameTotalTime;) this.transition(1), this.mainReverse ? this.reverseNextFrame() : this.nextFrame();
			let e = this.nowReverse ? 0 : this.frame.delay || 0, t = r - this.playedTotalTime - e, n = this.frame.duration;
			if (t > n) this.transition(1);
			else if (t >= 0) {
				let e = n ? t / n : 1;
				this.transition(this.frame.easingFn ? this.frame.easingFn(e) : this.easingFn(e));
			}
		} else this.end();
		if (!t) if (r < n) this.requestAnimate();
		else {
			let { loop: e, loopDelay: t, swing: n } = this;
			if ((!1 !== e || n) && (this.looped ? this.looped++ : this.looped = 1, this.needLoop(this.looped, e, n))) return n && (this.mainReverse = !this.mainReverse), void (t ? this.timer = setTimeout(() => {
				this.timer = 0, this.begin();
			}, t / this.speed * 1e3) : this.begin());
			this.complete();
		}
	}
	start(e) {
		this.requestAnimateTime = 1;
		let { reverse: t, jump: n } = this;
		if ((t || this.mainReverse) && (this.mainReverse = t), this.looped &&= 0, e) this.begin(!0);
		else {
			let { delay: e } = this;
			e ? (n && this.begin(!0), this.timer = setTimeout(() => {
				this.timer = 0, this.begin();
			}, e / this.speed * 1e3)) : this.begin();
		}
	}
	begin(e) {
		this.playedTotalTime = this.time = 0, this.mainReverse ? this.setTo() : this.setFrom(), e || this.startRequestAnimate();
	}
	end() {
		this.mainReverse ? this.setFrom() : this.setTo();
	}
	complete() {
		this.requestAnimateTime = 0, this.running = !1;
		let { endingStyle: e, killStyle: t } = this, n = t ? {} : e;
		if (t) for (let r in e) r in t || (n[r] = e[r]);
		this.setStyle(n), this.clearTimer(), this.emitType(fy.COMPLETED);
	}
	setFrom() {
		this.nowIndex = 0, this.setStyle(this.fromStyle);
	}
	setTo() {
		this.nowIndex = this.frames.length - 1, this.setStyle(this.toStyle);
	}
	nextFrame() {
		if (this.needLoopFrame()) return this.increaseTime();
		this.nowIndex + 1 >= this.frames.length || (this.increaseTime(), this.nowIndex++);
	}
	reverseNextFrame() {
		if (this.needLoopFrame()) return this.increaseTime();
		this.nowIndex - 1 < 0 || (this.increaseTime(), this.nowIndex--);
	}
	transition(e) {
		let { style: t, beforeStyle: n } = this.frame, r = this.nowReverse ? t : n, i = this.nowReverse ? n : t;
		if (e === 0) this.setStyle(r);
		else if (e === 1) this.setStyle(i);
		else {
			let { attrsMap: n, target: a } = this, { betweenStyle: o } = this.frame;
			o ||= this.frame.betweenStyle = {}, of.setBetweenStyle(o, r, i, t, e, a, n), this.setStyle(o);
		}
		this.emitType(fy.UPDATE);
	}
	setStyle(e) {
		let { target: t } = this;
		t && e && (this.style = e, t.__ ? t.set(e, !!this.isTemp && "temp") : Object.assign(t, e));
	}
	increaseTime() {
		this.playedTotalTime += this.frameTotalTime;
	}
	needLoop(e, t, n) {
		return !(this.needStopLoop(e, t) || this.needStopLoop(e, n, !0));
	}
	needStopLoop(e, t, n) {
		return F(t) && (!t || e >= (n ? 2 * t - 1 : t));
	}
	needLoopFrame() {
		let { loop: e, swing: t } = this.frame;
		if (e || t) {
			if (this.frameLooped ? this.frameLooped++ : this.frameLooped = 1, t && (this.frameReverse = !this.frameReverse), this.needLoop(this.frameLooped, e, t)) return !0;
			this.frameLooped = this.frameReverse = void 0;
		}
		return !1;
	}
	clearTimer(e) {
		this.timer && (clearTimeout(this.timer), this.timer = 0, e && e());
	}
	destroy(e) {
		this.destroyed ||= (super.destroy(), e && !this.completed ? this.stop() : this.pause(), this.target = this.parent = this.config = this.frames = this.fromStyle = this.toStyle = this.style = this.killStyle = null, !0);
	}
};
Uv([dy("ease")], py.prototype, "easing", void 0), Uv([dy(0)], py.prototype, "delay", void 0), Uv([dy(.2)], py.prototype, "duration", void 0), Uv([dy("auto")], py.prototype, "ending", void 0), Uv([dy(!1)], py.prototype, "reverse", void 0), Uv([dy(!1)], py.prototype, "swing", void 0), Uv([dy(!1)], py.prototype, "loop", void 0), Uv([dy(0)], py.prototype, "loopDelay", void 0), Uv([dy(1)], py.prototype, "speed", void 0), Uv([dy(!0)], py.prototype, "autoplay", void 0), Uv([dy()], py.prototype, "join", void 0), Uv([dy()], py.prototype, "jump", void 0), Uv([dy()], py.prototype, "attrs", void 0), py = Uv([vl(Bu)], py);
var my = class extends py {
	get completed() {
		return this.list.every((e) => e.completed);
	}
	get endingStyle() {
		return this._endingStyle;
	}
	constructor(e, t, n) {
		super(e, null), this.list = [], this.updateList(t, n);
	}
	updateList(e, t) {
		this.fromStyle = {}, this.toStyle = {}, this._endingStyle = {}, e ||= this.list.filter((e) => {
			let { completed: t } = e;
			return t && e.destroy(), !t;
		}), this.list = e.map((e) => {
			let n = e.target ? e : new py(this.target, e, t);
			return n.parent = this, Object.assign(this.fromStyle, n.fromStyle), Object.assign(this.toStyle, n.toStyle), Object.assign(this._endingStyle, n.endingStyle), n;
		});
	}
	play() {
		this.each((e) => e.play()), this.emitType(fy.PLAY);
	}
	pause() {
		this.each((e) => e.pause()), this.emitType(fy.PAUSE);
	}
	stop() {
		this.each((e) => e.stop()), this.emitType(fy.STOP);
	}
	seek(e, t) {
		this.each((n) => n.seek(e, t)), this.emitType(fy.SEEK);
	}
	kill(e, t) {
		this.each((n) => n.kill(e, t)), this.destroy();
	}
	onChildEvent(e, t) {
		switch (e) {
			case fy.COMPLETED:
				this.completed && this.emitType(e);
				break;
			case fy.UPDATE: this.emitType(e);
		}
	}
	each(e) {
		this.list.forEach(e);
	}
	destroy(e) {
		let { list: t } = this;
		t.length &&= (this.each((t) => t.destroy(e)), 0);
	}
};
my = Uv([vl(Bu)], my);
var { round: hy } = Math, { fourNumber: gy } = hr, _y = {
	fill: Sy,
	stroke: Sy,
	cornerRadius: (e, t, n) => F(e) && F(t) ? by(e, t, n) : (e = gy(e), t = gy(t), e.map((e, r) => by(e, t[r], n))),
	text(e, t, n) {
		if (Un(e) && Un(t)) {
			let r = e.length, i = t.length, a = by(r, i, n, 1);
			return r < i ? t.substring(0, a) : e.substring(0, a);
		}
		return F(e) || F(t) ? hr.float(by(e, t, n), Math.max(yy(e), yy(t))) : t;
	},
	boxStyle(e, t, n, r) {
		e ||= {}, t ||= {};
		let i = Object.assign(Object.assign({}, e), t);
		return of.setBetweenStyle(i, e, t, i, n, r), i;
	},
	shadow: Cy,
	innerShadow: Cy
}, vy = {
	value: function(e, t, n) {
		let r = F(e), i = F(t);
		return r && i ? e + (t - e) * n : i || r ? by(e, t, n) : e;
	},
	number: by,
	color: xy,
	setBetweenStyle: function(e, t, n, r, i, a, o) {
		let s, c, l, { list: u, value: d } = of;
		for (let f in r) o && !o[f] || (s = t[f], c = n[f], l = u[f] || d, s !== c && (e[f] = l(s, c, i, a)));
	}
};
function yy(e) {
	let t = String(e).split(".")[1];
	return t ? t.length : 0;
}
function by(e, t, n, r) {
	e ||= 0, t ||= 0;
	let i = e + (t - e) * n;
	return r ? hy(i) : i;
}
function xy(e, t, n) {
	e = Xd.object(e), t = Xd.object(t);
	let r = by(e.r, t.r, n, 1) + "," + by(e.g, t.g, n, 1) + "," + by(e.b, t.b, n, 1), i = by(e.a, t.a, n);
	return i === 1 ? "rgb(" + r + ")" : "rgba(" + r + "," + i + ")";
}
function Sy(e, t, n) {
	return Un(e) && Un(t) ? xy(e, t, n) : t;
}
function Cy(e, t, n) {
	return Gn(e) || Gn(t) ? t : (t ||= {}, {
		x: by((e ||= {}).x, t.x, n),
		y: by(e.y, t.y, n),
		blur: by(e.blur, t.blur, n),
		spread: by(e.spread, t.spread, n),
		color: xy(e.color || "#FFFFFF00", t.color || "#FFFFFF00", n),
		visible: t.visible,
		blendMode: t.blendMode,
		box: t.box || e.box
	});
}
Li.add("animate", "color"), af.canAnimate = !0, Object.assign(of.list, _y), Object.assign(of, vy);
var wy = X.prototype;
X.addAttr("animation", void 0, function(e) {
	return Fc(e, (e) => Ic({ set(t) {
		this.__setAttr(e, t), this.leafer && (this.killAnimate("animation"), t && this.animate(t, void 0, "animation"));
	} }));
}), X.addAttr("animationOut", void 0, Rc), X.addAttr("transition", !0, Rc), X.addAttr("transitionOut", void 0, Rc), wy.set = function(e, t) {
	e && (t ? t === "temp" ? (this.lockNormalStyle = !0, Object.assign(this, e), this.lockNormalStyle = !1) : this.animate(e, t) : Object.assign(this, e));
}, wy.animate = function(e, t, n, r) {
	if (P(e)) return this.__animate;
	let i = Gn(e) && !t && n ? new my(this, e, r) : new py(this, e, t, r);
	this.killAnimate(n, i.toStyle);
	let a = this.__animate;
	return a && (i instanceof my ? i.list.unshift(a) : i = new my(this, [a, i])), this.__animate = i;
}, wy.killAnimate = function(e, t) {
	let n = this.__animate;
	if (n) {
		let e = !1;
		if (t && !n.completed) {
			n instanceof my && n.updateList();
			let { toStyle: r } = n;
			for (let n in t) if (n in r) {
				e = !0;
				break;
			}
		} else e = !0;
		e && (n.kill(!0, t), this.__animate = null);
	}
}, wy.__runAnimation = function(e, t) {
	this.animate(e === "in" ? this.animation : this.animationOut, void 0, "animation"), t && this.__animate.on(fy.COMPLETED, t);
};
//#endregion
//#region ../packages/core/color.js
function Ty(e, t) {
	if (!e || e === "none") return `rgba(128,128,128,${t})`;
	let n = String(e).replace("#", "");
	if (n.length === 3 && (n = n[0] + n[0] + n[1] + n[1] + n[2] + n[2]), n.length !== 6) return `rgba(128,128,128,${t})`;
	let r = parseInt(n, 16);
	return `rgba(${r >> 16 & 255},${r >> 8 & 255},${r & 255},${t})`;
}
function Ey(e, t) {
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
function Dy(e) {
	let t = parseInt(String(e).slice(1), 16);
	return .299 * (t >> 16 & 255) + .587 * (t >> 8 & 255) + .114 * (t & 255);
}
function Oy(e) {
	let t = Math.round(Dy(e) * .55 + 70);
	return `rgb(${t},${t},${t})`;
}
//#endregion
//#region ../packages/core/text.js
function ky(e, t) {
	let n = 0;
	for (let t of String(e)) n += t.charCodeAt(0) > 255 ? 1 : .6;
	return n * t;
}
//#endregion
//#region \0plugin-vue:export-helper
var Ay = (e, t) => {
	let n = e.__vccOpts || e;
	for (let [e, r] of t) n[e] = r;
	return n;
}, jy = { class: "preview-box" }, My = { class: "preview-bar" }, Ny = { class: "preview-title" }, Py = { class: "preview-body" }, Fy = { class: "seat-card-title" }, Iy = { class: "seat-card-sub" }, Ly = 100, Ry = 6, zy = 6, By = /*#__PURE__*/ Ay({
	__name: "PreviewModal",
	props: { open: Boolean },
	emits: ["close"],
	setup(n, { emit: r }) {
		let c = n, u = r, d = x(null), f = x(null), g = null, _ = x(!1), b = 1, S = null, ee = [], T = null, te = null;
		function ne(e, t, n, r, i, a) {
			e.beginPath(), e.moveTo(t + a, n), e.lineTo(t + r - a, n), e.arcTo(t + r, n, t + r, n + a, a), e.lineTo(t + r, n + i - a), e.arcTo(t + r, n + i, t + r - a, n + i, a), e.lineTo(t + a, n + i), e.arcTo(t, n + i, t, n + i - a, a), e.lineTo(t, n + a), e.arcTo(t, n, t + a, n, a), e.closePath();
		}
		function ie(e) {
			ee = [];
			for (let t of e.sections || []) {
				if (!t.visible || !t.path || t.loose) continue;
				let e = he(t.path);
				e.length < 3 || ee.push({ points: e });
			}
			let t = Infinity, n = Infinity, r = -Infinity, i = -Infinity;
			for (let e of ee) for (let a of e.points) a.x < t && (t = a.x), a.x > r && (r = a.x), a.y < n && (n = a.y), a.y > i && (i = a.y);
			let a = e.stage;
			a && (a.x < t && (t = a.x), a.x + a.w > r && (r = a.x + a.w), a.y < n && (n = a.y), a.y + a.h > i && (i = a.y + a.h)), T = t === Infinity ? null : {
				minX: t,
				minY: n,
				maxX: r,
				maxY: i
			};
		}
		function ae(e, t) {
			if (!T) return null;
			let n = T.maxX - T.minX || 1, r = T.maxY - T.minY || 1, i = Math.min(88 / n, 88 / r), a = Ry + (88 - n * i) / 2 - T.minX * i, o = Ry + (88 - r * i) / 2 - T.minY * i;
			return {
				x: e * i + a,
				y: t * i + o
			};
		}
		function oe(e, t) {
			if (!T) return null;
			let n = T.maxX - T.minX || 1, r = T.maxY - T.minY || 1, i = Math.min(88 / n, 88 / r), a = Ry + (88 - n * i) / 2 - T.minX * i, o = Ry + (88 - r * i) / 2 - T.minY * i;
			return {
				x: (e - a) / i,
				y: (t - o) / i
			};
		}
		function ce() {
			if (!S || !T) return;
			let e = S, t = Ly;
			e.clearRect(0, 0, 200, 200), e.save(), e.fillStyle = "rgba(30,41,59,0.75)", ne(e, 0, 0, t, t, 8), e.fill(), ne(e, 0, 0, t, t, 8), e.clip(), e.fillStyle = "rgba(148,163,184,0.45)";
			for (let t of ee) {
				if (!t.points.length) continue;
				e.beginPath();
				let n = ae(t.points[0].x, t.points[0].y);
				e.moveTo(n.x, n.y);
				for (let n = 1; n < t.points.length; n++) {
					let r = ae(t.points[n].x, t.points[n].y);
					e.lineTo(r.x, r.y);
				}
				e.closePath(), e.fill();
			}
			if (te) {
				let t = ae(te.minX, te.minY), n = ae(te.maxX, te.maxY);
				if (t && n) {
					let r = t.x, i = t.y, a = n.x - t.x, o = n.y - t.y;
					a < 2 && (--r, a = 2), o < 2 && (--i, o = 2), e.fillStyle = "rgba(59,130,246,0.18)", e.fillRect(r, i, a, o), e.strokeStyle = "rgba(59,130,246,0.8)", e.lineWidth = 1.5, e.strokeRect(r, i, a, o);
				}
			}
			e.restore();
		}
		function le() {
			if (!g) return;
			let e = g.tree, t = e.width || 400, n = e.height || 400, r = e.getPagePoint({
				x: 0,
				y: 0
			}), i = e.getPagePoint({
				x: t,
				y: n
			});
			te = {
				minX: Math.min(r.x, i.x),
				maxX: Math.max(r.x, i.x),
				minY: Math.min(r.y, i.y),
				maxY: Math.max(r.y, i.y)
			}, ce();
		}
		function ue() {
			if (!f.value) return;
			let e = f.value, t = window.devicePixelRatio || 1;
			e.width = Ly * t, e.height = Ly * t, e.style.width = "100px", e.style.height = "100px", S = e.getContext("2d"), S.scale(t, t);
			function n(t) {
				let n = e.getBoundingClientRect(), r = oe((t.clientX - n.left) * (Ly / n.width), (t.clientY - n.top) * (Ly / n.height));
				if (!r || !g) return;
				let i = g.tree, a = i.width || 400, o = i.height || 400, s = i.getPagePoint({
					x: a / 2,
					y: o / 2
				}), c = r.x - s.x, l = r.y - s.y, u = i.zoomLayer;
				u && (u.x -= c * (i.scaleX || 1), u.y -= l * (i.scaleX || 1)), De(), ke(), le();
			}
			let r = !1;
			e.addEventListener("pointerdown", (t) => {
				r = !0, n(t), e.setPointerCapture(t.pointerId);
			}), e.addEventListener("pointermove", (e) => {
				r && n(e);
			}), e.addEventListener("pointerup", () => {
				r = !1;
			}), e.addEventListener("pointerleave", () => {
				r = !1;
			});
		}
		let de = /* @__PURE__ */ new Map(), fe = x(null), pe = x({
			x: 0,
			y: 0,
			flipX: !1,
			flipY: !1
		}), me = /* @__PURE__ */ new Map(), ge = /* @__PURE__ */ new Map(), _e = 20, ve = null;
		function ye(e) {
			return +(12 / (e?.baseScale || 1)).toFixed(2);
		}
		function be(e, t) {
			return t?.categories?.find((t) => t.key === e)?.color || "#9ca3af";
		}
		function xe(e, t) {
			return e.status === "available" ? be(e.cat, t) : "rgb(180,185,195)";
		}
		function Se(e, t, n) {
			let r = qe(e), i = !!r.text, a = r.logo?.src ? r.logo : null;
			if (!r.visible || !i && !a || !e.path || e.loose) return;
			let o = He(e);
			if (!o) return;
			let s = he(e.path);
			if (s.length < 3) return;
			let c = r.fontSize, l = i ? ky(r.text, c) : 0, u = a ? a.width > 0 ? a.width : 20 : 0, d = a ? u * (a.ratio > 0 ? a.ratio : .6) : 0, f = Math.min(1, Math.max(0, r.opacity ?? .18)), p = new Rf({ hittable: !1 }), m = new Rf({
				x: o.cx,
				y: o.cy,
				rotation: r.rotation || 0,
				origin: "center",
				hittable: !1
			}), h = i ? l + c * 1.6 : 0, g = a ? u * 2 : 0, _ = Math.max(i ? c * 2.6 : 0, a ? d * 2.2 : 0) * (r.rowGap > 0 ? r.rowGap : 1), v = Math.hypot(o.w, o.h) / 2 + Math.max(h, g), y = Math.ceil(v * 2 / _), b = i ? Math.ceil(y / (a ? 2 : 1)) * Math.ceil(v * 2 / h) : 0, x = a ? Math.ceil(y / (i ? 2 : 1)) * Math.ceil(v * 2 / g) : 0;
			if (b + x > 400) {
				let e = Math.sqrt((b + x) / 400);
				h *= e, g *= e, _ *= e;
			}
			let S = (r.rotation || 0) * Math.PI / 180, C = Math.cos(S), w = Math.sin(S), ee = o.cx, T = o.cy, E = (e, t) => Ce(ee + e * C - t * w, T + e * w + t * C, s), te = Ey(r.color, f), ne = 0;
			for (let e = -v; e <= v + .01; e += _, ne++) {
				let t = !!a && (!i || ne % 2 == 1), n = t ? g : h, o = ne % 2 ? n / 2 : 0;
				for (let i = -v; i <= v + .01; i += n) E(i + o, e) && (t ? m.add(new Op({
					url: a.src,
					x: i + o - u / 2,
					y: e - d / 2,
					width: u,
					height: d,
					opacity: f,
					hittable: !1
				})) : m.add(new Z({
					text: r.text,
					x: i + o - l / 2,
					y: e - c / 2,
					width: l,
					height: c,
					fontSize: c,
					textAlign: "center",
					verticalAlign: "middle",
					fill: te,
					hittable: !1
				})));
			}
			p.add(m), t.add(p);
		}
		function we(e, t, n) {
			let r = t.x - e.x, i = t.y - e.y, a = Math.hypot(r, i), o = (n || 0) * Math.PI / 180;
			if (a < 1e-6 || Math.abs(o) < 1e-9) return null;
			let s = Math.abs(o) / 2, c = a / (2 * Math.sin(s)), l = n > 0 ? 0 : 1, u = +(Math.abs(n) > 180);
			return `M${e.x.toFixed(1)} ${e.y.toFixed(1)}A${c.toFixed(1)} ${c.toFixed(1)} 0 ${u} ${l} ${t.x.toFixed(1)} ${t.y.toFixed(1)}`;
		}
		function Te(e, t, n, r) {
			let i = Oe(e), a = t * 2, o = [], s = 0;
			for (let e = 1; e < i.length; e++) Math.hypot(i[e].x - i[e - 1].x, i[e].y - i[e - 1].y) > a && (o.push(i.slice(s, e)), s = e);
			o.push(i.slice(s));
			let c = new Rf(), l = new Rf(), u = Infinity, d = Infinity, f = -Infinity, p = -Infinity, m = t / 2;
			for (let r of o) {
				let i = r[0], a = r[r.length - 1], o = xe(i, n);
				if (r.length === 1) c.add(ip.one({
					width: t,
					height: t,
					fill: o
				}, i.x - m, i.y - m));
				else if (e.curve) {
					let n = we(i, a, e.curve);
					n && c.add(new Pp({
						path: n,
						stroke: o,
						strokeWidth: t,
						strokeCap: "round",
						strokeJoin: "round"
					}));
				} else c.add(new Pp({
					path: `M${i.x.toFixed(1)} ${i.y.toFixed(1)}L${a.x.toFixed(1)} ${a.y.toFixed(1)}`,
					stroke: o,
					strokeWidth: t,
					strokeCap: "round"
				}));
			}
			for (let a of i) {
				let i = xe(a, n);
				l.add(ip.one({
					width: t,
					height: t,
					fill: i
				}, a.x - m, a.y - m));
				let o = Math.floor(a.x / _e) + "," + Math.floor(a.y / _e), s = ge.get(o);
				s || ge.set(o, s = []), s.push({
					id: a.id,
					x: a.x,
					y: a.y
				}), me.set(a.id, {
					id: a.id,
					x: a.x,
					y: a.y,
					sec: r.name,
					row: e.label,
					num: a.n,
					statusLabel: se.find((e) => e.key === a.status)?.label || a.status,
					catLabel: n?.categories?.find((e) => e.key === a.cat)?.label || "",
					color: i
				}), a.x < u && (u = a.x), a.x > f && (f = a.x), a.y < d && (d = a.y), a.y > p && (p = a.y);
			}
			return {
				barGroup: c,
				dotGroup: l,
				bbox: {
					minX: u - m,
					minY: d - m,
					maxX: f + m,
					maxY: p + m
				}
			};
		}
		function Ee(e) {
			if (!g) return;
			g.tree.clear(), de.clear(), me.clear(), ge = /* @__PURE__ */ new Map(), Pe();
			let t = new Rf({ hittable: !1 }), n = ye(e);
			_e = n * 3;
			let r = e.stage;
			if (r) {
				let e = new Rf();
				e.add(new Hf({
					x: r.x,
					y: r.y,
					width: r.w,
					height: r.h,
					fill: "#e2e6ec",
					cornerRadius: 12,
					stroke: "#c3c9d3",
					strokeWidth: 2
				}));
				let n = Math.min(r.h / 3, 80);
				e.add(new Z({
					text: r.label,
					fontSize: n,
					fontWeight: "bold",
					fill: "rgba(30,41,59,0.5)",
					x: r.x + r.w / 2 - ky(r.label, n) / 2,
					y: r.y + r.h / 2 - n / 2
				})), t.add(e);
			}
			for (let r of e.sections || []) {
				if (!r.visible) continue;
				let i = new Rf({ hittable: !1 }), a = Ve(r, e.categories) || r.color || "#9ca3af";
				r.path && !r.loose && i.add(new Pp({
					path: r.path,
					fill: Ty(a, .15),
					stroke: Ty(a, .5),
					strokeWidth: 1
				})), Se(r, i, e);
				let o = Infinity, s = Infinity, c = -Infinity, l = -Infinity, u = new Rf(), d = new Rf();
				for (let t of r.rows) {
					let { barGroup: i, dotGroup: a, bbox: f } = Te(t, n, e, r);
					u.add(i), d.add(a), f.minX < o && (o = f.minX), f.minY < s && (s = f.minY), f.maxX > c && (c = f.maxX), f.maxY > l && (l = f.maxY);
				}
				let f = o === Infinity ? null : {
					minX: o,
					minY: s,
					maxX: c,
					maxY: l
				};
				u.visible = !0, d.visible = !1, i.add(u), i.add(d);
				let p = Ge(r), m = p.text || r.name;
				if (p.visible && m && !r.loose) {
					let e = He(r);
					if (e) {
						let t = Math.min(p.fontSize > 0 ? p.fontSize : 14, e.h * .6), n = Math.max(e.w, ky(m, t));
						i.add(new Z({
							text: m,
							fontSize: t,
							fontWeight: "bold",
							fill: "rgba(30,41,59,0.4)",
							width: n,
							height: t,
							textAlign: "center",
							verticalAlign: "middle",
							rotation: p.rotation || 0,
							x: e.cx + (p.dx || 0) - n / 2,
							y: e.cy + (p.dy || 0) - t / 2,
							hittable: !1
						}));
					}
				}
				t.add(i), de.set(r.id, {
					group: i,
					barGroup: u,
					dotGroup: d,
					bbox: f
				});
			}
			g.tree.add(t), g.config.zoom.min = 1e-4, g.tree.zoom("fit"), b = g.tree.scaleX || 1, g.config.zoom.min = b * .6, _.value = !1, ie(e), ke(), le();
		}
		function De() {
			if (!g || !T) return;
			let e = g.tree, t = e.zoomLayer, n = e.scaleX || 1, r = e.width || 400, i = e.height || 400, a = T, o = a.minX * n + t.x, s = a.maxX * n + t.x, c = a.minY * n + t.y, l = a.maxY * n + t.y;
			s < 10 ? t.x += 10 - s : o > r - 10 && (t.x -= o - (r - 10)), l < 10 ? t.y += 10 - l : c > i - 10 && (t.y -= c - (i - 10));
		}
		function ke() {
			if (!g) return;
			let e = g.tree.scaleX || 1, t = g.tree, n = t.width || 400, r = t.height || 400, i = t.getPagePoint({
				x: -n * .2,
				y: -r * .2
			}), a = t.getPagePoint({
				x: n * 1.2,
				y: r * 1.2
			}), o = {
				minX: i.x,
				maxX: a.x,
				minY: i.y,
				maxY: a.y
			}, s = ye(k.venue) * e >= zy;
			for (let [e, t] of de) {
				let e = t.bbox;
				if (!e) {
					t.group.visible = !0;
					continue;
				}
				let n = e.maxX >= o.minX && e.minX <= o.maxX && e.maxY >= o.minY && e.minY <= o.maxY;
				t.group.visible = n, n && (t.barGroup.visible = !s, t.dotGroup.visible = s);
			}
		}
		function Ae(e) {
			let t = ye(k.venue) * .5 + .5, n = Math.floor(e.x / _e), r = Math.floor(e.y / _e), i = null, a = t;
			for (let t = n - 1; t <= n + 1; t++) for (let n = r - 1; n <= r + 1; n++) {
				let r = ge.get(t + "," + n);
				if (r) for (let t of r) {
					let n = Math.hypot(t.x - e.x, t.y - e.y);
					n < a && (a = n, i = t);
				}
			}
			return i ? me.get(i.id) : null;
		}
		let je = null, Me = 0, Ne = null;
		function Pe() {
			fe.value = null, Ne = null, je && (je.visible = !1), cancelAnimationFrame(Me);
		}
		function Fe(e, t, n) {
			if (!je) return;
			let r = ye(k.venue) * 1.5, i = r * .6;
			je.visible = !0, je.set({ stroke: n }), cancelAnimationFrame(Me);
			let a = performance.now(), o = () => {
				let n = Math.min(1, (performance.now() - a) / 160), s = 1 - (1 - n) ** 3, c = i + (r - i) * s;
				je.set({
					x: e - c / 2,
					y: t - c / 2,
					width: c,
					height: c,
					opacity: .3 + .7 * s
				}), n < 1 && je.visible && (Me = requestAnimationFrame(o));
			};
			o();
		}
		function Ie(e) {
			if (!g || !d.value) return;
			let t = g.tree.scaleX || 1;
			if (ye(k.venue) * t < zy) {
				Pe();
				return;
			}
			let n = d.value.getBoundingClientRect(), r = e.clientX - n.left, i = e.clientY - n.top, a = Ae(g.tree.getPagePoint({
				x: r,
				y: i
			}));
			if (!a) {
				Pe();
				return;
			}
			pe.value = {
				x: r > n.width - 170 ? r - 14 : r + 14,
				y: i > n.height - 80 ? i - 12 : i + 14,
				flipX: r > n.width - 170,
				flipY: i > n.height - 80
			}, a.id !== Ne && (Ne = a.id, fe.value = a, Fe(a.x, a.y, a.color));
		}
		function Le() {
			if (!g || !d.value) return;
			let e = d.value.getBoundingClientRect(), t = g.tree.scaleX || 1;
			g.tree.zoomLayer.scaleOfWorld({
				x: e.width / 2,
				y: e.height / 2
			}, b / t, { duration: .25 }), setTimeout(() => {
				g && (_.value = !1, De(), ke(), le());
			}, 300);
		}
		function Re() {
			g && (g.tree.zoom("fit"), b = g.tree.scaleX || 1, g.config.zoom.min = b * .6, _.value = !1, De(), ke(), le());
		}
		function ze() {
			if (!d.value) return;
			let e = d.value;
			g = new Lp({
				view: e,
				fill: k.venue.theme === "dark" ? "#2d3039" : "#f0f2f5",
				tree: { type: "design" },
				wheel: { preventDefault: !0 },
				zoom: {
					min: .02,
					max: 64
				},
				move: { drag: !1 }
			});
			let t = null, n = !1;
			e.addEventListener("pointerdown", (r) => {
				r.button === 0 && (Pe(), t = {
					x: r.clientX,
					y: r.clientY,
					sx: r.clientX,
					sy: r.clientY
				}, n = !1, e.setPointerCapture(r.pointerId));
			}), e.addEventListener("pointermove", (e) => {
				if (g) {
					if (t) {
						let r = e.clientX - t.x, i = e.clientY - t.y;
						if ((Math.abs(r) >= 2 || Math.abs(i) >= 2) && (n = !0), !_.value || !n) return;
						t.x = e.clientX, t.y = e.clientY;
						let a = g.tree.zoomLayer;
						a.x += r, a.y += i, Pe(), De(), ke(), le();
						return;
					}
					Ie(e);
				}
			}), e.addEventListener("pointerup", (r) => {
				if (t) {
					if (!n) {
						let t = g.tree.scaleX || 1, n = k.venue.baseScale || 1, i = t < n - .01 ? n : t;
						if (i > t) {
							let n = e.getBoundingClientRect(), a = r.clientX - n.left, o = r.clientY - n.top;
							g.tree.zoomLayer.scaleOfWorld({
								x: a,
								y: o
							}, i / t, { duration: .3 }), _.value = !0, setTimeout(() => {
								De(), ke(), le();
							}, 350);
						}
					}
					t = null;
				}
			}), e.addEventListener("pointerleave", () => {
				t = null, Pe();
			}), e.addEventListener("wheel", () => {
				Pe(), ve && clearTimeout(ve), ve = setTimeout(() => {
					ve = null, g && (g.tree.scaleX || 1) < b * .98 && Le();
				}, 160);
			}, { passive: !0 }), g.tree.on(sm.ZOOM, () => {
				let e = g.tree.scaleX || 1;
				_.value = e > b * 1.05, De(), ke(), le();
			}), g.tree.on(rm.MOVE, () => {
				De(), ke(), le();
			}), ue(), Ee(k.venue), je = new ip({
				fill: "rgba(255,255,255,0.3)",
				stroke: "#1f2937",
				strokeWidth: ye(k.venue) * .16,
				visible: !1,
				hittable: !1
			}), g.tree.add(je), window.__preview = {
				app: g,
				store: k,
				seatSizeVal: ye,
				LOD_PX: zy,
				hitSeat: Ae
			};
		}
		E(() => c.open, (e) => {
			e ? p(() => {
				g &&= (g.destroy(), null), ze();
			}) : (ve &&= (clearTimeout(ve), null), Pe(), delete window.__preview, g && (g.destroy(), g = null, de.clear(), S = null));
		}), v(() => {
			g?.destroy(), g = null;
		});
		function Be() {
			u("close");
		}
		return (r, c) => (y(), i(t, { to: "body" }, [n.open ? (y(), o("div", {
			key: 0,
			class: "preview-overlay",
			onClick: re(Be, ["self"])
		}, [s("div", jy, [s("div", My, [s("span", Ny, C(w(k).venue.name), 1), s("button", {
			class: "preview-close",
			onClick: Be
		}, "✕")]), s("div", Py, [
			s("div", {
				ref_key: "canvasEl",
				ref: d,
				class: "preview-canvas"
			}, null, 512),
			s("canvas", {
				ref_key: "minimapEl",
				ref: f,
				class: "preview-minimap",
				style: h({ display: _.value ? "block" : "none" })
			}, null, 4),
			fe.value ? (y(), o("div", {
				key: 0,
				class: m(["seat-card-pos", {
					flipx: pe.value.flipX,
					flipy: pe.value.flipY
				}]),
				style: h({
					left: pe.value.x + "px",
					top: pe.value.y + "px"
				})
			}, [(y(), o("div", {
				key: fe.value.id,
				class: "seat-card"
			}, [s("div", Fy, [s("span", {
				class: "seat-card-dot",
				style: h({ background: fe.value.color })
			}, null, 4), l(" " + C(fe.value.sec) + " · " + C(fe.value.row) + "排 " + C(fe.value.num) + "号 ", 1)]), s("div", Iy, [fe.value.catLabel ? (y(), o(e, { key: 0 }, [l(C(fe.value.catLabel) + " · ", 1)], 64)) : a("", !0), l(C(fe.value.statusLabel), 1)])]))], 6)) : a("", !0),
			c[0] ||= s("div", { class: "preview-hint" }, "Ctrl + 滚轮缩放", -1),
			_.value ? (y(), o("button", {
				key: 1,
				class: "preview-reset",
				onClick: Re
			}, "回到全局")) : a("", !0)
		])])])) : a("", !0)]));
	}
}, [["__scopeId", "data-v-3f1d1b03"]]), Vy = { class: "topbar" }, Hy = { class: "topbar-left" }, Uy = { class: "topbar-venue" }, Wy = {
	key: 0,
	class: "topbar-readonly"
}, Gy = { class: "tb-group" }, Ky = ["title"], qy = { class: "topbar-center" }, Jy = {
	key: 0,
	class: "tb-group"
}, Yy = ["disabled", "title"], Xy = {
	key: 0,
	class: "tb-dot"
}, Zy = { class: "tb-group" }, Qy = { class: "tb-group" }, $y = { class: "tb-group" }, eb = {
	key: 0,
	class: "dropdown-menu"
}, tb = {
	key: 2,
	class: "dropdown-item disabled"
}, nb = { class: "tb-group" }, rb = { class: "tb-group" }, ib = {
	__name: "TopBar",
	setup(t) {
		let r = x(0), i = x(0), l = x(!1), d = x(!1), f = x(null), p = n(() => k.mode === "sections" && k.sectionSelection.size > 0 ? "sections" : k.mode === "seats" && k.selection.size > 0 && (k.tool === "select" || k.tool === "lasso") ? "rows" : null);
		function h(e) {
			if (d.value = !1, p.value === "rows") {
				let t = N.selectedRows();
				t.length >= 2 && N.alignRows(t.map((e) => e.id), e);
			} else if (p.value === "sections") {
				let t = [...k.sectionSelection];
				t.length >= 2 && N.alignSections(t, "x", e);
			}
		}
		function v(e) {
			if (d.value = !1, p.value === "sections") {
				let t = [...k.sectionSelection];
				t.length >= 2 && N.alignSections(t, "y", e);
			}
		}
		function b(e) {
			if (d.value = !1, p.value === "rows") {
				let e = N.selectedRows();
				e.length >= 3 && N.distributeRows(e.map((e) => e.id));
			} else if (p.value === "sections") {
				let t = [...k.sectionSelection];
				t.length >= 3 && N.distributeSections(t, e);
			}
		}
		function S() {
			if (d.value = !1, p.value === "rows") {
				let e = N.selectedRows();
				e.length >= 2 && N.straightenRows(e.map((e) => e.id));
			}
		}
		function ee(e) {
			if (p.value === "rows") {
				let t = N.selectedRows();
				t.length && (e === "h" ? N.flipRowsH(t.map((e) => e.id)) : N.flipRowsV(t.map((e) => e.id)));
			} else if (p.value === "sections") {
				let t = [...k.sectionSelection];
				t.length && (e === "h" ? N.flipSectionsH(t) : N.flipSectionsV(t));
			}
		}
		function T() {
			if (k.mode === "seats") N.removeSelectedSeats();
			else if (k.selection.size && wn()) N.removeSelectedSeats();
			else if (k.sectionSelection.size && confirm(`删除选中的 ${k.sectionSelection.size} 个分区？（可撤销）`)) N.removeSections([...k.sectionSelection]);
			else if (k.imageSelected && !k.sectionSelection.size) {
				let e = k.venue.images?.[0];
				e && confirm("删除选中的底图？（可撤销）") && N.removeVenueImage(e.id);
			}
		}
		function te(e) {
			f.value && !f.value.contains(e.target) && (d.value = !1);
		}
		_(() => document.addEventListener("mousedown", te)), g(() => document.removeEventListener("mousedown", te)), E(() => k.saveFeedback, (e) => {
			e.type === "saved" ? (r.value++, setTimeout(() => r.value--, 2e3)) : e.type === "empty" && (i.value++, setTimeout(() => i.value--, 2e3));
		});
		let ne = () => N.uiSave(), re = n(() => (k.sectionsTick, k.venue.name));
		return (t, n) => (y(), o("header", Vy, [
			s("div", Hy, [
				n[29] ||= s("span", { class: "topbar-logo" }, "◆", -1),
				s("span", Uy, C(re.value), 1),
				w(k).readonly ? (y(), o("span", Wy, "只读")) : a("", !0),
				n[30] ||= s("span", { class: "topbar-sep" }, "·", -1),
				s("div", Gy, [s("button", {
					class: "tb-btn",
					title: "预览",
					onClick: n[0] ||= (e) => l.value = !0
				}, [...n[27] ||= [s("svg", {
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
				})], -1)]]), s("button", {
					class: m(["tb-btn", { on: w(k).theme === "dark" }]),
					title: w(k).theme === "dark" ? "深色" : "浅色",
					onClick: n[1] ||= (e) => w(N).toggleTheme()
				}, [...n[28] ||= [c("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"5\"></circle><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"3\"></line><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"></line><line x1=\"4.22\" y1=\"4.22\" x2=\"5.64\" y2=\"5.64\"></line><line x1=\"18.36\" y1=\"18.36\" x2=\"19.78\" y2=\"19.78\"></line><line x1=\"1\" y1=\"12\" x2=\"3\" y2=\"12\"></line><line x1=\"21\" y1=\"12\" x2=\"23\" y2=\"12\"></line><line x1=\"4.22\" y1=\"19.78\" x2=\"5.64\" y2=\"18.36\"></line><line x1=\"18.36\" y1=\"5.64\" x2=\"19.78\" y2=\"4.22\"></line></svg>", 1)]], 10, Ky)])
			]),
			s("div", qy, [
				w(k).readonly ? a("", !0) : (y(), o("div", Jy, [s("button", {
					class: m(["tb-btn", { dirty: w(k).dirty && !w(k).saving }]),
					disabled: w(k).saving,
					title: w(k).saving ? "保存中…" : w(k).dirty ? "有未保存的改动（Ctrl+S）" : r.value ? "✓ 已保存" : "保存",
					onClick: ne
				}, [n[31] ||= s("svg", {
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
				], -1), w(k).dirty && !w(k).saving ? (y(), o("i", Xy)) : a("", !0)], 10, Yy)])),
				s("div", Zy, [s("button", {
					class: m(["tb-btn", { off: !w(k).canUndo }]),
					title: "撤销 (Ctrl+Z)",
					onClick: n[2] ||= (e) => w(N).undo()
				}, [...n[32] ||= [s("svg", {
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					"stroke-width": "1.7",
					"stroke-linecap": "round",
					"stroke-linejoin": "round"
				}, [s("polyline", { points: "1 4 1 10 7 10" }), s("path", { d: "M3.51 15a9 9 0 1 0 2.13-9.36L1 10" })], -1)]], 2), s("button", {
					class: m(["tb-btn", { off: !w(k).canRedo }]),
					title: "重做 (Ctrl+Y)",
					onClick: n[3] ||= (e) => w(N).redo()
				}, [...n[33] ||= [s("svg", {
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					"stroke-width": "1.7",
					"stroke-linecap": "round",
					"stroke-linejoin": "round"
				}, [s("polyline", { points: "23 4 23 10 17 10" }), s("path", { d: "M20.49 15a9 9 0 1 1-2.13-9.36L23 10" })], -1)]], 2)]),
				s("div", Qy, [s("button", {
					class: m(["tb-btn", { on: w(k).snapEnabled }]),
					title: "吸附",
					onClick: n[4] ||= (e) => w(N).toggleSnap()
				}, [...n[34] ||= [c("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 3v18\"></path><path d=\"M19 3v18\"></path><line x1=\"5\" y1=\"6\" x2=\"8\" y2=\"6\"></line><line x1=\"5\" y1=\"12\" x2=\"8\" y2=\"12\"></line><line x1=\"5\" y1=\"18\" x2=\"8\" y2=\"18\"></line><line x1=\"16\" y1=\"6\" x2=\"19\" y2=\"6\"></line><line x1=\"16\" y1=\"12\" x2=\"19\" y2=\"12\"></line><line x1=\"16\" y1=\"18\" x2=\"19\" y2=\"18\"></line><path d=\"M9 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z\"></path></svg>", 1)]], 2), s("button", {
					class: m(["tb-btn", { on: w(k).showSeatBars }]),
					title: "显示座位条",
					onClick: n[5] ||= (e) => w(N).toggleSeatBars()
				}, [...n[35] ||= [c("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"3\" y1=\"6\" x2=\"21\" y2=\"6\"></line><line x1=\"3\" y1=\"12\" x2=\"21\" y2=\"12\"></line><line x1=\"3\" y1=\"18\" x2=\"21\" y2=\"18\"></line><line x1=\"3\" y1=\"6\" x2=\"3\" y2=\"18\"></line><line x1=\"21\" y1=\"6\" x2=\"21\" y2=\"18\"></line></svg>", 1)]], 2)]),
				s("div", $y, [
					s("div", {
						class: "dropdown-wrap",
						ref_key: "alignWrap",
						ref: f
					}, [s("button", {
						class: "tb-btn",
						title: "对齐",
						onClick: n[6] ||= (e) => d.value = !d.value
					}, [...n[36] ||= [c("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"4\" y1=\"6\" x2=\"20\" y2=\"6\"></line><line x1=\"4\" y1=\"12\" x2=\"20\" y2=\"12\"></line><line x1=\"4\" y1=\"18\" x2=\"20\" y2=\"18\"></line><circle cx=\"8\" cy=\"6\" r=\"1.5\" fill=\"currentColor\"></circle><circle cx=\"16\" cy=\"12\" r=\"1.5\" fill=\"currentColor\"></circle><circle cx=\"10\" cy=\"18\" r=\"1.5\" fill=\"currentColor\"></circle></svg><svg class=\"tb-chevron\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>", 2)]]), d.value ? (y(), o("div", eb, [p.value === "rows" ? (y(), o(e, { key: 0 }, [
						s("button", {
							class: "dropdown-item",
							onClick: n[7] ||= (e) => S()
						}, "校正"),
						s("button", {
							class: m(["dropdown-item", { disabled: w(N).selectedRows().length < 3 }]),
							onClick: n[8] ||= (e) => b("x")
						}, "均匀分布", 2),
						n[37] ||= s("div", { class: "dropdown-divider" }, null, -1),
						s("button", {
							class: m(["dropdown-item", { disabled: w(N).selectedRows().length < 2 }]),
							onClick: n[9] ||= (e) => h("start")
						}, "左对齐", 2),
						s("button", {
							class: m(["dropdown-item", { disabled: w(N).selectedRows().length < 2 }]),
							onClick: n[10] ||= (e) => h("center")
						}, "居中对齐", 2),
						s("button", {
							class: m(["dropdown-item", { disabled: w(N).selectedRows().length < 2 }]),
							onClick: n[11] ||= (e) => h("end")
						}, "右对齐", 2)
					], 64)) : p.value === "sections" ? (y(), o(e, { key: 1 }, [
						s("button", {
							class: m(["dropdown-item", { disabled: w(k).sectionSelection.size < 2 }]),
							onClick: n[12] ||= (e) => h("start")
						}, "左对齐", 2),
						s("button", {
							class: m(["dropdown-item", { disabled: w(k).sectionSelection.size < 2 }]),
							onClick: n[13] ||= (e) => h("center")
						}, "居中对齐", 2),
						s("button", {
							class: m(["dropdown-item", { disabled: w(k).sectionSelection.size < 2 }]),
							onClick: n[14] ||= (e) => h("end")
						}, "右对齐", 2),
						n[38] ||= s("div", { class: "dropdown-divider" }, null, -1),
						s("button", {
							class: m(["dropdown-item", { disabled: w(k).sectionSelection.size < 2 }]),
							onClick: n[15] ||= (e) => v("start")
						}, "上对齐", 2),
						s("button", {
							class: m(["dropdown-item", { disabled: w(k).sectionSelection.size < 2 }]),
							onClick: n[16] ||= (e) => v("center")
						}, "中对齐", 2),
						s("button", {
							class: m(["dropdown-item", { disabled: w(k).sectionSelection.size < 2 }]),
							onClick: n[17] ||= (e) => v("end")
						}, "下对齐", 2),
						n[39] ||= s("div", { class: "dropdown-divider" }, null, -1),
						s("button", {
							class: m(["dropdown-item", { disabled: w(k).sectionSelection.size < 3 }]),
							onClick: n[18] ||= (e) => b("y")
						}, "垂直均匀分布", 2),
						s("button", {
							class: m(["dropdown-item", { disabled: w(k).sectionSelection.size < 3 }]),
							onClick: n[19] ||= (e) => b("x")
						}, "水平均匀分布", 2)
					], 64)) : (y(), o("div", tb, "请先选择排或分区"))])) : a("", !0)], 512),
					s("button", {
						class: m(["tb-btn", { off: !p.value }]),
						title: "水平翻转",
						onClick: n[20] ||= (e) => ee("h")
					}, [...n[40] ||= [c("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"2\" y1=\"12\" x2=\"22\" y2=\"12\"></line><polyline points=\"2 12 6 8\"></polyline><polyline points=\"2 12 6 16\"></polyline><polyline points=\"22 12 18 8\"></polyline><polyline points=\"22 12 18 16\"></polyline></svg>", 1)]], 2),
					s("button", {
						class: m(["tb-btn", { off: !p.value }]),
						title: "垂直翻转",
						onClick: n[21] ||= (e) => ee("v")
					}, [...n[41] ||= [c("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"2\" x2=\"12\" y2=\"22\"></line><polyline points=\"12 2 8 6\"></polyline><polyline points=\"12 2 16 6\"></polyline><polyline points=\"12 22 8 18\"></polyline><polyline points=\"12 22 16 18\"></polyline></svg>", 1)]], 2)
				]),
				s("div", nb, [
					s("button", {
						class: m(["tb-btn", { off: !(w(k).sectionSelection.size || w(k).selection.size) }]),
						title: "生成副本 (Ctrl+D)",
						onClick: n[22] ||= (e) => w(N).duplicateSelection()
					}, [...n[42] ||= [c("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"12\" height=\"12\" rx=\"1.5\"></rect><rect x=\"9\" y=\"9\" width=\"12\" height=\"12\" rx=\"1.5\"></rect><line x1=\"15\" y1=\"12\" x2=\"15\" y2=\"18\"></line><line x1=\"12\" y1=\"15\" x2=\"18\" y2=\"15\"></line></svg>", 1)]], 2),
					s("button", {
						class: m(["tb-btn", {
							on: w(k).pastePending,
							off: !w(k).pastePending && !(w(k).sectionSelection.size || w(k).selection.size)
						}]),
						title: "复制 (Ctrl+C)",
						onClick: n[23] ||= (e) => w(N).copySelection()
					}, [...n[43] ||= [s("svg", {
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
					s("button", {
						class: m(["tb-btn", {
							on: w(k).pastePending,
							off: !w(k).pastePending
						}]),
						title: "粘贴 (Ctrl+V)",
						onClick: n[24] ||= (e) => w(N).pasteClipboard()
					}, [...n[44] ||= [s("svg", {
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						"stroke-width": "1.7",
						"stroke-linecap": "round",
						"stroke-linejoin": "round"
					}, [
						s("rect", {
							x: "4",
							y: "4",
							width: "16",
							height: "16",
							rx: "2"
						}),
						s("line", {
							x1: "12",
							y1: "4",
							x2: "12",
							y2: "14"
						}),
						s("polyline", { points: "8 10 12 14 16 10" })
					], -1)]], 2)
				]),
				s("div", rb, [s("button", {
					class: m(["tb-btn tb-del", { off: !(w(k).sectionSelection.size || w(k).selection.size || w(k).imageSelected) }]),
					title: "删除 (Delete)",
					onClick: n[25] ||= (e) => T()
				}, [...n[45] ||= [c("<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"></polyline><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"></path><line x1=\"10\" y1=\"11\" x2=\"10\" y2=\"17\"></line><line x1=\"14\" y1=\"11\" x2=\"14\" y2=\"17\"></line></svg>", 1)]], 2)])
			]),
			n[46] ||= s("div", { class: "topbar-right" }, null, -1),
			u(By, {
				open: l.value,
				onClose: n[26] ||= (e) => l.value = !1
			}, null, 8, ["open"])
		]));
	}
}, ab = [
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
], ob = { class: "toolbar" }, sb = {
	key: 0,
	class: "tool-divider"
}, cb = [
	"data-key",
	"disabled",
	"title",
	"onClick"
], lb = ["innerHTML"], ub = {
	__name: "ToolBar",
	setup(t) {
		let r = n(() => k.mode === "seats"), i = [
			"select",
			"seat",
			"lasso",
			"row",
			"grid",
			"pan"
		], a = (e) => r.value && !i.includes(e), s = (e) => a(e.key) ? "座位编辑模式下不可用" : `${e.name} (${e.kbd})${e.soon ? " · 即将上线" : ""}`, c = n(() => ab.filter((e) => e.divider || !e.hidden && mt(e.key)));
		return (t, n) => (y(), o("aside", ob, [(y(!0), o(e, null, S(c.value, (t, n) => (y(), o(e, { key: t.key || n }, [t.divider ? (y(), o("span", sb)) : (y(), o("button", {
			key: 1,
			class: m(["tool-btn", {
				active: w(k).tool === t.key,
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
		}, null, 8, lb))], 10, cb))], 64))), 128))]));
	}
}, db = Math.PI * 2, fb = 1e-9, pb = 2, mb = (e) => +e.toFixed(2);
function hb(e) {
	return {
		closed: !!e?.closed,
		anchors: (e?.anchors ?? []).map((e) => ({
			x: e.x,
			y: e.y
		})),
		segs: (e?.segs ?? []).map((e) => ({ ...e }))
	};
}
var gb = (e) => (e % db + db) % db;
function _b(e) {
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
function vb(e) {
	let { closed: t, anchors: n = [], segs: r = [] } = e ?? {};
	if (!n.length) return "";
	let i = n.length, a = [`M${mb(n[0].x)} ${mb(n[0].y)}`];
	for (let e = 0; e < r.length; e++) {
		let o = r[e], s = n[(e + 1) % i];
		if (t && e === r.length - 1 && o.type !== "A") break;
		o.type === "A" ? a.push(`A${mb(o.r)} ${mb(o.r)} 0 ${+!!o.laf} ${+!!o.sf} ${mb(s.x)} ${mb(s.y)}`) : a.push(`L${mb(s.x)} ${mb(s.y)}`);
	}
	return t && a.push("Z"), a.join("");
}
function yb(e, t) {
	let n = e?.anchors?.length ?? 0, r = e?.segs?.[t], i = e?.anchors?.[t], a = n ? e.anchors[(t + 1) % n] : void 0;
	if (!r || !i || !a) return {
		x: 0,
		y: 0
	};
	let o = () => ({
		x: (i.x + a.x) / 2,
		y: (i.y + a.y) / 2
	});
	if (r.type !== "A" || !Number.isFinite(r.r) || r.r <= 0 || Math.hypot(a.x - i.x, a.y - i.y) < fb) return o();
	let s = pe(i.x, i.y, r.r, r.r, 0, +!!r.laf, +!!r.sf, a.x, a.y), c = s.th1 + s.dth / 2, l = s.cx + s.rx * Math.cos(c), u = s.cy + s.ry * Math.sin(c);
	return Number.isFinite(l) && Number.isFinite(u) ? {
		x: l,
		y: u
	} : o();
}
function bb(e, t, n) {
	let r = hb(e);
	return !Number.isInteger(t) || t < 0 || t >= r.anchors.length || !n || !Number.isFinite(n.x) || !Number.isFinite(n.y) || (r.anchors[t] = {
		x: n.x,
		y: n.y
	}), r;
}
function xb(e, t, n, r = pb) {
	let i = hb(e), a = i.anchors.length;
	if (!Number.isInteger(t) || t < 0 || t >= i.segs.length || !a || !n || !Number.isFinite(n.x) || !Number.isFinite(n.y)) return i;
	let o = i.anchors[t], s = i.anchors[(t + 1) % a], c = s.x - o.x, l = s.y - o.y, u = Math.hypot(c, l);
	if (u < fb) return i;
	if (Math.abs(c * (n.y - o.y) - l * (n.x - o.x)) / u < r) return i.segs[t] = { type: "L" }, i;
	let d = (o.x + n.x) / 2, f = (o.y + n.y) / 2, p = (n.x + s.x) / 2, m = (n.y + s.y) / 2, h = -(n.y - o.y), g = n.x - o.x, _ = -(s.y - n.y), v = s.x - n.x, y = h * v - g * _;
	if (!Number.isFinite(y) || Math.abs(y) < 1e-12) return i;
	let b = ((p - d) * v - (m - f) * _) / y, x = d + b * h, S = f + b * g, C = Math.hypot(o.x - x, o.y - S);
	if (!Number.isFinite(C) || C <= 0) return i;
	let w = Math.atan2(o.y - S, o.x - x), ee = Math.atan2(n.y - S, n.x - x), T = Math.atan2(s.y - S, s.x - x), E = gb(ee - w), te = gb(T - w), ne = +(E <= te), re = +((ne ? te : db - te) > Math.PI);
	return i.segs[t] = {
		type: "A",
		r: C,
		laf: re,
		sf: ne
	}, i;
}
var Sb = 20, Cb = .02, wb = (e, t) => ({
	x: e.x - t.x,
	y: e.y - t.y
}), Tb = (e, t) => e.x * t.x + e.y * t.y, Eb = (e) => Math.hypot(e.x, e.y);
function Db(e, t, n, r) {
	let i = t.x * r.y - t.y * r.x;
	if (Math.abs(i) < 1e-9) return null;
	let a = ((n.x - e.x) * r.y - (n.y - e.y) * r.x) / i, o = e.x + a * t.x, s = e.y + a * t.y;
	return Number.isFinite(o) && Number.isFinite(s) ? {
		x: o,
		y: s
	} : null;
}
function Ob(e) {
	if (!e?.closed) return null;
	let t = e.anchors ?? [], n = e.segs ?? [], r = t.length;
	if (r !== 4 && r !== 8 || n.length !== r) return null;
	let i = [];
	for (let e = 0; e < r; e++) n[e].type !== "A" && i.push(e);
	if (i.length !== 4) return null;
	if (r === 8) {
		for (let e = 0; e < 4; e++) if ((i[(e + 1) % 4] - i[e] + 8) % 8 != 2) return null;
	}
	let a = i.map((e) => wb(t[(e + 1) % r], t[e])), o = a.map(Eb);
	if (o.some((e) => e < fb)) return null;
	for (let e = 0; e < 4; e++) {
		let t = a[e], n = a[(e + 1) % 4];
		if (Math.abs(Tb(t, n)) > Cb * o[e] * o[(e + 1) % 4] + .02 || Eb({
			x: t.x + a[(e + 2) % 4].x,
			y: t.y + a[(e + 2) % 4].y
		}) > Cb * (o[e] + o[(e + 2) % 4]) + .05) return null;
	}
	let s;
	if (r === 4) s = i.map((e) => t[(e + 1) % r]);
	else {
		s = [];
		for (let e = 0; e < 4; e++) {
			let n = Db(t[i[e]], a[e], t[i[(e + 1) % 4]], a[(e + 1) % 4]);
			if (!n) return null;
			s.push(n);
		}
	}
	let c = (e, t, n) => Math.abs(e - t) <= Math.max(.05, Cb * n), l = 0;
	if (r === 8) {
		let e = [];
		for (let t = 0; t < 8; t++) n[t].type === "A" && e.push({
			i: t,
			r: n[t].r,
			laf: n[t].laf
		});
		if (l = e.reduce((e, t) => e + t.r, 0) / 4, !(l > 0)) return null;
		for (let { i: n, r, laf: i } of e) if (i || !c(r, l, l) || !c(Eb(wb(t[(n + 1) % 8], t[n])), r * Math.SQRT2, r * 2)) return null;
	}
	let u = Eb(wb(s[0], s[3])), d = Eb(wb(s[1], s[0]));
	if (u < Sb / 2 || d < Sb / 2 || l > 0 && l >= Math.min(u, d) / 2) return null;
	let f = {
		x: (s[0].x - s[3].x) / u,
		y: (s[0].y - s[3].y) / u
	}, p = {
		x: (s[1].x - s[0].x) / d,
		y: (s[1].y - s[0].y) / d
	}, m = (s[0].x + s[1].x + s[2].x + s[3].x) / 4, h = (s[0].y + s[1].y + s[2].y + s[3].y) / 4, g = [];
	for (let e = 0; e < 4; e++) g[i[e]] = {
		type: "edge",
		edge: e
	}, r === 8 && (g[(i[e] + 1) % 8] = {
		type: "arc",
		corner: e
	});
	return {
		cx: m,
		cy: h,
		u: f,
		v: p,
		w: u,
		h: d,
		r: l,
		corners: s,
		segRole: g
	};
}
function kb(e) {
	return Math.max(0, Math.min(e.w, e.h) / 2 - 1);
}
function Ab(e) {
	let { cx: t, cy: n, u: r, v: i } = e, a = Math.max(Sb, e.w), o = Math.max(Sb, e.h), s = Math.min(Math.max(0, e.r || 0), kb({
		w: a,
		h: o
	})), c = [
		{
			x: t + r.x * a / 2 - i.x * o / 2,
			y: n + r.y * a / 2 - i.y * o / 2
		},
		{
			x: t + r.x * a / 2 + i.x * o / 2,
			y: n + r.y * a / 2 + i.y * o / 2
		},
		{
			x: t - r.x * a / 2 + i.x * o / 2,
			y: n - r.y * a / 2 + i.y * o / 2
		},
		{
			x: t - r.x * a / 2 - i.x * o / 2,
			y: n - r.y * a / 2 - i.y * o / 2
		}
	];
	if (s <= 0) return {
		closed: !0,
		anchors: [
			c[3],
			c[0],
			c[1],
			c[2]
		],
		segs: [
			{ type: "L" },
			{ type: "L" },
			{ type: "L" },
			{ type: "L" }
		]
	};
	let l = +(r.x * i.y - r.y * i.x > 0), u = [
		r,
		i,
		{
			x: -r.x,
			y: -r.y
		},
		{
			x: -i.x,
			y: -i.y
		}
	], d = [], f = [];
	for (let e = 0; e < 4; e++) {
		let t = c[(e + 3) % 4], n = c[e];
		d.push({
			x: t.x + u[e].x * s,
			y: t.y + u[e].y * s
		}), d.push({
			x: n.x - u[e].x * s,
			y: n.y - u[e].y * s
		}), f.push({ type: "L" }, {
			type: "A",
			r: s,
			laf: 0,
			sf: l
		});
	}
	return {
		closed: !0,
		anchors: d,
		segs: f
	};
}
//#endregion
//#region src/components/Stepper.vue
var jb = { class: "stepper" }, Mb = { class: "val" }, Nb = ["value", "data-key"], Pb = {
	key: 0,
	class: "unit"
}, Fb = {
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
		function d(e) {
			e.target.select();
		}
		return (t, n) => (y(), o("div", jb, [
			s("button", {
				type: "button",
				tabindex: "-1",
				onClick: n[0] ||= (e) => c(-1)
			}, "‹"),
			s("div", Mb, [s("input", {
				value: e.modelValue,
				"data-key": e.dataKey,
				onInput: l,
				onChange: u,
				onFocus: d
			}, null, 40, Nb), e.unit ? (y(), o("span", Pb, C(e.unit), 1)) : a("", !0)]),
			s("button", {
				type: "button",
				tabindex: "-1",
				onClick: n[1] ||= (e) => c(1)
			}, "›")
		]));
	}
}, Ib = [
	"disabled",
	"data-key",
	"data-value"
], Lb = {
	key: 0,
	class: "dot-group"
}, Rb = {
	key: 1,
	class: "dot",
	style: { background: "#c8ccd2" }
}, zb = { class: "cat-face-text" }, Bb = {
	key: 0,
	class: "cat-pop",
	role: "listbox"
}, Vb = ["data-key", "onClick"], Hb = { class: "cat-opt-text" }, Ub = {
	key: 0,
	class: "cat-check"
}, Wb = {
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
		function ee(e) {
			l.value = !1, e !== i.value && c("change", e);
		}
		function T(e) {
			l.value && u.value && !u.value.contains(e.target) && (l.value = !1);
		}
		function E(e) {
			e.key === "Escape" && l.value && (l.value = !1, e.stopPropagation());
		}
		return _(() => {
			document.addEventListener("mousedown", T, !0), document.addEventListener("keydown", E, !0);
		}), g(() => {
			document.removeEventListener("mousedown", T, !0), document.removeEventListener("keydown", E, !0);
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
			t.value === "mixed" ? (y(), o(e, { key: 0 }, [f.value.length ? (y(), o("span", Lb, [(y(!0), o(e, null, S(f.value, (e) => (y(), o("span", {
				key: e.key,
				class: "dot",
				style: h({ background: e.color })
			}, null, 4))), 128))])) : (y(), o("span", Rb))], 64)) : (y(), o("span", {
				key: 1,
				class: "dot",
				style: h({ background: d.value ? d.value.color : "#c8ccd2" })
			}, null, 4)),
			s("span", zb, C(p.value), 1),
			r[0] ||= s("span", { class: "cat-caret" }, "▾", -1)
		], 8, Ib), l.value ? (y(), o("div", Bb, [(y(!0), o(e, null, S(t.categories, (e) => (y(), o("button", {
			key: e.key,
			type: "button",
			class: m(["cat-opt", { on: b(String(e.key)) }]),
			"data-key": t.dataKey ? `${t.dataKey}-opt-${e.key}` : null,
			onClick: (t) => ee(String(e.key))
		}, [
			s("span", {
				class: "dot",
				style: h({ background: e.color })
			}, null, 4),
			s("span", Hb, C(e.label), 1),
			b(String(e.key)) ? (y(), o("span", Ub, "✓")) : a("", !0)
		], 10, Vb))), 128))])) : a("", !0)], 2));
	}
}, Gb = {
	key: 0,
	class: "prop"
}, Kb = [
	"value",
	"placeholder",
	"title",
	"data-key"
], qb = { class: "prop" }, Jb = [
	"checked",
	".indeterminate",
	"data-key"
], Yb = { class: "prop" }, Xb = { class: "prop" }, Zb = { class: "prop" }, Qb = { class: "prop" }, $b = {
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
			t.showText ? (y(), o("div", Gb, [r[7] ||= s("span", null, "标签", -1), s("input", {
				class: "ctl",
				value: c(t.label.text) ? "" : t.label.text,
				placeholder: c(t.label.text) ? "多值" : "",
				title: c(t.label.text) ? "多值" : "画布标签即分区名，修改会直接改名；标签不能为空，不想显示可取消下方「可见」",
				"data-key": `${t.keyPrefix}-text`,
				onFocus: r[0] ||= (e) => i("focus"),
				onChange: r[1] ||= (e) => d(e)
			}, null, 40, Kb)])) : a("", !0),
			s("div", qb, [r[8] ||= s("span", null, "可见", -1), s("input", {
				type: "checkbox",
				checked: t.label.visible === !0,
				".indeterminate": c(t.label.visible),
				"data-key": `${t.keyPrefix}-visible`,
				onChange: r[2] ||= (e) => i("update", { visible: e.target.checked })
			}, null, 40, Jb)]),
			s("div", Yb, [r[9] ||= s("span", null, "字号", -1), u(Fb, {
				"model-value": l(t.label.fontSize),
				min: 8,
				max: 300,
				unit: "pt",
				"data-key": `${t.keyPrefix}-font-size`,
				onChange: r[3] ||= (e) => i("update", { fontSize: e })
			}, null, 8, ["model-value", "data-key"])]),
			s("div", Xb, [r[10] ||= s("span", null, "旋转", -1), u(Fb, {
				"model-value": l(t.label.rotation),
				min: -180,
				max: 180,
				unit: "°",
				"data-key": `${t.keyPrefix}-rotation`,
				onChange: r[4] ||= (e) => i("update", { rotation: e })
			}, null, 8, ["model-value", "data-key"])]),
			s("div", Zb, [r[11] ||= s("span", null, "位置 X", -1), u(Fb, {
				"model-value": l(t.label.dx),
				min: -500,
				max: 500,
				step: 5,
				"data-key": `${t.keyPrefix}-dx`,
				onChange: r[5] ||= (e) => i("update", { dx: e })
			}, null, 8, ["model-value", "data-key"])]),
			s("div", Qb, [r[12] ||= s("span", null, "位置 Y", -1), u(Fb, {
				"model-value": l(t.label.dy),
				min: -500,
				max: 500,
				step: 5,
				"data-key": `${t.keyPrefix}-dy`,
				onChange: r[6] ||= (e) => i("update", { dy: e })
			}, null, 8, ["model-value", "data-key"])])
		], 64));
	}
}, ex = [
	"min",
	"max",
	"step",
	"value"
], tx = {
	key: 0,
	class: "jog-notch",
	"aria-hidden": "true"
}, nx = /*#__PURE__*/ Ay(/* @__PURE__ */ Object.assign({ inheritAttrs: !1 }, {
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
		}), null, 16, ex), e.jog ? (y(), o("span", tx)) : a("", !0)], 2));
	}
}), [["__scopeId", "data-v-1feddea0"]]), rx = { class: "sidepanel" }, ix = {
	key: 0,
	class: "panel-context"
}, ax = { class: "card-head" }, ox = ["title"], sx = { class: "prop" }, cx = {
	class: "check-line",
	title: "锁定时画布上点选/框选不到底图；取消勾选恢复可选与调整"
}, lx = { class: "prop slider-prop" }, ux = { class: "prop slider-prop" }, dx = { class: "prop" }, fx = ["checked"], px = { class: "prop" }, mx = {
	class: "check-line",
	title: "锁定后画布上点选/框选不到底图（描图时防误选）；点图片工具打开此卡可解锁"
}, hx = {
	key: 1,
	class: "muted",
	style: { margin: "2px 0" }
}, gx = {
	key: 0,
	class: "card"
}, _x = { class: "card" }, vx = { class: "card-head" }, yx = { class: "card" }, bx = { class: "prop" }, xx = ["value", "title"], Sx = { class: "prop" }, Cx = { class: "prop" }, wx = {
	key: 0,
	class: "prop"
}, Tx = { class: "prop" }, Ex = {
	key: 1,
	class: "prop"
}, Dx = { class: "seg" }, Ox = { class: "card" }, kx = { class: "card-head" }, Ax = {
	key: 0,
	class: "prop"
}, jx = {
	key: 1,
	class: "prop"
}, Mx = ["value", "title"], Nx = { class: "prop" }, Px = { class: "pos-picker" }, Fx = { class: "card" }, Ix = { class: "card-head" }, Lx = { class: "val-static" }, Rx = {
	key: 0,
	class: "muted",
	style: { "padding-top": "4px" }
}, zx = {
	key: 2,
	class: "card"
}, Bx = { class: "card-head" }, Vx = { class: "prop" }, Hx = ["title"], Ux = { class: "card" }, Wx = ["value"], Gx = {
	key: 0,
	value: "",
	disabled: ""
}, Kx = ["value"], qx = { class: "card" }, Jx = ["value"], Yx = {
	key: 0,
	value: "",
	disabled: ""
}, Xx = ["value"], Zx = { class: "card" }, Qx = { class: "card-head" }, $x = { class: "sec-heading" }, eS = { class: "prop" }, tS = { class: "val-static" }, nS = {
	key: 0,
	class: "prop"
}, rS = { class: "card" }, iS = { class: "card-head" }, aS = { class: "card" }, oS = {
	key: 0,
	class: "card"
}, sS = { class: "prop" }, cS = ["value"], lS = { class: "prop" }, uS = ["value"], dS = { class: "prop" }, fS = { class: "wm-logo" }, pS = ["src"], mS = {
	key: 0,
	class: "prop"
}, hS = { class: "prop" }, gS = ["checked"], _S = { class: "prop" }, vS = { class: "prop" }, yS = { class: "prop" }, bS = { class: "prop" }, xS = { class: "prop" }, SS = { class: "prop" }, CS = { class: "card" }, wS = { class: "card-head" }, TS = { class: "card" }, ES = { class: "card-head" }, DS = { class: "prop" }, OS = ["value", "title"], kS = { class: "card" }, AS = { class: "venue-title" }, jS = {
	class: "venue-name-text",
	"data-key": "venue-name"
}, MS = { class: "card" }, NS = { class: "sum-row" }, PS = { class: "sum-main" }, FS = { class: "sum-actions" }, IS = { class: "sum-row" }, LS = { class: "sum-main" }, RS = ["title"], zS = {
	class: "card legend-card",
	"data-key": "legend-card"
}, BS = { class: "card-head" }, VS = 4, HS = {
	__name: "SidePanel",
	setup(t) {
		let r = n(() => (k.sectionsTick, k.venue.sections.map((e) => ({
			id: e.id,
			count: N.seatCountOf(e)
		})))), i = n(() => r.value.reduce((e, t) => e + t.count, 0)), l = n(() => (k.sectionsTick, k.venue.sections.find((e) => e.id === k.activeSectionId) || null)), d = n(() => (k.sectionSelectionTick, k.sectionSelection.size)), f = n(() => {
			k.sectionsTick;
			let e = l.value;
			if (!e || e.gen || !e.path) return null;
			try {
				return Ob(_b(e.path));
			} catch {
				return null;
			}
		}), g = n(() => f.value ? Math.floor(kb(f.value)) : 0);
		function _(e) {
			let t = l.value, n = f.value;
			if (!t || !n) return;
			let r = Math.min(Math.max(0, +e || 0), kb(n));
			Math.abs(r - n.r) < .01 || N.updateSectionPath(t.id, vb(Ab({
				...n,
				r
			})));
		}
		let v = n(() => k.mode === "seats"), b = n(() => (k.selectionTick, k.selection.size)), ee = n(() => (k.selectionTick, k.sectionsTick, k.mode === "sections" && wn())), ie = n(() => (v.value || ee.value) && (k.tool === "select" || k.tool === "lasso")), ae = n(() => (k.selectionTick, N.selectedRows())), oe = n(() => (v.value || ee.value) && b.value > 0), le = n(() => {
			if (k.selectionTick, !k.selection.size) return !1;
			for (let e of k.selection) if (!un(e)?.section.loose) return !1;
			return !0;
		});
		function ue() {
			N.convertRowsToSection(ae.value.map((e) => e.id));
		}
		let de = n(() => !oe.value && !!l.value && (k.mode !== "sections" || d.value === 1)), fe = n(() => !oe.value && k.mode === "sections" && d.value > 1), pe = n(() => (k.tool === "image" || k.imageSelected) && k.mode === "sections"), me = n(() => oe.value ? ie.value ? "排" : "座位" : de.value || fe.value ? "分区" : pe.value ? "底图" : ""), he = n(() => (k.sectionsTick, k.venue.categories.slice())), ge = x(!0), _e = n(() => {
			k.canvasTick;
			let e = 0;
			for (let t of k.venue.sections) for (let n of t.rows) for (let t of n.seats) t.cat ?? e++;
			return e;
		}), ve = n(() => {
			k.canvasTick;
			let e = [], t = /* @__PURE__ */ new Set();
			for (let n of k.venue.sections) {
				n.name && (t.has(n.name) ? e.push({
					type: "section",
					section: n.name
				}) : t.add(n.name));
				let r = /* @__PURE__ */ new Map();
				for (let t of n.rows) {
					if (!t.label) continue;
					r.has(t.label) || r.set(t.label, /* @__PURE__ */ new Set());
					let i = r.get(t.label);
					for (let r of t.seats) {
						if (r.n === "" || r.n == null) continue;
						let a = String(r.n);
						i.has(a) ? e.push({
							type: "seat",
							section: n.name || "(未命名)",
							row: t.label,
							seat: a
						}) : i.add(a);
					}
				}
			}
			return e;
		}), ye = n(() => ve.value.length);
		function be() {
			let e = ve.value[0];
			if (!e) return;
			let t = e.section, n = k.venue.sections.find((e) => (e.name || "(未命名)") === t);
			n && (k.sectionSelection = /* @__PURE__ */ new Set([n.id]), k.sectionSelectionTick++, k.activeSectionId = n.id);
		}
		let xe = n(() => {
			k.canvasTick;
			let e = 0;
			for (let t of k.venue.sections) for (let n of t.rows) {
				n.label || e++;
				for (let t of n.seats) (t.n === "" || t.n == null) && e++;
			}
			return e;
		}), Se = n(() => {
			if (k.selectionTick, k.canvasTick, !k.selection.size) return "";
			let e;
			for (let t of k.selection) {
				let n = un(t)?.seat.cat ?? null;
				if (e === void 0) e = n;
				else if (e !== n) return "mixed";
			}
			return e === null ? "" : String(e);
		}), Ce = n(() => {
			k.selectionTick, k.canvasTick;
			let e = /* @__PURE__ */ new Set();
			for (let t of k.selection) {
				let n = un(t)?.seat.cat;
				n != null && e.add(n);
			}
			return [...e];
		});
		function we(e) {
			N.setSelectedCategory(e === "" ? null : +e);
		}
		let Te = n(() => {
			if (k.selectionTick, k.canvasTick, !k.selection.size) return "available";
			let e;
			for (let t of k.selection) {
				let n = un(t)?.seat.status || "available";
				if (e === void 0) e = n;
				else if (e !== n) return "mixed";
			}
			return e;
		}), Ee = n(() => {
			if (k.selectionTick, k.canvasTick, !k.selection.size) return 1;
			let e;
			for (let t of k.selection) {
				let n = un(t)?.seat.type ?? 1;
				if (e === void 0) e = n;
				else if (e !== n) return "mixed";
			}
			return e;
		}), De = n(() => {
			k.canvasTick;
			let e = l.value;
			if (!e) return "";
			let t;
			for (let n of e.rows) for (let e of n.seats) {
				let n = e.cat ?? null;
				if (t === void 0) t = n;
				else if (t !== n) return "mixed";
			}
			return t === void 0 ? e.cat_id == null ? "" : String(e.cat_id) : t === null ? "" : String(t);
		}), ke = n(() => {
			k.canvasTick;
			let e = l.value, t = /* @__PURE__ */ new Set();
			if (e) {
				for (let n of e.rows) for (let e of n.seats) e.cat != null && t.add(e.cat);
				!t.size && e.cat_id != null && t.add(e.cat_id);
			}
			return [...t];
		});
		function Ae(e) {
			let t = l.value;
			if (!t) return;
			let n = e === "" ? null : +e, r = t.rows.flatMap((e) => e.seats.map((e) => e.id));
			r.length && N.setSeatsCategory(r, n), N.updateSection(t.id, { cat: n });
		}
		let je = n(() => (k.sectionsTick, k.sectionSelectionTick, k.venue.sections.filter((e) => k.sectionSelection.has(e.id)))), Ne = n(() => {
			k.canvasTick;
			let e;
			for (let t of je.value) for (let n of t.rows) for (let t of n.seats) {
				let n = t.cat ?? null;
				if (e === void 0) e = n;
				else if (e !== n) return "mixed";
			}
			return e == null ? "" : String(e);
		}), Pe = n(() => {
			k.canvasTick;
			let e = /* @__PURE__ */ new Set();
			for (let t of je.value) for (let n of t.rows) for (let t of n.seats) t.cat != null && e.add(t.cat);
			return [...e];
		});
		function Fe(e) {
			let t = je.value.flatMap((e) => e.rows.flatMap((e) => e.seats.map((e) => e.id)));
			t.length && N.setSeatsCategory(t, e === "" ? null : +e);
		}
		let Ie = n(() => (k.sectionsTick, je.value.map((e) => e.name).join(", "))), Le = n(() => {
			k.canvasTick;
			let e = l.value;
			if (!e) return Ge({});
			let t = Ge(e);
			return {
				...t,
				text: e.name,
				fontSize: t.fontSize > 0 ? t.fontSize : 14
			};
		}), ze = null;
		function Be() {
			ze = k.activeSectionId;
		}
		function Ve(e) {
			let t = ze ?? k.activeSectionId, n = t ? k.venue.sections.find((e) => e.id === t) : null;
			if (n) {
				if ("text" in e) {
					let t = e.text.trim();
					t && t !== n.name && N.updateSection(n.id, { name: t });
					return;
				}
				N.updateSectionLabel([n.id], e);
			}
		}
		let He = n(() => {
			k.canvasTick, k.sectionSelectionTick;
			let e = je.value.map((e) => {
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
		function We(e) {
			let t = [...k.sectionSelection];
			t.length && N.updateSectionLabel(t, e);
		}
		let Je = n(() => (k.canvasTick, l.value ? qe(l.value) : Ke()));
		function Ye(e) {
			let t = l.value;
			t && N.updateSectionWatermark([t.id], e);
		}
		function Xe(e) {
			Ye({ text: e.target.value.trim() }), e.target.value = Je.value.text;
		}
		let Ze = x(null);
		function Qe(e) {
			let t = e.target.files?.[0];
			e.target.value = "", t && O(t, { maxEdge: 512 }).then((e) => Ye({ logo: {
				src: e.src,
				width: 20,
				ratio: e.h / e.w
			} })).catch((e) => alert(e.message));
		}
		let $e = x(""), et = x(16), tt = x(24), nt = x(0), rt = x(0);
		E([ae, () => k.canvasTick], ([e]) => {
			e.length === 1 && ($e.value = e[0].label), e.length && (et.value = e[0].seatSpacing ?? 16, tt.value = e[0].rowSpacing ?? 24, nt.value = Math.round(Me(e[0]) * 10) / 10, rt.value = e[0].curve ?? 0);
		});
		let it = () => ae.value.map((e) => e.id), at = n(() => ae.value.length > 1 ? ae.value.map((e) => e.seats.length).join(", ") : String(b.value)), ot = n(() => {
			k.selectionTick, k.canvasTick;
			let e = ae.value.map((e) => e.label);
			return e.length ? e.every((e) => !e) ? "（无标签）" : e.map((e) => e || "·").join(", ") : "";
		}), st = (e) => e === "" || e == null ? "·" : String(e), ct = n(() => (k.selectionTick, k.canvasTick, ae.value.map((e) => {
			let t = Oe(e), n = t[0]?.n, r = t[t.length - 1]?.n;
			return {
				id: e.id,
				label: e.label || "（无标签）",
				text: t.length <= 1 ? st(n) : `${st(n)} – ${st(r)}`
			};
		}))), lt = n(() => {
			k.selectionTick, k.canvasTick;
			let e = [...k.selection].map((e) => un(e)?.seat.n).map((e) => e === "" || e == null ? "·" : String(e));
			if (!e.length) return "";
			let t = e.slice(0, 12).join(", ");
			return e.length > 12 ? `${t} … 共 ${e.length} 座` : t;
		});
		function ut() {
			ae.value.length === 1 && N.updateRowLabel(ae.value[0].id, $e.value.trim());
		}
		let dt = n(() => {
			k.selectionTick, k.canvasTick;
			let e = ae.value;
			if (!e.length) return "both";
			let t = Re(e[0]);
			return e.every((e) => Re(e) === t) ? t : "mixed";
		});
		function D(e) {
			let t = dt.value === "mixed" ? "both" : dt.value, n = {
				start: t === "start" || t === "both",
				end: t === "end" || t === "both"
			};
			n[e] = !n[e];
			let r = n.start && n.end ? "both" : n.start ? "start" : n.end ? "end" : "none";
			N.setRowLabelPos(it(), r);
		}
		function ft() {
			N.setRowsSeatSpacing(it(), +et.value || 16);
		}
		function pt() {
			N.setRowsRowSpacing(it(), +tt.value || 24);
		}
		function mt() {
			N.setRowsRotation(it(), +nt.value || 0);
		}
		function ht() {
			N.setRowsCurve(it(), +rt.value || 0);
		}
		let gt = n(() => {
			k.imageTick;
			let e = k.venue.images?.[0];
			return e ? { ...e } : null;
		}), _t = x(!1);
		function vt(e) {
			_t.value = !1;
			let t = e.dataTransfer?.files?.[0];
			t && O(t).then((e) => N.replaceVenueImage(e)).catch((e) => alert(e.message));
		}
		let yt = null, bt = (e) => VS ** ((e - 50) / 50);
		function xt(e) {
			let t = gt.value;
			if (!t) return;
			yt ||= {
				x: t.x,
				y: t.y,
				w: t.w,
				h: t.h,
				cx: t.x + t.w / 2,
				cy: t.y + t.h / 2
			};
			let n = bt(e), r = yt.w * n, i = yt.h * n;
			N.previewImageTransform(t.id, {
				x: yt.cx - r / 2,
				y: yt.cy - i / 2,
				w: r,
				h: i
			});
		}
		function St(e) {
			let t = gt.value;
			if (!t || !yt) {
				yt = null;
				return;
			}
			let n = bt(e), r = yt.w * n / (t.baseW || yt.w);
			N.previewImageTransform(t.id, {
				x: yt.x,
				y: yt.y,
				w: yt.w,
				h: yt.h
			}), Math.abs(n - 1) > .01 && N.setImageScale(t.id, r), yt = null;
		}
		E(() => gt.value?.id, () => {
			yt = null;
		});
		let Ct = x(!1), wt = x(""), Tt = x(null);
		function Et() {
			wt.value = k.venue.name || "", Ct.value = !0, p(() => Tt.value?.select());
		}
		function Dt() {
			Ct.value &&= (N.renameVenue(wt.value), !1);
		}
		function Ot() {
			Ct.value = !1;
		}
		return (t, n) => (y(), o("aside", rx, [
			me.value ? (y(), o("div", ix, C(me.value), 1)) : a("", !0),
			pe.value ? (y(), o("section", {
				key: 1,
				class: m(["card image-card", { "drag-over": _t.value }]),
				"data-key": "image-card",
				onDragover: n[5] ||= re((e) => _t.value = !0, ["prevent"]),
				onDragleave: n[6] ||= re((e) => _t.value = !1, ["prevent"]),
				onDrop: re(vt, ["prevent"])
			}, [
				s("div", ax, [n[42] ||= s("span", { class: "card-title" }, "底图", -1), s("button", {
					class: "manage",
					"data-key": "image-upload",
					title: gt.value ? "替换当前底图（可撤销）" : "上传参考底图",
					onClick: n[0] ||= (e) => w(N).pickImages()
				}, C(gt.value ? "⇪ 替换" : "＋ 上传"), 9, ox)]),
				n[52] ||= s("div", {
					class: "muted",
					style: { margin: "2px 0 8px" }
				}, "支持 PNG / JPG / WebP / GIF / SVG，拖图片到此卡也可上传；单张 ≤ 10MB", -1),
				gt.value ? (y(), o(e, { key: 0 }, [gt.value.locked ? (y(), o(e, { key: 0 }, [s("div", sx, [n[44] ||= s("span", null, "锁定", -1), s("label", cx, [s("input", {
					type: "checkbox",
					checked: "",
					"data-key": "image-lock",
					onChange: n[1] ||= (e) => w(N).setImageLocked(gt.value.id, !1)
				}, null, 32), n[43] ||= s("span", null, "已锁定", -1)])]), n[45] ||= s("div", {
					class: "muted",
					style: { margin: "8px 0" }
				}, "底图已锁定：画布上点选/框选不到；取消勾选后可调整缩放与透明度", -1)], 64)) : (y(), o(e, { key: 1 }, [
					s("div", lx, [n[46] ||= s("span", null, "缩放", -1), u(nx, {
						jog: "",
						"model-value": 50,
						"data-key": "image-scale",
						title: "右滑放大 / 左滑缩小，松手回中",
						onSlide: xt,
						onCommit: St
					})]),
					s("div", ux, [n[47] ||= s("span", null, "透明度", -1), u(nx, {
						"model-value": Math.round(gt.value.opacity * 100),
						"data-key": "image-opacity",
						onSlide: n[2] ||= (e) => w(N).setImageOpacity(gt.value.id, e / 100)
					}, null, 8, ["model-value"])]),
					s("div", dx, [n[48] ||= s("span", null, "可见", -1), s("input", {
						type: "checkbox",
						checked: gt.value.visible !== !1,
						"data-key": "image-visible",
						title: "隐藏后画布不显示底图（数据保留，便于描图时临时对照）",
						onChange: n[3] ||= (e) => w(N).setImageVisible(gt.value.id, e.target.checked)
					}, null, 40, fx)]),
					s("div", px, [n[50] ||= s("span", null, "锁定", -1), s("label", mx, [s("input", {
						type: "checkbox",
						checked: !1,
						"data-key": "image-lock",
						onChange: n[4] ||= (e) => w(N).setImageLocked(gt.value.id, !0)
					}, null, 32), n[49] ||= s("span", null, "未锁定", -1)])]),
					n[51] ||= s("div", {
						class: "muted",
						style: { margin: "8px 0" }
					}, "选择工具选中后可拖动移动、拖顶部圆点旋转；缩放用滑条，传新图即替换（可撤销）", -1)
				], 64))], 64)) : (y(), o("div", hx, "还没有底图。上传后可垫图描图，传新图会替换当前底图（可撤销）。"))
			], 34)) : a("", !0),
			oe.value ? (y(), o(e, { key: 2 }, [
				le.value ? (y(), o("section", gx, [s("button", {
					class: "ctl block",
					"data-key": "convert-section",
					onClick: ue
				}, "⇱ 转为分区"), n[53] ||= s("div", {
					class: "muted",
					style: { "margin-top": "6px" }
				}, "把选中的散座排转为带轮廓、可命名的正式分区", -1)])) : a("", !0),
				s("section", _x, [s("div", vx, [n[54] ||= s("span", { class: "card-title" }, "类别", -1), s("button", {
					class: "manage",
					onClick: n[7] ||= (e) => w(N).openCategoryModal()
				}, "⚙ 管理")]), u(Wb, {
					value: Se.value,
					categories: he.value,
					"involved-cats": Ce.value,
					"data-key": "sel-cat",
					onChange: we
				}, null, 8, [
					"value",
					"categories",
					"involved-cats"
				])]),
				ie.value ? (y(), o(e, { key: 1 }, [
					s("section", yx, [
						n[60] ||= s("div", { class: "card-head" }, [s("span", { class: "card-title" }, "排")], -1),
						s("div", bx, [s("span", { class: m({ "prop-hi": ae.value.length === 1 }) }, "座位数", 2), s("input", {
							class: "ctl",
							value: at.value,
							readonly: "",
							title: at.value,
							"data-key": "row-seat-count"
						}, null, 8, xx)]),
						s("div", Sx, [n[55] ||= s("span", null, "旋转", -1), u(Fb, {
							modelValue: nt.value,
							"onUpdate:modelValue": n[8] ||= (e) => nt.value = e,
							min: -90,
							max: 90,
							unit: "°",
							"data-key": "row-rotation",
							onChange: mt
						}, null, 8, ["modelValue"])]),
						s("div", Cx, [n[56] ||= s("span", null, "弧度", -1), u(Fb, {
							modelValue: rt.value,
							"onUpdate:modelValue": n[9] ||= (e) => rt.value = e,
							min: -180,
							max: 180,
							"data-key": "row-curve",
							onChange: ht
						}, null, 8, ["modelValue"])]),
						ae.value.length > 1 ? (y(), o("div", wx, [n[57] ||= s("span", null, "排距", -1), u(Fb, {
							modelValue: tt.value,
							"onUpdate:modelValue": n[10] ||= (e) => tt.value = e,
							min: 8,
							max: 200,
							"data-key": "row-spacing",
							onChange: pt
						}, null, 8, ["modelValue"])])) : a("", !0),
						s("div", Tx, [n[58] ||= s("span", null, "座位间距", -1), u(Fb, {
							modelValue: et.value,
							"onUpdate:modelValue": n[11] ||= (e) => et.value = e,
							min: 4,
							max: 100,
							"data-key": "seat-spacing",
							onChange: ft
						}, null, 8, ["modelValue"])]),
						ae.value.length > 1 ? (y(), o("div", Ex, [n[59] ||= s("span", null, "对齐", -1), s("div", Dx, [
							s("button", {
								"data-key": "row-align-start",
								title: "左对齐：各排沿排方向平移，首座对齐到最靠前的排（只平移不改形）",
								onClick: n[12] ||= (e) => w(N).alignRows(it(), "start")
							}, "左"),
							s("button", {
								"data-key": "row-align-center",
								title: "中对齐：各排中心对齐到均值线——配统一弧度出同心弧排",
								onClick: n[13] ||= (e) => w(N).alignRows(it(), "center")
							}, "中"),
							s("button", {
								"data-key": "row-align-end",
								title: "右对齐：各排末座对齐到最靠后的排",
								onClick: n[14] ||= (e) => w(N).alignRows(it(), "end")
							}, "右")
						])])) : a("", !0)
					]),
					s("section", Ox, [
						s("div", kx, [n[61] ||= s("span", { class: "card-title" }, "排标签", -1), ae.value.length > 1 ? (y(), o("button", {
							key: 0,
							class: "manage",
							"data-key": "row-label-open",
							title: "批量编辑排标签（序列/起始/方向）",
							onClick: n[15] ||= (e) => w(N).openLabelModal("rows")
						}, "✎ 编辑")) : a("", !0)]),
						ae.value.length === 1 ? (y(), o("div", Ax, [n[62] ||= s("span", null, "标签", -1), te(s("input", {
							class: "ctl",
							"onUpdate:modelValue": n[16] ||= (e) => $e.value = e,
							"data-key": "row-label",
							onChange: ut
						}, null, 544), [[T, $e.value]])])) : (y(), o("div", jx, [n[63] ||= s("span", null, "标签", -1), s("input", {
							class: "ctl",
							value: ot.value,
							readonly: "",
							title: ot.value
						}, null, 8, Mx)])),
						s("div", Nx, [n[69] ||= s("span", null, "位置", -1), s("div", Px, [
							s("span", {
								class: m(["pos-end", {
									on: ["start", "both"].includes(dt.value),
									mixed: dt.value === "mixed"
								}]),
								"data-key": "row-label-pos-start",
								title: "首端显示排标签",
								onClick: n[17] ||= (e) => D("start")
							}, C(ae.value[0]?.label || "1"), 3),
							n[64] ||= s("i", null, null, -1),
							n[65] ||= s("i", null, null, -1),
							n[66] ||= s("i", null, null, -1),
							n[67] ||= s("i", null, null, -1),
							n[68] ||= s("i", null, null, -1),
							s("span", {
								class: m(["pos-end", {
									on: ["end", "both"].includes(dt.value),
									mixed: dt.value === "mixed"
								}]),
								"data-key": "row-label-pos-end",
								title: "尾端显示排标签",
								onClick: n[18] ||= (e) => D("end")
							}, C(ae.value[0]?.label || "1"), 3)
						])])
					]),
					s("section", Fx, [
						s("div", Ix, [n[70] ||= s("span", { class: "card-title" }, "座位编号", -1), s("button", {
							class: "manage",
							"data-key": "seatnum-open",
							title: "批量编辑座位编号（序列样式/起始/方向）",
							onClick: n[19] ||= (e) => w(N).openLabelModal("seats")
						}, "✎ 编辑")]),
						s("div", { class: m(["num-list", { scroll: ct.value.length > 6 }]) }, [(y(!0), o(e, null, S(ct.value, (e) => (y(), o("div", {
							key: e.id,
							class: "prop"
						}, [s("span", null, C(e.label), 1), s("span", Lx, C(e.text), 1)]))), 128))], 2),
						ct.value.length > 6 ? (y(), o("div", Rx, "共 " + C(ct.value.length) + " 排，滚动查看", 1)) : a("", !0)
					])
				], 64)) : (y(), o("section", zx, [s("div", Bx, [n[71] ||= s("span", { class: "card-title" }, "座位编号", -1), s("button", {
					class: "manage",
					"data-key": "seatnum-open",
					title: "批量编辑座位编号（只作用于选中的座位）",
					onClick: n[20] ||= (e) => w(N).openLabelModal("seats")
				}, "✎ 编辑")]), s("div", Vx, [n[72] ||= s("span", null, "编号", -1), s("span", {
					class: "val-static num-summary",
					title: lt.value
				}, C(lt.value), 9, Hx)])])),
				s("section", Ux, [n[73] ||= s("div", { class: "card-head" }, [s("span", { class: "card-title" }, "座位类型")], -1), s("select", {
					class: "ctl block",
					"data-key": "seat-type",
					value: Ee.value === "mixed" ? "" : String(Ee.value),
					onChange: n[21] ||= (e) => w(N).setSelectedType(+e.target.value)
				}, [Ee.value === "mixed" ? (y(), o("option", Gx, "多种类型")) : a("", !0), (y(!0), o(e, null, S(w(ce), (e) => (y(), o("option", {
					key: e.key,
					value: String(e.key)
				}, C(e.label), 9, Kx))), 128))], 40, Wx)]),
				s("section", qx, [n[74] ||= s("div", { class: "card-head" }, [s("span", { class: "card-title" }, "状态")], -1), s("select", {
					class: "ctl block",
					"data-key": "seat-status",
					value: Te.value === "mixed" ? "" : Te.value,
					onChange: n[22] ||= (e) => w(N).setSelectedStatus(e.target.value)
				}, [Te.value === "mixed" ? (y(), o("option", Yx, "多种状态")) : a("", !0), (y(!0), o(e, null, S(w(se), (e) => (y(), o("option", {
					key: e.key,
					value: e.key
				}, C(e.label), 9, Xx))), 128))], 40, Jx)])
			], 64)) : de.value ? (y(), o(e, { key: 3 }, [
				s("section", Zx, [
					s("div", Qx, [n[75] ||= s("span", { class: "card-title" }, "分区", -1), s("button", {
						class: "manage",
						title: "进入座位编辑模式",
						onClick: n[23] ||= (e) => w(N).enterSection(l.value.id)
					}, "✎ 编辑内容")]),
					s("div", $x, [s("span", {
						class: "dot lg",
						style: h({ background: l.value.color })
					}, null, 4), s("strong", null, C(w(Ue)(l.value)), 1)]),
					s("div", eS, [n[76] ||= s("span", null, "座位数", -1), s("span", tS, C(w(N).seatCountOf(l.value).toLocaleString()), 1)]),
					f.value ? (y(), o("div", nS, [n[77] ||= s("span", null, "角弧度", -1), u(Fb, {
						"model-value": Math.round(f.value.r),
						min: 0,
						max: g.value,
						step: 1,
						title: "矩形分区的圆角半径（节点编辑模式下也可直接拖弧中点手柄调整）",
						"data-key": "section-corner-radius",
						onChange: _
					}, null, 8, ["model-value", "max"])])) : a("", !0)
				]),
				s("section", rS, [s("div", iS, [n[78] ||= s("span", { class: "card-title" }, "类别", -1), s("button", {
					class: "manage",
					onClick: n[24] ||= (e) => w(N).openCategoryModal()
				}, "⚙ 管理")]), u(Wb, {
					value: De.value,
					categories: he.value,
					"involved-cats": ke.value,
					"data-key": "section-cat",
					onChange: Ae
				}, null, 8, [
					"value",
					"categories",
					"involved-cats"
				])]),
				s("section", aS, [n[79] ||= s("div", { class: "card-head" }, [s("span", { class: "card-title" }, "标签")], -1), u($b, {
					label: Le.value,
					"show-text": "",
					"key-prefix": "label",
					onFocus: Be,
					onUpdate: Ve
				}, null, 8, ["label"])]),
				w(k).mode === "seats" ? (y(), o("section", oS, [
					n[91] ||= s("div", { class: "card-head" }, [s("span", { class: "card-title" }, "水印")], -1),
					s("div", sS, [n[80] ||= s("span", null, "文本", -1), s("input", {
						class: "ctl",
						value: Je.value.text,
						placeholder: "赞助商名称，留空无水印",
						title: "防伪票风格：文字/Logo 平铺整个分区（只铺轮廓内），渲染在座位之下",
						"data-key": "wm-text",
						onChange: Xe
					}, null, 40, cS)]),
					s("div", lS, [n[81] ||= s("span", null, "颜色", -1), s("input", {
						type: "color",
						class: "ctl color-ctl",
						value: Je.value.color,
						title: "水印文字颜色（Logo 为图片原色，不受影响）",
						"data-key": "wm-color",
						onChange: n[25] ||= (e) => Ye({ color: e.target.value })
					}, null, 40, uS)]),
					s("div", dS, [n[82] ||= s("span", null, "Logo", -1), s("div", fS, [
						Je.value.logo?.src ? (y(), o("img", {
							key: 0,
							src: Je.value.logo.src,
							alt: "水印logo",
							class: "wm-logo-preview"
						}, null, 8, pS)) : a("", !0),
						s("button", {
							class: "manage",
							"data-key": "wm-logo-upload",
							title: "上传 Logo 图片（png/jpg/svg，自动压缩）",
							onClick: n[26] ||= (e) => Ze.value?.click()
						}, C(Je.value.logo?.src ? "替换" : "上传"), 1),
						Je.value.logo?.src ? (y(), o("button", {
							key: 1,
							class: "manage",
							"data-key": "wm-logo-remove",
							onClick: n[27] ||= (e) => Ye({ logo: null })
						}, "移除")) : a("", !0)
					])]),
					Je.value.logo?.src ? (y(), o("div", mS, [n[83] ||= s("span", null, "Logo 宽度", -1), u(Fb, {
						"model-value": Je.value.logo.width,
						min: 20,
						max: 1e3,
						step: 10,
						"data-key": "wm-logo-width",
						onChange: n[28] ||= (e) => Ye({ logo: {
							...Je.value.logo,
							width: e
						} })
					}, null, 8, ["model-value"])])) : a("", !0),
					s("div", hS, [n[84] ||= s("span", null, "可见", -1), s("input", {
						type: "checkbox",
						checked: Je.value.visible === !0,
						"data-key": "wm-visible",
						onChange: n[29] ||= (e) => Ye({ visible: e.target.checked })
					}, null, 40, gS)]),
					s("div", _S, [n[85] ||= s("span", null, "透明度", -1), u(Fb, {
						"model-value": Je.value.opacity,
						min: .05,
						max: .6,
						step: .01,
						"data-key": "wm-opacity",
						onChange: n[30] ||= (e) => Ye({ opacity: e })
					}, null, 8, ["model-value"])]),
					s("div", vS, [n[86] ||= s("span", null, "字号", -1), u(Fb, {
						"model-value": Je.value.fontSize,
						min: 4,
						max: 300,
						"data-key": "wm-font-size",
						onChange: n[31] ||= (e) => Ye({ fontSize: e })
					}, null, 8, ["model-value"])]),
					s("div", yS, [n[87] ||= s("span", null, "行距", -1), u(Fb, {
						"model-value": Je.value.rowGap,
						min: .5,
						max: 5,
						step: .1,
						unit: "×",
						title: "水印行距倍数（1 = 基准，调大更稀疏）",
						"data-key": "wm-row-gap",
						onChange: n[32] ||= (e) => Ye({ rowGap: e })
					}, null, 8, ["model-value"])]),
					s("div", bS, [n[88] ||= s("span", null, "旋转", -1), u(Fb, {
						"model-value": Je.value.rotation,
						min: -180,
						max: 180,
						unit: "°",
						"data-key": "wm-rotation",
						onChange: n[33] ||= (e) => Ye({ rotation: e })
					}, null, 8, ["model-value"])]),
					s("div", xS, [n[89] ||= s("span", null, "位置 X", -1), u(Fb, {
						"model-value": Je.value.dx,
						min: -2e3,
						max: 2e3,
						step: 10,
						"data-key": "wm-dx",
						onChange: n[34] ||= (e) => Ye({ dx: e })
					}, null, 8, ["model-value"])]),
					s("div", SS, [n[90] ||= s("span", null, "位置 Y", -1), u(Fb, {
						"model-value": Je.value.dy,
						min: -2e3,
						max: 2e3,
						step: 10,
						"data-key": "wm-dy",
						onChange: n[35] ||= (e) => Ye({ dy: e })
					}, null, 8, ["model-value"])])
				])) : a("", !0)
			], 64)) : fe.value ? (y(), o(e, { key: 4 }, [s("section", CS, [s("div", wS, [n[92] ||= s("span", { class: "card-title" }, "类别", -1), s("button", {
				class: "manage",
				onClick: n[36] ||= (e) => w(N).openCategoryModal()
			}, "⚙ 管理")]), u(Wb, {
				value: Ne.value,
				categories: he.value,
				"involved-cats": Pe.value,
				"data-key": "multi-cat",
				onChange: Fe
			}, null, 8, [
				"value",
				"categories",
				"involved-cats"
			])]), s("section", TS, [
				s("div", ES, [n[93] ||= s("span", { class: "card-title" }, "分区标签", -1), s("button", {
					class: "manage",
					"data-key": "sec-label-open",
					title: "批量编辑标签（序列/起始/方向）",
					onClick: n[37] ||= (e) => w(N).openLabelModal()
				}, "✎ 编辑")]),
				s("div", DS, [n[94] ||= s("span", null, "标签", -1), s("input", {
					class: "ctl",
					value: Ie.value,
					readonly: "",
					title: Ie.value
				}, null, 8, OS)]),
				u($b, {
					label: He.value,
					"key-prefix": "mlabel",
					onUpdate: We
				}, null, 8, ["label"])
			])], 64)) : pe.value ? a("", !0) : (y(), o(e, { key: 5 }, [s("section", kS, [s("div", AS, [Ct.value ? te((y(), o("input", {
				key: 1,
				ref_key: "nameInput",
				ref: Tt,
				class: "ctl venue-name-input",
				"data-key": "venue-name-input",
				"onUpdate:modelValue": n[38] ||= (e) => wt.value = e,
				maxlength: "50",
				onKeydown: [ne(Dt, ["enter"]), ne(Ot, ["esc"])],
				onBlur: Dt
			}, null, 544)), [[T, wt.value]]) : (y(), o(e, { key: 0 }, [s("span", jS, C(w(k).venue.name || "未命名场馆"), 1), s("button", {
				class: "manage",
				"data-key": "venue-name-edit",
				title: "编辑场馆名",
				onClick: Et
			}, "✎ 编辑")], 64))])]), s("section", MS, [
				s("div", NS, [s("span", PS, "◉◉ " + C(he.value.length) + " 个类别", 1), s("span", FS, [s("button", {
					class: "manage",
					"data-key": "cat-manage",
					onClick: n[39] ||= (e) => w(N).openCategoryModal()
				}, "⚙ 管理")])]),
				s("div", IS, [s("span", LS, "◉ " + C(i.value.toLocaleString()) + " 座位", 1)]),
				s("div", {
					class: m(["sum-check", ye.value ? "warn" : "ok"]),
					"data-key": "check-dup",
					style: h(ye.value ? "cursor:pointer" : ""),
					title: ye.value ? "点击定位到第一个重复项所在的分区" : "",
					onClick: n[40] ||= (e) => ye.value && be()
				}, C(ye.value ? `${ye.value} 个重复` : "✓ 无重复"), 15, RS),
				s("div", {
					class: m(["sum-check", xe.value ? "warn" : "ok"]),
					"data-key": "check-unlabeled"
				}, C(xe.value ? `${xe.value.toLocaleString()} 个对象未标记` : "✓ 所有对象已标记"), 3),
				s("div", { class: m(["sum-check", _e.value ? "warn" : "ok"]) }, C(_e.value ? `${_e.value.toLocaleString()} 个未分类对象` : "✓ 所有对象已分类"), 3)
			])], 64)),
			s("section", zS, [s("div", BS, [n[95] ||= s("span", { class: "card-title" }, "图例", -1), s("button", {
				class: "manage",
				"data-key": "legend-toggle",
				onClick: n[41] ||= (e) => ge.value = !ge.value
			}, C(ge.value ? "收起" : "展开"), 1)]), ge.value ? (y(), o(e, { key: 0 }, [
				n[96] ||= s("div", { class: "panel-sub" }, "类别", -1),
				(y(!0), o(e, null, S(he.value, (e) => (y(), o("div", {
					class: "legend-row",
					key: e.key
				}, [s("span", {
					class: "dot",
					style: h({ background: e.color })
				}, null, 4), s("span", null, C(e.label), 1)]))), 128)),
				n[97] ||= c("<div class=\"legend-row\"><span class=\"dot\" style=\"background:#9ca3af;\"></span><span>未分类</span></div><div class=\"panel-sub\">状态（放大进入分区后显示在座位上）</div><div class=\"legend-row\"><svg class=\"legend-ico\" viewBox=\"0 0 12 12\"><circle cx=\"6\" cy=\"6\" r=\"6\" fill=\"#cbd5e1\"></circle><path d=\"M3,3 L9,9 M3,9 L9,3\" stroke=\"#1e293b\" stroke-width=\"1.2\" fill=\"none\"></path></svg><span>已售</span></div><div class=\"legend-row\"><svg class=\"legend-ico\" viewBox=\"0 0 12 12\"><circle cx=\"6\" cy=\"6\" r=\"6\" fill=\"#cbd5e1\"></circle><circle cx=\"6\" cy=\"6\" r=\"2.4\" fill=\"#1e293b\"></circle></svg><span>预留</span></div><div class=\"legend-row\"><svg class=\"legend-ico\" viewBox=\"0 0 12 12\"><circle cx=\"6\" cy=\"6\" r=\"6\" fill=\"#cbd5e1\"></circle><path d=\"M3,9 L9,3\" stroke=\"#1e293b\" stroke-width=\"1.2\" fill=\"none\"></path></svg><span>禁用</span></div><div class=\"muted\" style=\"margin-top:6px;\">全局视图下非可售座位统一显示为灰色</div>", 6)
			], 64)) : a("", !0)]),
			s("input", {
				ref_key: "wmLogoInput",
				ref: Ze,
				type: "file",
				accept: "image/*,.svg",
				style: { display: "none" },
				onChange: Qe
			}, null, 544)
		]));
	}
}, US = { class: "statusbar" }, WS = { class: "hint" }, GS = {
	key: 0,
	class: "notice"
}, KS = {
	__name: "StatusBar",
	setup(e) {
		let t = n(() => {
			k.sectionsTick;
			let e = k.venue.sections.find((e) => e.id === k.editingSectionId);
			return e ? Ue(e) : "";
		}), r = n(() => {
			if (k.mode === "seats") return k.tool === "row" ? "单排：点击定起点，移动实时预览，再点击完成（继续点击画下一排）；Esc 取消本次绘制" : k.tool === "grid" ? "多行：点击定起点，再点击定首排，垂直移动展开多排后点击定排数；Esc 取消本次绘制" : k.tool === "lasso" ? "套索：按住拖出自由笔画，路过的座位排即被选中（Shift 加选），松开完成；选中后拖动移动、拖手柄旋转；单击=点选排；Esc 取消" : "框选座位；拖动移动选区；拖蓝色手柄旋转（Shift 吸附 15°）；双击空白或 Esc 退出分区";
			switch (k.tool) {
				case "select": return "单击选中分区或散座排，拖拽框选多选，拖动移动；双击进入分区；调整形状用节点编辑工具(N)";
				case "node": return "节点编辑：单击选中分区，拖顶点变形、拖边中点调弧度（生成参数分区拖手柄调整形状）；移动/旋转请回选择工具";
				default: return ab.find((e) => e.key === k.tool)?.hint || "";
			}
		}), i = n(() => {
			k.sectionsTick;
			let e = 0;
			for (let t of k.venue.sections) for (let n of t.rows) e += n.seats.length;
			return {
				seats: e,
				sections: k.venue.sections.length
			};
		}), c = n(() => (k.selectionTick, k.sectionSelectionTick, k.mode === "seats" ? k.selection.size : k.sectionSelection.size || k.selection.size));
		return (e, n) => (y(), o("footer", US, [
			s("span", { class: m(["mode-badge", w(k).mode]) }, C(w(k).mode === "seats" ? `座位编辑 · ${t.value}` : "分区模式"), 3),
			s("span", WS, C(r.value), 1),
			w(k).notice ? (y(), o("span", GS, C(w(k).notice), 1)) : a("", !0),
			n[0] ||= s("span", { class: "spacer" }, null, -1),
			s("span", null, "分区 " + C(i.value.sections), 1),
			s("span", null, "座位 " + C(i.value.seats.toLocaleString()), 1),
			s("span", null, "已选 " + C(c.value.toLocaleString()), 1),
			s("span", null, "缩放 " + C(Math.round(w(k).zoom * 100)) + "%", 1)
		]));
	}
}, qS = {
	class: "modal",
	role: "dialog",
	"aria-label": "类别管理"
}, JS = { class: "modal-head" }, YS = { class: "modal-body" }, XS = ["data-key"], ZS = { class: "cat-swatch-wrap" }, QS = ["data-key", "onClick"], $S = ["title", "onClick"], eC = {
	class: "palette-custom",
	title: "自定义颜色"
}, tC = ["value", "onChange"], nC = [
	"data-key",
	"value",
	"onChange"
], rC = [
	"data-key",
	"value",
	"onChange"
], iC = { class: "cat-count muted" }, aC = ["data-key", "onClick"], oC = ["title", "onClick"], sC = {
	key: 0,
	class: "empty"
}, cC = { class: "modal-foot" }, lC = {
	__name: "CategoryModal",
	setup(t) {
		let r = n(() => (k.sectionsTick, k.venue.categories.slice())), i = n(() => {
			k.canvasTick;
			let e = /* @__PURE__ */ new Map();
			for (let t of k.venue.sections) for (let n of t.rows) for (let t of n.seats) t.cat != null && e.set(t.cat, (e.get(t.cat) || 0) + 1);
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
		function ee() {
			c.value != null && (c.value = null);
		}
		function T(e, t) {
			let n = t.target.value.trim();
			n && n !== e.label ? N.updateCategory(e.key, { label: n }) : t.target.value = e.label;
		}
		function E(e, t) {
			let n = t.target.value.trim(), r = n === "" ? null : parseFloat(n);
			if (isNaN(r)) {
				t.target.value = e.price == null ? "" : e.price;
				return;
			}
			r !== e.price && N.updateCategory(e.key, { price: r });
		}
		async function te() {
			let e = N.addCategory({});
			await p();
			let t = document.querySelector(`input[data-key="cat-label-${e.key}"]`);
			t && (t.focus(), t.select());
		}
		let re = x(null), ie = null;
		function oe(e) {
			if (!i.value.get(e.key)) {
				N.removeCategory(e.key);
				return;
			}
			re.value = e.key, clearTimeout(ie), ie = setTimeout(() => {
				re.value = null;
			}, 3e3);
		}
		function se(e) {
			clearTimeout(ie), re.value = null, N.removeCategory(e);
		}
		function ce() {
			clearTimeout(ie), re.value = null;
		}
		function le(e) {
			e.target === e.currentTarget && N.closeCategoryModal();
		}
		return _(() => {
			document.addEventListener("mousedown", b, !0), document.addEventListener("scroll", ee, !0);
		}), g(() => {
			document.removeEventListener("mousedown", b, !0), document.removeEventListener("scroll", ee, !0), clearTimeout(ie);
		}), (t, n) => w(k).catModalOpen ? (y(), o("div", {
			key: 0,
			class: "modal-mask",
			"data-key": "cat-modal",
			onMousedown: le
		}, [s("div", qS, [
			s("div", JS, [n[6] ||= s("span", { class: "modal-title" }, "类别管理", -1), s("button", {
				class: "modal-close",
				title: "关闭 (Esc)",
				onClick: n[0] ||= (e) => w(N).closeCategoryModal()
			}, "×")]),
			s("div", YS, [(y(!0), o(e, null, S(r.value, (t) => (y(), o("div", {
				key: t.key,
				class: "cat-item",
				"data-key": `cat-${t.key}`
			}, [
				s("div", ZS, [s("button", {
					class: "cat-swatch",
					style: h({ background: t.color }),
					title: "类别颜色",
					"data-key": `cat-swatch-${t.key}`,
					onClick: (e) => d(t.key, e)
				}, [...n[7] ||= [s("span", { class: "swatch-caret" }, "▾", -1)]], 12, QS), c.value === t.key ? (y(), o("div", {
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
				}, null, 14, $S))), 128)), s("label", eC, [s("input", {
					type: "color",
					value: t.color,
					onChange: (e) => f(t.key, e.target.value)
				}, null, 40, tC), n[8] ||= l(" 自定义… ", -1)])], 4)) : a("", !0)]),
				s("input", {
					class: "cat-label",
					"data-key": `cat-label-${t.key}`,
					value: t.label,
					title: "类别名称",
					onChange: (e) => T(t, e),
					onKeydown: n[1] ||= ne((e) => e.target.blur(), ["enter"])
				}, null, 40, nC),
				s("input", {
					class: "cat-price",
					"data-key": `cat-price-${t.key}`,
					type: "number",
					min: "0",
					step: "0.01",
					value: t.price == null ? "" : t.price,
					placeholder: "价格",
					title: "类别价格",
					onChange: (e) => E(t, e),
					onKeydown: n[2] ||= ne((e) => e.target.blur(), ["enter"])
				}, null, 40, rC),
				s("span", iC, C((i.value.get(t.key) || 0).toLocaleString()) + " 座", 1),
				re.value === t.key ? (y(), o(e, { key: 0 }, [s("button", {
					class: "cat-del confirm-yes",
					"data-key": `cat-del-yes-${t.key}`,
					onClick: (e) => se(t.key)
				}, "删除", 8, aC), s("button", {
					class: "cat-del confirm-no",
					onClick: n[3] ||= (e) => ce()
				}, "取消")], 64)) : (y(), o("button", {
					key: 1,
					class: "cat-del",
					title: i.value.get(t.key) ? "删除类别（座位回退为未分类）" : "删除类别",
					onClick: (e) => oe(t)
				}, "🗑", 8, oC))
			], 8, XS))), 128)), r.value.length ? a("", !0) : (y(), o("div", sC, "暂无类别，点击下方按钮创建价格区"))]),
			s("div", cC, [
				s("button", {
					class: "btn",
					"data-key": "cat-modal-add",
					onClick: n[4] ||= (e) => te()
				}, "+ 添加类别"),
				n[9] ||= s("span", { class: "spacer" }, null, -1),
				s("button", {
					class: "btn primary",
					onClick: n[5] ||= (e) => w(N).closeCategoryModal()
				}, "完成")
			])
		])], 32)) : a("", !0);
	}
}, uC = ["aria-label"], dC = { class: "modal-head" }, fC = { class: "modal-title" }, pC = { class: "label-head-actions" }, mC = ["title"], hC = { class: "modal-body" }, gC = { class: "prop" }, _C = ["value"], vC = { class: "prop" }, yC = { class: "prop" }, bC = { class: "seg" }, xC = ["title"], SC = ["title"], CC = { class: "muted label-tip" }, wC = { class: "modal-foot" }, TC = ["disabled"], EC = {
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
		E(() => k.labelModalOpen, (e) => {
			e && (c.value = "num", l.value = "1", u.value = !1);
		});
		function d() {
			l.value = g.value.find((e) => e.key === c.value)?.start || "1";
		}
		let f = n(() => k.labelModalTarget), p = n(() => f.value === "rows"), h = n(() => f.value === "seats"), g = n(() => h.value ? i : r), _ = n(() => h.value ? "座位" : p.value ? "排" : "分区"), v = n(() => h.value && k.mode === "seats" && k.tool === "seat"), b = n(() => v.value ? (k.selectionTick, k.selection.size) : p.value || h.value ? (k.selectionTick, N.selectedRows().length) : (k.sectionSelectionTick, k.sectionSelection.size)), ne = () => p.value || h.value ? N.selectedRows().map((e) => e.id) : [...k.sectionSelection];
		function re() {
			if (!b.value) return;
			let e = l.value || "1";
			v.value ? N.renumberSelectedSeats([...k.selection], e, u.value ? -1 : 1, c.value) : h.value ? N.renumberSeats(ne(), e, u.value ? -1 : 1, c.value) : p.value ? N.labelRows(ne(), e, u.value, c.value) : N.labelSections(ne(), e, u.value, c.value), N.closeLabelModal();
		}
		function ie() {
			b.value && (v.value ? N.clearSelectedSeatNumbers([...k.selection]) : h.value ? N.clearSeatNumbers(ne()) : p.value ? N.clearRowLabels(ne()) : N.clearSectionLabels(ne()), N.closeLabelModal());
		}
		function ae(e) {
			e.target === e.currentTarget && N.closeLabelModal();
		}
		return (t, n) => w(k).labelModalOpen ? (y(), o("div", {
			key: 0,
			class: "modal-mask",
			"data-key": "label-modal",
			onMousedown: ae
		}, [s("div", {
			class: "modal labeling",
			role: "dialog",
			"aria-label": `${_.value}标签`
		}, [
			s("div", dC, [s("span", fC, C(h.value ? "座位编号" : `${_.value}标签`), 1), s("span", pC, [s("button", {
				class: "label-clear",
				"data-key": "label-clear",
				title: `清除选中${_.value}的${h.value ? "编号" : "标签"}（可撤销）`,
				onClick: ie
			}, "✕ 清除", 8, mC), s("button", {
				class: "modal-close",
				title: "关闭 (Esc)",
				onClick: n[0] ||= (e) => w(N).closeLabelModal()
			}, "×")])]),
			s("div", hC, [
				s("div", gC, [n[6] ||= s("span", null, "序列样式", -1), te(s("select", {
					"onUpdate:modelValue": n[1] ||= (e) => c.value = e,
					class: "ctl",
					"data-key": "label-style",
					onChange: d
				}, [(y(!0), o(e, null, S(g.value, (e) => (y(), o("option", {
					key: e.key,
					value: e.key
				}, C(e.text), 9, _C))), 128))], 544), [[ee, c.value]])]),
				s("div", vC, [n[7] ||= s("span", null, "起始", -1), te(s("input", {
					"onUpdate:modelValue": n[2] ||= (e) => l.value = e,
					class: "ctl",
					"data-key": "label-start"
				}, null, 512), [[T, l.value]])]),
				s("div", yC, [n[8] ||= s("span", null, "方向", -1), s("div", bC, [s("button", {
					class: m({ on: !u.value }),
					"data-key": "label-dir-fwd",
					title: h.value ? "每排沿排方向正向编号" : "按选中顺序正向编号",
					onClick: n[3] ||= (e) => u.value = !1
				}, "正向", 10, xC), s("button", {
					class: m({ on: u.value }),
					"data-key": "label-dir-rev",
					title: h.value ? "每排沿排方向反向编号" : "按选中顺序反向编号",
					onClick: n[4] ||= (e) => u.value = !0
				}, "反向", 10, SC)])]),
				s("div", CC, C(v.value ? `作用于选中的 ${b.value} 个座位（按排分组，每排从起始值独立编号）` : h.value ? `作用于选中座位涉及的 ${b.value} 排，每排均从起始值独立编号` : `作用于当前选中的 ${b.value} ${p.value ? "排" : "个分区"}，按点选先后排序编号`), 1)
			]),
			s("div", wC, [
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
				}, "应用", 8, TC)
			])
		], 8, uC)], 32)) : a("", !0);
	}
}, DC = { class: "zp-dial" }, OC = { class: "zp-zoom" }, kC = 20, AC = {
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
			i > kC && (n = n / i * kC, r = r / i * kC), l.value = {
				x: Math.round(n),
				y: Math.round(r)
			};
		}
		return g(r), (e, t) => (y(), o("div", {
			class: "zoom-pad",
			"data-key": "zoom-pad",
			onContextmenu: t[7] ||= re(() => {}, ["prevent"])
		}, [s("div", DC, [
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
		]), s("div", OC, [s("button", {
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
};
//#endregion
//#region src/canvas/overlay.js
function jC(e, t, n = 0, r = 36) {
	return {
		x: (e.minX + e.maxX) / 2,
		y: e.minY - n - t(r)
	};
}
function MC(e, t, n, { pad: r = 0, color: i = "#3b82f6", handle: a = !0, rotation: o = null } = {}) {
	let s;
	if (o) {
		let { deg: e, center: a } = o, c = [
			be(t.minX - r, t.minY - r, a.x, a.y, e),
			be(t.maxX + r, t.minY - r, a.x, a.y, e),
			be(t.maxX + r, t.maxY + r, a.x, a.y, e),
			be(t.minX - r, t.maxY + r, a.x, a.y, e)
		].map((e) => `${e.x.toFixed(2)} ${e.y.toFixed(2)}`);
		s = new Pp({
			path: `M${c.join("L")}Z`,
			stroke: i,
			strokeWidth: n(1.5),
			hittable: !1
		});
	} else s = Hf.one({
		stroke: i,
		strokeWidth: n(1.5),
		hittable: !1
	}, t.minX - r, t.minY - r, t.maxX - t.minX + r * 2, t.maxY - t.minY + r * 2);
	let c = [s];
	if (a) {
		let e = {
			x: (t.minX + t.maxX) / 2,
			y: t.minY - r
		}, a = jC(t, n, r);
		if (o) {
			let { deg: t, center: n } = o, r = be(e.x, e.y, n.x, n.y, t);
			e.x = r.x, e.y = r.y, a = be(a.x, a.y, n.x, n.y, t);
		}
		c.push(new Pp({
			path: `M${e.x.toFixed(2)} ${e.y.toFixed(2)}L${a.x.toFixed(2)} ${a.y.toFixed(2)}`,
			stroke: i,
			strokeWidth: n(1.5),
			hittable: !1
		}), ip.one({
			width: n(16),
			height: n(16),
			fill: i,
			cursor: "grab"
		}, a.x - n(8), a.y - n(8)));
	}
	for (let t of c) e.add(t);
	return c;
}
function NC(e, t, n, r = "#3b82f6") {
	e.add(Hf.one({
		fill: "rgba(59,130,246,0.12)",
		stroke: r,
		strokeWidth: n(1.5),
		dashPattern: [n(8), n(6)]
	}, t.minX, t.minY, t.maxX - t.minX, t.maxY - t.minY));
}
function PC(e, t, n, r = "#3b82f6", i = !1) {
	if (t.length < 2) return;
	let a = `M${t[0].x.toFixed(2)} ${t[0].y.toFixed(2)}`;
	for (let e = 1; e < t.length; e++) a += `L${t[e].x.toFixed(2)} ${t[e].y.toFixed(2)}`;
	i ? (a += "Z", e.add(new Pp({
		path: a,
		fill: "rgba(59,130,246,0.08)",
		stroke: "rgba(59,130,246,0.18)",
		strokeWidth: n(10),
		hittable: !1
	})), e.add(new Pp({
		path: a,
		stroke: r,
		strokeWidth: n(2),
		hittable: !1
	}))) : (e.add(new Pp({
		path: a,
		stroke: "rgba(59,130,246,0.18)",
		strokeWidth: n(10),
		hittable: !1
	})), e.add(new Pp({
		path: a,
		stroke: r,
		strokeWidth: n(2),
		hittable: !1
	})));
}
function FC(e, t, n, r = "#f43f5e") {
	for (let i of t) {
		let t = i.axis === "x" ? `M${i.pos.toFixed(2)} ${i.from.toFixed(2)}L${i.pos.toFixed(2)} ${i.to.toFixed(2)}` : `M${i.from.toFixed(2)} ${i.pos.toFixed(2)}L${i.to.toFixed(2)} ${i.pos.toFixed(2)}`;
		e.add(new Pp({
			path: t,
			stroke: r,
			strokeWidth: n(1),
			dashPattern: [n(4), n(4)]
		}));
	}
}
function IC(e, t, n, r, i = "rgba(244,63,94,0.3)") {
	if (!n) return;
	let a = [
		t.minX,
		(t.minX + t.maxX) / 2,
		t.maxX
	], o = [
		t.minY,
		(t.minY + t.maxY) / 2,
		t.maxY
	];
	for (let t of a) e.add(new Pp({
		path: `M${t.toFixed(2)} ${n.minY.toFixed(2)}L${t.toFixed(2)} ${n.maxY.toFixed(2)}`,
		stroke: i,
		strokeWidth: r(1),
		dashPattern: [r(4), r(4)],
		hittable: !1
	}));
	for (let t of o) e.add(new Pp({
		path: `M${n.minX.toFixed(2)} ${t.toFixed(2)}L${n.maxX.toFixed(2)} ${t.toFixed(2)}`,
		stroke: i,
		strokeWidth: r(1),
		dashPattern: [r(4), r(4)],
		hittable: !1
	}));
}
//#endregion
//#region src/canvas/snap.js
function LC(e) {
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
function RC(e, t, n, r, i) {
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
function zC(e, t) {
	if (Math.hypot(e, t) < 1e-9) return {
		dx: e,
		dy: t
	};
	let n = Math.round(Math.atan2(t, e) / (Math.PI / 4)) * (Math.PI / 4), r = e * Math.cos(n) + t * Math.sin(n);
	return {
		dx: r * Math.cos(n),
		dy: r * Math.sin(n)
	};
}
function BC(e, t, n, r, i) {
	let a = null, o = (t, o, s, c) => {
		let l = Math.hypot(e.x - t, e.y - o);
		l <= i && (!a || l < a.d) && (a = {
			x: t,
			y: o,
			kind: s,
			d: l,
			dirU: c.dir,
			dirV: {
				x: -c.dir.y,
				y: c.dir.x
			},
			first: c.first,
			last: c.last,
			pitch: n,
			rowPitch: r
		});
	};
	for (let a of t) {
		let t = a.dir, s = {
			x: -t.y,
			y: t.x
		};
		for (let c of a.seats) {
			let l = e.x - c.x, u = e.y - c.y;
			if (Math.abs(l) > i + n || Math.abs(u) > i + r) continue;
			let d = l * t.x + u * t.y, f = l * s.x + u * s.y, p = Math.abs(f) < r * .3 ? 0 : Math.sign(f);
			if (p === 0) {
				let e = Math.round(d / n), r = c.idx + e;
				e !== 0 && (r < 0 || r >= a.rowLen) && o(c.x + e * n * t.x, c.y + e * n * t.y, "row", a);
			} else {
				let e = Math.round(d / n);
				o(c.x + e * n * t.x + p * r * s.x, c.y + e * n * t.y + p * r * s.y, "col", a);
				let i = Math.round((d - n / 2) / n);
				o(c.x + (i + .5) * n * t.x + p * r * s.x, c.y + (i + .5) * n * t.y + p * r * s.y, "stagger", a);
			}
		}
	}
	return a;
}
function VC(e, t, n, r, i) {
	let a = null;
	for (let o of [n, r]) {
		if (!o) continue;
		let n = e.x - t.x, r = e.y - t.y, s = n * o.x + r * o.y, c = Math.abs(n * -o.y + r * o.x);
		c <= i && (!a || c < a.dperp) && (a = {
			x: t.x + s * o.x,
			y: t.y + s * o.y,
			axis: o,
			dperp: c
		});
	}
	return a;
}
function HC(e, t, n, r, i, { skipX: a = !1, skipY: o = !1 } = {}) {
	let s = {
		minX: e.minX + t,
		minY: e.minY + n,
		maxX: e.maxX + t,
		maxY: e.maxY + n
	}, c = s.maxX - s.minX, l = s.maxY - s.minY, u = (e, t, n, r) => e < r && n < t, d = [], f = t, p = n, m = (e) => {
		let t = null, n = e ? s.minX : s.minY, a = e ? s.maxX : s.maxY, o = e ? s.minY : s.minX, d = e ? s.maxY : s.maxX, f = e ? c : l, p = (t) => e ? t.minX : t.minY, m = (t) => e ? t.maxX : t.maxY, h = (t) => e ? t.minY : t.minX, g = (t) => e ? t.maxY : t.maxX, _ = (e, t) => (Math.max(h(e), h(t)) + Math.min(g(e), g(t))) / 2, v = (t, n, r, i) => ({
			axis: e ? "y" : "x",
			pos: _(t, n),
			from: r,
			to: i,
			dist: !0
		}), y = (e) => u(h(e), g(e), o, d), b = r.filter((e) => y(e) && m(e) <= n + i), x = r.filter((e) => y(e) && p(e) >= a - i), S = (e, r) => {
			let a = e - n;
			Math.abs(a) <= i && (!t || Math.abs(a) < Math.abs(t.delta)) && (t = {
				delta: a,
				segs: r
			});
		};
		for (let e of b) for (let t of x) {
			if (e === t) continue;
			let n = (m(e) + p(t) - f) / 2;
			n - m(e) > 0 && p(t) - (n + f) > 0 && S(n, [v(e, s, m(e), n), v(s, t, n + f, p(t))]);
		}
		for (let e of b) for (let t of r) {
			if (t === e || !y(t) || m(t) > p(e)) continue;
			let n = p(e) - m(t);
			if (n <= 0) continue;
			let r = m(e) + n;
			S(r, [v(t, e, m(t), p(e)), v(e, s, m(e), r)]);
		}
		for (let e of x) for (let t of r) {
			if (t === e || !y(t) || p(t) < m(e)) continue;
			let n = p(t) - m(e);
			if (n <= 0) continue;
			let r = p(e) - n - f;
			S(r, [v(e, t, m(e), p(t)), v(s, e, r + f, p(e))]);
		}
		return t;
	};
	if (!a) {
		let e = m(!0);
		e && (f += e.delta, d.push(...e.segs));
	}
	if (!o) {
		let e = m(!1);
		e && (p += e.delta, d.push(...e.segs));
	}
	return {
		dx: f,
		dy: p,
		dists: d
	};
}
function UC(e, t, n, r, i) {
	let a = RC(e, t, n, r.guides, i), o = HC(e, a.dx, a.dy, r.bounds, i, {
		skipX: a.guides.some((e) => e.axis === "x"),
		skipY: a.guides.some((e) => e.axis === "y")
	});
	return {
		dx: o.dx,
		dy: o.dy,
		guides: [...a.guides, ...o.dists]
	};
}
//#endregion
//#region src/canvas/interaction.js
function WC(e) {
	let { app: t, layerSel: n, layerTmp: r, toWorld: i, px: a } = e, o = () => typeof e.pad == "function" ? e.pad() : e.pad || 0, s = e.rotate !== !1, c = e.color || "#3b82f6", l = null, u = [], d = () => l !== null;
	function f(t, r = null) {
		for (let e of u) e.remove();
		if (u = [], t === void 0) {
			let n = e.getSelection();
			if (!n.length) return;
			t = e.boundsOf(n);
		}
		t && (u = MC(n, t, a, {
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
				let r = jC(t, a, o());
				if (Math.hypot(n.x - r.x, n.y - r.y) <= a(12)) {
					let r = {
						x: (t.minX + t.maxX) / 2,
						y: (t.minY + t.maxY) / 2
					};
					l = {
						type: "rotate",
						center: r,
						startBounds: t,
						startAngle: Se(r.x, r.y, n),
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
			let r = Se(l.center.x, l.center.y, n) - l.startAngle;
			t.shiftKey && (r = Math.round(r / 15) * 15), l.delta = r, e.onPreviewRotate?.(l.orig, e.getSelection(), r, l.center), f(l.startBounds, {
				deg: r,
				center: l.center
			});
			return;
		}
		if (l.type === "move") {
			let i = n.x - l.start.x, o = n.y - l.start.y;
			if (!l.moved && Math.hypot(i, o) / a(1) < 3) return;
			l.moved || (l.moved = !0, l.orig = e.snapshot?.(e.getSelection())), t.shiftKey && ({dx: i, dy: o} = zC(i, o));
			let s = null;
			if (e.snap && !t.altKey) {
				let t = e.boundsOf(e.getSelection());
				t && ({dx: i, dy: o, guides: s} = e.snap(t, i, o));
			}
			l.dx = i, l.dy = o, e.onPreviewMove?.(l.orig, e.getSelection(), i, o), r.clear();
			let c = p({
				type: "move",
				dx: i,
				dy: o
			}), u = e.extendGuides === !1 ? null : e.viewRect?.();
			if (u && c && IC(r, c, u, a), s?.length) {
				if (u) for (let e of s) e.dist || (e.axis === "x" ? (e.from = u.minY, e.to = u.maxY) : (e.from = u.minX, e.to = u.maxX));
				FC(r, s, a);
			}
			f(c);
			return;
		}
		if (l.type === "marquee") {
			let t = xe(l.start, n);
			r.clear(), NC(r, t, a, c), e.setSelection([...l.base, ...e.collect(t)]);
			return;
		}
		if (l.type === "lasso") {
			let t = l.pts[l.pts.length - 1];
			if (Math.hypot(n.x - t.x, n.y - t.y) / a(1) < 4) return;
			l.pts.push(n), !l.moved && Math.hypot(n.x - l.pts[0].x, n.y - l.pts[0].y) / a(1) >= 3 && (l.moved = !0);
			let i = l.pts.length >= 3 && Math.hypot(l.pts[l.pts.length - 1].x - l.pts[0].x, l.pts[l.pts.length - 1].y - l.pts[0].y) <= a(16);
			r.clear(), l.pts.length >= 2 && (PC(r, l.pts, a, c, i), e.setSelection([...l.base, ...e.collectPoly?.(l.pts, l.ctrlKey, i) || []]));
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
//#region src/seatmap/editor.js
var GC = "#1e2128", KC = 10.8;
function qC(e) {
	let t = new Lp({
		view: e,
		fill: k.theme === "dark" ? GC : de,
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
	}), n = t.tree, r = new Rf(), i = new Rf(), a = new Rf(), o = new Rf();
	r.data = { layer: "bg" }, i.data = { layer: "content" }, a.data = { layer: "sel" }, o.data = { layer: "tmp" }, n.add(r), n.add(i), n.add(a), n.add(o);
	let s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Set(), u = null, d = () => k.mode === "seats";
	function f(e) {
		return n.scaleX * gn() >= KC;
	}
	let p = (e) => e / n.scaleX, m = () => mn(D.seatDefaults.seatPitch), h = () => mn(D.seatDefaults.rowPitch), g = () => m() / 2, _ = () => {
		let e = Kt();
		return e && e.rows.some((e) => e.seats.length) ? hn(e) : m();
	}, v = () => +(_() * .75).toFixed(2), y = () => fn() === 0 ? +p(D.seatDefaults.size).toFixed(2) : v(), b = (e) => gn() / 2, x = (e) => n.getPagePoint({
		x: e.x,
		y: e.y
	}), S = () => {
		let t = n.getPagePoint({
			x: 0,
			y: 0
		}), r = n.getPagePoint({
			x: e.clientWidth,
			y: e.clientHeight
		});
		return {
			minX: t.x,
			minY: t.y,
			maxX: r.x,
			maxY: r.y
		};
	}, C = /* @__PURE__ */ new Map();
	function w() {
		let e = (k.venue.images || []).filter((e) => e.visible !== !1), t = new Set(e.map((e) => e.id));
		for (let [e, n] of C) t.has(e) || (n.remove(), C.delete(e));
		for (let t of e) {
			let e = C.get(t.id);
			e && e.url !== t.src && (e.remove(), e = null), e || (e = new Op({
				url: t.src,
				origin: "center"
			}), e.data = { imageId: t.id }, C.set(t.id, e)), e.x = t.x, e.y = t.y, e.width = t.w, e.height = t.h, e.opacity = t.opacity, e.rotation = t.rotation || 0, e.locked = !!t.locked, r.add(e);
		}
	}
	let ee = E(() => k.imageTick, () => {
		w(), Le();
	});
	w();
	function T() {
		let e = k.venue.images || [];
		return e.find((e) => e.id === k.activeImageId && e.visible !== !1) || e.find((e) => e.visible !== !1) || null;
	}
	let te = (e) => ({
		x: e.x + e.w / 2,
		y: e.y + e.h / 2
	});
	function ne(e, t) {
		if (e.rotation) {
			let n = te(e);
			t = be(t.x, t.y, n.x, n.y, -e.rotation);
		}
		return t.x >= e.x && t.x <= e.x + e.w && t.y >= e.y && t.y <= e.y + e.h;
	}
	function re(e) {
		if (!e.rotation) return {
			minX: e.x,
			minY: e.y,
			maxX: e.x + e.w,
			maxY: e.y + e.h
		};
		let t = te(e), n = [
			be(e.x, e.y, t.x, t.y, e.rotation),
			be(e.x + e.w, e.y, t.x, t.y, e.rotation),
			be(e.x + e.w, e.y + e.h, t.x, t.y, e.rotation),
			be(e.x, e.y + e.h, t.x, t.y, e.rotation)
		], r = n.map((e) => e.x), i = n.map((e) => e.y);
		return {
			minX: Math.min(...r),
			maxX: Math.max(...r),
			minY: Math.min(...i),
			maxY: Math.max(...i)
		};
	}
	let ie = null;
	function ae() {
		let e = Infinity, t = Infinity, n = -Infinity, r = -Infinity, i = (i, a) => {
			i < e && (e = i), i > n && (n = i), a < t && (t = a), a > r && (r = a);
		};
		for (let e of k.venue.sections) {
			for (let t of e.path ? ct(e.path) : []) i(t.x, t.y);
			for (let t of e.rows) for (let e of t.seats) i(e.x, e.y);
		}
		let a = k.venue.stage;
		return a && (i(a.x, a.y), i(a.x + a.w, a.y + a.h)), e === Infinity ? null : {
			x: e,
			y: t,
			w: n - e,
			h: r - t
		};
	}
	function oe(e) {
		return en(e.cat)?.color || "#9ca3af";
	}
	function se(e) {
		return f(e) ? d() ? e.id === k.editingSectionId : !!e.loose && wn() : !1;
	}
	function ce(e, t) {
		if (k.selection.has(e.id)) return le;
		let n = oe(e);
		return e.status === "available" || se(t) ? n : Oy(n);
	}
	function ue(e, t) {
		let n = Dy(oe(e)) < 150 ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.75)", r = gn(), i = r / 4, a = Math.max(r * .1, .05), { x: o, y: s } = e;
		return e.status === "sold" ? new Pp({
			path: `M${o - i},${s - i}L${o + i},${s + i}M${o - i},${s + i}L${o + i},${s - i}`,
			stroke: n,
			strokeWidth: a
		}) : e.status === "reserved" ? ip.one({
			width: i * 1.6,
			height: i * 1.6,
			fill: n
		}, o - i * .8, s - i * .8) : e.status === "disabled" ? new Pp({
			path: `M${o - i},${s + i}L${o + i},${s - i}`,
			stroke: n,
			strokeWidth: a
		}) : null;
	}
	function fe(e, t) {
		let n = Ve(e, k.venue.categories) || e.color;
		return t ? {
			fill: Ty(n, .15),
			stroke: le,
			strokeWidth: p(2)
		} : {
			fill: Ty(n, .15),
			stroke: Ty(n, .5),
			strokeWidth: 1
		};
	}
	function pe(e) {
		let t = Ge(e);
		return t.visible && !!(t.text || e.name) && !!He(e);
	}
	function me(e, t) {
		let n = Ge(t), r = He(t);
		if (!r) return;
		let i = n.text || t.name, a = n.fontSize > 0 ? n.fontSize : 14, o = ky(i, a);
		e.text = i, e.fontSize = a, e.rotation = n.rotation || 0, e.x = r.cx + (n.dx || 0) - o / 2, e.y = r.cy + (n.dy || 0) - a / 2;
	}
	function he(e) {
		let t = qe(e), n = !!t.text, r = t.logo && t.logo.src ? t.logo : null;
		if (!t.visible || !n && !r || !e.path || e.loose) return null;
		let i = He(e);
		if (!i) return null;
		let a = t.fontSize, o = n ? ky(t.text, a) : 0, s = r ? r.width > 0 ? r.width : 20 : 0, c = r ? s * (r.ratio > 0 ? r.ratio : .6) : 0, l = Math.min(1, Math.max(0, t.opacity ?? .18)), u = new Rf({
			data: {
				watermark: !0,
				opacity: l
			},
			hittable: !1
		}), d = new Rf({
			x: i.cx,
			y: i.cy,
			rotation: t.rotation || 0,
			origin: "center",
			hittable: !1
		}), f = n ? o + a * 1.6 : 0, p = r ? s * 2 : 0, m = Math.max(n ? a * 2.6 : 0, r ? c * 2.2 : 0) * (t.rowGap > 0 ? t.rowGap : 1), h = Math.hypot(i.w, i.h) / 2 + Math.max(f, p), g = Math.ceil(h * 2 / m), _ = n ? Math.ceil(g / (r ? 2 : 1)) * Math.ceil(h * 2 / f) : 0, v = r ? Math.ceil(g / (n ? 2 : 1)) * Math.ceil(h * 2 / p) : 0;
		if (_ + v > 400) {
			let e = Math.sqrt((_ + v) / 400);
			f *= e, p *= e, m *= e;
		}
		let y = ct(e.path), b = (t.rotation || 0) * Math.PI / 180, x = Math.cos(b), S = Math.sin(b), C = i.cx, w = i.cy, ee = (e, t) => Ce(C + e * x - t * S, w + e * S + t * x, y), T = Ey(t.color, l), E = 0;
		for (let e = -h; e <= h + .01; e += m, E++) {
			let i = !!r && (!n || E % 2 == 1), u = i ? p : f, m = E % 2 ? u / 2 : 0;
			for (let n = -h; n <= h + .01; n += u) ee(n + m, e) && (i ? d.add(new Op({
				url: r.src,
				x: n + m - s / 2,
				y: e - c / 2,
				width: s,
				height: c,
				opacity: l,
				hittable: !1
			})) : d.add(new Z({
				text: t.text,
				x: n + m - o / 2,
				y: e - a / 2,
				width: o,
				height: a,
				fontSize: a,
				textAlign: "center",
				verticalAlign: "middle",
				fill: T,
				hittable: !1
			})));
		}
		return u.add(d), u;
	}
	function ge(e) {
		let t = qe(e), r = n.scaleX || 1, i = t.text ? t.fontSize * r : 0, a = t.logo?.src ? t.logo : null, o = a ? (a.width > 0 ? a.width : 20) * (a.ratio > 0 ? a.ratio : .6) * r : 0;
		return Math.max(i, o) >= 6;
	}
	function _e(e) {
		if (!e) return;
		let t = s.get(e.id);
		if (!t) return;
		let n = t.group.children.find((e) => e.data?.watermark);
		if (!n) return;
		let r = t.group.children.indexOf(n);
		n.remove();
		let i = he(e);
		i && (i.visible = ge(e), t.group.addAt(i, r)), t.watermark = i;
	}
	function ve(e, t) {
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
	function ye(e) {
		let t = gn();
		return {
			fs: 11 / 12 * t,
			gap: 5 / 12 * t,
			ss: t
		};
	}
	function Te(e, t, n, r) {
		let i = ve(t, n);
		if (!i) return;
		let { fs: a, gap: o, ss: s } = ye(r), c = ky(t.label, a), l = s / 2 + o + c / 2;
		for (let t of e) {
			let e = t.data.end, n = e === "start" ? i.first : i.last, r = e === "start" ? i.dStart : i.dEnd, o = n.x + r.x * l, s = n.y + r.y * l;
			t.width = c, t.height = a, t.fontSize = a, t.x = o - c / 2, t.y = s - a / 2;
		}
	}
	function De(e, t, n) {
		let r = Re(e);
		if (!e.label || r === "none" || !e.seats.length) return [];
		let i = r === "both" ? ["start", "end"] : [r], a = e.seats.length < 2 && i.length > 1 ? ["start"] : i, { fs: o } = ye(n), s = a.map((t) => {
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
		return Te(s, e, t, n), s;
	}
	let Ae = (e) => ({
		x: e.x,
		y: e.y
	});
	function je(e, t, n) {
		let r = t.x - e.x, i = t.y - e.y, a = Math.hypot(r, i), o = (n || 0) * Math.PI / 180;
		if (a < 1e-6 || Math.abs(o) < 1e-9) return null;
		let s = Math.abs(o) / 2, c = a / (2 * Math.sin(s)), l = n > 0 ? 0 : 1, u = +(Math.abs(n) > 180);
		return `M${e.x.toFixed(1)} ${e.y.toFixed(1)}A${c.toFixed(1)} ${c.toFixed(1)} 0 ${u} ${l} ${t.x.toFixed(1)} ${t.y.toFixed(1)}`;
	}
	function Me(e, t, n) {
		let r = gn(), i = _n() * 2;
		for (let a of e.rows) {
			if (!a.seats.length) continue;
			let o = Oe(a), s = [], c = 0;
			for (let e = 1; e < o.length; e++) Math.hypot(o[e].x - o[e - 1].x, o[e].y - o[e - 1].y) > i && (s.push(o.slice(c, e)), c = e);
			s.push(o.slice(c));
			for (let i of s) {
				let o = i[0], s = i[i.length - 1], c = ce(o, e);
				if (i.length === 1) {
					let e = ip.one({
						width: r,
						height: r,
						fill: c
					}, o.x - r / 2, o.y - r / 2);
					n.set(o.id, e), t.add(e);
				} else if (a.curve) {
					let e = je(o, s, a.curve);
					e && t.add(new Pp({
						path: e,
						stroke: c,
						strokeWidth: r,
						strokeCap: "round",
						strokeJoin: "round",
						opacity: .5
					}));
				} else t.add(new Pp({
					path: `M${o.x.toFixed(1)} ${o.y.toFixed(1)}L${s.x.toFixed(1)} ${s.y.toFixed(1)}`,
					stroke: c,
					strokeWidth: r,
					strokeCap: "round",
					opacity: .5
				}));
				for (let e of i) n.set(e.id, null);
			}
		}
		return !0;
	}
	function Ne(e) {
		let t = s.get(e.id);
		if (t && (t.group.remove(), s.delete(e.id)), !e.visible) return;
		let n = new Rf({ data: { sectionId: e.id } }), r = /* @__PURE__ */ new Map(), a = null;
		e.path && !e.loose && (a = new Pp({
			path: e.path,
			...fe(e, k.sectionSelection.has(e.id))
		}), n.add(a));
		let o = null;
		k.mode === "seats" && (o = he(e), o && (o.visible = ge(e), n.add(o)));
		let c = gn(), l = Infinity, u = Infinity, f = -Infinity, p = -Infinity, m = e.id === k.editingSectionId, h = k.showSeatBars && !e.loose && !m;
		if (!(!k.showSeatBars && !m)) if (h) Me(e, n, r);
		else for (let t of e.rows) for (let i of t.seats) {
			let t = ip.one({
				width: c,
				height: c,
				fill: ce(i, e)
			}, i.x - c / 2, i.y - c / 2);
			r.set(i.id, t), n.add(t);
		}
		for (let t of e.rows) for (let e of t.seats) e.x < l && (l = e.x), e.x > f && (f = e.x), e.y < u && (u = e.y), e.y > p && (p = e.y);
		let g = null, _ = null;
		if (se(e)) {
			g = new Rf({ data: { seatNums: !0 } }), _ = new Rf({ data: { seatStatus: !0 } });
			for (let t of e.rows) for (let n of t.seats) {
				if (n.status !== "available") {
					let t = ue(n, e);
					t && (t.data = { seatIcon: n.id }, _.add(t));
					continue;
				}
				n.n !== "" && n.n != null && g.add(new Z({
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
			n.add(g), n.add(_);
		}
		let v = null;
		!e.loose && pe(e) && (v = Z.one({
			text: "",
			fontSize: 14,
			fontWeight: "bold",
			fill: "rgba(30,41,59,0.4)"
		}, 0, 0), me(v, e), n.add(v));
		let y = /* @__PURE__ */ new Map();
		if (!h && (m || k.showSeatBars)) for (let t of e.rows) {
			let r = De(t, Ae, e);
			if (r.length) {
				y.set(t.id, r);
				for (let e of r) n.add(e);
			}
		}
		n.opacity = d() && e.id !== k.editingSectionId ? .15 : 1, i.add(n), s.set(e.id, {
			group: n,
			dots: r,
			outline: a,
			label: v,
			rowLabels: y,
			nums: g,
			statusIcons: _,
			watermark: o
		});
	}
	function Pe() {
		let e = k.venue.stage;
		if (!e) return;
		let t = new Rf();
		t.add(Hf.one({
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
		}, e.x + e.w / 2 - ky(e.label, n) / 2, e.y + e.h / 2 - n / 2)), i.add(t);
	}
	function Fe() {
		i.clear(), s.clear(), Pe(), k.venue.sections.forEach(Ne);
	}
	let Ie = E(() => k.canvasTick, () => {
		let { full: e, ids: t, viewReset: n } = N.consumeRedraw();
		if (n && ln(), e) Fe();
		else for (let e of t) {
			let t = k.venue.sections.find((t) => t.id === e);
			if (t) Ne(t);
			else {
				let t = s.get(e);
				t && (t.group.remove(), s.delete(e));
			}
		}
		Le(), n && xn.fit();
	});
	function Le() {
		if (a.clear(), d()) Ct.repaint(), Ue();
		else if (_t.dragging() || Qe(), k.tool === "node" ? _t.repaint(null) : ((k.sectionSelection.size || k.tool === "select" || k.tool === "lasso") && _t.repaint(), k.tool === "seat" && wn() && Ct.repaint(), Ue()), k.imageSelected) {
			let e = T();
			if (e) {
				let t = ie || e, n = t.rotation || 0;
				MC(a, {
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
	function ze(e, t, n, r) {
		let i = r / 2, a = new Rf({
			x: e,
			y: t,
			rotation: n
		});
		return a.add(new Hf({
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
	function Be(e, t, n) {
		let { anchor: r, hat: i } = j(e, t);
		return {
			cx: r.x + i.x * b(n),
			cy: r.y + i.y * b(n),
			angle: Math.atan2(t === "end" ? i.y : -i.y, t === "end" ? i.x : -i.x) * 180 / Math.PI
		};
	}
	function Ue() {
		if (!k.selection.size) return;
		let e = d() ? yt() ? nt(k.editingSectionId) : null : k.tool === "select" && wn() ? dn() : null;
		if (!e) return;
		let t = gn() / 2;
		for (let n of bt([...k.selection])) {
			let r = e.rows.find((e) => e.id === n);
			if (!(!r || r.seats.length < 2)) for (let i of ["start", "end"]) {
				let { cx: o, cy: s, angle: c } = Be(r, i, e), l = ze(o, s, c, t);
				l.data = {
					rowHandle: i,
					rowId: n
				}, l.on(Q.BEFORE_DOWN, (e) => e.stop()), l.on(Q.DOWN, (e) => {
					e.stop(), !(e.spaceKey || e.middle) && (At(), M = {
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
	let We = E(() => k.selectionTick, () => {
		for (let e of c) k.selection.has(e) || Ke(e);
		for (let e of k.selection) c.has(e) || Ke(e);
		c = new Set(k.selection);
		let e = dn();
		e && !d() && (wn() && f(e)) !== !!s.get(e.id)?.nums && Ne(e), Le();
	});
	function Ke(e) {
		let t = un(e);
		if (t) for (let { dots: n } of s.values()) {
			let r = n.get(e);
			if (r) {
				r.fill = ce(t.seat, t.section);
				return;
			}
		}
	}
	let Je = null, Ye = E(() => k.modeTick, () => {
		let e = d() ? k.editingSectionId : null;
		for (let t of new Set([
			Je,
			e,
			dn()?.id
		].filter(Boolean))) {
			let e = k.venue.sections.find((e) => e.id === t);
			e && Ne(e);
		}
		for (let [t, { group: n }] of s) n.opacity = d() && t !== e ? .15 : 1;
		Je = e, o.clear(), Le();
	}), Xe = E(() => k.sectionSelectionTick, () => {
		for (let e of l) k.sectionSelection.has(e) || Ze(e);
		for (let e of k.sectionSelection) l.has(e) || Ze(e);
		l = new Set(k.sectionSelection), Le();
	});
	function Ze(e) {
		let t = s.get(e), n = nt(e);
		!t?.outline || !n || Object.assign(t.outline, fe(n, k.sectionSelection.has(e)));
	}
	function Qe() {
		if (k.tool !== "node") return;
		let e = [...k.sectionSelection];
		if (e.length !== 1) return;
		let t = k.venue.sections.find((t) => t.id === e[0]);
		if (!t) return;
		if (t.gen) {
			for (let e of dt(t.gen)) {
				let n = ip.one({
					width: p(12),
					height: p(12),
					fill: "#fff",
					stroke: le,
					strokeWidth: p(2),
					cursor: "pointer"
				}, e.x - p(6), e.y - p(6));
				n.on(Q.BEFORE_DOWN, (e) => e.stop()), n.on(Q.DOWN, (n) => {
					n.stop(), !(n.spaceKey || n.middle) && (M = {
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
			n = _b(t.path);
		} catch {
			return;
		}
		if (n.anchors.length < 2) return;
		let r = (e, t, n, r, i, o, s) => {
			let c = ip.one({
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
		}, i = Ob(n);
		if (i) {
			i.corners.forEach((e, n) => {
				r(e.x, e.y, p(12), "#fff", "rect-corner", n, (e) => {
					M = {
						type: "rect-scale",
						section: t,
						corner: n,
						canon: i,
						origPath: t.path,
						start: x(e)
					};
				});
			}), n.segs.forEach((e, a) => {
				let o = i.segRole[a];
				if (!o) return;
				let s = yb(n, a);
				if (Number.isFinite(s.x + s.y)) if (o.type === "edge") {
					let e = n.anchors[a], c = n.anchors[(a + 1) % n.anchors.length];
					if (Math.hypot(c.x - e.x, c.y - e.y) < p(24)) return;
					r(s.x, s.y, p(8), Ty(le, .45), "rect-edge", a, (e) => {
						M = {
							type: "rect-edge",
							section: t,
							edge: o.edge,
							canon: i,
							origPath: t.path,
							start: x(e)
						};
					});
				} else {
					let e = i.corners[o.corner];
					if (Math.hypot(s.x - e.x, s.y - e.y) < p(18)) return;
					r(s.x, s.y, p(8), Ty("#f59e0b", .75), "rect-radius", a, (e) => {
						M = {
							type: "rect-radius",
							section: t,
							corner: o.corner,
							canon: i,
							origPath: t.path,
							start: x(e)
						};
					});
				}
			});
			return;
		}
		n.anchors.forEach((e, i) => {
			r(e.x, e.y, p(12), "#fff", "vertex", i, (e) => {
				M = {
					type: "node-vertex",
					section: t,
					index: i,
					origPath: t.path,
					model: n,
					start: x(e)
				};
			});
		}), n.segs.forEach((e, i) => {
			let a = yb(n, i);
			Number.isFinite(a.x + a.y) && r(a.x, a.y, p(8), Ty(le, .45), "edge", i, (e) => {
				M = {
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
	function $e(e) {
		let t = Ob(e);
		for (let n of a.children) {
			let r = n.data;
			if (!r?.nodeHandle) continue;
			let i = null;
			i = r.nodeHandle === "vertex" ? e.anchors[r.index] : r.nodeHandle === "rect-corner" ? t?.corners[r.index] : yb(e, r.index), !(!i || !Number.isFinite(i.x + i.y)) && (n.x = i.x - r.size / 2, n.y = i.y - r.size / 2);
		}
	}
	function tt(e, t) {
		let n = e.canon;
		if (e.type === "rect-scale") {
			let r = n.corners[(e.corner + 2) % 4], i = n.corners[e.corner], a = (i.x - r.x) * n.u.x + (i.y - r.y) * n.u.y, o = (i.x - r.x) * n.v.x + (i.y - r.y) * n.v.y, s = (t.x - r.x) * n.u.x + (t.y - r.y) * n.u.y, c = (t.x - r.x) * n.v.x + (t.y - r.y) * n.v.y, l = s / a, u = c / o, d = Math.abs(l) >= Math.abs(u) ? l : u;
			d = Math.max(d, 20 / Math.min(n.w, n.h));
			let f = n.w * d, p = n.h * d;
			return {
				...n,
				cx: r.x + (n.cx - r.x) * d,
				cy: r.y + (n.cy - r.y) * d,
				w: f,
				h: p,
				r: Math.min(n.r * d, kb({
					w: f,
					h: p
				}))
			};
		}
		if (e.type === "rect-edge") {
			let r = e.edge, i = n.corners[(r + 3) % 4], a = n.corners[r], o = Math.hypot(a.x - i.x, a.y - i.y) || 1, s = {
				x: (a.x - i.x) / o,
				y: (a.y - i.y) / o
			}, c = s.y, l = -s.x, u = (i.x + a.x) / 2 - n.cx, d = (i.y + a.y) / 2 - n.cy;
			u * c + d * l < 0 && (c = -c, l = -l);
			let f = (t.x - e.start.x) * c + (t.y - e.start.y) * l, p = Math.abs(s.x * n.u.x + s.y * n.u.y) > .5, m = p ? n.w : Math.max(20, n.w + f), h = p ? Math.max(20, n.h + f) : n.h, g = p ? h - n.h : m - n.w;
			return {
				...n,
				cx: n.cx + c * g / 2,
				cy: n.cy + l * g / 2,
				w: m,
				h,
				r: Math.min(n.r, kb({
					w: m,
					h
				}))
			};
		}
		let r = e.corner, i = n.corners[r], a = n.corners[(r + 3) % 4], o = n.corners[(r + 1) % 4], s = Math.hypot(i.x - a.x, i.y - a.y) || 1, c = Math.hypot(o.x - i.x, o.y - i.y) || 1, l = {
			x: -(i.x - a.x) / s,
			y: -(i.y - a.y) / s
		}, u = {
			x: (o.x - i.x) / c,
			y: (o.y - i.y) / c
		}, d = {
			x: (l.x + u.x) / Math.SQRT2,
			y: (l.y + u.y) / Math.SQRT2
		}, f = (t.x - i.x) * d.x + (t.y - i.y) * d.y;
		return {
			...n,
			r: Math.min(Math.max(0, f / (Math.SQRT2 - 1)), kb(n))
		};
	}
	function nt(e) {
		return k.venue.sections.find((t) => t.id === e);
	}
	function rt(e) {
		let t = k.venue.sections.find((t) => t.id === e);
		return t ? ct(t.path) : [];
	}
	function it(e) {
		let t = Infinity, n = Infinity, r = -Infinity, i = -Infinity, a = !1;
		for (let o of e) {
			let e = rt(o);
			if (!e.length) continue;
			a = !0;
			let s = we(e);
			s.minX < t && (t = s.minX), s.minY < n && (n = s.minY), s.maxX > r && (r = s.maxX), s.maxY > i && (i = s.maxY);
		}
		return a ? {
			minX: t,
			minY: n,
			maxX: r,
			maxY: i
		} : null;
	}
	function at(e) {
		let t = new Set(e), n = [];
		for (let e of k.venue.sections) !e.visible || t.has(e.id) || !e.path || n.push(we(ct(e.path)));
		let r = k.venue.stage;
		return r && n.push({
			minX: r.x,
			minY: r.y,
			maxX: r.x + r.w,
			maxY: r.y + r.h
		}), {
			guides: LC(n),
			bounds: n
		};
	}
	function ot(e, t) {
		let n = dn();
		return n ? Dn(e, t, void 0, n.id) : null;
	}
	function st(e) {
		let t = dn();
		return !!t && t.rows.some((t) => t.id === e);
	}
	function ut(e) {
		for (let { dots: t } of s.values()) {
			let n = t.get(e);
			if (n) return n;
		}
		return null;
	}
	function ft() {
		let e = Infinity, t = Infinity, n = -Infinity, r = -Infinity, i = !1;
		for (let a of k.selection) {
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
	function pt() {
		let e = /* @__PURE__ */ new Map();
		for (let t of k.selection) {
			let n = un(t);
			n && e.set(t, {
				x: n.seat.x,
				y: n.seat.y,
				r: n.seat.r || 0
			});
		}
		return e;
	}
	function mt(e, t) {
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
	let ht = null, gt, _t = WC({
		app: t,
		layerSel: a,
		layerTmp: o,
		toWorld: x,
		px: p,
		viewRect: S,
		color: le,
		pad: 0,
		collapseOnClick: !1,
		enabled: () => !d() && (k.tool === "select" || k.tool === "lasso"),
		lassoEnabled: () => k.tool === "lasso",
		collectPoly: (e) => {
			let t = Fn(e);
			if (t.length) return t;
			let n = dn();
			return n ? Mn(e, n.id) : [];
		},
		hitTest: (e) => {
			let t = In(e.x, e.y);
			if (t) return t.id;
			let n = ot(e.x, e.y);
			return n ? un(n.id)?.row?.id ?? null : null;
		},
		collect: (e) => {
			ht = e;
			let t = Ln(e.minX, e.minY, e.maxX, e.maxY);
			if (t.length) return t;
			let n = dn();
			if (!n) return [];
			let r = _n() / 2, i = On(e.minX - r, e.minY - r, e.maxX + r, e.maxY + r, n.id);
			return bt(i);
		},
		boundsOf: (e) => {
			if (!(e.length && st(e[0]))) return gt === void 0 ? it(e) : (gt ||= it(e), gt);
			let t = ft(), n = dn() ? _n() / 2 : g();
			return t && {
				minX: t.minX - n,
				minY: t.minY - n,
				maxX: t.maxX + n,
				maxY: t.maxY + n
			};
		},
		getSelection: () => (k.tool === "select" || k.tool === "lasso") && wn() ? bt([...k.selection]) : [...k.sectionSelection],
		setSelection: (e) => {
			let t = e.filter((e) => !st(e)), n = e.filter(st);
			if (!e.length || !t.length && !n.length) {
				k.selection.size && N.setSelection(/* @__PURE__ */ new Set()), N.clearSectionSelection();
				return;
			}
			if (!t.length) {
				let e = dn(), t = new Set(n);
				N.setSelection(new Set(e.rows.filter((e) => t.has(e.id)).flatMap((e) => e.seats.map((e) => e.id)))), N.clearSectionSelection(), k.imageSelected && N.setImageSelected(!1);
				return;
			}
			k.selection.size && N.setSelection(/* @__PURE__ */ new Set()), N.setSectionSelection(t);
		},
		snapshot: (e) => e.length && st(e[0]) ? pt() : void 0,
		onDragStart: (e, t) => {
			e === "move" && (u = at(t), gt = null, St(!1));
		},
		onDragEnd: (e) => {
			if (gt = void 0, e === "move" && St(!0), e === "marquee") {
				let e = ht;
				if (ht = null, e && !k.sectionSelection.size && !k.selection.size) {
					let t = T();
					if (t && !t.locked) {
						let n = re(t);
						n.minX <= e.maxX && n.maxX >= e.minX && n.minY <= e.maxY && n.maxY >= e.minY && N.setImageSelected(!0);
					}
				}
			}
		},
		onPreviewMove: (e, t, n, r) => {
			if (e) {
				let t = gn() / 2;
				for (let [i, a] of e) {
					let e = ut(i);
					e && (e.x = a.x + n - t, e.y = a.y + r - t);
				}
				Qt({
					dx: n,
					dy: r
				}), $t(e, dn()?.id);
				return;
			}
			for (let e of t) {
				let t = s.get(e)?.group;
				t && (t.x = n, t.y = r);
			}
		},
		onCommitMove: (e, t, n) => {
			if (e.length && st(e[0])) {
				N.moveSeats([...k.selection], t, n);
				return;
			}
			if (Math.abs(t) < .01 && Math.abs(n) < .01) {
				for (let t of e) {
					let e = s.get(t)?.group;
					e && (e.x = 0, e.y = 0);
				}
				return;
			}
			if (N.moveSections(e, t, n), e.some((e) => {
				let t = nt(e);
				return t && !t.loose && t.id !== k.editingSectionId;
			})) for (let t of e) {
				let e = s.get(t)?.group;
				e && (e.x = 0, e.y = 0);
			}
			else {
				for (let r of e) {
					let e = s.get(r);
					if (e) {
						for (let r of e.dots.values()) r && (r.x += t, r.y += n);
						e.outline && (e.outline.path = nt(r)?.path || ""), e.label && (e.label.x += t, e.label.y += n);
						for (let r of e.rowLabels.values()) for (let e of r) e.x += t, e.y += n;
						_e(nt(r)), e.group.x = 0, e.group.y = 0;
					}
				}
				N.consumeRedraw();
			}
			Le();
		},
		onPreviewRotate: (e, t, r, i) => {
			if (e) {
				let t = gn() / 2;
				for (let [n, a] of e) {
					let e = ut(n);
					if (!e) continue;
					let o = be(a.x, a.y, i.x, i.y, r);
					e.x = o.x - t, e.y = o.y - t;
				}
				Qt({
					deg: r,
					center: i
				}), $t(e, dn()?.id);
				return;
			}
			let a = n.getWorldPointByPage(i);
			for (let e of t) {
				let t = s.get(e)?.group;
				t && (t.rotation = 0, t.x = 0, t.y = 0, t.rotateOfWorld(a, r));
			}
		},
		onCommitRotate: (e, t, n) => {
			if (e.length && st(e[0])) {
				N.rotateSeats([...k.selection], t, n), Le();
				return;
			}
			wt(e, t, n);
		},
		snap: (e, t, n) => u && k.snapEnabled ? UC(e, t, n, u, p(6)) : {
			dx: t,
			dy: n,
			guides: []
		}
	}), vt = !1, yt = () => d() && (k.tool === "select" || k.tool === "lasso" && !vt), bt = (e) => [...new Set(e.map((e) => un(e)?.row?.id).filter(Boolean))], xt = (e) => {
		let t = nt(k.editingSectionId) || dn();
		if (!t) return [];
		let n = new Set(e);
		return t.rows.filter((e) => n.has(e.id)).flatMap((e) => e.seats.map((e) => e.id));
	}, St = (e) => {
		for (let t of new Set([k.editingSectionId, dn()?.id].filter(Boolean))) {
			let n = s.get(t);
			n?.nums && (n.nums.visible = e), n?.statusIcons && (n.statusIcons.visible = e);
		}
	}, Ct = WC({
		app: t,
		layerSel: a,
		layerTmp: o,
		toWorld: x,
		px: p,
		viewRect: S,
		color: le,
		pad: () => nt(k.editingSectionId) || dn() ? _n() / 2 : g(),
		enabled: () => d() && (k.tool === "seat" || k.tool === "select" || k.tool === "lasso") || !d() && k.tool === "seat",
		lassoEnabled: () => k.tool === "lasso",
		collectPoly: (e, t, n) => {
			if (vt = t || !1, !d()) return [];
			if (t) {
				let t = Nn(e, k.editingSectionId);
				if (n && e.length >= 3) {
					let n = Pn(e, k.editingSectionId);
					return [.../* @__PURE__ */ new Set([...t, ...n])];
				}
				return t;
			}
			return Mn(e, k.editingSectionId);
		},
		onDragStart: (e) => {
			e !== "marquee" && St(!1), e === "move" && (u = at([]));
		},
		onDragEnd: (e) => {
			e !== "marquee" && St(!0);
		},
		hitTest: (e) => {
			let t = d() ? Dn(e.x, e.y, void 0, k.editingSectionId) : ot(e.x, e.y);
			return t ? yt() ? un(t.id)?.row?.id ?? null : t.id : null;
		},
		collect: (e) => {
			let t = d() ? k.editingSectionId : dn()?.id;
			if (!t) return [];
			let n = nt(t) ? _n() / 2 : g(), r = On(e.minX - n, e.minY - n, e.maxX + n, e.maxY + n, t);
			return yt() ? bt(r) : r;
		},
		boundsOf: () => ft(),
		getSelection: () => yt() ? bt([...k.selection]) : [...k.selection],
		setSelection: (e) => {
			N.setSelection(new Set(yt() ? xt(e) : e)), !d() && e.length && (N.clearSectionSelection(), k.imageSelected && N.setImageSelected(!1));
		},
		snapshot: () => pt(),
		onPreviewMove: (e, t, n, r) => {
			let i = (nt(k.editingSectionId) || dn() ? gn() : seatSize()) / 2;
			for (let [t, a] of e) {
				let e = ut(t);
				e && (e.x = a.x + n - i, e.y = a.y + r - i);
			}
			Qt({
				dx: n,
				dy: r
			}), $t(e);
		},
		onPreviewRotate: (e, t, n, r) => {
			let i = (nt(k.editingSectionId) || dn() ? gn() : seatSize()) / 2;
			for (let [t, a] of e) {
				let e = ut(t);
				if (!e) continue;
				let o = be(a.x, a.y, r.x, r.y, n);
				e.x = o.x - i, e.y = o.y - i;
			}
			Qt({
				deg: n,
				center: r
			}), $t(e);
		},
		onCommitMove: (e, t, n) => N.moveSeats([...k.selection], t, n),
		onCommitRotate: (e, t, n) => {
			N.rotateSeats([...k.selection], t, n), Le();
		},
		previewBounds: (e, t) => mt(e, t.type === "move" ? (e) => ({
			x: e.x + t.dx,
			y: e.y + t.dy
		}) : (e) => be(e.x, e.y, t.center.x, t.center.y, t.deg)),
		snap: (e, t, n) => u && k.snapEnabled ? UC(e, t, n, u, p(6)) : {
			dx: t,
			dy: n,
			guides: []
		}
	});
	function wt(e, t, n) {
		if (N.rotateSections(e, t, n), e.some((e) => {
			let t = nt(e);
			return t && !t.loose && t.id !== k.editingSectionId;
		})) {
			for (let t of e) {
				let e = s.get(t)?.group;
				e && (e.rotation = 0, e.x = 0, e.y = 0);
			}
			Le();
			return;
		}
		for (let t of e) {
			let e = s.get(t), n = nt(t);
			if (!(!e || !n)) {
				for (let t of n.rows) for (let n of t.seats) {
					let t = e.dots.get(n.id);
					t && (t.x = n.x - gn() / 2, t.y = n.y - gn() / 2);
				}
				e.outline && (e.outline.path = n.path), e.label && me(e.label, n);
				for (let t of n.rows) {
					let r = e.rowLabels.get(t.id);
					r && Te(r, t, Ae, n);
				}
				_e(n), e.group.rotation = 0, e.group.x = 0, e.group.y = 0;
			}
		}
		N.consumeRedraw(), Le();
	}
	function Tt(e, t, n) {
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
		let s = { ...e }, c = Se(e.cx, e.cy, n), l = Math.hypot(n.x - e.cx, n.y - e.cy);
		t.startsWith("outer") ? s.rowCount = Math.min(100, Math.max(1, Math.round((l - o - e.innerR) / i) + 1)) : s.innerR = Math.max(60, l + o), t.endsWith("start") && (s.startDeg = Ee(c, e.startDeg)), t.endsWith("end") && (s.endDeg = Ee(c, e.endDeg));
		let u = s.endDeg - s.startDeg;
		return u < 10 ? t.endsWith("start") ? s.startDeg = s.endDeg - 10 : s.endDeg = s.startDeg + 10 : u > 359 && (t.endsWith("start") ? s.startDeg = s.endDeg - 359 : s.endDeg = s.startDeg + 359), s;
	}
	function Et(e) {
		o.clear(), o.add(new Pp({
			path: lt(e),
			fill: "rgba(56,189,248,0.08)",
			stroke: le,
			strokeWidth: p(2),
			dashPattern: [p(10), p(6)]
		}));
	}
	let Dt = [], Ot = null, kt = [];
	function At() {
		o.clear(), Dt = [], Ot = null, Nt = null, Lt = null, Ht = null, Rt = [];
		for (let e of kt) e.visible = !0;
		kt = [];
	}
	function jt(e) {
		for (; Dt.length < e.length;) {
			let e = ip.one({
				width: v(),
				height: v(),
				fill: "rgba(56,189,248,0.6)"
			}, 0, 0);
			Dt.push(e), o.add(e);
		}
		for (; Dt.length > e.length;) Dt.pop().remove();
		for (let t = 0; t < e.length; t++) {
			let n = Dt[t], r = e[t].x - v() / 2, i = e[t].y - v() / 2;
			(n.x !== r || n.y !== i) && (n.x = r, n.y = i);
		}
	}
	function Mt(e, t) {
		if (!e) {
			Ot &&= (Ot.remove(), null);
			return;
		}
		Ot || (Ot = new Z({
			fill: le,
			fontSize: p(13),
			fontWeight: "bold"
		}), o.add(Ot)), Ot.text !== e && (Ot.text = e), Ot.x = t.x + p(14), Ot.y = t.y + p(16);
	}
	let O = null, Nt = null, Pt = {
		x: 0,
		y: 0
	};
	document.addEventListener("mousemove", (t) => {
		let n = e.getBoundingClientRect();
		Pt.x = t.clientX - n.left, Pt.y = t.clientY - n.top;
	});
	function Ft() {
		return k.tool === "row" || k.tool === "grid";
	}
	function It(e) {
		let t = y();
		Nt || (Nt = ip.one({
			width: t,
			height: t,
			fill: "rgba(56,189,248,0.35)",
			stroke: le
		}, 0, 0), o.add(Nt)), Nt.width = t, Nt.height = t, Nt.x = e.x - t / 2, Nt.y = e.y - t / 2, Nt.strokeWidth = p(1.5);
	}
	let Lt = null, Rt = [];
	function zt(e, t) {
		let n = [];
		for (let r of k.venue.sections) if (r.visible) for (let i of r.rows) {
			if (!i.seats.length) continue;
			let r = [];
			for (let n = 0; n < i.seats.length; n++) {
				let a = i.seats[n];
				Math.abs(a.x - e.x) <= t && Math.abs(a.y - e.y) <= t && r.push({
					x: a.x,
					y: a.y,
					idx: n
				});
			}
			if (!r.length) continue;
			let a = i.seats[0], o = i.seats[i.seats.length - 1], s = o.x - a.x, c = o.y - a.y, l = Math.hypot(s, c);
			l < 1e-6 ? (s = 1, c = 0) : (s /= l, c /= l), n.push({
				dir: {
					x: s,
					y: c
				},
				first: a,
				last: o,
				rowLen: i.seats.length,
				seats: r
			});
		}
		return n;
	}
	function Bt(e, t) {
		if (!k.snapEnabled || t?.altKey) return null;
		let n = _(), r = h(), i = p(8), a = zt(e, r + n + i);
		return a.length ? BC(e, a, n, r, i) : null;
	}
	function Vt(e) {
		for (let e of Rt) e.remove();
		if (Rt = [], !e) return;
		let t = (e, t) => {
			let n = new Pp({
				path: `M${e.x.toFixed(2)} ${e.y.toFixed(2)}L${t.x.toFixed(2)} ${t.y.toFixed(2)}`,
				stroke: "#ef4444",
				strokeWidth: p(1)
			});
			o.add(n), Rt.push(n);
		}, n = e.dirU, r = e.dirV;
		t({
			x: e.first.x - n.x * e.pitch,
			y: e.first.y - n.y * e.pitch
		}, {
			x: e.last.x + n.x * e.pitch,
			y: e.last.y + n.y * e.pitch
		}), t({
			x: e.x - r.x * e.rowPitch * 1.5,
			y: e.y - r.y * e.rowPitch * 1.5
		}, {
			x: e.x + r.x * e.rowPitch * 1.5,
			y: e.y + r.y * e.rowPitch * 1.5
		});
	}
	let Ht = null;
	function Ut(e, t) {
		return !O?.snap || !k.snapEnabled || t?.altKey ? null : VC(e, O.start, O.snap.u, O.snap.v, p(8));
	}
	function Wt(e) {
		for (let e of Rt) e.remove();
		if (Rt = [], !e || !O) return;
		let t = e.axis, n = O.start, r = _(), i = new Pp({
			path: `M${(n.x - t.x * r).toFixed(2)} ${(n.y - t.y * r).toFixed(2)}L${(e.x + t.x * r).toFixed(2)} ${(e.y + t.y * r).toFixed(2)}`,
			stroke: "#ef4444",
			strokeWidth: p(1)
		});
		o.add(i), Rt.push(i);
	}
	function Gt() {
		Nt &&= (Nt.remove(), null), Lt = null, Ht = null, Vt(null);
	}
	function Kt() {
		return d() ? k.venue.sections.find((e) => e.id === k.editingSectionId) || null : dn();
	}
	function qt(e, t, n, r) {
		let i = et(e, t, n, r, _()), a = Math.min(D.limits.rowSeats, bn(Kt()));
		return {
			seats: i.slice(0, a),
			capped: i.length > a
		};
	}
	function Jt(e, t) {
		let { seats: n, capped: r } = qt(e.x, e.y, t.x, t.y);
		jt(n);
		let i = n[n.length - 1] || e;
		Mt(`${n.length} 座${r ? " · 已达上限" : ""}`, {
			x: (e.x + i.x) / 2,
			y: (e.y + i.y) / 2
		});
	}
	function Yt(e, t, n) {
		let r = h(), i = [], a = bn(Kt());
		for (let o = 0; o < t && !(a <= 0); o++) {
			let t = -e.first.dir.y * n * o * r, s = e.first.dir.x * n * o * r, { seats: c } = qt(e.start.x + t, e.start.y + s, e.start.x + t + e.first.dir.x * e.first.len, e.start.y + s + e.first.dir.y * e.first.len), l = c.slice(0, a);
			if (!l.length) break;
			i.push(l), a -= l.length;
		}
		return i;
	}
	function A(e, t) {
		if (!e.first) {
			Jt(e.start, t);
			return;
		}
		let n = t.x - e.start.x, r = t.y - e.start.y, i = n * -e.first.dir.y + r * e.first.dir.x, a = Math.min(200, 1 + Math.floor(Math.abs(i) / h())), o = Yt(e, a, i < 0 ? -1 : 1), s = [];
		for (let e of o) for (let t of e) s.push(t);
		jt(s);
		let c = o[0]?.length || 0, l = et(e.start.x, e.start.y, e.start.x + e.first.dir.x * e.first.len, e.start.y + e.first.dir.y * e.first.len, _()).length, u = o.length < a || c < l;
		Mt((o.length > 1 ? `${o.length}×${c} = ${s.length}座` : `${c} 座`) + (u ? " · 已达上限" : ""), t);
	}
	function Xt(e) {
		if (!Ft()) return !1;
		if (vn(), !O) {
			let t = Lt || e, n = Lt ? {
				u: Lt.dirU,
				v: Lt.dirV
			} : null;
			return At(), O = {
				type: k.tool === "grid" ? "rows" : "row",
				start: {
					x: t.x,
					y: t.y
				},
				first: null,
				snap: n
			}, It(O.start, null), !0;
		}
		if (O.type === "row") {
			let t = O.start, n = Ht || e, { seats: r } = qt(t.x, t.y, n.x, n.y);
			return At(), O = null, Math.hypot(n.x - t.x, n.y - t.y) > 4 && (r.length ? d() ? N.addRowsToSection(k.editingSectionId, [r]) : N.addRowToActive(r) : Cn(`已达数量上限（单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未添加座位`)), !0;
		}
		if (!O.first) {
			let t = Ht || e, n = t.x - O.start.x, r = t.y - O.start.y, i = Math.hypot(n, r);
			return i <= 4 ? (At(), O = null, !0) : (O.first = {
				dir: {
					x: n / i,
					y: r / i
				},
				len: i
			}, It(t, null), !0);
		}
		let t = Ht || e, n = t.x - O.start.x, r = t.y - O.start.y, i = n * -O.first.dir.y + r * O.first.dir.x, a = Math.min(200, 1 + Math.floor(Math.abs(i) / h())), o = Yt(O, a, i < 0 ? -1 : 1);
		return At(), O = null, o.length ? d() ? N.addRowsToSection(k.editingSectionId, o) : N.addRowsByDrop(o) : Cn(`已达数量上限（单分区 ${D.limits.sectionSeats.toLocaleString()} / 全场馆 ${D.limits.venueSeats.toLocaleString()}），未添加座位`), !0;
	}
	function j(e, t) {
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
	function Zt(e, t, n, r) {
		if (At(), n > 0) {
			let r = [];
			for (let i of e) {
				let { anchor: e, step: a } = j(i, t);
				for (let t = 1; t <= n && r.length < 400; t++) r.push({
					x: e.x + a.x * t,
					y: e.y + a.y * t
				});
			}
			jt(r);
		} else if (n < 0) {
			let r = s.get(k.editingSectionId || dn()?.id), i = /* @__PURE__ */ new Set();
			for (let a of e) {
				let e = t === "end" ? a.seats.slice(n) : a.seats.slice(0, -n);
				for (let t of e) {
					i.add(t.id);
					let e = r?.dots.get(t.id);
					e && (e.visible = !1, kt.push(e));
				}
			}
			for (let e of [r?.nums, r?.statusIcons]) if (e) for (let t of e.children) {
				let e = t.data?.seatNum ?? t.data?.seatIcon;
				e && i.has(e) && (t.visible = !1, kt.push(t));
			}
		}
		tn(e, t, n), e.length && Mt(`${Math.max(1, e[0].seats.length + n)} 座`, r);
	}
	function Qt(e) {
		let t = nt(k.editingSectionId) || dn();
		if (!t) return;
		let n = new Map(t.rows.map((e) => [e.id, e]));
		for (let r of a.children) {
			let i = r.data?.rowHandle;
			if (!i) continue;
			let a = n.get(r.data.rowId);
			if (!a || a.seats.length < 2) continue;
			let { cx: o, cy: s, angle: c } = Be(a, i, t);
			e.dx == null ? ({x: o, y: s} = be(o, s, e.center.x, e.center.y, e.deg), c += e.deg) : (o += e.dx, s += e.dy), r.x = o, r.y = s, r.rotation = c;
		}
	}
	function $t(e, t = k.editingSectionId) {
		let n = s.get(t), r = nt(t);
		if (!n || !r || !n.rowLabels.size) return;
		let i = new Map(r.rows.map((e) => [e.id, e])), a = (e) => {
			let t = n.dots.get(e.id);
			return t ? {
				x: t.x + gn() / 2,
				y: t.y + gn() / 2
			} : Ae(e);
		};
		for (let t of bt([...e.keys()])) {
			let e = n.rowLabels.get(t), o = i.get(t);
			e && o && Te(e, o, a, r);
		}
	}
	function tn(e, t, n) {
		if (!e.length) return;
		let r = nt(k.editingSectionId) || dn(), i = new Map(e.map((e) => [e.id, e]));
		for (let e of a.children) {
			let a = e.data?.rowHandle;
			if (!a || a !== t) continue;
			let o = i.get(e.data.rowId);
			if (!o || o.seats.length < 2) continue;
			let { anchor: s, step: c, hat: l } = j(o, t);
			e.x = s.x + c.x * n + l.x * b(r), e.y = s.y + c.y * n + l.y * b(r);
		}
	}
	function nn(e, t) {
		o.clear();
		let n = Math.hypot(t.x - e.x, t.y - e.y);
		o.add(ip.one({
			width: n * 2,
			height: n * 2,
			stroke: "#3b82f6",
			strokeWidth: p(1.5),
			dashPattern: [p(10), p(8)]
		}, e.x - n, e.y - n)), o.add(ip.one({
			width: p(8),
			height: p(8),
			fill: "#3b82f6"
		}, e.x - p(4), e.y - p(4)));
	}
	function rn(e, t) {
		let n = null, r = t;
		for (let t of k.venue.sections) {
			let i = _b(t.path);
			for (let t of i.anchors) {
				let i = Math.hypot(e.x - t.x, e.y - t.y);
				i < r && (r = i, n = t);
			}
		}
		return n || e;
	}
	function an(e, t) {
		return k.snapEnabled && !t?.altKey ? rn(e, p(6)) : e;
	}
	function on(e, t, n) {
		if (!n?.shiftKey || !e.length) return t;
		let r = e[e.length - 1], i = zC(t.x - r.x, t.y - r.y);
		return {
			x: r.x + i.dx,
			y: r.y + i.dy
		};
	}
	function sn(e, t, n) {
		if (o.clear(), !e.length) return;
		let r = (e, t) => `${e.x.toFixed(2)} ${e.y.toFixed(2)}L${t.x.toFixed(2)} ${t.y.toFixed(2)}`, i = `M${e.map((e) => `${e.x.toFixed(2)} ${e.y.toFixed(2)}`).join("L")}`;
		if (t && (i += `L${t.x.toFixed(2)} ${t.y.toFixed(2)}`), o.add(new Pp({
			path: i,
			stroke: "#3b82f6",
			strokeWidth: p(2)
		})), e.length >= 3 && t && o.add(new Pp({
			path: `M${r(t, e[0])}`,
			stroke: "#3b82f6",
			strokeWidth: p(1),
			dashPattern: [p(6), p(4)]
		})), e.forEach((t, n) => {
			let r = n === 0 && e.length >= 3 ? p(6) : p(4);
			o.add(ip.one({
				width: r * 2,
				height: r * 2,
				fill: "#3b82f6"
			}, t.x - r, t.y - r));
		}), n && t) {
			let e = p(8);
			o.add(ip.one({
				width: e * 2,
				height: e * 2,
				fill: "rgba(251,146,60,0.2)",
				stroke: "#f97316",
				strokeWidth: p(2)
			}, n.x - e, n.y - e));
		}
	}
	function cn() {
		let e = M.pts;
		o.clear(), M = null, e.length >= 3 && N.addPolySection(e);
	}
	let M = null;
	function ln() {
		if (O = null, M && (M.type === "node-vertex" || M.type === "node-edge" || M.type === "rect-scale" || M.type === "rect-edge" || M.type === "rect-radius")) {
			let e = s.get(M.section.id);
			e?.outline && (e.outline.path = M.origPath);
		}
		M && (M.type === "image-move" || M.type === "image-rotate") && (ie = null, w()), M = null;
	}
	t.on(Q.DOWN, (e) => {
		if (e.spaceKey || e.middle) return;
		let t = x(e), n = k.tool;
		if (n === "pan") {
			M = {
				type: "pan",
				lx: e.x,
				ly: e.y
			};
			return;
		}
		if (n !== "image" && !Xt(t) && !d()) {
			if (n === "select" && k.imageSelected) {
				let e = T();
				if (e && !e.locked) {
					let n = te(e), r = e.rotation || 0, i = {
						x: n.x,
						y: e.y - p(36)
					};
					if (r && (i = be(i.x, i.y, n.x, n.y, r)), Math.hypot(t.x - i.x, t.y - i.y) <= p(12)) {
						_t.cancel(), M = {
							type: "image-rotate",
							id: e.id,
							center: n,
							startAngle: Se(n.x, n.y, t),
							orig: r,
							delta: 0
						};
						return;
					}
					if (!In(t.x, t.y) && ne(e, t)) {
						_t.cancel(), M = {
							type: "image-move",
							id: e.id,
							start: t,
							orig: {
								x: e.x,
								y: e.y
							},
							aabb: re(e),
							guides: at([])
						};
						return;
					}
				}
			}
			if (n === "node") {
				let e = In(t.x, t.y);
				e && k.selection.size && N.clearSelection(), N.setSectionSelection(e ? [e.id] : []);
				return;
			}
			if (n === "rect") {
				M = {
					type: "rect",
					start: t
				}, o.clear();
				return;
			}
			if (n === "arc") {
				M = {
					type: "arc",
					start: t
				}, o.clear();
				return;
			}
			if (n === "poly") {
				(!M || M.type !== "poly") && (M = {
					type: "poly",
					pts: []
				});
				let n = M.pts[0];
				if (M.pts.length >= 3 && Math.hypot(t.x - n.x, t.y - n.y) <= p(10)) {
					cn();
					return;
				}
				let r = M.pts[M.pts.length - 1], i = on(M.pts, t, e), a = an(i, e);
				(!r || Math.hypot(a.x - r.x, a.y - r.y) > p(4)) && M.pts.push(a), sn(M.pts, a, a !== i);
				return;
			}
		}
	}), t.on(Q.MOVE, (e) => {
		let t = x(e);
		if (N.updatePointerPos(t), Ft() && !M) {
			if (Lt = O ? null : Bt(t, e), Ht = O ? Ut(t, e) : null, It((O ? Ht : Lt) || t), O ? Wt(Ht) : Vt(Lt), O) {
				let e = Ht || t;
				O.type === "row" ? Jt(O.start, e) : A(O, e);
			}
		} else Gt();
		if (M) {
			if (M.type === "pan") {
				(n.zoomLayer || n).move(e.x - M.lx, e.y - M.ly), M.lx = e.x, M.ly = e.y;
				return;
			}
			if (M.type === "image-move") {
				let n = N.imageById(M.id), r = C.get(M.id);
				if (n && r) {
					let i = t.x - M.start.x, a = t.y - M.start.y;
					e.shiftKey && ({dx: i, dy: a} = zC(i, a));
					let s = null;
					k.snapEnabled && !e.altKey && M.guides && ({dx: i, dy: a, guides: s} = UC(M.aabb, i, a, M.guides, p(6))), M.dx = i, M.dy = a, r.x = M.orig.x + i, r.y = M.orig.y + a, ie = {
						x: r.x,
						y: r.y,
						w: n.w,
						h: n.h,
						rotation: n.rotation || 0
					}, o.clear();
					let c = S();
					if (IC(o, {
						minX: r.x,
						minY: r.y,
						maxX: r.x + n.w,
						maxY: r.y + n.h
					}, c, p), s?.length) {
						for (let e of s) e.dist || (e.axis === "x" ? (e.from = c.minY, e.to = c.maxY) : (e.from = c.minX, e.to = c.maxX));
						FC(o, s, p);
					}
					Le();
				}
				return;
			}
			if (M.type === "image-rotate") {
				let n = N.imageById(M.id), r = C.get(M.id);
				if (n && r) {
					let i = Se(M.center.x, M.center.y, t) - M.startAngle;
					e.shiftKey && (i = Math.round(i / 15) * 15), M.delta = i, r.rotation = M.orig + i, ie = {
						x: n.x,
						y: n.y,
						w: n.w,
						h: n.h,
						rotation: r.rotation
					}, Le();
				}
				return;
			}
			if (M.type === "handle") {
				let e = Tt(M.section.gen, M.role, t);
				e && (M.gen = e, Et(e));
				return;
			}
			if (M.type === "rect-scale" || M.type === "rect-edge" || M.type === "rect-radius") {
				let e = Ab(tt(M, t)), n = vb(e);
				if (n !== M.previewPath) {
					M.previewPath = n;
					let e = s.get(M.section.id);
					e?.outline && (e.outline.path = n);
				}
				$e(e);
				return;
			}
			if (M.type === "node-vertex" || M.type === "node-edge") {
				let e = M.type === "node-vertex" ? bb(M.model, M.index, t) : xb(M.model, M.index, t, p(3)), n = vb(e);
				if (n !== M.previewPath) {
					M.previewPath = n;
					let e = s.get(M.section.id);
					e?.outline && (e.outline.path = n);
				}
				$e(e);
				return;
			}
			if (M.type === "row-resize") {
				let e = nt(k.editingSectionId) || dn(), n = e?.rows.find((e) => e.id === M.rowId);
				if (!n || n.seats.length < 2) return;
				let r = bt([...k.selection]).map((t) => e.rows.find((e) => e.id === t)).filter((e) => e && e.seats.length >= 2), { step: i, hat: a } = j(n, M.end), o = Math.hypot(i.x, i.y), s = (t.x - M.start.x) * a.x + (t.y - M.start.y) * a.y, c = Math.round(s / o), l = Math.min(...r.map((e) => e.seats.length));
				c = Math.max(1 - l, c), c !== M.delta && (M.delta = c, Zt(r, M.end, c, t));
				return;
			}
			if (M.type === "poly") {
				let n = on(M.pts, t, e), r = an(n, e);
				sn(M.pts, r, r !== n);
				return;
			}
			if (M.type === "rect") {
				o.clear();
				let e = xe(M.start, t);
				o.add(Hf.one({
					fill: "rgba(59,130,246,0.12)",
					stroke: "#3b82f6",
					strokeWidth: p(1.5),
					dashPattern: [p(8), p(6)]
				}, e.minX, e.minY, e.maxX - e.minX, e.maxY - e.minY));
			} else M.type === "arc" && nn(M.start, t);
		}
	}), t.on(Q.UP, (e) => {
		if (!M || M.type === "poly") return;
		let t = x(e);
		if (M.type === "image-move") {
			let e = M.dx ?? t.x - M.start.x, n = M.dy ?? t.y - M.start.y;
			ie = null, o.clear(), Math.hypot(e, n) > .5 ? N.moveVenueImage(M.id, e, n) : (w(), Le()), M = null;
			return;
		}
		if (M.type === "image-rotate") {
			ie = null, Math.abs(M.delta || 0) > .5 ? N.rotateVenueImage(M.id, M.delta) : (w(), Le()), M = null;
			return;
		}
		if (M.type === "handle") o.clear(), M.gen && N.reshapeSection(M.section.id, M.gen), Le();
		else if (M.type === "node-vertex" || M.type === "node-edge" || M.type === "rect-scale" || M.type === "rect-edge" || M.type === "rect-radius") {
			let e = Math.hypot(t.x - M.start.x, t.y - M.start.y);
			if (M.previewPath && M.previewPath !== M.origPath && e > .5) N.updateSectionPath(M.section.id, M.previewPath);
			else {
				let e = s.get(M.section.id);
				e?.outline && (e.outline.path = M.origPath), Le();
			}
		} else if (M.type === "row-resize") At(), M.delta && N.resizeRows(bt([...k.selection]), M.end, M.delta), Le();
		else if (M.type === "rect") {
			o.clear();
			let e = xe(M.start, t);
			e.maxX - e.minX >= 20 && e.maxY - e.minY >= 20 && N.addRectSection(e.minX, e.minY, e.maxX - e.minX, e.maxY - e.minY);
		} else if (M.type === "arc") {
			o.clear();
			let e = Math.hypot(t.x - M.start.x, t.y - M.start.y);
			e >= 80 && N.addArcSection(M.start, e, t);
		}
		M = null;
	}), t.on(Q.DOUBLE_TAP, (e) => {
		if (e.spaceKey) return;
		if (M?.type === "poly") {
			cn();
			return;
		}
		let t = x(e);
		if (d()) {
			if (Ft()) return;
			Dn(t.x, t.y, void 0, k.editingSectionId) || (N.exitSection(), xn.fit());
		} else {
			if (Ft()) return;
			let e = In(t.x, t.y);
			if (e && k.sectionSelection.size <= 1) {
				N.enterSection(e.id), xn.fitSection(e.id);
				return;
			}
			let n = dn();
			n && ot(t.x, t.y) && (N.enterSection(n.id), xn.fitSection(n.id));
		}
	}), t.on(Q.TAP, (e) => {
		if (d() || k.tool !== "select" || e.spaceKey || e.middle) return;
		let t = x(e);
		if (In(t.x, t.y) || ot(t.x, t.y)) {
			k.imageSelected && N.setImageSelected(!1);
			return;
		}
		let n = T();
		n && !n.locked && ne(n, t) ? N.setImageSelected(!0) : k.imageSelected && N.setImageSelected(!1);
	});
	let pn = () => {
		if (k.zoom = Math.round(n.scaleX * 100) / 100, Nt) {
			let e = y();
			Nt.width = e, Nt.height = e, Nt.strokeWidth = p(1.5);
			let t = n.getPagePoint({
				x: Pt.x,
				y: Pt.y
			});
			Nt.x = t.x - e / 2, Nt.y = t.y - e / 2;
		}
		for (let e of l) Ze(e);
		for (let e of new Set([k.editingSectionId, dn()?.id].filter(Boolean))) {
			let t = nt(e);
			t && !!s.get(e)?.nums !== se(t) && Ne(t);
		}
		for (let [e, t] of s) {
			if (!t.watermark) continue;
			let n = nt(e);
			n && (t.watermark.visible = ge(n));
		}
		Le();
	};
	n.on(sm.ZOOM, pn), n.on(rm.MOVE, pn);
	let yn = E(() => [k.tool, k.mode], () => {
		e.style.cursor = k.tool === "pan" ? "grab" : [
			"select",
			"seat",
			"node",
			"image"
		].includes(k.tool) ? "default" : "crosshair", yt() && k.selection.size && N.setSelection(new Set(xt(bt([...k.selection])))), ln(), Le();
	}, { immediate: !0 }), xn = {
		center() {
			let t = n.zoomLayer.boxBounds;
			if (!t.width || !t.height) return;
			let r = n.scaleX;
			n.x = e.clientWidth / 2 - (t.x + t.width / 2) * r, n.y = e.clientHeight / 2 - (t.y + t.height / 2) * r, pn();
		},
		fit() {
			let e = n.zoomLayer.boxBounds;
			!e.width && !e.height ? n.zoom(1) : n.zoom("fit", 80), pn();
		},
		fitSection(e) {
			let t = rt(e);
			if (t.length) {
				let e = t.map((e) => e.x), r = t.map((e) => e.y), i = Math.min(...e), a = Math.min(...r);
				n.zoom({
					x: i,
					y: a,
					width: Math.max(...e) - i,
					height: Math.max(...r) - a
				}, 80);
			}
			pn();
		},
		zoomIn() {
			n.zoom(n.scaleX * (1 + D.zoom.step)), pn();
		},
		zoomOut() {
			n.zoom(n.scaleX / (1 + D.zoom.step)), pn();
		},
		zoom100() {
			n.zoom(1), pn();
		},
		panBy(e, t) {
			n.x += e, n.y += t, pn();
		},
		syncZoomConfig() {
			t.config.zoom && (t.config.zoom.min = D.zoom.min, t.config.zoom.max = D.zoom.max);
		},
		setCanvasFill(e) {
			t.tree.fill = e;
		},
		viewCenter: () => n.getPagePoint({
			x: e.clientWidth / 2,
			y: e.clientHeight / 2
		}),
		viewSize: () => ({
			w: e.clientWidth / n.scaleX,
			h: e.clientHeight / n.scaleX
		}),
		venueBounds: ae,
		toClient: (e) => n.getWorldPointByPage(e),
		cursorDotPos: () => Nt ? {
			x: Nt.x + Nt.width / 2,
			y: Nt.y + Nt.height / 2
		} : null,
		cancelDrag() {
			let e = !!O;
			return ln(), _t.cancel(), Ct.cancel(), At(), Le(), e;
		},
		undoPolyPoint() {
			return M?.type !== "poly" || !M.pts.length ? !1 : (M.pts.pop(), M.pts.length ? sn(M.pts, null) : (M = null, o.clear()), !0);
		},
		controllers: {
			sectionsCtl: _t,
			seatsCtl: Ct
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
			Ie(), We(), Ye(), Xe(), yn(), ee(), _t.destroy(), Ct.destroy(), t.destroy();
		}
	};
	return N.registerEditor(xn), Fe(), pn(), xn;
}
//#endregion
//#region src/designer/SeatMapDesigner.vue
var JC = { class: "seatmap-designer" }, YC = {
	key: 0,
	class: "saving-mask",
	"data-key": "saving-mask"
}, XC = {
	key: 1,
	class: "saving-mask",
	"data-key": "loading-mask"
}, ZC = {
	key: 2,
	class: "seats-loading-badge",
	"data-key": "seats-loading"
}, QC = {
	key: 3,
	class: "init-error",
	"data-key": "init-error"
}, $C = {
	key: 4,
	class: "breadcrumb"
}, ew = {
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
		},
		theme: {
			type: String,
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
			mt(k.tool) || N.setTool(mt("select") ? "select" : D.tools?.[0] ?? "select");
		}
		f();
		let p = x(null), m = x(null), v = null, b = null, S = null, ee = n(() => {
			k.sectionsTick;
			let e = k.venue.sections.find((e) => e.id === k.editingSectionId);
			return e ? Ue(e) : "";
		}), T = n(() => ({
			gridTemplateRows: `${D.ui.topBar ? "46px" : "0"} 1fr ${D.ui.statusBar ? "28px" : "0"}`,
			gridTemplateColumns: `${D.ui.toolBar ? "52px" : "0"} 1fr ${D.ui.sidePanel ? "300px" : "0"}`,
			"--side-w": D.ui.sidePanel ? "300px" : "0px"
		}));
		E(() => k.imagePickTick, () => m.value?.click());
		function te(e) {
			let t = e.target.files?.[0];
			e.target.value = "", t && O(t).then((e) => N.replaceVenueImage(e)).catch((e) => alert(e.message));
		}
		E(() => k.canvasTick + k.sectionsTick + k.imageTick, () => d("change")), E(() => k.dirty, (e) => d("dirty", e));
		let ne = x("");
		_(async () => {
			try {
				v = qC(p.value);
			} catch (e) {
				console.error("[seatmap] 画布初始化失败", e), ne.value = String(e?.message || e), d("error", e);
			}
			b = N.on("save", (e) => d("save", e)), S = N.on("venue", (e) => d("venue", e)), setTimeout(() => {
				v?.fit(), d("ready");
			}, 100), document.addEventListener("keydown", re, !0), E(() => k.theme, (e) => {
				let t = document.querySelector(".seatmap-designer");
				t && t.setAttribute("data-theme", e), v && v.setCanvasFill(e === "dark" ? "#1e2128" : "#ffffff");
			}, { immediate: !0 }), window.__seatmap = {
				store: k,
				actions: N,
				editor: v,
				pointsFromPath: ct,
				findSectionAt: In,
				config: D,
				applyOptions: pt
			};
		}), g(() => {
			document.removeEventListener("keydown", re, !0), b?.(), S?.(), v?.destroy();
		});
		function re(e) {
			if (e.target.matches("input, textarea, select")) return;
			let t = e.key.toLowerCase(), n = e.ctrlKey || e.metaKey;
			if (n && t === "s") {
				e.preventDefault(), k.readonly || N.uiSave();
				return;
			}
			if (!(k.saving || k.loadPhase)) {
				if (n && t === "z" && !e.shiftKey) e.preventDefault(), v?.undoPolyPoint() || N.undo();
				else if (n && (t === "y" || t === "z" && e.shiftKey)) e.preventDefault(), N.redo();
				else if (n && t === "a") e.preventDefault(), N.selectAll();
				else if (n && t === "c") e.preventDefault(), N.copySelection();
				else if (n && t === "v") e.preventDefault(), N.pasteClipboardAt();
				else if (n && t === "d") e.preventDefault(), N.duplicateSelection();
				else if (t === "delete" || t === "backspace") {
					if (e.preventDefault(), v?.undoPolyPoint()) return;
					if (k.mode === "seats") N.removeSelectedSeats();
					else if (k.selection.size && wn()) N.removeSelectedSeats();
					else if (k.sectionSelection.size && confirm(`删除选中的 ${k.sectionSelection.size} 个分区？（可撤销）`)) N.removeSections([...k.sectionSelection]);
					else if (k.imageSelected && !k.sectionSelection.size) {
						let e = k.venue.images?.[0];
						e && confirm("删除选中的底图？（可撤销）") && N.removeVenueImage(e.id);
					}
				} else if (t === "escape") {
					if (k.catModalOpen) {
						N.closeCategoryModal();
						return;
					}
					if (k.labelModalOpen) {
						N.closeLabelModal();
						return;
					}
					if (v?.cancelDrag()) return;
					k.mode === "seats" ? (N.exitSection(), v?.fit()) : (N.clearSelection(), N.clearSectionSelection(), N.setImageSelected(!1), N.setTool("select"));
				} else if (!n && !e.altKey) {
					let e = ab.find((e) => e.kbd && !e.hidden && mt(e.key) && e.kbd.toLowerCase() === t);
					if (!e || k.mode === "seats" && ![
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
			setTheme: (e) => N.setTheme(e),
			getSavePayload: () => N.getSavePayload(),
			exportJSON: () => N.exportVenue(),
			importJSON: (e) => N.importVenue(typeof e == "string" ? JSON.parse(e) : e),
			fit: () => N.fit(),
			newVenue: (e) => N.newVenue(e),
			setLoadPhase: (e) => N.setLoadPhase(e),
			getState: () => ({
				venueId: k.venue.backendId,
				name: k.venue.name,
				sections: k.venue.sections.length,
				seats: k.venue.sections.reduce((e, t) => e + N.seatCountOf(t), 0),
				saving: k.saving,
				dirty: k.dirty
			})
		}), (e, t) => (y(), o("div", JC, [s("div", {
			class: "app-shell",
			style: h(T.value)
		}, [
			w(D).ui.topBar ? (y(), i(ib, { key: 0 })) : a("", !0),
			w(D).ui.toolBar ? (y(), i(ub, { key: 1 })) : a("", !0),
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
				w(k).saving ? (y(), o("div", YC, [...t[1] ||= [s("span", { class: "saving-spinner" }, null, -1), l("保存中…", -1)]])) : w(k).loadPhase === "venue" ? (y(), o("div", XC, [...t[2] ||= [s("span", { class: "saving-spinner" }, null, -1), l("场馆加载中…", -1)]])) : a("", !0),
				w(k).loadPhase === "seats" ? (y(), o("div", ZC, [...t[3] ||= [s("span", { class: "saving-spinner" }, null, -1), l("座位加载中…", -1)]])) : a("", !0),
				ne.value ? (y(), o("div", QC, [
					l(" 画布初始化失败：" + C(ne.value), 1),
					t[4] ||= s("br", null, null, -1),
					t[5] ||= l("请刷新页面（Ctrl+F5）；反复出现请把本提示截图反馈 ", -1)
				])) : a("", !0),
				w(k).mode === "seats" ? (y(), o("div", $C, [
					t[6] ||= l(" ✏ 正在编辑分区：", -1),
					s("b", null, C(ee.value), 1),
					t[7] ||= s("span", { class: "muted" }, "框选座位可移动/旋转，双击空白退出", -1),
					s("button", {
						class: "btn",
						onClick: t[0] ||= (e) => {
							w(N).exitSection(), w(v)?.fit();
						}
					}, "退出分区")
				])) : a("", !0),
				w(D).ui.zoomPad ? (y(), i(AC, { key: 5 })) : a("", !0)
			], 512),
			w(D).ui.sidePanel ? (y(), i(HS, { key: 2 })) : a("", !0),
			w(D).ui.statusBar ? (y(), i(KS, { key: 3 })) : a("", !0),
			u(lC),
			u(EC)
		], 4)]));
	}
}, tw = [
	"defaultCategories",
	"seatDefaults",
	"limits",
	"zoom",
	"ui",
	"tools"
], nw = class {
	constructor(e, t = {}) {
		if (!e) throw Error("SeatMapDesigner: 缺少挂载容器 el");
		this._handlers = /* @__PURE__ */ new Map();
		let n = (e) => (...t) => this._emit(e, ...t), i = {};
		for (let e of tw) e in t && (i[e] = t[e]);
		let a = typeof t.theme == "string" && ["light", "dark"].includes(t.theme) ? t.theme : null;
		this._app = r(ew, {
			saveHandler: t.saveHandler || null,
			uploadHandler: t.uploadHandler || null,
			options: Object.keys(i).length ? i : null,
			theme: a,
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
	setTheme(e) {
		return this._vm.setTheme?.(e);
	}
	destroy() {
		this._app.unmount(), this._handlers.clear();
	}
};
//#endregion
export { ew as SeatMapDesignerVue, nw as default };
