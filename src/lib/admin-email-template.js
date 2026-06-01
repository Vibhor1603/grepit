/**
 * Grepit broadcast email template — matches Design System v5 (index.css :root).
 * Warm paper canvas, amber accent, sage typography. Client + server safe.
 */

/** Light theme tokens from src/index.css — email clients need hex/rgba literals */
export const GREPIT_EMAIL_BRAND = {
  canvas: "#FAF8F2",
  canvasDeep: "#F2EFE6",
  card: "#FFFCF7",
  border: "rgba(100, 85, 60, 0.14)",
  borderStrong: "rgba(100, 85, 60, 0.22)",
  text: "#1A1F1A",
  text2: "#3D4238",
  text3: "#4A5244",
  text4: "#5E665A",
  accent: "#C47A12",
  accentBright: "#EEC679",
  accentSoft: "rgba(196, 122, 18, 0.12)",
  lime: "#3F8558",
};

export const DEFAULT_EMAIL_BODY = `<p>Hi {{firstName}},</p>
<p>We wanted to share a quick update with you.</p>
<p>Thanks for using grepit — it means a lot to us.</p>
<p>— The grepit team</p>`;

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function applyTemplateVariables(text, vars) {
  if (!text) return "";
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v != null ? String(v) : "";
  });
}

export function buildRecipientVars(recipient) {
  const email = recipient?.email || "";
  const name = recipient?.name || email.split("@")[0] || "there";
  const firstName = name.trim().split(/\s+/)[0] || name;
  return { email, name, firstName };
}

export const PREVIEW_SAMPLE_VARS = {
  firstName: "Alex",
  name: "Alex Chen",
  email: "alex@example.com",
};

/** Full HTML email with grepit shell — user only edits inner body HTML. */
export function wrapWithBrandTemplate(subject, innerHtml) {
  const b = GREPIT_EMAIL_BRAND;
  const safeSubject = escapeHtml(subject || "grepit");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${safeSubject}</title>
  <style>
    .grepit-body p { margin: 0 0 1.05em; color: ${b.text2}; font-size: 15px; line-height: 1.7; }
    .grepit-body p:last-child { margin-bottom: 0; }
    .grepit-body a { color: ${b.accent}; text-decoration: underline; text-underline-offset: 3px; font-weight: 500; }
    .grepit-body strong { color: ${b.text}; font-weight: 600; }
    .grepit-body ul, .grepit-body ol { margin: 0 0 1.05em; padding-left: 1.2em; color: ${b.text2}; font-size: 15px; line-height: 1.7; }
    .grepit-body li { margin-bottom: 0.4em; }
    .grepit-body h2 { margin: 0 0 0.55em; font-size: 17px; font-weight: 600; color: ${b.text}; letter-spacing: -0.02em; line-height: 1.35; }
  </style>
</head>
<body style="margin:0;padding:0;background:${b.canvas};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safeSubject}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg, ${b.canvas} 0%, ${b.canvasDeep} 100%);padding:40px 16px 48px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${b.card};border-radius:16px;border:1px solid ${b.border};box-shadow:0 1px 2px rgba(26,31,26,0.04),0 12px 40px rgba(100,85,60,0.08);overflow:hidden;">
          <tr>
            <td style="height:3px;background:linear-gradient(90deg, ${b.accent} 0%, ${b.accentBright} 50%, ${b.lime} 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid ${b.border};">
              <p style="margin:0;font-size:20px;font-weight:600;letter-spacing:-0.03em;color:${b.text};line-height:1.2;">
                grep<span style="color:${b.accent};">it</span>
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:${b.text4};letter-spacing:0.01em;line-height:1.4;">Understand any codebase in minutes</p>
            </td>
          </tr>
          <tr>
            <td class="grepit-body" style="padding:28px 32px 8px;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid ${b.border};padding-top:20px;">
                    <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:${b.text3};">
                      <a href="https://grepit.co" style="color:${b.accent};text-decoration:none;font-weight:600;">grepit.co</a>
                      <span style="color:${b.text4};"> · codebase orientation</span>
                    </p>
                    <p style="margin:0;font-size:11px;line-height:1.55;color:${b.text4};">
                      Questions? <a href="mailto:support@grepit.co" style="color:${b.text3};text-decoration:underline;">support@grepit.co</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:18px 8px 0;font-size:10px;line-height:1.5;color:${b.text4};text-align:center;max-width:400px;">
          You’re receiving this because you signed up for grepit.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildAdminEmailHtml({ subject, bodyHtml, useBrandTemplate = true, vars = PREVIEW_SAMPLE_VARS }) {
  const personalizedSubject = applyTemplateVariables(subject, vars);
  const personalizedBody = applyTemplateVariables(bodyHtml, vars);
  const html = useBrandTemplate
    ? wrapWithBrandTemplate(personalizedSubject, personalizedBody)
    : personalizedBody;
  return { html, personalizedSubject, personalizedBody };
}
