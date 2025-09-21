const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(cors());
app.use(express.json());

// === DB (ไฟล์ local) ===
const db = new sqlite3.Database("data.db");

// สร้างตารางถ้ายังไม่มี
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE,
      name TEXT,
      category TEXT,
      price REAL,
      quantity INTEGER
    )
  `);

  // สร้างตารางการจองสต๊อก
  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_sku TEXT,
      customer_name TEXT,
      reserved_quantity INTEGER,
      status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
      discount REAL DEFAULT 0,
      vat REAL DEFAULT 0,
      sales_person TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_sku) REFERENCES products (sku)
    )
  `);
  
  // Add columns if they don't exist (for existing databases)
  db.run(`ALTER TABLE reservations ADD COLUMN discount REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding discount column:', err);
    }
  });
  
  db.run(`ALTER TABLE reservations ADD COLUMN vat REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding vat column:', err);
    }
  });
  
  db.run(`ALTER TABLE reservations ADD COLUMN sales_person TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding sales_person column:', err);
    }
  });
});

// seed ครั้งแรก
db.get("SELECT COUNT(*) AS c FROM products", (err, row) => {
  if (err) {
    console.error(err);
    return;
  }
  
  if (row.c === 0) {
    const stmt = db.prepare(`
      INSERT INTO products (sku, name, category, price, quantity)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run("BTH-0001", "Single-Handle Basin Faucet", "Faucet", 1290, 25);
    stmt.run("BTH-0002", "Wall-Mounted Shower Set", "Shower", 2590, 18);
    stmt.run("BTH-0003", "One-Piece Toilet 4.8L", "Toilet", 6490, 10);
    stmt.run("BTH-0004", "Pedestal Basin 50cm", "Basin", 1890, 14);
    stmt.finalize();
    
    console.log("Seeded sample rows.");
  }
});

// ====== API ======

// Export products to CSV
app.get("/api/products/export", (req, res) => {
  db.all("SELECT * FROM products ORDER BY id DESC", (err, rows) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    
    // Create CSV header
    const headers = ['ID', 'SKU', 'Name', 'Category', 'Price', 'Quantity'];
    const csvRows = [headers.join(',')];
    
    // Add data rows
    rows.forEach(row => {
      const values = [
        row.id,
        `"${row.sku}"`,
        `"${row.name}"`,
        `"${row.category}"`,
        row.price,
        row.quantity
      ];
      csvRows.push(values.join(','));
    });
    
    // Set headers for CSV download
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="products.csv"');
    res.send(csvRows.join('\n'));
  });
});

// Export reservations to CSV
app.get("/api/reservations/export", (req, res) => {
  db.all(`
    SELECT r.*, p.name as product_name, p.price as product_price
    FROM reservations r
    JOIN products p ON r.product_sku = p.sku
    ORDER BY r.created_at DESC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    
    // Create CSV header
    const headers = ['ID', 'Product SKU', 'Product Name', 'Customer Name', 'Sales Person', 'Quantity', 'Status', 'Discount', 'VAT', 'Created At', 'Updated At'];
    const csvRows = [headers.join(',')];
    
    // Add data rows
    rows.forEach(row => {
      const values = [
        row.id,
        `"${row.product_sku}"`,
        `"${row.product_name}"`,
        `"${row.customer_name}"`,
        `"${row.sales_person || ''}"`,
        row.reserved_quantity,
        `"${row.status}"`,
        row.discount || 0,
        row.vat || 0,
        `"${row.created_at}"`,
        `"${row.updated_at}"`
      ];
      csvRows.push(values.join(','));
    });
    
    // Set headers for CSV download
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="reservations.csv"');
    res.send(csvRows.join('\n'));
  });
});

// ดึงทั้งหมด
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products ORDER BY id DESC", (err, rows) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    res.json(rows);
  });
});

// ดึงตาม SKU
app.get("/api/products/:sku", (req, res) => {
  db.get("SELECT * FROM products WHERE sku = ?", [req.params.sku], (err, row) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!row) return res.status(404).json({ ok: false, error: "not found" });
    res.json(row);
  });
});

// เพิ่มสินค้าใหม่
app.post("/api/products", (req, res) => {
  const { sku, name, category, price, quantity } = req.body || {};
  if (!sku) return res.status(400).json({ ok: false, error: "sku required" });
  
  const stmt = db.prepare(`
    INSERT INTO products (sku, name, category, price, quantity)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run([sku, name, category, price, quantity], function(err) {
    if (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    res.json({ ok: true, id: this.lastID });
  });
  
  stmt.finalize();
});

// อัปเดตตาม SKU (อัปเดตเฉพาะฟิลด์ที่ส่งมา)
app.put("/api/products/:sku", (req, res) => {
  const { name, category, price, quantity } = req.body || {};
  
  // ตรวจสอบว่ามีสินค้าหรือไม่
  db.get("SELECT id FROM products WHERE sku = ?", [req.params.sku], (err, row) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!row) return res.status(404).json({ ok: false, error: "not found" });
    
    // สร้าง query สำหรับ update
    let setClause = [];
    let params = [];
    
    if (name !== undefined) {
      setClause.push("name = ?");
      params.push(name);
    }
    if (category !== undefined) {
      setClause.push("category = ?");
      params.push(category);
    }
    if (price !== undefined) {
      setClause.push("price = ?");
      params.push(price);
    }
    if (quantity !== undefined) {
      setClause.push("quantity = ?");
      params.push(quantity);
    }
    
    // ถ้าไม่มี field ที่จะ update
    if (setClause.length === 0) {
      return res.json({ ok: true, changes: 0 });
    }
    
    params.push(req.params.sku);
    
    const stmt = db.prepare(`
      UPDATE products
      SET ${setClause.join(", ")}
      WHERE sku = ?
    `);
    
    stmt.run(params, function(err) {
      if (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
      res.json({ ok: true, changes: this.changes });
    });
    
    stmt.finalize();
  });
});

// ลบตาม SKU
app.delete("/api/products/:sku", (req, res) => {
  const stmt = db.prepare("DELETE FROM products WHERE sku = ?");
  
  stmt.run([req.params.sku], function(err) {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (this.changes === 0) return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true, deleted: req.params.sku });
  });
  
  stmt.finalize();
});

// ====== Reservation API ======

// ดึงการจองทั้งหมด
app.get("/api/reservations", (req, res) => {
  db.all(`
    SELECT r.*, p.name as product_name, p.price as product_price
    FROM reservations r
    JOIN products p ON r.product_sku = p.sku
    ORDER BY r.created_at DESC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    res.json(rows);
  });
});

// ดึงการจองตาม ID
app.get("/api/reservations/:id", (req, res) => {
  db.get(`
    SELECT r.*, p.name as product_name, p.price as product_price
    FROM reservations r
    JOIN products p ON r.product_sku = p.sku
    WHERE r.id = ?
  `, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!row) return res.status(404).json({ ok: false, error: "not found" });
    res.json(row);
  });
});

// สร้างการจองใหม่
app.post("/api/reservations", (req, res) => {
  const { product_sku, customer_name, reserved_quantity, discount = 0, vat = 0, sales_person = '' } = req.body || {};
  
  // ตรวจสอบข้อมูลที่จำเป็น
  if (!product_sku) return res.status(400).json({ ok: false, error: "product_sku required" });
  if (!customer_name) return res.status(400).json({ ok: false, error: "customer_name required" });
  if (!reserved_quantity || reserved_quantity <= 0) return res.status(400).json({ ok: false, error: "reserved_quantity must be a positive number" });
  
  // ตรวจสอบว่ามีสินค้าหรือไม่
  db.get("SELECT * FROM products WHERE sku = ?", [product_sku], (err, product) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!product) return res.status(404).json({ ok: false, error: "product not found" });
    
    // ตรวจสอบว่ามีสต๊อกเพียงพอหรือไม่
    if (product.quantity < reserved_quantity) {
      return res.status(400).json({ 
        ok: false, 
        error: "insufficient stock",
        available: product.quantity
      });
    }
    
    // เพิ่มการจอง
    const insertReservation = db.prepare(`
      INSERT INTO reservations (product_sku, customer_name, reserved_quantity, discount, vat, sales_person)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    insertReservation.run([product_sku, customer_name, reserved_quantity, discount, vat, sales_person], function(err) {
      if (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
      
      const reservationId = this.lastID;
      
      // ลดจำนวนสต๊อกในสินค้า
      const updateProduct = db.prepare(`
        UPDATE products 
        SET quantity = quantity - ? 
        WHERE sku = ?
      `);
      
      updateProduct.run([reserved_quantity, product_sku], function(err) {
        if (err) {
          // ถ้าอัปเดตสต๊อกไม่สำเร็จ ให้ลบการจองที่เพิ่งสร้าง
          db.run("DELETE FROM reservations WHERE id = ?", [reservationId]);
          return res.status(500).json({ ok: false, error: err.message });
        }
        
        res.json({ ok: true, id: reservationId });
      });
    });
    
    insertReservation.finalize();
  });
});

// อัปเดตสถานะการจอง
app.put("/api/reservations/:id/status", (req, res) => {
  const { status } = req.body || {};
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ 
      ok: false, 
      error: "status must be one of: pending, confirmed, cancelled, completed" 
    });
  }
  
  // ตรวจสอบว่ามีการจองหรือไม่
  db.get("SELECT * FROM reservations WHERE id = ?", [req.params.id], (err, reservation) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!reservation) return res.status(404).json({ ok: false, error: "reservation not found" });
    
    // ถ้าเปลี่ยนสถานะเป็น cancelled ต้องคืนสต๊อก
    if (status === 'cancelled' && reservation.status !== 'cancelled') {
      // คืนสต๊อกให้สินค้า
      const updateProduct = db.prepare(`
        UPDATE products 
        SET quantity = quantity + ? 
        WHERE sku = ?
      `);
      
      updateProduct.run([reservation.reserved_quantity, reservation.product_sku], function(err) {
        if (err) {
          return res.status(500).json({ ok: false, error: err.message });
        }
        
        // อัปเดตสถานะการจอง
        const update = db.prepare(`
          UPDATE reservations 
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        
        update.run([status, req.params.id], function(err) {
          if (err) {
            // ถ้าอัปเดตสถานะไม่สำเร็จ ให้ย้อนกลับการคืนสต๊อก
            const revertProduct = db.prepare(`
              UPDATE products 
              SET quantity = quantity - ? 
              WHERE sku = ?
            `);
            revertProduct.run([reservation.reserved_quantity, reservation.product_sku]);
            return res.status(500).json({ ok: false, error: err.message });
          }
          
          res.json({ ok: true, changes: this.changes });
        });
      });
    } 
    // ถ้าเปลี่ยนสถานะเป็น completed ต้องลดสต๊อก
    else if (status === 'completed' && reservation.status !== 'completed') {
      // ตรวจสอบว่ามีสต๊อกเพียงพอหรือไม่
      db.get("SELECT quantity FROM products WHERE sku = ?", [reservation.product_sku], (err, product) => {
        if (err) {
          return res.status(500).json({ ok: false, error: err.message });
        }
        
        if (!product) {
          return res.status(404).json({ ok: false, error: "product not found" });
        }
        
        // ตรวจสอบว่ามีสต๊อกเพียงพอหรือไม่
        if (product.quantity < reservation.reserved_quantity) {
          return res.status(400).json({ 
            ok: false, 
            error: "insufficient stock",
            available: product.quantity
          });
        }
        
        // อัปเดตสถานะการจอง
        const update = db.prepare(`
          UPDATE reservations 
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        
        update.run([status, req.params.id], function(err) {
          if (err) {
            return res.status(500).json({ ok: false, error: err.message });
          }
          
          res.json({ ok: true, changes: this.changes });
        });
      });
    } else {
      // อัปเดตสถานะการจอง
      const update = db.prepare(`
        UPDATE reservations 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      update.run([status, req.params.id], function(err) {
        if (err) {
          return res.status(500).json({ ok: false, error: err.message });
        }
        res.json({ ok: true, changes: this.changes });
      });
    }
  });
});

// อัปเดตจำนวนการจอง
app.put("/api/reservations/:id", (req, res) => {
  const { reserved_quantity } = req.body || {};
  
  // ตรวจสอบข้อมูลที่จำเป็น
  if (reserved_quantity === undefined || reserved_quantity <= 0) {
    return res.status(400).json({ ok: false, error: "reserved_quantity must be a positive number" });
  }
  
  // ตรวจสอบว่ามีการจองหรือไม่
  db.get("SELECT * FROM reservations WHERE id = ?", [req.params.id], (err, reservation) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!reservation) return res.status(404).json({ ok: false, error: "reservation not found" });
    
    // ตรวจสอบว่าสถานะเป็น pending หรือไม่
    if (reservation.status !== 'pending') {
      return res.status(400).json({ ok: false, error: "can only update quantity for pending reservations" });
    }
    
    // ตรวจสอบว่ามีสินค้าหรือไม่
    db.get("SELECT * FROM products WHERE sku = ?", [reservation.product_sku], (err, product) => {
      if (err) {
        return res.status(500).json({ ok: false, error: err.message });
      }
      if (!product) return res.status(404).json({ ok: false, error: "product not found" });
      
      // ตรวจสอบว่ามีสต๊อกเพียงพอหรือไม่
      // ต้องคำนึงถึงจำนวนที่จองไว้เดิมด้วย
      const availableQuantity = product.quantity + reservation.reserved_quantity;
      if (reserved_quantity > availableQuantity) {
        return res.status(400).json({ 
          ok: false, 
          error: "insufficient stock",
          available: availableQuantity
        });
      }
      
      // อัปเดตจำนวนการจอง
      const update = db.prepare(`
        UPDATE reservations 
        SET reserved_quantity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      update.run([reserved_quantity, req.params.id], function(err) {
        if (err) {
          return res.status(500).json({ ok: false, error: err.message });
        }
        
        // อัปเดตสต๊อกในสินค้า (คืนสต๊อกเดิมและจองสต๊อกใหม่)
        const updateProduct = db.prepare(`
          UPDATE products 
          SET quantity = quantity + ? - ?
          WHERE sku = ?
        `);
        
        updateProduct.run([reservation.reserved_quantity, reserved_quantity, reservation.product_sku], function(err) {
          if (err) {
            // ถ้าอัปเดตสต๊อกไม่สำเร็จ ให้ย้อนกลับการอัปเดตการจอง
            const revertReservation = db.prepare(`
              UPDATE reservations 
              SET reserved_quantity = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `);
            revertReservation.run([reservation.reserved_quantity, req.params.id]);
            return res.status(500).json({ ok: false, error: err.message });
          }
          
          res.json({ ok: true, changes: this.changes });
        });
      });
    });
  });
});

// ลบการจอง
app.delete("/api/reservations/:id", (req, res) => {
  // ตรวจสอบว่ามีการจองหรือไม่
  db.get("SELECT * FROM reservations WHERE id = ?", [req.params.id], (err, reservation) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!reservation) return res.status(404).json({ ok: false, error: "reservation not found" });
    
    // ถ้าการจองยังไม่ถูกยกเลิก ให้คืนสต๊อก
    if (reservation.status !== 'cancelled') {
      // คืนสต๊อกให้สินค้า
      const updateProduct = db.prepare(`
        UPDATE products 
        SET quantity = quantity + ? 
        WHERE sku = ?
      `);
      
      updateProduct.run([reservation.reserved_quantity, reservation.product_sku], function(err) {
        if (err) {
          return res.status(500).json({ ok: false, error: err.message });
        }
        
        // ลบการจอง
        const stmt = db.prepare("DELETE FROM reservations WHERE id = ?");
        
        stmt.run([req.params.id], function(err) {
          if (err) {
            // ถ้าลบไม่สำเร็จ ให้ย้อนกลับการคืนสต๊อก
            const revertProduct = db.prepare(`
              UPDATE products 
              SET quantity = quantity - ? 
              WHERE sku = ?
            `);
            revertProduct.run([reservation.reserved_quantity, reservation.product_sku]);
            return res.status(500).json({ ok: false, error: err.message });
          }
          
          res.json({ ok: true, deleted: req.params.id });
        });
      });
    } else {
      // ลบการจอง
      const stmt = db.prepare("DELETE FROM reservations WHERE id = ?");
      
      stmt.run([req.params.id], function(err) {
        if (err) {
          return res.status(500).json({ ok: false, error: err.message });
        }
        res.json({ ok: true, deleted: req.params.id });
      });
    }
  });
});

// เพิ่มสินค้าหลายรายการ
app.post("/api/products/bulk", (req, res) => {
  const products = req.body || [];
  
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ ok: false, error: "products must be a non-empty array" });
  }
  
  // Begin transaction
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO products (sku, name, category, price, quantity)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    let successCount = 0;
    let errorCount = 0;
    
    products.forEach((product) => {
      const { sku, name, category, price, quantity } = product;
      if (!sku) {
        errorCount++;
        return;
      }
      
      stmt.run([sku, name, category, price, quantity], function(err) {
        if (err) {
          console.error('Error inserting product:', err);
          errorCount++;
        } else {
          successCount++;
        }
      });
    });
    
    stmt.finalize(() => {
      db.run("COMMIT", (err) => {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ ok: false, error: "Transaction failed" });
        }
        
        res.json({ 
          ok: true, 
          successCount, 
          errorCount,
          message: `Imported ${successCount} products, ${errorCount} errors`
        });
      });
    });
  });
});

// ====== Database Management API ======

// Create new database (clear and reinitialize)
app.post("/api/database/create", (req, res) => {
  // Drop existing tables
  db.serialize(() => {
    db.run("DROP TABLE IF EXISTS reservations");
    db.run("DROP TABLE IF EXISTS products");
    
    // Recreate tables
    db.run(`
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT UNIQUE,
        name TEXT,
        category TEXT,
        price REAL,
        quantity INTEGER
      )
    `);
    
    db.run(`
      CREATE TABLE reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_sku TEXT,
        customer_name TEXT,
        reserved_quantity INTEGER,
        status TEXT DEFAULT 'pending',
        discount REAL DEFAULT 0,
        vat REAL DEFAULT 0,
        sales_person TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_sku) REFERENCES products (sku)
      )
    `);
    
    // Seed with sample data
    const stmt = db.prepare(`
      INSERT INTO products (sku, name, category, price, quantity)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run("BTH-0001", "Single-Handle Basin Faucet", "Faucet", 1290, 25);
    stmt.run("BTH-0002", "Wall-Mounted Shower Set", "Shower", 2590, 18);
    stmt.run("BTH-0003", "One-Piece Toilet 4.8L", "Toilet", 6490, 10);
    stmt.run("BTH-0004", "Pedestal Basin 50cm", "Basin", 1890, 14);
    stmt.finalize();
    
    res.json({ ok: true, message: "Database created and seeded successfully" });
  });
});

// Delete database (clear all data)
app.delete("/api/database/delete", (req, res) => {
  // Clear all data from tables
  db.serialize(() => {
    db.run("DELETE FROM reservations");
    db.run("DELETE FROM products");
    
    // Reset autoincrement counters
    db.run("DELETE FROM sqlite_sequence WHERE name='products'");
    db.run("DELETE FROM sqlite_sequence WHERE name='reservations'");
    
    res.json({ ok: true, message: "Database cleared successfully" });
  });
});

const PORT = 3002;
const server = app.listen(PORT, () => console.log(`API ready: http://localhost:${PORT}`));

// ปิดการเชื่อมต่อฐานข้อมูลเมื่อเซิร์ฟเวอร์หยุดทำงาน
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });
});