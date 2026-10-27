// Centium landing v29: the prototype's per-element progress animations
// (Centium Site v29.dc.html `collect` and `anim`). An element marked
// data-w="a b" animates while its section's progress U runs from a to b
// (eased out, cubic); its data-* flags say what moves:
//   data-cnt (count to, with data-from / data-dec), data-ring / data-draw /
//   data-ringd (SVG stroke-dashoffset), data-sx / data-sy (scale),
//   data-stamp (scale 1.45 to 1, fade in), data-tk / data-tkp (translateX px
//   / %), data-tx (slide in from x px, fade in), data-ty (slide up from y px),
//   data-rot (rotate), data-flip (rotateY 80 to 0), data-sweep / data-sweepy
//   (travel, visible only mid-way), data-spring (drop in with a spring),
//   data-op (fade in, plus an 8px rise for HTML), data-out (fade out).
// Reduced motion: each element jumps to its end once U passes the middle of
// its window.

import { clamp, eo } from "../engine/math";

export interface AnimItem {
  el: HTMLElement | SVGElement;
  a: number;
  b: number;
  d: DOMStringMap;
  svg: boolean;
  last: number;
}

/** Every [data-w] element inside root (prototype `collect`). */
export function collect(root: Element | null): AnimItem[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement | SVGElement>("[data-w]")).map((el) => {
    const [a, b] = (el.getAttribute("data-w") || "0 1").split(" ").map(Number);
    return { el, a, b, d: el.dataset, svg: el instanceof SVGElement, last: -1 };
  });
}

/** Apply progress U to a collected list (prototype `anim`). */
export function anim(list: AnimItem[], U: number, rm: boolean) {
  for (const it of list) {
    let u = clamp((U - it.a) / (it.b - it.a || 1));
    if (rm) u = U >= (it.a + it.b) / 2 ? 1 : 0;
    u = eo(u);
    if (Math.abs(u - it.last) < 0.0005) continue;
    it.last = u;
    const d = it.d,
      s = it.el.style;
    let tf = "",
      op: number | null = null;
    if (d.cnt != null) {
      const to = +d.cnt,
        from = +(d.from || 0),
        dec = +(d.dec || 0),
        v = from + (to - from) * u;
      it.el.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US");
    }
    if (d.ring != null) it.el.setAttribute("stroke-dashoffset", (1 - +d.ring * u).toFixed(4));
    if (d.draw != null) it.el.setAttribute("stroke-dashoffset", (1 - u).toFixed(4));
    if (d.ringd != null) it.el.setAttribute("stroke-dashoffset", (+d.ringd * u).toFixed(4));
    if (d.sx != null) tf += "scaleX(" + u.toFixed(4) + ")";
    if (d.sy != null) tf += "scaleY(" + u.toFixed(4) + ")";
    if (d.stamp != null) {
      tf += "scale(" + (1.45 - 0.45 * u).toFixed(4) + ")";
      op = u;
    }
    if (d.tk != null) tf += "translateX(" + (+d.tk * u).toFixed(2) + "px)";
    if (d.tkp != null) tf += "translateX(" + (+d.tkp * u).toFixed(2) + "%)";
    if (d.tx != null) {
      tf += "translateX(" + ((1 - u) * +d.tx).toFixed(2) + "px)";
      op = u;
    }
    if (d.ty != null) tf += "translateY(" + ((1 - u) * +d.ty).toFixed(2) + "px)";
    if (d.rot != null) tf += "rotate(" + (+d.rot * u).toFixed(2) + "deg)";
    if (d.flip != null) {
      tf += "rotateY(" + ((1 - u) * 80).toFixed(2) + "deg)";
      op = Math.min(1, u * 1.6);
    }
    if (d.sweep != null) {
      tf += "translateX(" + (+d.sweep * u).toFixed(2) + "px)";
      op = u > 0.001 && u < 0.999 ? 1 : 0;
    }
    if (d.sweepy != null) {
      tf += "translateY(" + (+d.sweepy * u).toFixed(2) + "px)";
      op = u > 0.001 && u < 0.999 ? 1 : 0;
    }
    if (d.spring != null) {
      const sp = u >= 1 ? 1 : 1 - Math.exp(-6 * u) * Math.cos(9 * u);
      tf += "translateY(" + ((1 - sp) * -115).toFixed(2) + "%) scale(" + (0.92 + 0.08 * sp).toFixed(4) + ")";
      op = Math.min(1, u * 3);
    }
    if (d.op != null) {
      op = u;
      if (!tf && !it.svg && d.ty == null) tf = "translateY(" + ((1 - u) * 8).toFixed(2) + "px)";
    }
    if (d.out != null) op = 1 - u;
    if (tf) s.transform = tf;
    if (op != null) s.opacity = op.toFixed(3);
  }
}
