const express = require('express');
const https = require('https');
const app = express();

const PORT = process.env.PORT || 3000;
// Note: PAYSTACK_SECRET_KEY must be set in Dokploy Environment Variables
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY; 

// This endpoint receives the user after a successful payment from Paystack
app.get('/verify-payment', (req, res) => {
    
    // Paystack adds its transaction ID here, usually under 'reference' or 'trxref'
    // We try to grab the reference from EITHER Paystack's standard names or the URL we provided.
    const reference = req.query.reference || req.query.trxref;
    
    // The Ghost page URL that we passed in the original redirect URL
    const ghostPage = req.query.page;

    console.log(`--- Starting Verification ---`);
    console.log(`Reference detected: ${reference}`);
    console.log(`Target Page: ${ghostPage}`);


    if (!reference || !ghostPage) {
        console.log(" CRITICAL: Missing reference or page URL.");
        // We do not redirect here, as the user needs to know it failed.
        return res.status(400).send("Verification Failed. Missing payment reference. Please contact support.");
    }

    // 1. Paystack API Call Options
    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/transaction/verify/${reference}`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`
        }
    };

    // 2. Perform the HTTPS request to Paystack's server
    const request = https.request(options, apiRes => {
        let data = '';
        apiRes.on('data', (chunk) => { data += chunk; });
        apiRes.on('end', () => {
            try {
                const response = JSON.parse(data);
                console.log("Paystack API Status:", response.status ? "Success" : "Failure");
                console.log("Paystack Message:", response.message);

                // 3. Final Check: Is the transaction verified and successful?
                if (response.status && response.data.status === 'success') {
                    console.log(` Payment confirmed for ${reference}. Redirecting user.`);
                    
                    // Create a simple token (key) for the user's browser
                    const token = "PAID-" + reference; 

                    // Redirect user back to Ghost with the token
                    res.redirect(`${ghostPage}?access=${token}`);
                } else {
                    console.log(`Verification failed: ${response.message}`);
                    res.status(403).send(`Payment verification failed. Paystack says: "${response.message}". Access Denied.`);
                }
            } catch (e) {
                console.error("Failed to parse Paystack response:", e);
                res.status(500).send("Internal verification error.");
            }
        });
    });

    request.on('error', error => {
        console.error("Connection to Paystack API failed:", error);
        res.status(500).send("Error connecting to Paystack API.");
    });

    request.end();
});

app.listen(PORT, () => console.log(`Verifier Middleware running on port ${PORT}.`));
