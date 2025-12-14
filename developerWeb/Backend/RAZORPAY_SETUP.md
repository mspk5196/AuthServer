# Razorpay Payment Integration Setup

## Backend Setup

### 1. Install Dependencies
```bash
cd developerWeb/Backend
npm install razorpay
```

### 2. Environment Variables
Add the following to your `.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Database Migration
Run the SQL migration to create payment tables:

```bash
psql -U your_username -d your_database -f migrations/add_payment_tables.sql
```

Or manually execute the SQL from `migrations/add_payment_tables.sql`

### 4. Razorpay Account Setup

1. Sign up at [https://razorpay.com](https://razorpay.com)
2. Navigate to Settings → API Keys
3. Generate Test/Live API keys
4. Copy the Key ID and Key Secret to your `.env` file

### 5. Webhook Setup (Optional but Recommended)

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/razorpay/webhook`
3. Select events to track:
   - `payment.captured`
   - `payment.failed`
4. Copy the webhook secret to your `.env` file

## Frontend Setup

### 1. Razorpay SDK
The Razorpay checkout script is already added to `index.html`:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

No additional installation needed!

## API Endpoints

### Create Payment Order
```
POST /api/developer/payment/create-order
Headers: Authorization: Bearer {token}
Body: { "planId": "plan_id_here" }
```

### Verify Payment
```
POST /api/developer/payment/verify
Headers: Authorization: Bearer {token}
Body: {
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
```

### Get Payment History
```
GET /api/developer/payment/history
Headers: Authorization: Bearer {token}
```

### Webhook Endpoint (Public)
```
POST /api/razorpay/webhook
Headers: x-razorpay-signature: {signature}
```

## Payment Flow

### 1. User selects a paid plan
- Frontend calls `/api/developer/payment/create-order`
- Backend creates Razorpay order and returns order details

### 2. Razorpay Checkout opens
- Frontend initializes Razorpay with order details
- User completes payment via UPI/Card/NetBanking/Wallet

### 3. Payment verification
- On success, Razorpay returns payment details
- Frontend sends details to `/api/developer/payment/verify`
- Backend verifies signature and activates plan

### 4. Plan activation
- After successful verification:
  - Old plan is deactivated
  - New plan is activated
  - Payment is recorded
  - Plan change history is updated

## Testing

### Test Mode
Use Razorpay test credentials for development:
- Test Card: 4111 1111 1111 1111
- CVV: Any 3 digits
- Expiry: Any future date
- Test UPI: success@razorpay

### Payment Methods Enabled
- ✅ UPI
- ✅ Cards (Debit/Credit)
- ✅ Net Banking
- ✅ Wallets (Paytm, PhonePe, etc.)

## Currency
All prices are in **INR (Indian Rupees)** ₹

## Security Features

1. **Signature Verification**: All payments are verified using Razorpay signature
2. **Webhook Authentication**: Webhooks are verified using secret
3. **Database Transactions**: Plan activation uses atomic transactions
4. **Order Validation**: Server validates order ownership before processing

## Error Handling

The system handles:
- Invalid signatures
- Payment failures
- Network errors
- Duplicate payment attempts
- Order not found
- Unauthorized access

## Support

For Razorpay issues:
- Documentation: [https://razorpay.com/docs](https://razorpay.com/docs)
- Support: [https://razorpay.com/support](https://razorpay.com/support)

## Sample Plan Prices (in ₹)

You can insert sample plans in your database:

```sql
INSERT INTO dev_plans (name, description, price, duration_days, features, is_active)
VALUES 
  ('Free', 'Get started with basic features', 0, 365, '{"features": ["1,000 API calls/month", "Basic support", "1 app"]}', true),
  ('Starter', 'For small projects', 99, 30, '{"features": ["10,000 API calls/month", "Email support", "3 apps", "Custom branding"]}', true),
  ('Pro', 'For growing businesses', 499, 30, '{"features": ["100,000 API calls/month", "Priority support", "10 apps", "Advanced analytics", "Custom domain"]}', true),
  ('Enterprise', 'For large scale applications', 1999, 30, '{"features": ["Unlimited API calls", "24/7 dedicated support", "Unlimited apps", "White-label solution", "SLA guarantee"]}', true);
```

## Notes

- Prices are stored as decimal in database
- Frontend converts to paise (×100) for Razorpay
- Display format: ₹ symbol with 2 decimal places
- Free plans skip payment and activate directly
