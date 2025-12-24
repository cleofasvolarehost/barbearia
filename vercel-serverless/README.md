Estrutura pronta para Vercel Serverless Functions (backend separado):

- `api/iugu/checkout/pix.js`: endpoint de Pix com CORS dinâmico e tratamento de preflight.
- `api/iugu/checkout/card.js`: endpoint de Cartão com CORS dinâmico e tratamento de preflight.

Variáveis de ambiente necessárias na Vercel:

- `IUGU_API_TOKEN`: token da API Iugu.
- `CORS_ALLOWED_ORIGINS`: lista separada por vírgula. Exemplos:
  - `*.crdev.app,https://www.crdev.app,https://crdev.app`
  - incluir domínios de produção e preview conforme necessidade.

Passos para usar:

1. Copie a pasta `api` para o repositório do backend usado pelo `api.crdev.app`.
2. Configure as variáveis de ambiente no projeto Vercel.
3. Faça o deploy. Teste o preflight:
   - `OPTIONS https://api.crdev.app/api/iugu/checkout/pix` deve responder `204` com cabeçalhos CORS.
4. Teste o `POST` com JSON válido e confirme retorno `200` ou erro 4xx sem `500`.

