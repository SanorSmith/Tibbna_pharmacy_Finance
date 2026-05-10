# Pharmacy API Routes

## 💊 Pharmacy Management API

API endpoints for pharmacy module functionality.

## Endpoints

### Drugs
- `GET /api/pharmacy/drugs` - List drugs in catalog
- `POST /api/pharmacy/drugs` - Add new drug
- `PUT /api/pharmacy/drugs/[id]` - Update drug
- `DELETE /api/pharmacy/drugs/[id]` - Remove drug

### Inventory
- `GET /api/pharmacy/inventory` - Get inventory status
- `POST /api/pharmacy/inventory/adjust` - Adjust stock levels
- `GET /api/pharmacy/inventory/low-stock` - Get low stock alerts

### Prescriptions
- `GET /api/pharmacy/prescriptions` - List prescriptions
- `POST /api/pharmacy/prescriptions/dispense` - Dispense prescription
- `GET /api/pharmacy/prescriptions/[id]` - Get prescription details

### Orders
- `GET /api/pharmacy/orders` - List pharmacy orders
- `POST /api/pharmacy/orders` - Create order
- `PUT /api/pharmacy/orders/[id]` - Update order status

## Authentication

All endpoints require pharmacy role permissions.

## Rate Limiting

- Standard: 100 requests/minute
