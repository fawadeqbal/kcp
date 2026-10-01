// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'update_email_preferences_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$UpdateEmailPreferencesDtoCWProxy {
  UpdateEmailPreferencesDto monthlySummary(bool? monthlySummary);

  UpdateEmailPreferencesDto weeklyReport(bool? weeklyReport);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `UpdateEmailPreferencesDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// UpdateEmailPreferencesDto(...).copyWith(id: 12, name: "My name")
  /// ````
  UpdateEmailPreferencesDto call({bool? monthlySummary, bool? weeklyReport});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfUpdateEmailPreferencesDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfUpdateEmailPreferencesDto.copyWith.fieldName(...)`
class _$UpdateEmailPreferencesDtoCWProxyImpl
    implements _$UpdateEmailPreferencesDtoCWProxy {
  const _$UpdateEmailPreferencesDtoCWProxyImpl(this._value);

  final UpdateEmailPreferencesDto _value;

  @override
  UpdateEmailPreferencesDto monthlySummary(bool? monthlySummary) =>
      this(monthlySummary: monthlySummary);

  @override
  UpdateEmailPreferencesDto weeklyReport(bool? weeklyReport) =>
      this(weeklyReport: weeklyReport);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `UpdateEmailPreferencesDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// UpdateEmailPreferencesDto(...).copyWith(id: 12, name: "My name")
  /// ````
  UpdateEmailPreferencesDto call({
    Object? monthlySummary = const $CopyWithPlaceholder(),
    Object? weeklyReport = const $CopyWithPlaceholder(),
  }) {
    return UpdateEmailPreferencesDto(
      monthlySummary: monthlySummary == const $CopyWithPlaceholder()
          ? _value.monthlySummary
          // ignore: cast_nullable_to_non_nullable
          : monthlySummary as bool?,
      weeklyReport: weeklyReport == const $CopyWithPlaceholder()
          ? _value.weeklyReport
          // ignore: cast_nullable_to_non_nullable
          : weeklyReport as bool?,
    );
  }
}

extension $UpdateEmailPreferencesDtoCopyWith on UpdateEmailPreferencesDto {
  /// Returns a callable class that can be used as follows: `instanceOfUpdateEmailPreferencesDto.copyWith(...)` or like so:`instanceOfUpdateEmailPreferencesDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$UpdateEmailPreferencesDtoCWProxy get copyWith =>
      _$UpdateEmailPreferencesDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

UpdateEmailPreferencesDto _$UpdateEmailPreferencesDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('UpdateEmailPreferencesDto', json, ($checkedConvert) {
  final val = UpdateEmailPreferencesDto(
    monthlySummary: $checkedConvert('monthlySummary', (v) => v as bool?),
    weeklyReport: $checkedConvert('weeklyReport', (v) => v as bool?),
  );
  return val;
});

Map<String, dynamic> _$UpdateEmailPreferencesDtoToJson(
  UpdateEmailPreferencesDto instance,
) => <String, dynamic>{
  'monthlySummary': ?instance.monthlySummary,
  'weeklyReport': ?instance.weeklyReport,
};
