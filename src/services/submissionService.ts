interface SubmitModelPayload {
  hfUrl: string;
  name?: string;
  tasks: string[];
  params: number;
  license?: string;
  prompts: string[];
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function parseHfModelId(hfUrl: string): string | null {
  try {
    const url = new URL(hfUrl.trim());
    if (url.hostname !== "huggingface.co") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1]}`;
  } catch {
    return null;
  }
}

export async function submitModel(payload: SubmitModelPayload): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const hf_model_id = parseHfModelId(payload.hfUrl);
  if (!hf_model_id) {
    throw new Error("Invalid Hugging Face URL. Use https://huggingface.co/org/model.");
  }

  const body = {
    hf_model_id,
    hf_url: payload.hfUrl.trim(),
    name: payload.name?.trim() || hf_model_id,
    tasks: payload.tasks,
    params: payload.params,
    license: payload.license?.trim() || null,
    prompts: payload.prompts,
    status: "pending",
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/model_submissions`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to submit: ${res.status} ${res.statusText} - ${text}`);
  }
}
