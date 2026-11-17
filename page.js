/* ============================================================
   Нейробот «ТЕССА AI» — поведение страницы.
   Вставляется в блок «Javascript» страницы ГетКурса целиком.

   Всё в IIFE и работает только с классами tsss-* / атрибутами
   data-tsss-*, чтобы не пересекаться с кодом ГетКурса.
   ============================================================ */

(function () {
  'use strict';

  /* Кнопка «Задайте поддержке» открывает форму вопроса сама, через onclick
     в разметке (ltShowModalBlock — функция ГетКурса). Здесь её не трогаем. */

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  /* Пакеты в форме: название предложения ГетКурса («БОТ AI | Покупка
     100 токенов») показываем коротко — «100 токенов», ниже цена за токен,
     у самого дешёвого токена метка «выгоднее». Количество берётся
     из названия, цена — из data-price-value. Не нашлось числа — строку
     не трогаем: название остаётся как в предложении. */

  function formatNumber(value) {
    var parts = String(Math.round(value * 100) / 100).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join(',');
  }

  function tokensWord(count) {
    var n10 = count % 10;
    var n100 = count % 100;
    if (n10 === 1 && n100 !== 11) return 'токен';
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'токена';
    return 'токенов';
  }

  function decorateOffers(block) {
    var best = null;
    var decorated = 0;
    block.querySelectorAll('.form-position').forEach(function (position) {
      if (position.hasAttribute('data-tsss-offer')) return;
      var title = position.querySelector('.offer-title') || position.querySelector('.form-position-title');
      var input = position.querySelector('.form-position-input');
      if (!title || !input) return;

      var match = title.textContent.match(/(\d[\d\s ]*)\s*токен/i);
      var price = parseFloat(input.getAttribute('data-price-value'));
      if (!match || !price) return;
      var count = parseInt(match[1].replace(/\D/g, ''), 10);
      if (!count) return;

      position.setAttribute('data-tsss-offer', '');
      position.title = title.textContent.trim();
      title.textContent = formatNumber(count) + ' ' + tokensWord(count);

      var rate = document.createElement('span');
      rate.className = 'tsss-offer-rate';
      rate.textContent = formatNumber(price / count) + ' ₽ за токен';
      (position.querySelector('.form-position-title') || title).appendChild(rate);

      decorated += 1;
      if (!best || price / count < best.value) best = { value: price / count, rate: rate };
    });

    if (best && decorated > 1) {
      var badge = document.createElement('span');
      badge.className = 'tsss-offer-badge';
      badge.textContent = 'выгоднее';
      best.rate.parentNode.insertBefore(badge, best.rate);
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

    /* ---------- Форма заказа — в экран пакетов ----------
       Блок формы ГетКурса стоит на странице отдельным блоком (после HTML).
       Переносим его в карточку .tsss-packs__form: id блока — в data-tsss-form.
       Если блока нет (id сменился), форма просто останется на своём месте. */

    var mount = page.querySelector('[data-tsss-form]');
    var formBlock = mount && document.getElementById(mount.getAttribute('data-tsss-form'));
    if (formBlock) {
      if (!mount.contains(formBlock)) mount.appendChild(formBlock);
      decorateOffers(formBlock);
    }

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
