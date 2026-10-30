// Centium landing v29: section 05 (Who it's for) demo content and computed values. These are
// the prototype's own data values (Centium Site v29.dc.html: data(), data7(),
// data9(), data12()), taken from its evaluated output so every string,
// colour, percentage and animation window ("a b", read by motion/anim.ts as
// data-w) is literal. The names and figures are approved demo data.

import { tk } from "../../../../i18n/core";

export const dialTicks = [
  { tr: "rotate(0 60 60)", on: true, w: "0.040 0.100" },
  { tr: "rotate(12 60 60)", on: true, w: "0.085 0.145" },
  { tr: "rotate(24 60 60)", on: true, w: "0.130 0.190" },
  { tr: "rotate(36 60 60)", on: true, w: "0.175 0.235" },
  { tr: "rotate(48 60 60)", on: true, w: "0.220 0.280" },
  { tr: "rotate(60 60 60)", on: true, w: "0.265 0.325" },
  { tr: "rotate(72 60 60)", on: true, w: "0.310 0.370" },
  { tr: "rotate(84 60 60)", on: true, w: "0.355 0.415" },
  { tr: "rotate(96 60 60)", on: true, w: "0.400 0.460" },
  { tr: "rotate(108 60 60)", on: true, w: "0.445 0.505" },
  { tr: "rotate(120 60 60)", on: true, w: "0.490 0.550" },
  { tr: "rotate(132 60 60)", on: true, w: "0.535 0.595" },
  { tr: "rotate(144 60 60)", on: true, w: "0.580 0.640" },
  { tr: "rotate(156 60 60)", on: true, w: "0.625 0.685" },
  { tr: "rotate(168 60 60)", on: true, w: "0.670 0.730" },
  { tr: "rotate(180 60 60)", on: true, w: "0.715 0.775" },
  { tr: "rotate(192 60 60)", on: true, w: "0.760 0.820" },
  { tr: "rotate(204 60 60)", on: true, w: "0.805 0.865" },
  { tr: "rotate(216 60 60)", on: false, w: "0.850 0.910" },
  { tr: "rotate(228 60 60)", on: false, w: "0.895 0.955" },
  { tr: "rotate(240 60 60)", on: false, w: "0.940 1.000" },
  { tr: "rotate(252 60 60)", on: false, w: "0.985 1.045" },
  { tr: "rotate(264 60 60)", on: false, w: "1.030 1.090" },
  { tr: "rotate(276 60 60)", on: false, w: "1.075 1.135" },
  { tr: "rotate(288 60 60)", on: false, w: "1.120 1.180" },
  { tr: "rotate(300 60 60)", on: false, w: "1.165 1.225" },
  { tr: "rotate(312 60 60)", on: false, w: "1.210 1.270" },
  { tr: "rotate(324 60 60)", on: false, w: "1.255 1.315" },
  { tr: "rotate(336 60 60)", on: false, w: "1.300 1.360" },
  { tr: "rotate(348 60 60)", on: false, w: "1.345 1.405" },
];

export const instMacros = [
  { k: tk("Protein"), v: tk("128 / 165 g"), p: "78%", c: "#775FD7", w: "0.2 0.7" },
  { k: tk("Carbs"), v: tk("196 / 260 g"), p: "75%", c: "#B9A9EE", w: "0.28 0.78" },
  { k: tk("Fat"), v: tk("48 / 65 g"), p: "74%", c: "#5D9C93", w: "0.36 0.86" },
];

export const weekChecks = [
  { on: true, w: "0.10 0.20" },
  { on: true, w: "0.20 0.30" },
  { on: true, w: "0.30 0.40" },
  { on: true, w: "0.40 0.50" },
  { on: false, w: "0.50 0.60" },
  { on: true, w: "0.60 0.70" },
  { on: true, w: "0.70 0.80" },
];
