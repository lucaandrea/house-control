import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize, configForLevel } from '../src/config.js';
import { applyOperations, replacePlan, check } from '../src/agent/plan-edit.js';
import { buildFurniture, footprint } from '../src/three/furniture.js';
import { Box3, Raycaster, Vector3 } from 'three';

const load = (name) => JSON.parse(readFileSync(new URL(`../public/plans/${name}.json`, import.meta.url)));
const loft = () => load('loft113');
const stacked = () => ({ name: 'Two storeys', levels: [{ id: 'lower' }, { id: 'upper', elevation: 3 }],
  rooms: [{ id: 'down', rect: [0, 0, 4, 4], level: 'lower' }, { id: 'up', rect: [0, 0, 4, 4], level: 'upper' }],
  furniture: [{ type: 'sofa', pos: [2, 2], level: 'lower' }, { type: 'bed', pos: [2, 2], level: 'upper', y: 0.1 }],
  devices: [{ id: 'speaker', room: 'up', pos: [1, 1] }],
  lights: [{ id: 'lamp', room: 'up', type: 'table', pos: [1, 1], link: { service: 'hue', id: 'existing-id' } }],
  openings: [{ type: 'door', from: [1, 0], to: [2, 0], level: 'upper' }] });

test('legacy single-floor plans retain their rooms, lights and furniture', () => {
  for (const name of ['home', 'studio']) {
    const raw = load(name), cfg = normalize(raw), floor = configForLevel(cfg, cfg.defaultLevel);
    for (const key of ['rooms', 'lights', 'acs', 'furniture', 'openings']) assert.equal(floor[key].length, (raw[key] || []).length);
    assert.equal(cfg.levels.length, 1);
  }
});

test('overlapping coordinates on different storeys isolate all renderables', () => {
  const config = normalize(stacked());
  const lower = configForLevel(config, 'lower'), upper = configForLevel(config, 'upper');
  assert.deepEqual(lower.rooms.map((r) => r.id), ['down']);
  assert.deepEqual(lower.furniture.map((f) => f.type), ['sofa']);
  assert.equal(lower.openings.length + lower.lights.length + lower.devices.length, 0);
  assert.equal(upper.openings.length, 1); assert.equal(upper.devices.length, 1);
  assert.equal(upper.furniture[0].type, 'bed');
  assert.deepEqual(upper.furniture[0].pos, [2, 2]);
});

test('moving and refurnishing the loft leaves the floor below unchanged', () => {
  const raw = stacked();
  const moved = applyOperations(raw, [{ op: 'update_room', id: 'up', rect: [1, 1, 4, 4] }]).plan;
  assert.deepEqual(moved.furniture[0], raw.furniture[0]);
  assert.deepEqual(moved.furniture[1].pos, [3, 3]);
  assert.deepEqual(moved.devices[0].pos, [2, 2]);
  const next = applyOperations(raw, [{ op: 'furnish_room', room: 'up', items: [{ type: 'dresser', pos: [1, 2] }] }]).plan;
  assert.equal(next.furniture[0].type, 'sofa');
  assert.equal(next.furniture[1].level, 'upper');
});

test('removing an unlinked upper room preserves furniture below and removes its inventory', () => {
  const raw = stacked(); raw.lights = [];
  const result = applyOperations(raw, [{ op: 'remove_room', id: 'up' }]).plan;
  assert.equal(result.furniture.length, 1); assert.equal(result.furniture[0].type, 'sofa');
  assert.equal(result.devices.length, 0);
});

test('plan replacement retains existing hardware links and new geometry options', () => {
  const raw = stacked(), replacement = structuredClone(raw);
  delete replacement.lights[0].link;
  const next = replacePlan(raw, replacement).plan;
  assert.deepEqual(next.lights[0].link, raw.lights[0].link);
  assert.equal(next.furniture[1].level, 'upper'); assert.equal(next.furniture[1].y, 0.1);
});

test('unknown floors and duplicate mapped device ids fail before rendering', () => {
  const raw = stacked(); raw.furniture[0].level = 'roof';
  assert.throws(() => normalize(raw), /Unknown level/);
  const duplicate = stacked(); duplicate.devices[0].id = 'lamp';
  assert.throws(() => normalize(duplicate), /Duplicate id/);
});

test('loft geometry has no overlapping floor rectangles or invented hardware links', () => {
  const raw = loft(), cfg = normalize(raw);
  assert.deepEqual(check(raw), []);
  for (const a of cfg.rooms) for (const b of cfg.rooms) {
    if (a.id === b.id || a.level !== b.level) continue;
    const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const overlapZ = Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z);
    assert.ok(overlapX < 0.001 || overlapZ < 0.001, `${a.id} overlaps ${b.id}`);
  }
  for (const d of [...cfg.lights, ...cfg.devices]) {
    assert.equal(d.link, undefined); assert.equal(d.tuya, undefined);
  }
  assert.equal(cfg.survey.status, 'estimated');
});

test('every loft furnishing and mapped model generates finite geometry', () => {
  const raw = loft();
  const items = [...raw.furniture, ...raw.devices.filter((d) => d.model).map((d) => ({ ...d, type: d.model }))];
  const model = buildFurniture(items);
  assert.equal(model.children.length, items.length);
  model.traverse((o) => {
    if (o.geometry) assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));
  });
});

test('laundry editor footprint encloses both machine bodies and doors', () => {
  for (const stacked of [true, false]) {
    const item = { type: 'laundry', pos: [0, 0], stacked };
    const model = buildFurniture([item]);
    const size = new Box3().setFromObject(model).getSize(new Vector3());
    const [width, depth] = footprint(item);
    assert.ok(width + 1e-6 >= size.x);
    assert.ok(depth + 1e-6 >= size.z);
    assert.ok(stacked ? size.y > 1.7 : size.y < 1);
  }
});

test('a sectional has usable seats on both legs and leaves its inside corner open', () => {
  const model = buildFurniture([{ type: 'sectional', pos: [0, 0] }]);
  model.updateMatrixWorld(true);
  const down = (x, z) => new Raycaster(new Vector3(x, 3, z), new Vector3(0, -1, 0)).intersectObject(model, true);
  assert.ok(down(0.6, -1.1).length > 0);
  assert.ok(down(-1, 0.6).length > 0);
  assert.equal(down(0.6, 0.6).length, 0);
});
