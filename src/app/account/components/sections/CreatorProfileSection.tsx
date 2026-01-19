"use client";

import Link from "next/link";

export default function CreatorProfileSection({
  userId,
  displayName,
  bio,
  profileSaved,
  onChangeDisplayName,
  onChangeBio,
  onSaveProfile,
}: {
  userId: string;
  displayName: string;
  bio: string;
  profileSaved: string | null;
  onChangeDisplayName: (v: string) => void;
  onChangeBio: (v: string) => void;
  onSaveProfile: () => void;
}) {
  return (
    <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-medium tracking-widest text-zinc-500">
            CREATOR PROFILE
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
            Creator profiel
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Dit is wat mensen zien op je creator shop. (Local-first demo)
          </p>
        </div>

        <Link
          href={`/c/${encodeURIComponent(userId)}`}
          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Preview shop →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-zinc-600">
            Display name
          </label>
          <input
            value={displayName}
            onChange={(e) => onChangeDisplayName(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
            placeholder="Loopa Creator"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-600">Bio</label>
          <input
            value={bio}
            onChange={(e) => onChangeBio(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
            placeholder="Wat maak jij?"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveProfile}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Profiel opslaan
        </button>

        {profileSaved ? (
          <span className="text-sm text-zinc-600">{profileSaved}</span>
        ) : null}
      </div>
    </div>
  );
}