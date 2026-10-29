
const HF_API_KEY = "hf_jZSjOMnjkqQPfkqAcAEoqaoEdCytLrKlC";

const usuariosManuaisPreCadastrados = [
    { nome: "Carlos Cliente", email: "cliente@nexus.com", senha: "123", tipo: "cliente" },
    { nome: "Ana Suporte TI", email: "atendente@nexus.com", senha: "123", tipo: "atendente" }
];

if (!localStorage.getItem('nexus_usuarios_cadastrados')) {
    localStorage.setItem('nexus_usuarios_cadastrados', JSON.stringify(usuariosManuaisPreCadastrados));
}

let usuarioLogado = JSON.parse(localStorage.getItem('nexus_usuario')) || null;
let chamados = JSON.parse(localStorage.getItem('nexus_chamados')) || [
    { id: '1001', assunto: 'Falha no acesso ao ERP', categoria: 'Sistemas e Software', descricao: 'Erro 502 ao tentar logar no sistema financeiro.', status: 'Pendente', autor: 'Carlos Cliente' }
];
let conversasChat = JSON.parse(localStorage.getItem('nexus_chats')) || [];
let primeiraMensagemEnviada = false;

document.addEventListener('DOMContentLoaded', () => {
    atualizarNavbarAuth();
    if (usuarioLogado) {
        if (usuarioLogado.tipo === 'atendente') {
            carregarPainelAtendente();
        } else {
            carregarPainelCliente();
        }
    }
});

// ==========================================
// NAVEGAÇÃO DE SEÇÕES (Single Page Application)
// ==========================================
function mostrarSecao(secaoId) {
    const secoes = ['home', 'status', 'faq', 'abrir-chamado', 'painel-cliente', 'painel-atendente'];
    
    secoes.forEach(id => {
        const el = document.getElementById(`secao-${id}`) || document.getElementById(id);
        if (el) {
            el.classList.add('section-hidden');
        }
    });

    if (secaoId === 'abrir-chamado' && usuarioLogado && usuarioLogado.tipo === 'atendente') {
        alert('Atendentes gerenciam chamados diretamente no painel de suporte.');
        mostrarSecao('painel-atendente');
        return;
    }

    const alvo = document.getElementById(`secao-${secaoId}`) || document.getElementById(secaoId);
    if (alvo) {
        alvo.classList.remove('section-hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ==========================================
// ACESSIBILIDADE
// ==========================================
let altoContrasteAtivo = false;
function toggleContraste() {
    altoContrasteAtivo = !altoContrasteAtivo;
    if (altoContrasteAtivo) {
        document.body.classList.add('high-contrast');
    } else {
        document.body.classList.remove('high-contrast');
    }
}

let nivelFonte = 16;
function mudarFonte(acao) {
    if (acao === 'aumentar' && nivelFonte < 20) {
        nivelFonte += 2;
    } else if (acao === 'diminuir' && nivelFonte > 12) {
        nivelFonte -= 2;
    }
    document.documentElement.style.fontSize = `${nivelFonte}px`;
}

// ==========================================
// MODAL DE AUTENTICAÇÃO E RECUPERAÇÃO
// ==========================================
function abrirModal(tipo) {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('section-hidden');
    alternarModalPara(tipo);
}

function fecharModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('section-hidden');
}

function alternarModalPara(tipo) {
    const contentLogin = document.getElementById('modal-content-login');
    const contentCadastro = document.getElementById('modal-content-cadastro');
    const contentRecuperar = document.getElementById('modal-content-recuperar');

    if (contentLogin) contentLogin.classList.add('section-hidden');
    if (contentCadastro) contentCadastro.classList.add('section-hidden');
    if (contentRecuperar) contentRecuperar.classList.add('section-hidden');

    if (tipo === 'login') {
        if (contentLogin) contentLogin.classList.remove('section-hidden');
    } else if (tipo === 'cadastro') {
        if (contentCadastro) contentCadastro.classList.remove('section-hidden');
    } else if (tipo === 'recuperar') {
        if (contentRecuperar) contentRecuperar.classList.remove('section-hidden');
        document.getElementById('form-recup-etapa1').classList.remove('section-hidden');
        document.getElementById('form-recup-etapa2').classList.add('section-hidden');
    }
}

const CODIGO_VALIDACAO_PREDEFINIDO = "7788";
let emailParaRecuperacao = "";

function enviarCodigoRecuperacao(e) {
    e.preventDefault();
    const emailInput = document.getElementById('recup-email').value.trim();
    const listaUsuarios = JSON.parse(localStorage.getItem('nexus_usuarios_cadastrados')) || [];

    const usuarioExiste = listaUsuarios.find(u => u.email === emailInput);
    if (!usuarioExiste) {
        alert('Este e-mail não foi encontrado na base corporativa.');
        return;
    }

    emailParaRecuperacao = emailInput;
    alert(`✉️ [SIMULAÇÃO DE E-MAIL]\nO sistema enviou um código de verificação para: ${emailInput}\n\nCódigo pré-definido para teste: 7788`);

    document.getElementById('form-recup-etapa1').classList.add('section-hidden');
    document.getElementById('form-recup-etapa2').classList.remove('section-hidden');
}

function redefinirSenha(e) {
    e.preventDefault();
    const codigoDigitado = document.getElementById('recup-codigo').value.trim();
    const novaSenha = document.getElementById('recup-nova-senha').value;

    if (codigoDigitado !== CODIGO_VALIDACAO_PREDEFINIDO) {
        alert('❌ Código de verificação inválido! Utilize o código pré-definido: 7788');
        return;
    }

    let listaUsuarios = JSON.parse(localStorage.getItem('nexus_usuarios_cadastrados')) || [];
    listaUsuarios = listaUsuarios.map(u => {
        if (u.email === emailParaRecuperacao) {
            u.senha = novaSenha;
        }
        return u;
    });

    localStorage.setItem('nexus_usuarios_cadastrados', JSON.stringify(listaUsuarios));
    alert('✅ Senha redefinida com sucesso! Faça login com sua nova senha.');
    alternarModalPara('login');
}

// ==========================================
// GERENCIAMENTO DE SESSÃO E USUÁRIOS
// ==========================================
function fazerCadastro(e) {
    e.preventDefault();
    const nome = document.getElementById('cad-nome').value.trim();
    const email = document.getElementById('cad-email').value.trim();
    const senha = document.getElementById('cad-senha').value;
    const tipo = document.getElementById('cad-tipo').value;

    const listaUsuarios = JSON.parse(localStorage.getItem('nexus_usuarios_cadastrados')) || [];
    
    if (listaUsuarios.some(u => u.email === email)) {
        alert('Este e-mail já está cadastrado.');
        return;
    }

    const novoUsuario = { nome, email, senha, tipo };
    listaUsuarios.push(novoUsuario);
    localStorage.setItem('nexus_usuarios_cadastrados', JSON.stringify(listaUsuarios));

    usuarioLogado = novoUsuario;
    localStorage.setItem('nexus_usuario', JSON.stringify(usuarioLogado));

    fecharModal();
    atualizarNavbarAuth();
    alert(`Cadastro realizado com sucesso! Bem-vindo(a), ${nome}`);

    if (tipo === 'atendente') {
        mostrarSecao('painel-atendente');
        carregarPainelAtendente();
    } else {
        mostrarSecao('painel-cliente');
        carregarPainelCliente();
    }
}

function fazerLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;

    const listaUsuarios = JSON.parse(localStorage.getItem('nexus_usuarios_cadastrados')) || [];
    const usuarioEncontrado = listaUsuarios.find(u => u.email === email && u.senha === senha);

    if (usuarioEncontrado) {
        usuarioLogado = usuarioEncontrado;
    } else {
        const tipoInferido = (email.includes('admin') || email.includes('suporte') || email.includes('atendente')) ? 'atendente' : 'cliente';
        usuarioLogado = { nome: email.split('@')[0], email, tipo: tipoInferido };
    }

    localStorage.setItem('nexus_usuario', JSON.stringify(usuarioLogado));

    fecharModal();
    atualizarNavbarAuth();
    alert(`Login efetuado com sucesso! Bem-vindo(a), ${usuarioLogado.nome} (${usuarioLogado.tipo.toUpperCase()})`);

    if (usuarioLogado.tipo === 'atendente') {
        mostrarSecao('painel-atendente');
        carregarPainelAtendente();
    } else {
        mostrarSecao('painel-cliente');
        carregarPainelCliente();
    }
}

function fazerLogout() {
    localStorage.removeItem('nexus_usuario');
    usuarioLogado = null;
    atualizarNavbarAuth();
    mostrarSecao('home');
    alert('Sessão encerrada com sucesso.');
}

function atualizarNavbarAuth() {
    const container = document.getElementById('auth-nav-buttons');
    if (!container) return;

    if (usuarioLogado) {
        const painelDestino = usuarioLogado.tipo === 'atendente' ? "mostrarSecao('painel-atendente')" : "mostrarSecao('painel-cliente')";
        container.innerHTML = `
            <button type="button" onclick="${painelDestino}" class="btn-secondary text-xs flex-center"><i class="fa-solid fa-user-gear"></i> ${usuarioLogado.nome} (${usuarioLogado.tipo})</button>
            <button type="button" onclick="fazerLogout()" class="btn-secondary text-xs" title="Sair da Conta"><i class="fa-solid fa-right-from-bracket"></i></button>
        `;
    } else {
        container.innerHTML = `
            <button type="button" onclick="abrirModal('login')" class="btn-secondary">Entrar</button>
            <button type="button" onclick="abrirModal('cadastro')" class="btn-primary">Cadastrar</button>
        `;
    }
}

// ==========================================
// CHAMADOS DE SUPORTE
// ==========================================
function enviarChamado(e) {
    e.preventDefault();
    if (!usuarioLogado) {
        alert('Você precisa estar logado para abrir um chamado.');
        abrirModal('login');
        return;
    }

    const assunto = document.getElementById('chamado-assunto').value.trim();
    const categoria = document.getElementById('chamado-categoria').value;
    const descricao = document.getElementById('chamado-descricao').value.trim();

    const novoChamado = {
        id: Date.now().toString().slice(-4),
        assunto,
        categoria,
        descricao,
        status: 'Pendente',
        autor: usuarioLogado.nome
    };

    chamados.unshift(novoChamado);
    localStorage.setItem('nexus_chamados', JSON.stringify(chamados));
    alert('Chamado aberto com sucesso!');

    document.getElementById('chamado-assunto').value = '';
    document.getElementById('chamado-descricao').value = '';

    if (usuarioLogado.tipo === 'atendente') {
        carregarPainelAtendente();
        mostrarSecao('painel-atendente');
    } else {
        carregarPainelCliente();
        mostrarSecao('painel-cliente');
    }
}

function carregarPainelCliente() {
    const container = document.getElementById('lista-chamados-cliente');
    if (!container) return;

    const meusChamados = chamados.filter(c => !usuarioLogado || c.autor === usuarioLogado.nome);
    
    if (meusChamados.length === 0) {
        container.innerHTML = `<p class="section-subtitle">Nenhum chamado aberto no momento.</p>`;
        return;
    }

    container.innerHTML = meusChamados.map(c => `
        <div class="panel-box flex-between">
            <div>
                <span class="badge">#${c.id} - ${c.categoria}</span>
                <h4 class="card-title mt-2">${c.assunto}</h4>
                <p class="card-text">${c.descricao}</p>
            </div>
            <span class="badge-status amber">${c.status}</span>
        </div>
    `).join('');
}

function carregarPainelAtendente() {
    const containerChamados = document.getElementById('lista-chamados-atendente');
    const containerChats = document.getElementById('lista-chats-atendente');
    const contadorFila = document.getElementById('contador-fila');

    if (contadorFila) {
        contadorFila.innerText = chamados.length + conversasChat.length;
    }

    if (containerChamados) {
        containerChamados.innerHTML = chamados.length > 0 ? chamados.map(c => `
            <div class="status-item">
                <div>
                    <span class="text-xs icon-primary font-bold">#${c.id} • ${c.categoria} • Por: ${c.autor}</span>
                    <h4 class="status-label mt-2">${c.assunto}</h4>
                </div>
                <button type="button" onclick="resolverChamado('${c.id}')" class="btn-primary text-xs">Resolver</button>
            </div>
        `).join('') : `<p class="text-xs text-slate-400">Nenhum chamado na fila.</p>`;
    }

    if (containerChats) {
        containerChats.innerHTML = conversasChat.length > 0 ? conversasChat.map((chat, idx) => `
            <div class="status-item" style="border-color: rgba(59, 130, 246, 0.4);">
                <div>
                    <span class="text-xs icon-emerald font-bold"><i class="fa-solid fa-headset"></i> Chat Humano Solicitado</span>
                    <h4 class="status-label mt-2">${chat.cliente || 'Cliente Anônimo'}</h4>
                    <p class="card-text text-xs">"${chat.ultimaMensagem}"</p>
                </div>
                <button type="button" onclick="atenderChat('${idx}')" class="btn-primary text-xs">Assumir</button>
            </div>
        `).join('') : `<p class="text-xs text-slate-400">Nenhum chat aguardando atendimento.</p>`;
    }
}

function resolverChamado(id) {
    chamados = chamados.filter(c => c.id !== id);
    localStorage.setItem('nexus_chamados', JSON.stringify(chamados));
    carregarPainelAtendente();
    alert('Chamado marcado como resolvido!');
}

function atenderChat(idx) {
    alert('Você assumiu a conversa com o cliente. O atendimento humano foi conectado.');
    conversasChat.splice(idx, 1);
    localStorage.setItem('nexus_chats', JSON.stringify(conversasChat));
    carregarPainelAtendente();
}

// ==========================================
// CHATBOT E TÓPICOS INTERATIVOS
// ==========================================
function toggleChatbot() {
    const janela = document.getElementById('chatbot-window');
    if (janela) janela.classList.toggle('section-hidden');
}

function abrirChatbot() {
    const janela = document.getElementById('chatbot-window');
    if (janela) janela.classList.remove('section-hidden');
}

function handleChatKey(e) {
    if (e.key === 'Enter') {
        enviarMensagemChat();
    }
}

function enviarMensagemTextoDireto(texto) {
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = texto;
        enviarMensagemChat();
    }
}

function gerarRespostaSimulada(texto) {
    const t = texto.toLowerCase();
    if (t.includes('vpn') || t.includes('rede')) {
        return "Para configurar a VPN da Nexus Core, acesse a Base de Conhecimento em nosso menu superior e siga o guia de importação do arquivo `.ovpn`.";
    }
    if (t.includes('senha') || t.includes('login') || t.includes('acesso')) {
        return "Para redefinir sua senha corporativa, utilize a opção de recuperação na tela de login ou abra um chamado na categoria Acessos.";
    }
    if (t.includes('atendente') || t.includes('humano')) {
        solicitarAtendimentoHumano();
        return "Encaminhando para um analista humano...";
    }
    return "Compreendi sua dúvida técnica. Como assistente virtual da Nexus Core, selecione uma das opções abaixo ou digite sua dúvida:";
}

async function enviarMensagemChat() {
    const input = document.getElementById('chat-input');
    if (!input) return;

    const texto = input.value.trim();
    if (!texto) return;

    adicionarMensagemUI(texto, 'user');
    input.value = '';

    const eraPrimeiraMensagem = !primeiraMensagemEnviada;
    primeiraMensagemEnviada = true;

    if (!HF_API_KEY || HF_API_KEY === "SUA_CHAVE_HUGGINGFACE_AQUI") {
        setTimeout(() => {
            const resp = gerarRespostaSimulada(texto);
            adicionarMensagemUI(resp, 'bot');
            if (eraPrimeiraMensagem) {
                adicionarTopicosSugestoesUI();
            }
        }, 800);
        return;
    }

    adicionarMensagemUI("Pensando...", 'bot-loading');

    try {
        const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta-llama/Meta-Llama-3-8B-Instruct",
                messages: [
                    { 
                        role: "system", 
                        content: "Você é o Nexus Copilot AI, assistente virtual de TI da Nexus Core Systems. Seja objetivo e prestativo." 
                    },
                    { role: "user", content: texto }
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });

        removerMensagemCarregamento();

        if (!response.ok) {
            throw new Error('Falha na API');
        }

        const data = await response.json();
        const respostaIA = data.choices[0].message.content;
        adicionarMensagemUI(respostaIA, 'bot');

        if (eraPrimeiraMensagem) {
            adicionarTopicosSugestoesUI();
        }

    } catch (error) {
        removerMensagemCarregamento();
        const respostaFallback = gerarRespostaSimulada(texto);
        adicionarMensagemUI(respostaFallback, 'bot');

        if (eraPrimeiraMensagem) {
            adicionarTopicosSugestoesUI();
        }
    }
}

function adicionarTopicosSugestoesUI() {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;

    const topicosDiv = document.createElement('div');
    topicosDiv.className = 'chat-msg-row bot';
    topicosDiv.innerHTML = `
        <div class="chat-avatar-bot"><i class="fa-solid fa-robot"></i></div>
        <div class="chat-bubble bot" style="display: flex; flex-direction: column; gap: 0.5rem;">
            <span>💡 <strong>Tópicos sugeridos de atendimento:</strong></span>
            <button onclick="enviarMensagemTextoDireto('Como configurar a VPN?')" style="background:#0284c7; color:#fff; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; text-align:left; font-size:12px;">📁 Configuração de VPN e Rede</button>
            <button onclick="enviarMensagemTextoDireto('Esqueci minha senha')" style="background:#0284c7; color:#fff; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; text-align:left; font-size:12px;">🔑 Redefinição de Senha e Acesso</button>
            <button onclick="solicitarAtendimentoHumano()" style="background:#059669; color:#fff; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; text-align:left; font-size:12px;"><i class="fa-solid fa-headset"></i> Falar com Atendente Humano</button>
        </div>
    `;
    container.appendChild(topicosDiv);
    container.scrollTop = container.scrollHeight;
}

function adicionarMensagemUI(texto, remetente) {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;

    if (remetente === 'user') {
        container.innerHTML += `
            <div class="chat-msg-row user">
                <div class="chat-bubble user">${texto}</div>
            </div>
        `;
    } else if (remetente === 'bot-loading') {
        container.innerHTML += `
            <div id="msg-loading" class="chat-msg-row bot">
                <div class="chat-avatar-bot"><i class="fa-solid fa-robot"></i></div>
                <div class="chat-bubble bot animate-pulse">Pensando...</div>
            </div>
        `;
    } else {
        container.innerHTML += `
            <div class="chat-msg-row bot">
                <div class="chat-avatar-bot"><i class="fa-solid fa-robot"></i></div>
                <div class="chat-bubble bot">${texto}</div>
            </div>
        `;
    }
    container.scrollTop = container.scrollHeight;
}

function removerMensagemCarregamento() {
    const loadingEl = document.getElementById('msg-loading');
    if (loadingEl) loadingEl.remove();
}

function solicitarAtendimentoHumano() {
    adicionarMensagemUI("Solicitação de atendimento humano acionada. Transferindo para um analista de plantão...", 'bot');

    const novoChat = {
        cliente: usuarioLogado ? usuarioLogado.nome : 'Visitante Anônimo',
        ultimaMensagem: 'Solicitou suporte humano via chatbot.'
    };
    conversasChat.unshift(novoChat);
    localStorage.setItem('nexus_chats', JSON.stringify(conversasChat));

    setTimeout(() => {
        adicionarMensagemUI("Você está na fila de atendimento humano. Um de nossos atendentes da Nexus Core assumirá a conversa em instantes.", 'bot');
        if (usuarioLogado && usuarioLogado.tipo === 'atendente') {
            carregarPainelAtendente();
        }
    }, 1000);
}