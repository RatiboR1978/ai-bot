/* ============================================================
   Нейробот «ТЕССА AI» — поведение страницы.
   Вставляется в блок «Javascript» страницы ГетКурса целиком.

   Всё в IIFE и работает только с классами tsss-* / атрибутами
   data-tsss-*, чтобы не пересекаться с кодом ГетКурса.
   ============================================================ */

(function () {
  'use strict';

  /* Кнопки «Купить N токенов» открывают форму заказа сами, через onclick
     в разметке (ltShowModalBlock — функция ГетКурса). Здесь их не трогаем. */

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  ready(function () {
    var page = document.querySelector('.tsss-page--ai-bot');
    if (!page) return;

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Плавная прокрутка к якорям внутри страницы ---------- */

    page.querySelectorAll('a[href^="#tsss-"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var target = document.getElementById(link.getAttribute('href').slice(1));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });

    /* ---------- Ленты примеров: стрелки ----------
       Листается сама лента (overflow-x + scroll-snap), пальцем и колесом
       без скрипта. Стрелки сдвигают её на ширину видимой части и гаснут
       у краёв. */

    page.querySelectorAll('[data-tsss-gallery]').forEach(function (gallery) {
      var track = gallery.querySelector('[data-tsss-gallery-track]');
      var prev = gallery.querySelector('[data-tsss-gallery-prev]');
      var next = gallery.querySelector('[data-tsss-gallery-next]');
      if (!track || !prev || !next) return;

      function step() {
        return Math.max(track.clientWidth * 0.8, 200);
      }

      function update() {
        var max = track.scrollWidth - track.clientWidth;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max - 2;
      }

      prev.addEventListener('click', function () {
        track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' });
      });
      next.addEventListener('click', function () {
        track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' });
      });
      track.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      // Картинки грузятся лениво — ширина ленты меняется после загрузки
      track.querySelectorAll('img').forEach(function (img) {
        img.addEventListener('load', update);
      });
      update();
    });

    /* ---------- Видео-примеры: играют без звука, пока видны ----------
       preload="none" — пока лента не доехала до экрана, видео не качаются.
       Звук включается в штатных кнопках плеера. Кто попросил систему убрать
       анимации, запускает видео сам. */

    var videos = Array.prototype.slice.call(page.querySelectorAll('video[data-tsss-autoplay]'));
    if (!videos.length || reduceMotion || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting) {
          // Включённый пользователем звук не сбрасываем
          if (!video._tsssTouched) video.muted = true;
          var played = video.play();
          if (played && played.catch) played.catch(function () {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { threshold: 0.6 });

    videos.forEach(function (video) {
      video.addEventListener('volumechange', function () {
        if (!video.muted) video._tsssTouched = true;
      });
      observer.observe(video);
    });
  });
})();
