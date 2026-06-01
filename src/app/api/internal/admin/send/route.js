import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../lib/admin-auth";
import {
  internalAdminDisabledResponse,
  isInternalAdminEnabled,
} from "../../../../../lib/internal-admin-gate";
import {
  applyTemplateVariables,
  buildRecipientVars,
  delay,
  sendAdminEmail,
  wrapWithBrandTemplate,
} from "../../../../../lib/admin-email";
import { filterRecipients, listAdminRecipients } from "../../../../../lib/admin-users";

const MAX_RECIPIENTS = 200;

export async function POST(request) {
  if (!isInternalAdminEnabled()) return internalAdminDisabledResponse();
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const subject = String(body.subject || "").trim();
    const bodyHtml = String(body.bodyHtml || "").trim();
    const useBrandTemplate = body.useBrandTemplate !== false;
    const recipientIds = Array.isArray(body.recipientIds) ? body.recipientIds : null;
    const filters = body.filters || {};
    const dryRun = Boolean(body.dryRun);

    if (!subject || !bodyHtml) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }

    const { users: all } = await listAdminRecipients();
    let targets;

    if (recipientIds?.length) {
      const idSet = new Set(recipientIds);
      targets = all.filter((u) => idSet.has(u.id));
    } else {
      targets = filterRecipients(all, {
        q: filters.q || "",
        status: filters.status || "all",
        plan: filters.plan || "all",
      });
    }

    targets = targets.filter((u) => u.email);
    if (targets.length === 0) {
      return NextResponse.json({ error: "No recipients match your selection" }, { status: 400 });
    }
    if (targets.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `Too many recipients (${targets.length}). Max ${MAX_RECIPIENTS} per send.` },
        { status: 400 },
      );
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        count: targets.length,
        preview: targets.slice(0, 5).map((u) => ({ email: u.email, name: u.name })),
      });
    }

    const results = { sent: 0, failed: [] };

    for (const recipient of targets) {
      const vars = buildRecipientVars(recipient);
      const personalizedSubject = applyTemplateVariables(subject, vars);
      const personalizedBody = applyTemplateVariables(bodyHtml, vars);
      const html = useBrandTemplate
        ? wrapWithBrandTemplate(personalizedSubject, personalizedBody)
        : personalizedBody;

      try {
        await sendAdminEmail({
          to: recipient.email,
          subject: personalizedSubject,
          html,
        });
        results.sent += 1;
      } catch (err) {
        results.failed.push({ email: recipient.email, error: err.message });
      }
      await delay(350);
    }

    return NextResponse.json({
      ok: true,
      sent: results.sent,
      failed: results.failed,
      total: targets.length,
    });
  } catch (err) {
    console.error("[admin/send]", err.message);
    return NextResponse.json({ error: err.message || "Send failed" }, { status: 500 });
  }
}
