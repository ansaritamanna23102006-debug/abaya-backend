import mongoose from "mongoose";
import Product from "../models/Product.js";
import { products as initialProducts } from "../data/products.js";

export class ProductService {
  static async seedIfNeeded() {
    const count = await Product.countDocuments({ isDeleted: false });
    const hasTest = await Product.findOne({ slug: "test" });
    if (count === 0 || (count === 1 && hasTest)) {
      console.log("Seeding database with default luxury products...");
      await Product.deleteMany({});
      
      const seeded = initialProducts.map(p => ({
        ...p,
        slug: p.id,
        SKU: `SKU-${p.id.toUpperCase()}`,
        seoMetadata: {
          title: `${p.name} | Abaya by Tabassum`,
          description: p.description.substring(0, 150),
          keywords: `${p.category}, ${p.fabric}, Modest Fashion`
        }
      }));

      await Product.insertMany(seeded);
      console.log("Seeding complete!");
    }
  }

  static async getAllProducts(filters = {}) {
    await this.seedIfNeeded();
    const query = { isDeleted: false, ...filters };
    return Product.find(query).sort({ createdAt: -1 });
  }

  static async getProductBySlug(slug) {
    await this.seedIfNeeded();
    const product = await Product.findOne({ slug, isDeleted: false });
    if (!product) throw new Error("Product not found");
    return product;
  }

  static async createProduct(productData) {
    const existing = await Product.findOne({ slug: productData.slug });
    if (existing) throw new Error("A product with this slug ID already exists");

    if (!productData.SKU) {
      productData.SKU = `SKU-${productData.slug.toUpperCase()}`;
    }

    return Product.create(productData);
  }

  static async updateProduct(idOrSlug, updateData) {
    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? { _id: idOrSlug }
      : { slug: idOrSlug };

    const product = await Product.findOneAndUpdate(query, updateData, { new: true });
    if (!product) throw new Error("Product not found");
    return product;
  }

  static async softDeleteProduct(idOrSlug) {
    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? { _id: idOrSlug }
      : { slug: idOrSlug };

    const product = await Product.findOneAndUpdate(
      query,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!product) throw new Error("Product not found");
    return product;
  }

  static async restoreProduct(id) {
    const product = await Product.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!product) throw new Error("Product not found");
    return product;
  }

  static async searchProducts({ query, category, fabric, minPrice, maxPrice, sort }) {
    await this.seedIfNeeded();
    const searchConditions = { isDeleted: false };

    if (query) {
      searchConditions.$or = [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { fabric: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } }
      ];
    }

    if (category) {
      searchConditions.category = category;
    }

    if (fabric) {
      searchConditions.fabric = { $regex: fabric, $options: "i" };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      searchConditions.price = {};
      if (minPrice !== undefined) searchConditions.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) searchConditions.price.$lte = Number(maxPrice);
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price-asc") sortOption = { price: 1 };
    if (sort === "price-desc") sortOption = { price: -1 };
    if (sort === "rating") sortOption = { rating: -1 };

    return Product.find(searchConditions).sort(sortOption);
  }

  static async getSearchSuggestions(query) {
    if (!query) return [];
    await this.seedIfNeeded();
    const products = await Product.find({
      name: { $regex: query, $options: "i" },
      isDeleted: false
    })
      .select("name slug category price image")
      .limit(5);

    return products;
  }
}
