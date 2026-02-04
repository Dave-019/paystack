const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const GhostAdminAPI = require('@tryghost/admin-api');

const app = express();
const PORT = process.env.PORT || 3000;

const api = new GhostAdminAPI({
    url: process.env.GHOST_URL,
    key: process.env.GHOST_ADMIN_API_KEY,
    version: "v5.0"
});

app.use(bodyParser.json());

// THIS IS THE DIAGNOSTIC PART
app.post('/paystack-webhook', async (req, res) => {
    console.log("--- WEBHOOK RECEIVED ---");
    console.log("Event Type:", req.body.event);
    console.log("Customer Email:", req.body.data ? req.body.data.customer.email : "No Data");

    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
                       .update(JSON.stringify(req.body))
                       .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
        console.log("❌ SIGNATURE VERIFICATION FAILED");
        return res.status(400).send('Invalid signature');
    }

    const event = req.body;
    if (event.event === 'charge.success') {
        try {
            console.log("✅ SIGNATURE OK. ATTEMPTING GHOST API...");
            
            await api.members.add({
                email: event.data.customer.email,
                name: event.data.customer.first_name || 'Subscriber',
                tiers: [{name: 'the awesome me'}] 
            }, { send_email: true, email_type: 'signup' });
            
            console.log(`🚀 SUCCESS: Member ${event.data.customer.email} added to Ghost!`);
            res.status(200).send('Member Added');
        } catch (err) {
            console.log("❌ GHOST API ERROR:", err.message);
            res.status(500).send('Ghost Error');
        }
    } else {
        console.log("ℹ️ Event ignored (not a charge.success)");
        res.status(200).send('Ignored');
    }
});

app.listen(PORT, () => console.log(`Debug Middleware running on port ${PORT}`));
