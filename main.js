/* THE BSMNT — interactions */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const small = matchMedia('(max-width: 760px)');
  const body = document.body;

  /* ---------- split helpers ---------- */
  $$('[data-split="chars"]').forEach(el => {
    el.innerHTML = [...el.textContent].map((c, i) =>
      `<span class="ch" style="transition-delay:${0.35 + i * 0.07}s">${c}</span>`).join('');
  });
  $$('.line').forEach(l => {
    const group = l.parentElement;
    const idx = [...group.children].filter(c => c.classList.contains('line')).indexOf(l);
    l.style.setProperty('--i', idx);
  });

  /* ---------- fit BSMNT edge to edge ---------- */
  const fitWord = () => {
    const w = $(".hero__word-inner"); if (!w) return;
    w.style.setProperty("--fit", "100px");
    const natural = w.scrollWidth;
    const avail = w.parentElement.clientWidth - parseFloat(getComputedStyle(w.parentElement).paddingLeft) * 2;
    w.style.setProperty("--fit", (100 * avail / natural).toFixed(2) + "px");
    w.parentElement.style.setProperty("--fit-h", w.style.getPropertyValue("--fit"));
  };
  fitWord();
  document.fonts && document.fonts.ready.then(fitWord);
  addEventListener("resize", fitWord);

  /* ---------- loader ---------- */
  const level = $('.loader__level');
  const levels = ['G', '−1'];
  let li = 0;
  const lvTimer = setInterval(() => { li = Math.min(li + 1, levels.length - 1); level.textContent = levels[li]; }, 650);
  const finishLoad = () => {
    clearInterval(lvTimer);
    level.textContent = '−1';
    body.classList.add('is-loaded');
    const dock = $('.dock');
    if (dock) dock.classList.add('is-on');
  };
  if (reduce) finishLoad();
  else window.addEventListener('load', () => setTimeout(finishLoad, small.matches ? 450 : 1200));
  setTimeout(finishLoad, 4000); // never hang on slow fonts

  /* ---------- clock ---------- */
  const clock = $('#clock');
  const tick = () => {
    clock.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date());
  };
  tick(); setInterval(tick, 15000);

  /* ---------- hero: optional video, else still sequence ---------- */
  const video = $('.hero__video');
  const slides = $$('.hero__slide');
  const slideNo = $('#slideNo');
  let si = 0, slideTimer;
  const nextSlide = () => {
    slides[si].classList.remove('is-active');
    si = (si + 1) % slides.length;
    slides[si].classList.add('is-active');
    slideNo.textContent = String(si + 1).padStart(2, '0');
  };
  if (!reduce) slideTimer = setInterval(nextSlide, 5200);
  if (video && video.dataset.src) {
    fetch(video.dataset.src, { method: 'HEAD' }).then(r => {
      if (!r.ok) return;
      video.src = video.dataset.src;
      video.addEventListener('canplay', () => { video.classList.add('is-ready'); video.play().catch(() => {}); clearInterval(slideTimer); }, { once: true });
      video.load();
    }).catch(() => {});
  }

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  $$('.reveal, .reveal-lines').forEach(el => io.observe(el));

  /* ---------- scroll-linked ---------- */
  const nav = $('#nav');
  const progress = $('.progress');
  const heroWord = $('.hero__word-inner');
  const hero = $('#hero');
  const scrubs = $$('[data-scrub]');
  const speeds = $$('[data-speed]');
  let lastY = scrollY, ticking = false;

  const onScroll = () => {
    const y = scrollY;
    const vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    // nav hide on down, show on up
    nav.classList.toggle('is-solid', y > vh * 0.6);
    if (y > vh && y > lastY + 4) nav.classList.add('is-hidden');
    else if (y < lastY - 4 || y < vh) nav.classList.remove('is-hidden');
    lastY = y;

    if (!reduce) {
      // BSMNT sinks below street level
      if (y < hero.offsetHeight) heroWord.style.transform = `translate3d(0, ${y * 0.42}px, 0)`;

      scrubs.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh;  // -1..1 around centre
        el.style.transform = `translate3d(${p * 22 * parseFloat(el.dataset.scrub) - 10}vw, 0, 0)`;
      });

      if (!small.matches) speeds.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = (r.top + r.height / 2 - vh / 2);
        el.style.transform = `translate3d(0, ${p * parseFloat(el.dataset.speed)}px, 0)`;
      });
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* current section in nav */
  const navLinks = $$('.nav__links a');
  const secIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['events', 'venue', 'gallery', 'crew', 'join'].forEach(id => secIO.observe(document.getElementById(id)));

  /* ---------- stair transition on internal navigation ---------- */
  const stairs = $('.stairs');
  const menuBtn = $('.nav__burger');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    body.classList.toggle('is-locked', open);
    menuBtn.setAttribute('aria-expanded', open);
    $('#menu').setAttribute('aria-hidden', !open);
  };
  menuBtn.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));

  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') { e.preventDefault(); return; }
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    const jump = () => {
      setMenu(false);
      const offset = small.matches && id !== '#top' ? 64 : 0;
      const top = id === '#top' ? 0 : target.getBoundingClientRect().top + scrollY - offset;
      scrollTo({ top, behavior: small.matches && !reduce ? 'smooth' : 'instant' });
      history.replaceState(null, '', id);
    };
    if (reduce || small.matches) { jump(); return; }   // phones: straight smooth scroll, no wipe
    stairs.classList.remove('is-out');
    stairs.classList.add('is-in');
    setTimeout(() => {
      jump();
      requestAnimationFrame(() => {
        stairs.classList.remove('is-in');
        stairs.classList.add('is-out');
      });
    }, 820);
  }));

  /* ---------- cursor ---------- */
  if (fine && !reduce) {
    const cur = $('.cursor'), label = $('.cursor__label');
    let mx = -100, my = -100, cx = -100, cy = -100;
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; cur.classList.add('is-on'); }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
    const loop = () => {
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
      cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    $$('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => { label.textContent = el.dataset.cursor; cur.classList.add('is-label'); });
      el.addEventListener('mouseleave', () => cur.classList.remove('is-label'));
    });

    /* poster tilt */
    $$('.ev').forEach(ev => {
      const p = $('.poster', ev);
      ev.addEventListener('mousemove', e => {
        const r = p.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        p.style.setProperty('--ry', `${(x - .5) * 7}deg`);
        p.style.setProperty('--rx', `${(.5 - y) * 7}deg`);
        p.style.setProperty('--gx', `${x * 100}%`);
        p.style.setProperty('--gy', `${y * 100}%`);
      });
      ev.addEventListener('mouseleave', () => { p.style.setProperty('--rx', '0deg'); p.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- lightbox ---------- */
  const lb = $('.lightbox'), lbImg = $('.lightbox__img'), lbCap = $('.lightbox__cap');
  const closeLb = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); body.classList.remove('is-locked'); };
  $$('.g figure, figure.g').forEach(fig => fig.addEventListener('click', () => {
    const img = $('.g__img', fig);
    lbImg.style.backgroundImage = getComputedStyle(img).backgroundImage;
    lbCap.textContent = $('figcaption', fig).textContent.trim();
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); body.classList.add('is-locked');
  }));
  lb.addEventListener('click', closeLb);
  addEventListener('keydown', e => { if (e.key === 'Escape') { closeLb(); setMenu(false); } });

  /* ---------- newsletter ---------- */
  $$('.signup').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    const input = $('input', form), msg = $('.signup__msg', form);
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
    form.classList.toggle('is-error', !ok);
    if (!ok) { msg.textContent = 'That email doesn\'t look right.'; input.focus(); return; }
    // TODO: connect to your mailing provider (Mailchimp / Klaviyo / Substack etc.)
    msg.textContent = 'You\'re on the list. See you downstairs.';
    input.value = '';
  }));
})();
