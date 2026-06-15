import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

export class AnalyticsService {
  static async getDashboardMetrics() {
    const orders = await Order.find({ paymentStatus: "Paid" });
    const totalRevenue = orders.reduce((sum, ord) => sum + ord.total, 0);

    const totalOrders = await Order.countDocuments({});
    const totalProducts = await Product.countDocuments({ isDeleted: false });
    const totalCustomers = await User.countDocuments({ role: "Customer" });

    // Recent orders
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(5);

    // Low stock warnings
    const lowStockProducts = await Product.find({ stock: { $lte: 5 }, isDeleted: false })
      .select("name SKU stock price")
      .limit(10);

    return {
      metrics: {
        totalRevenue,
        ordersCount: totalOrders,
        productsCount: totalProducts,
        customersCount: totalCustomers
      },
      recentOrders,
      lowStockAlerts: lowStockProducts
    };
  }
}
