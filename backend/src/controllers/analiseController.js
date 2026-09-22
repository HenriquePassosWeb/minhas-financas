// Camada fina de HTTP. Sem regra de negócio.

const analiseService = require('../services/analiseService');

async function postAnalise(req, res, next) {
  try {
    const resultado = await analiseService.analisarFinancas(req.body);
    res.status(200).json({ sucesso: true, ...resultado });
  } catch (err) {
    next(err);
  }
}

module.exports = { postAnalise };
