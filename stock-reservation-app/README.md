# Stock Reservation Application

A beautiful and user-friendly web application for viewing stock inventory and making product reservations.

## Features

- View stock inventory in a clean, responsive table
- Reserve products with a simple form
- Upload stock data from Excel files
- Real-time stock quantity updates
- Responsive design that works on all devices

## How to Use

1. Upload an Excel file with your stock data (in a real application)
2. Browse available products in the stock table
3. Click "Reserve" on any product to open the reservation form
4. Enter your details and quantity to confirm your reservation
5. View your confirmed reservations in the reservations section

## Sample Data

For demonstration purposes, the application includes sample stock data:
- Smartphone X ($699, 25 in stock)
- Laptop Pro ($1299, 10 in stock)
- Wireless Headphones ($199, 40 in stock)
- Smart Watch ($299, 15 in stock)
- Tablet Air ($499, 30 in stock)

## Excel Data Import

To use the Excel import feature in a real application:

1. Create an Excel file with the following columns:
   - `sku`: Product SKU (optional)
   - `name`: Product name
   - `category`: Product category
   - `price`: Product price
   - `quantity`: Available quantity

2. Save the file in .xlsx format

3. In the admin panel, click "Choose Excel File" and select your file

4. The system will automatically parse and import your stock data

A sample template is available at `public/stock-template.csv` which can be opened in Excel or converted to XLSX format.

## Technical Details

This application is built with:
- React for the frontend
- Vite for fast development
- CSS for beautiful styling
- xlsx library for Excel file parsing

## Supabase (Production / Remote DB)

This project can be run using Supabase (Postgres) instead of the built-in SQLite file. The server expects the following environment variables:

- `SUPABASE_URL` — your Supabase project URL (e.g. https://xyz.supabase.co)
- `SUPABASE_KEY` — service role key or anon key with appropriate permissions

Copy `.env.example` to `.env` and fill the values before starting the API server.

Required Supabase tables (simple schema):

products
- id: serial primary key
- sku: text unique
- name: text
- category: text
- price: numeric
- quantity: integer

reservations
- id: serial primary key
- product_sku: text (references products.sku)
- customer_name: text
- reserved_quantity: integer
- status: text (pending, confirmed, cancelled, completed)
- discount: numeric
- vat: numeric
- sales_person: text
- created_at: timestamp with time zone (default now())
- updated_at: timestamp with time zone (default now())

The Express server (`server.cjs`) exposes the same REST endpoints as the local SQLite version, so the frontend (`App.jsx`) should work without code changes when `SUPABASE_URL` and `SUPABASE_KEY` are provided.

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to http://localhost:3000

## Admin Access

To access the admin panel:
1. Click "Admin View" in the navigation bar
2. Enter password: `admin123`

In the admin panel, you can:
- Upload stock data from Excel files
- View and manage reservations
- Replenish stock quantities
- View inventory summaries and charts