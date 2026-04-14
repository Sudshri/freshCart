const products = require('../data/products.json');

class ProductModel {
  constructor() {
    this.products = [...products];
  }

  getAll(filters = {}) {
    let result = [...this.products];

    if (filters.category) {
      result = result.filter(p =>
        p.category.toLowerCase() === filters.category.toLowerCase()
      );
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.tags.some(t => t.toLowerCase().includes(term))
      );
    }

    if (filters.minPrice) {
      result = result.filter(p => p.price >= parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      result = result.filter(p => p.price <= parseFloat(filters.maxPrice));
    }

    if (filters.sort) {
      switch (filters.sort) {
        case 'price-asc':
          result.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          result.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          result.sort((a, b) => b.rating - a.rating);
          break;
        case 'name':
          result.sort((a, b) => a.name.localeCompare(b.name));
          break;
      }
    }

    return result;
  }

  getById(id) {
    return this.products.find(p => p.id === id) || null;
  }

  getCategories() {
    const cats = [...new Set(this.products.map(p => p.category))];
    return cats.map(c => ({
      name: c,
      count: this.products.filter(p => p.category === c).length
    }));
  }

  updateStock(id, quantity) {
    const product = this.getById(id);
    if (!product) return null;
    if (product.stock < quantity) return { error: 'Insufficient stock' };
    product.stock -= quantity;
    return product;
  }
}

module.exports = new ProductModel();
