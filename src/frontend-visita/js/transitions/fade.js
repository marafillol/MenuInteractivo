/**
 * fade.js — Crossfade simple
 * La vista saliente y la entrante animan opacidad en paralelo.
 */

const fade = {
  id: 'fade',
  defaultDuration: 400,
  defaultEasing: 'ease',

  run(ctx) {
    const { fromEl, toEl, duration, easing } = ctx;
    const anims = [];

    toEl.style.opacity = '0';

    if (fromEl) {
      anims.push(
        fromEl.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration, easing, fill: 'forwards' }
        ).finished
      );
    }

    anims.push(
      toEl.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration, easing, fill: 'forwards' }
      ).finished
    );

    return Promise.all(anims);
  },
};

export default fade;