const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PAID_USERS_FILE = './paid_users.json';

// Initialize a simple database file
if (!fs.existsSync(PAID_USERS_FILE)) fs.writeFileSync(PAID_USERS_FILE, JSON.stringify([]));

app.use(cookieParser());
app.use(bodyParser.json());

// 1. THE BOUNCER (Traefik checks this for every request)
app.get('/auth', (req, res) => {
    const userEmail = req.cookies.paid_access;
    const paidUsers = JSON.parse(fs.readFileSync(PAID_USERS_FILE));

    if (userEmail && paidUsers.includes(userEmail)) {
        res.status(200).send('Allowed');
    } else {
        // Not paid? Send to your Paystack Payment Page
        res.redirect('https://paystack.com/pay/YOUR_PAGE_LINK');
    }
});

// 2. THE CLERK (Receives Paystack Payment)
app.post('/paystack-webhook', (req, res) => {
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
                       .update(JSON.stringify(req.body))
                       .digest('hex');

    if (hash === req.headers['x-paystack-signature']) {
        const email = req.body.data.customer.email;
        const paidUsers = JSON.parse(fs.readFileSync(PAID_USERS_FILE));
        
        if (!paidUsers.includes(email)) {
            paidUsers.push(email);
            fs.writeFileSync(PAID_USERS_FILE, JSON.stringify(paidUsers));
        }
        res.status(200).send('OK');
    } else {
        res.status(400).send('Invalid Signature');
    }
});

// 3. THE LOGIN (Users visit this once after paying to get their cookie)
app.get('/get-access', (req, res) => {
    const email = req.query.email;
    const paidUsers = JSON.parse(fs.readFileSync(PAID_USERS_FILE));

    if (paidUsers.includes(email)) {
        // Set a cookie that lasts 30 days
        res.cookie('paid_access', email, { maxAge: 30 * 24 * 60 * 60 * 1000, domain: '.traefik.me' });
        res.send('Access Granted! You can now visit the blog.');
    } else {
        res.send('Email not found. Please pay first.');
    }
});

app.listen(3000, () => console.log('Gatekeeper running on port 3000'));
