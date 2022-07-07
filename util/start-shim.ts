import Handler from '../.out/out';

addEventListener('fetch', (event) => {
  return event.respondWith(Handler(event.request));
});
