const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const cursor = document.querySelector('.cursor');
const pointer = { x: -100, y: -100, targetX: -100, targetY: -100 };

window.addEventListener('pointermove', (event) => {
  pointer.targetX = event.clientX;
  pointer.targetY = event.clientY;
  cursor.classList.add('is-visible');
});

// A restrained ink wake makes pointer velocity visible across the paper sections.
const trailCanvas = document.querySelector('#inkTrail');
const trailContext = trailCanvas.getContext('2d');
let trailParticles = [];
let lastTrailPoint = { x: -100, y: -100 };

function resizeTrail() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  trailCanvas.width = Math.round(window.innerWidth * ratio);
  trailCanvas.height = Math.round(window.innerHeight * ratio);
  trailContext.setTransform(ratio, 0, 0, ratio, 0, 0);
}

window.addEventListener('pointermove', (event) => {
  if (reduceMotion || window.innerWidth < 760) return;
  const distance = Math.hypot(event.clientX - lastTrailPoint.x, event.clientY - lastTrailPoint.y);
  if (distance < 13) return;
  trailParticles.push({
    x: event.clientX,
    y: event.clientY,
    vx: (Math.random() - .5) * .24,
    vy: -.08 - Math.random() * .2,
    life: 1,
    size: .7 + Math.random() * 1.5,
  });
  if (trailParticles.length > 46) trailParticles.shift();
  lastTrailPoint = { x: event.clientX, y: event.clientY };
});

function animateTrail() {
  trailContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
  trailParticles = trailParticles.filter((particle) => particle.life > .015);
  trailParticles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life *= .94;
    trailContext.beginPath();
    trailContext.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
    trailContext.fillStyle = `rgba(23,26,23,${particle.life * .36})`;
    trailContext.fill();
  });
  requestAnimationFrame(animateTrail);
}

window.addEventListener('click', (event) => {
  if (reduceMotion) return;
  const ripple = document.createElement('i');
  ripple.className = 'click-ripple';
  ripple.style.left = `${event.clientX}px`;
  ripple.style.top = `${event.clientY}px`;
  document.body.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
});

window.addEventListener('resize', resizeTrail);
resizeTrail();
if (!reduceMotion) requestAnimationFrame(animateTrail);

function animateCursor() {
  pointer.x += (pointer.targetX - pointer.x) * .18;
  pointer.y += (pointer.targetY - pointer.y) * .18;
  cursor.style.left = `${pointer.x}px`;
  cursor.style.top = `${pointer.y}px`;
  requestAnimationFrame(animateCursor);
}
animateCursor();

document.querySelectorAll('a, button, .tilt-card').forEach((element) => {
  element.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
  element.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
});

// Magnetic navigation: the label follows the pointer, then springs cleanly home.
document.querySelectorAll('.magnetic').forEach((element) => {
  element.addEventListener('pointermove', (event) => {
    if (reduceMotion) return;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    element.style.transform = `translate3d(${x * .22}px, ${y * .34}px, 0)`;
  });
  element.addEventListener('pointerleave', () => { element.style.transform = ''; });
});

// Interactive swallow field — each bird is a spring particle that can be pushed aside.
const hero = document.querySelector('.hero');
const heroPainting = document.querySelector('.hero-painting');
const canvas = document.querySelector('#swarmCanvas');
const context = canvas.getContext('2d');
const flockPointer = { x: -1000, y: -1000, lastX: -1000, lastY: -1000, vx: 0, vy: 0, down: false };
let birds = [];
let canvasWidth = 0;
let canvasHeight = 0;

function makeFlock() {
  birds = [];
  const mobile = canvasWidth < 760;
  const count = mobile ? 34 : 92;
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const band = (i % 5) - 2;
    const homeX = canvasWidth * (mobile ? (.16 + t * .72) : (.50 + t * .44));
    const arc = Math.sin(t * Math.PI) * canvasHeight * .14;
    const homeY = canvasHeight * (mobile ? .43 : .25) + t * canvasHeight * .22 + arc + band * (mobile ? 8 : 13);
    birds.push({
      x: homeX,
      y: homeY,
      ox: homeX,
      oy: homeY,
      vx: 0,
      vy: 0,
      size: (mobile ? 3.5 : 4.5) + (i % 7) * .42,
      phase: Math.random() * Math.PI * 2,
      depth: .6 + Math.random() * .8,
    });
  }
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = hero.getBoundingClientRect();
  canvasWidth = rect.width;
  canvasHeight = rect.height;
  canvas.width = Math.round(canvasWidth * ratio);
  canvas.height = Math.round(canvasHeight * ratio);
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  makeFlock();
}

function drawBird(bird, time) {
  const flap = Math.sin(time * .003 + bird.phase) * 1.8;
  const angle = Math.atan2(bird.vy, bird.vx + 3) * .16;
  context.save();
  context.translate(bird.x, bird.y);
  context.rotate(angle);
  context.beginPath();
  context.moveTo(0, 1);
  context.quadraticCurveTo(-bird.size * .72, -bird.size - flap, -bird.size * 1.7, -bird.size * .18);
  context.moveTo(0, 1);
  context.quadraticCurveTo(bird.size * .72, -bird.size + flap, bird.size * 1.7, -bird.size * .18);
  context.strokeStyle = 'rgba(24, 34, 30, .72)';
  context.lineWidth = Math.max(.7, bird.depth);
  context.lineCap = 'round';
  context.stroke();
  context.restore();
}

function animateFlock(time) {
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  birds.forEach((bird) => {
    let ax = (bird.ox - bird.x) * .024;
    let ay = (bird.oy - bird.y) * .024;
    const dx = bird.x - flockPointer.x;
    const dy = bird.y - flockPointer.y;
    const distance = Math.hypot(dx, dy);
    const radius = flockPointer.down ? 188 : 138;

    if (distance < radius && distance > 0) {
      const force = (1 - distance / radius) * (flockPointer.down ? 4.4 : 2.5) * bird.depth;
      ax += (dx / distance) * force + flockPointer.vx * .028;
      ay += (dy / distance) * force + flockPointer.vy * .028;
    }

    bird.vx = (bird.vx + ax) * .91;
    bird.vy = (bird.vy + ay) * .91;
    bird.x += bird.vx;
    bird.y += bird.vy;
    drawBird(bird, time);
  });
  flockPointer.vx *= .84;
  flockPointer.vy *= .84;
  requestAnimationFrame(animateFlock);
}

canvas.addEventListener('pointerenter', () => cursor.classList.add('is-canvas'));
canvas.addEventListener('pointerdown', (event) => {
  flockPointer.down = true;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointerup', (event) => {
  flockPointer.down = false;
  canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener('pointerleave', () => {
  cursor.classList.remove('is-canvas');
  flockPointer.down = false;
  flockPointer.x = -1000;
  flockPointer.y = -1000;
});
canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const nextX = event.clientX - rect.left;
  const nextY = event.clientY - rect.top;
  flockPointer.vx = nextX - flockPointer.lastX;
  flockPointer.vy = nextY - flockPointer.lastY;
  flockPointer.x = nextX;
  flockPointer.y = nextY;
  flockPointer.lastX = nextX;
  flockPointer.lastY = nextY;
  hero.classList.add('has-interacted');

  if (!reduceMotion) {
    const parallaxX = (nextX / canvasWidth - .5) * -15;
    const parallaxY = (nextY / canvasHeight - .5) * -9;
    heroPainting.style.transform = `translate3d(${parallaxX}px, ${parallaxY}px, 0) scale(1.015)`;
  }
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
if (!reduceMotion) requestAnimationFrame(animateFlock);

// A second physical field: characters from a rotating selection of Song poems.
const poetryStage = document.querySelector('.poetry-stage');
const poetryCanvas = document.querySelector('#poetryCanvas');
const poetryContext = poetryCanvas.getContext('2d');
const versePointer = { x: -1000, y: -1000, lastX: -1000, lastY: -1000, vx: 0, vy: 0, down: false };
const poemCollection = [
  {
    meta: 'POETRY IN MOTION · YAN SHU, 991–1055',
    source: '浣溪沙 · 晏殊',
    title: 'A familiar swallow<br />returns through time.',
    quote: '“There is nothing to be done—<br />the flowers fall away.<br />As if we had met before,<br />the swallows return.”',
    lines: ['无可奈何花落去', '似曾相识燕归来'],
    translations: ['Nothing can prevent the flowers from falling.', 'The swallows return, as though we had met before.'],
  },
  {
    meta: 'POETRY IN MOTION · SU SHI, 1037–1101',
    source: '饮湖上初晴后雨 · 苏轼',
    title: 'The lake holds<br />two kinds of light.',
    quote: '“Shimmering water is beautiful in sun;<br />veiled mountains are wondrous in rain.”',
    lines: ['水光潋滟晴方好', '山色空蒙雨亦奇'],
    translations: ['Shimmering water is at its best in sunlight.', 'Veiled mountains are wondrous in the rain.'],
  },
  {
    meta: 'POETRY IN MOTION · XIN QIJI, 1140–1207',
    source: '西江月 · 辛弃疾',
    title: 'Stars beyond the sky.<br />Rain before the hill.',
    quote: '“Seven or eight stars beyond the sky;<br />two or three drops of rain before the hill.”',
    lines: ['七八个星天外', '两三点雨山前'],
    translations: ['Seven or eight stars hang beyond the sky.', 'Two or three drops of rain fall before the hill.'],
  },
];
let poemIndex = 0;
let verseLines = poemCollection[0].lines;
let glyphs = [];
let translationGlyphs = [];
let poetryWidth = 0;
let poetryHeight = 0;

function makeVerse() {
  glyphs = [];
  translationGlyphs = [];
  const mobile = poetryWidth < 600;
  const columns = mobile ? [.69, .36] : [.67, .33];
  verseLines.forEach((line, columnIndex) => {
    [...line].forEach((character, rowIndex) => {
      const ox = poetryWidth * columns[columnIndex];
      const oy = poetryHeight * (mobile ? .15 : .19) + rowIndex * Math.min(poetryHeight * .09, mobile ? 70 : 78);
      glyphs.push({ character, columnIndex, rowIndex, x: ox, y: oy, ox, oy, vx: 0, vy: 0, rotation: 0 });
    });
  });
  poemCollection[poemIndex].translations.forEach((text, columnIndex) => {
    const words = text.split(' ');
    const ox = poetryWidth * (columns[columnIndex] - (mobile ? .16 : .14));
    const step = Math.min(poetryHeight * .072, mobile ? 55 : 62);
    words.forEach((word, wordIndex) => {
      const oy = poetryHeight * (mobile ? .16 : .18) + wordIndex * step;
      translationGlyphs.push({ text: word, columnIndex, wordIndex, x: ox, y: oy, ox, oy, vx: 0, vy: 0, rotation: 0 });
    });
  });
}

function resizePoetry() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = poetryStage.getBoundingClientRect();
  poetryWidth = rect.width;
  poetryHeight = rect.height;
  poetryCanvas.width = Math.round(poetryWidth * ratio);
  poetryCanvas.height = Math.round(poetryHeight * ratio);
  poetryCanvas.style.width = `${poetryWidth}px`;
  poetryCanvas.style.height = `${poetryHeight}px`;
  poetryContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  makeVerse();
}

function animateVerse() {
  poetryContext.clearRect(0, 0, poetryWidth, poetryHeight);

  // The hairlines deform with the characters, making the force visible.
  for (let column = 0; column < verseLines.length; column += 1) {
    const lineGlyphs = glyphs.filter((glyph) => glyph.columnIndex === column);
    if (!lineGlyphs.length) continue;
    poetryContext.beginPath();
    poetryContext.moveTo(lineGlyphs[0].x, lineGlyphs[0].y - 38);
    lineGlyphs.forEach((glyph) => poetryContext.lineTo(glyph.x, glyph.y));
    poetryContext.strokeStyle = column < 2 ? 'rgba(145,54,44,.20)' : 'rgba(23,26,23,.15)';
    poetryContext.lineWidth = .7;
    poetryContext.stroke();
  }

  for (let column = 0; column < verseLines.length; column += 1) {
    const wordGlyphs = translationGlyphs.filter((word) => word.columnIndex === column);
    if (!wordGlyphs.length) continue;
    poetryContext.beginPath();
    poetryContext.moveTo(wordGlyphs[0].x, wordGlyphs[0].y - 32);
    wordGlyphs.forEach((word) => poetryContext.lineTo(word.x, word.y));
    poetryContext.strokeStyle = 'rgba(15,82,96,.28)';
    poetryContext.lineWidth = .8;
    poetryContext.stroke();
  }

  glyphs.forEach((glyph) => {
    let ax = (glyph.ox - glyph.x) * .032;
    let ay = (glyph.oy - glyph.y) * .032;
    const dx = glyph.x - versePointer.x;
    const dy = glyph.y - versePointer.y;
    const distance = Math.hypot(dx, dy);
    const radius = versePointer.down ? 180 : 125;
    if (distance < radius && distance > 0) {
      const push = (1 - distance / radius) * (versePointer.down ? 5.2 : 2.8);
      ax += (dx / distance) * push + versePointer.vx * .045;
      ay += (dy / distance) * push + versePointer.vy * .045;
    }
    glyph.vx = (glyph.vx + ax) * .885;
    glyph.vy = (glyph.vy + ay) * .885;
    glyph.x += glyph.vx;
    glyph.y += glyph.vy;
    glyph.rotation += ((glyph.vx * .018) - glyph.rotation) * .1;

    poetryContext.save();
    poetryContext.translate(glyph.x, glyph.y);
    poetryContext.rotate(glyph.rotation);
    poetryContext.fillStyle = '燕月雨星'.includes(glyph.character) ? '#91362c' : '#171a17';
    poetryContext.globalAlpha = .9;
    poetryContext.font = `${poetryWidth < 600 ? 24 : 29}px 'Songti SC', STSong, serif`;
    poetryContext.textAlign = 'center';
    poetryContext.textBaseline = 'middle';
    poetryContext.fillText(glyph.character, 0, 0);
    poetryContext.restore();
  });

  translationGlyphs.forEach((translation) => {
    let ax = (translation.ox - translation.x) * .032;
    let ay = (translation.oy - translation.y) * .032;
    const dx = translation.x - versePointer.x;
    const dy = translation.y - versePointer.y;
    const distance = Math.hypot(dx, dy);
    const radius = versePointer.down ? 180 : 125;
    if (distance < radius && distance > 0) {
      const push = (1 - distance / radius) * (versePointer.down ? 5.4 : 2.9);
      ax += (dx / distance) * push + versePointer.vx * .045;
      ay += (dy / distance) * push + versePointer.vy * .045;
    }
    translation.vx = (translation.vx + ax) * .885;
    translation.vy = (translation.vy + ay) * .885;
    translation.x += translation.vx;
    translation.y += translation.vy;
    translation.rotation += ((translation.vx * .012) - translation.rotation) * .09;

    poetryContext.save();
    poetryContext.translate(translation.x, translation.y);
    poetryContext.rotate(translation.rotation);
    poetryContext.fillStyle = '#0f5260';
    poetryContext.globalAlpha = .76;
    poetryContext.font = `${poetryWidth < 600 ? 24 : 29}px 'Gloock', 'Times New Roman', serif`;
    poetryContext.textAlign = 'center';
    poetryContext.textBaseline = 'middle';
    poetryContext.fillText(translation.text, 0, 0);
    poetryContext.restore();
  });

  versePointer.vx *= .82;
  versePointer.vy *= .82;
  if (!reduceMotion) requestAnimationFrame(animateVerse);
}

function updateVersePointer(event) {
  const rect = poetryCanvas.getBoundingClientRect();
  const nextX = event.clientX - rect.left;
  const nextY = event.clientY - rect.top;
  versePointer.vx = nextX - versePointer.lastX;
  versePointer.vy = nextY - versePointer.lastY;
  versePointer.x = nextX;
  versePointer.y = nextY;
  versePointer.lastX = nextX;
  versePointer.lastY = nextY;
  poetryStage.classList.add('has-interacted');
}

poetryCanvas.addEventListener('pointerenter', () => cursor.classList.add('is-canvas'));
poetryCanvas.addEventListener('pointermove', updateVersePointer);
poetryCanvas.addEventListener('pointerdown', (event) => {
  versePointer.down = true;
  poetryCanvas.setPointerCapture(event.pointerId);
  updateVersePointer(event);
});
poetryCanvas.addEventListener('pointerup', (event) => {
  versePointer.down = false;
  poetryCanvas.releasePointerCapture(event.pointerId);
});
poetryCanvas.addEventListener('pointerleave', () => {
  cursor.classList.remove('is-canvas');
  versePointer.down = false;
  versePointer.x = -1000;
  versePointer.y = -1000;
});

window.addEventListener('resize', resizePoetry);
resizePoetry();
requestAnimationFrame(animateVerse);

const poemButton = document.querySelector('.poem-switch');
const poemCount = poemButton.querySelector('i');
const poetryMeta = document.querySelector('#poetry-meta');
const poetryTitle = document.querySelector('#poetry-title');
const poetryQuote = document.querySelector('#poetry-quote');
const poetrySource = document.querySelector('.poetry-source');
const translationNodes = [...document.querySelectorAll('.verse-translations span')];

function renderPoemContent(poem) {
  poetryMeta.textContent = poem.meta;
  poetryTitle.innerHTML = poem.title;
  poetryQuote.innerHTML = poem.quote;
  poetrySource.textContent = poem.source;
  translationNodes.forEach((node, index) => { node.textContent = poem.translations[index]; });
  poemCount.textContent = `${String(poemIndex + 1).padStart(2, '0')} / ${String(poemCollection.length).padStart(2, '0')}`;
}

poemButton.addEventListener('click', () => {
  if (poetryStage.classList.contains('is-switching')) return;
  poetryStage.classList.add('is-switching');
  glyphs.forEach((glyph) => {
    const direction = glyph.x < poetryWidth / 2 ? -1 : 1;
    glyph.vx += direction * (5 + Math.random() * 5);
    glyph.vy += (Math.random() - .5) * 8;
  });
  translationGlyphs.forEach((translation, index) => {
    translation.vx += (index ? -1 : 1) * (6 + Math.random() * 4);
    translation.vy += (Math.random() - .5) * 7;
  });

  window.setTimeout(() => {
    poemIndex = (poemIndex + 1) % poemCollection.length;
    const poem = poemCollection[poemIndex];
    verseLines = poem.lines;
    renderPoemContent(poem);
    makeVerse();
    glyphs.forEach((glyph) => {
      glyph.y -= 85 + Math.random() * 65;
      glyph.vy = 1 + Math.random() * 2;
    });
    translationGlyphs.forEach((translation) => {
      translation.y -= 95 + Math.random() * 80;
      translation.vy = 1 + Math.random() * 2;
    });
    poetryStage.classList.remove('is-switching');
  }, 280);
});

renderPoemContent(poemCollection[0]);

// Scroll-driven handscroll and scene typography.
const story = document.querySelector('.scroll-story');
const storySticky = document.querySelector('.scroll-sticky');
const track = document.querySelector('.scroll-track');
const progressBar = document.querySelector('.scroll-progress span');
const progressNumber = document.querySelector('.scroll-progress b');
const swallow = document.querySelector('.swallow-flight');
const chapters = [...document.querySelectorAll('.chapter')];
let ticking = false;

function updateStory() {
  const rect = story.getBoundingClientRect();
  const distance = story.offsetHeight - window.innerHeight;
  const progress = Math.max(0, Math.min(1, -rect.top / distance));
  track.style.backgroundPosition = `${progress * 100}% center`;
  track.style.transform = `scale(1.04) translate3d(0, ${Math.sin(progress * Math.PI) * -10}px, 0)`;
  progressBar.style.width = `${progress * 100}%`;
  progressNumber.textContent = String(Math.round(progress * 100)).padStart(3, '0');

  const flightX = progress * Math.min(window.innerWidth * .68, 950);
  const flightY = Math.sin(progress * Math.PI * 2.3) * 90;
  swallow.style.transform = `translate3d(${flightX}px, ${flightY}px, 0) rotate(${Math.cos(progress * Math.PI * 2) * 7}deg)`;

  const active = Math.min(2, Math.floor(progress * 3));
  chapters.forEach((chapter, index) => chapter.classList.toggle('is-active', index === active));
  ticking = false;
}

storySticky.addEventListener('pointermove', (event) => {
  const rect = storySticky.getBoundingClientRect();
  storySticky.style.setProperty('--spot-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
  storySticky.style.setProperty('--spot-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
});

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(updateStory);
    ticking = true;
  }
}, { passive: true });

// Page-edge instrument: progress and the current conceptual chapter.
const pageMeter = document.querySelector('.page-meter');
const meterFill = pageMeter.querySelector('span');
const meterLabel = pageMeter.querySelector('b');
const meterNumber = pageMeter.querySelector('i');
const meterSections = [
  { element: document.querySelector('.hero'), label: 'OPENING' },
  { element: document.querySelector('.opening'), label: 'SPIRIT' },
  { element: document.querySelector('.poetry-field'), label: 'POETRY' },
  { element: document.querySelector('.scroll-story'), label: 'SCROLL' },
  { element: document.querySelector('.principles'), label: 'PRINCIPLES' },
  { element: document.querySelector('.quote'), label: 'MOON' },
  { element: document.querySelector('.colophon'), label: 'COLOPHON' },
];

function updatePageMeter() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const pageProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  meterFill.style.height = `${pageProgress * 180}px`;
  meterNumber.textContent = String(Math.round(pageProgress * 100)).padStart(2, '0');
  let active = meterSections[0];
  meterSections.forEach((section) => {
    if (section.element.getBoundingClientRect().top < window.innerHeight * .46) active = section;
  });
  meterLabel.textContent = active.label;
}

window.addEventListener('scroll', updatePageMeter, { passive: true });
updatePageMeter();

// Directional light and subtle 3D tilt on the three principles.
document.querySelectorAll('.tilt-card').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    if (reduceMotion) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rx = ((y / rect.height) - .5) * -3;
    const ry = ((x / rect.width) - .5) * 4;
    card.style.setProperty('--mx', `${x}px`);
    card.style.setProperty('--my', `${y}px`);
    card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(5px)`;
  });
  card.addEventListener('pointerleave', () => { card.style.transform = ''; });
});

// Reveal typography only as it enters the viewport.
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('in-view');
  });
}, { threshold: .2 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

// Observe the containers for clipped headlines; a fully clipped element has no
// painted intersection in some browsers and would otherwise never reveal.
const headlineObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('.split-reveal').forEach((headline) => headline.classList.add('in-view'));
  });
}, { threshold: .12 });
document.querySelectorAll('.split-reveal').forEach((headline) => headlineObserver.observe(headline.parentElement));

// Moon drifts against pointer movement for a quiet sense of depth.
const quote = document.querySelector('.quote');
const moon = document.querySelector('.moon');
quote.addEventListener('pointermove', (event) => {
  if (reduceMotion) return;
  const rect = quote.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - .5;
  const y = (event.clientY - rect.top) / rect.height - .5;
  moon.style.transform = `translate3d(${x * 28}px, ${y * 20}px, 0)`;
  quote.style.setProperty('--orbit-x', `${x * -18}px`);
  quote.style.setProperty('--orbit-y', `${y * -14}px`);
});
quote.addEventListener('pointerleave', () => {
  moon.style.transform = '';
  quote.style.setProperty('--orbit-x', '0px');
  quote.style.setProperty('--orbit-y', '0px');
});

// A soft procedural wind layer; it starts only after direct user intent.
const soundButton = document.querySelector('.sound-toggle');
const soundLabel = document.querySelector('.sound-label');
let audioContext;

soundButton.addEventListener('click', () => {
  const playing = soundButton.getAttribute('aria-pressed') === 'true';
  if (playing) {
    audioContext?.close();
    audioContext = null;
    soundButton.setAttribute('aria-pressed', 'false');
    soundLabel.textContent = 'Silence';
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioContext = new AudioContext();
  const frameCount = audioContext.sampleRate * 2;
  const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < frameCount; i += 1) {
    const white = Math.random() * 2 - 1;
    last = last * .985 + white * .015;
    data[i] = last * .55;
  }
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = 'lowpass';
  filter.frequency.value = 520;
  gain.gain.value = .13;
  source.connect(filter).connect(gain).connect(audioContext.destination);
  source.start();
  soundButton.setAttribute('aria-pressed', 'true');
  soundLabel.textContent = 'Wind';
});

updateStory();
