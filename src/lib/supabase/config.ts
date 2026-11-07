export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não foi configurada.");
  }

  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith("http")) {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL precisa ser uma URL válida.");
  }

  if (!publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não foi configurada.",
    );
  }

  if (
    publishableKey.startsWith("sb_secret_") ||
    publishableKey.toLowerCase().includes("service_role")
  ) {
    throw new Error(
      "Use somente uma chave publicável do Supabase no navegador.",
    );
  }

  return { url, publishableKey };
}
