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

export const emailTemplates = {
  RIDE_CONFIRMATION: (data: any) => ({
    subject: 'Your ride is confirmed - Driver on the way',
    html: `
      <h2>Your Ride is Confirmed</h2>
      <p>Hi ${escapeHtml(data?.riderName || 'there')},</p>
      <p>Driver: <strong>${escapeHtml(data?.driverName || 'Driver')}</strong> ⭐ ${escapeHtml(data?.driverRating || '5.0')}</p>
      <p>Vehicle: ${escapeHtml(data?.carColor || '')} ${escapeHtml(data?.carMake || '')} ${escapeHtml(data?.carModel || '')} (${escapeHtml(data?.licensePlate || 'N/A')})</p>
      <p>Pickup: ${escapeHtml(data?.pickupAddress || 'N/A')}</p>
      <p>Dropoff: ${escapeHtml(data?.dropoffAddress || 'N/A')}</p>
      <p>ETA: ${escapeHtml(data?.eta || 'N/A')} minutes</p>
      <p>Estimated fare: ${dollars(Number(data?.fareEstimate || 0))}</p>
      <p><a href="${escapeHtml(data?.trackingLink || '#')}">Track your ride</a></p>
    `
  }),

  DRIVER_EARNINGS: (data: any) => ({
    subject: `You earned ${dollars(Number(data?.earnings || 0))} - Trip complete`,
    html: `
      <h2>Trip complete</h2>
      <p>Hi ${escapeHtml(data?.driverName || 'Driver')},</p>
      <p>Rider: ${escapeHtml(data?.riderName || 'Rider')}</p>
      <p>Pickup: ${escapeHtml(data?.pickupAddress || 'N/A')}</p>
      <p>Dropoff: ${escapeHtml(data?.dropoffAddress || 'N/A')}</p>
      <p>Duration: ${escapeHtml(data?.duration || 'N/A')}</p>
      <p>Distance: ${escapeHtml(data?.distance || 'N/A')}</p>
      <p>Gross fare: ${dollars(Number(data?.grossFare || 0))}</p>
      <p>Platform fee: ${dollars(Number(data?.platformFee || 0))}</p>
      <p><strong>Net earnings: ${dollars(Number(data?.earnings || 0))}</strong></p>
      <p>Today total: ${dollars(Number(data?.todayEarnings || 0))}</p>
      <p><a href="${escapeHtml(data?.walletLink || '#')}">View wallet</a></p>
    `
  }),

  PAYMENT_RECEIPT: (data: any) => ({
    subject: `Payment Receipt - Trip on ${escapeHtml(data?.tripDate || 'today')}`,
    html: `
      <h2>Payment Receipt</h2>
      <p>Hi ${escapeHtml(data?.riderName || 'there')},</p>
      <p>Driver: ${escapeHtml(data?.driverName || 'Driver')}</p>
      <p>Pickup: ${escapeHtml(data?.pickupAddress || 'N/A')}</p>
      <p>Dropoff: ${escapeHtml(data?.dropoffAddress || 'N/A')}</p>
      <p>Duration: ${escapeHtml(data?.duration || 'N/A')}</p>
      <p>Distance: ${escapeHtml(data?.distance || 'N/A')}</p>
      <hr/>
      <p>Base fare: ${dollars(Number(data?.baseFare || 0))}</p>
      <p>Distance fare: ${dollars(Number(data?.distanceFare || 0))}</p>
      <p>Time fare: ${dollars(Number(data?.timeFare || 0))}</p>
      <p>Service fee: ${dollars(Number(data?.serviceFee || 0))}</p>
      <p>Taxes: ${dollars(Number(data?.taxes || 0))}</p>
      <p>Tolls: ${dollars(Number(data?.tolls || 0))}</p>
      <p>Discount: -${dollars(Number(data?.discount || 0))}</p>
      <p>Tip: ${dollars(Number(data?.tip || 0))}</p>
      <p><strong>Total: ${dollars(Number(data?.total || 0))}</strong></p>
      <p>Payment method: ${card(data?.paymentMethodLast4)}</p>
      <p>Invoice #: ${escapeHtml(data?.invoiceNumber || 'N/A')}</p>
      <p><a href="${escapeHtml(data?.downloadReceiptLink || '#')}">Download receipt</a></p>
    `
  }),

  DRIVER_PAYOUT_CONFIRMATION: (data: any) => ({
    subject: `Payout Processed - ${dollars(Number(data?.amount || 0))} transferred`,
    html: `
      <h2>Payout processed</h2>
      <p>Amount: ${dollars(Number(data?.amount || 0))}</p>
      <p>Bank account: •••• ${escapeHtml(data?.bankLast4 || 'N/A')}</p>
      <p>Processing time: 2-3 business days</p>
      <p><a href="${escapeHtml(data?.statementLink || '#')}">View statement</a></p>
    `
  }),

  DRIVER_PAYOUT: (data: any) => ({
    subject: `Payout Processed - ${dollars(Number(data?.payoutAmount || data?.amount || 0))} transferred`,
    html: `
      <h2>Payout processed</h2>
      <p>Hi ${escapeHtml(data?.driverName || 'Driver')},</p>
      <p>Amount: ${dollars(Number(data?.payoutAmount || data?.amount || 0))}</p>
      ${data?.bankLast4 ? `<p>Bank account: •••• ${escapeHtml(data.bankLast4)}</p>` : ''}
      <p>Processing time: 2-3 business days</p>
      ${data?.statementLink ? `<p><a href="${escapeHtml(data.statementLink)}">View statement</a></p>` : ''}
    `
  }),

  SUPPORT_REPLY: (data: any) => ({
    subject: `Support Team Replied - Ticket #${escapeHtml(data?.ticketNumber || 'N/A')}`,
    html: `
      <h2>Support update</h2>
      ${data?.userName ? `<p>Hi ${escapeHtml(data.userName)},</p>` : ''}
      <p>Ticket #${escapeHtml(data?.ticketNumber || 'N/A')}</p>
      <p>Status: ${escapeHtml(data?.ticketStatus || data?.status || 'in_review')}</p>
      <p>${escapeHtml(data?.reply || '')}</p>
      ${data?.ticketLink ? `<p><a href="${escapeHtml(data.ticketLink)}">Open ticket</a></p>` : ''}
    `
  }),

  PASSWORD_RESET: (data: any) => ({
    subject: 'Reset Your Password',
    html: `
      <h2>Reset your password</h2>
      ${data?.userName ? `<p>Hi ${escapeHtml(data.userName)},</p>` : ''}
      <p><a href="${escapeHtml(data?.resetLink || '#')}">Reset Password</a></p>
      <p>This link expires in ${data?.expiresInMinutes ?? 60} minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `
  }),

  ACCOUNT_VERIFICATION: (data: any) => ({
    subject: 'Verify Your Email Address',
    html: `
      <h2>Verify your email address</h2>
      ${data?.userName ? `<p>Welcome, ${escapeHtml(data.userName)}!</p>` : '<p>Welcome to Drive!</p>'}
      <p>Your verification code: <strong>${escapeHtml(data?.verificationCode || 'N/A')}</strong></p>
      ${data?.verifyLink || data?.verificationLink ? `<p><a href="${escapeHtml(data.verifyLink || data.verificationLink)}">Verify Email</a></p>` : ''}
      <p>This link expires in ${data?.expiresInHours ?? 24} hours.</p>
    `
  }),

  WEEKLY_EARNINGS_REPORT: (data: any) => ({
    subject: 'Your Weekly Earnings Report',
    html: `
      <h2>Weekly Earnings Report</h2>
      <p>Hi ${escapeHtml(data?.driverName || 'Driver')},</p>
      <p>Here's your summary for the week of ${escapeHtml(data?.weekStart || '')} - ${escapeHtml(data?.weekEnd || '')}:</p>
      <p>🚗 Total Rides: <strong>${escapeHtml(data?.totalRides ?? 0)}</strong></p>
      <p>💰 Total Earnings: <strong>${dollars(Number(data?.totalEarnings || 0))}</strong></p>
      <p>⭐ Average Rating: <strong>${escapeHtml(data?.averageRating ?? 'N/A')}/5</strong></p>
      <p>✅ Acceptance Rate: <strong>${Math.round((Number(data?.acceptanceRate) || 0) * 100)}%</strong></p>
      <p>❌ Cancellation Rate: <strong>${Math.round((Number(data?.cancellationRate) || 0) * 100)}%</strong></p>
      ${data?.bestDayName && data?.bestDayEarnings ? `<p>🏆 Best Day: <strong>${escapeHtml(data.bestDayName)} (${dollars(Number(data.bestDayEarnings))})</strong></p>` : ''}
      ${data?.dashboardLink ? `<p><a href="${escapeHtml(data.dashboardLink)}">View Full Dashboard</a></p>` : ''}
    `
  }),

  PROMOTIONAL: (data: any) => ({
    subject: `Special Offer Just For You! 🎉 Save ${dollars(Number(data?.discountAmount || 0))}`,
    html: `
      <h2>Special Offer Just For You! 🎉</h2>
      ${data?.userName ? `<p>Hi ${escapeHtml(data.userName)},</p>` : ''}
      <p>Promo code: <strong>${escapeHtml(data?.promoCode || '')}</strong></p>
      <p>Save <strong>${dollars(Number(data?.discountAmount || 0))}</strong> on your next ride!</p>
      <p>Valid until: ${escapeHtml(data?.validUntil || '')}</p>
      ${data?.claimLink ? `<p><a href="${escapeHtml(data.claimLink)}">Claim Offer</a></p>` : ''}
      ${data?.termsUrl ? `<p><a href="${escapeHtml(data.termsUrl)}">Terms and conditions apply.</a></p>` : ''}
    `
  })
};
