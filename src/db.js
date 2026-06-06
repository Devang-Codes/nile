const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'db.json');

// Ensure database file and directory exist
function initDb() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    const seedData = {
      users: [
        {
          id: "usr_admin",
          name: "Admin Seller",
          email: "seller@nile.com",
          // Password: "password123" hashed using bcrypt (pre-hashed)
          password: "$2a$10$tM9sC17d/O9tUvWlPjA3L.pLd9w0e9Wv2Tj16a7lBv9cK6X.a3bW2",
          role: "seller"
        },
        {
          id: "usr_demo",
          name: "Demo Buyer",
          email: "buyer@nile.com",
          // Password: "password123"
          password: "$2a$10$tM9sC17d/O9tUvWlPjA3L.pLd9w0e9Wv2Tj16a7lBv9cK6X.a3bW2",
          role: "user"
        }
      ],
      products: [
        {
          id: "prod_1",
          name: "Quantum Sound Pro - Wireless Noise Cancelling Headphones",
          description: "Experience music in its purest form with advanced hybrid active noise cancelling, 45-hour battery life, high-res audio drivers, and an ultra-comfortable memory foam headband.",
          price: 199.99,
          rating: 4.8,
          reviewsCount: 124,
          category: "electronics",
          imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
          sellerId: "usr_admin",
          stock: 12,
          specifications: {
            "Brand": "Quantum",
            "Color": "Slate Black",
            "Connectivity": "Bluetooth 5.2, 3.5mm Aux",
            "Battery Life": "Up to 45 Hours",
            "Charging": "USB-C Fast Charging (10 mins = 5 hrs)"
          }
        },
        {
          id: "prod_2",
          name: "AeroGlide Run - Unisex Lightweight Road Running Shoes",
          description: "Engineered for maximum speed and comfort, featuring our proprietary responsive foam midsole, breathable mesh knit upper, and durable high-grip rubber outsoles.",
          price: 119.50,
          rating: 4.6,
          reviewsCount: 88,
          category: "fashion",
          imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
          sellerId: "usr_admin",
          stock: 25,
          specifications: {
            "Brand": "AeroGlide",
            "Material": "Recycled Polyester Mesh",
            "Weight": "240g",
            "Support Type": "Neutral Cushioning",
            "Terrain": "Road Running"
          }
        },
        {
          id: "prod_3",
          name: "Nero Barista Express - Automatic Espresso & Coffee Maker",
          description: "Bring the cafe experience home. Features a built-in conical burr grinder, precise PID digital temperature control, and a powerful steam wand for microfoam milk texturing.",
          price: 599.00,
          rating: 4.9,
          reviewsCount: 342,
          category: "home",
          imageUrl: "https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?w=800&auto=format&fit=crop&q=80",
          sellerId: "usr_admin",
          stock: 5,
          specifications: {
            "Brand": "Nero",
            "Pressure": "15 Bar Italian Pump",
            "Capacity": "2.0L Water Tank",
            "Grinder Settings": "30 Precise Grind Sizes",
            "Heating System": "Thermojet (3-sec heat up)"
          }
        },
        {
          id: "prod_4",
          name: "Architectural Thinking in Modern Web Applications",
          description: "The definitive guide to designing scalable, maintainable, and robust web applications. Learn patterns, clean architecture, performance optimization, and API design from industry experts.",
          price: 45.00,
          rating: 4.7,
          reviewsCount: 56,
          category: "books",
          imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80",
          sellerId: "usr_admin",
          stock: 40,
          specifications: {
            "Author": "Marcus Sterling",
            "Publisher": "TechPress Publishing",
            "Format": "Hardcover",
            "Pages": "412 Pages",
            "Language": "English"
          }
        },
        {
          id: "prod_5",
          name: "VividView 27-inch 4K UHD IPS Designer Monitor",
          description: "Stunning 4K display with 99% sRGB color gamut coverage, HDR10 support, USB-C power delivery, and an ergonomic height-adjustable stand. Perfect for content creators and professionals.",
          price: 349.99,
          rating: 4.5,
          reviewsCount: 76,
          category: "electronics",
          imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80",
          sellerId: "usr_admin",
          stock: 8,
          specifications: {
            "Brand": "VividView",
            "Screen Size": "27 Inches",
            "Resolution": "3840 x 2160 (4K UHD)",
            "Panel Type": "IPS",
            "Refresh Rate": "60Hz"
          }
        },
        {
          id: "prod_6",
          name: "Classic Chronograph Waterproof Mechanical Watch",
          description: "Elevate your wrist game. Crafted with premium surgical stainless steel, scratch-resistant sapphire crystal, and an automatic mechanical movement with 40-hour power reserve.",
          price: 249.00,
          rating: 4.7,
          reviewsCount: 43,
          category: "fashion",
          imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
          sellerId: "usr_admin",
          stock: 15,
          specifications: {
            "Brand": "Horology",
            "Case Diameter": "42mm",
            "Water Resistance": "50 Meters (5 ATM)",
            "Strap": "Genuine Italian Leather",
            "Warranty": "2 Years"
          }
        }
      ],
      orders: [],
      reviews: [
        {
          id: "rev_1",
          productId: "prod_1",
          userId: "usr_demo",
          userName: "Demo Buyer",
          rating: 5,
          comment: "Absolutely incredible sound stage and the noise cancellation is top notch. Feels very premium and the battery lasts forever!",
          createdAt: new Date().toISOString()
        },
        {
          id: "rev_2",
          productId: "prod_3",
          userId: "usr_demo",
          userName: "Demo Buyer",
          rating: 5,
          comment: "Saves me so much money compared to daily cafe trips. Simple to use, and builds amazing espresso microfoam. Highly recommend!",
          createdAt: new Date().toISOString()
        }
      ]
    };

    fs.writeFileSync(dbPath, JSON.stringify(seedData, null, 2), 'utf-8');
  }
}

function readData() {
  initDb();
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('DB read/parse error, re-seeding:', err.message);
    // Delete corrupted file and re-init
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    initDb();
    const raw = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(raw);
  }
}


function writeData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  getUsers: () => readData().users,
  saveUser: (user) => {
    const data = readData();
    data.users.push(user);
    writeData(data);
    return user;
  },
  getProducts: () => readData().products,
  getProductById: (id) => readData().products.find(p => p.id === id),
  saveProduct: (product) => {
    const data = readData();
    const index = data.products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      data.products[index] = product; // Update
    } else {
      data.products.push(product); // Create new
    }
    writeData(data);
    return product;
  },
  deleteProduct: (id) => {
    const data = readData();
    data.products = data.products.filter(p => p.id !== id);
    writeData(data);
    return true;
  },
  getOrders: () => readData().orders,
  getOrdersByUserId: (userId) => readData().orders.filter(o => o.userId === userId),
  saveOrder: (order) => {
    const data = readData();
    data.orders.push(order);
    // Deduct stock for purchased items
    order.items.forEach(item => {
      const prod = data.products.find(p => p.id === item.id);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
      }
    });
    writeData(data);
    return order;
  },
  getReviewsByProductId: (productId) => readData().reviews.filter(r => r.productId === productId),
  saveReview: (review) => {
    const data = readData();
    data.reviews.push(review);

    // Update product average rating & count
    const prodReviews = data.reviews.filter(r => r.productId === review.productId);
    const prod = data.products.find(p => p.id === review.productId);
    if (prod) {
      prod.reviewsCount = prodReviews.length;
      const totalRating = prodReviews.reduce((sum, r) => sum + r.rating, 0);
      prod.rating = parseFloat((totalRating / prodReviews.length).toFixed(1));
    }

    writeData(data);
    return review;
  }
};
