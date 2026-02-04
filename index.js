const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/verify-payment', (req, res) => {
    // These lines will print EXACTLY what the server sees
    console.log("--- DIAGNOSTIC ---");
    console.log("Full URL received by server:", req.url);
    console.log("Parsed query object:", req.query);
    console.log("------------------");

    const reference = req.query.reference;
    const ghostPage = req.query.page;

    if (!reference || !ghostPage) {
        // This is the error you are getting
        res.send("Server received a request but is Missing reference or page URL.");
    } else {
        res.send("Success! Server received the reference and page URL.");
    }
});

app.listen(PORT, () => console.log(`Diagnostic Server running on port ${PORT}.`));
