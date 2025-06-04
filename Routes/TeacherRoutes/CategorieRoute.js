const express = require('express');
const router = express.Router();
const CategoryController = require('../../Controllers/TeacherControllers/CategorieController');
const handleUpload = require('../../MiddleWare/upload');
const authMiddleware = require('../../MiddleWare/protectRoute');

// Routes for category management
router.get('/', authMiddleware, CategoryController.getAllCategories);
router.post('/', authMiddleware, handleUpload, CategoryController.createCategory);
router.put('/:id', authMiddleware, handleUpload, CategoryController.updateCategory);
router.delete('/:id', authMiddleware, CategoryController.deleteCategory);

module.exports = router;