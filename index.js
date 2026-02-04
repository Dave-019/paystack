const express = require('express');
const https = require('https');
const app = express();

const PORT = process.env.PORT || 3000;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY; 

app.get('/verify-payment', (req, res) => {
    const reference = req.query.reference;
    const ghostPage = req.query.page; // This is now being received correctly!

    console.log(`--- Verifying reference: ${reference} for page: ${ghostPage} ---`);

    if (!reference || !ghostPage) {
        console.log(" Missing reference or page URL");
        return res.status(400).send("Missing reference or page URL");
    }

    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/transaction/verify/${reference}`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`
        }
    };

    const request = https.request(options, apiRes => {
        let data = '';
        apiRes.on('data', (chunk) => { data += chunk; });
        apiRes.on('end', () => {
            const response = JSON.parse(data);
            console.log("Paystack API Response:", response); // This will show us the result

            if (response.status && response.data.status === 'success') {
                console.log(` Payment confirmed for ${reference}. Redirecting user.`);
                const token = "PAID-" + reference; 
                res.redirect(`${ghostPage}?access=${token}`);
            } else {
                console.log(` Payment verification failed. Reason: ${response.message}`);
                res.send(`Payment verification failed. Paystack says: "${response.message}"`);
            }
        });
    });

    request.on('error', error => {
        console.error("Connection to Paystack failed:", error);
        res.send("Error connecting to Paystack API.");
    });

    request.end();
});

app.listen(PORT, () => console.log(`Verifier running on port ${PORT} with enhanced logging.`));
