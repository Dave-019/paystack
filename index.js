const express = require('express');
const https = require('https');
const app = express();

const PORT = process.env.PORT || 3000;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY; 

// This endpoint handles the redirect from Paystack
app.get('/verify-payment', (req, res) => {
    const reference = req.query.reference;
    const ghostPage = req.query.page; // The URL of the story they want to read

    if (!reference || !ghostPage) {
        return res.status(400).send("Missing reference or page URL");
    }

    // 1. Ask Paystack: "Is this payment real?"
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

            // 2. If Payment is Success
            if (response.status && response.data.status === 'success') {
                console.log(`Payment confirmed for ${reference}`);
                
                // 3. Create a "simple" secret token 
                // (In a real app, you might make this more complex)
                const token = "PAID-" + reference; 

                // 4. Redirect user back to Ghost with the token
                // We append ?access=TOKEN to the URL
                res.redirect(`${ghostPage}?access=${token}`);
            } else {
                res.send("Payment verification failed. Please contact support.");
            }
        });
    });

    request.on('error', error => {
        console.error(error);
        res.send("Error connecting to Paystack");
    });

    request.end();
});

app.listen(PORT, () => console.log(`Verifier running on port ${PORT}`));
