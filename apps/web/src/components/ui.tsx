'use client';

import { PasswordField as BasePasswordField, type PasswordFieldProps } from '@kcp/ui';
import { useTranslations } from 'next-intl';

/*
 * The shared components from packages/ui, with this app's translations filled in
 * where a component needs its own text.
 */
export {
  Alert,
  AuthCard,
  Avatar,
  AvatarPicker,
  Badge,
  Button,
  buttonClass,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  Icon,
  IconBubble,
  type IconName,
  inputClass,
  Kicker,
  LogoMark,
  Meter,
  PageSpinner,
  SectionHeading,
  SelectField,
  Switch,
  textareaClass,
  TextField,
} from '@kcp/ui';

export function PasswordField(props: Omit<PasswordFieldProps, 'showLabel' | 'hideLabel'>) {
  const t = useTranslations('auth');
  return (
    <BasePasswordField {...props} showLabel={t('showPassword')} hideLabel={t('hidePassword')} />
  );
}
