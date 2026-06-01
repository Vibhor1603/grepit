"use client";

import { useMemo } from "react";
import {
  buildAdminEmailHtml,
  buildRecipientVars,
  PREVIEW_SAMPLE_VARS,
} from "../../lib/admin-email-template";

export default function AdminEmailPreview({
  subject,
  bodyHtml,
  useBrandTemplate,
  previewRecipient,
}) {
  const vars = useMemo(
    () =>
      previewRecipient
        ? buildRecipientVars(previewRecipient)
        : PREVIEW_SAMPLE_VARS,
    [previewRecipient?.id, previewRecipient?.email, previewRecipient?.name],
  );

  const { html, personalizedSubject } = useMemo(
    () =>
      buildAdminEmailHtml({
        subject,
        bodyHtml,
        useBrandTemplate,
        vars,
      }),
    [subject, bodyHtml, useBrandTemplate, vars],
  );

  return (
    <div>
      <p className="text-xs text-neutral-500 mb-3 truncate">
        Previewing as {vars.firstName} · {personalizedSubject}
      </p>
      <div className="rounded-md border border-neutral-200 overflow-hidden bg-[#FAF8F2]">
        <iframe
          title="Email preview"
          sandbox=""
          srcDoc={html}
          className="w-full h-[min(480px,65vh)] bg-[#FAF8F2] border-0"
        />
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        Use <code className="text-neutral-600">{"{{firstName}}"}</code> in the body for personalization.
      </p>
    </div>
  );
}
