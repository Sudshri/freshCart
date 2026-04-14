const express = require('express');
const router = express.Router();
const productModel = require('../models/product');

// GET /api/products — list all products with optional filters
router.get('/', (req, res) => {
  const { category, search, minPrice, maxPrice, sort } = req.query;
  const products = productModel.getAll({ category, search, minPrice, maxPrice, sort });
  res.json({
    success: true,
    count: products.length,
    data: products
  });
});

// GET /api/products/categories — list all categories
router.get('/categories', (req, res) => {
  const categories = productModel.getCategories();
  res.json({
    success: true,
    data: categories
  });
});

// GET /api/products/:id — get single product
router.get('/:id', (req, res) => {
  const product = productModel.getById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  res.json({ success: true, data: product });
});

module.exports = router;
