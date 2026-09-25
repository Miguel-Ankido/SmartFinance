import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  StatusBar,
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { FinanceProvider } from './src/context/FinanceContext';
import { Colors } from './src/theme/colors';

import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import StatsScreen from './src/screens/StatsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const LOGO_IMG = require('./src/assets/SyncPayBlack.jpg');

const renderHomeIcon = ({ color }: { color: string }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Svg>
);

const renderExtratoIcon = ({ color }: { color: string }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </Svg>
);

const renderLimitesIcon = ({ color }: { color: string }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <Rect x="2" y="4" width="20" height="16" rx="2" />
    <Path d="M6 8h12M6 12h6" />
  </Svg>
);

const renderGraficosIcon = ({ color }: { color: string }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <Path d="M18 20V10M12 20V4M6 20v-6" />
  </Svg>
);

const renderPerfilIcon = ({ color }: { color: string }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
  </Svg>
);

const TABS = [
  { key: 'Home', label: 'Home', renderIcon: renderHomeIcon },
  { key: 'Extrato', label: 'Extrato', renderIcon: renderExtratoIcon },
  { key: 'Limites', label: 'Limites', renderIcon: renderLimitesIcon },
  { key: 'Gráficos', label: 'Gráficos', renderIcon: renderGraficosIcon },
  { key: 'Perfil', label: 'Perfil', renderIcon: renderPerfilIcon },
];

function SwipeableTabNavigator() {
  const { width: screenWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef<any>(null);

  const pageStyle = useMemo(() => [styles.pageItem, { width: screenWidth }], [screenWidth]);

  const goToTab = (index: number) => {
    setActiveTab(index);
    scrollRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index >= 0 && index < TABS.length && index !== activeTab) {
      setActiveTab(index);
    }
  };

  const navigation = {
    navigate: (screenName: string) => {
      const idx = TABS.findIndex(t => t.key.toLowerCase() === screenName.toLowerCase());
      if (idx !== -1) {
        goToTab(idx);
      }
    },
  };

  return (
    <View style={styles.appContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        bounces={false}
        scrollEventThrottle={16}
        style={styles.pager}>
        <View style={pageStyle}>
          <HomeScreen navigation={navigation} />
        </View>
        <View style={pageStyle}>
          <TransactionsScreen />
        </View>
        <View style={pageStyle}>
          <BudgetScreen />
        </View>
        <View style={pageStyle}>
          <StatsScreen />
        </View>
        <View style={pageStyle}>
          <ProfileScreen />
        </View>
      </ScrollView>

      {/* Barra de Navegação Inferior */}
      <View style={styles.bottomBar}>
        {TABS.map((tab, idx) => {
          const isActive = activeTab === idx;
          const tintColor = isActive ? Colors.primary : Colors.textMuted;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabButton}
              activeOpacity={0.7}
              onPress={() => goToTab(idx)}>
              {tab.renderIcon({ color: tintColor })}
              <Text style={[styles.tabLabel, { color: tintColor }, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading || showSplash) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" />
        <Image
          source={LOGO_IMG}
          style={styles.splashLogo}
          resizeMode="contain"
          fadeDuration={0}
        />
        <ActivityIndicator size="small" color={Colors.primary} style={styles.splashSpinner} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <FinanceProvider>
      <SwipeableTabNavigator />
    </FinanceProvider>
  );
}

export default function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" />
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: 250,
    height: 250,
  },
  splashSpinner: {
    marginTop: 20,
  },
  appContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pager: {
    flex: 1,
  },
  pageItem: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  tabLabelActive: {
    fontWeight: '800',
  },
});