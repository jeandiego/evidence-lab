(() => {
  document.body.classList.toggle('is-embedded', window.self !== window.top);
  const phone = document.getElementById('phone');
  const viewport = document.createElement('div');
  viewport.className = 'prototype-viewport';
  phone.before(viewport);
  viewport.append(phone);
  const resize = () => {
    const scale = Math.min(1, document.documentElement.clientWidth / 402);
    viewport.style.width = `${402 * scale}px`;
    viewport.style.height = `${874 * scale}px`;
    phone.style.transform = `scale(${scale})`;
  };
  resize();
  window.addEventListener('resize', resize);
  const notice = document.createElement('p');
  notice.className = 'demo-notice';
  notice.textContent = 'Protótipo do Fyin · nomes e valores fictícios. Sem conexão com bancos. Recarregue para recomeçar.';
  document.body.prepend(notice);
})();
