# YouFit — pedidos de salada

Site estático (Next.js, `output: export`) + Supabase (Postgres, RLS, RPC `create_order`, Auth).
Cliente monta o pedido, escolhe os dias de entrega e finaliza por Pix/WhatsApp; a dona opera tudo em `/admin`.

## Rodar local

```bash
npm install
cp .env.example .env.local   # preencha URL e chave publicável do Supabase
npm run dev
```

## Checks

```bash
npm test          # unit + componentes (Vitest)
npm run typecheck
npm run build     # gera out/
npm run verify:sql
```

## Supabase

Migrations em `supabase/migrations/` (aplicar em ordem). Já aplicadas no projeto `salada` (`zjhncefsxgteuzkgzrpa`).

Primeiro admin: crie o usuário em Authentication e rode

```sql
update public.profiles set role = 'admin' where id = '<uuid do usuário>';
```

## Deploy

Vercel, projeto `youfit`, variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (somente a chave publicável; nunca a service role).
