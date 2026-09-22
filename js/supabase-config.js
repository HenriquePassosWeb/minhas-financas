// Configuração do cliente Supabase
// A anon key é pública (role "anon") e pode ficar no frontend com segurança.
// O acesso aos dados é protegido por Row Level Security (RLS) no Supabase.

const SUPABASE_URL = 'https://lwnwwaonhsmggmldtkgk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3bnd3YW9uaHNtZ2dtbGR0a2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMTY3ODksImV4cCI6MjEwNTU5Mjc4OX0.gg2y8m7k_AivMnaYabMuvbEMtIePVrBhfBHeO6nhQSE';

// Cria o cliente global do Supabase (a lib é carregada via CDN no HTML)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
