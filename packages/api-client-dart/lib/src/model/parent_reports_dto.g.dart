// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parent_reports_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ParentReportsDtoCWProxy {
  ParentReportsDto reports(List<ParentReportDto> reports);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentReportsDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentReportsDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentReportsDto call({List<ParentReportDto> reports});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfParentReportsDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfParentReportsDto.copyWith.fieldName(...)`
class _$ParentReportsDtoCWProxyImpl implements _$ParentReportsDtoCWProxy {
  const _$ParentReportsDtoCWProxyImpl(this._value);

  final ParentReportsDto _value;

  @override
  ParentReportsDto reports(List<ParentReportDto> reports) =>
      this(reports: reports);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentReportsDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentReportsDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentReportsDto call({Object? reports = const $CopyWithPlaceholder()}) {
    return ParentReportsDto(
      reports: reports == const $CopyWithPlaceholder()
          ? _value.reports
          // ignore: cast_nullable_to_non_nullable
          : reports as List<ParentReportDto>,
    );
  }
}

extension $ParentReportsDtoCopyWith on ParentReportsDto {
  /// Returns a callable class that can be used as follows: `instanceOfParentReportsDto.copyWith(...)` or like so:`instanceOfParentReportsDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ParentReportsDtoCWProxy get copyWith => _$ParentReportsDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ParentReportsDto _$ParentReportsDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ParentReportsDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['reports']);
      final val = ParentReportsDto(
        reports: $checkedConvert(
          'reports',
          (v) => (v as List<dynamic>)
              .map((e) => ParentReportDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$ParentReportsDtoToJson(ParentReportsDto instance) =>
    <String, dynamic>{
      'reports': instance.reports.map((e) => e.toJson()).toList(),
    };
