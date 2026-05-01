"use client";

import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createTaskRequest,
  deleteTaskRequest,
  listTasksRequest,
  toggleTaskCompletionRequest,
  updateTaskRequest
} from "../lib/api-client";
import { useAuthStore } from "../store/auth-store";

type TaskItem = {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  category?: "shopping" | "payment" | "order" | "general";
  createdAt?: string;
};

const BRAND = {
  navy: "#0B1E3C",
  navySoft: "#17325F",
  orange: "#FF7A00",
  bg: "#F4F7FB",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF3F9",
  border: "#D7DFEA",
  text: "#122033",
  textMuted: "#5F6F86",
  success: "#16a34a",
  warning: "#eab308",
  danger: "#dc2626",
};

const PRIORITY_COLORS = {
  low: BRAND.success,
  medium: BRAND.warning,
  high: BRAND.danger,
};

const CATEGORY_LABELS = {
  shopping: "🛒 Shopping",
  payment: "💳 Payment",
  order: "📦 Order",
  general: "📝 General",
};

export default function TasksScreen() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const loadTasks = useCallback(async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);
      const response = await listTasksRequest(accessToken);
      const data = Array.isArray(response.data) ? response.data : [];
      setTasks(data as TaskItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const createTask = useCallback(async () => {
    if (!accessToken || !newTaskTitle.trim()) return;

    try {
      await createTaskRequest(accessToken, {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
      });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setShowCreateForm(false);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    }
  }, [accessToken, newTaskTitle, newTaskDescription, loadTasks]);

  const toggleTask = useCallback(async (taskId: string) => {
    if (!accessToken) return;

    try {
      await toggleTaskCompletionRequest(accessToken, taskId);
      setTasks((current) =>
        current.map((task) =>
          (task._id === taskId || task.id === taskId)
            ? { ...task, completed: !task.completed }
            : task
        )
      );
    } catch (err) {
      // Silently fail
    }
  }, [accessToken]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!accessToken) return;

    try {
      await deleteTaskRequest(accessToken, taskId);
      setTasks((current) => current.filter((task) => (task._id !== taskId && task.id !== taskId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }, [accessToken]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "pending") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Tasks</Text>
          {pendingCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount} pending</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.filters}>
          {["all", "pending", "completed"].map((filterOption) => (
            <Pressable
              key={filterOption}
              style={[styles.filterChip, filter === filterOption && styles.filterChipActive]}
              onPress={() => setFilter(filterOption as typeof filter)}
            >
              <Text style={[styles.filterText, filter === filterOption && styles.filterTextActive]}>
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {!showCreateForm ? (
          <Pressable style={styles.addButton} onPress={() => setShowCreateForm(true)}>
            <Text style={styles.addButtonText}>+ Add New Task</Text>
          </Pressable>
        ) : (
          <View style={styles.createForm}>
            <TextInput
              style={styles.titleInput}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              placeholder="Task title"
              placeholderTextColor={BRAND.textMuted}
            />
            <TextInput
              style={styles.descriptionInput}
              value={newTaskDescription}
              onChangeText={setNewTaskDescription}
              placeholder="Description (optional)"
              placeholderTextColor={BRAND.textMuted}
              multiline
            />
            <View style={styles.formActions}>
              <Pressable style={styles.cancelButton} onPress={() => {
                setShowCreateForm(false);
                setNewTaskTitle("");
                setNewTaskDescription("");
              }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.createButton} onPress={createTask}>
                <Text style={styles.createText}>Create Task</Text>
              </Pressable>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadTasks}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>
              {filter === "all" ? "No tasks yet" : `No ${filter} tasks`}
            </Text>
            <Text style={styles.emptySubtext}>
              {filter === "all" ? "Create your first task to get organized" : "Tasks will appear here"}
            </Text>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {filteredTasks.map((task) => (
              <View key={task._id || task.id} style={styles.taskCard}>
                <Pressable
                  style={styles.taskCheckbox}
                  onPress={() => toggleTask(task._id || task.id || "")}
                >
                  <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
                    {task.completed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </Pressable>

                <View style={styles.taskContent}>
                  <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                    {String(task.title || "")}
                  </Text>
                  {task.description ? (
                    <Text style={styles.taskDescription}>{String(task.description)}</Text>
                  ) : null}
                  <View style={styles.taskMeta}>
                    <Text style={styles.taskCategory}>
                      {CATEGORY_LABELS[task.category as keyof typeof CATEGORY_LABELS] || CATEGORY_LABELS.general}
                    </Text>
                    {task.priority && task.priority !== "medium" && (
                      <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] }]}>
                        <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => deleteTask(task._id || task.id || "")}
                >
                  <Text style={styles.deleteText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND.bg,
  },
  container: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: BRAND.text,
  },
  badge: {
    backgroundColor: BRAND.orange,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: BRAND.surface,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: BRAND.surfaceMuted,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  filterChipActive: {
    backgroundColor: BRAND.navy,
    borderColor: BRAND.navy,
  },
  filterText: {
    fontSize: 14,
    color: BRAND.text,
  },
  filterTextActive: {
    color: BRAND.surface,
  },
  addButton: {
    backgroundColor: BRAND.navy,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  addButtonText: {
    color: BRAND.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  createForm: {
    backgroundColor: BRAND.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    color: BRAND.text,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    height: 80,
    textAlignVertical: "top",
    color: BRAND.text,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelText: {
    color: BRAND.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  createButton: {
    backgroundColor: BRAND.navy,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  createText: {
    color: BRAND.surface,
    fontSize: 14,
    fontWeight: "600",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: BRAND.textMuted,
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: BRAND.navy,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: BRAND.surface,
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: BRAND.text,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: BRAND.textMuted,
    textAlign: "center",
    marginTop: 8,
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: BRAND.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  taskCheckbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BRAND.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: BRAND.success,
    borderColor: BRAND.success,
  },
  checkmark: {
    color: BRAND.surface,
    fontSize: 14,
    fontWeight: "700",
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: BRAND.text,
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: BRAND.textMuted,
  },
  taskDescription: {
    fontSize: 14,
    color: BRAND.textMuted,
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taskCategory: {
    fontSize: 12,
    color: BRAND.textMuted,
    fontWeight: "500",
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
    color: BRAND.surface,
  },
  deleteButton: {
    padding: 4,
  },
  deleteText: {
    fontSize: 20,
    color: BRAND.danger,
    fontWeight: "700",
  },
});