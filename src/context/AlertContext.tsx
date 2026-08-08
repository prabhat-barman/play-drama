import React, {createContext, useCallback, useContext, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../theme/colors';
import {
  CheckIcon,
  HelpIcon,
  LogOutIcon,
  ShieldIcon,
} from '../components/icons';

export type AlertType = 'info' | 'success' | 'error' | 'confirm' | 'logout';

export type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type AlertOptions = {
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
};

type AlertContextValue = {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
};

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

export function AlertProvider({children}: {children: React.ReactNode}) {
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    options: AlertOptions;
  }>({
    visible: false,
    options: {title: ''},
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({
      visible: true,
      options,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({...prev, visible: false}));
  }, []);

  const {visible, options} = alertState;
  const {title, message, type = 'info', buttons} = options;

  // Default button if none provided
  const actionButtons: AlertButton[] = buttons && buttons.length > 0
    ? buttons
    : [{text: 'OK', style: 'default', onPress: hideAlert}];

  return (
    <AlertContext.Provider value={{showAlert, hideAlert}}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={hideAlert}>
        <View style={styles.backdrop}>
          <View style={styles.dialogCard}>
            {/* Header Icon Ring */}
            <View
              style={[
                styles.iconBadge,
                type === 'success' && styles.iconBadgeSuccess,
                type === 'error' && styles.iconBadgeError,
                type === 'logout' && styles.iconBadgeLogout,
              ]}>
              {type === 'success' ? (
                <CheckIcon size={22} color="#34d399" />
              ) : type === 'error' ? (
                <ShieldIcon size={22} color="#f87171" />
              ) : type === 'logout' ? (
                <LogOutIcon size={22} color={colors.brand} />
              ) : (
                <HelpIcon size={22} color={colors.brand} />
              )}
            </View>

            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}

            {/* Buttons Row */}
            <View
              style={[
                styles.buttonRow,
                actionButtons.length > 2 && styles.buttonCol,
              ]}>
              {actionButtons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                return (
                  <Pressable
                    key={index}
                    onPress={() => {
                      hideAlert();
                      btn.onPress?.();
                    }}
                    style={({pressed}) => [
                      styles.btnBase,
                      isCancel && styles.btnCancel,
                      isDestructive && styles.btnDestructive,
                      !isCancel && !isDestructive && styles.btnDefault,
                      pressed && styles.pressed,
                    ]}>
                    <Text
                      style={[
                        styles.btnTextBase,
                        isCancel && styles.btnTextCancel,
                        isDestructive && styles.btnTextDestructive,
                        !isCancel && !isDestructive && styles.btnTextDefault,
                      ]}>
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + 4,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(157, 78, 221, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(157, 78, 221, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconBadgeSuccess: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  iconBadgeError: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  iconBadgeLogout: {
    backgroundColor: 'rgba(255, 180, 171, 0.15)',
    borderColor: 'rgba(255, 180, 171, 0.35)',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    width: '100%',
  },
  buttonCol: {
    flexDirection: 'column',
  },
  btnBase: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDefault: {
    backgroundColor: colors.brand,
  },
  btnCancel: {
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  btnDestructive: {
    backgroundColor: colors.brand,
  },
  btnTextBase: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnTextDefault: {
    color: colors.brandText,
  },
  btnTextCancel: {
    color: colors.textPrimary,
  },
  btnTextDestructive: {
    color: colors.brandText,
  },
  pressed: {
    opacity: 0.8,
  },
});
