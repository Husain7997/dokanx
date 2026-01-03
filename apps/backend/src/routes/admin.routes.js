const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const allowRoles = require('../middleware/role.middleware');
const { getAllUsers, updateUserRole } = require('../controllers/admin.controller');

router.get('/users', auth, allowRoles('admin'), getAllUsers);
router.put('/users/:id/role', auth, allowRoles('admin'), updateUserRole);

module.exports = router;
