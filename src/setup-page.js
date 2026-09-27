'use strict';

function setupPage(baseUrl) {
  const safeBaseUrl = JSON.stringify(baseUrl);
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Unwatched+</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; display:grid; place-items:center; background:#0f0d1b; color:#f7f5ff; }
    main { width:min(680px, calc(100% - 32px)); background:#1b1830; border:1px solid #312b50; border-radius:22px; padding:30px; box-sizing:border-box; }
    h1 { margin:0 0 8px; font-size:32px; }
    p { color:#c9c3df; line-height:1.55; }
    label { display:block; margin-top:24px; margin-bottom:8px; font-weight:700; }
    input { width:100%; box-sizing:border-box; border:1px solid #443b69; border-radius:12px; background:#100e1d; color:white; padding:14px; font-size:15px; }
    .buttons { display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; }
    button, a.button { border:0; border-radius:12px; padding:12px 16px; font-weight:700; cursor:pointer; text-decoration:none; font-size:14px; }
    button { background:#7357ff; color:white; }
    a.button { background:#2a2543; color:white; }
    code { background:#100e1d; padding:2px 6px; border-radius:6px; }
    #status { min-height:24px; margin-top:14px; font-size:14px; }
    .good { color:#86efac; } .bad { color:#fca5a5; }
    small { color:#928ba9; display:block; margin-top:22px; line-height:1.45; }
  </style>
</head>
<body>
<main>
  <h1>Unwatched+</h1>
  <p>Mostra uma fileira no Stremio com a quantidade real de episódios <strong>já lançados</strong> e ainda não concluídos.</p>
  <p>Para o teste local, pegue o <code>authKey</code> no Stremio Web em DevTools → Application → Local Storage. A chave não é gravada por este servidor.</p>
  <label for="authKey">Stremio authKey</label>
  <input id="authKey" type="password" autocomplete="off" spellcheck="false" placeholder="Cole sua authKey aqui" />
  <div class="buttons">
    <button id="test">Testar chave</button>
    <a class="button" id="install" href="#" hidden>Instalar no Stremio</a>
  </div>
  <div id="status"></div>
  <small>V0.1 é voltada a teste local. A URL instalada contém sua authKey, portanto não compartilhe a URL do manifest. A versão pública usará um token opaco próprio.</small>
</main>
<script>
  const baseUrl = ${safeBaseUrl};
  const keyInput = document.getElementById('authKey');
  const testButton = document.getElementById('test');
  const install = document.getElementById('install');
  const status = document.getElementById('status');

  testButton.addEventListener('click', async () => {
    const authKey = keyInput.value.trim();
    install.hidden = true;
    if (!authKey) return;
    status.className = '';
    status.textContent = 'Testando...';
    try {
      const response = await fetch('/api/test-auth', {
        method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({authKey})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao validar');
      const manifestUrl = baseUrl + '/' + encodeURIComponent(authKey) + '/manifest.json';
      const stremioUrl = manifestUrl.replace(/^https?:\/\//, 'stremio://');
      install.href = stremioUrl;
      install.hidden = false;
      status.className = 'good';
      status.textContent = 'Chave válida. Biblioteca encontrada: ' + data.libraryItems + ' itens.';
    } catch (error) {
      status.className = 'bad';
      status.textContent = error.message;
    }
  });
</script>
</body>
</html>`;
}

module.exports = { setupPage };
