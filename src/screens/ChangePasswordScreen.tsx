import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthLayout} from '../components/AuthLayout';
import {AuthInput} from '../components/AuthInput';
import {PrimaryButton} from '../components/PrimaryButton';
import {LockIcon} from '../components/icons';
import {colors, spacing} from '../theme/colors';
import {ApiError} from '../lib/api';
import {useAuth} from '../context/AuthContext';
import {useAlert} from '../context/AlertContext';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

const MIN_PASSWORD = 6;

export function ChangePasswordScreen({navigation}: Props) {
  const {changePassword} = useAuth();
  const {showAlert} = useAlert();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordsMatch = next.length > 0 && next === confirm;
  const differentFromCurrent = current.length > 0 && next !== current;
  const canSubmit =
    current.length > 0 && next.length > 0 && confirm.length > 0 && !busy;

  const onSubmit = async () => {
    if (busy) {
      return;
    }
    setError(null);
    if (current.length === 0) {
      setError('Enter your current password.');
      return;
    }
    if (next.length < MIN_PASSWORD) {
      setError(`New password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (!differentFromCurrent) {
      setError('New password must be different from the current one.');
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await changePassword({currentPassword: current, newPassword: next});
      showAlert({
        title: 'Password Updated',
        message: 'Your password has been updated successfully!',
        type: 'success',
        buttons: [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Could not change password. Try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <Text style={styles.heading}>Change Password</Text>
      <Text style={styles.subheading}>
        Enter your current password and choose a new secure password.
      </Text>

      <View style={styles.inputs}>
        <AuthInput
          icon={<LockIcon />}
          placeholder="Current password"
          secure
          value={current}
          onChangeText={setCurrent}
        />
        <AuthInput
          icon={<LockIcon />}
          placeholder="New password"
          secure
          value={next}
          onChangeText={setNext}
        />
        <AuthInput
          icon={<LockIcon />}
          placeholder="Confirm new password"
          secure
          value={confirm}
          onChangeText={setConfirm}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label="Update Password"
        onPress={onSubmit}
        loading={busy}
        disabled={!canSubmit}
      />

      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.backRow}
        hitSlop={8}>
        <Text style={styles.backLink}>Cancel</Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  subheading: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  inputs: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.brand,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  backRow: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  backLink: {
    color: colors.textMuted,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
