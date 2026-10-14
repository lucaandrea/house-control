// Measured-in-metres primitives for loft architecture and mapped equipment.
import * as THREE from 'three';
import { box, cyl, mat, at } from './kit.js';
const dark = mat('#24272d'), white = mat('#ece8e0'), metal = mat('#8b9399', { metal: 0.65, rough: 0.35 });
const wood = mat('#ad8961');
const group = (...parts) => { const g = new THREE.Group(); if (parts.length) g.add(...parts.flat()); return g; };
const b = (w, h, d, m, x = 0, y = 0, z = 0) => at(box(w, h, d, m), x, y, z);
const c = (r, h, m, x = 0, y = 0, z = 0) => at(cyl(r, r, h, m, 16), x, y, z);
const screen = mat('#101d2c', { emissive: '#4d7e9e', emissiveIntensity: 0.35, rough: 0.2 });

export const loftBuilders = {
  stairs({ width = 1, depth = 3, height = 2.75, steps = 14 }) {
    const g = group();
    for (let i = 0; i < steps; i++) {
      const z = depth / 2 - (i + 0.5) * depth / steps;
      g.add(b(width, (i + 1) * height / steps, depth / steps, wood, 0, 0, z));
      if (i % 2 === 0) g.add(c(0.018, 0.9, dark, width / 2, (i + 1) * height / steps, z));
    }
    const rail = b(0.045, 0.045, Math.hypot(depth, height), dark, width / 2, height / 2 + 0.95);
    rail.rotation.x = Math.atan2(height, depth);
    g.add(rail);
    return g;
  },
  railing({ width = 3, height = 1.05, solid = false }) {
    const g = group(b(width, 0.06, 0.09, dark, 0, height));
    if (solid) g.add(b(width, height, 0.12, white));
    else for (let x = -width / 2; x <= width / 2 + 0.01; x += 0.22) g.add(c(0.014, height, dark, x));
    return g;
  },
  stool() {
    return group(c(0.21, 0.04, dark), c(0.025, 0.65, metal), c(0.21, 0.06, mat('#aa926e'), 0, 0.65), b(0.38, 0.27, 0.035, mat('#aa926e'), 0, 0.7, -0.17));
  },
  glazing({ width = 5.2, height = 5.2 }) {
    const frame = mat('#c0c1b9'), glass = mat('#a9c1c9', { opacity: 0.1, rough: 0.2 });
    const g = group(b(width, height, 0.01, glass), b(width, 0.06, 0.08, frame, 0, height), b(width, 0.12, 0.08, frame, 0, 2.7));
    for (const x of [-width / 2, -width / 6, width / 6, width / 2]) g.add(b(0.05, height, 0.08, frame, x));
    g.add(b(width, 0.06, 0.08, frame, 0, height * 0.76));
    return g;
  },
  counter({ width = 2, depth = 0.65, height = 0.91, color = '#986c40' }) {
    const g = group(b(width, height - 0.04, depth, mat(color)), b(width + 0.04, 0.04, depth + 0.06, mat('#656368'), 0, height - 0.04));
    for (let x = -width / 2 + 0.6; x < width / 2; x += 0.6) g.add(b(0.009, height - 0.1, 0.01, dark, x, 0.05, depth / 2));
    return g;
  },
  simRig({ width = 1.8 }) {
    const g = group(b(0.7, 0.12, 1.6, dark), b(0.56, 0.23, 0.55, dark, 0, 0.22, 0.4),
      b(0.56, 0.75, 0.14, dark, 0, 0.4, 0.67), b(0.72, 0.04, 0.28, metal, 0, 0.62, -0.22));
    for (const x of [-0.3, 0.3]) g.add(b(0.045, 0.66, 0.045, metal, x, 0, -0.24));
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.023, 8, 24), dark);
    wheel.position.set(0, 0.85, -0.16); wheel.rotation.x = -0.35; g.add(wheel);
    for (const i of [-1, 0, 1]) {
      const panel = group(b(width / 3, 0.39, 0.035, dark), b(width / 3 - 0.025, 0.36, 0.01, screen, 0, 0.015, 0.021));
      panel.position.set(i * width * 0.31, 1, -0.58 + Math.abs(i) * 0.08); panel.rotation.y = -i * 0.3; g.add(panel);
    }
    g.add(b(0.44, 0.05, 0.3, metal, 0, 0.13, -0.55));
    return g;
  },
  fireplace({ width = 1.3, height = 4.9 }) {
    return group(b(width, height, 0.3, mat('#953e3d'), 0, 0, -0.18),
      b(width + 0.16, 1.25, 0.45, mat('#34373b')), b(width - 0.25, 0.7, 0.03, dark, 0, 0.25, 0.24),
      b(width + 0.28, 0.11, 0.66, mat('#45494d')));
  },
  piano({ width = 1.35 }) {
    const g = group(b(width, 0.85, 0.3, dark, 0, 0, -0.11), b(width, 0.1, 0.48, dark, 0, 0.69),
      b(width * 0.75, 0.045, 0.28, dark, 0, 0.42, 0.55));
    for (let i = 0; i < 30; i++) g.add(b(width / 33, 0.017, 0.18, white, -width / 2 + 0.05 + i * width / 32, 0.79, 0.12));
    for (const x of [-width * 0.3, width * 0.3]) g.add(b(0.04, 0.42, 0.04, dark, x, 0, 0.55));
    return g;
  },
  laundry({ stacked = true }) {
    const g = group();
    for (let i = 0; i < 2; i++) {
      const x = stacked ? 0 : (i - 0.5) * 0.67, y = stacked ? i * 0.9 : 0;
      g.add(b(0.65, 0.88, 0.68, white, x, y), b(0.6, 0.08, 0.015, metal, x, y + 0.77, 0.348));
      const door = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 24), dark);
      door.rotation.x = Math.PI / 2; door.position.set(x, y + 0.43, 0.355); g.add(door);
    }
    return g;
  },
  speaker({ width = 0.23, height = 0.8 }) {
    const g = group(b(width, height, width, dark));
    for (const y of [height * 0.25, height * 0.65]) {
      const driver = new THREE.Mesh(new THREE.TorusGeometry(width * 0.32, 0.012, 8, 20), metal);
      driver.position.set(0, y, width / 2 + 0.01); g.add(driver);
    }
    return g;
  },
  homepod() {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 12), white);
    sphere.scale.y = 0.86; sphere.position.y = 0.044;
    return group(sphere, c(0.025, 0.004, dark, 0, 0.087));
  },
  camera({ flood = false }) {
    const g = group(b(0.09, 0.18, 0.075, white), b(0.065, 0.07, 0.012, dark, 0, 0.07, 0.041));
    if (flood) for (const x of [-0.12, 0.12]) g.add(b(0.13, 0.09, 0.08, white, x, 0.17));
    return g;
  },
  blinds({ width = 1.3, height = 2.2 }) {
    return group(c(0.04, 0.04, white), b(width, 0.075, 0.075, white, 0, height),
      b(width, height * 0.13, 0.018, mat('#d8d1bf', { opacity: 0.7 }), 0, height * 0.87));
  },
  ceilingFan({ width = 1.5 }) {
    const g = group(c(0.035, 0.3, metal), c(0.1, 0.1, white, 0, 0.02));
    for (let i = 0; i < 3; i++) {
      const blade = b(width / 2, 0.025, 0.13, white, width / 4, 0.03);
      const pivot = group(blade); pivot.rotation.y = i * Math.PI * 2 / 3; g.add(pivot);
    }
    return g;
  },
  purifier() { return group(c(0.15, 0.52, white), c(0.135, 0.015, dark, 0, 0.52)); },
  humidifier() { return group(c(0.09, 0.18, white), c(0.075, 0.012, wood, 0, 0.18)); },
  sensor() { return group(b(0.065, 0.075, 0.025, white), b(0.05, 0.04, 0.003, dark, 0, 0.02, 0.014)); },
  router() { return group(b(0.1, 0.2, 0.1, white)); },
  projector() { return group(b(0.44, 0.13, 0.31, white), b(0.12, 0.02, 0.08, dark, 0, 0.13, -0.06)); },
  receiver() { return group(b(0.44, 0.15, 0.34, dark), b(0.2, 0.05, 0.01, screen, 0, 0.06, 0.175)); },
  mediaBox() { return group(b(0.1, 0.03, 0.1, dark)); },
  bedHub() { return group(b(0.18, 0.4, 0.3, dark)); },
  firepit({ width = 0.95 }) { return group(c(width / 2, 0.35, mat('#8e8c86')), c(width * 0.34, 0.025, dark, 0, 0.35)); },
  mirror({ width = 0.65, height = 1.8 }) { return group(b(width, height, 0.045, dark), b(width - 0.05, height - 0.05, 0.01, mat('#a2afbd', { metal: 0.9, rough: 0.14 }), 0, 0.025, 0.027)); },
  shower({ width = 0.9, depth = 0.9, height = 2.05 }) {
    const glass = mat('#b9d8df', { opacity: 0.18, rough: 0.12 });
    const tile = mat('#e4e6e3'), grout = mat('#bfc6c6');
    const back = -depth / 2 + 0.025, front = depth / 2 - 0.025;
    const g = group(
      b(width, 0.07, depth, white), b(width - 0.04, height - 0.07, 0.04, tile, 0, 0.07, back),
      b(width - 0.06, height - 0.105, 0.015, glass, 0, 0.08, front),
      c(0.035, 0.008, metal, 0, 0.072),
      b(0.035, 0.035, 0.28, metal, 0, height - 0.15, back + 0.15),
      c(0.095, 0.018, metal, 0, height - 0.16, back + 0.27),
      b(0.1, 0.15, 0.035, metal, 0, 1.04, back + 0.035),
      c(0.012, 0.22, metal, width * 0.24, 0.94, front - 0.03),
    );
    for (const side of [-1, 1]) {
      const x = side * (width / 2 - 0.025);
      g.add(b(0.015, height - 0.105, depth - 0.06, glass, x, 0.08),
        b(0.025, 0.025, depth - 0.025, metal, x, height - 0.025),
        b(0.025, height - 0.07, 0.025, metal, x, 0.07, front));
    }
    g.add(b(width - 0.025, 0.025, 0.025, metal, 0, height - 0.025, front));
    for (let y = 0.37; y < height; y += 0.3) g.add(b(width - 0.045, 0.006, 0.004, grout, 0, y, back + 0.022));
    // Transparent enclosure panels must not cast solid black shadows onto the tray.
    g.traverse((o) => { if (o.isMesh && o.material.transparent) o.userData.noShadow = true; });
    return g;
  },
  art({ width = 0.6, height = 0.8, color = '#ae806d' }) { return group(b(width, height, 0.035, dark), b(width - 0.05, height - 0.05, 0.01, mat(color), 0, 0.025, 0.025), b(width * 0.35, height * 0.6, 0.012, mat('#d7b968'), 0.06, height * 0.2, 0.033)); },
  bamboo({ width = 1.1, height = 2 }) {
    const g = group(b(width, 0.3, 0.4, mat('#544f42')));
    for (let i = 0; i < 9; i++) {
      const x = (i / 8 - 0.5) * width * 0.9;
      g.add(c(0.012, height - 0.3, mat('#a7a36e'), x, 0.3));
      for (let j = 0; j < 5; j++) {
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), mat(j % 2 ? '#507548' : '#6b8551'));
        leaf.position.set(x + Math.sin(i + j) * 0.15, 0.75 + j * (height - 0.8) / 5, Math.cos(i + j) * 0.13);
        leaf.scale.set(1.6, 0.4, 0.8); g.add(leaf);
      }
    }
    return g;
  },
};

export const loftFootprints = {
  stool: [0.44, 0.44], glazing: [5.2, 0.08], stairs: [1, 3], railing: [3, 0.12], counter: [2, 0.65], simRig: [1.8, 1.6], fireplace: [1.3, 0.66],
  piano: [1.35, 0.9], laundry: [0.65, 0.68], speaker: [0.23, 0.23], homepod: [0.1, 0.1], camera: [0.3, 0.1],
  blinds: [1.3, 0.08], ceilingFan: [1.5, 1.5], purifier: [0.3, 0.3], humidifier: [0.18, 0.18], sensor: [0.065, 0.025],
  router: [0.1, 0.1], projector: [0.44, 0.31], receiver: [0.44, 0.34], mediaBox: [0.1, 0.1], bedHub: [0.18, 0.3],
  firepit: [0.95, 0.95], mirror: [0.65, 0.05], shower: [0.9, 0.9], art: [0.6, 0.04], bamboo: [1.1, 0.4],
};
