const DEFAULT_TITLE = document.title;
const DEFAULT_URL = document.location.pathname;


const rgb2hex = (rgb) => {
  // Choose correct separator
  const sep = rgb.indexOf(",") > -1 ? "," : " ";
  // Turn "rgb(r,g,b)" into [r,g,b]
  rgb = rgb.substr(4).split(")")[0].split(sep);

  let r = (+rgb[0]).toString(16),
    g = (+rgb[1]).toString(16),
    b = (+rgb[2]).toString(16);

  if (r.length === 1) {
    r = "0" + r;
  }
  if (g.length === 1) {
    g = "0" + g;
  }
  if (b.length === 1) {
    b = "0" + b;
  }

  return "#" + r + g + b;
};


const lookup = (el, selector) => {
  let _el = el;
  while (_el && _el.matches && !_el.matches(selector)) {
    if (_el.parentElement === document) {
      return null;
    }
    _el = _el.parentElement;
  }
  return _el;
};


const subscribe = (eventName, selector, callback) => {
  const on = event => {
    const el = lookup(event.target, selector);
    if (el) {
      callback(event, el);
    }
  };
  document.addEventListener(eventName, on);
  return () => document.removeEventListener(eventName, on);
};


const popup = document.querySelector('#popup');


subscribe('click', '[data-project] > a', (event, el) => {
  event.preventDefault();
  const project = lookup(el, '[data-project]');
  project.classList.toggle('opened');
});


const cache = {};
const getContent = async ident => {
  if (ident in cache) {
    return cache[ident];
  }

  const content = await (await fetch(`./${ident}.html`)).text();
  const doc = new DOMParser().parseFromString(content, 'text/html');
  const app = doc.querySelector(`#${ident}`);
  if (app) {
    cache[ident] = {
      title: doc.querySelector('head title').innerHTML,
      content: app.outerHTML
    };
  } else {
    cache[ident] = {title: DEFAULT_TITLE, content: ''};
  }

  return cache[ident];
};


const loadCss = href => {
  if (document.querySelector(`head link[href="${href}"]`)) {
    return;
  }
  const link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('type', 'text/css');
  let onload = () => {};
  const loadedPromise = new Promise(resolve => {
    onload = resolve;
  });
  link.onload = onload;
  link.setAttribute('href', href);
  document.querySelector('head').appendChild(link);

  return loadedPromise;
};


const workOpen = ({project, work, x, y, fill}) => {
  document.body.classList.add('lock');
  popup.style.backgroundColor = fill || 'transparent';

  popup.classList.remove('animated');
  requestAnimationFrame(() => {
    popup.style.top = y ? `${y}px` : '0px';
    popup.style.left = x ? `${x}px` : '0px';
    requestAnimationFrame(async () => {
      popup.classList.add('animated');
      popup.style.top = `0px`;
      popup.style.left = `0px`;
      popup.classList.add('opened');

      const [_, {content, title}] = await Promise.all([
        loadCss(`./${project}/${work}/styles.css`),
        getContent(`${project}-${work}`)
      ]);
      document.title = title;
      popup.innerHTML = content;

      'gtag' in window && window.gtag('config', 'UA-150639557-1', {
        'page_title': title,
        'page_path': `./${project}-${work}.html`
      });
    });
  });
};


const workClose = ({x, y}) => {
  popup.style.top = y ? `${y}px` : '0px';
  popup.style.left = x ? `${x}px` : '0px';
  popup.classList.remove('opened');
  popup.innerHTML = '';

  document.body.classList.remove('lock');
  document.title = DEFAULT_TITLE;
};


subscribe('click', '[data-work] > a', async (event, el) => {
  event.preventDefault();

  const {x, y} = event;

  const workEl = lookup(el, '[data-work]');
  const projectEl = lookup(workEl, '[data-project]');

  const work = workEl.dataset.work;
  const project = projectEl.dataset.project;

  const fill = getComputedStyle(el.querySelector('.frame .fill')).fill;
  await workOpen({project, work, x, y, fill});
  history.pushState({project, work, x, y, fill}, document.title, `./${project}-${work}.html`);
});


subscribe('click', '#popup', event => {
  event.preventDefault();

  const {x, y} = event;
  workClose({x, y});
  history.pushState({x, y}, DEFAULT_TITLE, DEFAULT_URL);
});

const mood = document.querySelector('#girl-blink');
const onScroll = () => {
  mood.classList.toggle('blink', Math.round(scrollY / 150) === 1);
};

let timer = null;
addEventListener('scroll', () => {
  if (!timer) {
    timer = requestAnimationFrame(() => {
      onScroll();
      timer = null;
    });
  }
});


window.onpopstate = function (event) {
  if (!event.state || typeof event.state !== 'object') {
    workClose({x: 0, y: 0});
    return;
  }

  const {project, work, x, y, fill} = event.state;
  if (project && work) {
    workOpen({project, work, x, y, fill});
  } else {
    workClose({x, y});
  }
};
