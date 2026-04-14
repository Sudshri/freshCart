const { v4: uuidv4 } = require('uuid');

class CartModel {
  constructor() {
    // In-memory carts storage: { cartId: { id, items: [], createdAt, updatedAt } }
    this.carts = {};
  }

  create() {
    const id = uuidv4();
    this.carts[id] = {
      id,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return this.carts[id];
  }

  getById(cartId) {
    return this.carts[cartId] || null;
  }

  addItem(cartId, product, quantity = 1) {
    const cart = this.getById(cartId);
    if (!cart) return null;

    const existingItem = cart.items.find(item => item.productId === product.id);

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.subtotal = +(existingItem.quantity * existingItem.price).toFixed(2);
    } else {
      cart.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        image: product.image,
        quantity,
        subtotal: +(product.price * quantity).toFixed(2)
      });
    }

    cart.updatedAt = new Date().toISOString();
    return this._withTotals(cart);
  }

  updateItemQuantity(cartId, productId, quantity) {
    const cart = this.getById(cartId);
    if (!cart) return null;

    const item = cart.items.find(i => i.productId === productId);
    if (!item) return { error: 'Item not in cart' };

    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.productId !== productId);
    } else {
      item.quantity = quantity;
      item.subtotal = +(item.quantity * item.price).toFixed(2);
    }

    cart.updatedAt = new Date().toISOString();
    return this._withTotals(cart);
  }

  removeItem(cartId, productId) {
    return this.updateItemQuantity(cartId, productId, 0);
  }

  clear(cartId) {
    const cart = this.getById(cartId);
    if (!cart) return null;
    cart.items = [];
    cart.updatedAt = new Date().toISOString();
    return this._withTotals(cart);
  }

  _withTotals(cart) {
    const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = +cart.items.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2);
    const tax = +(subtotal * 0.08).toFixed(2);
    const delivery = subtotal > 35 ? 0 : 4.99;
    const total = +(subtotal + tax + delivery).toFixed(2);

    return {
      ...cart,
      itemCount,
      subtotal,
      tax,
      delivery,
      freeDeliveryThreshold: 35,
      total
    };
  }
}

module.exports = new CartModel();
