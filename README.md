# Site de casamento

Site estático conectado ao Supabase para exibir e administrar a lista de presentes,
receber confirmações de presença e guardar mensagens dos convidados.

## Chá de panela

A página `cha-de-panela.html` reutiliza o vídeo, a identidade, o local e o PIX do
casamento. A lista de presentes fica disponível somente nessa página. No site do
casamento, o mesmo PIX aparece em uma área de contribuição livre: o convidado
escolhe o valor, gera um QR Code e também pode copiar o código. As confirmações do
chá ficam em uma tabela separada no Supabase.

A página é acessada diretamente por `cha-de-panela.html`, sem login, senha ou código
individual. Ela não aparece no menu do casamento e não oferece link de retorno ao
`index.html`. O convidado informa o próprio nome ao confirmar a presença.

As confirmações do chá são administradas separadamente pelo endereço direto
`cha-de-panela-admin.html`. Esse painel usa exatamente o mesmo usuário e senha do
Supabase e a mesma autorização em `public.site_admins` usada pelo painel do
casamento. Ao navegar entre os dois painéis na mesma aba, a sessão já iniciada é
reaproveitada. O painel do casamento não exibe as confirmações do chá.

Para ativar o formulário, aplique a migração
`supabase/migrations/20260821130000_add_shower_guest_list_and_rsvp.sql` no projeto
Supabase. Enquanto a migração não for aplicada, a página pode ser visualizada
localmente, mas não registra confirmações.

Como o site atual é publicado como conteúdo estático no GitHub Pages, alguém que
saiba o endereço do `index.html` ainda pode digitá-lo manualmente. Impedir também
esse acesso exige uma barreira na hospedagem antes de servir o arquivo.

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

O gerenciamento da lista fica em `cha-de-panela-admin.html`. Esse painel usa
Supabase Auth, e somente usuários presentes em `public.site_admins` podem criar,
editar ou excluir presentes. O PIX continua configurado no painel do casamento,
com a mesma conta administrativa.

Ao publicar um presente, o site:

1. envia o link para a Edge Function `product-image`;
2. encontra a imagem principal da página;
3. salva uma cópia no bucket público `gift-images`;
4. insere o presente na tabela `public.gifts`.

Se uma loja bloquear a busca automática, o formulário aceita uma URL de imagem
manual.

A configuração da chave PIX é armazenada em `public.site_settings`. A leitura de
`pix_key` é pública para permitir que o navegador gere o QR Code e o código Copia
e Cola com o valor escolhido, mas sua escrita é restrita aos administradores por
RLS. Para uma chave de telefone, o painel acrescenta automaticamente o código
internacional `+55` quando o número é informado com DDD.

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
