"use client";

import { useState } from "react";
import {
  saveCompanyInfoForm,
  saveContactInfoForm,
  saveSocialMediaForm,
  saveTrackingForm,
} from "./actions";

type SocialMedia = {
  facebook?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  pinterest?: string | null;
};

type ContactInfo = {
  phone?: string | null;
  phoneLink?: string | null;
  additionalPhone?: string | null;
  fax?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  mapLinkUrl?: string | null;
  mapEmbedUrl?: string | null;
};

type BusinessHours = {
  [day: string]: { opens: string; closes: string };
};

type Company = {
  name: string;
  tagline?: string | null;
  description?: string | null;
  businessHours?: BusinessHours | null;
  industryCategory?: string | null;
  industrySubCategory?: string | null;
  industrySubSubCategory?: string | null;
  audiencePersona1?: string | null;
  audiencePersona2?: string | null;
  audiencePersona3?: string | null;
  languagesSpoken?: string | null;
  additionalLanguage?: string | null;
  ga4?: string | null;
  gtm?: string | null;
  fbPixel?: string | null;
  searchConsole?: string | null;
  gscVerificationTag?: string | null;
  brandColor?: string | null;
  logoAssetId?: string | null;
  socialMedia?: SocialMedia | null;
  contactInfo?: ContactInfo | null;
};

const TIME_OPTIONS = [
  "12:00 AM", "12:30 AM", "01:00 AM", "01:30 AM", "02:00 AM", "02:30 AM",
  "03:00 AM", "03:30 AM", "04:00 AM", "04:30 AM", "05:00 AM", "05:30 AM",
  "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM",
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
  "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
  "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM",
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

function FolderIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function AccordionSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-zinc-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 bg-zinc-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-200"
      >
        {icon}
        {title}
        <span className="ml-auto">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && <div className="bg-zinc-50 px-4 py-4">{children}</div>}
    </div>
  );
}

function TimeSelect({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      className="rounded border border-zinc-300 px-2 py-1 text-xs"
    >
      <option value="">--</option>
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

export default function CompanyAccordion({ company }: { company: Company }) {
  const social = company.socialMedia ?? {};
  const contact = company.contactInfo ?? {};
  const hours = company.businessHours ?? {};

  return (
    <div className="space-y-3">
      {/* ── COMPANY INFORMATION ──────────────────────────────────────── */}
      <form action={saveCompanyInfoForm}>
        <AccordionSection title="Company Information" icon={<FolderIcon />} defaultOpen>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-zinc-600">
              Company Name
              <input
                name="name"
                required
                defaultValue={company.name}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Tagline/Slogan
              <input
                name="tagline"
                defaultValue={company.tagline ?? ""}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Company Description
              <textarea
                name="description"
                rows={4}
                defaultValue={company.description ?? ""}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>

            {/* Business Hours */}
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Business Hours</h3>
              <p className="mt-1 text-[11px] text-red-600">
                If closed, leave both opens/closes fields blank.
                <br />
                If open 24hrs, set both opens/closes fields to midnight (12:00 AM)
              </p>
              <div className="mt-3 space-y-2">
                {DAYS.map((day) => {
                  const key = day.toLowerCase();
                  const dayHours = hours[key] ?? {};
                  return (
                    <div key={day} className="flex items-center gap-2 text-xs">
                      <span className="w-24 font-medium text-zinc-700">{day}:</span>
                      <span className="text-zinc-500">Opens:</span>
                      <TimeSelect name={`${key}_opens`} defaultValue={dayHours.opens} />
                      <span className="text-zinc-500">Closes:</span>
                      <TimeSelect name={`${key}_closes`} defaultValue={dayHours.closes} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Industry Category */}
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Industry Category - Structured Data
              </h3>
              <p className="mt-1 text-[11px] text-red-600">
                *Contact a Kingdom Empowered associate if you need assistance with this section.
              </p>
              <div className="mt-3 space-y-3">
                <label className="block text-xs font-medium text-zinc-600">
                  Select Your Type of Business
                  <select
                    name="industryCategory"
                    defaultValue={company.industryCategory ?? ""}
                    className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  >
                    <option value="">-- Select --</option>
                    <option value="Organization">Organization</option>
                    <option value="LocalBusiness">Local Business</option>
                    <option value="Corporation">Corporation</option>
                    <option value="Nonprofit">Nonprofit</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Choose More Specific Organization (if applicable)
                  <select
                    name="industrySubCategory"
                    defaultValue={company.industrySubCategory ?? ""}
                    className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  >
                    <option value="">-- Select --</option>
                    <option value="Educational Organization">Educational Organization</option>
                    <option value="Healthcare Organization">Healthcare Organization</option>
                    <option value="Government Organization">Government Organization</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Choose More Specific Educational Organization (if applicable)
                  <select
                    name="industrySubSubCategory"
                    defaultValue={company.industrySubSubCategory ?? ""}
                    className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  >
                    <option value="">-- Select --</option>
                    <option value="College/University">College/University</option>
                    <option value="Elementary School">Elementary School</option>
                    <option value="Middle School">Middle School</option>
                    <option value="High School">High School</option>
                    <option value="Vocational School">Vocational School</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Audience Personas */}
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-medium text-zinc-600">
                Your Audience (buyer persona) Type 1
                <input
                  name="audiencePersona1"
                  defaultValue={company.audiencePersona1 ?? ""}
                  className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Your Audience (buyer persona) Type 2
                <input
                  name="audiencePersona2"
                  defaultValue={company.audiencePersona2 ?? ""}
                  className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Your Audience (buyer persona) Type 3
                <input
                  name="audiencePersona3"
                  defaultValue={company.audiencePersona3 ?? ""}
                  className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            {/* Languages */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-600">
                Language Spoken
                <input
                  name="languagesSpoken"
                  defaultValue={company.languagesSpoken ?? ""}
                  className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Additional Language
                <input
                  name="additionalLanguage"
                  defaultValue={company.additionalLanguage ?? ""}
                  className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <button
              type="submit"
              className="rounded bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700"
            >
              Update/save your company
            </button>
          </div>
        </AccordionSection>
      </form>

      {/* ── CONTACT INFO ──────────────────────────────────────────────── */}
      <form action={saveContactInfoForm}>
        <AccordionSection title="Contact Info" icon={<UserIcon />}>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-zinc-600">
              Phone
              <input
                name="phone"
                defaultValue={contact.phone ?? ""}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Phone (Link) *repeat phone number above
              <input
                name="phoneLink"
                defaultValue={contact.phoneLink ?? ""}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Additional Phone *if different phone number than above
              <input
                name="additionalPhone"
                defaultValue={contact.additionalPhone ?? ""}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Fax
              <input
                name="fax"
                defaultValue={contact.fax ?? ""}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Email
              <input
                name="email"
                defaultValue={contact.email ?? ""}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>

            {/* Location Information */}
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Location Information</h3>
              <div className="mt-3 space-y-3">
                <label className="block text-xs font-medium text-zinc-600">
                  Address
                  <input
                    name="address"
                    defaultValue={contact.address ?? ""}
                    className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  City
                  <input
                    name="city"
                    defaultValue={contact.city ?? ""}
                    className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-zinc-600">
                    State
                    <input
                      name="state"
                      defaultValue={contact.state ?? ""}
                      className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-600">
                    Zip
                    <input
                      name="zip"
                      defaultValue={contact.zip ?? ""}
                      className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <label className="block text-xs font-medium text-zinc-600">
                  Country
                  <input
                    name="country"
                    defaultValue={contact.country ?? ""}
                    className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>

            {/* Mapping Links */}
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Mapping Links</h3>
              <p className="mt-1 text-[11px] text-red-600">
                *Contact a Kingdom Empowered associate if you need assistance with this section.
              </p>
              <div className="mt-3 space-y-3">
                <label className="block text-xs font-medium text-zinc-600">
                  Map Link URL (business location)
                  <span className="mt-0.5 block text-[10px] text-zinc-400 normal-case">
                    Example: from your location on Google Maps &quot;Share&quot; icon, this is the url found in the &quot;Send a link&quot; area.
                  </span>
                  <input
                    name="mapLinkUrl"
                    defaultValue={contact.mapLinkUrl ?? ""}
                    className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-medium text-zinc-600">
                  Map Embed URL (business location)
                  <span className="mt-0.5 block text-[10px] text-zinc-400 normal-case">
                    Example: from your location on Google Maps &quot;Share&quot; icon, this is the url found in the &quot;Embed a map&quot; (iframe &quot;src&quot; attribute).
                  </span>
                  <input
                    name="mapEmbedUrl"
                    defaultValue={contact.mapEmbedUrl ?? ""}
                    className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <button
              type="submit"
              className="rounded bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700"
            >
              Update/save your contact info
            </button>
          </div>
        </AccordionSection>
      </form>

      {/* ── SOCIAL MEDIA ──────────────────────────────────────────────── */}
      <form action={saveSocialMediaForm}>
        <AccordionSection title="Social Media" icon={<ShareIcon />}>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-zinc-600">
              Facebook URL
              <input
                name="facebook"
                defaultValue={social.facebook ?? ""}
                placeholder="https://www.facebook.com/your-page"
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Twitter URL
              <input
                name="twitter"
                defaultValue={social.twitter ?? ""}
                placeholder="https://twitter.com/your-handle"
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Youtube URL
              <input
                name="youtube"
                defaultValue={social.youtube ?? ""}
                placeholder="https://www.youtube.com/channel/your-channel"
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Instagram URL
              <input
                name="instagram"
                defaultValue={social.instagram ?? ""}
                placeholder="https://www.instagram.com/your-handle"
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              LinkedIn URL
              <input
                name="linkedin"
                defaultValue={social.linkedin ?? ""}
                placeholder="https://www.linkedin.com/company/your-company"
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Pinterest URL
              <input
                name="pinterest"
                defaultValue={social.pinterest ?? ""}
                placeholder="https://www.pinterest.com/your-handle"
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <button
              type="submit"
              className="rounded bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700"
            >
              Update/save your social media
            </button>
          </div>
        </AccordionSection>
      </form>

      {/* ── TRACKING ──────────────────────────────────────────────── */}
      <form action={saveTrackingForm}>
        <AccordionSection title="Tracking" icon={<ChartIcon />}>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-zinc-600">
              GA4 ID (e.g. G-XXXXXXX)
              <input
                name="ga4"
                defaultValue={company.ga4 ?? ""}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              GTM Container ID (e.g. GTM-XXXXXXX)
              <input
                name="gtm"
                defaultValue={company.gtm ?? ""}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Facebook / Meta Pixel ID
              <input
                name="fbPixel"
                defaultValue={company.fbPixel ?? ""}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Google Search Console site
              <input
                name="searchConsole"
                defaultValue={company.searchConsole ?? ""}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              GSC verification tag (meta content value)
              <input
                name="gscVerificationTag"
                defaultValue={company.gscVerificationTag ?? ""}
                className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono"
              />
            </label>
          </div>
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <button
              type="submit"
              className="rounded bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700"
            >
              Update/save tracking
            </button>
          </div>
        </AccordionSection>
      </form>
    </div>
  );
}
