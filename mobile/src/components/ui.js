import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';

export const Card = ({ style, children }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const Label = ({ children, style }) => (
  <Text style={[styles.label, style]}>{children}</Text>
);

export const Input = React.forwardRef((props, ref) => (
  <TextInput
    ref={ref}
    placeholderTextColor={colors.textLight}
    {...props}
    style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, props.style]}
  />
));

export const Button = ({ title, onPress, disabled, loading, variant = 'primary', style, textStyle }) => {
  const variantStyle =
    variant === 'primary'
      ? styles.btnPrimary
      : variant === 'danger'
      ? styles.btnDanger
      : styles.btnSecondary;
  const textColor =
    variant === 'primary' || variant === 'danger' ? '#fff' : colors.text;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, variantStyle, (disabled || loading) && { opacity: 0.6 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.btnText, { color: textColor }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export const Pill = ({ label, color = colors.info, bg = colors.infoBg }) => (
  <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' }}>
    <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{label}</Text>
  </View>
);

export const Divider = ({ style }) => (
  <View style={[{ height: 1, backgroundColor: colors.borderLight }, style]} />
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0b1220',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: colors.brand },
  btnDanger: { backgroundColor: colors.danger },
  btnSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: { fontSize: 15, fontWeight: '600' },
});
