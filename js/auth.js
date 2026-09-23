// Módulo de autenticação - Supabase Auth
// Responsável por: cadastro, login, logout e consulta de sessão.

const Auth = {
  // Retorna a sessão atual (ou null se não logado)
  async getSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      return null;
    }
    return data.session;
  },

  // Retorna o usuário atual (ou null)
  async getUser() {
    const { data } = await supabaseClient.auth.getUser();
    return data ? data.user : null;
  },

  // Faz login com email e senha
  async login(email, senha) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: senha
    });

    if (error) {
      throw new Error(traduzirErro(error.message));
    }
    return data;
  },

  // Cadastra novo usuário (dispara email de confirmação)
  async cadastrar(email, senha) {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: senha
    });

    if (error) {
      throw new Error(traduzirErro(error.message));
    }
    return data;
  },

  // Encerra a sessão
  async logout() {
    await supabaseClient.auth.signOut();
  }
};

// Traduz mensagens de erro comuns do Supabase para português
function traduzirErro(mensagem) {
  const mapa = {
    'Invalid login credentials': 'Email ou senha incorretos.',
    'Email not confirmed': 'Confirme seu email antes de entrar. Verifique sua caixa de entrada.',
    'User already registered': 'Este email já está cadastrado.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'Unable to validate email address: invalid format': 'Formato de email inválido.',
    'Error sending confirmation email': 'Não foi possível enviar o email de confirmação no momento. Tente novamente em alguns minutos.',
    'Email rate limit exceeded': 'Muitas tentativas de envio de email. Aguarde alguns minutos e tente novamente.',
    'Signup requires a valid password': 'Informe uma senha válida.'
  };
  return mapa[mensagem] || mensagem;
}
