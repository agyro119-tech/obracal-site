# Segurança do ObraCalc

## Hospedagem atual: GitHub Pages

O site estático pode definir algumas diretivas no próprio HTML, como a Content Security Policy (CSP) e a Referrer Policy, mas isso não substitui cabeçalhos HTTP enviados pelo servidor.

**O GitHub Pages não oferece configuração de cabeçalhos HTTP personalizados.** O arquivo `_headers` neste repositório não é aplicado pelo GitHub Pages; ele está preparado para uma futura hospedagem que suporte esse formato, como Cloudflare Pages. Não anuncie os cabeçalhos abaixo como ativos até validar as respostas HTTP do host final.

## Cabeçalhos preparados para Cloudflare Pages

O arquivo `_headers` inclui:
- `Content-Security-Policy` com restrições de origem, objetos e formulários e `frame-ancestors 'none'`;
- `X-Frame-Options: DENY`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` desativando câmera, microfone e geolocalização;
- `Strict-Transport-Security` com max-age de 15552000 segundos.

A CSP ainda permite scripts e estilos inline porque o site atual usa JavaScript e CSS embutidos. Isso é uma concessão de compatibilidade, não a política mais estrita possível. Se o código for refatorado para arquivos externos, reduza/remova `unsafe-inline`.

## Para tornar os cabeçalhos HTTP ativos

1. Crie ou acesse uma conta Cloudflare.
2. Importe/conecte este repositório em **Workers & Pages → Create → Pages → Connect to Git**.
3. Para este site estático, defina a publicação a partir da raiz do repositório (sem comando de build e diretório de saída `/`, conforme a interface permitir) e confirme que o arquivo `_headers` está no diretório de saída.
4. Faça o deploy e associe um domínio próprio no painel da Cloudflare, seguindo as instruções de DNS/TLS exibidas lá.
5. Teste o domínio final com um verificador de cabeçalhos HTTP ou com `curl -sSI https://SEU-DOMINIO/`. Confirme, no mínimo, os seis cabeçalhos listados acima.
6. Não considere os cabeçalhos ativos na URL `github.io` enquanto o host final não os enviar de fato.

Não altere registros DNS às cegas: o domínio precisa estar sob sua administração e configurado no painel do provedor antes de trocar a hospedagem.

## Testes de regressão

O workflow `.github/workflows/security-regression.yml` executa `node --test tests/security-regression.mjs` em cada push na branch `main`, pull request para `main` ou execução manual. Ele verifica o parser matemático, entradas inválidas e maliciosas, ausência de APIs de execução arbitrária, metadados CSP/referrer, proteção de dados locais e escaping do HTML dinâmico.
