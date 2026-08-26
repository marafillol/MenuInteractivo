import transitions from './transitions/engine.js';

const pages = {
  home: document.querySelector('#home'),
  menu: document.querySelector('#menu')
};

let current = pages.home;

export async function goToMenu() {
  const next = pages.menu;

  await transitions.run('book', {
    fromEl: current,
    toEl: next
  });

  current = next;
}