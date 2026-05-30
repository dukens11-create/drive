'use client';

import { jsPDF } from 'jspdf';
import type { RideReceipt, RideSummary, WalletEntry } from './types';

export function downloadReceiptPdf(ride: RideSummary, receipt: RideReceipt | null) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Drive Passenger Receipt', 20, 20);
  doc.setFontSize(11);
  doc.text(`Ride ID: ${ride.id}`, 20, 34);
  doc.text(`Status: ${ride.status}`, 20, 42);
  doc.text(`Issued: ${receipt?.issuedAt || ride.updatedAt}`, 20, 50);
  doc.text(`Fare estimate: $${ride.fareEstimate.toFixed(2)}`, 20, 58);
  if (receipt) {
    doc.text(`Invoice: ${receipt.invoiceNumber}`, 20, 66);
    doc.text(`Total charged: $${(receipt.totalCents / 100).toFixed(2)}`, 20, 74);
    doc.text(`Surge multiplier: ${receipt.surgeMultiplier.toFixed(2)}x`, 20, 82);
  }
  doc.save(`${ride.id}-receipt.pdf`);
}

export function downloadWalletCsv(entries: WalletEntry[]) {
  const header = 'id,kind,amountCents,reason,createdAt';
  const rows = entries.map((entry) => [entry.id, entry.kind, entry.amountCents, entry.reason, entry.createdAt].join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'wallet-transactions.csv';
  link.click();
  URL.revokeObjectURL(url);
}
