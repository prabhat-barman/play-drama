import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AuthNavigator} from './AuthNavigator';
import {MainTabs} from './MainTabs';

import {MovieDetailsScreen} from '../screens/MovieDetailsScreen';
import {SplashScreen} from '../screens/SplashScreen';
import {OnboardingScreen} from '../screens/OnboardingScreen';
import {PlayerScreen} from '../screens/PlayerScreen';
import {NotificationsScreen} from '../screens/NotificationsScreen';
import {ChangePasswordScreen} from '../screens/ChangePasswordScreen';
import {ActorProfileScreen} from '../screens/ActorProfileScreen';
import {InstituteProfileScreen} from '../screens/InstituteProfileScreen';
import {EditProfileScreen} from '../screens/EditProfileScreen';
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
  ActorProfile: {studentId: string};
  InstituteProfile: {id?: string; instituteId?: string; studentId?: string};
  EditProfile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const {status} = useAuth();


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
          <Stack.Screen
            name="ActorProfile"
            component={ActorProfileScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="InstituteProfile"
            component={InstituteProfileScreen}
            options={{animation: 'slide_from_right'}}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{animation: 'slide_from_bottom'}}
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
