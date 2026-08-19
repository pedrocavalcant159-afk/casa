# Site de casamento

Site estático conectado ao Supabase para exibir e administrar a lista de presentes,
receber confirmações de presença e guardar mensagens dos convidados.

## Vídeo de abertura

O site começa com um vídeo genérico gratuito da Pexels salvo em
`assets/video-casal.mp4`. Para usar o vídeo final do casal, basta substituir esse
arquivo mantendo o mesmo nome. Se o vídeo não carregar, a abertura usa
`assets/hero-casal.jpg` como fallback, sem deixar um espaço quebrado na página.

Vídeo atual: [Couple Walking on the Beach](https://www.pexels.com/video/couple-walking-on-the-beach-5183211/), de Bethany Ferr.

## Informações editáveis

- Data usada na contagem e no calendário: `2027-04-18T16:00:00-03:00`, em `index.html`.
- Cronograma, vestimenta e endereço: blocos `#informacoes` e `#local`, em `index.html`.
- Link de rota: busca do Google Maps por “Casa Pier Espírito Santo”. Troque pelo link
  exato do local quando o endereço estiver confirmado.

## Administração dos presentes

O painel **Acesso do casal** usa Supabase Auth. Somente usuários presentes em
`public.site_admins` podem criar, editar ou excluir presentes e alterar o PIX.

Ao publicar um presente, o site:

1. envia o link para a Edge Function `product-image`;
2. encontra a imagem principal da página;
3. salva uma cópia no bucket público `gift-images`;
4. insere o presente na tabela `public.gifts`.

Se uma loja bloquear a busca automática, o formulário aceita uma URL de imagem
manual.

O código PIX é armazenado em `public.site_settings`. A leitura da configuração
`pix_key` é pública para permitir o pagamento pelos convidados, mas sua escrita
é restrita aos administradores por RLS.

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
- Migração de RSVP e mensagens: `supabase/migrations/20260819102722_add_wedding_rsvp_and_guest_messages.sql`
