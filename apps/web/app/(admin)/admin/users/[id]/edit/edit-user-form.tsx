"use client";

import React, { useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { updateUserForm, deleteUser, type ActionResult } from "../../actions";

const RichTextEditor = dynamic(
  () => import("@/components/admin/page-builder/RichTextEditor"),
  { ssr: false }
);

type SocialMedia = {
  facebook?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  pinterest?: string | null;
};

type UserWithRoles = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  authorUrl?: string | null;
  authorBio?: string | null;
  imageUrl?: string | null;
  active: boolean;
  includeInStaffPages: boolean;
  staffPageOrHomePage?: string | null;
  socialMedia?: SocialMedia | null;
  undergraduateDegree?: string | null;
  undergraduateInstitution?: string | null;
  postgraduateDegree?: string | null;
  postgraduateInstitution?: string | null;
  doctorateDegree?: string | null;
  doctorateInstitution?: string | null;
  quickBiography?: string | null;
  generalSkillsInfo?: string | null;
  roles: { role: string }[];
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EDITOR: "Editor",
  MARKETING: "Marketing",
  REVIEWER: "Reviewer",
  SALES_REP: "Sales Rep",
  GRACE_COACH: "Grace Coach",
};

const ALL_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "MARKETING", "REVIEWER", "SALES_REP", "GRACE_COACH"];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 bg-zinc-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-200"
      >
        {title}
        <span className="ml-auto"><ChevronIcon open={open} /></span>
      </button>
      {open && <div className="bg-zinc-50 px-4 py-4">{children}</div>}
    </div>
  );
}

function ImageUpload({
  name,
  currentUrl,
  onUpload,
}: {
  name: string;
  currentUrl?: string | null;
  onUpload: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(currentUrl ?? "");

  async function handleFile(file: File) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      setPreview(json.url);
      onUpload(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {preview && (
        <img src={preview} alt="" className="h-20 w-20 rounded-full object-cover" />
      )}
      <input type="hidden" name={name} value={preview} />
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        disabled={uploading}
        className="block w-full text-sm text-zinc-500 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white disabled:opacity-50"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <p className="text-[11px] text-zinc-400">Allowed formats: JPG, PNG, WebP, GIF, AVIF (max 8 MB)</p>
      {uploading && <p className="text-xs text-zinc-500">Uploading...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function EditUserForm({ user }: { user: UserWithRoles }) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState(user.imageUrl ?? "");
  const [quickBio, setQuickBio] = useState(user.quickBiography ?? "");
  const [generalSkills, setGeneralSkills] = useState(user.generalSkillsInfo ?? "");

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData): Promise<ActionResult> => {
      formData.set("id", user.id);
      formData.set("imageUrl", imageUrl);
      formData.set("quickBiography", quickBio);
      formData.set("generalSkillsInfo", generalSkills);
      const result = await updateUserForm(formData);
      return result;
    },
    null as ActionResult | null
  );

  const social = user.socialMedia ?? {};
  const userRoles = new Set(user.roles.map((r) => r.role));

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    const result = await deleteUser(user.id);
    if (result.ok) {
      router.push("/admin/users");
    } else {
      alert(result.error);
    }
  }

  return (
    <form action={formAction} className="mt-6 max-w-3xl space-y-3">
      <input type="hidden" name="id" value={user.id} />

      {/* Company & Department */}
      <Section title="Company & Department" defaultOpen>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            Company
            <select name="company" defaultValue={user.company ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm">
              <option value="">-- Select --</option>
              <option value="Soulegria">Soulegria</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Department
            <select name="department" defaultValue={user.department ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm">
              <option value="">-- Select --</option>
              <option value="Administrators">Administrators</option>
              <option value="Editors">Editors</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="Support">Support</option>
            </select>
          </label>
        </div>
      </Section>

      {/* Basic Information */}
      <Section title="Basic Information" defaultOpen>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              First Name
              <input name="firstName" defaultValue={user.firstName ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Last Name
              <input name="lastName" defaultValue={user.lastName ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-xs font-medium text-zinc-600">
            Profile/Profile URL
            <input name="authorUrl" defaultValue={user.authorUrl ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Job Title
              <input name="jobTitle" defaultValue={user.jobTitle ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Phone
              <input name="phone" defaultValue={user.phone ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
              <input type="checkbox" name="includeInStaffPages" defaultChecked={user.includeInStaffPages} className="accent-zinc-900" />
              Include in Staff Pages
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Staff page or home page
              <select name="staffPageOrHomePage" defaultValue={user.staffPageOrHomePage ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm">
                <option value="">--</option>
                <option value="staff">Staff Page</option>
                <option value="home">Home Page</option>
              </select>
            </label>
          </div>
        </div>
      </Section>

      {/* Profile Image */}
      <Section title="Profile Image">
        <ImageUpload name="imageUrl" currentUrl={user.imageUrl} onUpload={setImageUrl} />
      </Section>

      {/* Social Media */}
      <Section title="Social Media">
        <div className="space-y-3">
          {["facebook", "instagram", "twitter", "youtube", "linkedin", "pinterest"].map((platform) => (
            <label key={platform} className="block text-xs font-medium text-zinc-600 capitalize">
              {platform}
              <input
                name={platform}
                defaultValue={(social as Record<string, string | null>)[platform] ?? ""}
                placeholder={`https://www.${platform}.com/...`}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>
      </Section>

      {/* Credentials & Education */}
      <Section title="Credentials & Education">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Undergraduate Degree
              <input name="undergraduateDegree" defaultValue={user.undergraduateDegree ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Undergraduate Institution
              <input name="undergraduateInstitution" defaultValue={user.undergraduateInstitution ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Postgraduate Degree
              <input name="postgraduateDegree" defaultValue={user.postgraduateDegree ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Postgraduate Institution
              <input name="postgraduateInstitution" defaultValue={user.postgraduateInstitution ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Doctorate Degree
              <input name="doctorateDegree" defaultValue={user.doctorateDegree ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Doctorate Institution
              <input name="doctorateInstitution" defaultValue={user.doctorateInstitution ?? ""} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
            </label>
          </div>
        </div>
      </Section>

      {/* Quick Biography — Rich Text Editor */}
      <Section title="Quick Biography" defaultOpen>
        <label className="block text-xs font-medium text-zinc-600">
          Quick Biography
        </label>
        <div className="mt-1 rounded border border-zinc-300 bg-white">
          <RichTextEditor value={quickBio} onChange={setQuickBio} placeholder="Write a short biography..." minHeight={120} />
        </div>
      </Section>

      {/* General/Skills Info — Rich Text Editor */}
      <Section title="General/Skills Info" defaultOpen>
        <label className="block text-xs font-medium text-zinc-600">
          General Skills Info
        </label>
        <div className="mt-1 rounded border border-zinc-300 bg-white">
          <RichTextEditor value={generalSkills} onChange={setGeneralSkills} placeholder="List skills, credentials, and expertise..." minHeight={120} />
        </div>
      </Section>

      {/* Admin Access - Roles */}
      <Section title="Administrative Permissions">
        <fieldset>
          <legend className="block text-xs font-medium text-zinc-600">Roles</legend>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {ALL_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5 text-xs text-zinc-700">
                <input type="checkbox" name="roles" value={r} defaultChecked={userRoles.has(r)} className="accent-zinc-900" />
                {ROLE_LABELS[r] ?? r}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
            <input type="checkbox" name="active" defaultChecked={user.active} className="accent-zinc-900" />
            Active
          </label>
        </div>
      </Section>

      {/* Reset Login Credentials */}
      <Section title="Reset Login Credentials">
        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-600">
            Email Address
            <input name="email" type="email" defaultValue={user.email} required className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            New Password (leave blank to keep current)
            <input name="password" type="password" minLength={8} className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm" />
          </label>
        </div>
      </Section>

      {/* Save / Delete */}
      <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
        <button
          type="button"
          onClick={handleDelete}
          className="rounded bg-red-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-red-700"
        >
          Delete User
        </button>
        <div className="flex items-center gap-3">
          {state && !state.ok && (
            <span className="text-xs text-red-600">{state.error}</span>
          )}
          {state?.ok && (
            <span className="text-xs text-green-600">Saved!</span>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
