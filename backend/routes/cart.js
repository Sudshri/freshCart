const express = require('express');
const router = express.Router();
const cartModel = require('../models/cart');
const productModel = require('../models/product');

// POST /api/cart — create a new cart
router.post('/', (req, res) => {
  const cart = cartModel.create();
  res.status(201).json({ success: true, data: cart });
});

// GET /api/cart/:cartId — get cart contents
router.get('/:cartId', (req, res) => {
  const cart = cartModel.getById(req.params.cartId);
  if (!cart) {
    return res.status(404).json({ success: false, error: 'Cart not found' });
  }
  res.json({ success: true, data: cartModel._withTotals(cart) });
});

// POST /api/cart/:cartId/items — add item to cart
router.post('/:cartId/items', (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return res.status(400).json({ success: false, error: 'productId is required' });
  }

  const product = productModel.getById(productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  if (product.stock < quantity) {
    return res.status(400).json({ success: false, error: 'Insufficient stock' });
  }

  const cart = cartModel.addItem(req.params.cartId, product, quantity);
  if (!cart) {
    return res.status(404).json({ success: false, error: 'Cart not found' });
  }

  res.json({ success: true, data: cart });
});

// PUT /api/cart/:cartId/items/:productId — update item quantity
router.put('/:cartId/items/:productId', (req, res) => {
  const { quantity } = req.body;

  if (quantity === undefined) {
    return res.status(400).json({ success: false, error: 'quantity is required' });
  }

  const result = cartModel.updateItemQuantity(
    req.params.cartId,
    req.params.productId,
    parseInt(quantity)
  );

  if (!result) {
    return res.status(404).json({ success: false, error: 'Cart not found' });
  }
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }

  res.json({ success: true, data: result });
});

// DELETE /api/cart/:cartId/items/:productId — remove item from cart
router.delete('/:cartId/items/:productId', (req, res) => {
  const result = cartModel.removeItem(req.params.cartId, req.params.productId);
  if (!result) {
    return res.status(404).json({ success: false, error: 'Cart not found' });
  }
  res.json({ success: true, data: result });
});

// DELETE /api/cart/:cartId — clear entire cart
router.delete('/:cartId', (req, res) => {
  const result = cartModel.clear(req.params.cartId);
  if (!result) {
    return res.status(404).json({ success: false, error: 'Cart not found' });
  }
  res.json({ success: true, data: result });
});

module.exports = router;
