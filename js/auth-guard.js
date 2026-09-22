// Guardião de rota - protege o app.
// Se não houver sessão ativa, redireciona para a tela de login.
// Deve ser carregado ANTES dos scripts do app no index.html.

(async function protegerRota() {
  const session = await Auth.getSession();
  if (!session) {
    window.location.replace('login.html');
  }
})();

// Faz logout e volta para a tela de login
async function logout() {
  await Auth.logout();
  window.location.replace('login.html');
}
