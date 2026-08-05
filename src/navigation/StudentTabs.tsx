import React from 'react';
import {Platform, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StudentProfileScreen} from '../screens/StudentProfileScreen';
import {ProfileIcon} from '../components/icons';
import {colors} from '../theme/colors';

// STUDENT accounts get a stripped-down shell: they aren't subscribers
// so browsing / watchlist / player would just 403 for them. Keeping a
// tab bar (even with a single tab) preserves visual parity with the
// MOBILE_USER experience and leaves room to add student-specific tabs
// (e.g. Institute, Batch) later without another navigator swap.
export type StudentTabParamList = {
  Profile: undefined;
};

const Tab = createBottomTabNavigator<StudentTabParamList>();

// Hoisted so the tab bar doesn't rebuild the icon component on every
// render (react/no-unstable-nested-components) — StudentTabs re-runs on
// every AuthContext change and re-instantiating this would blow away
// the whole tab subtree.
const renderProfileIcon = ({
  focused,
  color,
}: {
  focused: boolean;
  color: string;
}) => <ProfileIcon size={22} color={focused ? colors.brand : color} />;

export function StudentTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 56 + bottomInset,
            paddingBottom: bottomInset,
          },
        ],
        tabBarLabelStyle: styles.label,
        tabBarIcon: renderProfileIcon,
      }}>
      <Tab.Screen name="Profile" component={StudentProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(10,10,10,0.96)',
    borderTopColor: colors.glassBorder,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2,
  },
});

