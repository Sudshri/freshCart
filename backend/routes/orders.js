const express = require('express');
const router = express.Router();
const orderModel = require('../models/order');
const cartModel = require('../models/cart');
const productModel = require('../models/product');

// POST /api/orders — place an order from a cart
router.post('/', (req, res) => {
  const { cartId, customer } = req.body;

  if (!cartId) {
    return res.status(400).json({ success: false, error: 'cartId is required' });
  }

  if (!customer || !customer.name || !customer.email || !customer.address || !customer.city || !customer.zip) {
    return res.status(400).json({
      success: false,
      error: 'Customer info required: name, email, address, city, zip'
    });
  }

  const cart = cartModel.getById(cartId);
  if (!cart) {
    return res.status(404).json({ success: false, error: 'Cart not found' });
  }

  if (cart.items.length === 0) {
    return res.status(400).json({ success: false, error: 'Cart is empty' });
  }

  const cartWithTotals = cartModel._withTotals(cart);

  // Deduct stock for each item
  for (const item of cart.items) {
    const result = productModel.updateStock(item.productId, item.quantity);
    if (result && result.error) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock for ${item.name}`
      });
    }
  }

  // Create order
  const order = orderModel.create(cartWithTotals, customer);

  // Clear the cart after successful order
  cartModel.clear(cartId);

  res.status(201).json({ success: true, data: order });
});

// GET /api/orders/:orderId — get order details
router.get('/:orderId', (req, res) => {
  const order = orderModel.getById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  res.json({ success: true, data: order });
});

module.exports = router;
