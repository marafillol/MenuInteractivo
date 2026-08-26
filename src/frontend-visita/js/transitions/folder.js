/**
 * folder.js — Efecto "carpeta" (fold)
 * --------------------------------------
 * La vista saliente se pliega hacia arriba sobre su borde superior, como la
 * tapa de una carpeta cerrándose. Luego la entrante se despliega hacia abajo
 * de la misma manera, con un pequeño solapamiento (delay) para que se sienta
 * como un solo gesto continuo en vez de dos animaciones separadas.
 */

const folder = {
  id: 'folder',
  defaultDuration: 600,
  defaultEasing: 'cubic-bezier(.65, 0, .35, 1)',

  run(ctx) {
    const { viewport, fromEl, toEl, duration, easing } = ctx;

    viewport.classList.add('transition-viewport--3d');

    toEl.style.transformOrigin = 'top center';
    toEl.style.transform = 'rotateX(-90deg)';
    toEl.style.opacity = '1';

    const anims = [];
    const closeDuration = duration * 0.5;
    const openDuration = duration * 0.6;
    const openDelay = fromEl ? duration * 0.35 : 0;

    if (fromEl) {
      fromEl.style.transformOrigin = 'top center';
      anims.push(
        fromEl.animate(
          [
            { transform: 'rotateX(0deg)', opacity: 1 },
            { transform: 'rotateX(90deg)', opacity: 0.4 },
          ],
          { duration: closeDuration, easing, fill: 'forwards' }
        ).finished
      );
    }

    anims.push(
      toEl.animate(
        [
          { transform: 'rotateX(-90deg)', opacity: 0.4 },
          { transform: 'rotateX(0deg)', opacity: 1 },
        ],
        { duration: openDuration, delay: openDelay, easing, fill: 'forwards' }
      ).finished
    );

    return Promise.all(anims).then(() => {
      viewport.classList.remove('transition-viewport--3d');
    });
  },
};

export default folder;