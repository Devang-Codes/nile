const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nile_super_secure_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Check if user is a seller
const authorizeSeller = (req, res, next) => {
  if (req.user && req.user.role === 'seller') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Sellers only.' });
  }
};

// --- AUTHENTICATION ENDPOINTS ---

// Register User
app.post('/api/auth/signup', (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const users = db.getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newUser = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role === 'seller' ? 'seller' : 'user'
    };

    db.saveUser(newUser);

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during sign up' });
  }
});

// Login User
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const users = db.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const users = db.getUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

// --- PRODUCT ENDPOINTS ---

// Get All Products (with filters, search, sorting)
app.get('/api/products', (req, res) => {
  try {
    let products = db.getProducts();
    const { search, category, sort } = req.query;

    if (category && category !== 'all') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const query = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query)
      );
    }

    if (sort) {
      if (sort === 'price-low') {
        products.sort((a, b) => a.price - b.price);
      } else if (sort === 'price-high') {
        products.sort((a, b) => b.price - a.price);
      } else if (sort === 'rating') {
        products.sort((a, b) => b.rating - a.rating);
      }
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Get Single Product
app.get('/api/products/:id', (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.json(product);
});

// Add Product (Sellers only)
app.post('/api/products', authenticateToken, authorizeSeller, (req, res) => {
  try {
    const { name, description, price, category, imageUrl, stock, specifications } = req.body;

    if (!name || !description || !price || !category || !stock) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const newProduct = {
      id: 'prod_' + Math.random().toString(36).substr(2, 9),
      name,
      description,
      price: parseFloat(price),
      rating: 5.0,
      reviewsCount: 0,
      category,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
      sellerId: req.user.id,
      stock: parseInt(stock),
      specifications: specifications || {}
    };

    db.saveProduct(newProduct);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error saving product' });
  }
});

// Edit Product (Sellers only, and must own the product)
app.put('/api/products/:id', authenticateToken, authorizeSeller, (req, res) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.sellerId !== req.user.id && req.user.id !== 'usr_admin') {
      return res.status(403).json({ message: 'Unauthorized to modify this product' });
    }

    const { name, description, price, category, imageUrl, stock, specifications } = req.body;

    const updatedProduct = {
      ...product,
      name: name || product.name,
      description: description || product.description,
      price: price ? parseFloat(price) : product.price,
      category: category || product.category,
      imageUrl: imageUrl || product.imageUrl,
      stock: stock !== undefined ? parseInt(stock) : product.stock,
      specifications: specifications || product.specifications
    };

    db.saveProduct(updatedProduct);
    res.json(updatedProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating product' });
  }
});

// Delete Product (Sellers only, and must own the product)
app.delete('/api/products/:id', authenticateToken, authorizeSeller, (req, res) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.sellerId !== req.user.id && req.user.id !== 'usr_admin') {
      return res.status(403).json({ message: 'Unauthorized to delete this product' });
    }

    db.deleteProduct(req.params.id);
    res.json({ message: 'Product successfully deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting product' });
  }
});

// --- ORDER ENDPOINTS ---

// Place Order
app.post('/api/orders', authenticateToken, (req, res) => {
  try {
    const { items, total, shippingAddress } = req.body;

    if (!items || items.length === 0 || !total || !shippingAddress) {
      return res.status(400).json({ message: 'Invalid order details' });
    }

    const newOrder = {
      id: 'ord_' + Math.random().toString(36).substr(2, 9),
      userId: req.user.id,
      items,
      total: parseFloat(total),
      shippingAddress,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    db.saveOrder(newOrder);
    res.status(201).json(newOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error processing order' });
  }
});

// Get User Orders
app.get('/api/orders', authenticateToken, (req, res) => {
  try {
    const orders = db.getOrdersByUserId(req.user.id);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving orders' });
  }
});

// --- REVIEWS ENDPOINTS ---

// Get Reviews for Product
app.get('/api/reviews/:productId', (req, res) => {
  const reviews = db.getReviewsByProductId(req.params.productId);
  res.json(reviews);
});

// Submit Review
app.post('/api/reviews', authenticateToken, (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    if (!productId || !rating || !comment) {
      return res.status(400).json({ message: 'Product ID, rating, and comment are required' });
    }

    const newReview = {
      id: 'rev_' + Math.random().toString(36).substr(2, 9),
      productId,
      userId: req.user.id,
      userName: req.user.name,
      rating: parseInt(rating),
      comment,
      createdAt: new Date().toISOString()
    };

    db.saveReview(newReview);
    res.status(201).json(newReview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error saving review' });
  }
});

// Catch-all to serve index.html (useful for standard SPA routes, although hash router is used)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
