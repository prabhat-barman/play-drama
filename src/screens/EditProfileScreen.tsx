import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
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
import {useAlert} from '../context/AlertContext';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export function EditProfileScreen({navigation}: Props) {
  const {user, token, refreshProfile, updateProfile} = useAuth();
  const {showAlert} = useAlert();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [course, setCourse] = useState('');
  const [department, setDepartment] = useState('');
  const [batch, setBatch] = useState('');
  const [semester, setSemester] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfileData = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (user?.role === 'STUDENT') {
        // Use /auth/me — returns full student profile (course, department,
        // batch, semester, bio, skills) without needing a separate student ID.
        const me = await api.auth.me({token});
        if (signal?.aborted) return;
        if (me && 'role' in me && me.role === 'STUDENT' && 'profile' in me) {
          const p = me.profile;
          setFullName(p?.fullName || user.name || '');
          setPhone(p?.phone || user.phone || '');
          setEmail(me.email || user.email || '');
          setCourse(p?.course || '');
          setDepartment(p?.department || '');
          setBatch(p?.batch || '');
          setSemester(p?.semester || '');
          setBio(p?.bio || '');
          setSkills(p?.skills?.join(', ') || '');
        }
      } else {
        const p = await api.profile.get({token, signal});
        if (signal?.aborted) return;
        if (p) {
          setFullName(p.fullName || user?.name || '');
          setPhone(p.phone || user?.phone || '');
          setEmail(p.email || user?.email || '');
        }
      }
    } catch {
      // Best effort; keep context values if fetch fails
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [token, user]);

  React.useEffect(() => {
    const controller = new AbortController();
    loadProfileData(controller.signal);
    return () => controller.abort();
  }, [loadProfileData]);

  const handleSave = useCallback(async () => {
    if (!token || !user?.id) {
      showAlert({
        title: 'Error',
        message: 'You must be logged in to update your profile.',
        type: 'error',
      });
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
          id: user.studentId ?? user.id,
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
        await updateProfile({
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
        });
      }

      await refreshProfile();

      showAlert({
        title: 'Success',
        message: 'Profile updated successfully!',
        type: 'success',
        buttons: [{text: 'OK', onPress: () => navigation.goBack()}],
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to update profile',
      );
    } finally {
      setSaving(false);
    }
  }, [token, user, fullName, phone, email, course, department, batch, semester, bio, skills, navigation, updateProfile, refreshProfile, showAlert]);

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
          {loading ? (
            <View style={{paddingVertical: spacing.md, alignItems: 'center'}}>
              <ActivityIndicator size="small" color={colors.brand} />
            </View>
          ) : null}

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

          {user?.role === 'STUDENT' ? (
            <>
              {/* Academic Info (For Students) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACADEMIC & INSTITUTE DETAILS</Text>
                <Text style={styles.sectionNote}>Managed by your institute admin · Contact them to update</Text>
                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Course / Program</Text>
                  <TextInput
                    style={[styles.input, styles.disabledInput]}
                    value={course}
                    editable={false}
                    placeholder="e.g. B.A. Performing Arts"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.label}>Department</Text>
                  <TextInput
                    style={[styles.input, styles.disabledInput]}
                    value={department}
                    editable={false}
                    placeholder="e.g. Drama / Film Production"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.rowTwo}>
                  <View style={[styles.fieldWrap, {flex: 1}]}>
                    <Text style={styles.label}>Batch</Text>
                    <TextInput
                      style={[styles.input, styles.disabledInput]}
                      value={batch}
                      editable={false}
                      placeholder="2024"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={[styles.fieldWrap, {flex: 1}]}>
                    <Text style={styles.label}>Semester</Text>
                    <TextInput
                      style={[styles.input, styles.disabledInput]}
                      value={semester}
                      editable={false}
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
            </>
          ) : null}
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
    opacity: 0.55,
  },
  sectionNote: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: spacing.md,
    marginLeft: 4,
    opacity: 0.8,
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
