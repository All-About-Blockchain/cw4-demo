export interface MultisigConfig {
  currentFromEnv: string | null;
  alternatesFromConfig: string[];
}

// Current multisig derived from CW4_GROUP_ADDR env (frontend-readable variant)
const currentFromEnv =
  (
    process.env.NEXT_PUBLIC_CW4_GROUP_ADDR ||
    process.env.NEXT_PUBLIC_CW4_ADDR ||
    ''
  ).trim() || null;

// Alternates stored in code (can be edited and committed)
// Put known multisigs here; these will be shown with a Config badge
const alternatesFromConfig: string[] = [
  // 'juno1xxxx',
  // 'neutron1xxxx',
];

export const MULTISIG_CONFIG: MultisigConfig = {
  currentFromEnv,
  alternatesFromConfig,
};

export function mergeMultisigs(local: string[] = []): {
  all: string[];
  current: string | null;
} {
  const set = new Set<string>();
  if (MULTISIG_CONFIG.currentFromEnv) set.add(MULTISIG_CONFIG.currentFromEnv);
  for (const a of MULTISIG_CONFIG.alternatesFromConfig) set.add(a);
  for (const l of local) set.add(l);
  const all = Array.from(set);
  const current =
    MULTISIG_CONFIG.currentFromEnv || (all.length ? all[0] : null);
  return { all, current };
}
