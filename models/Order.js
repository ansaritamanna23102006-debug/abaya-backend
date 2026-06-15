import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  id: { type: String }, // product ID slug (e.g. aria-silk)
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  selectedSize: { type: String },
  image: { type: String }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  email: { type: String }, // support guest lookup
  id: { type: String, required: true, unique: true, index: true }, // Order Code e.g. ORD-1234-AT
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Processing", "Packed", "Shipped", "Out For Delivery", "Delivered", "Cancelled", "Returned", "Refunded"],
    default: "Pending"
  },
  items: [OrderItemSchema],
  total: { type: Number, required: true },
  shippingAddress: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, default: "UAE" },
    phone: { type: String }
  },
  paymentMethod: { type: String, default: "Razorpay" },
  paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed", "Refunded"], default: "Pending" },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  invoiceUrl: { type: String },
  date: { type: String }
}, {
  timestamps: true
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
