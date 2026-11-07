import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const paths = {
  config: "supabase/config.toml",
  schema: "supabase/migrations/202611070001_initial_schema.sql",
  rpc: "supabase/migrations/202611070002_create_order_rpc.sql",
  seed: "supabase/migrations/202611070003_seed_catalog.sql",
  tests: "supabase/tests/ordering_contract.sql",
  types: "src/lib/supabase/database.types.ts",
};

const failures = [];

async function readContractFile(label, path) {
  try {
    return await readFile(resolve(root, path), "utf8");
  } catch (error) {
    failures.push(`${label}: missing ${path} (${error.code ?? error.message})`);
    return "";
  }
}

function normalize(sql) {
  return sql
    .replace(/--.*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

function requireNoMatch(source, pattern, message) {
  if (pattern.test(source)) failures.push(message);
}

const entries = await Promise.all(
  Object.entries(paths).map(async ([label, path]) => [label, await readContractFile(label, path)]),
);
const files = Object.fromEntries(entries);
const schema = normalize(files.schema);
const rpc = normalize(files.rpc);
const seed = normalize(files.seed);
const tests = normalize(files.tests);
const types = files.types;
let allMigrations = "";
try {
  const migrationFiles = (await readdir(resolve(root, "supabase/migrations")))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  allMigrations = normalize(
    (
      await Promise.all(
        migrationFiles.map((name) =>
          readFile(resolve(root, "supabase/migrations", name), "utf8"),
        ),
      )
    ).join("\n"),
  );
} catch (error) {
  failures.push(`migrations: unable to inspect all migrations (${error.code ?? error.message})`);
}

const tables = [
  "profiles",
  "products",
  "combos",
  "combo_products",
  "delivery_days",
  "orders",
  "order_deliveries",
  "order_items",
  "business_settings",
];

for (const table of tables) {
  requireMatch(
    schema,
    new RegExp(`create table public\\.${table}\\b`),
    `schema: public.${table} must be created`,
  );
  requireMatch(
    schema,
    new RegExp(`alter table public\\.${table} enable row level security`),
    `security: RLS must be enabled on public.${table}`,
  );
}

for (const view of [
  "storefront_products",
  "storefront_combos",
  "storefront_delivery_days",
  "storefront_business_settings",
]) {
  requireMatch(
    schema,
    new RegExp(`create (?:or replace )?view public\\.${view} with \\(security_invoker = true\\)`),
    `security: public.${view} must be a security_invoker view`,
  );
  requireMatch(
    schema,
    new RegExp(`grant select on public\\.${view} to anon, authenticated`),
    `grants: public.${view} must be readable only through explicit anon/authenticated grants`,
  );
}

requireMatch(
  schema,
  /create (?:or replace )?function private\.is_admin\(\)[\s\S]*security definer[\s\S]*set search_path = ''/,
  "security: private.is_admin() must be SECURITY DEFINER with an empty search_path",
);
requireMatch(
  schema,
  /private\.is_admin[\s\S]*public\.profiles/,
  "security: admin authorization must read the protected public.profiles table",
);
requireNoMatch(
  `${schema} ${rpc}`,
  /user_metadata|raw_user_meta_data|->\s*'role'|->>\s*'role'/,
  "security: authorization must not trust mutable user_metadata or JWT role fields",
);
requireMatch(
  schema,
  /revoke all on function private\.is_admin\(\) from public, anon, authenticated/,
  "grants: private.is_admin() must revoke default and direct execution first",
);
requireMatch(
  schema,
  /grant execute on function private\.is_admin\(\) to authenticated/,
  "grants: only authenticated callers may execute private.is_admin()",
);

requireMatch(
  rpc,
  /create (?:or replace )?function public\.create_order\(payload jsonb, idempotency_key uuid\) returns jsonb[\s\S]*security definer[\s\S]*set search_path = ''/,
  "rpc: create_order(jsonb, uuid) must be SECURITY DEFINER with an empty search_path",
);
requireMatch(
  rpc,
  /pg_catalog\.pg_advisory_xact_lock[\s\S]*idempotency_key/,
  "rpc: idempotency keys must be serialized with a transaction advisory lock",
);
requireMatch(
  rpc,
  /for update/,
  "rpc: delivery capacity must be protected by row locks",
);
requireMatch(
  rpc,
  /public\.products[\s\S]*unit_price_cents/,
  "rpc: unit prices must be loaded from public.products",
);
requireMatch(
  rpc,
  /reserved_quantity/,
  "rpc: capacity must be checked and reserved transactionally",
);
requireMatch(
  rpc,
  /minimum_delivery_count/,
  "rpc: combo minimum delivery counts must be enforced",
);
requireMatch(
  rpc,
  /created_at\s*>\s*pg_catalog\.now\(\)\s*-\s*interval\s+'15 minutes'/,
  "rpc: successful submissions must be throttled per normalized phone",
);
requireMatch(
  rpc,
  /revoke all on function public\.create_order\(jsonb, uuid\) from public, anon, authenticated/,
  "grants: create_order must revoke default and direct execution first",
);
requireMatch(
  rpc,
  /grant execute on function public\.create_order\(jsonb, uuid\) to anon, authenticated/,
  "grants: create_order must grant exactly anon/authenticated execution",
);
requireNoMatch(
  rpc,
  /grant execute on function public\.create_order\(jsonb, uuid\) to (?:public|service_role)/,
  "grants: create_order must not grant execution to PUBLIC or service_role explicitly",
);

for (const functionSql of allMigrations.matchAll(
  /create (?:or replace )?function ([a-z0-9_.]+)\([^;]*?\$\$[\s\S]*?\$\$\s*;/g,
)) {
  const [definition, name] = functionSql;
  if (definition.includes("security definer") && !definition.includes("set search_path = ''")) {
    failures.push(`security: ${name} is SECURITY DEFINER without an empty search_path`);
  }
  if (definition.includes("security definer")) {
    requireNoMatch(
      definition,
      /\b(?:from|join|insert into|update|delete from)\s+(?!public\.|private\.|auth\.|pg_catalog\.|lateral\s+|loop\b|set\b)[a-z_][a-z0-9_]*/,
      `security: ${name} contains an unqualified relation reference`,
    );
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    requireMatch(
      allMigrations,
      new RegExp(
        `revoke all on function ${escapedName}\\([^;]*\\) from public,\\s*anon,\\s*authenticated`,
      ),
      `grants: ${name} must revoke PUBLIC, anon, and authenticated execution explicitly`,
    );
    requireNoMatch(
      allMigrations,
      new RegExp(`grant execute on function ${escapedName}\\([^;]*\\) to public\\b`),
      `grants: ${name} must never grant execution to PUBLIC`,
    );
  }
}

requireMatch(seed, /frango grelhado/, "seed: common grilled chicken content is required");
requireMatch(seed, /ovo/, "seed: egg content is required");
requireMatch(seed, /milho/, "seed: corn content is required");
requireMatch(seed, /combo 3/, "seed: a three-delivery combo is required");
requireMatch(seed, /combo 5/, "seed: a five-delivery combo is required");
requireMatch(seed, /current_date/, "seed: next-week delivery examples must be relative to migration date");

for (const behavior of [
  "database price wins over a forged client price",
  "disabled delivery day is rejected",
  "full delivery day is rejected",
  "idempotency key returns the original order",
  "combo minimum delivery count is enforced",
  "anonymous reads expose only active catalog rows",
  "non-admin cannot mutate catalog",
]) {
  requireMatch(
    tests,
    new RegExp(behavior.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `tests: missing runtime contract: ${behavior}`,
  );
}

for (const table of tables) {
  requireMatch(
    types,
    new RegExp(`\\b${table}:\\s*\\{`),
    `types: Database must include public.Tables.${table}`,
  );
}
requireMatch(
  types,
  /create_order:\s*\{[\s\S]*Args:\s*\{[\s\S]*idempotency_key:\s*string[\s\S]*payload:\s*Json/,
  "types: Database must include create_order(payload, idempotency_key)",
);

if (failures.length > 0) {
  console.error(`SQL contract verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("SQL contract verification passed: schema, RLS, grants, RPC, seed, tests, and types agree.");
}
