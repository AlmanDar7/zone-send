export const normalizeCampaignName = (name: string) => name.trim().toLowerCase();

export type CampaignNameRow = { id?: string; name: string };

export const isCampaignNameTaken = (
  name: string,
  campaigns: CampaignNameRow[],
  excludeId?: string,
) => {
  const normalized = normalizeCampaignName(name);
  if (!normalized) return false;
  return campaigns.some(
    (c) => normalizeCampaignName(c.name) === normalized && c.id !== excludeId,
  );
};

export const campaignNameDuplicateMessage = (name: string) =>
  `A workflow named "${name.trim()}" already exists. Use a different name.`;

export type CampaignWithMeta = CampaignNameRow & { created_at?: string };

/** Keep the newest row per normalized name; return older duplicate ids. */
export const partitionDuplicateCampaigns = <T extends CampaignWithMeta>(campaigns: T[]) => {
  const seen = new Set<string>();
  const unique: T[] = [];
  const duplicateIds: string[] = [];

  const sorted = [...campaigns].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  for (const campaign of sorted) {
    const key = normalizeCampaignName(campaign.name);
    if (!key) {
      unique.push(campaign);
      continue;
    }
    if (seen.has(key)) {
      if (campaign.id) duplicateIds.push(campaign.id);
    } else {
      seen.add(key);
      unique.push(campaign);
    }
  }

  return { unique, duplicateIds };
};

export const parseCampaignNameConflict = (error: unknown): string | null => {
  const err = error as { code?: string; message?: string };
  if (err?.code === "23505") {
    return "A workflow with this name already exists. Use a different name.";
  }
  if (err?.message?.includes("campaigns_user_name_unique")) {
    return "A workflow with this name already exists. Use a different name.";
  }
  return null;
};
