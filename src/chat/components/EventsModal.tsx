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
import { RoomEvent } from '../hooks/useEvents';
import { format } from 'date-fns';

const SCREEN_H = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  events: RoomEvent[];
  userUid: string | null;
  onCreateEvent: (title: string, description: string, dateTime: number) => Promise<void>;
  onSetRsvp: (eventId: string, status: 'going' | 'maybe' | 'not_going') => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onClose: () => void;
}

export default function EventsModal({
  visible,
  events,
  userUid,
  onCreateEvent,
  onSetRsvp,
  onDeleteEvent,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hoursFromNow, setHoursFromNow] = useState(2);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 18, tension: 160 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }).start();
      setIsCreating(false);
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  const handleCreate = async () => {
    if (!title.trim()) return;
    const targetTime = Date.now() + hoursFromNow * 3600000;
    await onCreateEvent(title.trim(), description.trim(), targetTime);
    setTitle('');
    setDescription('');
    setIsCreating(false);
  };

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
              <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#F59E0B" />
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Room Events</Text>
              <View style={[styles.countPill, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.countPillText}>{events.length}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {!isCreating && (
                <TouchableOpacity
                  style={[styles.newEventBtn, { backgroundColor: theme.accent }]}
                  onPress={() => setIsCreating(true)}
                >
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={styles.newEventBtnText}>New</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {isCreating ? (
            <View style={[styles.createForm, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}>
              <Text style={[styles.formTitle, { color: theme.textPrimary }]}>Schedule New Event</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bgDark, color: theme.textPrimary, borderColor: theme.borderSubtle }]}
                placeholder="Event title (e.g. Movie Night, Match Watch)..."
                placeholderTextColor={theme.textMuted}
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={[styles.input, { backgroundColor: theme.bgDark, color: theme.textPrimary, borderColor: theme.borderSubtle, height: 60 }]}
                placeholder="Description or notes (optional)..."
                placeholderTextColor={theme.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              {/* Quick time picker chips */}
              <Text style={[styles.timeLabel, { color: theme.textMuted }]}>When is it?</Text>
              <View style={styles.timeChips}>
                {[
                  { label: 'In 1h', hours: 1 },
                  { label: 'In 2h', hours: 2 },
                  { label: 'Tonight (8PM)', hours: 6 },
                  { label: 'Tomorrow', hours: 24 },
                  { label: 'This Weekend', hours: 72 },
                ].map((chip) => (
                  <TouchableOpacity
                    key={chip.label}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.bgDark, borderColor: theme.borderSubtle },
                      hoursFromNow === chip.hours && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => setHoursFromNow(chip.hours)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: hoursFromNow === chip.hours ? '#fff' : theme.textMuted },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.borderSubtle }]}
                  onPress={() => setIsCreating(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.accent, opacity: !title.trim() ? 0.5 : 1 }]}
                  onPress={handleCreate}
                  disabled={!title.trim()}
                >
                  <Text style={styles.saveBtnText}>Create Event</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.eventList}
              showsVerticalScrollIndicator={false}
            >
              {events.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 32 }}>📆</Text>
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    No scheduled events yet.{'\n'}Tap "+ New" to plan a watch party or game!
                  </Text>
                </View>
              ) : (
                events.map((ev) => {
                  const myRsvp = userUid ? ev.rsvps[userUid] : undefined;
                  const goingCount = Object.values(ev.rsvps).filter((s) => s === 'going').length;
                  const maybeCount = Object.values(ev.rsvps).filter((s) => s === 'maybe').length;

                  return (
                    <View
                      key={ev.id}
                      style={[styles.eventCard, { backgroundColor: theme.bgCard, borderColor: theme.borderSubtle }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[styles.eventTitle, { color: theme.textPrimary }]}>{ev.title}</Text>
                          {ev.description ? (
                            <Text style={[styles.eventDesc, { color: theme.textMuted }]}>{ev.description}</Text>
                          ) : null}
                          <View style={styles.dateTimeRow}>
                            <Feather name="clock" size={12} color="#F59E0B" />
                            <Text style={[styles.dateTimeText, { color: '#F59E0B' }]}>
                              {format(new Date(ev.dateTime), 'EEE, dd MMM · HH:mm')}
                            </Text>
                          </View>
                        </View>
                        {ev.creatorUid === userUid && (
                          <TouchableOpacity onPress={() => onDeleteEvent(ev.id)} style={{ padding: 4 }}>
                            <Feather name="trash-2" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* RSVP Buttons */}
                      <View style={styles.rsvpRow}>
                        <TouchableOpacity
                          style={[
                            styles.rsvpBtn,
                            { backgroundColor: theme.bgDark, borderColor: theme.borderSubtle },
                            myRsvp === 'going' && { backgroundColor: 'rgba(35,165,90,0.2)', borderColor: '#23A55A' },
                          ]}
                          onPress={() => onSetRsvp(ev.id, 'going')}
                        >
                          <Text style={[styles.rsvpText, myRsvp === 'going' && { color: '#23A55A', fontWeight: '800' }]}>
                            ✅ Going ({goingCount})
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.rsvpBtn,
                            { backgroundColor: theme.bgDark, borderColor: theme.borderSubtle },
                            myRsvp === 'maybe' && { backgroundColor: 'rgba(254,231,92,0.2)', borderColor: '#FEE75C' },
                          ]}
                          onPress={() => onSetRsvp(ev.id, 'maybe')}
                        >
                          <Text style={[styles.rsvpText, myRsvp === 'maybe' && { color: '#FEE75C', fontWeight: '800' }]}>
                            🤔 Maybe ({maybeCount})
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.rsvpBtn,
                            { backgroundColor: theme.bgDark, borderColor: theme.borderSubtle },
                            myRsvp === 'not_going' && { backgroundColor: 'rgba(237,66,69,0.2)', borderColor: '#ED4245' },
                          ]}
                          onPress={() => onSetRsvp(ev.id, 'not_going')}
                        >
                          <Text style={[styles.rsvpText, myRsvp === 'not_going' && { color: '#ED4245', fontWeight: '800' }]}>
                            ❌ Can't
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
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
  newEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  newEventBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  createForm: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  formTitle: { fontSize: 14, fontWeight: '800' },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  timeLabel: { fontSize: 11, fontWeight: '700' },
  timeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '700' },
  saveBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  eventList: { gap: 10, paddingBottom: 16 },
  eventCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  eventTitle: { fontSize: 15, fontWeight: '800' },
  eventDesc: { fontSize: 12, lineHeight: 16 },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateTimeText: { fontSize: 12, fontWeight: '700' },

  rsvpRow: { flexDirection: 'row', gap: 6 },
  rsvpBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  rsvpText: { fontSize: 11, color: '#949BA4', fontWeight: '600' },

  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 30 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
