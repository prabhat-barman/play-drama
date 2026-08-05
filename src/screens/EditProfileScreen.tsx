import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, radius, spacing} from '../theme/colors';
import {ChevronLeftIcon, CheckIcon} from '../components/icons';

import {api, ApiError} from '../lib/api';
import {useAuth} from '../context/AuthContext';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export function EditProfileScreen({navigation}: Props) {
  const {user, token} = useAuth();

  const [fullName, setFullName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [course, setCourse] = useState('Acting & Performing Arts');
  const [department, setDepartment] = useState('Drama');
  const [batch, setBatch] = useState('2024');
  const [semester, setSemester] = useState('4');
  const [bio, setBio] = useState('Passionate actor and performer.');
  const [skills, setSkills] = useState('Acting, Voiceover, Stage Drama');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!token || !user?.id) {
      Alert.alert('Error', 'You must be logged in to update your profile.');
      return;
    }

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (user.role === 'STUDENT') {
        await api.students.update({
          token,
          id: user.id,
          body: {
            fullName: fullName.trim(),
            phone: phone.trim() || undefined,
            course: course.trim() || undefined,
            department: department.trim() || undefined,
            batch: batch.trim() || undefined,
            semester: semester.trim() || undefined,
            bio: bio.trim() || undefined,
            skills: skills
              .split(',')
              .map(s => s.trim())
              .filter(Boolean),
            email: email.trim() || undefined,
          },
        });
      } else {
        await api.profile.update({
          token,
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
        });
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to update profile',
      );
    } finally {
      setSaving(false);
    }
  }, [token, user, fullName, phone, email, course, department, batch, semester, bio, skills, navigation]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ChevronLeftIcon />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({pressed}) => [
              styles.saveBtn,
              pressed && styles.pressed,
              saving && {opacity: 0.5},
            ]}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.brandText} />
            ) : (
              <>
                <CheckIcon size={16} color={colors.brandText} />
                <Text style={styles.saveText}>Save</Text>
              </>
            )}

          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BASIC INFORMATION</Text>
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={email}
                onChangeText={setEmail}
                editable={false}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+919876543210"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Academic Info (For Students) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACADEMIC & INSTITUTE DETAILS</Text>
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Course / Program</Text>
              <TextInput
                style={styles.input}
                value={course}
                onChangeText={setCourse}
                placeholder="e.g. B.A. Performing Arts"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Department</Text>
              <TextInput
                style={styles.input}
                value={department}
                onChangeText={setDepartment}
                placeholder="e.g. Drama / Film Production"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.rowTwo}>
              <View style={[styles.fieldWrap, {flex: 1}]}>
                <Text style={styles.label}>Batch</Text>
                <TextInput
                  style={styles.input}
                  value={batch}
                  onChangeText={setBatch}
                  placeholder="2024"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={[styles.fieldWrap, {flex: 1}]}>
                <Text style={styles.label}>Semester</Text>
                <TextInput
                  style={styles.input}
                  value={semester}
                  onChangeText={setSemester}
                  placeholder="4"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Bio & Skills */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BIO & SKILLS</Text>
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Bio / Overview</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                placeholder="Brief introduction..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Skills (Comma separated)</Text>
              <TextInput
                style={styles.input}
                value={skills}
                onChangeText={setSkills}
                placeholder="Acting, Voiceover, Stage Drama"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  iconBtn: {padding: 6},
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  saveText: {
    color: colors.brandText,
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  errorBanner: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,180,171,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,171,0.4)',
    marginBottom: spacing.md,
  },
  errorText: {color: colors.textPrimary, fontSize: 13},
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  fieldWrap: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.glassBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    color: colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  disabledInput: {
    opacity: 0.6,
  },
  textArea: {
    height: 90,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  pressed: {opacity: 0.75},
});
