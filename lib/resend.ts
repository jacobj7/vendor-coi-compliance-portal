import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendExpirationAlert(
  to: string,
  vendorName: string,
  expirationDate: Date,
  daysUntil: number,
): Promise<void> {
  const formattedDate = expirationDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const urgencyColor =
    daysUntil <= 7 ? "#dc2626" : daysUntil <= 14 ? "#d97706" : "#2563eb";
  const urgencyLabel =
    daysUntil <= 7
      ? "URGENT"
      : daysUntil <= 14
        ? "ACTION REQUIRED"
        : "REMINDER";

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>COI Expiration Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${urgencyColor}; padding: 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">${urgencyLabel}</p>
                    <h1 style="margin: 4px 0 0; color: #ffffff; font-size: 24px; font-weight: 700;">COI Expiration Alert</h1>
                  </td>
                  <td align="right">
                    <div style="background-color: rgba(255,255,255,0.2); border-radius: 50%; width: 56px; height: 56px; display: inline-flex; align-items: center; justify-content: center;">
                      <span style="color: #ffffff; font-size: 28px;">⚠️</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                This is an automated notification regarding an upcoming Certificate of Insurance (COI) expiration that requires your attention.
              </p>

              <!-- Alert Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 4px; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Days Until Expiration</p>
                    <p style="margin: 0; color: ${urgencyColor}; font-size: 36px; font-weight: 800;">${daysUntil} ${daysUntil === 1 ? "day" : "days"}</p>
                  </td>
                </tr>
              </table>

              <!-- Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 24px;">
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Vendor / Company</p>
                    <p style="margin: 4px 0 0; color: #111827; font-size: 16px; font-weight: 600;">${vendorName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Expiration Date</p>
                    <p style="margin: 4px 0 0; color: #111827; font-size: 16px; font-weight: 600;">${formattedDate}</p>
                  </td>
                </tr>
              </table>

              <!-- Action Required -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 700;">Action Required</p>
                    <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
                      Please contact <strong>${vendorName}</strong> immediately to request an updated Certificate of Insurance before the expiration date. Ensure the new COI meets all required coverage limits and lists the appropriate additional insureds.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you have already received an updated COI, please upload it to the system to clear this alert. If you have any questions, please contact your compliance team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 32px;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.6;">
                This is an automated message from your COI Management System.<br />
                Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
COI EXPIRATION ALERT - ${urgencyLabel}

Vendor: ${vendorName}
Expiration Date: ${formattedDate}
Days Until Expiration: ${daysUntil} ${daysUntil === 1 ? "day" : "days"}

ACTION REQUIRED:
Please contact ${vendorName} immediately to request an updated Certificate of Insurance before the expiration date. Ensure the new COI meets all required coverage limits and lists the appropriate additional insureds.

If you have already received an updated COI, please upload it to the system to clear this alert.

---
This is an automated message from your COI Management System.
Please do not reply directly to this email.
  `.trim();

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "COI Alerts <alerts@yourdomain.com>",
    to,
    subject: `[${urgencyLabel}] COI Expiring in ${daysUntil} ${daysUntil === 1 ? "Day" : "Days"} — ${vendorName}`,
    html: htmlContent,
    text: textContent,
  });
}
