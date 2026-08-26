/**
 * book.js — Efecto "vuelta de página" (page flip)
 * -------------------------------------------------
 * La página saliente rota sobre su borde vertical (eje Y), como si se diera
 * vuelta una hoja de libro, revelando la entrante detrás de ella.
 *
 * ctx.direction: 'forward' pasa la hoja de derecha a izquierda,
 *                'back' la pasa al revés.
 */

const book = {
  id: 'book',
  defaultDuration: 700,
  defaultEasing: 'cubic-bezier(.55, 0, .1, 1)',

  run(ctx) {
    const { viewport, fromEl, toEl, direction, duration, easing } = ctx;
    const forward = direction !== 'back';

    viewport.classList.add('transition-viewport--3d');

    // El origen de rotación es el borde por donde "se da vuelta" la hoja
    const originFrom = forward ? 'left center' : 'right center';
    const originTo = forward ? 'right center' : 'left center';

    toEl.style.transformOrigin = originTo;
    toEl.style.transform = `rotateY(${forward ? '90deg' : '-90deg'})`;
    toEl.style.opacity = '1';

    const anims = [];

    if (fromEl) {
      fromEl.style.transformOrigin = originFrom;
      anims.push(
        fromEl.animate(
          [
            { transform: 'rotateY(0deg)', filter: 'brightness(1)' },
            { transform: `rotateY(${forward ? '-90deg' : '90deg'})`, filter: 'brightness(.7)' },
          ],
          { duration, easing, fill: 'forwards' }
        ).finished
      );
    }

    anims.push(
      toEl.animate(
        [
          { transform: `rotateY(${forward ? '90deg' : '-90deg'})`, filter: 'brightness(.7)' },
          { transform: 'rotateY(0deg)', filter: 'brightness(1)' },
        ],
        { duration, easing, fill: 'forwards' }
      ).finished
    );

    return Promise.all(anims).then(() => {
      viewport.classList.remove('transition-viewport--3d');
    });
  },
};

export default book;