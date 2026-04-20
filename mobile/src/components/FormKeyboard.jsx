import React from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { colors } from '../theme/colors';

/**
 * Shared form wrapper that:
 * - Avoids the keyboard on iOS via KeyboardAvoidingView (padding)
 * - Adds large bottom padding so the final input can scroll above the keyboard
 *   on Android (which uses the native adjustResize softInputMode)
 * - Dismisses keyboard on scroll drag and keeps taps active when the keyboard is up
 */
export default function FormKeyboard({ children, contentPadding = 16, bottomGap = 240 }) {
  const headerHeight = useHeaderHeight();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={{ padding: contentPadding, paddingBottom: bottomGap }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
