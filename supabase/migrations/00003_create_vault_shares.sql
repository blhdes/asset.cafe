CREATE TABLE public.vault_shares (
  vault_hash TEXT PRIMARY KEY,
  share_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vault_shares_share_hash ON public.vault_shares (share_hash);

ALTER TABLE public.vault_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_shares_select" ON public.vault_shares FOR SELECT USING (true);
CREATE POLICY "vault_shares_insert" ON public.vault_shares FOR INSERT WITH CHECK (true);
CREATE POLICY "vault_shares_update" ON public.vault_shares FOR UPDATE USING (true);
