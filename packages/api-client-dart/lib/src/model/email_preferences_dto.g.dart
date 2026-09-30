// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'email_preferences_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$EmailPreferencesDtoCWProxy {
  EmailPreferencesDto monthlySummary(bool monthlySummary);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `EmailPreferencesDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// EmailPreferencesDto(...).copyWith(id: 12, name: "My name")
  /// ````
  EmailPreferencesDto call({bool monthlySummary});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfEmailPreferencesDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfEmailPreferencesDto.copyWith.fieldName(...)`
class _$EmailPreferencesDtoCWProxyImpl implements _$EmailPreferencesDtoCWProxy {
  const _$EmailPreferencesDtoCWProxyImpl(this._value);

  final EmailPreferencesDto _value;

  @override
  EmailPreferencesDto monthlySummary(bool monthlySummary) =>
      this(monthlySummary: monthlySummary);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `EmailPreferencesDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// EmailPreferencesDto(...).copyWith(id: 12, name: "My name")
  /// ````
  EmailPreferencesDto call({
    Object? monthlySummary = const $CopyWithPlaceholder(),
  }) {
    return EmailPreferencesDto(
      monthlySummary: monthlySummary == const $CopyWithPlaceholder()
          ? _value.monthlySummary
          // ignore: cast_nullable_to_non_nullable
          : monthlySummary as bool,
    );
  }
}

extension $EmailPreferencesDtoCopyWith on EmailPreferencesDto {
  /// Returns a callable class that can be used as follows: `instanceOfEmailPreferencesDto.copyWith(...)` or like so:`instanceOfEmailPreferencesDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$EmailPreferencesDtoCWProxy get copyWith =>
      _$EmailPreferencesDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

EmailPreferencesDto _$EmailPreferencesDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('EmailPreferencesDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['monthlySummary']);
      final val = EmailPreferencesDto(
        monthlySummary: $checkedConvert('monthlySummary', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$EmailPreferencesDtoToJson(
  EmailPreferencesDto instance,
) => <String, dynamic>{'monthlySummary': instance.monthlySummary};
