import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AuthNavigator} from './AuthNavigator';
import {MainTabs} from './MainTabs';
import {StudentTabs} from './StudentTabs';
import {MovieDetailsScreen} from '../screens/MovieDetailsScreen';
import {SplashScreen} from '../screens/SplashScreen';
import {OnboardingScreen} from '../screens/OnboardingScreen';
import {PlayerScreen} from '../screens/PlayerScreen';
import {NotificationsScreen} from '../screens/NotificationsScreen';
import {ChangePasswordScreen} from '../screens/ChangePasswordScreen';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  MovieDetails: {id: string};
  Player: {id: string; episodeId?: string};
  Notifications: undefined;
  ChangePassword: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const {status, user} = useAuth();
  // Students get a stripped-down shell (Profile-only tab + change
  // password); every other allowed role (MOBILE_USER) sees the full app.
  // We branch on the tab-navigator level rather than the individual
  // screens so React Navigation resets cleanly when the role flips
  // (e.g. logout → login as a different user).
  const isStudent = user?.role === 'STUDENT';

  if (status === 'loading') {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {backgroundColor: colors.background},
        }}>
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{animation: 'fade'}}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: colors.background},
      }}>
      {status === 'authenticated' ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="MovieDetails"
            component={MovieDetailsScreen}
            options={{animation: 'slide_from_bottom'}}
          />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{animation: 'fade', orientation: 'all'}}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={{animation: 'slide_from_right'}}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{animation: 'fade'}}
          />
          <Stack.Screen name="Auth" component={AuthNavigator} />
        </>
      )}
    </Stack.Navigator>
  );
}
