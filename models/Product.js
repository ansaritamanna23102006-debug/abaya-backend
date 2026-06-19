import mongoose from "mongoose";

const SeoMetadataSchema = new mongoose.Schema({
  title: { type: String },
  description: { type: String },
  keywords: { type: String }
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String },
  shortDescription: { type: String },
  price: { type: Number, required: true },
  salePrice: { type: Number },
  SKU: { type: String, unique: true, index: true },
  category: { type: String, required: true }, // Simple string category or matched to Category collection
  stock: { type: Number, default: 10 },
  sizes: [{ type: String }],
  details: [{ type: String }],
  color: { type: String },
  fabric: { type: String },
  image: { type: String }, // Main image URL
  hoverImage: { type: String },
  images: [{ type: String }], // Cloudinary URLs
  video: { type: String },
  featuredProduct: { type: Boolean, default: false },
  bestSeller: { type: Boolean, default: false },
  newArrival: { type: Boolean, default: false },
  rating: { type: Number, default: 5.0 },
  reviewsCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  seoMetadata: { type: SeoMetadataSchema, default: {} }
}, {
  timestamps: true
});

// Compound indexing for advanced search performance
ProductSchema.index({ name: "text", description: "text", fabric: "text" });

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
