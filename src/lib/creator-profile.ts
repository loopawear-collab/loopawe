// src/lib/creator-profile.ts
"use client";

/**
 * Local-first creator profiles (v1)
 * - displayName + bio for each creatorId (user.id)
 * - stored in localStorage
 * - future-proof: later replace with DB (Prisma) but keep same API
 */

export type CreatorProfile = {
  creatorId: string;
  displayName: string;
  bio: string;
  updatedAt: string;
};

const STORAGE_KEY = "loopa_creator_profiles_v1";

function nowISO() {
  return new Date().toISOString();
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadAll(): Record<string, CreatorProfile> {
  if (typeof window === "undefined") return {};
  const parsed = safeParse<Record<string, CreatorProfile>>(localStorage.getItem(STORAGE_KEY));
  return parsed && typeof parsed === "object" ? parsed : {};
}

function saveAll(map: Record<string, CreatorProfile>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function fallbackNameFromEmail(email?: string) {
  if (!email) return "Creator";
  const left = email.split("@")[0] || "creator";
  // Capitalize first letter
  return left.charAt(0).toUpperCase() + left.slice(1);
}

export function getCreatorProfile(creatorId: string): CreatorProfile | null {
  const map = loadAll();
  return map[creatorId] ?? null;
}

/**
 * Ensure a profile exists.
 * Useful when a user opens account page for the first time.
 */
export function ensureCreatorProfile(creatorId: string, email?: string): CreatorProfile {
  const map = loadAll();
  const existing = map[creatorId];
  if (existing) return existing;

  const created: CreatorProfile = {
    creatorId,
    displayName: fallbackNameFromEmail(email),
    bio: "Creator on Loopa. Publishing fresh drops soon.",
    updatedAt: nowISO(),
  };

  map[creatorId] = created;
  saveAll(map);
  return created;
}

export function upsertCreatorProfile(
  creatorId: string,
  patch: Partial<Pick<CreatorProfile, "displayName" | "bio">>
): CreatorProfile {
  const map = loadAll();
  const base =
    map[creatorId] ??
    ({
      creatorId,
      displayName: "Creator",
      bio: "",
      updatedAt: nowISO(),
    } as CreatorProfile);

  const next: CreatorProfile = {
    ...base,
    ...patch,
    displayName: (patch.displayName ?? base.displayName).trim() || base.displayName,
    bio: (patch.bio ?? base.bio).trim(),
    updatedAt: nowISO(),
  };

  map[creatorId] = next;
  saveAll(map);
  return next;
}