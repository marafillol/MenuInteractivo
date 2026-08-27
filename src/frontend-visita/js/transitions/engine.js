/**
 * engine.js — Motor de transiciones
 * ----------------------------------
 * Orquesta el ciclo de vida de una transición entre dos vistas (fromEl -> toEl)
 * delegando el "cómo" a los presets registrados en presets.js.
 *
 * El motor NO sabe nada de rotateX, opacity, clip-path, etc. Sólo sabe:
 *  1. preparar las capas (clases + z-index)
 *  2. invocar preset.run(ctx) y esperar su promesa
 *  3. limpiar las capas al terminar
 *  4. emitir eventos para que la UI reaccione si quiere (loaders, bloqueo de scroll, etc.)
 */

import { getPreset } from './presets.js';

const DEFAULTS = {
  duration: 550,
  easing: 'cubic-bezier(.4, 0, .2, 1)',
  direction: 'forward', // 'forward' | 'back'
};

class TransitionEngine {
  constructor() {
    this._viewport = null;
    this._busy = false;
    this._queue = [];
  }

  /**
   * Vincula el motor a un contenedor: el "viewport" donde viven las páginas
   * que se van a transicionar (deben ser hijos absolutos de este elemento).
   */
  mount(viewportEl) {
    if (!viewportEl) throw new Error('[transitions] mount() requiere un elemento contenedor');
    this._viewport = viewportEl;
    this._viewport.classList.add('transition-viewport');
    return this;
  }

  /**
   * Ejecuta una transición entre dos nodos ya presentes en el DOM.
   * @param {string} presetId - id registrado en presets.js ('fade' | 'book' | 'folder' | ...)
   * @param {object} opts
   * @param {HTMLElement|null} opts.fromEl - nodo saliente (null si es la primera carga)
   * @param {HTMLElement} opts.toEl - nodo entrante (obligatorio)
   * @param {'forward'|'back'} [opts.direction]
   * @param {number} [opts.duration] - override en ms
   * @param {string} [opts.easing] - override de easing
   * @param {object} [opts.data] - metadata libre que el preset puede leer (ctx.data)
   */
  async run(presetId, { fromEl = null, toEl, direction = DEFAULTS.direction, duration, easing, data = {} } = {}) {
    if (!toEl) throw new Error('[transitions] run() requiere "toEl"');
    if (!this._viewport) throw new Error('[transitions] Llamá a mount() antes de run()');

    // Si hay una transición en curso, encolamos en vez de solapar animaciones
    if (this._busy) {
      return new Promise((resolve, reject) => {
        this._queue.push(() =>
          this.run(presetId, { fromEl, toEl, direction, duration, easing, data }).then(resolve, reject)
        );
      });
    }

    const preset = getPreset(presetId);
    if (!preset) {
      console.warn(`[transitions] Preset "${presetId}" no encontrado. Uso "fade" como fallback.`);
      return this.run('fade', { fromEl, toEl, direction, duration, easing, data });
    }

    this._busy = true;
    const ctx = this._buildContext({ preset, fromEl, toEl, direction, duration, easing, data });

    this._dispatch('transition:before', ctx);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    try {
      this._prepareLayers(ctx);

      if (reduceMotion) {
        await this._runReduced(ctx);
      } else {
        await preset.run(ctx);
      }

      this._settleLayers(ctx);
      this._dispatch('transition:after', ctx);
    } finally {
      this._busy = false;
      const next = this._queue.shift();
      if (next) next();
    }
  }

  // -- internos -----------------------------------------------------------

  _buildContext({ preset, fromEl, toEl, direction, duration, easing, data }) {
    return {
      viewport: this._viewport,
      fromEl,
      toEl,
      direction,
      duration: duration ?? preset.defaultDuration ?? DEFAULTS.duration,
      easing: easing ?? preset.defaultEasing ?? DEFAULTS.easing,
      data,
    };
  }

  _prepareLayers(ctx) {
    const { fromEl, toEl } = ctx;
    if (fromEl) {
      fromEl.classList.add('transition-layer', 'transition-layer--under');
    }
    toEl.hidden = false;
    toEl.classList.add('transition-layer', 'transition-layer--over');
  }

  _settleLayers(ctx) {
    const { fromEl, toEl } = ctx;
    if (fromEl) {
      fromEl.hidden = true;
      fromEl.classList.remove('transition-layer', 'transition-layer--under');
      fromEl.style.cssText = '';
    }
    toEl.classList.remove('transition-layer', 'transition-layer--over');
    toEl.style.cssText = '';
  }

  async _runReduced(ctx) {
    // Sin animación: corte directo pero respetando el mismo ciclo de vida
    if (ctx.fromEl) ctx.fromEl.style.opacity = '0';
    ctx.toEl.style.opacity = '1';
  }

  _dispatch(name, ctx) {
    this._viewport.dispatchEvent(new CustomEvent(name, { detail: ctx }));
  }
}

export const transitions = new TransitionEngine();
export default transitions;