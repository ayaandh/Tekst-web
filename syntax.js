(() => {
  const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tokenise = (source, language) => {
    const strings = [];
    const stash = value => `\u0000${strings.push(value) - 1}\u0000`;
    let text = escape(source).replace(/(&quot;|&apos;|"|'|`)(?:\\.|(?!\1)[^\\])*?\1/g, stash);
    if (language === 'shell') {
      text = text.replace(/(^|\s)(tekst)(?=\s|$)/g, '$1<span class="tok-command">$2</span>');
      text = text.replace(/(^|\s)(--?[a-zA-Z][\w-]*)/g, '$1<span class="tok-keyword">$2</span>');
      text = text.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>');
    } else if (language === 'cpp' || language === 'c++') {
      text = text.replace(/(^|\s)(#\w+)/g, '$1<span class="tok-directive">$2</span>');
      text = text.replace(/\b(class|struct|namespace|using|auto|const|constexpr|return|if|else|for|while|template|typename|public|private|protected|void|int|bool|string|true|false|nullptr|include)\b/g, '<span class="tok-keyword">$1</span>');
      text = text.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>');
      text = text.replace(/\/\/.*$/gm, '<span class="tok-comment">$&</span>');
    } else {
      text = text.replace(/\b(fn|let|mut|if|else|for|while|in|return|class|struct|import|from|as|true|false|nil|try|catch|throw|new|package|pub|match|type)\b/g, '<span class="tok-keyword">$1</span>');
      text = text.replace(/\b(print|range|len|input)\b(?=\s*\()/g, '<span class="tok-builtin">$1</span>');
      text = text.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>');
      text = text.replace(/(^|\s)(#[^\n]*)/g, '$1<span class="tok-comment">$2</span>');
    }
    return text.replace(/\u0000(\d+)\u0000/g, (_, index) => `<span class="tok-string">${strings[Number(index)]}</span>`);
  };
  document.querySelectorAll('pre code').forEach(block => {
    const language = [...block.classList].find(value => value.startsWith('language-'))?.slice(9) || block.closest('[data-language]')?.dataset.language || 'tekst';
    block.innerHTML = tokenise(block.textContent, language);
    block.classList.add(`language-${language}`);
    block.parentElement.classList.add('syntax-ready');
  });
})();
