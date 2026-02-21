const PI = Math.PI;
const DEG = PI / 180;

function sp(t, r0, r1, t0, t1) {
  const r = r0 + (r1 - r0) * t;
  const th = (t0 + (t1 - t0) * t) * DEG;
  return { x: r * Math.sin(th), y: -r * Math.cos(th) };
}

function bezier(r0, r1, t0, t1) {
  const p = [0, 0.33, 0.66, 1].map(t => sp(t, r0, r1, t0, t1));
  return `M ${p[0].x.toFixed(1)},${p[0].y.toFixed(1)} C ${p[1].x.toFixed(1)},${p[1].y.toFixed(1)} ${p[2].x.toFixed(1)},${p[2].y.toFixed(1)} ${p[3].x.toFixed(1)},${p[3].y.toFixed(1)}`;
}

function leaves(r0, r1, t0, t1, n, sz, side = 1) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const pt = sp(t, r0, r1, t0, t1);
    const s = ((i % 2 === 0) ? 1 : -1) * side;
    const a = Math.atan2(pt.x, -pt.y) / DEG + s * 24;
    out.push({ x: pt.x, y: pt.y, a, sz });
  }
  return out;
}

// === ARM DESIGN: COUNTER-CLOCKWISE spiral ===
// Main vine: θ goes from 0° to -58° (CCW), r from 14 to 168
const vines = [
  { r: [14, 168], t: [0, -58], sw: 2.0 },    // main CCW spiral
  { r: [35, 95], t: [-8, 25], sw: 1.7 },      // right branch (fills area to the right)
  { r: [18, 42], t: [-2, 18], sw: 1.3 },       // inner right branch
  { r: [55, 148], t: [-20, -32], sw: 1.5 },    // outer extension along main
  { r: [75, 140], t: [15, 30], sw: 1.4 },      // far right fill branch
  { r: [100, 160], t: [-52, -65], sw: 1.3 },   // far left outer
];

const allLeaves = [
  // Main CCW spiral: 8 leaves
  ...leaves(20, 162, -1, -56, 8, 'Ll', 1),
  // Right branch: 5 leaves
  ...leaves(38, 90, -6, 23, 5, 'L', -1),
  // Inner right: 2 leaves
  ...leaves(22, 40, 0, 16, 2, 'Ls', 1),
  // Outer extension: 4 leaves
  ...leaves(58, 142, -21, -31, 4, 'L', -1),
  // Far right fill: 4 leaves
  ...leaves(78, 135, 16, 28, 4, 'L', 1),
  // Far left outer: 2 leaves
  ...leaves(105, 155, -53, -63, 2, 'Ls', -1),
];

// Output
console.log('<g id="arm">');
console.log('  <!-- Vines -->');
for (const v of vines) {
  console.log(`  <path d="${bezier(v.r[0], v.r[1], v.t[0], v.t[1])}" stroke="white" fill="none" stroke-width="${v.sw}" stroke-linecap="round"/>`);
}
console.log('');
console.log('  <!-- Leaves -->');
for (const l of allLeaves) {
  console.log(`  <use href="#${l.sz}" transform="translate(${l.x.toFixed(1)},${l.y.toFixed(1)}) rotate(${l.a.toFixed(0)})"/>`);
}
console.log('</g>');
console.log(`<!-- ${allLeaves.length} per arm, ${allLeaves.length * 6} total -->`);
