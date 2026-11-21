import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const BAR_HEIGHT = 68;
const BAR_PADDING = 6;
const BORDER = 1;

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['book', 'book-outline'],
  search: ['search', 'search-outline'],
  workouts: ['barbell', 'barbell-outline'],
  progress: ['trending-up', 'trending-up-outline'],
  profile: ['person', 'person-outline'],
};

// Custom floating tab bar: one rounded highlight that slides between tabs
// and fully wraps the active icon + label.
// Props come from expo-router's `tabBar` render prop (state / descriptors / navigation).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FloatingTabBar({ state, descriptors, emitter, navigateToTab, navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [innerWidth, setInnerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const didInit = useRef(false);

  const count = state.routes.length;
  const tabWidth = innerWidth / count;

  useEffect(() => {
    if (!tabWidth) return;
    const target = state.index * tabWidth;
    if (!didInit.current) {
      translateX.setValue(target);
      didInit.current = true;
      return;
    }
    Animated.spring(translateX, {
      toValue: target,
      useNativeDriver: true,
      tension: 140,
      friction: 15,
    }).start();
  }, [state.index, tabWidth, translateX]);

  const activeColor = isDark ? colors.primaryDark : colors.primary;
  const bottom = Math.max(insets.bottom - 10, Platform.OS === 'ios' ? 16 : 14);

  return (
    <View
      style={[
        styles.bar,
        {
          bottom,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowOpacity: isDark ? 0.5 : 0.14,
        },
      ]}
    >
      <View
        style={styles.inner}
        onLayout={(e) => setInnerWidth(e.nativeEvent.layout.width)}
      >
        {tabWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                width: tabWidth,
                backgroundColor: colors.primaryLight,
                transform: [{ translateX }],
              },
            ]}
          />
        )}
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label: string = options.title ?? route.name;
          const [iconOn, iconOff] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          const color = focused ? activeColor : colors.textSecondary;

          // This expo-router version passes `emitter` + `navigateToTab` (no `navigation`).
          // Fall back to the per-route navigation object if the props ever differ.
          const routeNav = descriptors[route.key].navigation;
          const onPress = () => {
            const event = emitter
              ? emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
              : routeNav.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              if (navigateToTab) navigateToTab(route.key);
              else (navigation ?? routeNav).navigate(route.name, route.params);
            }
          };
          const onLongPress = () => {
            const payload = { type: 'tabLongPress', target: route.key };
            if (emitter) emitter.emit(payload);
            else routeNav.emit(payload);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              <Ionicons name={focused ? iconOn : iconOff} size={22} color={color} />
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        sceneStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Diary' }} />
      <Tabs.Screen name="search" options={{ title: 'Foods' }} />
      <Tabs.Screen name="workouts" options={{ title: 'Workouts' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    start: 16,
    end: 16,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: BORDER,
    padding: BAR_PADDING,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: (BAR_HEIGHT - 2 * BAR_PADDING - 2 * BORDER) / 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
