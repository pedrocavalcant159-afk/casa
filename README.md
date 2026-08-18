# Site de casamento

Site estático conectado ao Supabase para exibir e administrar a lista de presentes.

## Administração dos presentes

O painel **Acesso do casal** usa Supabase Auth. Somente usuários presentes em
`public.site_admins` podem criar ou excluir presentes.

Ao publicar um presente, o site:

1. envia o link para a Edge Function `product-image`;
2. encontra a imagem principal da página;
3. salva uma cópia no bucket público `gift-images`;
4. insere o presente na tabela `public.gifts`.

Se uma loja bloquear a busca automática, o formulário aceita uma URL de imagem
manual.

## Ativar o primeiro administrador

1. Crie um usuário em **Supabase Dashboard → Authentication → Users**.
2. Adicione o UUID desse usuário à tabela `public.site_admins`.
3. Entre pelo painel do casal usando o e-mail e a senha criados.

O projeto não contém chave secreta. A chave publicável presente no HTML é segura
para uso no navegador porque as operações são protegidas por RLS.

## Supabase

- Edge Function: `supabase/functions/product-image/index.ts`
- Configuração: `supabase/config.toml`
- Projeto: `jzqhjoudeetjrhlhiaho`
