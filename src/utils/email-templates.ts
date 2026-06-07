function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dollars(value: number) {
  return `$${(Number(value || 0) / 100).toFixed(2)}`;
}

function card(last4: string | undefined) {
  return last4 ? `•••• ${escapeHtml(last4)}` : 'Card on file';
}

function renderRows(rows: Array<{ label: string; value: string; strong?: boolean }>) {
  return rows.map(row => `
    <tr>
      <td style="padding:8px 0;color:#475569;font-size:14px;">${escapeHtml(row.label)}</td>
      <td style="padding:8px 0;color:#0f172a;font-size:14px;text-align:right;${row.strong ? 'font-weight:700;' : ''}">${row.value}</td>
    </tr>
  `).join('');
}

function renderEmailShell(title: string, preheader: string, content: string, ctaLabel?: string, ctaHref?: string) {
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader);
  const safeHref = escapeHtml(ctaHref || '#');
  const cta = ctaLabel && ctaHref
    ? `<p style="margin:24px 0 0;"><a href="${safeHref}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">${escapeHtml(ctaLabel)}</a></p>`
    : '';

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${safeTitle}</title>
      </head>
      <body style="margin:0;padding:0;background:#e2e8f0;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreheader}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e2e8f0;padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 45px rgba(15,23,42,0.12);">
                <tr>
                  <td style="padding:32px;background:linear-gradient(135deg,#1d4ed8,#60a5fa);color:#ffffff;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;opacity:0.9;">Drive</div>
                    <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">${safeTitle}</h1>
                    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;opacity:0.92;">${safePreheader}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 24px;">
                    ${content}
                    ${cta}
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.6;">
                    You are receiving this email because you have a Drive account or an active trip. Manage notification preferences or unsubscribe from non-essential emails in your account settings.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export const emailTemplates = {
  RIDE_CONFIRMATION: (data: any) => {
    const trackingLink = escapeHtml(data?.trackingLink || '#');
    return {
      subject: 'Your ride is confirmed - Driver on the way',
      html: renderEmailShell(
        'Ride confirmed',
        `Driver ${data?.driverName || 'assigned'} is heading to your pickup spot.`,
        `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Hi ${escapeHtml(data?.riderName || 'there')}, your driver is on the way.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${renderRows([
              { label: 'Driver', value: `${escapeHtml(data?.driverName || 'Driver')} ⭐ ${escapeHtml(data?.driverRating || '5.0')}` },
              { label: 'Vehicle', value: escapeHtml(`${data?.carColor || ''} ${data?.carMake || ''} ${data?.carModel || ''} (${data?.licensePlate || 'N/A'})`.trim()) },
              { label: 'Pickup', value: escapeHtml(data?.pickupAddress || 'N/A') },
              { label: 'Dropoff', value: escapeHtml(data?.dropoffAddress || 'N/A') },
              { label: 'ETA', value: `${escapeHtml(data?.eta || 'N/A')} min` },
              { label: 'Estimated fare', value: dollars(Number(data?.fareEstimate || 0)), strong: true },
              { label: 'Driver phone', value: escapeHtml(data?.driverPhone || 'Hidden') }
            ])}
          </table>
        `,
        'Track your ride',
        trackingLink
      )
    };
  },

  DRIVER_EARNINGS: (data: any) => ({
    subject: `You earned ${dollars(Number(data?.earnings || 0))} - Trip complete`,
    html: renderEmailShell(
      'Trip earnings summary',
      `A new payout of ${dollars(Number(data?.earnings || 0))} has been added to your balance.`,
      `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Hi ${escapeHtml(data?.driverName || 'Driver')}, here is your latest trip summary.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${renderRows([
            { label: 'Rider', value: escapeHtml(data?.riderName || 'Rider') },
            { label: 'Pickup', value: escapeHtml(data?.pickupAddress || 'N/A') },
            { label: 'Dropoff', value: escapeHtml(data?.dropoffAddress || 'N/A') },
            { label: 'Duration', value: escapeHtml(data?.duration || 'N/A') },
            { label: 'Distance', value: escapeHtml(data?.distance || 'N/A') },
            { label: 'Gross fare', value: dollars(Number(data?.grossFare || 0)) },
            { label: 'Platform fee', value: dollars(Number(data?.platformFee || 0)) },
            { label: 'Net earnings', value: dollars(Number(data?.earnings || 0)), strong: true },
            { label: 'Today total', value: dollars(Number(data?.todayEarnings || 0)) }
          ])}
        </table>
      `,
      'View wallet',
      escapeHtml(data?.walletLink || '#')
    )
  }),

  PAYMENT_RECEIPT: (data: any) => ({
    subject: `Payment Receipt - Trip on ${escapeHtml(data?.tripDate || 'today')}`,
    html: renderEmailShell(
      'Payment receipt',
      `Your ${dollars(Number(data?.total || 0))} payment has been processed successfully.`,
      `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Hi ${escapeHtml(data?.riderName || 'there')}, thanks for riding with Drive.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${renderRows([
            { label: 'Driver', value: escapeHtml(data?.driverName || 'Driver') },
            { label: 'Pickup', value: escapeHtml(data?.pickupAddress || 'N/A') },
            { label: 'Dropoff', value: escapeHtml(data?.dropoffAddress || 'N/A') },
            { label: 'Duration', value: escapeHtml(data?.duration || 'N/A') },
            { label: 'Distance', value: escapeHtml(data?.distance || 'N/A') },
            { label: 'Base fare', value: dollars(Number(data?.baseFare || 0)) },
            { label: 'Distance fare', value: dollars(Number(data?.distanceFare || 0)) },
            { label: 'Time fare', value: dollars(Number(data?.timeFare || 0)) },
            { label: 'Service fee', value: dollars(Number(data?.serviceFee || 0)) },
            { label: 'Taxes', value: dollars(Number(data?.taxes || 0)) },
            { label: 'Tolls', value: dollars(Number(data?.tolls || 0)) },
            { label: 'Discount', value: `-${dollars(Number(data?.discount || 0))}` },
            { label: 'Tip', value: dollars(Number(data?.tip || 0)) },
            { label: 'Total', value: dollars(Number(data?.total || 0)), strong: true },
            { label: 'Payment method', value: card(data?.paymentMethodLast4) },
            { label: 'Invoice #', value: escapeHtml(data?.invoiceNumber || 'N/A') }
          ])}
        </table>
      `,
      'Download receipt',
      escapeHtml(data?.downloadReceiptLink || '#')
    )
  }),

  DRIVER_PAYOUT_CONFIRMATION: (data: any) => ({
    subject: `Payout Processed - ${dollars(Number(data?.amount || 0))} transferred`,
    html: renderEmailShell(
      'Payout processed',
      `${dollars(Number(data?.amount || 0))} is on the way to your bank account.`,
      `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${renderRows([
            { label: 'Amount', value: dollars(Number(data?.amount || 0)), strong: true },
            { label: 'Bank account', value: `•••• ${escapeHtml(data?.bankLast4 || 'N/A')}` },
            { label: 'Processing time', value: '2-3 business days' }
          ])}
        </table>
      `,
      'View statement',
      escapeHtml(data?.statementLink || '#')
    )
  }),

  SUPPORT_REPLY: (data: any) => ({
    subject: `Support Team Replied - Ticket #${escapeHtml(data?.ticketNumber || 'N/A')}`,
    html: renderEmailShell(
      'Support update',
      `Your support ticket #${data?.ticketNumber || 'N/A'} has a new reply.`,
      `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${renderRows([
            { label: 'Ticket', value: `#${escapeHtml(data?.ticketNumber || 'N/A')}` },
            { label: 'Status', value: escapeHtml(data?.status || 'in_review') }
          ])}
        </table>
        <div style="margin-top:18px;padding:16px;border-radius:16px;background:#eff6ff;color:#1e3a8a;font-size:14px;line-height:1.7;">
          ${escapeHtml(data?.reply || '')}
        </div>
      `,
      'Open ticket',
      escapeHtml(data?.ticketLink || '#')
    )
  }),

  ADMIN_DAILY_REPORT: (data: any) => ({
    subject: `Daily platform report - ${escapeHtml(data?.reportDate || 'Today')}`,
    html: renderEmailShell(
      'Daily operations report',
      `A summary for ${data?.reportDate || 'today'} is ready.`,
      `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${renderRows([
            { label: 'Completed rides', value: escapeHtml(data?.completedRides || '0') },
            { label: 'Revenue', value: dollars(Number(data?.revenue || 0)), strong: true },
            { label: 'New users', value: escapeHtml(data?.newUsers || '0') },
            { label: 'Open support tickets', value: escapeHtml(data?.openTickets || '0') },
            { label: 'Driver payout volume', value: dollars(Number(data?.driverPayouts || 0)) }
          ])}
        </table>
      `,
      data?.dashboardLink ? 'Open dashboard' : undefined,
      data?.dashboardLink ? escapeHtml(data.dashboardLink) : undefined
    )
  }),

  PASSWORD_RESET: (data: any) => ({
    subject: 'Reset Your Password',
    html: renderEmailShell(
      'Reset your password',
      'Use the secure link below to choose a new password.',
      '<p style="margin:0;font-size:15px;line-height:1.7;">This link expires in 1 hour. If you did not request a password reset, you can ignore this email.</p>',
      'Reset password',
      escapeHtml(data?.resetLink || '#')
    )
  }),

  ACCOUNT_VERIFICATION: (data: any) => ({
    subject: 'Verify Your Email Address',
    html: renderEmailShell(
      'Verify your email',
      'Confirm your account to keep booking and receiving trip updates.',
      `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Use this verification code to finish setting up your Drive account:</p>
        <div style="display:inline-block;padding:14px 18px;border-radius:16px;background:#eff6ff;color:#1d4ed8;font-size:24px;font-weight:700;letter-spacing:4px;">
          ${escapeHtml(data?.verificationCode || 'N/A')}
        </div>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.7;">This link expires in 24 hours.</p>
      `,
      'Verify email',
      escapeHtml(data?.verificationLink || '#')
    )
  })
};
