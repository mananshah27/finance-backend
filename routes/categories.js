const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const auth = require('../middleware/auth');

// Create Category
router.post('/', auth, async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        message: 'Name and type are required'
      });
    }

    // Check for duplicate
    const existingCategory = await Category.findOne({
      name,
      userId: req.user._id
    });

    if (existingCategory) {
      return res.status(409).json({
        message: 'Category already exists'
      });
    }

    const category = new Category({
      name,
      type,
      userId: req.user._id
    });

    await category.save();

    res.status(201).json({
      message: 'Category created successfully',
      category
    });

  } catch (error) {
    console.error('Create category error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Category already exists'
      });
    }
    res.status(500).json({
      message: 'Error creating category'
    });
  }
});

// Get All Categories for User
router.get('/', auth, async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user._id })
      .sort({ type: 1, name: 1 });

    res.json(categories);

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      message: 'Error fetching categories'
    });
  }
});

// Get Single Category
router.get('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!category) {
      return res.status(404).json({
        message: 'Category not found'
      });
    }

    res.json(category);

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      message: 'Error fetching category'
    });
  }
});

// Update Category
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, type } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (type) updates.type = type;

    const category = await Category.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id
      },
      updates,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        message: 'Category not found'
      });
    }

    res.json({
      message: 'Category updated successfully',
      category
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      message: 'Error updating category'
    });
  }
});

// Delete Category
router.delete('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!category) {
      return res.status(404).json({
        message: 'Category not found'
      });
    }

    res.json({
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      message: 'Error deleting category'
    });
  }
});

module.exports = router;