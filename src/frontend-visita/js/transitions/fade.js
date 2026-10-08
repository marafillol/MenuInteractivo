/**
 * fade.js — Fundido sin valle oscuro
 *
 * ANTES: la saliente bajaba a opacidad 0 mientras la entrante subía a 1.
 * En el punto medio las dos quedaban semitransparentes y se veía el
 * fondo de la página (negro): ese era el "pantallazo negro".
 *
 * AHORA: la vista saliente se queda opaca debajo (el motor ya la deja
 * en la capa "under") y la entrante aparece por encima (capa "over").
 * Nunca se ve el fondo, porque siempre hay una vista opaca detrás.
 */

const fade = {
  id: 'fade',
  defaultDuration: 600,
  defaultEasing: 'ease',

  run(ctx) {
    const { toEl, duration, easing } = ctx;

    toEl.style.opacity = '0';

    return toEl.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration, easing, fill: 'forwards' }
    ).finished;
  },
};

export default fade;