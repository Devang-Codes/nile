// Nile - Backend Database Verification Script
const db = require('../src/db');
const fs = require('fs');
const path = require('path');

// Test Suite Runner
function runTests() {
  console.log('🧪 Starting Nile Database Verification Checks...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Test 1: Data Seeding
    const products = db.getProducts();
    assert(products.length > 0, `Database initialized and seeded with ${products.length} products`);

    // Test 2: Query product by ID
    const prodId = 'prod_1';
    const prod = db.getProductById(prodId);
    assert(prod && prod.id === prodId, `Query product by ID: ${prodId} returns correct product name: "${prod.name}"`);

    // Test 3: Add new product
    const testProd = {
      id: 'prod_test',
      name: 'Test Product Extraordinaire',
      description: 'Built for automated database verification',
      price: 29.99,
      rating: 5.0,
      reviewsCount: 0,
      category: 'electronics',
      imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12',
      sellerId: 'usr_admin',
      stock: 10,
      specifications: { "Warranty": "1 Year" }
    };
    db.saveProduct(testProd);
    const queried = db.getProductById('prod_test');
    assert(queried && queried.price === 29.99, 'Successfully saved and queried a new product');

    // Test 4: Register User
    const testUser = {
      id: 'usr_test',
      name: 'Test Verification User',
      email: 'test@nile.com',
      password: 'hashedpassword123',
      role: 'user'
    };
    db.saveUser(testUser);
    const users = db.getUsers();
    assert(users.some(u => u.id === 'usr_test'), 'Successfully registered a new user account');

    // Test 5: Add Review and Check Rating aggregation
    const testReview = {
      id: 'rev_test',
      productId: 'prod_test',
      userId: 'usr_test',
      userName: 'Test Verification User',
      rating: 4,
      comment: 'Very good quality product',
      createdAt: new Date().toISOString()
    };
    db.saveReview(testReview);
    const updatedProd = db.getProductById('prod_test');
    assert(updatedProd.reviewsCount === 1 && updatedProd.rating === 4.0, 'Review submission correctly updates product reviewsCount and average rating');

    // Test 6: Place order and check stock decrement
    const testOrder = {
      id: 'ord_test',
      userId: 'usr_test',
      items: [{ id: 'prod_test', quantity: 3, price: 29.99 }],
      total: 89.97,
      shippingAddress: { name: 'Test', street: '123 St', city: 'City', zip: '10001' },
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    db.saveOrder(testOrder);
    const finalProd = db.getProductById('prod_test');
    assert(finalProd.stock === 7, 'Placing an order correctly decrements product inventory stock (10 -> 7)');

    // Clean up test data
    db.deleteProduct('prod_test');
    // Remove test user, order, review from db.json file directly to prevent clutter
    const dbPath = path.join(__dirname, '..', 'data', 'db.json');
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      const data = JSON.parse(raw);
      data.users = data.users.filter(u => u.id !== 'usr_test');
      data.orders = data.orders.filter(o => o.id !== 'ord_test');
      data.reviews = data.reviews.filter(r => r.id !== 'rev_test');
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    }
    assert(db.getProductById('prod_test') === undefined, 'Cleaned up verification test data successfully');

    console.log(`\n🏁 Verification completed. Passed: ${passed}, Failed: ${failed}`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 Test run failed with exception:', err);
    process.exit(1);
  }
}

runTests();
