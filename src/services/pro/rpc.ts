// Release 3 · one untyped rpc entry point for the professional services.
//
// W1 note: the generated client's rpc overloads trip TS2589 with the new
// enums, so the services call through this narrow cast. Behaviour is the
// plain supabase.rpc; each caller casts its own row shape at the boundary.

import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";

type RpcResult = { data: unknown; error: PostgrestError | null };

const client = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<RpcResult> };

export function rpc(fn: string, args?: Record<string, unknown>): PromiseLike<RpcResult> {
  return client.rpc(fn, args);
}
