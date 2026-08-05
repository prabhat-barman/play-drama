import React from 'react';
import {Platform, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';


import {HomeScreen} from '../screens/HomeScreen';
import {DiscoverScreen} from '../screens/DiscoverScreen';
import {SearchScreen} from '../screens/SearchScreen';
import {WatchlistScreen} from '../screens/WatchlistScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {StudentProfileScreen} from '../screens/StudentProfileScreen';
import {useAuth} from '../context/AuthContext';
import {
  BookmarkIcon,
  CompassIcon,
  HomeIcon,
  ProfileIcon,
  SearchIcon,
} from '../components/icons';
import {colors} from '../theme/colors';

export type MainTabParamList = {
  Home: undefined;
  Discover: undefined;
  Search: undefined;
  Watchlist: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const insets = useSafeAreaInsets();
  const {user} = useAuth();
  const isStudent = user?.role === 'STUDENT';

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
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
        tabBarIcon: ({focused, color}) => {
          const size = 22;
          const c = focused ? colors.brand : color;
          switch (route.name) {
            case 'Home':
              return <HomeIcon size={size} color={c} />;
            case 'Discover':
              return <CompassIcon size={size} color={c} />;
            case 'Search':
              return <SearchIcon size={size} color={c} />;
            case 'Watchlist':
              return <BookmarkIcon size={size} color={c} filled={focused} />;
            case 'Profile':
              return <ProfileIcon size={size} color={c} />;
          }
          return null;
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Watchlist" component={WatchlistScreen} />
      <Tab.Screen
        name="Profile"
        component={isStudent ? StudentProfileScreen : ProfileScreen}
      />
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

