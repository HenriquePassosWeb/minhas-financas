const express = require('express');
const { postAnalise } = require('../controllers/analiseController');

const router = express.Router();

// POST /api/analise
router.post('/analise', postAnalise);

// Ponto de extensão futuro (YAGNI - não implementar agora):
// router.post('/analise', authMiddleware, postAnalise);

module.exports = router;
