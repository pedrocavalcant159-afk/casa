'use strict';

const SUPABASE_URL='https://jzqhjoudeetjrhlhiaho.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_LHfM8AdX_u2PzdQPk7CZyQ_e8fEkcpl';
const CHAVE_SESSAO_ADMIN='sessaoAdminSupabase';
const headersPublicos=extras=>({apikey:SUPABASE_PUBLISHABLE_KEY,...extras});
const escaparHtml=texto=>{const el=document.createElement('div');el.textContent=String(texto??'');return el.innerHTML};

let sessaoAdmin;
try{sessaoAdmin=JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_ADMIN))||null}catch{sessaoAdmin=null}

const areaLogin=document.getElementById('admin-desconectado-cha');
const areaSessao=document.getElementById('admin-conectado-cha');
const emailLogado=document.getElementById('admin-email-logado-cha');
const statusAutenticacao=document.getElementById('admin-auth-status-cha');
const botaoAtualizar=document.getElementById('btn-atualizar-rsvp-cha');
const resumoRespostas=document.getElementById('resumo-rsvp-cha');
const listaRespostas=document.getElementById('lista-admin-rsvp-cha');

function mensagemAdmin(texto,erro=false){statusAutenticacao.textContent=texto;statusAutenticacao.classList.toggle('error',erro)}
function atualizarInterfaceAdmin(){const conectado=Boolean(sessaoAdmin?.access_token);areaLogin.hidden=conectado;areaSessao.hidden=!conectado;emailLogado.textContent=conectado?(sessaoAdmin.user?.email||'administrador'):'';botaoAtualizar.disabled=!conectado;if(!conectado){resumoRespostas.textContent='Entre para carregar as confirmações.';listaRespostas.innerHTML='<p>Entre para carregar.</p>'}}
function guardarSessaoAdmin(dados){sessaoAdmin={access_token:dados.access_token,refresh_token:dados.refresh_token,user:dados.user,expires_at:Date.now()+(Number(dados.expires_in)||3600)*1000};sessionStorage.setItem(CHAVE_SESSAO_ADMIN,JSON.stringify(sessaoAdmin));atualizarInterfaceAdmin()}
function limparSessaoAdmin(){sessaoAdmin=null;sessionStorage.removeItem(CHAVE_SESSAO_ADMIN);atualizarInterfaceAdmin()}
async function renovarSessaoAdmin(){if(!sessaoAdmin?.refresh_token)return null;const resposta=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:headersPublicos({'Content-Type':'application/json'}),body:JSON.stringify({refresh_token:sessaoAdmin.refresh_token})});if(!resposta.ok){limparSessaoAdmin();return null}const dados=await resposta.json();guardarSessaoAdmin(dados);return sessaoAdmin.access_token}
async function tokenAdmin(){if(!sessaoAdmin?.access_token)return null;if(Number(sessaoAdmin.expires_at)>Date.now()+60000)return sessaoAdmin.access_token;return renovarSessaoAdmin()}
async function contaEhAdministradora(token,userId){if(!userId)return false;const resposta=await fetch(SUPABASE_URL+'/rest/v1/site_admins?select=user_id&user_id=eq.'+encodeURIComponent(userId)+'&limit=1',{headers:headersPublicos({Authorization:'Bearer '+token})});return resposta.ok&&(await resposta.json()).length>0}

async function carregarRespostasChaAdmin(){
  const token=await tokenAdmin();
  if(!token){mensagemAdmin('Entre para acessar as confirmações.',true);return}
  botaoAtualizar.disabled=true;
  listaRespostas.innerHTML='<p>Carregando...</p>';
  try{
    const resposta=await fetch(SUPABASE_URL+'/rest/v1/shower_guest_responses?select=guest_name,attending,updated_at&order=updated_at.desc',{headers:headersPublicos({Authorization:'Bearer '+token})});
    if(!resposta.ok)throw new Error('Não foi possível carregar. Verifique se a migração do chá foi aplicada no Supabase.');
    const dados=await resposta.json();
    const confirmados=dados.filter(item=>item.attending).length;
    const ausentes=dados.length-confirmados;
    resumoRespostas.textContent=`${dados.length} resposta(s): ${confirmados} confirmada(s) e ${ausentes} ausência(s).`;
    listaRespostas.innerHTML=dados.length?'':'<p>Nenhuma confirmação do chá ainda.</p>';
    dados.forEach(item=>listaRespostas.insertAdjacentHTML('beforeend',`<div class="admin-data shower-response"><strong>${escaparHtml(item.guest_name)}</strong><span>${item.attending?'Vai ao chá':'Não comparece'}</span><time datetime="${escaparHtml(item.updated_at)}">${new Date(item.updated_at).toLocaleDateString('pt-BR')}</time></div>`));
  }catch(erro){resumoRespostas.textContent='As confirmações não puderam ser carregadas.';listaRespostas.innerHTML=`<p>${escaparHtml(erro.message||'Não foi possível carregar.')}</p>`}
  finally{botaoAtualizar.disabled=!sessaoAdmin}
}

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
    await carregarRespostasChaAdmin();
  }catch(erro){limparSessaoAdmin();mensagemAdmin(erro.message||'Não foi possível entrar.',true)}
  finally{botao.disabled=false;atualizarInterfaceAdmin()}
});

document.getElementById('btn-sair-admin-cha').addEventListener('click',async()=>{const token=await tokenAdmin();if(token)fetch(SUPABASE_URL+'/auth/v1/logout',{method:'POST',headers:headersPublicos({Authorization:'Bearer '+token})}).catch(()=>{});limparSessaoAdmin();mensagemAdmin('Sessão encerrada.')});
botaoAtualizar.addEventListener('click',carregarRespostasChaAdmin);

async function restaurarSessaoAdmin(){
  atualizarInterfaceAdmin();
  if(!sessaoAdmin)return;
  mensagemAdmin('Restaurando sessão...');
  const token=await tokenAdmin();
  if(!token||!(await contaEhAdministradora(token,sessaoAdmin.user?.id))){limparSessaoAdmin();mensagemAdmin('Entre novamente para acessar o painel.',true);return}
  atualizarInterfaceAdmin();
  mensagemAdmin('Sessão restaurada.');
  await carregarRespostasChaAdmin();
}

restaurarSessaoAdmin();
