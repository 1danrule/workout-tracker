import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Bottom sheet modal with its own animation.
 *
 * The built-in `animationType="slide"` slides the whole modal, so the dark
 * backdrop travels up together with the panel. Here the backdrop fades in/out
 * on its own while only the panel slides.
 */
export default function AnimatedSheetModal({ visible, onClose, children }: Props) {
  const { colors } = useTheme();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get('window').height, 0],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: progress }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.container}
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
  },
  grabber: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    zIndex: 1,
  },
});
