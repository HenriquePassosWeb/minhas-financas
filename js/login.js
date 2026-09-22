// Lógica da tela de login/cadastro

// Se já estiver logado, vai direto para o app
(async function verificarSessao() {
  const session = await Auth.getSession();
  if (session) {
    window.location.replace('index.html');
  }
})();

// Alterna entre as abas de login e cadastro
function mostrarAba(aba) {
  const formLogin = document.getElementById('formLogin');
  const formCadastro = document.getElementById('formCadastro');
  const tabLogin = document.getElementById('tabLogin');
  const tabCadastro = document.getElementById('tabCadastro');

  limparMensagem();

  if (aba === 'login') {
    formLogin.style.display = 'flex';
    formCadastro.style.display = 'none';
    tabLogin.classList.add('active');
    tabCadastro.classList.remove('active');
  } else {
    formLogin.style.display = 'none';
    formCadastro.style.display = 'flex';
    tabLogin.classList.remove('active');
    tabCadastro.classList.add('active');
  }
}

// Trata o envio do formulário de login
async function handleLogin(event) {
  event.preventDefault();
  const btn = document.getElementById('btnLogin');
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;

  btn.disabled = true;
  btn.textContent = 'Entrando...';
  limparMensagem();

  try {
    await Auth.login(email, senha);
    window.location.replace('index.html');
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
}

// Trata o envio do formulário de cadastro
async function handleCadastro(event) {
  event.preventDefault();
  const btn = document.getElementById('btnCadastro');
  const email = document.getElementById('cadastroEmail').value.trim();
  const senha = document.getElementById('cadastroSenha').value;
  const senhaConfirma = document.getElementById('cadastroSenhaConfirma').value;

  if (senha !== senhaConfirma) {
    mostrarMensagem('As senhas não coincidem.', 'erro');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Criando conta...';
  limparMensagem();

  try {
    await Auth.cadastrar(email, senha);
    mostrarMensagem(
      'Conta criada! Enviamos um email de confirmação. Confirme seu email antes de entrar.',
      'sucesso'
    );
    document.getElementById('formCadastro').reset();
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Criar conta';
  }
}

function mostrarMensagem(texto, tipo) {
  const el = document.getElementById('loginMessage');
  el.textContent = texto;
  el.className = `login-message ${tipo} visivel`;
}

function limparMensagem() {
  const el = document.getElementById('loginMessage');
  el.textContent = '';
  el.className = 'login-message';
}
