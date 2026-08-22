import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ezjjpnhbntlyxliheijx.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_islKypO24S91WgWsykCxgA_hLLAkWIE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
