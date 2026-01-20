import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useThemeStore } from '../store/themeStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Tab icons
const tabIcons: Record<string, string> = {
  Home: '🏠',
  Plan: '📅',
  Stats: '📊',
  Templates: '📋',
  Settings: '⚙️',
};

export default function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDarkMode } = useThemeStore();
  const { setTargetMeasurement } = useOnboardingStore();
  const insets = useSafeAreaInsets();
  const planTabRef = useRef<View>(null);

  // Measure Plan tab for onboarding tour
  useEffect(() => {
    const timer = setTimeout(() => {
      if (planTabRef.current) {
        planTabRef.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            setTargetMeasurement('plan-tab', { x, y, width, height });
          }
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [setTargetMeasurement]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom - 14 : 2,
          backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopColor: colors.border,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const icon = tabIcons[route.name] || '●';

        const isPlanTab = route.name === 'Plan';

        return (
          <View
            key={route.key}
            ref={isPlanTab ? planTabRef : undefined}
            collapsable={false}
            style={styles.tab}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabTouchable}
              activeOpacity={0.7}
            >
            <View
              style={[
                styles.iconContainer,
                isFocused && { backgroundColor: colors.primaryLight },
              ]}
            >
              <Text style={[styles.icon, { opacity: isFocused ? 1 : 0.5 }]}>
                {icon}
              </Text>
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isFocused ? colors.primary : colors.textMuted,
                  fontWeight: isFocused ? '600' : '400',
                },
              ]}
            >
              {typeof label === 'string' ? label : route.name}
            </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
  },
  tabTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 0,
  },
  iconContainer: {
    width: 40,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 10,
  },
});
