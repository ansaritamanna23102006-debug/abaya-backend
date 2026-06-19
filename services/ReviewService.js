import Review from "../models/Review.js";
import Product from "../models/Product.js";
import { reviews as initialReviews } from "../data/products.js";

export class ReviewService {
  static async seedIfNeeded() {
    // Automatic seeding disabled to keep reviews database clean.
  }

  static async getAllReviews() {
    await this.seedIfNeeded();
    return Review.find({ status: "Approved" }).sort({ createdAt: -1 });
  }

  static async createReview(reviewData) {
    const newReview = await Review.create({
      ...reviewData,
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      status: "Approved"
    });

    // Dynamically update product reviews count and avg rating
    try {
      const productSlug = reviewData.product.toLowerCase().replace(/\s+/g, "-");
      const reviews = await Review.find({ product: reviewData.product, status: "Approved" });
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 5.0;

      await Product.findOneAndUpdate(
        { slug: productSlug },
        { 
          rating: Number(avgRating),
          reviewsCount: reviews.length
        }
      );
    } catch (e) {
      console.warn("Could not dynamically update Product ratings, bypassing:", e);
    }

    return newReview;
  }
}
