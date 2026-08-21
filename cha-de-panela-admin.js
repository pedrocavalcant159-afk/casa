'use strict';

const SUPABASE_URL='https://jzqhjoudeetjrhlhiaho.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_LHfM8AdX_u2PzdQPk7CZyQ_e8fEkcpl';
const CHAVE_SESSAO_ADMIN='sessaoAdminSupabase';
const headersPublicos=extras=>({apikey:SUPABASE_PUBLISHABLE_KEY,...extras});
const escaparHtml=texto=>{const el=document.createElement('div');el.textContent=String(texto??'');return el.innerHTML};
const formatarMoeda=valor=>Number(valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const lerListaSalva=(chave,padrao)=>{try{const valor=JSON.parse(localStorage.getItem(chave));return Array.isArray(valor)?valor:padrao}catch{return padrao}};

let sessaoAdmin;
try{sessaoAdmin=JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_ADMIN))||null}catch{sessaoAdmin=null}

const areaLogin=document.getElementById('admin-desconectado-cha');
const areaSessao=document.getElementById('admin-conectado-cha');
const emailLogado=document.getElementById('admin-email-logado-cha');
const statusAutenticacao=document.getElementById('admin-auth-status-cha');
const botaoAtualizar=document.getElementById('btn-atualizar-rsvp-cha');
const botaoAtualizarPresentes=document.getElementById('btn-atualizar-presentes-cha');
const resumoRespostas=document.getElementById('resumo-rsvp-cha');
const listaRespostas=document.getElementById('lista-admin-rsvp-cha');

function mensagemAdmin(texto,erro=false){statusAutenticacao.textContent=texto;statusAutenticacao.classList.toggle('error',erro)}
function atualizarInterfaceAdmin(){const conectado=Boolean(sessaoAdmin?.access_token);areaLogin.hidden=conectado;areaSessao.hidden=!conectado;emailLogado.textContent=conectado?(sessaoAdmin.user?.email||'administrador'):'';botaoAtualizar.disabled=!conectado;botaoAtualizarPresentes.disabled=!conectado;document.getElementById('btn-salvar-presente').disabled=!conectado;document.querySelectorAll('.btn-excluir-presente,.btn-editar-presente,.admin-delete').forEach(botao=>botao.disabled=!conectado);if(!conectado){resumoRespostas.textContent='Entre para carregar as confirmações.';listaRespostas.innerHTML='<p>Entre para carregar.</p>';document.getElementById('lista-admin-presentes').innerHTML='<p>Entre para carregar.</p>'}}
function guardarSessaoAdmin(dados){sessaoAdmin={access_token:dados.access_token,refresh_token:dados.refresh_token,user:dados.user,expires_at:Date.now()+(Number(dados.expires_in)||3600)*1000};sessionStorage.setItem(CHAVE_SESSAO_ADMIN,JSON.stringify(sessaoAdmin));atualizarInterfaceAdmin()}
function limparSessaoAdmin(){sessaoAdmin=null;sessionStorage.removeItem(CHAVE_SESSAO_ADMIN);atualizarInterfaceAdmin()}
async function renovarSessaoAdmin(){if(!sessaoAdmin?.refresh_token)return null;const resposta=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:headersPublicos({'Content-Type':'application/json'}),body:JSON.stringify({refresh_token:sessaoAdmin.refresh_token})});if(!resposta.ok){limparSessaoAdmin();return null}const dados=await resposta.json();guardarSessaoAdmin(dados);return sessaoAdmin.access_token}
async function tokenAdmin(){if(!sessaoAdmin?.access_token)return null;if(Number(sessaoAdmin.expires_at)>Date.now()+60000)return sessaoAdmin.access_token;return renovarSessaoAdmin()}
async function contaEhAdministradora(token,userId){if(!userId)return false;const resposta=await fetch(SUPABASE_URL+'/rest/v1/site_admins?select=user_id&user_id=eq.'+encodeURIComponent(userId)+'&limit=1',{headers:headersPublicos({Authorization:'Bearer '+token})});return resposta.ok&&(await resposta.json()).length>0}

let presentesAtuais=lerListaSalva('listaPresentes',[]);
let presenteEditando=null;
function statusPresente(texto,erro=false){const area=document.getElementById('presente-admin-status');area.textContent=texto;area.classList.toggle('error',erro)}
function renderizarPresentes(){const area=document.getElementById('lista-admin-presentes');area.innerHTML='';if(!presentesAtuais.length)area.innerHTML='<p>Nenhum presente cadastrado no chá.</p>';presentesAtuais.forEach(presente=>{const nome=escaparHtml(presente.nome);const desabilitado=sessaoAdmin?'':' disabled';area.insertAdjacentHTML('beforeend',`<div class="item-admin"><div><strong>${nome}</strong><small>${presente.totalCotas} cotas · ${formatarMoeda(presente.valorTotal)}</small></div><div class="item-admin-actions"><button class="btn-editar-presente" type="button" onclick="editarPresente(${presente.id})"${desabilitado}>Editar</button><button class="btn-excluir-presente admin-delete" type="button" onclick="excluirPresente(${presente.id})"${desabilitado}>Excluir</button></div></div>`)});localStorage.setItem('listaPresentes',JSON.stringify(presentesAtuais));atualizarInterfaceAdmin()}
async function carregarPresentesAdmin(){const token=await tokenAdmin();if(!token)return;const area=document.getElementById('lista-admin-presentes');botaoAtualizarPresentes.disabled=true;area.innerHTML='<p>Carregando...</p>';try{const resposta=await fetch(SUPABASE_URL+'/rest/v1/gifts?select=id,name,total_value,total_quotas,card_link,image_url,sort_order&active=eq.true&order=sort_order.asc,id.asc',{headers:headersPublicos({Authorization:'Bearer '+token})});if(!resposta.ok)throw new Error('Não foi possível carregar a lista de presentes.');presentesAtuais=(await resposta.json()).map(p=>({id:Number(p.id),nome:p.name,valorTotal:Number(p.total_value),totalCotas:Number(p.total_quotas),linkCartao:p.card_link||'',imagem:p.image_url||'',ordem:Number(p.sort_order)||0}));renderizarPresentes()}catch(erro){area.innerHTML=`<p>${escaparHtml(erro.message)}</p>`;statusPresente(erro.message,true)}finally{botaoAtualizarPresentes.disabled=!sessaoAdmin}}
function mostrarPreviaImagem(url,texto){document.getElementById('image-preview-admin-img').src=url;document.getElementById('image-preview-admin-text').textContent=texto;document.getElementById('image-preview-admin').hidden=false}
function editarPresente(id){if(!sessaoAdmin)return;const p=presentesAtuais.find(item=>item.id===Number(id));if(!p)return;presenteEditando={...p};document.getElementById('titulo-form-presente').textContent='Editar presente do chá';document.getElementById('nome-prod').value=p.nome;document.getElementById('valor-prod').value=p.valorTotal;document.getElementById('cotas-prod').value=p.totalCotas;document.getElementById('link-pgto-prod').value=p.linkCartao;document.getElementById('imagem-prod').value='';document.getElementById('btn-salvar-presente').textContent='Salvar alterações';document.getElementById('btn-cancelar-edicao').hidden=false;if(p.imagem)mostrarPreviaImagem(p.imagem,'Imagem atual');document.getElementById('form-add-presente').scrollIntoView({behavior:'smooth',block:'center'})}
function cancelarEdicaoPresente(){presenteEditando=null;document.getElementById('form-add-presente').reset();document.getElementById('titulo-form-presente').textContent='Lista de presentes do chá';document.getElementById('btn-salvar-presente').textContent='Publicar no chá';document.getElementById('btn-cancelar-edicao').hidden=true;document.getElementById('image-preview-admin').hidden=true;statusPresente('')}
async function buscarImagemProduto(link,token){const resposta=await fetch(SUPABASE_URL+'/functions/v1/product-image',{method:'POST',headers:headersPublicos({Authorization:'Bearer '+token,'Content-Type':'application/json'}),body:JSON.stringify({url:link})});const dados=await resposta.json().catch(()=>({}));if(!resposta.ok)throw new Error(dados.error||'Não foi possível obter a foto.');return dados}
document.getElementById('form-add-presente').addEventListener('submit',async function(evento){evento.preventDefault();const token=await tokenAdmin();if(!token)return;const botao=document.getElementById('btn-salvar-presente');const nome=document.getElementById('nome-prod').value.trim();const valor=Number(document.getElementById('valor-prod').value);const cotas=Number(document.getElementById('cotas-prod').value);const link=document.getElementById('link-pgto-prod').value.trim();let imagem=document.getElementById('imagem-prod').value.trim();botao.disabled=true;statusPresente('Salvando...');try{if(!imagem&&presenteEditando&&link===presenteEditando.linkCartao)imagem=presenteEditando.imagem;if(!imagem&&link){const dados=await buscarImagemProduto(link,token);imagem=dados.image_url;mostrarPreviaImagem(imagem,'Foto encontrada')}const corpo={name:nome,total_value:valor,total_quotas:cotas,card_link:link||null,image_url:imagem||null,active:true,updated_at:new Date().toISOString()};let metodo='POST';let url=SUPABASE_URL+'/rest/v1/gifts?select=id';if(presenteEditando){metodo='PATCH';url=SUPABASE_URL+'/rest/v1/gifts?id=eq.'+presenteEditando.id+'&select=id'}else corpo.sort_order=Math.max(0,...presentesAtuais.map(p=>p.ordem))+10;const resposta=await fetch(url,{method:metodo,headers:headersPublicos({Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify(corpo)});if(!resposta.ok)throw new Error('Não foi possível salvar o presente.');cancelarEdicaoPresente();await carregarPresentesAdmin();statusPresente('Presente salvo.')}catch(erro){statusPresente(erro.message||'Não foi possível salvar.',true)}finally{botao.disabled=!sessaoAdmin}});
async function excluirPresente(id){const token=await tokenAdmin();const presente=presentesAtuais.find(item=>item.id===Number(id));if(!token||!presente||!confirm(`Excluir “${presente.nome}” da lista do chá?`))return;statusPresente('Excluindo...');const resposta=await fetch(SUPABASE_URL+'/rest/v1/gifts?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:headersPublicos({Authorization:'Bearer '+token,Prefer:'return=minimal'})});if(resposta.ok){statusPresente('Presente excluído.');await carregarPresentesAdmin()}else statusPresente('Não foi possível excluir o presente.',true)}

async function carregarRespostasChaAdmin(){
  const token=await tokenAdmin();
  if(!token){mensagemAdmin('Entre para acessar as confirmações.',true);return}
  botaoAtualizar.disabled=true;
  listaRespostas.innerHTML='<p>Carregando...</p>';
  try{
    const resposta=await fetch(SUPABASE_URL+'/rest/v1/shower_guest_responses?select=id,guest_name,attending,updated_at&order=updated_at.desc',{headers:headersPublicos({Authorization:'Bearer '+token})});
    if(!resposta.ok)throw new Error('Não foi possível carregar. Verifique se a migração do chá foi aplicada no Supabase.');
    const dados=await resposta.json();
    const confirmados=dados.filter(item=>item.attending).length;
    const ausentes=dados.length-confirmados;
    resumoRespostas.textContent=`${dados.length} resposta(s): ${confirmados} confirmada(s) e ${ausentes} ausência(s).`;
    listaRespostas.innerHTML=dados.length?'':'<p>Nenhuma confirmação do chá ainda.</p>';
    dados.forEach(item=>listaRespostas.insertAdjacentHTML('beforeend',`<div class="admin-data shower-response"><strong>${escaparHtml(item.guest_name)}</strong><span>${item.attending?'Vai ao chá':'Não comparece'}</span><time datetime="${escaparHtml(item.updated_at)}">${new Date(item.updated_at).toLocaleDateString('pt-BR')}</time><button class="admin-delete" type="button" onclick="excluirRespostaChaAdmin(${Number(item.id)})">Excluir</button></div>`));
    atualizarInterfaceAdmin();
  }catch(erro){resumoRespostas.textContent='As confirmações não puderam ser carregadas.';listaRespostas.innerHTML=`<p>${escaparHtml(erro.message||'Não foi possível carregar.')}</p>`}
  finally{botaoAtualizar.disabled=!sessaoAdmin}
}

async function excluirRespostaChaAdmin(id){const token=await tokenAdmin();if(!token||!confirm('Excluir esta confirmação do chá?'))return;mensagemAdmin('Excluindo confirmação...');const resposta=await fetch(SUPABASE_URL+'/rest/v1/shower_guest_responses?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:headersPublicos({Authorization:'Bearer '+token,Prefer:'return=minimal'})});if(resposta.ok){mensagemAdmin('Confirmação do chá excluída.');await carregarRespostasChaAdmin()}else mensagemAdmin('Não foi possível excluir a confirmação.',true)}

document.getElementById('form-admin-login-cha').addEventListener('submit',async function(evento){
  evento.preventDefault();
  const botao=this.querySelector('button[type=submit]');
  botao.disabled=true;
  mensagemAdmin('Entrando...');
  try{
    const resposta=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:headersPublicos({'Content-Type':'application/json'}),body:JSON.stringify({email:document.getElementById('admin-email-cha').value.trim(),password:document.getElementById('admin-senha-cha').value})});
    const dados=await resposta.json();
    if(!resposta.ok)throw new Error(dados.error_description||dados.msg||'E-mail ou senha inválidos.');
    if(!(await contaEhAdministradora(dados.access_token,dados.user?.id)))throw new Error('Esta conta não está autorizada como administradora.');
    guardarSessaoAdmin(dados);
    this.reset();
    mensagemAdmin('Acesso liberado.');
    await Promise.all([carregarPresentesAdmin(),carregarRespostasChaAdmin()]);
  }catch(erro){limparSessaoAdmin();mensagemAdmin(erro.message||'Não foi possível entrar.',true)}
  finally{botao.disabled=false;atualizarInterfaceAdmin()}
});

document.getElementById('btn-sair-admin-cha').addEventListener('click',async()=>{const token=await tokenAdmin();if(token)fetch(SUPABASE_URL+'/auth/v1/logout',{method:'POST',headers:headersPublicos({Authorization:'Bearer '+token})}).catch(()=>{});limparSessaoAdmin();mensagemAdmin('Sessão encerrada.')});
botaoAtualizar.addEventListener('click',carregarRespostasChaAdmin);
botaoAtualizarPresentes.addEventListener('click',carregarPresentesAdmin);
document.getElementById('btn-cancelar-edicao').addEventListener('click',cancelarEdicaoPresente);

async function restaurarSessaoAdmin(){
  atualizarInterfaceAdmin();
  if(!sessaoAdmin)return;
  mensagemAdmin('Restaurando sessão...');
  const token=await tokenAdmin();
  if(!token||!(await contaEhAdministradora(token,sessaoAdmin.user?.id))){limparSessaoAdmin();mensagemAdmin('Entre novamente para acessar o painel.',true);return}
  atualizarInterfaceAdmin();
  mensagemAdmin('Sessão restaurada.');
  await Promise.all([carregarPresentesAdmin(),carregarRespostasChaAdmin()]);
}

restaurarSessaoAdmin();
