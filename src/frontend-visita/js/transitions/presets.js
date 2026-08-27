/**
 * presets.js — Catálogo de motion presets
 * -----------------------------------------
 * Un preset es un objeto plano con esta forma:
 *
 *   {
 *     id: 'nombre-unico',
 *     defaultDuration: 500,          // ms (opcional, el motor tiene fallback)
 *     defaultEasing: 'ease',         // opcional
 *     run(ctx) { ... return Promise }
 *   }
 *
 * ctx (que arma engine.js) contiene:
 *   { viewport, fromEl, toEl, direction, duration, easing, data }
 *
 * Los presets NO deben:
 *  - tocar `hidden`, agregar/quitar las clases transition-layer*
 *  - saber nada del router o de la UI que los dispara
 * Los presets SÍ pueden:
 *  - animar fromEl/toEl (WAAPI, clases CSS propias, lo que necesiten)
 *  - leer ctx.data para parametrizar su animación
 */

const registry = new Map();

export function registerPreset(preset) {
  if (!preset || !preset.id) throw new Error('[transitions] Preset inválido: falta "id"');
  if (typeof preset.run !== 'function') throw new Error(`[transitions] Preset "${preset.id}" no implementa run()`);
  registry.set(preset.id, preset);
}

export function getPreset(id) {
  return registry.get(id) || null;
}

export function listPresets() {
  return [...registry.keys()];
}

// -- Auto-registro de los presets incluidos ---------------------------------
import fadePreset from './fade.js';
import bookPreset from './book.js';
import folderPreset from './folder.js';

[fadePreset, bookPreset, folderPreset].forEach(registerPreset);