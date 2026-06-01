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
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-xs font-medium text-[#a3a3a3]">Live preview</h3>
        <span className="text-[10px] text-[#525252] truncate max-w-[60%]">
          as {vars.firstName} · {personalizedSubject}
        </span>
      </div>
      <div className="rounded-xl border border-[rgba(100,85,60,0.14)] overflow-hidden bg-[#FAF8F2]">
        <iframe
          title="Email preview"
          sandbox=""
          srcDoc={html}
          className="w-full h-[min(520px,70vh)] bg-[#FAF8F2] border-0"
        />
      </div>
      <p className="mt-2 text-[10px] text-[#525252] leading-relaxed">
        Brand layout is fixed — edit the body HTML above. Use{" "}
        <code className="text-[#5E665A]">{"{{firstName}}"}</code> for personalization.
      </p>
    </div>
  );
}
