import Razorpay from "razorpay";
import crypto from "crypto";

const isConfigured = !!(
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET
);

let razorpayInstance = null;

if (isConfigured) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export const getRazorpayInstance = () => {
  if (razorpayInstance) return razorpayInstance;

  // Mock implementation for development and sandboxed testing
  return {
    orders: {
      create: async ({ amount, currency, receipt }) => {
        console.log("Using Mock Razorpay Order Creation:", { amount, currency, receipt });
        return {
          id: `rzp_mock_${Math.floor(100000 + Math.random() * 900000)}`,
          amount,
          currency,
          receipt,
          status: "created",
        };
      },
    },
    payments: {
      fetch: async (paymentId) => {
        return {
          id: paymentId,
          status: "captured",
          amount: 10000,
        };
      },
    },
  };
};

export const verifyPaymentSignature = (orderId, paymentId, signature) => {
  if (!isConfigured) {
    console.log("Mock Payment Verification Approved (Dev Mode)");
    return true;
  }
  const text = `${orderId}|${paymentId}`;
  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest("hex");
  return generated_signature === signature;
};

