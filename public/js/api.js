// Nile - Frontend API Client

const API_BASE = '/api';

// Token Management
const apiToken = {
  get: () => localStorage.getItem('nile_token'),
  set: (token) => localStorage.setItem('nile_token', token),
  clear: () => localStorage.removeItem('nile_token')
};

// Helper for making HTTP requests with automatic auth headers
async function apiRequest(endpoint, options = {}) {
  const token = apiToken.get();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers
  };
  
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error.message);
    throw error;
  }
}

// Exposed API Endpoints
const NileAPI = {
  // Authentication
  auth: {
    signup: async (name, email, password, role) => {
      const data = await apiRequest('/auth/signup', {
        method: 'POST',
        body: { name, email, password, role }
      });
      if (data.token) apiToken.set(data.token);
      return data.user;
    },
    login: async (email, password) => {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      if (data.token) apiToken.set(data.token);
      return data.user;
    },
    logout: () => {
      apiToken.clear();
      return true;
    },
    getCurrentUser: async () => {
      if (!apiToken.get()) return null;
      try {
        return await apiRequest('/auth/me');
      } catch (err) {
        apiToken.clear(); // Clear invalid token
        return null;
      }
    }
  },

  // Products
  products: {
    getAll: async ({ search = '', category = 'all', sort = '' } = {}) => {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (category && category !== 'all') query.append('category', category);
      if (sort) query.append('sort', sort);
      
      const queryString = query.toString() ? `?${query.toString()}` : '';
      return await apiRequest(`/products${queryString}`);
    },
    getById: async (id) => {
      return await apiRequest(`/products/${id}`);
    },
    create: async (productData) => {
      return await apiRequest('/products', {
        method: 'POST',
        body: productData
      });
    },
    update: async (id, productData) => {
      return await apiRequest(`/products/${id}`, {
        method: 'PUT',
        body: productData
      });
    },
    delete: async (id) => {
      return await apiRequest(`/products/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Reviews
  reviews: {
    getByProduct: async (productId) => {
      return await apiRequest(`/reviews/${productId}`);
    },
    submit: async (productId, rating, comment) => {
      return await apiRequest('/reviews', {
        method: 'POST',
        body: { productId, rating, comment }
      });
    }
  },

  // Orders
  orders: {
    place: async (items, total, shippingAddress) => {
      return await apiRequest('/orders', {
        method: 'POST',
        body: { items, total, shippingAddress }
      });
    },
    getHistory: async () => {
      return await apiRequest('/orders');
    }
  }
};
