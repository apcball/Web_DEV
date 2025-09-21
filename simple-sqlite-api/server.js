// server.js
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

// === DB (ไฟล์ local) ===
const db = new Database("data.db");

// สร้างตารางถ้ายังไม่มี
db.prepare(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE,
    name TEXT,
    category TEXT,
    price REAL,
    quantity INTEGER
  )
`).run();

// seed ครั้งแรก
const count = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO products (sku, name, category, price, quantity)
    VALUES (?, ?, ?, ?, ?)
  `);
  insert.run("BTH-0001", "Single-Handle Basin Faucet", "Faucet", 1290, 25);
  insert.run("BTH-0002", "Wall-Mounted Shower Set", "Shower", 2590, 18);
  insert.run("BTH-0003", "One-Piece Toilet 4.8L", "Toilet", 6490, 10);
  insert.run("BTH-0004", "Pedestal Basin 50cm", "Basin", 1890, 14);
  console.log("Seeded sample rows.");
}

// ====== API ======

// ดึงทั้งหมด
app.get("/api/products", (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY id DESC").all();
  res.json(rows);
});

// ดึงตาม SKU
app.get("/api/products/:sku", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE sku = ?").get(req.params.sku);
  if (!row) return res.status(404).json({ ok: false, error: "not found" });
  res.json(row);
});

// เพิ่มสินค้าใหม่
app.post("/api/products", (req, res) => {
  const { sku, name, category, price, quantity } = req.body || {};
  if (!sku) return res.status(400).json({ ok: false, error: "sku required" });
  try {
    const info = db.prepare(`
      INSERT INTO products (sku, name, category, price, quantity)
      VALUES (?, ?, ?, ?, ?)
    `).run(sku, name, category, price, quantity);
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// อัปเดตตาม SKU (อัปเดตเฉพาะฟิลด์ที่ส่งมา)
app.put("/api/products/:sku", (req, res) => {
  const { name, category, price, quantity } = req.body || {};
  const exists = db.prepare("SELECT id FROM products WHERE sku = ?").get(req.params.sku);
  if (!exists) return res.status(404).json({ ok: false, error: "not found" });

  const st = db.prepare(`
    UPDATE products
    SET name = COALESCE(?, name),
        category = COALESCE(?, category),
        price = COALESCE(?, price),
        quantity = COALESCE(?, quantity)
    WHERE sku = ?
  `);
  const info = st.run(name, category, price, quantity, req.params.sku);
  res.json({ ok: true, changes: info.changes });
});

// ลบตาม SKU
app.delete("/api/products/:sku", (req, res) => {
  const info = db.prepare("DELETE FROM products WHERE sku = ?").run(req.params.sku);
  if (!info.changes) return res.status(404).json({ ok: false, error: "not found" });
  res.json({ ok: true, deleted: req.params.sku });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`API ready: http://localhost:${PORT}`));

// สร้างตารางการจองสต๊อก
db.prepare(`
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_sku TEXT,
    customer_name TEXT,
    reserved_quantity INTEGER,
    sales_person TEXT,
    discount REAL DEFAULT 0,
    vat REAL DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_sku) REFERENCES products (sku)
  )
`).run();

// สร้างการจองใหม่
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

  try {
    const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id);
    if (!reservation) return res.status(404).json({ ok: false, error: "reservation not found" });

    if (status === 'cancelled' && reservation.status !== 'cancelled') {
      const transaction = db.transaction(() => {
        db.prepare(`
          UPDATE products 
          SET quantity = quantity + ? 
          WHERE sku = ?
        `).run(reservation.reserved_quantity, reservation.product_sku);

        const info = db.prepare(`
          UPDATE reservations 
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(status, req.params.id);

        return info;
      });
      const info = transaction();
      res.json({ ok: true, changes: info.changes });
    } else {
      const info = db.prepare(`
        UPDATE reservations 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, req.params.id);
      res.json({ ok: true, changes: info.changes });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Update reservation quantity (adjust product stock accordingly)
app.put('/api/reservations/:id', (req, res) => {
  const { reserved_quantity } = req.body || {};

  if (reserved_quantity === undefined || reserved_quantity === null) {
    return res.status(400).json({ ok: false, error: 'reserved_quantity required' });
  }

  try {
    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
    if (!reservation) return res.status(404).json({ ok: false, error: 'reservation not found' });

    const product = db.prepare('SELECT * FROM products WHERE sku = ?').get(reservation.product_sku);
    if (!product) return res.status(404).json({ ok: false, error: 'product not found' });

    const oldQty = reservation.reserved_quantity;
    const newQty = parseInt(reserved_quantity, 10);
    if (isNaN(newQty) || newQty <= 0) return res.status(400).json({ ok: false, error: 'reserved_quantity must be a positive integer' });

    const diff = newQty - oldQty; // positive => need to reduce product stock, negative => increase stock

    const transaction = db.transaction(() => {
      if (diff > 0) {
        // check availability
        const freshProduct = db.prepare('SELECT quantity FROM products WHERE sku = ?').get(product.sku);
        if (freshProduct.quantity < diff) {
          throw new Error('insufficient stock');
        }
        db.prepare('UPDATE products SET quantity = quantity - ? WHERE sku = ?').run(diff, product.sku);
      } else if (diff < 0) {
        db.prepare('UPDATE products SET quantity = quantity + ? WHERE sku = ?').run(Math.abs(diff), product.sku);
      }

      const info = db.prepare('UPDATE reservations SET reserved_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, req.params.id);
      return info;
    });

    const info = transaction();
    res.json({ ok: true, changes: info.changes });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ลบการจอง
app.delete("/api/reservations/:id", (req, res) => {
  try {
    const reservation = db.prepare("SELECT * FROM reservations WHERE id = ?").get(req.params.id);
    if (!reservation) return res.status(404).json({ ok: false, error: "reservation not found" });

    const transaction = db.transaction(() => {
      if (reservation.status !== 'cancelled') {
        db.prepare(`
          UPDATE products 
          SET quantity = quantity + ? 
          WHERE sku = ?
        `).run(reservation.reserved_quantity, reservation.product_sku);
      }

      const info = db.prepare("DELETE FROM reservations WHERE id = ?").run(req.params.id);
      return info;
    });

    const info = transaction();
    if (!info.changes) return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true, deleted: req.params.id });

  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.post('/api/reservations', (req, res) => {
  const { product_sku, customer_name, reserved_quantity, salesPerson, discount, vat } = req.body || {};

  // ตรวจสอบข้อมูลที่จำเป็น
  if (!product_sku) return res.status(400).json({ ok: false, error: "product_sku required" });
  if (!customer_name) return res.status(400).json({ ok: false, error: "customer_name required" });
  if (!reserved_quantity || reserved_quantity <= 0) return res.status(400).json({ ok: false, error: "reserved_quantity must be a positive number" });

  try {
    const product = db.prepare("SELECT * FROM products WHERE sku = ?").get(product_sku);
    if (!product) return res.status(404).json({ ok: false, error: "product not found" });

    if (product.quantity < reserved_quantity) {
      return res.status(400).json({ 
        ok: false, 
        error: "insufficient stock",
        available: product.quantity
      });
    }

    const transaction = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO reservations (product_sku, customer_name, reserved_quantity, sales_person, discount, vat)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(product_sku, customer_name, reserved_quantity, salesPerson || null, discount || 0, vat || 0);

      db.prepare(`
        UPDATE products 
        SET quantity = quantity - ? 
        WHERE sku = ?
      `).run(reserved_quantity, product_sku);

      return info;
    });

    const info = transaction();
    res.json({ ok: true, id: info.lastInsertRowid });

  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ดึงการจองทั้งหมด
app.get("/api/reservations", (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, p.name as product_name, p.price as product_price, r.sales_person, r.discount, r.vat
    FROM reservations r
    JOIN products p ON r.product_sku = p.sku
    ORDER BY r.created_at DESC
  `).all();
  res.json(rows);
});
