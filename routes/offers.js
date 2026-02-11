const express = require('express');
const router = express.Router();
const { getOffers, createOffer, updateOffer, deleteOffer } = require('../controllers/offerController');
const adminAuth = require('../middleware/adminAuth');

router.route('/')
    .get(getOffers)
    .post(adminAuth, createOffer);

router.route('/:id')
    .put(adminAuth, updateOffer)
    .delete(adminAuth, deleteOffer);

module.exports = router;
