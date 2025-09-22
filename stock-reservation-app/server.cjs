const express = require("express");
const cors = require("cors");
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.log('Connected to Supabase database.');

// ===== Helper Functions =====
async function fetchProductsMapBySku() {
  const { data: products, error } = await supabase.from('products').select('*');
  if (error) throw error;
  
  const map = {};
  products.forEach(p => {
    map[p.sku] = p;
  });
  return map;
}

// ===== CSV export helpers =====
function sendCsv(res, headers, rows, filename) {
  const csvRows = [headers.join(',')];
  rows.forEach(row => csvRows.push(row.join(',')));
  res.header('Content-Type', 'text/csv');
  res.header('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvRows.join('\n'));
}

// ===== API Endpoints =====

// Export products to CSV
app.get('/api/products/export', async (req, res) => {
  try {
    const { data: rows, error } = await supabase.from('products').select('*').order('id', { ascending: false });
    if (error) throw error;

    const headers = ['ID', 'SKU', 'Name', 'Category', 'Price', 'Quantity'];
    const csvRows = rows.map(row => [row.id, `"${row.sku}"`, `"${row.name}"`, `"${row.category}"`, row.price, row.quantity]);
    sendCsv(res, headers, csvRows, 'products.csv');
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Export reservations to CSV
app.get('/api/reservations/export', async (req, res) => {
  try {
    const { data: reservations, error: rerr } = await supabase.from('reservations').select('*').order('created_at', { ascending: false });
    if (rerr) throw rerr;

    const productsMap = await fetchProductsMapBySku();

    const headers = ['ID', 'Product SKU', 'Product Name', 'Customer Name', 'Sales Person', 'Quantity', 'Status', 'Discount', 'VAT', 'Created At', 'Updated At'];
    const csvRows = reservations.map(row => [
      row.id,
      `"${row.product_sku}"`,
      `"${(productsMap[row.product_sku] && productsMap[row.product_sku].name) || ''}"`,
      `"${row.customer_name}"`,
      `"${row.sales_person || ''}"`,
      row.reserved_quantity,
      `"${row.status}"`,
      row.discount || 0,
      row.vat || 0,
      `"${row.created_at || ''}"`,
      `"${row.updated_at || ''}"`
    ]);

    sendCsv(res, headers, csvRows, 'reservations.csv');
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Get product by SKU
app.get('/api/products/:sku', async (req, res) => {
  try {
    const sku = req.params.sku;
    const { data, error } = await supabase.from('products').select('*').eq('sku', sku).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ ok: false, error: 'not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const { sku, name, category, price, quantity } = req.body || {};
    if (!sku) return res.status(400).json({ ok: false, error: 'sku required' });

    const { data, error } = await supabase.from('products').insert([{ sku, name, category, price, quantity }]);
    if (error) return res.status(400).json({ ok: false, error: error.message || error });
    res.json({ ok: true, id: data[0].id });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Update product by SKU (partial)
app.put('/api/products/:sku', async (req, res) => {
  try {
    const sku = req.params.sku;
    const { name, category, price, quantity } = req.body || {};

    // Ensure product exists
    const { data: existing, error: gerr } = await supabase.from('products').select('id').eq('sku', sku).limit(1).maybeSingle();
    if (gerr) throw gerr;
    if (!existing) return res.status(404).json({ ok: false, error: 'not found' });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (price !== undefined) updates.price = price;
    if (quantity !== undefined) updates.quantity = quantity;

    if (Object.keys(updates).length === 0) return res.json({ ok: true, changes: 0 });

    const { error } = await supabase.from('products').update(updates).eq('sku', sku);
    if (error) throw error;
    res.json({ ok: true, changes: 1 });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Delete product by SKU
app.delete('/api/products/:sku', async (req, res) => {
  try {
    const sku = req.params.sku;
    const { error } = await supabase.from('products').delete().eq('sku', sku);
    if (error) throw error;
    res.json({ ok: true, deleted: sku });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// ====== Reservation API ======

// Get all reservations
app.get('/api/reservations', async (req, res) => {
  try {
    const { data: reservations, error: rerr } = await supabase.from('reservations').select('*').order('created_at', { ascending: false });
    if (rerr) throw rerr;

    const productsMap = await fetchProductsMapBySku();

    const mapped = (reservations || []).map(r => ({
      ...r,
      product_name: (productsMap[r.product_sku] && productsMap[r.product_sku].name) || null,
      product_price: (productsMap[r.product_sku] && productsMap[r.product_sku].price) || 0
    }));

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Get reservation by id
app.get('/api/reservations/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { data: reservation, error: rerr } = await supabase.from('reservations').select('*').eq('id', id).limit(1).maybeSingle();
    if (rerr) throw rerr;
    if (!reservation) return res.status(404).json({ ok: false, error: 'not found' });

    const { data: product } = await supabase.from('products').select('*').eq('sku', reservation.product_sku).limit(1).maybeSingle();
    res.json({ ...reservation, product_name: product ? product.name : null, product_price: product ? product.price : 0 });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Create reservation
app.post('/api/reservations', async (req, res) => {
  try {
    const { product_sku, customer_name, reserved_quantity, discount = 0, vat = 0, sales_person = '' } = req.body || {};
    if (!product_sku) return res.status(400).json({ ok: false, error: 'product_sku required' });
    if (!customer_name) return res.status(400).json({ ok: false, error: 'customer_name required' });
    if (!reserved_quantity || reserved_quantity <= 0) return res.status(400).json({ ok: false, error: 'reserved_quantity must be a positive number' });

    // fetch product
    const { data: product, error: perr } = await supabase.from('products').select('*').eq('sku', product_sku).limit(1).maybeSingle();
    if (perr) throw perr;
    if (!product) return res.status(404).json({ ok: false, error: 'product not found' });

    if (product.quantity < reserved_quantity) {
      return res.status(400).json({ ok: false, error: 'insufficient stock', available: product.quantity });
    }

    // insert reservation
    const { data: inserted, error: ierr } = await supabase.from('reservations').insert([{ product_sku, customer_name, reserved_quantity, discount, vat, sales_person }]);
    if (ierr) throw ierr;

    // Get the ID of the inserted reservation by querying for it
    const { data: latestReservation, error: queryError } = await supabase
      .from('reservations')
      .select('id')
      .eq('product_sku', product_sku)
      .eq('customer_name', customer_name)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (queryError) throw queryError;
    if (!latestReservation) throw new Error('Failed to retrieve created reservation');
    
    const reservationId = latestReservation.id;

    // update product quantity (best-effort)
    const { error: uerr } = await supabase.from('products').update({ quantity: product.quantity - reserved_quantity }).eq('sku', product_sku);
    if (uerr) {
      // attempt to delete reservation when update fails
      await supabase.from('reservations').delete().eq('id', reservationId);
      throw uerr;
    }

    res.json({ ok: true, id: reservationId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Update reservation status
app.put('/api/reservations/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body || {};
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!status || !validStatuses.includes(status)) return res.status(400).json({ ok: false, error: 'status must be one of: pending, confirmed, cancelled, completed' });

    const { data: reservation, error: rerr } = await supabase.from('reservations').select('*').eq('id', id).limit(1).maybeSingle();
    if (rerr) throw rerr;
    if (!reservation) return res.status(404).json({ ok: false, error: 'reservation not found' });

    // cancelled: return stock if not already cancelled
    if (status === 'cancelled' && reservation.status !== 'cancelled') {
      const { data: product, error: perr } = await supabase.from('products').select('*').eq('sku', reservation.product_sku).limit(1).maybeSingle();
      if (perr) throw perr;
      if (!product) return res.status(404).json({ ok: false, error: 'product not found' });

      const { error: u1 } = await supabase.from('products').update({ quantity: product.quantity + reservation.reserved_quantity }).eq('sku', reservation.product_sku);
      if (u1) throw u1;

      const { error: u2 } = await supabase.from('reservations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (u2) {
        // attempt to revert product
        await supabase.from('products').update({ quantity: product.quantity }).eq('sku', reservation.product_sku);
        throw u2;
      }

      return res.json({ ok: true, changes: 1 });
    }

    // completed: ensure stock still sufficient (this path assumes reserved items should be finalized)
    if (status === 'completed' && reservation.status !== 'completed') {
      const { data: product, error: perr } = await supabase.from('products').select('*').eq('sku', reservation.product_sku).limit(1).maybeSingle();
      if (perr) throw perr;
      if (!product) return res.status(404).json({ ok: false, error: 'product not found' });

      if (product.quantity < reservation.reserved_quantity) return res.status(400).json({ ok: false, error: 'insufficient stock', available: product.quantity });

      const { error: u } = await supabase.from('reservations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (u) throw u;
      return res.json({ ok: true, changes: 1 });
    }

    // otherwise just update status
    const { error } = await supabase.from('reservations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true, changes: 1 });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Update reservation quantity
app.put('/api/reservations/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { reserved_quantity } = req.body || {};
    if (reserved_quantity === undefined || reserved_quantity <= 0) return res.status(400).json({ ok: false, error: 'reserved_quantity must be a positive number' });

    const { data: reservation, error: rerr } = await supabase.from('reservations').select('*').eq('id', id).limit(1).maybeSingle();
    if (rerr) throw rerr;
    if (!reservation) return res.status(404).json({ ok: false, error: 'reservation not found' });
    if (reservation.status !== 'pending') return res.status(400).json({ ok: false, error: 'can only update quantity for pending reservations' });

    const { data: product, error: perr } = await supabase.from('products').select('*').eq('sku', reservation.product_sku).limit(1).maybeSingle();
    if (perr) throw perr;
    if (!product) return res.status(404).json({ ok: false, error: 'product not found' });

    const availableQuantity = product.quantity + reservation.reserved_quantity;
    if (reserved_quantity > availableQuantity) return res.status(400).json({ ok: false, error: 'insufficient stock', available: availableQuantity });

    // update reservation
    const { error: ures } = await supabase.from('reservations').update({ reserved_quantity, updated_at: new Date().toISOString() }).eq('id', id);
    if (ures) throw ures;

    // update product quantity accordingly
    const newProductQty = product.quantity + reservation.reserved_quantity - reserved_quantity;
    const { error: uprod } = await supabase.from('products').update({ quantity: newProductQty }).eq('sku', reservation.product_sku);
    if (uprod) {
      // attempt to revert reservation update
      await supabase.from('reservations').update({ reserved_quantity: reservation.reserved_quantity }).eq('id', id);
      throw uprod;
    }

    res.json({ ok: true, changes: 1 });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Delete reservation
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { data: reservation, error: rerr } = await supabase.from('reservations').select('*').eq('id', id).limit(1).maybeSingle();
    if (rerr) throw rerr;
    if (!reservation) return res.status(404).json({ ok: false, error: 'reservation not found' });

    if (reservation.status !== 'cancelled') {
      const { data: product, error: perr } = await supabase.from('products').select('*').eq('sku', reservation.product_sku).limit(1).maybeSingle();
      if (perr) throw perr;
      if (!product) return res.status(404).json({ ok: false, error: 'product not found' });

      const { error: u1 } = await supabase.from('products').update({ quantity: product.quantity + reservation.reserved_quantity }).eq('sku', reservation.product_sku);
      if (u1) throw u1;

      const { error: d } = await supabase.from('reservations').delete().eq('id', id);
      if (d) {
        // attempt to revert product change
        await supabase.from('products').update({ quantity: product.quantity }).eq('sku', reservation.product_sku);
        throw d;
      }

      return res.json({ ok: true, deleted: id });
    }

    const { error: d2 } = await supabase.from('reservations').delete().eq('id', id);
    if (d2) throw d2;
    res.json({ ok: true, deleted: id });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Bulk import products (upsert)
app.post('/api/products/bulk', async (req, res) => {
  try {
    const products = req.body || [];
    if (!Array.isArray(products) || products.length === 0) return res.status(400).json({ ok: false, error: 'products must be a non-empty array' });

    // Upsert by sku
    const { data, error } = await supabase.from('products').upsert(products, { onConflict: 'sku' });
    if (error) throw error;
    res.json({ ok: true, successCount: data.length, errorCount: 0, message: `Imported ${data.length} products, 0 errors` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// ====== Database Management API (adapted for Supabase) ======

// Create (seed) database: simplified version for testing
app.post('/api/database/create', async (req, res) => {
  try {
    // Try to insert sample data (tables should already exist)
    const sample = [
      { sku: 'BTH-0001', name: 'Single-Handle Basin Faucet', category: 'Faucet', price: 1290, quantity: 25 },
      { sku: 'BTH-0002', name: 'Wall-Mounted Shower Set', category: 'Shower', price: 2590, quantity: 18 },
      { sku: 'BTH-0003', name: 'One-Piece Toilet 4.8L', category: 'Toilet', price: 6490, quantity: 10 },
      { sku: 'BTH-0004', name: 'Pedestal Basin 50cm', category: 'Basin', price: 1890, quantity: 14 }
    ];

    // Clear existing data first
    try {
      await supabase.from('reservations').delete().neq('id', 0);
      await supabase.from('products').delete().neq('id', 0);
    } catch (clearError) {
      console.log('Warning: Could not clear existing data:', clearError.message);
    }

    // Insert sample data
    const { error } = await supabase.from('products').insert(sample);
    if (error) throw error;
    
    res.json({ ok: true, message: 'Database seeded successfully with sample data' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// New endpoint to create tables and seed with specific data
app.post('/api/database/seed', async (req, res) => {
  try {
    // First, try to insert the sample data directly
    const sample = [
      { sku: 'BTH-0001', name: 'Single-Handle Basin Faucet', category: 'Faucet', price: 1290, quantity: 25 },
      { sku: 'BTH-0002', name: 'Wall-Mounted Shower Set', category: 'Shower', price: 2590, quantity: 18 },
      { sku: 'BTH-0003', name: 'One-Piece Toilet 4.8L', category: 'Toilet', price: 6490, quantity: 10 }
    ];

    // Clear existing data
    await supabase.from('reservations').delete().neq('id', 0);
    await supabase.from('products').delete().neq('id', 0);

    // Insert new data
    const { error } = await supabase.from('products').insert(sample);
    if (error) throw error;
    
    res.json({ ok: true, message: 'Database seeded successfully with specific data' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

// Delete database (clear all data)
app.delete('/api/database/delete', async (req, res) => {
  try {
    await supabase.from('reservations').delete().neq('id', 0);
    await supabase.from('products').delete().neq('id', 0);
    res.json({ ok: true, message: 'Database cleared successfully' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});

const PORT = 3002;
const server = app.listen(PORT, () => console.log(`API ready: http://localhost:${PORT}`));