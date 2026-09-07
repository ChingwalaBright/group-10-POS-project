import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_MENU } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data.json');

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { menuItems: DEFAULT_MENU, orders: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (e) {
    console.error('Failed to read data.json, reseeding.', e);
    const initial = { menuItems: DEFAULT_MENU, orders: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

let state = load();

// Writes are queued so two rapid requests never interleave a half-written file.
let writeQueue = Promise.resolve();
function persist() {
  writeQueue = writeQueue.then(
    () => fs.promises.writeFile(DB_PATH, JSON.stringify(state, null, 2)),
    (err) => console.error('DB write failed', err)
  );
  return writeQueue;
}

export function getState() {
  return state;
}

export async function setState(updater) {
  state = updater(state);
  await persist();
  return state;
}
