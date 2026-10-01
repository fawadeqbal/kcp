// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parent_report_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ParentReportDtoCWProxy {
  ParentReportDto weekKey(String weekKey);

  ParentReportDto startDay(String startDay);

  ParentReportDto endDay(String endDay);

  ParentReportDto createdAt(DateTime createdAt);

  ParentReportDto children(List<ReportChildDto> children);

  ParentReportDto skillNames(Map<String, String> skillNames);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentReportDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentReportDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentReportDto call({
    String weekKey,
    String startDay,
    String endDay,
    DateTime createdAt,
    List<ReportChildDto> children,
    Map<String, String> skillNames,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfParentReportDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfParentReportDto.copyWith.fieldName(...)`
class _$ParentReportDtoCWProxyImpl implements _$ParentReportDtoCWProxy {
  const _$ParentReportDtoCWProxyImpl(this._value);

  final ParentReportDto _value;

  @override
  ParentReportDto weekKey(String weekKey) => this(weekKey: weekKey);

  @override
  ParentReportDto startDay(String startDay) => this(startDay: startDay);

  @override
  ParentReportDto endDay(String endDay) => this(endDay: endDay);

  @override
  ParentReportDto createdAt(DateTime createdAt) => this(createdAt: createdAt);

  @override
  ParentReportDto children(List<ReportChildDto> children) =>
      this(children: children);

  @override
  ParentReportDto skillNames(Map<String, String> skillNames) =>
      this(skillNames: skillNames);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentReportDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentReportDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentReportDto call({
    Object? weekKey = const $CopyWithPlaceholder(),
    Object? startDay = const $CopyWithPlaceholder(),
    Object? endDay = const $CopyWithPlaceholder(),
    Object? createdAt = const $CopyWithPlaceholder(),
    Object? children = const $CopyWithPlaceholder(),
    Object? skillNames = const $CopyWithPlaceholder(),
  }) {
    return ParentReportDto(
      weekKey: weekKey == const $CopyWithPlaceholder()
          ? _value.weekKey
          // ignore: cast_nullable_to_non_nullable
          : weekKey as String,
      startDay: startDay == const $CopyWithPlaceholder()
          ? _value.startDay
          // ignore: cast_nullable_to_non_nullable
          : startDay as String,
      endDay: endDay == const $CopyWithPlaceholder()
          ? _value.endDay
          // ignore: cast_nullable_to_non_nullable
          : endDay as String,
      createdAt: createdAt == const $CopyWithPlaceholder()
          ? _value.createdAt
          // ignore: cast_nullable_to_non_nullable
          : createdAt as DateTime,
      children: children == const $CopyWithPlaceholder()
          ? _value.children
          // ignore: cast_nullable_to_non_nullable
          : children as List<ReportChildDto>,
      skillNames: skillNames == const $CopyWithPlaceholder()
          ? _value.skillNames
          // ignore: cast_nullable_to_non_nullable
          : skillNames as Map<String, String>,
    );
  }
}

extension $ParentReportDtoCopyWith on ParentReportDto {
  /// Returns a callable class that can be used as follows: `instanceOfParentReportDto.copyWith(...)` or like so:`instanceOfParentReportDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ParentReportDtoCWProxy get copyWith => _$ParentReportDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ParentReportDto _$ParentReportDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ParentReportDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'weekKey',
          'startDay',
          'endDay',
          'createdAt',
          'children',
          'skillNames',
        ],
      );
      final val = ParentReportDto(
        weekKey: $checkedConvert('weekKey', (v) => v as String),
        startDay: $checkedConvert('startDay', (v) => v as String),
        endDay: $checkedConvert('endDay', (v) => v as String),
        createdAt: $checkedConvert(
          'createdAt',
          (v) => DateTime.parse(v as String),
        ),
        children: $checkedConvert(
          'children',
          (v) => (v as List<dynamic>)
              .map((e) => ReportChildDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
        skillNames: $checkedConvert(
          'skillNames',
          (v) => Map<String, String>.from(v as Map),
        ),
      );
      return val;
    });

Map<String, dynamic> _$ParentReportDtoToJson(ParentReportDto instance) =>
    <String, dynamic>{
      'weekKey': instance.weekKey,
      'startDay': instance.startDay,
      'endDay': instance.endDay,
      'createdAt': instance.createdAt.toIso8601String(),
      'children': instance.children.map((e) => e.toJson()).toList(),
      'skillNames': instance.skillNames,
    };
