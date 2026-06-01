import nodemailer from "nodemailer";

export interface OrderEmailData {
  id: string;
  displayId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  couponCode?: string;
  createdAt: string;
}

function isEmailEnabled(): boolean {
  return (
    process.env.EMAIL_ENABLED === "true" &&
    !!process.env.EMAIL_USER &&
    !!process.env.EMAIL_PASS
  );
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function buildOrderEmailHtml(data: OrderEmailData): string {
  const date = new Date(data.createdAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const itemsHtml = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${item.price.toFixed(2)} EGP</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${(item.price * item.quantity).toFixed(2)} EGP</td>
        </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#000;padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">New Order Received</h1>
      <p style="color:#aaa;margin:6px 0 0;font-size:14px;">#{${data.displayId}}</p>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="color:#666;font-size:12px;padding:4px 0;">Order Date</td><td style="text-align:right;font-size:14px;">${date}</td></tr>
        <tr><td style="color:#666;font-size:12px;padding:4px 0;">Customer</td><td style="text-align:right;font-size:14px;font-weight:bold;">${data.customerName}</td></tr>
        ${data.customerPhone ? `<tr><td style="color:#666;font-size:12px;padding:4px 0;">Phone</td><td style="text-align:right;font-size:14px;">${data.customerPhone}</td></tr>` : ""}
      </table>

      <h3 style="font-size:14px;color:#333;margin:0 0 8px;">Order Items</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f9f9f9;">
            <th style="padding:8px 12px;text-align:left;">Item</th>
            <th style="padding:8px 12px;text-align:center;">Qty</th>
            <th style="padding:8px 12px;text-align:right;">Price</th>
            <th style="padding:8px 12px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
        <tr><td style="padding:4px 0;color:#666;">Subtotal</td><td style="text-align:right;">${data.subtotal.toFixed(2)} EGP</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Delivery Fee</td><td style="text-align:right;">${data.deliveryFee.toFixed(2)} EGP</td></tr>
        ${data.discountAmount > 0 ? `<tr><td style="padding:4px 0;color:#e74c3c;">Discount${data.couponCode ? ` (${data.couponCode})` : ""}</td><td style="text-align:right;color:#e74c3c;">-${data.discountAmount.toFixed(2)} EGP</td></tr>` : ""}
        <tr style="font-weight:bold;font-size:16px;">
          <td style="padding:8px 0;border-top:2px solid #000;">Net Total</td>
          <td style="text-align:right;border-top:2px solid #000;">${data.total.toFixed(2)} EGP</td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
  if (!isEmailEnabled()) {
    console.log("[email] EMAIL_ENABLED is false or credentials missing — skipping");
    return;
  }

  const to = process.env.EMAIL_TO || process.env.EMAIL_USER || "";
  if (!to) {
    console.log("[email] No recipient configured (EMAIL_TO or EMAIL_USER) — skipping");
    return;
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"Blank Store" <${process.env.EMAIL_USER}>`,
      to,
      subject: `New Order Received - #${data.displayId}`,
      html: buildOrderEmailHtml(data),
    });
    console.log(`[email] Order notification sent: ${info.messageId}`);
  } catch (err) {
    console.error("[email] Failed to send order notification:", err instanceof Error ? err.message : err);
  }
}
