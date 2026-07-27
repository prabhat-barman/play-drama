import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthLayout} from '../components/AuthLayout';
import {AuthInput} from '../components/AuthInput';
import {PrimaryButton} from '../components/PrimaryButton';
import {MailIcon} from '../components/icons';
import {colors, spacing} from '../theme/colors';
import {ApiError, api} from '../lib/api';
import type {AuthStackParamList} from '../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({navigation}: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await api.auth.forgotPassword({email: trimmed});
      // If mail send failed, don't route the user into a reset screen they
      // can't complete — the user must receive the code in their inbox.
      // Note: the backend returns a generic "if the email exists…" message
      // for enumeration safety even when the email doesn't exist, so we can
      // only distinguish a hard mail failure from a normal request via the
      // explicit `emailSent` flag.
      if (res.emailSent === false) {
        setSent(false);
        setError(
          "We couldn't send the reset email right now. Please try again in a moment.",
        );
        return;
      }
      setSent(true);
      setInfo(
        'If the email exists, an OTP has been sent. Check your inbox (and spam folder).',
      );
      navigation.navigate('ResetPassword', {
        email: trimmed,
        expiresInMinutes: res.otpExpiresInMinutes ?? 10,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Could not send OTP. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Text style={styles.heading}>Forgot Password?</Text>
      <Text style={styles.subheading}>
        Enter your email and we&apos;ll send a 6-digit OTP to reset your
        password.
      </Text>

      <View style={styles.inputs}>
        <AuthInput
          icon={<MailIcon />}
          placeholder="Email Address"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {sent && info ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>
            {info}
            {'\n'}
            <Text style={styles.successEmail}>{email}</Text>
          </Text>
        </View>
      ) : null}

      <PrimaryButton
        label={sent ? 'Resend OTP' : 'Send OTP'}
        onPress={onSubmit}
        loading={loading}
        disabled={!email || loading}
      />

      <View style={styles.bottomRow}>
        <Text style={styles.bottomText}>Remember your password? </Text>
        <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8}>
          <Text style={styles.bottomLink}>Sign in</Text>
        </Pressable>
      </View>
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
    marginBottom: spacing.lg,
  },
  error: {
    color: colors.brand,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successBox: {
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: 'rgba(155, 89, 182, 0.10)',
    borderColor: 'rgba(155, 89, 182, 0.28)',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  successText: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  successEmail: {
    color: colors.textAccent,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  bottomText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomLink: {
    color: colors.textAccent,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
