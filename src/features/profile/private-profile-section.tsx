import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { optionalText, privateProfile, savePrivateProfile, type PrivateDetails } from "./data";
import {
  ProfileSection,
  ProfileValue,
  SectionFields,
  SectionStatus,
  useSectionEditor,
  type SectionAccess,
} from "./section-editor";

const fields = [
  { key: "legal_name", label: "Legal name", input: "text" },
  { key: "date_of_birth", label: "Date of birth", input: "date" },
  { key: "gender", label: "Gender", input: "text" },
] as const;

export function PrivateProfileSection(access: SectionAccess) {
  const client = useQueryClient();
  const query = privateProfile(access.userId);
  const details = useQuery(query);
  const editor = useSectionEditor(access, async (values: PrivateDetails) => {
    const updated = await savePrivateProfile(access.userId, {
      legal_name: optionalText(values.legal_name ?? ""),
      date_of_birth: values.date_of_birth,
      gender: optionalText(values.gender ?? ""),
    });
    client.setQueryData(query.queryKey, updated);
  });
  return (
    <ProfileSection
      id="private-details"
      title="Private details"
      description="These optional details are used only for a more personalised experience and are never shown publicly."
      action={
        !editor.editing &&
        details.data && (
          <Button
            type="button"
            variant="outline"
            disabled={access.locked}
            onClick={() => editor.start(details.data)}
          >
            Edit
          </Button>
        )
      }
    >
      {editor.draft ? (
        <SectionFields
          pending={editor.pending}
          canSave={editor.dirty}
          error={editor.error}
          onSave={editor.save}
          onCancel={editor.cancel}
        >
          {fields.map(({ key, label, input }) => (
            <div key={key}>
              <label htmlFor={key} className="mb-1.5 block text-sm font-medium">
                {label}
              </label>
              <Input
                id={key}
                type={input}
                value={editor.draft?.[key] ?? ""}
                onChange={(event) => {
                  if (editor.draft)
                    editor.setDraft({ ...editor.draft, [key]: event.target.value || null });
                }}
              />
            </div>
          ))}
          <p className="text-sm text-muted-foreground">Leave any field blank to clear it.</p>
        </SectionFields>
      ) : details.data ? (
        <dl className="grid gap-4 sm:grid-cols-3">
          {fields.map(({ key, label }) => (
            <ProfileValue key={key} label={label} value={details.data[key]} />
          ))}
        </dl>
      ) : (
        <SectionStatus
          loading={details.isPending}
          error={details.isError}
          onRetry={() => void details.refetch()}
        />
      )}
      {editor.saved && (
        <p role="status" className="mt-4 text-sm font-semibold text-success">
          Private details saved.
        </p>
      )}
    </ProfileSection>
  );
}
