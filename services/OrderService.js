import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { getRazorpayInstance, verifyPaymentSignature } from "../config/razorpay.js";
import { sendMail } from "../config/nodemailer.js";

export class OrderService {
  static async seedIfNeeded() {
    const count = await Order.countDocuments({});
    if (count === 0) {
      console.log("Seeding initial order history...");
      await Order.create({
        id: "ORD-9821-AT",
        date: "June 08, 2026",
        status: "Delivered",
        items: [
          {
            id: "aria-silk",
            name: "Aria Emerald Silk Abaya",
            price: 320,
            quantity: 1,
            selectedSize: "M",
            image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600&auto=format&fit=crop"
          }
        ],
        total: 320,
        shippingAddress: { name: "Fatima Al-Suwaidi", address: "Villa 12, Jumeirah 2", city: "Dubai", country: "UAE", phone: "+971501234567" },
        paymentMethod: "Razorpay",
        paymentStatus: "Paid"
      });
    }
  }

  static async getAllOrders(filter = {}) {
    await this.seedIfNeeded();
    return Order.find(filter).sort({ createdAt: -1 });
  }

  static async createOrder(orderData, userObj = null) {
    const orderCode = `ORD-${Math.floor(1000 + Math.random() * 9000)}-AT`;
    
    // Decrement stock for ordered items
    for (const item of orderData.items) {
      if (item.id) {
        await Product.findOneAndUpdate(
          { slug: item.id },
          { $inc: { stock: -item.quantity } }
        );
      }
    }

    const orderRecord = await Order.create({
      id: orderCode,
      user: userObj?._id || undefined,
      email: userObj?.email || orderData.shippingAddress.phone, // fallback contact
      items: orderData.items,
      total: orderData.total,
      shippingAddress: {
        name: orderData.shippingAddress.name,
        address: orderData.shippingAddress.address || orderData.shippingAddress.street,
        city: orderData.shippingAddress.city,
        country: orderData.shippingAddress.country || "UAE",
        phone: orderData.shippingAddress.phone
      },
      paymentMethod: orderData.paymentMethod || "Razorpay",
      paymentStatus: "Pending",
      status: "Pending",
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    });

    // If payment method is Razorpay, generate a transaction order
    let razorpayOrder = null;
    if (orderRecord.paymentMethod === "Razorpay") {
      const rzp = getRazorpayInstance();
      razorpayOrder = await rzp.orders.create({
        amount: Math.round(orderRecord.total * 100), // in paisa/cents
        currency: "INR", // standard default
        receipt: orderRecord.id
      });

      orderRecord.razorpayOrderId = razorpayOrder.id;
      await orderRecord.save();
    }

    return {
      order: orderRecord,
      razorpayOrderId: razorpayOrder?.id
    };
  }

  static async verifyAndPayOrder({ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const order = await Order.findOne({ id: orderId });
    if (!order) throw new Error("Order not found");

    const isVerified = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isVerified) {
      order.paymentStatus = "Failed";
      await order.save();
      throw new Error("Razorpay payment verification failed");
    }

    order.paymentStatus = "Paid";
    order.status = "Confirmed";
    order.razorpayPaymentId = razorpayPaymentId;
    await order.save();

    // Send order confirmation email
    const emailTo = order.email || "client@tabassum.com";
    await sendMail({
      to: emailTo,
      subject: `Order Confirmed: ${order.id} - Abaya by Tabassum`,
      html: `
        <div style="font-family: serif; max-width: 600px; margin: 0 auto; border: 1px solid #d4af37; padding: 30px; background-color: #0b0c10; color: #c5c6c7;">
          <h2 style="color: #d4af37; font-weight: 300; text-align: center; text-transform: uppercase; letter-spacing: 2px;">Order Confirmation</h2>
          <hr style="border: 0; border-top: 1px solid #d4af37; margin-bottom: 25px;">
          <p style="font-size: 16px; font-weight: 300;">Thank you for your order, ${order.shippingAddress.name}!</p>
          <p style="font-weight: 300;">Order ID: <strong>${order.id}</strong></p>
          <p style="font-weight: 300;">Total Amount paid: <strong>$${order.total}</strong></p>
          <p style="font-weight: 300;">We are preparing your handcrafted abaya items. You will receive dynamic updates when stitched and shipped.</p>
        </div>
      `
    });

    return order;
  }

  static async updateOrderStatus(orderId, newStatus) {
    const order = await Order.findOne({ id: orderId });
    if (!order) throw new Error("Order not found");

    order.status = newStatus;
    if (newStatus === "Delivered") {
      order.paymentStatus = "Paid";
    }
    await order.save();

    // Send notification update
    if (["Shipped", "Delivered", "Cancelled"].includes(newStatus)) {
      await sendMail({
        to: order.email || "client@tabassum.com",
        subject: `Order Update: ${order.id} is ${newStatus}`,
        html: `
          <div style="font-family: serif; max-width: 600px; margin: 0 auto; border: 1px solid #d4af37; padding: 30px; background-color: #0b0c10; color: #c5c6c7;">
            <h2 style="color: #d4af37; font-weight: 300; text-align: center; text-transform: uppercase; letter-spacing: 2px;">Order status updated</h2>
            <hr style="border: 0; border-top: 1px solid #d4af37; margin-bottom: 25px;">
            <p style="font-size: 16px; font-weight: 300;">Hello ${order.shippingAddress.name},</p>
            <p style="font-weight: 300;">Your order <strong>${order.id}</strong> status has been updated to: <strong>${newStatus}</strong>.</p>
          </div>
        `
      });
    }

    return order;
  }

  static async processRefund(orderId) {
    const order = await Order.findOne({ id: orderId });
    if (!order) throw new Error("Order not found");

    // Change status
    order.paymentStatus = "Refunded";
    order.status = "Refunded";
    await order.save();

    await sendMail({
      to: order.email || "client@tabassum.com",
      subject: `Refund Processed: ${order.id}`,
      html: `<p>Your refund of $${order.total} for order ${order.id} has been processed successfully.</p>`
    });

    return order;
  }
}
