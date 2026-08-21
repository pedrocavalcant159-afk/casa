'use strict';

const SUPABASE_URL='https://jzqhjoudeetjrhlhiaho.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_LHfM8AdX_u2PzdQPk7CZyQ_e8fEkcpl';
const headersPublicos=extras=>({apikey:SUPABASE_PUBLISHABLE_KEY,...extras});
const formatarMoeda=valor=>Number(valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const escaparHtml=texto=>{const el=document.createElement('div');el.textContent=String(texto??'');return el.innerHTML};
const reduzirMovimento=matchMedia('(prefers-reduced-motion: reduce)').matches;

const menuToggle=document.querySelector('.menu-toggle');
const navLinks=document.getElementById('nav-links');
menuToggle.addEventListener('click',()=>{const abrir=!navLinks.classList.contains('open');navLinks.classList.toggle('open',abrir);menuToggle.classList.toggle('open',abrir);menuToggle.setAttribute('aria-expanded',String(abrir))});
navLinks.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{navLinks.classList.remove('open');menuToggle.classList.remove('open');menuToggle.setAttribute('aria-expanded','false')}));

const siteNav=document.querySelector('.site-nav');
const secoes=[...document.querySelectorAll('main>header,main>section,.site-footer')];
let quadroTema=0;
function atualizarTemaMenu(){quadroTema=0;const linha=siteNav.offsetHeight/2;const atual=secoes.find(secao=>{const limites=secao.getBoundingClientRect();return limites.top<=linha&&limites.bottom>linha});const escura=atual?.matches('.hero,.invitation-section,.gallery,.site-footer');siteNav.classList.toggle('nav-on-light',Boolean(atual&&!escura))}
function agendarTema(){if(!quadroTema)quadroTema=requestAnimationFrame(atualizarTemaMenu)}
addEventListener('scroll',agendarTema,{passive:true});addEventListener('resize',agendarTema);requestAnimationFrame(atualizarTemaMenu);

const heroVideo=document.getElementById('hero-video');
const soundToggle=document.getElementById('sound-toggle');
function atualizarControleSom(){const temAudio=Boolean(heroVideo.audioTracks?.length||heroVideo.mozHasAudio||heroVideo.webkitAudioDecodedByteCount);soundToggle.hidden=!temAudio}
heroVideo.addEventListener('loadedmetadata',atualizarControleSom);heroVideo.addEventListener('timeupdate',atualizarControleSom);
heroVideo.addEventListener('canplay',()=>document.body.classList.add('video-ready'),{once:true});
heroVideo.addEventListener('error',()=>{document.body.classList.remove('video-ready');soundToggle.hidden=true});
soundToggle.addEventListener('click',async()=>{try{heroVideo.muted=!heroVideo.muted;if(heroVideo.paused)await heroVideo.play();const ativo=!heroVideo.muted;soundToggle.setAttribute('aria-pressed',String(ativo));document.getElementById('sound-label').textContent=ativo?'Desativar som':'Ativar som'}catch{soundToggle.hidden=true}});


let observador;
function observarEntradas(){const itens=document.querySelectorAll('.reveal:not([data-seen])');if(!('IntersectionObserver'in window)||reduzirMovimento){itens.forEach(item=>item.classList.add('visible'));return}if(!observador)observador=new IntersectionObserver(entradas=>entradas.forEach(entrada=>{if(entrada.isIntersecting){entrada.target.classList.add('visible');observador.unobserve(entrada.target)}}),{threshold:.12,rootMargin:'0px 0px -35px'});itens.forEach(item=>{item.dataset.seen='true';observador.observe(item)})}


const coresPetala=['#ffb3bd','#fae86a','#43b02a','#fe8111','#cd0f4d'];
function criarPetalas(x,y,total=5){if(reduzirMovimento)return;for(let i=0;i<total;i++){const petala=document.createElement('i');petala.className='petal-pop';petala.style.left=x+'px';petala.style.top=y+'px';petala.style.background=coresPetala[i%coresPetala.length];petala.style.setProperty('--x',`${(Math.random()-.5)*170}px`);petala.style.setProperty('--y',`${(Math.random()-.75)*190}px`);document.body.appendChild(petala);setTimeout(()=>petala.remove(),950)}}
document.addEventListener('click',evento=>{if(evento.target.closest('button,.polaroid'))criarPetalas(evento.clientX,evento.clientY,4)});
document.getElementById('open-invite').addEventListener('click',function(){const card=document.getElementById('invitation-card');const aberto=card.classList.toggle('open');this.setAttribute('aria-expanded',String(aberto));if(aberto)criarPetalas(innerWidth/2,innerHeight/2,12)});

const dataCha=new Date(document.querySelector('.countdown').dataset.date);
function atualizarContagem(){const distancia=Math.max(0,dataCha-Date.now());document.getElementById('count-days').textContent=String(Math.floor(distancia/86400000)).padStart(3,'0');document.getElementById('count-hours').textContent=String(Math.floor(distancia%86400000/3600000)).padStart(2,'0');document.getElementById('count-minutes').textContent=String(Math.floor(distancia%3600000/60000)).padStart(2,'0');document.getElementById('count-seconds').textContent=String(Math.floor(distancia%60000/1000)).padStart(2,'0')}
atualizarContagem();setInterval(atualizarContagem,1000);
document.getElementById('calendar-button').addEventListener('click',()=>{const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Stefany e Pedro//Cha de Panela//PT','BEGIN:VEVENT','UID:cha-de-panela-stefany-pedro-20270418','DTSTAMP:20260821T120000Z','DTSTART:20270418T190000Z','DTEND:20270418T230000Z','SUMMARY:Chá de panela de Stefany e Pedro','LOCATION:Casa Pier - Espírito Santo','DESCRIPTION:Vamos celebrar juntos','END:VEVENT','END:VCALENDAR'].join('\r\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));link.download='cha-de-panela-stefany-e-pedro.ics';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),500)});

let chavePix=localStorage.getItem('chavePix')||'';
let presentes=[];
try{presentes=JSON.parse(localStorage.getItem('listaPresentes'))||[]}catch{presentes=[]}
async function carregarPix(){try{const resposta=await fetch(SUPABASE_URL+'/rest/v1/site_settings?select=setting_value&setting_key=eq.pix_key&limit=1',{headers:headersPublicos()});if(!resposta.ok)throw new Error();const dados=await resposta.json();if(dados.length){chavePix=dados[0].setting_value;localStorage.setItem('chavePix',chavePix)}}catch{console.warn('PIX global indisponível; usando o cache local.')}}
async function carregarPresentes(){const area=document.getElementById('container-presentes');area.innerHTML='<div class="empty-gifts"><p class="hand">Só um instante...</p><p>Estamos abrindo a lista.</p></div>';try{const resposta=await fetch(SUPABASE_URL+'/rest/v1/gifts?select=id,name,total_value,total_quotas,card_link,image_url,sort_order&active=eq.true&order=sort_order.asc,id.asc',{headers:headersPublicos()});if(!resposta.ok)throw new Error();presentes=(await resposta.json()).map(p=>({id:Number(p.id),nome:p.name,valorTotal:Number(p.total_value),totalCotas:Number(p.total_quotas),linkCartao:p.card_link||'',imagem:p.image_url||''}));localStorage.setItem('listaPresentes',JSON.stringify(presentes))}catch{console.warn('Lista global indisponível; usando o cache local.')}renderizarPresentes()}
function renderizarPresentes(){const area=document.getElementById('container-presentes');area.innerHTML='';if(!presentes.length){area.innerHTML='<div class="empty-gifts"><p class="hand">Estamos preparando cada detalhe com carinho.</p><p>A lista estará disponível em breve.</p></div>';return}presentes.forEach((presente,index)=>{const cota=presente.valorTotal/presente.totalCotas;const nome=escaparHtml(presente.nome);const imagem=presente.imagem?`<figure class="gift-image"><img src="${escaparHtml(presente.imagem)}" alt="${nome}" loading="lazy" decoding="async"></figure>`:'<div class="gift-image gift-image-placeholder"><span>com carinho</span></div>';const card=document.createElement('article');card.className='card-presente reveal';card.innerHTML=`${imagem}<span class="gift-number">PRESENTE ${String(index+1).padStart(2,'0')}</span><h3>${nome}</h3><div class="info-preco"><p>Valor total<br>${formatarMoeda(presente.valorTotal)}</p><p class="quota">${formatarMoeda(cota)} <small>/ cota</small></p></div><div class="controle-cotas"><label for="cha-qtd-${presente.id}">Quantas cotas?</label><input type="number" id="cha-qtd-${presente.id}" min="1" max="${presente.totalCotas}" value="1"></div><button class="button" type="button">Escolher presente</button>`;card.querySelector('button').addEventListener('click',()=>abrirCheckout(index,cota));area.appendChild(card)});observarEntradas()}

const modal=document.getElementById('modal-pagamento');
function abrirCheckout(index,valorCota){const presente=presentes[index];if(!presente)return;const campo=document.getElementById('cha-qtd-'+presente.id);const quantidade=Math.min(presente.totalCotas,Math.max(1,Number(campo.value)||1));const total=valorCota*quantidade;campo.value=quantidade;document.getElementById('resumo-compra').innerHTML=`<strong>${quantidade} cota(s)</strong> de <strong>${escaparHtml(presente.nome)}</strong><br><b>${formatarMoeda(total)}</b>`;document.getElementById('aviso-valor-pix').textContent=`Informe o valor exato de ${formatarMoeda(total)} no seu banco.`;document.getElementById('area-pix').hidden=!chavePix;const areaCartao=document.getElementById('area-cartao');areaCartao.hidden=!presente.linkCartao;if(presente.linkCartao)document.getElementById('btn-link-pagamento').href=presente.linkCartao;modal.hidden=false;document.body.classList.add('modal-open')}
function fecharModal(){modal.hidden=true;document.body.classList.remove('modal-open')}
document.getElementById('modal-close').addEventListener('click',fecharModal);modal.addEventListener('click',evento=>{if(evento.target===modal)fecharModal()});
document.getElementById('copy-pix').addEventListener('click',async function(){if(!chavePix)return;try{await navigator.clipboard.writeText(chavePix);this.textContent='Código copiado!'}catch{prompt('Copie o código PIX:',chavePix)}});

async function chamarRpc(nome,corpo){const resposta=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nome}`,{method:'POST',headers:headersPublicos({'Content-Type':'application/json'}),body:JSON.stringify(corpo)});const dados=await resposta.json().catch(()=>null);if(!resposta.ok){const erro=new Error(dados?.message||'Não foi possível enviar agora.');erro.status=resposta.status;throw erro}return dados}
function definirStatus(texto,tipo=''){const area=document.getElementById('shower-rsvp-status');area.textContent=texto;area.className='form-status '+tipo}
document.getElementById('shower-rsvp-form').addEventListener('submit',async function(evento){evento.preventDefault();if(this.website.value)return;const botao=this.querySelector('button[type=submit]');const dados=new FormData(this);const nome=String(dados.get('name')||'').trim();botao.disabled=true;definirStatus('Enviando...');try{await chamarRpc('submit_shower_rsvp',{p_guest_name:nome,p_attending:dados.get('attendance')==='sim'});definirStatus('Presença no chá registrada! Você pode enviar novamente para atualizar.','success');this.reset();criarPetalas(innerWidth*.72,innerHeight*.5,16)}catch(erro){definirStatus(erro.message,'error')}finally{botao.disabled=false}});

Promise.all([carregarPix(),carregarPresentes()]);observarEntradas();requestAnimationFrame(atualizarTemaMenu);

document.addEventListener('keydown',evento=>{if(evento.key==='Escape'){fecharModal();navLinks.classList.remove('open');menuToggle.classList.remove('open')}});
