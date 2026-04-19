export type QPayInvoiceRequest = {
  invoiceCode: string;
  productName: string;
  amount: number;
  callbackUrl: string;
};

export type QPayInvoiceResponse = {
  providerConnected: boolean;
  qpayInvoiceId?: string | null;
  qrText?: string | null;
  qrImage?: string | null;
  paymentUrl?: string | null;
  raw?: Record<string, unknown>;
  message?: string;
};

export type QPayInvoiceStatus = "pending" | "paid" | "failed" | "expired";

function qpayConfig() {
  return {
    // TODO: Put your QPay merchant username in QPAY_MERCHANT_USERNAME.
    username: process.env.QPAY_MERCHANT_USERNAME,
    // TODO: Put your QPay merchant password in QPAY_MERCHANT_PASSWORD.
    password: process.env.QPAY_MERCHANT_PASSWORD,
    // TODO: Put your QPay access token in QPAY_TOKEN if your account uses a fixed token.
    token: process.env.QPAY_TOKEN,
    // TODO: Put the QPay API base URL in QPAY_API_URL, for example the official merchant API URL from QPay.
    apiUrl: process.env.QPAY_API_URL,
    // TODO: Put an optional webhook verification token in QPAY_WEBHOOK_TOKEN and send it as x-qpay-webhook-token.
    webhookToken: process.env.QPAY_WEBHOOK_TOKEN,
  };
}

export function isQPayConfigured() {
  const config = qpayConfig();
  return Boolean(config.apiUrl && (config.token || (config.username && config.password)));
}

async function getAccessToken() {
  const config = qpayConfig();
  if (config.token) return config.token;
  if (!config.apiUrl || !config.username || !config.password) return null;

  const response = await fetch(`${config.apiUrl.replace(/\/$/, "")}/auth/token`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`QPay auth failed with ${response.status}`);
  }

  const data = await response.json() as { access_token?: string; token?: string };
  return data.access_token ?? data.token ?? null;
}

export async function createQPayInvoice(input: QPayInvoiceRequest): Promise<QPayInvoiceResponse> {
  const config = qpayConfig();
  if (!isQPayConfigured()) {
    return {
      providerConnected: false,
      message: "QPay credentials are not configured yet. Invoice is saved locally as pending, but no live QR was created.",
    };
  }

  const token = await getAccessToken();
  if (!token || !config.apiUrl) {
    return {
      providerConnected: false,
      message: "QPay token could not be resolved. Check QPAY_TOKEN or merchant username/password.",
    };
  }

  const response = await fetch(`${config.apiUrl.replace(/\/$/, "")}/invoice`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      invoice_code: input.invoiceCode,
      sender_invoice_no: input.invoiceCode,
      invoice_receiver_code: input.invoiceCode,
      invoice_description: input.productName,
      amount: input.amount,
      callback_url: input.callbackUrl,
    }),
  });

  if (!response.ok) {
    throw new Error(`QPay invoice creation failed with ${response.status}`);
  }

  const raw = await response.json() as Record<string, unknown>;
  return {
    providerConnected: true,
    qpayInvoiceId: String(raw.invoice_id ?? raw.qpay_invoice_id ?? raw.id ?? ""),
    qrText: typeof raw.qr_text === "string" ? raw.qr_text : typeof raw.qrText === "string" ? raw.qrText : null,
    qrImage: typeof raw.qr_image === "string" ? raw.qr_image : typeof raw.qrImage === "string" ? raw.qrImage : null,
    paymentUrl: typeof raw.invoice_url === "string" ? raw.invoice_url : typeof raw.payment_url === "string" ? raw.payment_url : null,
    raw,
  };
}

export async function checkQPayInvoiceStatus(qpayInvoiceId: string, invoiceCode: string): Promise<{ status: QPayInvoiceStatus; raw?: Record<string, unknown>; providerConnected: boolean; message?: string }> {
  const config = qpayConfig();
  if (!isQPayConfigured()) {
    return { status: "pending", providerConnected: false, message: "QPay credentials are not configured yet." };
  }

  const token = await getAccessToken();
  if (!token || !config.apiUrl) {
    return { status: "pending", providerConnected: false, message: "QPay token could not be resolved." };
  }

  const response = await fetch(`${config.apiUrl.replace(/\/$/, "")}/payment/check`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: qpayInvoiceId || invoiceCode,
      invoice_code: invoiceCode,
    }),
  });

  if (!response.ok) {
    throw new Error(`QPay payment check failed with ${response.status}`);
  }

  const raw = await response.json() as Record<string, unknown>;
  const value = String(raw.payment_status ?? raw.status ?? raw.state ?? "").toLowerCase();
  const paidAmount = Number(raw.paid_amount ?? raw.total_amount ?? raw.amount ?? 0);
  const count = Number(raw.count ?? raw.rows_count ?? 0);
  const status: QPayInvoiceStatus =
    value.includes("paid") || value.includes("success") || paidAmount > 0 || count > 0
      ? "paid"
      : value.includes("fail")
        ? "failed"
        : value.includes("expire")
          ? "expired"
          : "pending";

  return { status, raw, providerConnected: true };
}

export function verifyQPayWebhook(headers: Record<string, string | string[] | undefined>) {
  const expected = qpayConfig().webhookToken;
  if (!expected) return true;
  const received = headers["x-qpay-webhook-token"];
  return Array.isArray(received) ? received.includes(expected) : received === expected;
}