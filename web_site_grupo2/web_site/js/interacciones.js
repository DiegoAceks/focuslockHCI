document.addEventListener('DOMContentLoaded', () => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const notify = (message) => {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(notify.timeout);
    notify.timeout = setTimeout(() => toast.classList.remove('show'), 3600);
  };
  const readJSON = (key, fallback) => {
    try { const data = JSON.parse(localStorage.getItem(key)); return data ?? fallback; }
    catch { return fallback; }
  };
  const save = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { notify('No se pudo guardar en este navegador.'); }
  };
  const header = $('.cabecera');
  const progress = $('.barra-progreso');
  const scrollUpdate = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = (max > 0 ? 100 * scrollY / max : 0) + '%';
    header?.classList.toggle('scrolled', scrollY > 20);
  };
  addEventListener('scroll', scrollUpdate, {passive:true});
  addEventListener('resize', scrollUpdate);
  scrollUpdate();
  const nav = $('#navegacion');
  const menu = $('#menu-movil');
  menu?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.textContent = open ? '✕' : '☰';
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    if (menu) {menu.setAttribute('aria-expanded','false'); menu.textContent = '☰';}
  }));
  const theme = $('#tema');
  let dark = readJSON('focuslock-theme',false) === true;
  const applyTheme = () => {
    document.body.classList.toggle('dark', dark);
    if (theme) {theme.textContent = dark ? '☀' : '☾'; theme.setAttribute('aria-label',dark ? 'Activar modo claro' : 'Activar modo oscuro');}
  };
  applyTheme();
  theme?.addEventListener('click', () => {dark = !dark;applyTheme();save('focuslock-theme',dark);});
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => entries.forEach(entry => {
      if (entry.isIntersecting) {entry.target.classList.add('in-view');observer.unobserve(entry.target);}
    }), {threshold:.08});
    $$('.feature-card,.section-heading,.stats-panel,.side-card,.beta-card,.faq-list').forEach(el => {el.classList.add('reveal');observer.observe(el);});
  }
  let blocks = readJSON('focuslock-blocks',['TikTok','Instagram','YouTube']);
  if (!Array.isArray(blocks)) blocks = [];
  blocks = blocks.filter(x => typeof x === 'string').slice(0,12);
  const blockList = $('#bloqueos');
  const blockInput = $('#bloqueo-input');
  const blockMessage = $('#bloqueo-mensaje');
  const renderBlocks = () => {
    if (!blockList) return;
    blockList.replaceChildren();
    blocks.forEach((text,i) => {
      const chip = document.createElement('span'); chip.className='chip';
      const label = document.createElement('span');label.textContent=text;
      const remove = document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Quitar '+text);
      remove.addEventListener('click',()=>{blocks.splice(i,1);save('focuslock-blocks',blocks);renderBlocks();notify('Distracción eliminada');});
      chip.append(label,remove);blockList.append(chip);
    });
    if (!blocks.length) blockMessage.textContent = 'Tu lista está vacía. Puedes añadir una distracción.';
    else blockMessage.textContent='';
  };
  renderBlocks();
  $('#form-bloqueo')?.addEventListener('submit',e=>{
    e.preventDefault();
    const val=blockInput.value.trim().replace(/\s+/g,' ');
    if (val.length < 2) {blockMessage.textContent='Escribe al menos 2 caracteres.';return;}
    if (blocks.some(x=>x.toLowerCase()===val.toLowerCase())) {blockMessage.textContent='Ya está en tu lista.';return;}
    if (blocks.length>=12) {blockMessage.textContent='Máximo 12 distracciones.';return;}
    blocks.push(val);save('focuslock-blocks',blocks);renderBlocks();blockInput.value='';notify('Añadido a tu lista de distracciones');
  });
  const phrases = [
    'No necesitas hacerlo perfecto, solo empezar.',
    'Una tarea a la vez también es avanzar.',
    'Descansar forma parte de aprender.',
    'Tu atención es un recurso valioso. Protégela.',
    'La constancia pesa más que la prisa.'
  ];
  let phrase=0;
  $('#otra-frase')?.addEventListener('click',()=>{phrase=(phrase+1)%phrases.length;$('#frase').textContent=phrases[phrase];});
  let stats=readJSON('focuslock-stats',{sessions:0,minutes:0});
  if (!stats || !Number.isFinite(stats.sessions) || !Number.isFinite(stats.minutes)) stats={sessions:0,minutes:0};
  const showStats=()=>{
    if (!$('#stat-sesiones'))return;
    $('#stat-sesiones').textContent=stats.sessions;
    $('#stat-minutos').textContent=stats.minutes;
    const target=stats.sessions<1?1:stats.sessions<4?4:stats.sessions<10?10:stats.sessions+5;
    $('#hito-texto').textContent=stats.sessions<1?'Primera sesión':stats.sessions<4?'4 sesiones completadas':stats.sessions<10?'10 sesiones completadas':'Sigue construyendo tu hábito';
    $('#hito-barra').style.width=Math.min(100,stats.sessions/target*100)+'%';
    $('#hito-detalle').textContent=`${stats.sessions} de ${target} sesiones hacia tu siguiente hito.`;
  };
  showStats();
  $('#borrar-progreso')?.addEventListener('click',()=>{
    if (!confirm('¿Quieres borrar todas tus estadísticas de sesiones?'))return;
    stats={sessions:0,minutes:0};save('focuslock-stats',stats);showStats();notify('Historial reiniciado');
  });
  const modeLength={focus:25,short:5,long:15};
  const modeLabels={focus:'Es hora de concentrarte',short:'Respira y toma una pausa',long:'Te ganaste un descanso'};
  let mode='focus', minutes=25, total=minutes*60, remaining=total, running=false, interval=null, endAt=0;
  const disp=$('#timer-display'),ring=$('#timer-ring'),status=$('#timer-estado'),toggle=$('#timer-toggle'),subtitle=$('#timer-subtitle');
  const format=(seconds)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  const renderTimer=()=>{
    if (!disp)return;
    disp.textContent=format(remaining);
    document.title=`${running?format(remaining)+' · ':''}FocusLock — Recupera tu enfoque`;
    ring.style.background=`conic-gradient(#215b48 ${100*(total-remaining)/total}%,#e1ebe0 0)`;
    toggle.textContent=running?'Ⅱ Pausar sesión':remaining<total?'▶ Continuar':'▶ Iniciar sesión';
    status.textContent=running?'EN CURSO':remaining<total?'EN PAUSA':'LISTO';
    subtitle.textContent=running?'Protege este momento':remaining<total?'Puedes retomar cuando quieras':'Un paso a la vez';
  };
  const pause=()=>{running=false;clearInterval(interval);interval=null;renderTimer();};
  const finish=()=>{
    pause();remaining=0;renderTimer();
    if (mode==='focus') {stats.sessions++;stats.minutes+=minutes;save('focuslock-stats',stats);showStats();notify(`¡Sesión completada! +${minutes} min de enfoque.`);}
    else notify('¡Pausa terminada! Puedes volver a enfocarte.');
    status.textContent='COMPLETADA';toggle.textContent='↺ Nueva sesión';
    try { if('Notification' in window && Notification.permission==='granted')new Notification('FocusLock',{body:'Tu sesión ha terminado.'}); } catch {}
  };
  const tick=()=>{remaining=Math.max(0,Math.ceil((endAt-Date.now())/1000));if(remaining===0)finish();else renderTimer();};
  const start=()=>{
    if (remaining===0) remaining=total;
    running=true;endAt=Date.now()+remaining*1000;
    clearInterval(interval);interval=setInterval(tick,250);renderTimer();
  };
  const reset=()=>{pause();remaining=total;renderTimer();};
  toggle?.addEventListener('click',()=>running?pause():start());
  $('#timer-reset')?.addEventListener('click',reset);
  $$('.timer-tabs button').forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.mode;minutes=modeLength[mode];total=minutes*60;remaining=total;pause();
    $$('.timer-tabs button').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    $$('.timer-presets button').forEach(b=>b.classList.toggle('selected',+b.dataset.min===minutes));
    $('#timer-etiqueta').textContent=modeLabels[mode];renderTimer();
  }));
  $$('.timer-presets button').forEach(button=>button.addEventListener('click',()=>{
    minutes=+button.dataset.min;total=minutes*60;remaining=total;pause();
    $$('.timer-presets button').forEach(b=>b.classList.toggle('selected',b===button));renderTimer();
  }));
  document.addEventListener('visibilitychange',()=>{if(running)tick();});
  renderTimer();
  const detail=$('#detalle'),counter=$('#contador-detalle');
  detail?.addEventListener('input',()=>{counter.textContent=`${detail.value.length} / 500`;});
});
