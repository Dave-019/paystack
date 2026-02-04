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

app.post('/paystack-webhook', async (req, res) => {
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
                       .update(JSON.stringify(req.body))
                       .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) return res.status(400).send();

    const event = req.body;
    if (event.event === 'charge.success' || event.event === 'subscription.create') {
        try {
            await api.members.add({
                email: event.data.customer.email,
                name: event.data.customer.first_name || '',
                labels: ['Premium']
            }, { send_email: true, email_type: 'signup' });
            res.status(200).send('Success');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error');
        }
    } else {
        res.status(200).send('Ignored');
    }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));