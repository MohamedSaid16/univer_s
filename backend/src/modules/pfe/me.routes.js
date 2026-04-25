const express = require('express');
const { MeController } = require('./me.controller');

const router = express.Router();
const meController = new MeController();

router.get('/group', (req, res) => meController.getGroup(req, res));
router.get('/deadlines', (req, res) => meController.getDeadlines(req, res));
router.get('/grade', (req, res) => meController.getGrade(req, res));

module.exports = router;
