const { v4: uuidv4 } = require('uuid');

class OrderModel {
  constructor() {
    this.orders = {};
  }

  create(cart, customerInfo) {
    const id = 'ORD-' + uuidv4().slice(0, 8).toUpperCase();
    const order = {
      id,
      items: cart.items.map(i => ({ ...i })),
      itemCount: cart.itemCount,
      subtotal: cart.subtotal,
      tax: cart.tax,
      delivery: cart.delivery,
      total: cart.total,
      customer: {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone || '',
        address: customerInfo.address,
        city: customerInfo.city,
        zip: customerInfo.zip,
        notes: customerInfo.notes || ''
      },
      paymentMethod: customerInfo.paymentMethod || 'card',
      status: 'confirmed',
      estimatedDelivery: this._estimateDelivery(),
      createdAt: new Date().toISOString()
    };

    this.orders[id] = order;
    return order;
  }

  getById(orderId) {
    return this.orders[orderId] || null;
  }

  getAll() {
    return Object.values(this.orders).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  _estimateDelivery() {
    const now = new Date();
    const delivery = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
    return delivery.toISOString();
  }
}

module.exports = new OrderModel();
