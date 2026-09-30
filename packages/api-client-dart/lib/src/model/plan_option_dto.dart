//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'plan_option_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PlanOptionDto {
  /// Returns a new [PlanOptionDto] instance.
  PlanOptionDto({
    required this.key,

    required this.interval,

    required this.unitMinor,

    required this.extraUnitMinor,

    required this.extraChildren,

    required this.totalMinor,
  });

  @JsonKey(
    name: r'key',
    required: true,
    includeIfNull: false,
    unknownEnumValue: PlanOptionDtoKeyEnum.unknownDefaultOpenApi,
  )
  final PlanOptionDtoKeyEnum key;

  @JsonKey(
    name: r'interval',
    required: true,
    includeIfNull: false,
    unknownEnumValue: PlanOptionDtoIntervalEnum.unknownDefaultOpenApi,
  )
  final PlanOptionDtoIntervalEnum interval;

  /// One child, in minor units (paisa, piastres, fils, halalas).
  @JsonKey(name: r'unitMinor', required: true, includeIfNull: false)
  final num unitMinor;

  /// Each child after the first, with the family discount.
  @JsonKey(name: r'extraUnitMinor', required: true, includeIfNull: false)
  final num extraUnitMinor;

  @JsonKey(name: r'extraChildren', required: true, includeIfNull: false)
  final num extraChildren;

  /// What the family pays per period.
  @JsonKey(name: r'totalMinor', required: true, includeIfNull: false)
  final num totalMinor;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PlanOptionDto &&
          other.key == key &&
          other.interval == interval &&
          other.unitMinor == unitMinor &&
          other.extraUnitMinor == extraUnitMinor &&
          other.extraChildren == extraChildren &&
          other.totalMinor == totalMinor;

  @override
  int get hashCode =>
      key.hashCode +
      interval.hashCode +
      unitMinor.hashCode +
      extraUnitMinor.hashCode +
      extraChildren.hashCode +
      totalMinor.hashCode;

  factory PlanOptionDto.fromJson(Map<String, dynamic> json) =>
      _$PlanOptionDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PlanOptionDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum PlanOptionDtoKeyEnum {
  @JsonValue(r'monthly')
  monthly(r'monthly'),
  @JsonValue(r'yearly')
  yearly(r'yearly'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const PlanOptionDtoKeyEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

enum PlanOptionDtoIntervalEnum {
  @JsonValue(r'MONTH')
  MONTH(r'MONTH'),
  @JsonValue(r'YEAR')
  YEAR(r'YEAR'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const PlanOptionDtoIntervalEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
