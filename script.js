(() => {
  const RELEASE_URL = 'releases/releases.json';

  const escapeHtml = value => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // One tokenizer for the homepage demo. The displayed HTML and copied source
  // both come from the same string, so changing tabs cannot desynchronise them.
  const highlightTekst = source => {
    const token = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(#.*$)|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_][A-Za-z0-9_]*)\b|===|!==|==|!=|<=|>=|->|\+=|-=|\*=|\/=|[+\-*\/%=<>]|[()[\]{},.:]/gm;
    const keywords = new Set(['fn','let','mut','if','else','elif','for','while','in','return','break','continue','class','struct','import','from','as','try','catch','throw','new','package','pub','match','type','true','false','nil','and','or','not','is']);
    const builtins = new Set(['print','input','range','len','str','int','float','bool','list','tuple','dict','read','write']);
    const types = new Set(['int','float','bool','string','void','ptr']);
    let html = '', last = 0, match;
    while ((match = token.exec(source))) {
      html += escapeHtml(source.slice(last, match.index));
      const value = match[0];
      if (match[1]) html += `<span class="tok-string">${escapeHtml(value)}</span>`;
      else if (match[2]) html += `<span class="tok-comment">${escapeHtml(value)}</span>`;
      else if (match[3]) html += `<span class="tok-number">${value}</span>`;
      else if (match[4]) {
        const next = source.slice(token.lastIndex);
        const cls = keywords.has(value) ? 'tok-keyword' : builtins.has(value) ? 'tok-builtin' : types.has(value) ? 'tok-type' : /^\s*\(/.test(next) ? 'tok-function' : 'tok-variable';
        html += `<span class="${cls}">${escapeHtml(value)}</span>`;
      } else {
        html += `<span class="tok-operator">${escapeHtml(value)}</span>`;
      }
      last = token.lastIndex;
    }
    return html + escapeHtml(source.slice(last));
  };

  const codeSource = {
    variables: {
      title: 'variables.tk',
      caption: 'Values are visible without ceremony.',
      code: `name = "Tekst"\nage = 14\nactive = true\nitems = [1, 2, 3]`
    },
    functions: {
      title: 'functions.tk',
      caption: 'Functions read like their purpose.',
      code: `fn greet(name):\n    return "Hello {name}!"\n\nmessage = greet("World")\nprint(message)`
    },
    flow: {
      title: 'flow.tk',
      caption: 'Blocks stay visible because indentation is structure.',
      code: `score = 82\n\nif score >= 80:\n    print("Great")\nelse:\n    print("Keep going")`
    }
  };

  const copyText = async text => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (!ok) throw new Error('Copy failed');
  };

  const heroCode = document.querySelector('#hero-code');
  if (heroCode) {
    const source = heroCode.textContent;
    heroCode.dataset.source = source;
    heroCode.innerHTML = highlightTekst(source);
  }

  const demo = document.querySelector('[data-code-demo]');
  if (demo) {
    const code = demo.querySelector('[data-demo-code]');
    const title = demo.querySelector('[data-demo-file]');
    const caption = demo.querySelector('[data-demo-caption]');
    const lines = demo.querySelector('[data-demo-lines]');
    const copyButton = demo.querySelector('[data-demo-copy]');
    let currentKey = 'variables';

    const renderDemo = key => {
      currentKey = key;
      const item = codeSource[key];
      code.dataset.source = item.code;
      code.innerHTML = highlightTekst(item.code);
      title.textContent = item.title;
      caption.textContent = item.caption;
      lines.textContent = `${item.code.split('\n').length} lines`;
      demo.querySelectorAll('[data-demo-tab]').forEach(button => {
        const active = button.dataset.demoTab === key;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
      });
      copyButton.textContent = 'Copy code';
    };

    demo.querySelectorAll('[data-demo-tab]').forEach(button => {
      button.addEventListener('click', () => renderDemo(button.dataset.demoTab));
    });
    copyButton.addEventListener('click', async () => {
      const source = codeSource[currentKey].code;
      try {
        await copyText(source);
        copyButton.textContent = 'Copied ✓';
      } catch {
        copyButton.textContent = 'Copy failed';
      }
      window.setTimeout(() => { copyButton.textContent = 'Copy code'; }, 1400);
    });
    renderDemo(currentKey);
  }

  // Generic copy buttons elsewhere on the site. Always prefer an explicit target.
  document.querySelectorAll('.copy-button[data-copy-target]').forEach(button => {
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) return;
      const source = target.textContent;
      const original = button.textContent;
      try { await copyText(source); button.textContent = 'Copied ✓'; }
      catch { button.textContent = 'Copy failed'; }
      window.setTimeout(() => { button.textContent = original; }, 1400);
    });
  });

  // Release data powers every current-release surface on the homepage.
  const base = new URL('./', document.baseURI);
  fetch(new URL(RELEASE_URL, base), {cache: 'no-store'})
    .then(response => { if (!response.ok) throw new Error(response.status); return response.json(); })
    .then(releases => {
      if (!Array.isArray(releases) || !releases.length) throw new Error('No releases');
      const current = releases.find(r => /current/i.test(r.tag || '')) || releases[0];
      const version = `v${String(current.version).replace(/^v/, '')}`;
      document.querySelectorAll('[data-release-version]').forEach(el => el.textContent = version);
      document.querySelectorAll('[data-release-description]').forEach(el => el.textContent = current.description || '');
      document.querySelectorAll('[data-release-date]').forEach(el => el.textContent = current.date || '');
      const path = String(current.path || '').replace(/^\.?\//, '');
      document.querySelectorAll('[data-release-link]').forEach(el => el.href = `releases/${path}`);
      const files = {windows: 'Windows.zip', linux: 'Linux.zip', macos: 'MacOS.zip'};
      document.querySelectorAll('[data-platform]').forEach(el => {
        el.href = `releases/${path}${files[el.dataset.platform] || ''}`;
      });
    }).catch(() => {
      document.querySelectorAll('[data-release-version]').forEach(el => el.textContent = 'Tekst releases');
    });

  document.addEventListener('click', event => {
    document.querySelectorAll('.download-menu[open]').forEach(menu => {
      if (!menu.contains(event.target)) menu.removeAttribute('open');
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.download-menu[open]').forEach(menu => menu.removeAttribute('open'));
  });
})();
