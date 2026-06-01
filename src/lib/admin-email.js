import { Resend } from "resend";
import {
  applyTemplateVariables,
  buildRecipientVars,
  wrapWithBrandTemplate,
} from "./admin-email-template";

export {
  applyTemplateVariables,
  buildRecipientVars,
  wrapWithBrandTemplate,
} from "./admin-email-template";

const ADMIN_FROM = "Vibhor from grepit <vibhorsharma@grepit.co>";

export async function sendAdminEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: ADMIN_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });
  if (error) throw new Error(error.message || "Failed to send email");
  return data;
}

export function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
