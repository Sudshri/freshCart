/**
 * FreshCart — Main Application Controller
 * Orchestrates products, cart, checkout, and order confirmation flows.
 */
const App = (() => {
  // ── State ────────────────────────────────────────────────────────
  let cartId = localStorage.getItem('freshcart_cartId') || null;
  let cartData = null;
  let allProducts = [];
  let activeCategory = null;
  let searchTimeout = null;

  const CATEGORY_ICONS = {
    'Fruits': '🍎', 'Vegetables': '🥦', 'Dairy': '🧀',
    'Bakery': '🍞', 'Beverages': '☕', 'Snacks': '🍿',
  };

  // ── DOM References ───────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {};
  function cacheDom() {
    dom.searchInput     = $('#search-input');
    dom.categoriesGrid  = $('#categories-grid');
    dom.productsGrid    = $('#products-grid');
    dom.resultCount     = $('#result-count');
    dom.sortSelect      = $('#sort-select');
    dom.cartBadge       = $('#cart-badge');
    dom.cartToggle      = $('#cart-toggle-btn');
    dom.cartOverlay     = $('#cart-overlay');
    dom.cartDrawer      = $('#cart-drawer');
    dom.cartClose       = $('#cart-close');
    dom.cartBody        = $('#cart-body');
    dom.cartItemsList   = $('#cart-items-list');
    dom.cartEmpty       = $('#cart-empty');
    dom.cartFooter      = $('#cart-footer');
    dom.cartSubtotal    = $('#cart-subtotal');
    dom.cartTax         = $('#cart-tax');
    dom.cartDelivery    = $('#cart-delivery');
    dom.cartTotal       = $('#cart-total');
    dom.cartCount       = $('#cart-count');
    dom.deliveryProgress = $('#delivery-progress-container');
    dom.checkoutBtn     = $('#checkout-btn');
    dom.heroSection     = $('#hero-section');
    dom.categoriesSection = $('#categories-section');
    dom.productsSection = $('#products-section');
    dom.checkoutPage    = $('#checkout-page');
    dom.orderConfirmation = $('#order-confirmation');
    dom.backToShop      = $('#back-to-shop');
    dom.placeOrderBtn   = $('#place-order-btn');
    dom.checkoutItemsList = $('#checkout-items-list');
    dom.checkoutSubtotal  = $('#checkout-subtotal');
    dom.checkoutTax       = $('#checkout-tax');
    dom.checkoutDelivery  = $('#checkout-delivery');
    dom.checkoutTotal     = $('#checkout-total');
    dom.paymentMethods    = $('#payment-methods');
    dom.logoLink          = $('#logo-link');
    dom.continueShoppingBtn = $('#continue-shopping-btn');
    dom.ordersBtn         = $('#orders-btn');
    dom.footer            = $('#footer');
    dom.toastContainer    = $('#toast-container');
  }

  // ── Initialization ───────────────────────────────────────────────
  async function init() {
    cacheDom();
    bindEvents();
    await ensureCart();
    await loadCategories();
    await loadProducts();
  }

  async function ensureCart() {
    if (!cartId) {
      const res = await API.createCart();
      cartId = res.data.id;
      localStorage.setItem('freshcart_cartId', cartId);
      cartData = res.data;
    } else {
      try {
        const res = await API.getCart(cartId);
        cartData = res.data;
      } catch {
        // Cart expired or invalid, create new
        const res = await API.createCart();
        cartId = res.data.id;
        localStorage.setItem('freshcart_cartId', cartId);
        cartData = res.data;
      }
    }
    updateCartBadge();
  }

  // ── Events ───────────────────────────────────────────────────────
  function bindEvents() {
    // Search
    dom.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => loadProducts(), 300);
    });

    // Sort
    dom.sortSelect.addEventListener('change', () => loadProducts());

    // Cart toggle
    dom.cartToggle.addEventListener('click', toggleCart);
    dom.cartOverlay.addEventListener('click', closeCart);
    dom.cartClose.addEventListener('click', closeCart);

    // Checkout
    dom.checkoutBtn.addEventListener('click', showCheckout);
    dom.backToShop.addEventListener('click', showShop);

    // Payment methods
    dom.paymentMethods.addEventListener('click', (e) => {
      const opt = e.target.closest('.payment-option');
      if (!opt) return;
      $$('.payment-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      opt.querySelector('input').checked = true;
    });

    // Place order
    dom.placeOrderBtn.addEventListener('click', placeOrder);

    // Logo → shop
    dom.logoLink.addEventListener('click', (e) => {
      e.preventDefault();
      showShop();
    });

    // Continue shopping
    dom.continueShoppingBtn.addEventListener('click', showShop);

    // Keyboard: Escape closes cart
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCart();
    });
  }

  // ── Categories ───────────────────────────────────────────────────
  async function loadCategories() {
    try {
      const res = await API.getCategories();
      const cats = res.data;

      // "All" chip
      let html = `<button class="category-chip active" data-category="">
        <span class="cat-icon">🏪</span> All
        <span class="cat-count">${cats.reduce((s, c) => s + c.count, 0)}</span>
      </button>`;

      cats.forEach(c => {
        html += `<button class="category-chip" data-category="${c.name}">
          <span class="cat-icon">${CATEGORY_ICONS[c.name] || '📦'}</span> ${c.name}
          <span class="cat-count">${c.count}</span>
        </button>`;
      });

      dom.categoriesGrid.innerHTML = html;

      // Bind clicks
      dom.categoriesGrid.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          dom.categoriesGrid.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          activeCategory = chip.dataset.category || null;
          loadProducts();
        });
      });
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }

  // ── Products ─────────────────────────────────────────────────────
  async function loadProducts() {
    const params = {};
    if (activeCategory) params.category = activeCategory;
    if (dom.searchInput.value.trim()) params.search = dom.searchInput.value.trim();
    if (dom.sortSelect.value) params.sort = dom.sortSelect.value;

    try {
      // Show skeletons
      dom.productsGrid.innerHTML = Array(6).fill(0).map(() =>
        '<div class="loading-skeleton skeleton-card"></div>'
      ).join('');

      const res = await API.getProducts(params);
      allProducts = res.data;

      dom.resultCount.innerHTML = `Showing <strong>${res.count}</strong> product${res.count !== 1 ? 's' : ''}`;
      renderProducts(allProducts);
    } catch (err) {
      console.error('Failed to load products', err);
      dom.productsGrid.innerHTML = '<p style="color: var(--text-muted); text-align: center; grid-column: 1/-1; padding: 2rem;">Failed to load products. Please try again.</p>';
    }
  }

  function renderProducts(products) {
    if (products.length === 0) {
      dom.productsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.4;">🔍</div>
          <h3 style="color: var(--text-secondary); margin-bottom: 0.5rem;">No products found</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Try adjusting your search or filters</p>
        </div>`;
      return;
    }

    dom.productsGrid.innerHTML = products.map(p => {
      const inCart = getCartItemQty(p.id);
      const isPremium = p.tags.includes('premium');
      const stars = renderStars(p.rating);

      return `
        <article class="product-card" data-product-id="${p.id}">
          ${isPremium ? '<span class="product-tag">Premium</span>' : ''}
          <div class="product-card-image">${p.image}</div>
          <div class="product-card-body">
            <div class="product-category">${p.category}</div>
            <h3 class="product-name">${p.name}</h3>
            <p class="product-desc">${p.description}</p>
            <div class="product-rating">
              ${stars}
              <span class="rating-value">${p.rating}</span>
            </div>
            <div class="product-footer">
              <div class="product-price">$${p.price.toFixed(2)}<span class="price-unit">/${p.unit}</span></div>
              ${inCart > 0 ? renderQtyControls(p.id, inCart) : `
                <button class="add-to-cart-btn" onclick="App.addToCart('${p.id}')">
                  + Add
                </button>
              `}
            </div>
          </div>
        </article>`;
    }).join('');
  }

  function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  }

  function renderQtyControls(productId, qty) {
    return `
      <div class="qty-controls">
        <button class="qty-btn" onclick="App.updateQty('${productId}', ${qty - 1})">−</button>
        <span class="qty-value">${qty}</span>
        <button class="qty-btn" onclick="App.updateQty('${productId}', ${qty + 1})">+</button>
      </div>`;
  }

  function getCartItemQty(productId) {
    if (!cartData || !cartData.items) return 0;
    const item = cartData.items.find(i => i.productId === productId);
    return item ? item.quantity : 0;
  }

  // ── Cart Actions ─────────────────────────────────────────────────
  async function addToCart(productId) {
    try {
      const res = await API.addToCart(cartId, productId);
      cartData = res.data;
      updateCartBadge();
      renderProducts(allProducts);
      renderCartDrawer();
      const product = allProducts.find(p => p.id === productId);
      showToast(`${product ? product.image : '🛒'} ${product ? product.name : 'Item'} added to cart!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function updateQty(productId, newQty) {
    try {
      if (newQty <= 0) {
        const res = await API.removeCartItem(cartId, productId);
        cartData = res.data;
        showToast('Item removed from cart', 'info');
      } else {
        const res = await API.updateCartItem(cartId, productId, newQty);
        cartData = res.data;
      }
      updateCartBadge();
      renderProducts(allProducts);
      renderCartDrawer();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function removeFromCart(productId) {
    await updateQty(productId, 0);
  }

  function updateCartBadge() {
    const count = cartData ? (cartData.itemCount || 0) : 0;
    dom.cartBadge.textContent = count;
    dom.cartBadge.style.display = count > 0 ? 'flex' : 'none';
    dom.cartCount.textContent = count;
  }

  // ── Cart Drawer ──────────────────────────────────────────────────
  function toggleCart() {
    const isOpen = dom.cartDrawer.classList.contains('open');
    isOpen ? closeCart() : openCart();
  }

  function openCart() {
    dom.cartDrawer.classList.add('open');
    dom.cartOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCartDrawer();
  }

  function closeCart() {
    dom.cartDrawer.classList.remove('open');
    dom.cartOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderCartDrawer() {
    if (!cartData || cartData.items.length === 0) {
      dom.cartEmpty.style.display = 'flex';
      dom.cartItemsList.innerHTML = '';
      dom.cartFooter.style.display = 'none';
      return;
    }

    dom.cartEmpty.style.display = 'none';
    dom.cartFooter.style.display = 'block';

    dom.cartItemsList.innerHTML = cartData.items.map(item => `
      <div class="cart-item" data-product-id="${item.productId}">
        <div class="cart-item-image">${item.image}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">$${item.price.toFixed(2)} / ${item.unit}</div>
          <div class="cart-item-bottom">
            <div class="cart-item-qty">
              <button class="qty-btn" onclick="App.updateQty('${item.productId}', ${item.quantity - 1})">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" onclick="App.updateQty('${item.productId}', ${item.quantity + 1})">+</button>
            </div>
            <div class="cart-item-subtotal">$${item.subtotal.toFixed(2)}</div>
          </div>
        </div>
        <button class="cart-item-remove" onclick="App.removeFromCart('${item.productId}')" title="Remove">✕</button>
      </div>
    `).join('');

    // Totals
    dom.cartSubtotal.textContent = `$${cartData.subtotal.toFixed(2)}`;
    dom.cartTax.textContent = `$${cartData.tax.toFixed(2)}`;
    dom.cartDelivery.textContent = cartData.delivery === 0 ? 'FREE' : `$${cartData.delivery.toFixed(2)}`;
    dom.cartTotal.textContent = `$${cartData.total.toFixed(2)}`;

    // Free delivery progress
    const threshold = cartData.freeDeliveryThreshold || 35;
    const pct = Math.min(100, (cartData.subtotal / threshold) * 100);
    if (cartData.subtotal < threshold) {
      const remaining = (threshold - cartData.subtotal).toFixed(2);
      dom.deliveryProgress.innerHTML = `
        <div class="delivery-progress"><div class="delivery-progress-bar" style="width:${pct}%"></div></div>
        <div class="free-delivery-note">🚚 Add $${remaining} more for free delivery!</div>`;
    } else {
      dom.deliveryProgress.innerHTML = `
        <div class="delivery-progress"><div class="delivery-progress-bar" style="width:100%"></div></div>
        <div class="free-delivery-note">🎉 You qualify for free delivery!</div>`;
    }
  }

  // ── Page Navigation ──────────────────────────────────────────────
  function showShop() {
    dom.heroSection.style.display = '';
    dom.categoriesSection.style.display = '';
    dom.productsSection.style.display = '';
    dom.checkoutPage.classList.remove('active');
    dom.orderConfirmation.classList.remove('active');
    dom.footer.style.display = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showCheckout() {
    if (!cartData || cartData.items.length === 0) {
      showToast('Your cart is empty!', 'error');
      return;
    }
    closeCart();

    dom.heroSection.style.display = 'none';
    dom.categoriesSection.style.display = 'none';
    dom.productsSection.style.display = 'none';
    dom.orderConfirmation.classList.remove('active');
    dom.checkoutPage.classList.add('active');
    dom.footer.style.display = '';

    renderCheckoutSummary();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderCheckoutSummary() {
    dom.checkoutItemsList.innerHTML = cartData.items.map(item => `
      <div class="checkout-item">
        <span class="checkout-item-emoji">${item.image}</span>
        <div class="checkout-item-details">
          <div class="checkout-item-name">${item.name}</div>
          <div class="checkout-item-qty">Qty: ${item.quantity}</div>
        </div>
        <div class="checkout-item-price">$${item.subtotal.toFixed(2)}</div>
      </div>
    `).join('');

    dom.checkoutSubtotal.textContent = `$${cartData.subtotal.toFixed(2)}`;
    dom.checkoutTax.textContent = `$${cartData.tax.toFixed(2)}`;
    dom.checkoutDelivery.textContent = cartData.delivery === 0 ? 'FREE' : `$${cartData.delivery.toFixed(2)}`;
    dom.checkoutTotal.textContent = `$${cartData.total.toFixed(2)}`;
  }

  // ── Place Order ──────────────────────────────────────────────────
  async function placeOrder() {
    const name    = $('#checkout-name').value.trim();
    const email   = $('#checkout-email').value.trim();
    const phone   = $('#checkout-phone').value.trim();
    const address = $('#checkout-address').value.trim();
    const city    = $('#checkout-city').value.trim();
    const zip     = $('#checkout-zip').value.trim();
    const notes   = $('#checkout-notes').value.trim();
    const paymentMethod = $('input[name="payment"]:checked')?.value || 'card';

    if (!name || !email || !address || !city || !zip) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    dom.placeOrderBtn.disabled = true;
    dom.placeOrderBtn.innerHTML = '⏳ Placing Order...';

    try {
      const res = await API.placeOrder(cartId, {
        name, email, phone, address, city, zip, notes, paymentMethod,
      });

      const order = res.data;

      // Reset cart
      const newCart = await API.createCart();
      cartId = newCart.data.id;
      localStorage.setItem('freshcart_cartId', cartId);
      cartData = newCart.data;
      updateCartBadge();

      // Show confirmation
      showOrderConfirmation(order);
      showToast('🎉 Order placed successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      dom.placeOrderBtn.disabled = false;
      dom.placeOrderBtn.innerHTML = '🛒 Place Order';
    }
  }

  function showOrderConfirmation(order) {
    dom.heroSection.style.display = 'none';
    dom.categoriesSection.style.display = 'none';
    dom.productsSection.style.display = 'none';
    dom.checkoutPage.classList.remove('active');
    dom.orderConfirmation.classList.add('active');

    $('#confirmation-order-id').textContent = `Order #${order.id}`;

    const deliveryTime = new Date(order.estimatedDelivery);
    const timeStr = deliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    $('#confirmation-details').innerHTML = `
      <div class="order-detail-row">
        <span class="label">Order ID</span>
        <span class="value">${order.id}</span>
      </div>
      <div class="order-detail-row">
        <span class="label">Items</span>
        <span class="value">${order.itemCount} items</span>
      </div>
      <div class="order-detail-row">
        <span class="label">Subtotal</span>
        <span class="value">$${order.subtotal.toFixed(2)}</span>
      </div>
      <div class="order-detail-row">
        <span class="label">Tax</span>
        <span class="value">$${order.tax.toFixed(2)}</span>
      </div>
      <div class="order-detail-row">
        <span class="label">Delivery</span>
        <span class="value">${order.delivery === 0 ? 'FREE' : '$' + order.delivery.toFixed(2)}</span>
      </div>
      <div class="order-detail-row" style="font-weight: 700; font-size: 1.05rem;">
        <span class="label">Total</span>
        <span class="value" style="color: var(--accent);">$${order.total.toFixed(2)}</span>
      </div>
      <div class="order-detail-row">
        <span class="label">Delivery to</span>
        <span class="value">${order.customer.address}, ${order.customer.city}</span>
      </div>
      <div class="order-detail-row">
        <span class="label">Est. Delivery</span>
        <span class="value">Today by ${timeStr}</span>
      </div>
      <div class="order-detail-row">
        <span class="label">Payment</span>
        <span class="value" style="text-transform: capitalize;">${order.paymentMethod}</span>
      </div>
      <div class="order-detail-row">
        <span class="label">Status</span>
        <span class="value" style="color: var(--accent);">✅ Confirmed</span>
      </div>
    `;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Toast Notifications ──────────────────────────────────────────
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
  }

  // ── Public API ───────────────────────────────────────────────────
  return {
    init,
    addToCart,
    updateQty,
    removeFromCart,
  };
})();

// ── Bootstrap ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', App.init);
