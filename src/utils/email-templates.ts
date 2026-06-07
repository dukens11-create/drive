<<<<<<< HEAD
/**
 * HTML email templates for all transactional email types.
 * Each template function accepts a typed data object and returns { subject, html }.
 */

export const emailTemplates = {
  RIDE_CONFIRMATION: (data: {
    riderName: string;
    driverName: string;
    driverRating: number;
    carColor: string;
    carMake: string;
    carModel: string;
    licensePlate: string;
    pickupAddress: string;
    dropoffAddress: string;
    eta: number;
    fareEstimate: number;
    trackingLink: string;
  }) => ({
    subject: 'Your ride is confirmed - Driver on the way',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #007AFF;">Your Ride is Confirmed</h2>
        <p>Hi ${data.riderName},</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Driver Details</h3>
          <p><strong>${data.driverName}</strong> ⭐ ${data.driverRating}/5</p>
          <p>${data.carColor} ${data.carMake} ${data.carModel}</p>
          <p>Plate: <strong>${data.licensePlate}</strong></p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Trip Details</h3>
          <p>📍 Pickup: ${data.pickupAddress}</p>
          <p>📍 Dropoff: ${data.dropoffAddress}</p>
          <p>⏱️ ETA: ${data.eta} minutes</p>
          <p>💰 Estimated fare: $${(data.fareEstimate / 100).toFixed(2)}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.trackingLink}" style="background: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Track Your Ride</a>
        </div>

        <p style="color: #888; font-size: 13px;">Need help? <a href="mailto:support@drive.app">Contact support</a></p>
      </div>
    `
  }),

  PAYMENT_RECEIPT: (data: {
    riderName: string;
    driverName: string;
    tripDate: string;
    distance: number;
    duration: string;
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeFare?: number;
    surgeMultiplier?: number;
    serviceFee: number;
    taxes?: number;
    tolls?: number;
    discount?: number;
    tip?: number;
    total: number;
    paymentMethod?: string;
    invoiceNumber?: string;
    downloadReceiptLink?: string;
  }) => ({
    subject: `Payment Receipt - Trip on ${data.tripDate}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #007AFF;">Payment Receipt</h2>
        <p>Hi ${data.riderName},</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Trip Summary</h3>
          <p>Driver: <strong>${data.driverName}</strong></p>
          <p>Date: <strong>${data.tripDate}</strong></p>
          <p>Distance: <strong>${data.distance} miles</strong></p>
          <p>Duration: <strong>${data.duration}</strong></p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Fare Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px 0;">Base Fare</td>
              <td style="text-align: right; padding: 8px 0;">$${(data.baseFare / 100).toFixed(2)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px 0;">Distance (${data.distance}mi)</td>
              <td style="text-align: right; padding: 8px 0;">$${(data.distanceFare / 100).toFixed(2)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px 0;">Time (${data.duration})</td>
              <td style="text-align: right; padding: 8px 0;">$${(data.timeFare / 100).toFixed(2)}</td>
            </tr>
            ${data.surgeMultiplier && data.surgeMultiplier > 1 && data.surgeFare ? `
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px 0;">Surge (${data.surgeMultiplier}x)</td>
              <td style="text-align: right; padding: 8px 0;">$${(data.surgeFare / 100).toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px 0;">Service Fee</td>
              <td style="text-align: right; padding: 8px 0;">$${(data.serviceFee / 100).toFixed(2)}</td>
            </tr>
            ${data.taxes ? `
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px 0;">Taxes</td>
              <td style="text-align: right; padding: 8px 0;">$${(data.taxes / 100).toFixed(2)}</td>
            </tr>
            ` : ''}
            ${data.tolls ? `
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px 0;">Tolls</td>
              <td style="text-align: right; padding: 8px 0;">$${(data.tolls / 100).toFixed(2)}</td>
            </tr>
            ` : ''}
            ${data.discount && data.discount > 0 ? `
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px 0;">Discount</td>
              <td style="text-align: right; padding: 8px 0; color: green;">-$${(data.discount / 100).toFixed(2)}</td>
            </tr>
            ` : ''}
            ${data.tip && data.tip > 0 ? `
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px 0;">Tip</td>
              <td style="text-align: right; padding: 8px 0;">$${(data.tip / 100).toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px 0; font-weight: bold; font-size: 16px;">Total</td>
              <td style="text-align: right; padding: 10px 0; font-weight: bold; font-size: 16px;">$${(data.total / 100).toFixed(2)}</td>
            </tr>
          </table>
        </div>

        ${data.paymentMethod ? `<p>Payment Method: ${data.paymentMethod}</p>` : ''}
        ${data.invoiceNumber ? `<p>Invoice #: ${data.invoiceNumber}</p>` : ''}

        ${data.downloadReceiptLink ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.downloadReceiptLink}" style="background: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Receipt (PDF)</a>
        </div>
        ` : ''}

        <p style="color: #888; font-size: 13px;">Thank you for riding with Drive!</p>
      </div>
    `
  }),

  DRIVER_EARNINGS: (data: {
    driverName: string;
    riderName: string;
    passengerRating?: number;
    distance: number;
    duration: string;
    grossFare: number;
    platformFee: number;
    earnings: number;
    tip?: number;
    walletBalance?: number;
    todayEarnings?: number;
    walletLink?: string;
  }) => ({
    subject: `You earned $${(data.earnings / 100).toFixed(2)} - Trip complete`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #34C759;">Trip Completed 🎉</h2>
        <p>Great job, ${data.driverName}!</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Trip Summary</h3>
          <p>Passenger: <strong>${data.riderName}</strong></p>
          ${data.passengerRating ? `<p>Rating: ⭐ ${data.passengerRating}/5</p>` : ''}
          <p>Distance: <strong>${data.distance} miles</strong></p>
          <p>Duration: <strong>${data.duration}</strong></p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Payment Breakdown</h3>
          <p>Gross Fare: $${(data.grossFare / 100).toFixed(2)}</p>
          <p>Platform Fee (20%): -$${(data.platformFee / 100).toFixed(2)}</p>
          <p><strong>Your Earnings: $${(data.earnings / 100).toFixed(2)}</strong></p>
          ${data.tip && data.tip > 0 ? `<p>Tip: +$${(data.tip / 100).toFixed(2)}</p>` : ''}
        </div>

        ${data.walletBalance !== undefined ? `<p>Wallet Balance: <strong>$${(data.walletBalance / 100).toFixed(2)}</strong></p>` : ''}
        ${data.todayEarnings !== undefined ? `<p>Today's Total: <strong>$${(data.todayEarnings / 100).toFixed(2)}</strong></p>` : ''}

        ${data.walletLink ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.walletLink}" style="background: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">View Wallet</a>
        </div>
        ` : ''}
      </div>
    `
  }),

  DRIVER_PAYOUT: (data: {
    driverName: string;
    payoutAmount: number;
    bankLast4?: string;
    statementLink?: string;
  }) => ({
    subject: `Payout Processed - $${(data.payoutAmount / 100).toFixed(2)} transferred`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #34C759;">Payout Processed ✅</h2>
        <p>Hi ${data.driverName},</p>
        <p>Your payout of <strong>$${(data.payoutAmount / 100).toFixed(2)}</strong> has been processed.</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Amount: <strong>$${(data.payoutAmount / 100).toFixed(2)}</strong></p>
          ${data.bankLast4 ? `<p>Bank Account: ****${data.bankLast4}</p>` : ''}
          <p>Processing Time: 2-3 business days</p>
        </div>

        ${data.statementLink ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.statementLink}" style="background: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">View Statement</a>
        </div>
        ` : ''}

        <p style="color: #888; font-size: 13px;">Thank you for driving with Drive!</p>
      </div>
    `
  }),

  SUPPORT_REPLY: (data: {
    userName: string;
    ticketNumber: string;
    reply: string;
    ticketStatus: string;
    ticketLink?: string;
    conversationHistory?: Array<{ author: string; message: string; createdAt: string }>;
  }) => ({
    subject: `Support Team Replied - Ticket #${data.ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #007AFF;">Support Team Replied</h2>
        <p>Hi ${data.userName},</p>
        <p>Our support team has replied to your ticket <strong>#${data.ticketNumber}</strong>.</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Latest Reply</h3>
          <p>${data.reply}</p>
          <p>Ticket Status: <strong>${data.ticketStatus}</strong></p>
        </div>

        ${data.conversationHistory && data.conversationHistory.length > 0 ? `
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Previous Messages</h3>
          ${data.conversationHistory.map(msg => `
            <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
              <strong>${msg.author}</strong>: ${msg.message}
              <br><small style="color: #888;">${msg.createdAt}</small>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${data.ticketLink ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.ticketLink}" style="background: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">View Ticket in App</a>
        </div>
        ` : ''}

        <p style="color: #888; font-size: 13px;">Thank you for contacting Drive support.</p>
      </div>
    `
  }),

  PASSWORD_RESET: (data: {
    userName?: string;
    resetLink: string;
    expiresInMinutes?: number;
  }) => ({
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #007AFF;">Reset Your Password</h2>
        ${data.userName ? `<p>Hi ${data.userName},</p>` : ''}
        <p>We received a request to reset your Drive account password.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetLink}" style="background: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        </div>

        <p>Or copy this link: <a href="${data.resetLink}">${data.resetLink}</a></p>

        <p>This link expires in <strong>${data.expiresInMinutes ?? 60} minutes</strong>.</p>

        <p style="color: #888; font-size: 13px;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
        <p style="color: #888; font-size: 13px;">Need help? <a href="mailto:support@drive.app">Contact support</a></p>
      </div>
    `
  }),

  ACCOUNT_VERIFICATION: (data: {
    userName?: string;
    verificationCode: string;
    verifyLink?: string;
    expiresInHours?: number;
  }) => ({
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #007AFF;">Verify Your Email</h2>
        ${data.userName ? `<p>Welcome, ${data.userName}!</p>` : '<p>Welcome to Drive!</p>'}
        <p>Please verify your email address to complete your account setup.</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0;">Your Verification Code</h3>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007AFF;">${data.verificationCode}</p>
        </div>

        ${data.verifyLink ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verifyLink}" style="background: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
        </div>
        ` : ''}

        <p>This code expires in <strong>${data.expiresInHours ?? 24} hours</strong>.</p>

        <p style="color: #888; font-size: 13px;">If you didn't create a Drive account, you can safely ignore this email.</p>
      </div>
    `
  }),

  WEEKLY_EARNINGS_REPORT: (data: {
    driverName: string;
    totalRides: number;
    totalEarnings: number;
    averageRating: number;
    acceptanceRate: number;
    cancellationRate: number;
    bestDayName?: string;
    bestDayEarnings?: number;
    weekStart: string;
    weekEnd: string;
    dashboardLink?: string;
  }) => ({
    subject: 'Your Weekly Earnings Report',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #007AFF;">Weekly Earnings Report</h2>
        <p>Hi ${data.driverName},</p>
        <p>Here's your summary for the week of ${data.weekStart} - ${data.weekEnd}:</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">This Week's Highlights</h3>
          <p>🚗 Total Rides: <strong>${data.totalRides}</strong></p>
          <p>💰 Total Earnings: <strong>$${(data.totalEarnings / 100).toFixed(2)}</strong></p>
          <p>⭐ Average Rating: <strong>${data.averageRating}/5</strong></p>
          <p>✅ Acceptance Rate: <strong>${Math.round(data.acceptanceRate * 100)}%</strong></p>
          <p>❌ Cancellation Rate: <strong>${Math.round(data.cancellationRate * 100)}%</strong></p>
          ${data.bestDayName && data.bestDayEarnings ? `<p>🏆 Best Day: <strong>${data.bestDayName} ($${(data.bestDayEarnings / 100).toFixed(2)})</strong></p>` : ''}
        </div>

        ${data.dashboardLink ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboardLink}" style="background: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">View Full Dashboard</a>
        </div>
        ` : ''}

        <p style="color: #888; font-size: 13px;">Keep up the great work!</p>
      </div>
    `
  }),

  PROMOTIONAL: (data: {
    userName?: string;
    promoCode: string;
    discountAmount: number;
    validUntil: string;
    claimLink?: string;
    termsUrl?: string;
  }) => ({
    subject: `[PROMOTION] Get $${(data.discountAmount / 100).toFixed(2)} off your next ride`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #FF9500;">Special Offer Just For You! 🎉</h2>
        ${data.userName ? `<p>Hi ${data.userName},</p>` : ''}
        <p>You have a special discount waiting!</p>

        <div style="background: #FFF3E0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #FF9500;">
          <h3 style="margin-top: 0; color: #FF9500;">Your Promo Code</h3>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #333;">${data.promoCode}</p>
          <p>Save <strong>$${(data.discountAmount / 100).toFixed(2)}</strong> on your next ride!</p>
          <p style="color: #888;">Valid until: ${data.validUntil}</p>
        </div>

        ${data.claimLink ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.claimLink}" style="background: #FF9500; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Claim Offer</a>
        </div>
        ` : ''}

        ${data.termsUrl ? `<p style="color: #888; font-size: 12px;"><a href="${data.termsUrl}">Terms and conditions apply.</a></p>` : ''}
      </div>
=======
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

  SUPPORT_REPLY: (data: any) => ({
    subject: `Support Team Replied - Ticket #${escapeHtml(data?.ticketNumber || 'N/A')}`,
    html: `
      <h2>Support update</h2>
      <p>Ticket #${escapeHtml(data?.ticketNumber || 'N/A')}</p>
      <p>Status: ${escapeHtml(data?.status || 'in_review')}</p>
      <p>${escapeHtml(data?.reply || '')}</p>
      <p><a href="${escapeHtml(data?.ticketLink || '#')}">Open ticket</a></p>
    `
  }),

  PASSWORD_RESET: (data: any) => ({
    subject: 'Reset Your Password',
    html: `
      <h2>Reset your password</h2>
      <p><a href="${escapeHtml(data?.resetLink || '#')}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `
  }),

  ACCOUNT_VERIFICATION: (data: any) => ({
    subject: 'Verify Your Email Address',
    html: `
      <h2>Verify your email address</h2>
      <p>Your verification code: <strong>${escapeHtml(data?.verificationCode || 'N/A')}</strong></p>
      <p><a href="${escapeHtml(data?.verificationLink || '#')}">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
>>>>>>> origin/main
    `
  })
};
