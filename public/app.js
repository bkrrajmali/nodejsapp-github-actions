(function () {
  const $ = (id) => document.getElementById(id);

  function formatUptime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h ? `${h}h ${m}m` : m ? `${m}m ${sec}s` : `${sec}s`;
  }

  let uptime = 0;

  async function loadInfo() {
    const info = await (await fetch('/api/info')).json();
    $('version').textContent = 'v' + info.version;
    $('commit').textContent = info.build.commit;
    $('hostname').textContent = info.hostname;
    $('node').textContent = info.node;
    $('env').textContent = info.environment;
    $('builtAt').textContent = info.build.builtAt ? new Date(info.build.builtAt).toLocaleString() : 'not built';
    uptime = info.uptimeSeconds;
    $('uptime').textContent = formatUptime(uptime);
  }

  setInterval(() => {
    uptime += 1;
    $('uptime').textContent = formatUptime(uptime);
  }, 1000);

  async function loadPipeline() {
    const { stages } = await (await fetch('/api/pipeline')).json();
    $('pipeline').innerHTML = stages
      .map(
        (s) => `<li class="stage" data-id="${s.id}">
          <span class="icon">${s.icon}</span>
          <div class="name">${s.name}</div>
          <div class="tool">${s.tool}</div>
          <div class="status">queued</div>
        </li>`
      )
      .join('');
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function simulate() {
    const btn = $('run');
    btn.disabled = true;
    const stages = [...document.querySelectorAll('.stage')];
    stages.forEach((el) => {
      el.className = 'stage';
      el.querySelector('.status').textContent = 'queued';
    });
    for (const el of stages) {
      el.classList.add('running');
      el.querySelector('.status').textContent = 'running…';
      await sleep(600 + Math.random() * 700);
      el.classList.replace('running', 'done');
      el.querySelector('.status').textContent = '✓ passed';
    }
    btn.disabled = false;
  }

  $('run').addEventListener('click', simulate);

  $('echo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('/api/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: $('echo-input').value }),
    });
    $('echo-out').textContent = `HTTP ${res.status}\n` + JSON.stringify(await res.json(), null, 2);
  });

  loadInfo().catch(console.error);
  loadPipeline().catch(console.error);
})();
