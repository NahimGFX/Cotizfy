import type { PrismaClient } from "@prisma/client";

export const DEFAULT_VAT_PERCENT = 15;
export const VAT_PERCENT_MIN = 0;
export const VAT_PERCENT_MAX = 100;

export function isValidVatPercent(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= VAT_PERCENT_MIN &&
    value <= VAT_PERCENT_MAX
  );
}

function vatSettingKey(projectId: string): string {
  return `project:${projectId}:vat-percent`;
}

export async function getProjectVatPercent(
  prisma: PrismaClient,
  projectId: string,
): Promise<number> {
  if (typeof projectId !== "string" || !projectId.trim())
    throw new Error("Invalid project id.");
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found.");
  const setting = await prisma.appSetting.findUnique({
    where: { key: vatSettingKey(projectId) },
  });
  const parsed = setting ? Number(setting.value) : Number.NaN;
  return isValidVatPercent(parsed) ? parsed : DEFAULT_VAT_PERCENT;
}

export async function setProjectVatPercent(
  prisma: PrismaClient,
  projectId: string,
  vatPercent: number,
): Promise<void> {
  if (typeof projectId !== "string" || !projectId.trim())
    throw new Error("Invalid project id.");
  if (!isValidVatPercent(vatPercent))
    throw new Error("VAT percentage must be between 0 and 100.");
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found.");
  await prisma.appSetting.upsert({
    where: { key: vatSettingKey(projectId) },
    update: { value: String(vatPercent) },
    create: { key: vatSettingKey(projectId), value: String(vatPercent) },
  });
}
