/**
 * FreshCart API Client
 * Handles all communication with the backend REST API.
 */
const API = (() => {
  const BASE = '/api';

  async function request(endpoint, options = {}) {
    const url = `${BASE}${endpoint}`;
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    };
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ---- Products ----
  async function getProducts(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? '?' + qs : ''}`);
  }

  async function getCategories() {
    return request('/products/categories');
  }

  async function getProduct(id) {
    return request(`/products/${id}`);
  }

  // ---- Cart ----
  async function createCart() {
    return request('/cart', { method: 'POST' });
  }

  async function getCart(cartId) {
    return request(`/cart/${cartId}`);
  }

  async function addToCart(cartId, productId, quantity = 1) {
    return request(`/cart/${cartId}/items`, {
      method: 'POST',
      body: { productId, quantity },
    });
  }

  async function updateCartItem(cartId, productId, quantity) {
    return request(`/cart/${cartId}/items/${productId}`, {
      method: 'PUT',
      body: { quantity },
    });
  }

  async function removeCartItem(cartId, productId) {
    return request(`/cart/${cartId}/items/${productId}`, {
      method: 'DELETE',
    });
  }

  async function clearCart(cartId) {
    return request(`/cart/${cartId}`, { method: 'DELETE' });
  }

  // ---- Orders ----
  async function placeOrder(cartId, customer) {
    return request('/orders', {
      method: 'POST',
      body: { cartId, customer },
    });
  }

  async function getOrder(orderId) {
    return request(`/orders/${orderId}`);
  }

  return {
    getProducts, getCategories, getProduct,
    createCart, getCart, addToCart, updateCartItem, removeCartItem, clearCart,
    placeOrder, getOrder,
  };
})();
