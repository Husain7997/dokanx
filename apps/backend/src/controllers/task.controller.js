const Task = require("../models/task.model");

exports.listTasks = async (req, res) => {
  try {
    const { completed, category, limit = 50, skip = 0 } = req.query;
    const filter = { userId: req.user._id };

    if (completed !== undefined) {
      filter.completed = completed === "true";
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await Task.countDocuments(filter);

    res.json({
      data: tasks,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, category, metadata } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Task title is required" });
    }

    const task = await Task.create({
      userId: req.user._id,
      title: title.trim(),
      description: description?.trim(),
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      category: category || "general",
      metadata,
    });

    res.status(201).json({ data: task });
  } catch (error) {
    res.status(500).json({ message: "Failed to create task" });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.userId;
    delete updates._id;

    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId: req.user._id },
      updates,
      { returnDocument: "after", runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ data: task });
  } catch (error) {
    res.status(500).json({ message: "Failed to update task" });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findOneAndDelete({
      _id: taskId,
      userId: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task" });
  }
};

exports.toggleTaskCompletion = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findOne({ _id: taskId, userId: req.user._id });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.completed = !task.completed;
    await task.save();

    res.json({ data: task });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle task completion" });
  }
};
