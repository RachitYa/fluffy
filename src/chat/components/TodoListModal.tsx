import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { TodoItem } from '../hooks/useTodoList';

const SCREEN_H = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  todos: TodoItem[];
  onAddTodo: (text: string) => Promise<void>;
  onToggleTodo: (id: string, currentStatus: boolean) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function TodoListModal({
  visible,
  todos,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const [newTodoText, setNewTodoText] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 18, tension: 160 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  const handleAdd = async () => {
    if (!newTodoText.trim()) return;
    const text = newTodoText.trim();
    setNewTodoText('');
    await onAddTodo(text);
  };

  const filtered = todos.filter((t) => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: theme.bgSurface, borderColor: theme.borderSubtle },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color="#10B981" />
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Tasks & To-Dos</Text>
              <View style={[styles.countPill, { backgroundColor: '#10B981' }]}>
                <Text style={styles.countPillText}>{completedCount}/{todos.length}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Filter tabs */}
          <View style={styles.filterRow}>
            {(['all', 'pending', 'completed'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterTab,
                  { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle },
                  filter === tab && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => setFilter(tab)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    { color: filter === tab ? '#fff' : theme.textMuted },
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input row */}
          <View style={[styles.inputRow, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}>
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              placeholder="Add a new task for the room..."
              placeholderTextColor={theme.textMuted}
              value={newTodoText}
              onChangeText={setNewTodoText}
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: theme.accent, opacity: !newTodoText.trim() ? 0.5 : 1 }]}
              onPress={handleAdd}
              disabled={!newTodoText.trim()}
            >
              <Feather name="plus" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Todo items */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.todoList}
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 32 }}>📋</Text>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  {filter === 'all'
                    ? 'No tasks yet!\nAdd one above for the team.'
                    : `No ${filter} tasks.`}
                </Text>
              </View>
            ) : (
              filtered.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.todoCard,
                    { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle },
                    item.completed && { opacity: 0.65 },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.checkboxTouch}
                    onPress={() => onToggleTodo(item.id, item.completed)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.completed ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={item.completed ? '#10B981' : theme.textMuted}
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={[
                        styles.todoText,
                        { color: theme.textPrimary },
                        item.completed && styles.todoCompletedText,
                      ]}
                    >
                      {item.text}
                    </Text>
                    <Text style={[styles.todoMeta, { color: theme.textMuted }]}>
                      by {item.createdByName}
                      {item.completed && item.completedByName && ` · done by ${item.completedByName}`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => onDeleteTodo(item.id)}
                    style={styles.deleteBtn}
                  >
                    <Feather name="trash-2" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  sheet: {
    height: SCREEN_H * 0.75,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  countPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  countPillText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterTabText: { fontSize: 12, fontWeight: '700' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 14, paddingVertical: 8 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  todoList: { gap: 8, paddingBottom: 16 },
  todoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  checkboxTouch: { padding: 2 },
  todoText: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  todoCompletedText: { textDecorationLine: 'line-through', opacity: 0.6 },
  todoMeta: { fontSize: 10 },
  deleteBtn: { padding: 6 },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 30 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
