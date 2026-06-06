// Nile - Main Application Logic & SPA Router

// ==========================================
// 1. STATE & INITIALIZATION
// ==========================================
const AppState = {
  currentUser: null,
  cart: [],
  location: { type: 'zip', value: '10001' },
  activeSearch: '',
  activeCategory: 'all',
  activeSort: '',
  currentRoute: '#/'
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  // Load Cart from LocalStorage
  const savedCart = localStorage.getItem('nile_cart');
  if (savedCart) {
    try {
      AppState.cart = JSON.parse(savedCart);
    } catch (e) {
      AppState.cart = [];
    }
  }
  updateCartBadge();

  // Load Location
  const savedLoc = localStorage.getItem('nile_location');
  if (savedLoc) {
    try {
      AppState.location = JSON.parse(savedLoc);
    } catch (e) {}
  }
  updateLocationUI();

  // Fetch Current User if token exists
  AppState.currentUser = await NileAPI.auth.getCurrentUser();
  updateAuthUI();

  // Initialize Event Listeners
  initGlobalEvents();

  // Initial Route Load
  handleRoute();
  window.addEventListener('hashchange', handleRoute);
});

// ==========================================
// 2. GLOBAL EVENT LISTENERS & UI SYNC
// ==========================================
function initGlobalEvents() {
  // Theme Toggle
  const themeCheckbox = document.getElementById('theme-toggle-checkbox');
  const savedTheme = localStorage.getItem('nile_theme') || 'dark';
  
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    themeCheckbox.checked = false;
  } else {
    document.body.classList.add('dark-mode');
    themeCheckbox.checked = true;
  }

  themeCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('nile_theme', 'dark');
      showToast('Dark Mode Enabled', 'success');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('nile_theme', 'light');
      showToast('Light Mode Enabled', 'success');
    }
  });

  // Search Button and Inputs
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');
  const categorySelect = document.getElementById('search-category-select');

  searchBtn.addEventListener('click', executeSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') executeSearch();
  });

  // Search suggestions dropdown
  searchInput.addEventListener('input', showSearchSuggestions);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-search-container')) {
      document.getElementById('search-suggestions-dropdown').style.display = 'none';
    }
  });

  // Location Modal triggers
  const deliveryBox = document.getElementById('delivery-box-btn');
  const locationModal = document.getElementById('location-modal');
  const closeLocationModal = document.getElementById('close-location-modal');
  const applyZipBtn = document.getElementById('apply-zipcode-btn');
  const applyCountryBtn = document.getElementById('apply-country-btn');

  deliveryBox.addEventListener('click', () => locationModal.style.display = 'flex');
  closeLocationModal.addEventListener('click', () => locationModal.style.display = 'none');
  locationModal.addEventListener('click', (e) => {
    if (e.target === locationModal) locationModal.style.display = 'none';
  });

  applyZipBtn.addEventListener('click', () => {
    const zip = document.getElementById('zipcode-input').value.trim();
    if (zip) {
      AppState.location = { type: 'zip', value: zip };
      localStorage.setItem('nile_location', JSON.stringify(AppState.location));
      updateLocationUI();
      locationModal.style.display = 'none';
      showToast(`Delivery location set to Zip: ${zip}`);
    }
  });

  applyCountryBtn.addEventListener('click', () => {
    const country = document.getElementById('country-select').value;
    AppState.location = { type: 'country', value: country };
    localStorage.setItem('nile_location', JSON.stringify(AppState.location));
    updateLocationUI();
    locationModal.style.display = 'none';
    showToast(`Delivery location set to ${country}`);
  });

  // Sign out button
  document.getElementById('signout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    NileAPI.auth.logout();
    AppState.currentUser = null;
    updateAuthUI();
    showToast('Signed out successfully');
    window.location.hash = '#/';
  });

  // Back to Top button
  const backToTop = document.getElementById('back-to-top-btn');
  backToTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function updateAuthUI() {
  const greeting = document.getElementById('user-greeting');
  const authSection = document.getElementById('dropdown-auth-section');
  const signoutItem = document.getElementById('signout-list-item');
  const ordersLink = document.getElementById('dropdown-orders-link');
  const profileLink = document.getElementById('dropdown-profile-link');

  if (AppState.currentUser) {
    greeting.textContent = `Hello, ${AppState.currentUser.name}`;
    authSection.style.display = 'none';
    signoutItem.style.display = 'block';
    
    ordersLink.href = '#/orders';
    profileLink.href = '#/orders';
  } else {
    greeting.textContent = 'Hello, Sign in';
    authSection.style.display = 'block';
    signoutItem.style.display = 'none';
    
    ordersLink.href = '#/login';
    profileLink.href = '#/login';
  }
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count-badge');
  const totalItems = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = totalItems;
}

function updateLocationUI() {
  const locText = document.getElementById('delivery-location');
  if (AppState.location.type === 'zip') {
    locText.textContent = `New York ${AppState.location.value}`;
  } else {
    locText.textContent = AppState.location.value;
  }
}

// Search execution logic
function executeSearch() {
  const searchInput = document.getElementById('search-input');
  const categorySelect = document.getElementById('search-category-select');
  
  AppState.activeSearch = searchInput.value.trim();
  AppState.activeCategory = categorySelect.value;
  
  // Close suggestions
  document.getElementById('search-suggestions-dropdown').style.display = 'none';
  
  // Route to home/search page
  window.location.hash = `#/search?q=${encodeURIComponent(AppState.activeSearch)}&c=${AppState.activeCategory}`;
}

async function showSearchSuggestions() {
  const query = this.value.trim().toLowerCase();
  const dropdown = document.getElementById('search-suggestions-dropdown');
  
  if (query.length < 2) {
    dropdown.style.display = 'none';
    return;
  }

  try {
    const products = await NileAPI.products.getAll({ search: query });
    if (products.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.innerHTML = '';
    // Show top 5 suggestions
    products.slice(0, 5).forEach(prod => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> <span>${prod.name}</span>`;
      item.addEventListener('click', () => {
        document.getElementById('search-input').value = prod.name;
        dropdown.style.display = 'none';
        window.location.hash = `#/product/${prod.id}`;
      });
      dropdown.appendChild(item);
    });

    dropdown.style.display = 'block';
  } catch (err) {}
}

// Cart Management Actions
function addToCart(product, quantity = 1) {
  const existing = AppState.cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity = Math.min(product.stock, existing.quantity + quantity);
  } else {
    AppState.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      stock: product.stock,
      quantity: Math.min(product.stock, quantity)
    });
  }
  
  localStorage.setItem('nile_cart', JSON.stringify(AppState.cart));
  updateCartBadge();
  showToast(`Added "${product.name.substring(0, 30)}..." to your Cart.`, 'success');
}

function removeFromCart(id) {
  AppState.cart = AppState.cart.filter(item => item.id !== id);
  localStorage.setItem('nile_cart', JSON.stringify(AppState.cart));
  updateCartBadge();
  showToast('Item removed from cart.');
  renderCart(); // Re-render cart page if active
}

function updateCartQuantity(id, qty) {
  const item = AppState.cart.find(item => item.id === id);
  if (item) {
    item.quantity = Math.max(1, Math.min(item.stock, qty));
    localStorage.setItem('nile_cart', JSON.stringify(AppState.cart));
    updateCartBadge();
    renderCart(); // Re-render cart summary
  }
}

function clearCart() {
  AppState.cart = [];
  localStorage.removeItem('nile_cart');
  updateCartBadge();
  showToast('Cart cleared.');
  renderCart();
}

// ==========================================
// 3. SPA ROUTER
// ==========================================
function handleRoute() {
  const hash = window.location.hash || '#/';
  AppState.currentRoute = hash;
  
  const container = document.getElementById('app-content');
  container.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading Nile...</p>
    </div>
  `;

  // Parse parameters
  if (hash.startsWith('#/product/')) {
    const id = hash.replace('#/product/', '');
    renderProductDetail(id);
  } else if (hash.startsWith('#/search')) {
    const urlParams = new URLSearchParams(hash.split('?')[1] || '');
    AppState.activeSearch = urlParams.get('q') || '';
    AppState.activeCategory = urlParams.get('c') || 'all';
    // Sync search inputs
    document.getElementById('search-input').value = AppState.activeSearch;
    document.getElementById('search-category-select').value = AppState.activeCategory;
    renderHome();
  } else {
    switch (hash) {
      case '#/':
        AppState.activeSearch = '';
        AppState.activeCategory = 'all';
        document.getElementById('search-input').value = '';
        document.getElementById('search-category-select').value = 'all';
        renderHome();
        break;
      case '#/cart':
        renderCart();
        break;
      case '#/checkout':
        renderCheckout();
        break;
      case '#/orders':
        if (!AppState.currentUser) window.location.hash = '#/login';
        else renderOrders();
        break;
      case '#/seller':
        renderSellerDashboard();
        break;
      case '#/login':
        renderAuth(false);
        break;
      case '#/register':
        renderAuth(true);
        break;
      default:
        container.innerHTML = `<div class="error-screen"><h2>404 Page Not Found</h2><a href="#/" class="btn btn-primary" style="margin-top: 15px;">Back to Home</a></div>`;
    }
  }
  // Scroll to top on route change
  window.scrollTo({ top: 0 });
}

// ==========================================
// 4. SCREEN RENDERING FUNCTIONS
// ==========================================

// Renders the Hero Banners & Products list (Home page)
async function renderHome() {
  const container = document.getElementById('app-content');

  try {
    const products = await NileAPI.products.getAll({
      search: AppState.activeSearch,
      category: AppState.activeCategory,
      sort: AppState.activeSort
    });

    let htmlContent = '';

    // If not searching, render Banner Carousel
    if (!AppState.activeSearch) {
      htmlContent += `
        <!-- Hero Section Carousel -->
        <div class="hero-slider-container">
          <!-- Slide 1 -->
          <div class="hero-slide active" style="background-image: url('https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1400&auto=format&fit=crop&q=80')">
            <div class="hero-gradient-overlay"></div>
            <div class="hero-content">
              <span class="hero-badge">Today's Spotlight</span>
              <h1>Elevate Your Work Setup</h1>
              <p>Explore high-performance workspace gear. Get up to 30% off design monitors, noise-cancelling headphones, and ergonomics.</p>
              <a href="#/search?q=&c=electronics" class="btn btn-primary" style="width: auto;">Shop Electronics</a>
            </div>
          </div>
          <!-- Slide 2 -->
          <div class="hero-slide" style="background-image: url('https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&auto=format&fit=crop&q=80')">
            <div class="hero-gradient-overlay"></div>
            <div class="hero-content">
              <span class="hero-badge">New Arrivals</span>
              <h1>Step Into Summer Styles</h1>
              <p>Discover breathable activewear, premium leather accessories, and road-running performance shoes.</p>
              <a href="#/search?q=&c=fashion" class="btn btn-primary" style="width: auto;">Explore Fashion</a>
            </div>
          </div>
          <!-- Slide 3 -->
          <div class="hero-slide" style="background-image: url('https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1400&auto=format&fit=crop&q=80')">
            <div class="hero-gradient-overlay"></div>
            <div class="hero-content">
              <span class="hero-badge">Smart Home</span>
              <h1>Craft the Perfect Brew</h1>
              <p>Save time and brew cafe-quality coffee at home with automatic grind & steam systems.</p>
              <a href="#/search?q=&c=home" class="btn btn-primary" style="width: auto;">Shop Home & Kitchen</a>
            </div>
          </div>

          <!-- Controls -->
          <div class="hero-controls">
            <span class="hero-dot active" data-slide="0"></span>
            <span class="hero-dot" data-slide="1"></span>
            <span class="hero-dot" data-slide="2"></span>
          </div>
        </div>
      `;
    }

    // Grid Container
    htmlContent += `
      <div class="category-row">
        <div class="section-header">
          <h2>${AppState.activeSearch ? `Search Results for "${AppState.activeSearch}"` : 'Recommended for You'}</h2>
          
          <!-- Filter Controls -->
          <div class="filters-box" style="display: flex; gap: 10px;">
            <select id="sort-select" class="form-input" style="padding: 5px 10px; width: 180px; font-size: 0.8rem; background-color: var(--bg-secondary);">
              <option value="">Sort by: Featured</option>
              <option value="price-low" ${AppState.activeSort === 'price-low' ? 'selected' : ''}>Price: Low to High</option>
              <option value="price-high" ${AppState.activeSort === 'price-high' ? 'selected' : ''}>Price: High to Low</option>
              <option value="rating" ${AppState.activeSort === 'rating' ? 'selected' : ''}>Customer Rating</option>
            </select>
          </div>
        </div>
        
        ${products.length === 0 ? `
          <div class="empty-cart-state">
            <i class="fa-solid fa-magnifying-glass"></i>
            <h2>No products found</h2>
            <p>Try clearing filters or search for another term.</p>
          </div>
        ` : `
          <div class="products-grid">
            ${products.map(prod => `
              <div class="product-card">
                ${prod.rating >= 4.8 ? `<span class="badge-choice"><span class="nile-word">Nile's</span> Choice</span>` : ''}
                <a href="#/product/${prod.id}" class="product-image-wrapper">
                  <img src="${prod.imageUrl}" alt="${prod.name}" class="product-card-img">
                </a>
                <div class="product-card-info">
                  <span class="product-card-category">${prod.category}</span>
                  <a href="#/product/${prod.id}" class="product-card-title">${prod.name}</a>
                  
                  <div class="rating-container">
                    <div class="stars-list">
                      ${generateStarsHtml(prod.rating)}
                    </div>
                    <span class="rating-count">(${prod.reviewsCount})</span>
                  </div>

                  <div class="product-card-price-row">
                    <span class="price-symbol">$</span>
                    <span class="price-amount">${prod.price.toFixed(2)}</span>
                  </div>

                  <div class="product-card-action">
                    ${prod.stock > 0 ? `
                      <button class="btn btn-primary add-to-cart-card-btn" data-id="${prod.id}">
                        <i class="fa-solid fa-cart-plus"></i> Add to Cart
                      </button>
                    ` : `
                      <button class="btn btn-secondary" disabled style="cursor: not-allowed; opacity: 0.6;">
                        Out of Stock
                      </button>
                    `}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    container.innerHTML = htmlContent;

    // Carousel functionality setup
    if (!AppState.activeSearch) {
      initCarousel();
    }

    // Bind card Add-to-cart buttons
    document.querySelectorAll('.add-to-cart-card-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        const prod = products.find(p => p.id === id);
        if (prod) {
          addToCart(prod, 1);
        }
      });
    });

    // Bind sorting dropdown
    document.getElementById('sort-select').addEventListener('change', (e) => {
      AppState.activeSort = e.target.value;
      renderHome();
    });

  } catch (err) {
    container.innerHTML = `<div class="error-screen"><h2>Failed to load products.</h2><p>${err.message}</p></div>`;
  }
}

// Simple Auto-sliding Carousel function
function initCarousel() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  let current = 0;
  let timer = null;

  function showSlide(index) {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    
    slides[index].classList.add('active');
    dots[index].classList.add('active');
    current = index;
  }

  function nextSlide() {
    let next = (current + 1) % slides.length;
    showSlide(next);
  }

  // Bind dots clicking
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      clearInterval(timer);
      showSlide(index);
      startTimer();
    });
  });

  function startTimer() {
    timer = setInterval(nextSlide, 5000);
  }

  startTimer();
}

// Renders the Product detail view along with reviews feed
async function renderProductDetail(id) {
  const container = document.getElementById('app-content');

  try {
    const product = await NileAPI.products.getById(id);
    const reviews = await NileAPI.reviews.getByProduct(id);

    container.innerHTML = `
      <div class="product-detail-layout">
        <!-- Left Image box -->
        <div class="detail-images-section">
          <div class="detail-main-image-box">
            <img src="${product.imageUrl}" alt="${product.name}" class="detail-main-image" id="main-image-viewport">
          </div>
        </div>

        <!-- Middle Info section -->
        <div class="detail-info-box">
          <h1 class="detail-title">${product.name}</h1>
          <span class="detail-seller-link">Brand: ${product.specifications.Brand || 'Nile Exclusive'}</span>
          
          <div class="detail-rating-row">
            <div class="stars-list" style="font-size: 1.1rem; color: var(--rating-color);">
              ${generateStarsHtml(product.rating)}
            </div>
            <span style="font-size: 0.9rem; color: var(--border-hover); font-weight: 500;">${product.rating} out of 5 stars</span>
            <span class="rating-count" style="font-size: 0.9rem;">(${product.reviewsCount} reviews)</span>
          </div>

          <div class="detail-price-box">
            <span class="price-label">Price:</span>
            <span class="price-main">$${product.price.toFixed(2)}</span>
            <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">FREE Returns & Shipping. Price includes import fees deposit.</span>
          </div>

          <div class="detail-description">
            <h3>About this item</h3>
            <p style="font-size: 0.95rem; line-height: 1.6; color: var(--text-primary);">${product.description}</p>
          </div>

          <div class="detail-specs">
            <h3>Product Specifications</h3>
            <table class="detail-specs-table">
              <tbody>
                ${Object.entries(product.specifications).map(([key, val]) => `
                  <tr>
                    <td class="spec-key">${key}</td>
                    <td>${val}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right Side Checkout Panel -->
        <div class="detail-buy-box">
          <div class="buy-price-row">
            <span class="buy-price">$${product.price.toFixed(2)}</span>
          </div>
          
          <div class="stock-status ${product.stock > 10 ? 'in-stock' : (product.stock > 0 ? 'low-stock' : 'out-of-stock')}">
            ${product.stock > 10 ? 'In Stock.' : (product.stock > 0 ? `Only ${product.stock} left in stock - order soon.` : 'Temporarily Out of Stock.')}
          </div>

          ${product.stock > 0 ? `
            <div class="buy-quantity-row">
              <label for="detail-qty-select">Qty:</label>
              <select id="detail-qty-select" class="qty-select">
                ${Array.from({ length: Math.min(10, product.stock) }, (_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
              </select>
            </div>

            <button class="btn btn-primary btn-block" id="detail-add-cart-btn" style="margin-bottom: 10px;">
              <i class="fa-solid fa-cart-shopping"></i> Add to Cart
            </button>
            <button class="btn btn-secondary btn-block" id="detail-buy-now-btn">
              <i class="fa-solid fa-bolt"></i> Buy Now
            </button>
          ` : `
            <button class="btn btn-secondary btn-block" disabled style="cursor: not-allowed; opacity: 0.6; margin-bottom: 10px;">
              Out of Stock
            </button>
          `}
          
          <hr style="margin: 15px 0;">
          <div style="font-size: 0.8rem; color: var(--text-secondary);">
            <p><i class="fa-solid fa-lock" style="margin-right: 5px;"></i> Secure transaction</p>
            <p style="margin-top: 5px;">Ships from Nile.com</p>
            <p style="margin-top: 5px;">Sold by ${product.sellerId === 'usr_admin' ? 'Nile Direct' : 'Independent Seller'}</p>
          </div>
        </div>

        <!-- Reviews Feed & Submit review box -->
        <div class="reviews-section">
          <h2>Customer Reviews</h2>
          <div class="reviews-layout" style="margin-top: 1.5rem;">
            <!-- Write Review Form -->
            <div class="write-review-card">
              <h3>Review this product</h3>
              <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 15px;">Share your thoughts with other customers</p>
              
              ${AppState.currentUser ? `
                <form id="submit-review-form">
                  <div class="form-group">
                    <label>Select Rating</label>
                    <div class="rating-select">
                      <input type="radio" id="star5" name="review-rating" value="5"><label for="star5" title="5 stars"><i class="fa-solid fa-star"></i></label>
                      <input type="radio" id="star4" name="review-rating" value="4"><label for="star4" title="4 stars"><i class="fa-solid fa-star"></i></label>
                      <input type="radio" id="star3" name="review-rating" value="3"><label for="star3" title="3 stars"><i class="fa-solid fa-star"></i></label>
                      <input type="radio" id="star2" name="review-rating" value="2"><label for="star2" title="2 stars"><i class="fa-solid fa-star"></i></label>
                      <input type="radio" id="star1" name="review-rating" value="1"><label for="star1" title="1 star"><i class="fa-solid fa-star"></i></label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="review-comment-input">Add your review comment</label>
                    <textarea id="review-comment-input" rows="4" class="form-input" placeholder="Write comment here..." required style="resize: vertical;"></textarea>
                  </div>
                  <button type="submit" class="btn btn-secondary btn-block">Submit Review</button>
                </form>
              ` : `
                <div style="text-align: center; padding: 10px;">
                  <a href="#/login" class="btn btn-secondary btn-block">Sign in to write a review</a>
                </div>
              `}
            </div>

            <!-- List Reviews -->
            <div class="review-list">
              <h3>Top reviews from other buyers</h3>
              
              ${reviews.length === 0 ? `
                <p style="color: var(--text-secondary); font-style: italic;">No reviews yet. Be the first to review this product!</p>
              ` : reviews.map(rev => `
                <div class="review-item">
                  <div class="review-user-row">
                    <div class="review-avatar">${rev.userName[0].toUpperCase()}</div>
                    <span class="review-username">${rev.userName}</span>
                  </div>
                  <div class="review-meta-row">
                    <div class="stars-list" style="color: var(--rating-color);">
                      ${generateStarsHtml(rev.rating)}
                    </div>
                    <span class="review-date">Reviewed on ${new Date(rev.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p class="review-comment">${rev.comment}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind Add to Cart
    if (product.stock > 0) {
      document.getElementById('detail-add-cart-btn').addEventListener('click', () => {
        const qty = parseInt(document.getElementById('detail-qty-select').value);
        addToCart(product, qty);
      });

      document.getElementById('detail-buy-now-btn').addEventListener('click', () => {
        const qty = parseInt(document.getElementById('detail-qty-select').value);
        // Add to cart first
        addToCart(product, qty);
        window.location.hash = '#/checkout';
      });
    }

    // Bind Submit Review Form
    if (AppState.currentUser) {
      document.getElementById('submit-review-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const ratingVal = document.querySelector('input[name="review-rating"]:checked');
        const comment = document.getElementById('review-comment-input').value.trim();

        if (!ratingVal) {
          showToast('Please select a star rating first!', 'danger');
          return;
        }

        const rating = parseInt(ratingVal.value);
        try {
          await NileAPI.reviews.submit(product.id, rating, comment);
          showToast('Thank you! Your review was successfully submitted.');
          renderProductDetail(product.id); // Refresh detail view
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });
    }

  } catch (err) {
    container.innerHTML = `<div class="error-screen"><h2>Failed to load product details</h2><p>${err.message}</p></div>`;
  }
}

// Renders the Shopping Cart page
function renderCart() {
  const container = document.getElementById('app-content');

  if (AppState.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-state">
        <i class="fa-solid fa-cart-shopping"></i>
        <h2>Your Nile Cart is empty.</h2>
        <p>Explore recommended products and add items to your cart.</p>
        <a href="#/" class="btn btn-primary" style="width: auto; margin-top: 15px;">Shop Now</a>
      </div>
    `;
    return;
  }

  const subtotal = AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);

  container.innerHTML = `
    <div class="cart-layout">
      <!-- Cart items list -->
      <div class="cart-main-box">
        <div class="cart-header-row">
          <h1>Shopping Cart</h1>
          <button class="cart-clear-btn" id="cart-clear-link">Deselect all items</button>
        </div>

        <div class="cart-items-list">
          ${AppState.cart.map(item => `
            <div class="cart-item">
              <a href="#/product/${item.id}" class="cart-item-image">
                <img src="${item.imageUrl}" alt="${item.name}">
              </a>
              <div class="cart-item-details">
                <a href="#/product/${item.id}" class="cart-item-title">${item.name}</a>
                <span class="cart-item-seller">Ships from and sold by Nile</span>
                
                <div class="cart-item-actions">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 0.8rem; color: var(--text-secondary);">Qty:</label>
                    <select class="qty-select cart-item-qty-select" data-id="${item.id}" style="padding: 4px 8px;">
                      ${Array.from({ length: Math.min(10, item.stock) }, (_, i) => `<option value="${i+1}" ${item.quantity === i+1 ? 'selected' : ''}>${i+1}</option>`).join('')}
                    </select>
                  </div>
                  <span class="cart-item-delete" data-id="${item.id}">Delete</span>
                </div>
              </div>
              <div class="cart-item-price-col">
                $${(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Right Summary block -->
      <div class="cart-summary-box">
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 15px;">Order Summary</h2>
        <div class="summary-row">
          <span>Items (${totalItems}):</span>
          <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span>Shipping & handling:</span>
          <span style="color: var(--success); font-weight: 500;">FREE</span>
        </div>
        <div class="summary-total-row">
          <span>Total:</span>
          <span>$${subtotal.toFixed(2)}</span>
        </div>

        <a href="#/checkout" class="btn btn-primary btn-block" style="margin-top: 20px;">
          Proceed to Checkout
        </a>
      </div>
    </div>
  `;

  // Bind change events
  document.querySelectorAll('.cart-item-qty-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const id = select.getAttribute('data-id');
      const val = parseInt(e.target.value);
      updateCartQuantity(id, val);
    });
  });

  document.querySelectorAll('.cart-item-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      removeFromCart(id);
    });
  });

  document.getElementById('cart-clear-link').addEventListener('click', () => {
    clearCart();
  });
}

// Renders the Checkout Form Screen
function renderCheckout() {
  const container = document.getElementById('app-content');

  if (AppState.cart.length === 0) {
    window.location.hash = '#/cart';
    return;
  }

  const subtotal = AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);

  container.innerHTML = `
    <div class="checkout-layout">
      <!-- Left Panel: shipping details -->
      <form id="checkout-payment-form">
        <!-- Delivery Address -->
        <div class="checkout-section-card">
          <h2>1. Shipping Address</h2>
          <div class="form-group">
            <label for="shipping-fullname">Full Name</label>
            <input type="text" id="shipping-fullname" class="form-input" required placeholder="e.g. Devan Jones">
          </div>
          <div class="form-group">
            <label for="shipping-address">Street Address</label>
            <input type="text" id="shipping-address" class="form-input" required placeholder="e.g. 123 Main St, Apt 4B">
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="shipping-city">City</label>
              <input type="text" id="shipping-city" class="form-input" required placeholder="e.g. New York">
            </div>
            <div class="form-group">
              <label for="shipping-zip">Zip/Postal Code</label>
              <input type="text" id="shipping-zip" class="form-input" required value="${AppState.location.type === 'zip' ? AppState.location.value : ''}" placeholder="e.g. 10001">
            </div>
          </div>
        </div>

        <!-- Payment Method -->
        <div class="checkout-section-card">
          <h2>2. Payment Card Details</h2>
          
          <!-- Animated Credit Card Graphic (Wow factor) -->
          <div class="credit-card-mock">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="card-chip"></div>
              <span style="font-family: var(--font-display); font-weight: 700; font-style: italic;">NILE PAY</span>
            </div>
            <div class="card-number-display" id="mock-card-number">•••• •••• •••• ••••</div>
            <div class="card-details-row">
              <div>
                <span class="card-label">Card Holder</span>
                <div class="card-val" id="mock-card-name">Your Name</div>
              </div>
              <div style="text-align: right;">
                <span class="card-label">Expires</span>
                <div class="card-val" id="mock-card-expiry">MM/YY</div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="card-holder-input">Cardholder Name</label>
            <input type="text" id="card-holder-input" class="form-input" required placeholder="Name on Card">
          </div>
          <div class="form-group">
            <label for="card-number-input">Card Number</label>
            <input type="text" id="card-number-input" class="form-input" required maxlength="19" placeholder="4111 2222 3333 4444">
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="card-expiry-input">Expiration Date</label>
              <input type="text" id="card-expiry-input" class="form-input" required maxlength="5" placeholder="MM/YY">
            </div>
            <div class="form-group">
              <label for="card-cvv-input">CVV</label>
              <input type="password" id="card-cvv-input" class="form-input" required maxlength="3" placeholder="123">
            </div>
          </div>
        </div>

        <!-- Review items -->
        <div class="checkout-section-card">
          <h2>3. Review Items</h2>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${AppState.cart.map(item => `
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem;">
                <span style="font-weight: 500;">${item.name.substring(0, 50)}... (x${item.quantity})</span>
                <span style="font-weight: 600;">$${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </form>

      <!-- Right Summary Panel -->
      <div class="cart-summary-box">
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 15px;">Order Summary</h2>
        <div class="summary-row">
          <span>Items (${totalItems}):</span>
          <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span>Shipping & handling:</span>
          <span style="color: var(--success); font-weight: 500;">FREE</span>
        </div>
        <div class="summary-total-row">
          <span>Order Total:</span>
          <span>$${subtotal.toFixed(2)}</span>
        </div>

        <!-- Place Order CTA Button with Loading spinner -->
        <button type="submit" form="checkout-payment-form" class="btn btn-primary btn-block" id="place-order-submit-btn" style="margin-top: 20px;">
          Place Your Order
        </button>
      </div>
    </div>
  `;

  // Bind live credit card inputs to mock card layout
  const nameInput = document.getElementById('card-holder-input');
  const numInput = document.getElementById('card-number-input');
  const expInput = document.getElementById('card-expiry-input');

  nameInput.addEventListener('input', (e) => {
    document.getElementById('mock-card-name').textContent = e.target.value.toUpperCase() || 'YOUR NAME';
  });

  numInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let matches = val.match(/\d{4,16}/g);
    let match = matches && matches[0] || '';
    let parts = [];

    for (let i=0, len=match.length; i<len; i+=4) {
      parts.push(match.substring(i, i+4));
    }

    if (parts.length > 0) {
      e.target.value = parts.join(' ');
      document.getElementById('mock-card-number').textContent = parts.join(' ');
    } else {
      e.target.value = val;
      document.getElementById('mock-card-number').textContent = val || '•••• •••• •••• ••••';
    }
  });

  expInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length >= 2) {
      e.target.value = val.substring(0, 2) + '/' + val.substring(2, 4);
    } else {
      e.target.value = val;
    }
    document.getElementById('mock-card-expiry').textContent = e.target.value || 'MM/YY';
  });

  // Handle Checkout submission
  document.getElementById('checkout-payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!AppState.currentUser) {
      showToast('Please sign in to place an order.', 'danger');
      window.location.hash = '#/login';
      return;
    }

    const name = document.getElementById('shipping-fullname').value.trim();
    const street = document.getElementById('shipping-address').value.trim();
    const city = document.getElementById('shipping-city').value.trim();
    const zip = document.getElementById('shipping-zip').value.trim();

    const shippingAddress = { name, street, city, zip };
    const submitBtn = document.getElementById('place-order-submit-btn');

    // Loading State
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Payment...`;

    try {
      // API call to save order details
      const order = await NileAPI.orders.place(AppState.cart, subtotal, shippingAddress);
      
      // Clear Cart state
      AppState.cart = [];
      localStorage.removeItem('nile_cart');
      updateCartBadge();

      // Render Order success page
      renderOrderSuccess(order.id);
      triggerConfetti(); // Confetti wow factor!
    } catch (err) {
      showToast(err.message, 'danger');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Place Your Order';
    }
  });
}

function renderOrderSuccess(orderId) {
  const container = document.getElementById('app-content');
  container.innerHTML = `
    <div class="success-screen">
      <div class="success-icon-box">
        <i class="fa-solid fa-check"></i>
      </div>
      <h1>Order Placed Successfully!</h1>
      <p>Thank you for shopping on Nile. Your order ID is <strong>${orderId}</strong>.</p>
      <p style="margin-bottom: 25px;">A confirmation email has been sent. We'll update you as soon as your items ship.</p>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <a href="#/orders" class="btn btn-primary" style="width: auto;">View Order History</a>
        <a href="#/" class="btn btn-secondary" style="width: auto;">Continue Shopping</a>
      </div>
    </div>
  `;
}

// Renders the Order History Dashboard
async function renderOrders() {
  const container = document.getElementById('app-content');

  try {
    const orders = await NileAPI.orders.getHistory();

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="orders-header">
          <h1>Your Orders</h1>
          <hr>
        </div>
        <div class="empty-cart-state">
          <i class="fa-solid fa-receipt"></i>
          <h2>You haven't placed any orders yet.</h2>
          <p>Go back to the Home page and discover products you like.</p>
          <a href="#/" class="btn btn-primary" style="width: auto; margin-top: 15px;">Shop Now</a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="orders-header">
        <h1>Your Orders</h1>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 5px;">Track shipping statuses and review purchased items.</p>
        <hr>
      </div>
      <div class="orders-list">
        ${orders.map(order => `
          <div class="order-card">
            <div class="order-card-header">
              <div class="order-header-info">
                <span class="order-info-label">Order Placed</span>
                <span class="order-info-val">${new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div class="order-header-info">
                <span class="order-info-label">Total</span>
                <span class="order-info-val">$${order.total.toFixed(2)}</span>
              </div>
              <div class="order-header-info">
                <span class="order-info-label">Ship To</span>
                <span class="order-info-val">${order.shippingAddress.name}</span>
              </div>
              <div class="order-header-info" style="margin-left: auto;">
                <span class="order-info-label">Order #</span>
                <span class="order-info-val" style="font-family: monospace;">${order.id}</span>
              </div>
            </div>
            
            <div class="order-card-body">
              <h3 style="font-size: 1.05rem; margin-bottom: 15px; color: var(--success);">
                Status: ${order.status}
              </h3>
              
              <div style="display: flex; flex-direction: column; gap: 15px;">
                ${order.items.map(item => `
                  <div class="order-item-row">
                    <div class="order-item-img">
                      <img src="${item.imageUrl}" alt="${item.name}">
                    </div>
                    <div class="order-item-details">
                      <a href="#/product/${item.id}" class="order-item-name">${item.name}</a>
                      <span class="order-item-meta">Quantity: ${item.quantity} | Price: $${item.price.toFixed(2)}</span>
                    </div>
                    <div style="flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;">
                      <a href="#/product/${item.id}" class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.75rem;">
                        View Item
                      </a>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

  } catch (err) {
    container.innerHTML = `<div class="error-screen"><h2>Failed to load orders history</h2><p>${err.message}</p></div>`;
  }
}

// Renders the Seller Dashboard with listing tools and inventory management
async function renderSellerDashboard() {
  const container = document.getElementById('app-content');

  // Verify Auth & Role
  if (!AppState.currentUser) {
    container.innerHTML = `
      <div class="empty-cart-state">
        <i class="fa-solid fa-store"></i>
        <h2>Sell on Nile</h2>
        <p>List products, track inventory, and grow your sales. You need to sign in first.</p>
        <a href="#/login" class="btn btn-primary" style="width: auto; margin-top: 15px;">Sign In to Your Account</a>
      </div>
    `;
    return;
  }

  if (AppState.currentUser.role !== 'seller') {
    container.innerHTML = `
      <div class="auth-container" style="max-width: 450px; text-align: center;">
        <i class="fa-solid fa-store" style="font-size: 3rem; color: var(--primary); margin-bottom: 15px;"></i>
        <h1>Become a Nile Seller</h1>
        <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.95rem;">
          To access the seller dashboard, please create a seller account or log out and register as a "Seller".
        </p>
        <a href="#/register" class="btn btn-primary btn-block">Create a Seller Account</a>
      </div>
    `;
    return;
  }

  try {
    const products = await NileAPI.products.getAll();
    const myProducts = products.filter(p => p.sellerId === AppState.currentUser.id || AppState.currentUser.id === 'usr_admin');
    
    // Stats Calculations
    const activeListings = myProducts.length;
    const totalStock = myProducts.reduce((sum, p) => sum + p.stock, 0);
    const mockRevenue = myProducts.reduce((sum, p) => sum + (p.price * (3 + p.reviewsCount)), 0);

    container.innerHTML = `
      <div class="seller-header">
        <h1>Seller Dashboard</h1>
        <span style="font-size: 0.9rem; color: var(--text-secondary);">Welcome, <strong>${AppState.currentUser.name}</strong></span>
      </div>

      <!-- Stats overview cards -->
      <div class="seller-stats-row">
        <div class="stat-card">
          <div class="stat-icon"><i class="fa-solid fa-cubes"></i></div>
          <div class="stat-info">
            <span class="stat-label">Active Listings</span>
            <span class="stat-value">${activeListings}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><i class="fa-solid fa-boxes-stacked"></i></div>
          <div class="stat-info">
            <span class="stat-label">Total Stock</span>
            <span class="stat-value">${totalStock} items</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="color: var(--success); background-color: var(--success-glow);"><i class="fa-solid fa-chart-line"></i></div>
          <div class="stat-info">
            <span class="stat-label">Est. Sales Value</span>
            <span class="stat-value">$${mockRevenue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="seller-layout">
        <!-- Add Product Form -->
        <div class="inventory-card">
          <h2 id="form-action-title">Add New Product</h2>
          <form id="seller-product-form">
            <input type="hidden" id="edit-prod-id" value="">
            <div class="form-group">
              <label for="prod-name">Product Title</label>
              <input type="text" id="prod-name" class="form-input" required placeholder="e.g. Mechanical Keyboard">
            </div>
            <div class="form-group">
              <label for="prod-desc">Description</label>
              <textarea id="prod-desc" rows="3" class="form-input" required placeholder="Product features and specifications..." style="resize: vertical;"></textarea>
            </div>
            <div class="form-grid-2">
              <div class="form-group">
                <label for="prod-price">Price ($)</label>
                <input type="number" step="0.01" id="prod-price" class="form-input" required placeholder="19.99">
              </div>
              <div class="form-group">
                <label for="prod-stock">Stock Quantity</label>
                <input type="number" id="prod-stock" class="form-input" required placeholder="5">
              </div>
            </div>
            <div class="form-group">
              <label for="prod-category">Category</label>
              <select id="prod-category" class="form-input">
                <option value="electronics">Electronics</option>
                <option value="fashion">Fashion</option>
                <option value="home">Home & Kitchen</option>
                <option value="books">Books</option>
              </select>
            </div>
            <div class="form-group">
              <label for="prod-image">Image URL (Unsplash or direct URL)</label>
              <input type="url" id="prod-image" class="form-input" placeholder="https://...">
            </div>
            
            <button type="submit" class="btn btn-primary btn-block" id="form-submit-btn">List Product</button>
            <button type="button" class="btn btn-secondary btn-block" id="form-cancel-btn" style="margin-top: 10px; display: none;">Cancel Edit</button>
          </form>
        </div>

        <!-- Inventory List -->
        <div class="inventory-card">
          <h2>Current Inventory</h2>
          <div class="inventory-table-wrapper">
            <table class="inventory-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${myProducts.length === 0 ? `
                  <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-secondary); font-style: italic;">
                      No inventory listed yet. Add your first product.
                    </td>
                  </tr>
                ` : myProducts.map(p => `
                  <tr>
                    <td>
                      <div class="inventory-item-info">
                        <img src="${p.imageUrl}" alt="" class="inventory-item-img">
                        <span class="inventory-item-name" title="${p.name}">${p.name}</span>
                      </div>
                    </td>
                    <td style="font-weight: 600;">$${p.price.toFixed(2)}</td>
                    <td style="font-weight: 500; color: ${p.stock === 0 ? 'var(--danger)' : 'inherit'};">
                      ${p.stock}
                    </td>
                    <td>
                      <div class="inventory-actions">
                        <button class="inventory-btn inventory-btn-edit edit-action-btn" data-id="${p.id}">Edit</button>
                        <button class="inventory-btn inventory-btn-delete delete-action-btn" data-id="${p.id}">Delete</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Bind Add/Edit Form submission
    const productForm = document.getElementById('seller-product-form');
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('edit-prod-id').value;
      const name = document.getElementById('prod-name').value.trim();
      const description = document.getElementById('prod-desc').value.trim();
      const price = parseFloat(document.getElementById('prod-price').value);
      const stock = parseInt(document.getElementById('prod-stock').value);
      const category = document.getElementById('prod-category').value;
      const imageUrl = document.getElementById('prod-image').value.trim();

      const productData = { name, description, price, stock, category, imageUrl };

      try {
        if (id) {
          // Edit API call
          await NileAPI.products.update(id, productData);
          showToast('Product updated successfully!');
        } else {
          // Create API call
          await NileAPI.products.create(productData);
          showToast('Product listed successfully!');
        }
        renderSellerDashboard(); // Reload dashboard
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });

    // Bind Edit triggers
    document.querySelectorAll('.edit-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const prod = myProducts.find(p => p.id === id);
        
        if (prod) {
          document.getElementById('form-action-title').textContent = 'Edit Product';
          document.getElementById('edit-prod-id').value = prod.id;
          document.getElementById('prod-name').value = prod.name;
          document.getElementById('prod-desc').value = prod.description;
          document.getElementById('prod-price').value = prod.price;
          document.getElementById('prod-stock').value = prod.stock;
          document.getElementById('prod-category').value = prod.category;
          document.getElementById('prod-image').value = prod.imageUrl;
          
          document.getElementById('form-submit-btn').textContent = 'Update Product';
          document.getElementById('form-cancel-btn').style.display = 'block';
        }
      });
    });

    // Bind Cancel Edit trigger
    document.getElementById('form-cancel-btn').addEventListener('click', () => {
      document.getElementById('form-action-title').textContent = 'Add New Product';
      productForm.reset();
      document.getElementById('edit-prod-id').value = '';
      document.getElementById('form-submit-btn').textContent = 'List Product';
      document.getElementById('form-cancel-btn').style.display = 'none';
    });

    // Bind Delete triggers
    document.querySelectorAll('.delete-action-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this listing?')) {
          try {
            await NileAPI.products.delete(id);
            showToast('Listing successfully deleted.');
            renderSellerDashboard();
          } catch (err) {
            showToast(err.message, 'danger');
          }
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="error-screen"><h2>Failed to load Seller dashboard</h2><p>${err.message}</p></div>`;
  }
}

// Renders User Login or Register view
function renderAuth(isRegister = false) {
  const container = document.getElementById('app-content');

  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-logo">
        <div class="logo">
          <span class="nile-text">nile</span>
          <span class="dot">.</span>
        </div>
      </div>
      <h1>${isRegister ? 'Create Account' : 'Sign In'}</h1>
      
      <form id="auth-submit-form">
        ${isRegister ? `
          <div class="form-group">
            <label for="auth-name">Your Name</label>
            <input type="text" id="auth-name" class="form-input" required placeholder="First and last name">
          </div>
        ` : ''}
        <div class="form-group">
          <label for="auth-email">Email Address</label>
          <input type="email" id="auth-email" class="form-input" required placeholder="name@email.com">
        </div>
        <div class="form-group">
          <label for="auth-password">Password</label>
          <input type="password" id="auth-password" class="form-input" required minlength="6" placeholder="At least 6 characters">
        </div>

        ${isRegister ? `
          <div class="form-group">
            <label for="auth-role">Account Type</label>
            <select id="auth-role" class="form-input">
              <option value="user">Standard Buyer Account</option>
              <option value="seller">Seller Store Account</option>
            </select>
          </div>
        ` : ''}

        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 15px;">
          ${isRegister ? 'Create Account' : 'Continue'}
        </button>
      </form>

      <div class="auth-toggle-prompt">
        ${isRegister ? `
          Already have an account? <a href="#/login">Sign in</a>
        ` : `
          New to Nile? <a href="#/register">Create your Nile account</a>
        `}
      </div>
    </div>
  `;

  document.getElementById('auth-submit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    try {
      if (isRegister) {
        const name = document.getElementById('auth-name').value.trim();
        const role = document.getElementById('auth-role').value;
        AppState.currentUser = await NileAPI.auth.signup(name, email, password, role);
        showToast(`Welcome to Nile, ${name}!`);
      } else {
        AppState.currentUser = await NileAPI.auth.login(email, password);
        showToast(`Signed in as ${AppState.currentUser.name}`);
      }

      updateAuthUI();
      
      // Redirect based on role
      if (AppState.currentUser.role === 'seller') {
        window.location.hash = '#/seller';
      } else {
        window.location.hash = '#/';
      }

    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

// ==========================================
// 5. UTILITY FUNCTIONS (TOASTS, CONFETTI, STARS)
// ==========================================

// Creates a beautiful slide-in toaster notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'danger' ? 'toast-danger' : 'toast-success'}`;
  
  toast.innerHTML = `
    <span style="font-weight: 500;">${message}</span>
    <span class="toast-close">&times;</span>
  `;

  container.appendChild(toast);

  // Auto remove
  const autoCloseTimer = setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);

  // Close clicking
  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(autoCloseTimer);
    toast.remove();
  });
}

// Generates stars HTML based on ratings
function generateStarsHtml(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.4;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  let html = '';
  for (let i = 0; i < fullStars; i++) {
    html += '<i class="fa-solid fa-star"></i>';
  }
  if (hasHalf) {
    html += '<i class="fa-solid fa-star-half-stroke"></i>';
  }
  for (let i = 0; i < emptyStars; i++) {
    html += '<i class="fa-regular fa-star"></i>';
  }
  return html;
}

// Trigger Confetti fall for Order Confirmation (Confetti wow factor!)
function triggerConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#ffa41c', '#232f3e', '#2ea44f', '#0969da', '#f8d7da'];

  (function frame() {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    // Random styling
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.top = '-10px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.transform = `scale(${Math.random() * 1.5}) rotate(${Math.random() * 360}deg)`;
    confetti.style.opacity = Math.random();
    
    document.body.appendChild(confetti);

    // Animate falling
    const speed = 3 + Math.random() * 5;
    let currentTop = -10;
    
    const interval = setInterval(() => {
      currentTop += speed;
      confetti.style.top = currentTop + 'px';
      
      if (currentTop > window.innerHeight) {
        clearInterval(interval);
        confetti.remove();
      }
    }, 20);

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}
