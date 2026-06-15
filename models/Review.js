import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema({
  product: { type: String, required: true }, // product ID slug (e.g. aria-silk) or product name
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  date: { type: String },
  images: [{ type: String }],
  status: { type: String, enum: ["Approved", "Pending", "Hidden"], default: "Approved" }
}, {
  timestamps: true
});

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
