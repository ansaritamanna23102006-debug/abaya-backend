import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional()
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export const ProductCreateSchema = z.object({
  id: z.string().min(1, "Slug ID is required"),
  name: z.string().min(1, "Product Name is required"),
  price: z.number().positive("Price must be a positive number"),
  category: z.string().min(1, "Category is required"),
  fabric: z.string().optional(),
  sizes: z.array(z.string()).min(1, "At least one size is required"),
  image: z.string().optional(),
  hoverImage: z.string().optional(),
  video: z.string().optional(),
  stock: z.number().nonnegative().optional().default(10),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  salePrice: z.number().positive().optional(),
  color: z.string().optional(),
  featuredProduct: z.boolean().optional(),
  bestSeller: z.boolean().optional(),
  newArrival: z.boolean().optional(),
  seoMetadata: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.string().optional()
  }).optional()
});

export const OrderCreateSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    selectedSize: z.string(),
    image: z.string().optional()
  })).min(1, "Order must contain at least one item"),
  total: z.number().positive("Total must be positive"),
  shippingAddress: z.object({
    name: z.string().min(1, "Name is required"),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    country: z.string().default("UAE"),
    phone: z.string().min(1, "Phone is required")
  }),
  paymentMethod: z.string().default("Razorpay")
});

export const CouponCreateSchema = z.object({
  code: z.string().min(3, "Coupon code must be at least 3 characters").toUpperCase(),
  discountPercent: z.number().min(1).max(100),
  discountFixed: z.number().nonnegative().optional(),
  type: z.enum(["percentage", "fixed"]).optional().default("percentage"),
  expiryDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  usageLimit: z.number().int().positive().optional()
});

export const ReviewCreateSchema = z.object({
  product: z.string().min(1, "Product slug is required"),
  name: z.string().min(1, "Reviewer name is required"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().min(3, "Comment must be at least 3 characters"),
  images: z.array(z.string()).optional()
});
