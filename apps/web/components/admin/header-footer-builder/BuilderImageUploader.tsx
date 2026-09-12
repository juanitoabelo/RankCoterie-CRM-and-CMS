"use client";

import MediaLibraryPicker from "../page-builder/MediaLibraryPicker";

export default function BuilderImageUploader({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  return (
    <MediaLibraryPicker
      value={value}
      onChange={onChange}
      label={label}
    />
  );
}
