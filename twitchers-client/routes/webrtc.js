const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.status(200).send('<marquee> Hello World </marquee>');
});

module.exports = router;
